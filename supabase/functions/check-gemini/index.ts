import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Models that can process video via the Files API
const VIDEO_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')

  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'GOOGLE_AI_API_KEY is not set in Supabase edge function secrets.',
      fix: 'Go to Supabase dashboard → Edge Functions → Manage secrets → add GOOGLE_AI_API_KEY',
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // 1. List available models
  let allModels: string[] = []
  let listError: string | null = null
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
    )
    if (!r.ok) {
      const txt = await r.text()
      listError = `Models list API returned ${r.status}: ${txt.slice(0, 300)}`
    } else {
      const json = await r.json()
      allModels = (json.models ?? []).map((m: { name: string }) =>
        m.name.replace('models/', '')
      )
    }
  } catch (e) {
    listError = `Network error fetching model list: ${(e as Error).message}`
  }

  const availableVideoModels = allModels.filter(m =>
    VIDEO_MODELS.some(vm => m.includes(vm))
  )

  // 2. Quick text-gen smoke test on the first available model (confirms billing/quota)
  let smokeOk = false
  let smokeError: string | null = null
  const testModel = availableVideoModels[0] ?? 'gemini-1.5-flash'
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with the single word: working' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    )
    if (r.ok) {
      const json = await r.json()
      const reply = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      smokeOk = reply.toLowerCase().includes('working')
      if (!smokeOk) smokeError = `Unexpected reply: "${reply.slice(0, 80)}"`
    } else {
      const txt = await r.text()
      smokeError = `${r.status}: ${txt.slice(0, 300)}`
    }
  } catch (e) {
    smokeError = (e as Error).message
  }

  // 3. Test Files API init (video upload endpoint) — just the start, no actual upload
  let filesApiOk = false
  let filesApiError: string | null = null
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': '1000',
          'X-Goog-Upload-Header-Content-Type': 'video/mp4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { displayName: 'test' } }),
      }
    )
    if (r.ok) {
      const uploadUrl = r.headers.get('X-Goog-Upload-URL')
      filesApiOk = !!uploadUrl
      if (!filesApiOk) filesApiError = 'Files API init succeeded but no upload URL returned'
    } else {
      const txt = await r.text()
      filesApiError = `${r.status}: ${txt.slice(0, 300)}`
    }
  } catch (e) {
    filesApiError = (e as Error).message
  }

  const allGood = !listError && availableVideoModels.length > 0 && smokeOk && filesApiOk

  return new Response(JSON.stringify({
    ok: allGood,
    summary: allGood
      ? `Gemini is working. Best model: ${availableVideoModels[0]}`
      : 'Gemini has issues — see details below.',
    details: {
      apiKeySet: true,
      modelListError: listError,
      allModels: allModels.slice(0, 20),
      videoCapableModels: availableVideoModels,
      smokeTest: { model: testModel, ok: smokeOk, error: smokeError },
      filesApi: { ok: filesApiOk, error: filesApiError },
    },
    nextSteps: allGood ? [] : [
      !apiKey               && 'Set GOOGLE_AI_API_KEY in Supabase edge function secrets',
      listError             && `Model list failed: ${listError}`,
      availableVideoModels.length === 0 && 'No video-capable Gemini models found — check that Gemini API is enabled in your Google Cloud project or AI Studio',
      !smokeOk && smokeError && `Text generation failed (${smokeError}) — API key may be invalid or quota exhausted`,
      !filesApiOk && filesApiError && `Files API failed (${filesApiError}) — video analysis requires Gemini Files API access (paid/billing required on some plans)`,
    ].filter(Boolean),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
