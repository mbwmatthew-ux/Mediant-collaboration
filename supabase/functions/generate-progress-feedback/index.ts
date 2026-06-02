import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'
import { corsHeaders } from '../_shared/cors.ts'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

serve(async (req) => {
  const CORS = corsHeaders(req)
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

    const { period = 'weekly', takes = [] } = await req.json()
    const periodLabel = period === 'weekly' ? 'week' : 'month'

    const scoredTakes = (takes as any[]).filter((t: any) => t.score != null)
    const avgScore = scoredTakes.length > 0
      ? Math.round(scoredTakes.reduce((sum: number, t: any) => sum + t.score, 0) / scoredTakes.length)
      : null

    const uniquePieces = [...new Set((takes as any[]).map((t: any) => t.piece_title).filter(Boolean))]

    const takesSummary = (takes as any[]).map((t: any, i: number) => {
      const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Unknown date'
      const flagTypes = (t.flags ?? []).reduce((acc: Record<string, number>, f: any) => {
        acc[f.type] = (acc[f.type] || 0) + 1
        return acc
      }, {})
      const flagSummary = Object.entries(flagTypes).map(([type, count]) => `${count} ${type}`).join(', ')
      return `Session ${i + 1} — ${date}
  Piece: "${t.piece_title ?? 'Untitled'}" by ${t.piece_composer ?? 'Unknown'}
  Instrument: ${t.instrument ?? 'Not specified'}
  Score: ${t.score != null ? `${t.score}/100` : 'unscored'}
  Issues flagged: ${t.flags?.length ?? 0}${flagSummary ? ` (${flagSummary})` : ''}`
    }).join('\n\n')

    const system = `You are a warm, expert music coach providing a ${periodLabel} practice review.

The student practiced ${takes.length} session${takes.length !== 1 ? 's' : ''} this ${periodLabel}${avgScore != null ? `, averaging a score of ${avgScore}/100` : ''}.
Pieces worked on: ${uniquePieces.length > 0 ? uniquePieces.join(', ') : 'unknown'}.

SESSIONS THIS ${periodLabel.toUpperCase()}:
${takesSummary || '(no sessions recorded this period)'}

Write a structured ${periodLabel} practice review. Return ONLY valid JSON matching this exact shape with no markdown or extra keys:
{
  "headline": "One punchy sentence (10–15 words) summarising this ${periodLabel}",
  "overview": "2–3 sentences. Highlight consistency, score trend, and pieces covered.",
  "strengths": ["Concrete strength 1", "Concrete strength 2"],
  "patterns": ["Recurring issue or pattern 1", "Recurring issue or pattern 2"],
  "nextSteps": ["Actionable goal 1 for next ${periodLabel}", "Actionable goal 2", "Actionable goal 3"]
}

Rules:
- Reference actual piece names and flag types from the data above.
- Strengths: what went well, even if scores were low.
- Patterns: recurring issue types across sessions (timing, dynamics, intonation, etc.).
- Next steps: concrete, achievable practice targets for the coming ${periodLabel}.
- If there are no sessions, return the JSON with encouragement to start practicing.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: `Generate the ${periodLabel} practice review now.` }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    let feedback
    try {
      feedback = JSON.parse(raw)
    } catch {
      const stripped = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      feedback = JSON.parse(stripped)
    }

    return new Response(JSON.stringify({ feedback }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
