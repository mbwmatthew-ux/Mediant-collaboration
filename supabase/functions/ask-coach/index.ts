import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { message, context, history } = await req.json()
    if (!message) throw new Error('message is required')

    const flags = (context.flags ?? []) as Array<{
      measure: number; type: string; title: string;
      body?: string; raw_detail?: string;
      timestamp_start?: number | null; timestamp_end?: number | null;
    }>

    const layout = context.measureLayout as {
      staff_angle?: number;
      measures?: Array<{ number: number; content: string }>
    } | null

    const alignment = (context.audioAlignment as Array<{ measure: number; start: number; end: number }> | null) ?? []
    const alignmentMap = new Map<number, { start: number; end: number }>()
    for (const a of alignment) alignmentMap.set(a.measure, { start: a.start, end: a.end })

    const layoutMeasures = layout?.measures ?? []
    // The student actually played the measures present in the alignment.
    // If alignment is missing, fall back to layout's visible range.
    const playedMeasures = alignment.length > 0
      ? alignment.map(a => a.measure).sort((a, b) => a - b)
      : layoutMeasures.map(m => m.number)
    const firstMeasure = playedMeasures[0]
    const lastMeasure  = playedMeasures[playedMeasures.length - 1]

    const totalDuration = alignment.length > 0
      ? Math.max(...alignment.map(a => a.end))
      : null

    // Per-measure index combining notation content with the audio window
    // where it was played, so the coach can answer "what was happening at 0:14?"
    const scoreIndex = layoutMeasures.length > 0
      ? layoutMeasures.map(m => {
          const ts = alignmentMap.get(m.number)
          const tsStr = ts ? ` [played ${ts.start.toFixed(1)}s–${ts.end.toFixed(1)}s]` : ' [not played]'
          return `  ${m.number}${tsStr}: ${m.content}`
        }).join('\n')
      : '(score layout not available for this take)'

    const rangeLine = (firstMeasure != null && lastMeasure != null)
      ? `The student played measures ${firstMeasure}–${lastMeasure}${totalDuration != null ? ` over ${totalDuration.toFixed(1)} seconds of recording` : ''}. That is the exact range — do not claim they played outside it.`
      : 'The exact measure range played is not known.'

    const flagSummary = flags.length === 0
      ? '(no specific issues were flagged in this take — the performance was clean)'
      : flags.map((f, i) => {
          const ts = (f.timestamp_start != null && f.timestamp_end != null)
            ? ` [audio ${f.timestamp_start.toFixed(1)}s–${f.timestamp_end.toFixed(1)}s]`
            : ''
          return `#${i + 1}. Measure ${f.measure} · ${f.type}${ts}
  Title: ${f.title}
  What was heard: ${f.raw_detail ?? '(not recorded)'}
  Coaching given to student: ${f.body ?? '(not recorded)'}`
        }).join('\n\n')

    const system = `You are a warm, expert music coach helping a student improve their performance.

The student just performed "${context.pieceTitle ?? 'a piece'}" by ${context.pieceComposer ?? 'unknown composer'}.
Overall score: ${context.score != null ? `${context.score}/100` : 'not scored'}.

RANGE PLAYED:
${rangeLine}

SCORE CONTENT (the notation that was visible in the score image; use this to answer "what's in measure N?" type questions accurately):
${scoreIndex}

FLAGGED ISSUES (what the AI heard go wrong during this take):
${flagSummary}

GROUNDING RULES:
- The information above is your ground truth. Cite measure numbers EXACTLY as they appear in SCORE CONTENT or FLAGGED ISSUES. Never invent a measure number outside the range played.
- If the student asks about a measure that's outside the played range, tell them so — e.g. "you only played measures ${firstMeasure ?? '?'}–${lastMeasure ?? '?'}, so measure X wasn't part of this take."
- You did not hear the recording yourself, but you DO know exactly which measures were played and what notation is in each. Use that when answering specific questions about what was on the page.
- If asked about something not in your ground truth (overall tempo feel, posture, etc.), be honest that it wasn't captured in the analysis.
- Be encouraging but accurate. Keep responses to 2–4 sentences unless asked for more detail.`

    const messages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages,
    })

    const reply = (response.content[0] as { type: string; text: string }).text.trim()

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
