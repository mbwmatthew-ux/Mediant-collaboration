import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Claude coaching fallback (no video, uses piece metadata) ─────────────────
// Used when Modal is unavailable. Generates real coaching notes without timestamps.
async function runClaudeCoaching(opts: {
  admin:        ReturnType<typeof createClient>
  takeId:       string
  scoreUrl:     string | null
  scoreMimeType: string | null
  pieceTitle:   string
  composer:     string
  instrument:   string
  timeSig:      string
  keySignature: string
  safeStart:    number
  safeEnd:      number | null
}) {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const measureRange = opts.safeEnd
    ? `measures ${opts.safeStart}–${opts.safeEnd}`
    : `from measure ${opts.safeStart}`

  const keyNote = opts.keySignature ? `Key: ${opts.keySignature}. ` : ''

  // Build content — include score image if available and it's an image
  const userContent: Anthropic.MessageParam['content'] = []

  if (opts.scoreUrl && opts.scoreMimeType?.startsWith('image/')) {
    try {
      const imgResp = await fetch(opts.scoreUrl)
      if (imgResp.ok) {
        const imgBytes = new Uint8Array(await imgResp.arrayBuffer())
        const b64 = btoa(String.fromCharCode(...imgBytes))
        userContent.push({
          type: 'image',
          source: {
            type:       'base64',
            media_type: opts.scoreMimeType as 'image/jpeg' | 'image/png' | 'image/webp',
            data:       b64,
          },
        })
      }
    } catch { /* skip image if fetch fails */ }
  }

  userContent.push({
    type: 'text',
    text: `You are an expert music performance coach reviewing a student's practice session.

Piece: "${opts.pieceTitle}" by ${opts.composer}
Instrument: ${opts.instrument}
${keyNote}Time signature: ${opts.timeSig}
Passage recorded: ${measureRange}

${userContent.length > 1 ? 'The sheet music is attached above. ' : ''}Based on this piece, instrument, and passage, identify the most likely technical and musical challenges a student would face. Give specific, actionable coaching notes.

Return ONLY valid JSON (no markdown):
{
  "score": null,
  "flags": [
    {
      "measure": <integer — the measure this note applies to>,
      "type": "timing"|"intonation"|"dynamics"|"technique"|"error",
      "title": "<8 words max>",
      "detail": "<2-3 sentences of specific coaching advice for this passage>",
      "timestamp_start": 0,
      "timestamp_end": 0
    }
  ]
}

Include 3–6 flags covering the most important areas to work on. Be specific to this piece and instrument, not generic.`,
  })

  const message = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages:   [{ role: 'user', content: userContent }],
  })

  const rawText = ((message.content[0] as { type: string; text: string }).text ?? '{}').trim()

  let parsed: { score?: unknown; flags?: unknown[] } = {}
  try {
    const jsonStr = rawText.startsWith('{') ? rawText : rawText.slice(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1)
    parsed = JSON.parse(jsonStr)
  } catch { /* leave empty */ }

  const flags = (Array.isArray(parsed.flags) ? parsed.flags : []).map((f: any) => ({
    measure:         Number(f.measure)         || opts.safeStart,
    type:            String(f.type             || 'technique'),
    title:           String(f.title            || 'Coaching note'),
    detail:          String(f.detail           || ''),
    timestamp_start: 0,
    timestamp_end:   0,
  }))

  await opts.admin.from('takes').update({
    job_status:       'done',
    score:            null,
    flags,
    analysis_quality: 'low',
    analysis_backend: 'claude-coaching',
    job_error:        null,
  }).eq('id', opts.takeId)

  console.log('[analyze-performance] Claude coaching done for take', opts.takeId, '—', flags.length, 'flags')
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
        console.warn(`[analyze-performance] Modal unavailable (${status}), falling back to Claude coaching`)
      }
    }

    // ── Claude coaching fallback ──────────────────────────────────
    if (!modalSucceeded) {
      const fallbackTask = runClaudeCoaching({
        admin,
        takeId,
        scoreUrl:     scoreSignedUrl,
        scoreMimeType: scoreMimeType ?? null,
        pieceTitle:   pieceTitle   ?? 'Unknown Piece',
        composer:     composer     ?? 'Unknown',
        instrument:   instrument   ?? 'instrument',
        timeSig:      timeSig      ?? '4/4',
        keySignature: keySignature ?? '',
        safeStart,
        safeEnd,
      }).catch(async (err) => {
        console.error('[analyze-performance] Claude coaching error:', (err as Error).message)
        await admin.from('takes').update({
          job_status: 'failed',
          job_error:  `Coaching analysis failed: ${(err as Error).message}`,
        }).eq('id', takeId)
      })

      // Return response now; analysis continues in background
      // @ts-ignore — Supabase Edge Runtime global
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(fallbackTask)
      } else {
        await fallbackTask  // local dev: wait synchronously
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
