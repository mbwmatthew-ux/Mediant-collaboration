import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Inline Gemini analysis (runs in background via waitUntil) ─────────────────
async function runInlineGemini(opts: {
  admin:          ReturnType<typeof createClient>
  takeId:         string
  videoUrl:       string
  videoMimeType:  string
  pieceTitle:     string
  composer:       string
  instrument:     string
  timeSig:        string
  keySignature:   string
  safeStart:      number
  safeEnd:        number | null
}) {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')

  // Download video from signed URL
  const videoResp = await fetch(opts.videoUrl)
  if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.status}`)
  const videoBytes = new Uint8Array(await videoResp.arrayBuffer())

  // Start resumable upload to Gemini Files API
  const initResp = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol':             'resumable',
        'X-Goog-Upload-Command':              'start',
        'X-Goog-Upload-Header-Content-Length': videoBytes.length.toString(),
        'X-Goog-Upload-Header-Content-Type':  opts.videoMimeType,
        'Content-Type':                        'application/json',
      },
      body: JSON.stringify({ file: { displayName: 'performance' } }),
    }
  )
  if (!initResp.ok) throw new Error(`Gemini Files API init failed: ${initResp.status}`)
  const uploadUrl = initResp.headers.get('X-Goog-Upload-URL')
  if (!uploadUrl) throw new Error('No Gemini upload URL returned')

  // Upload video bytes
  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset':  '0',
      'Content-Length':         videoBytes.length.toString(),
    },
    body: videoBytes,
  })
  if (!uploadResp.ok) throw new Error(`Gemini file upload failed: ${uploadResp.status}`)
  const fileInfo = await uploadResp.json()
  const fileUri  = fileInfo.file?.uri
  const fileName = fileInfo.file?.name
  if (!fileUri) throw new Error('No file URI from Gemini upload')

  // Poll until ACTIVE (Gemini processes the video)
  let state = fileInfo.file?.state ?? 'PROCESSING'
  for (let i = 0; i < 30 && state === 'PROCESSING'; i++) {
    await new Promise(r => setTimeout(r, 6000))
    const stateResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    )
    const stateData = await stateResp.json()
    state = stateData.state ?? 'FAILED'
  }
  if (state !== 'ACTIVE') throw new Error(`Gemini file stuck in state: ${state}`)

  const measureRange = opts.safeEnd
    ? `measures ${opts.safeStart}–${opts.safeEnd}`
    : `starting at measure ${opts.safeStart}`
  const keyNote = opts.keySignature ? `Key: ${opts.keySignature}. ` : ''

  const prompt = `You are an expert music performance coach analysing a video recording.

Piece: "${opts.pieceTitle}" by ${opts.composer}
Instrument: ${opts.instrument}
${keyNote}Time signature: ${opts.timeSig}
Recording covers: ${measureRange}

Watch the entire video carefully. Identify specific, concrete performance issues by measure and timestamp.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "score": <integer 0-100 representing overall performance quality>,
  "flags": [
    {
      "measure": <integer measure number>,
      "type": "timing"|"intonation"|"dynamics"|"technique"|"error",
      "title": "<8 words max>",
      "detail": "<1-2 sentences of specific, actionable coaching advice>",
      "timestamp_start": <seconds as number>,
      "timestamp_end": <seconds as number>
    }
  ]
}`

  // Call Gemini generateContent
  const genResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { fileData: { mimeType: opts.videoMimeType, fileUri } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature:      0.1,
          maxOutputTokens:  2048,
        },
      }),
    }
  )

  // Clean up Gemini file in the background (non-fatal)
  if (fileName) {
    fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  if (!genResp.ok) {
    const errTxt = await genResp.text()
    throw new Error(`Gemini generateContent failed: ${genResp.status} — ${errTxt.slice(0, 200)}`)
  }

  const genData = await genResp.json()
  const rawText = genData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let parsed: { score?: unknown; flags?: unknown[] } = {}
  try {
    parsed = JSON.parse(rawText)
  } catch {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (m) {
      try { parsed = JSON.parse(m[0]) } catch { /* leave empty */ }
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 72)))
  const flags = (Array.isArray(parsed.flags) ? parsed.flags : []).map((f: any) => ({
    measure:         Number(f.measure)         || opts.safeStart,
    type:            String(f.type             || 'technique'),
    title:           String(f.title            || 'Issue detected'),
    detail:          String(f.detail           || ''),
    timestamp_start: Number(f.timestamp_start) || 0,
    timestamp_end:   Number(f.timestamp_end)   || 0,
  }))

  await opts.admin.from('takes').update({
    job_status:       'done',
    score,
    flags,
    analysis_quality: 'medium',
    analysis_backend: 'gemini-inline',
    job_error:        null,
  }).eq('id', opts.takeId)

  console.log('[analyze-performance] inline Gemini done for take', opts.takeId, '— score:', score)
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const body = await req.json()
    const {
      videoPath,    videoMimeType,
      scorePath,    scoreMimeType,
      pieceTitle,   composer,
      timeSig,      instrument,   keySignature,
      startMeasure, endMeasure,
    } = body

    if (!videoPath || !videoMimeType) {
      return new Response(JSON.stringify({ error: 'videoPath and videoMimeType are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const safeStart = Math.max(1, parseInt(String(startMeasure ?? 1), 10) || 1)
    const safeEnd: number | null = endMeasure
      ? Math.max(safeStart, parseInt(String(endMeasure), 10))
      : null

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Insert take row in processing state
    const { data: take, error: insertError } = await admin
      .from('takes')
      .insert({
        user_id:         user.id,
        piece_title:     pieceTitle  ?? 'Untitled',
        piece_composer:  composer    ?? 'Unknown',
        instrument:      instrument  ?? null,
        video_path:      videoPath,
        video_mime_type: videoMimeType,
        score_path:      scorePath   ?? null,
        score:           null,
        flags:           [],
        job_status:      'processing',
        job_started_at:  new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !take) {
      throw new Error(`DB insert failed: ${insertError?.message}`)
    }

    const takeId = take.id

    // Generate 2-hour signed URLs
    const { data: vSigned } = await admin.storage
      .from('recordings')
      .createSignedUrl(videoPath, 7200)
    const videoSignedUrl = vSigned?.signedUrl ?? null

    let scoreSignedUrl: string | null = null
    if (scorePath) {
      const { data: sSigned } = await admin.storage
        .from('sheet-music')
        .createSignedUrl(scorePath, 7200)
      scoreSignedUrl = sSigned?.signedUrl ?? null
    }

    // ── Try Modal first ───────────────────────────────────────────
    const modalUrl = Deno.env.get('MODAL_WORKER_URL')
    let modalSucceeded = false

    if (modalUrl) {
      const dispatchPayload = {
        take_id:           takeId,
        webhook_url:       `${Deno.env.get('SUPABASE_URL')}/functions/v1/analysis-webhook`,
        webhook_secret:    Deno.env.get('MODAL_WEBHOOK_SECRET'),
        video_url:         videoSignedUrl,
        video_mime_type:   videoMimeType,
        score_url:         scoreSignedUrl,
        score_mime_type:   scoreMimeType   ?? null,
        instrument:        instrument      ?? 'instrument',
        piece_title:       pieceTitle      ?? 'this piece',
        composer:          composer        ?? 'the composer',
        time_sig:          timeSig         ?? '4/4',
        key_signature:     keySignature    ?? '',
        start_measure:     safeStart,
        end_measure:       safeEnd,
        gemini_api_key:    Deno.env.get('GOOGLE_AI_API_KEY'),
        anthropic_api_key: Deno.env.get('ANTHROPIC_API_KEY'),
      }

      const dispatchRes = await fetch(`${modalUrl}/analyze_async`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dispatchPayload),
        signal:  AbortSignal.timeout(8000),
      }).catch((err) => {
        console.warn('[analyze-performance] Modal dispatch error:', (err as Error).message)
        return null
      })

      if (dispatchRes?.ok) {
        modalSucceeded = true
        console.log('[analyze-performance] dispatched take', takeId, 'to Modal')
      } else {
        const status = dispatchRes?.status ?? 'no response'
        console.warn(`[analyze-performance] Modal dispatch failed (${status}), using inline Gemini fallback`)
      }
    }

    // ── Inline Gemini fallback ────────────────────────────────────
    if (!modalSucceeded) {
      if (!videoSignedUrl) {
        await admin.from('takes').update({
          job_status: 'failed',
          job_error:  'Could not generate video signed URL',
        }).eq('id', takeId)
        return new Response(JSON.stringify({ error: 'Could not access uploaded video.' }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }

      const inlineTask = runInlineGemini({
        admin,
        takeId,
        videoUrl:     videoSignedUrl,
        videoMimeType,
        pieceTitle:   pieceTitle   ?? 'Unknown Piece',
        composer:     composer     ?? 'Unknown',
        instrument:   instrument   ?? 'instrument',
        timeSig:      timeSig      ?? '4/4',
        keySignature: keySignature ?? '',
        safeStart,
        safeEnd,
      }).catch(async (err) => {
        console.error('[analyze-performance] inline Gemini error:', (err as Error).message)
        await admin.from('takes').update({
          job_status: 'failed',
          job_error:  `Inline analysis failed: ${(err as Error).message}`,
        }).eq('id', takeId)
      })

      // Return response now; analysis continues in background
      // @ts-ignore — Supabase Edge Runtime global
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(inlineTask)
      } else {
        await inlineTask  // local dev: wait synchronously
      }
    }

    return new Response(JSON.stringify({ jobId: takeId, status: 'processing' }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (err) {
    console.error('[analyze-performance] unhandled error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
