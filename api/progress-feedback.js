import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { period = 'weekly', takes = [] } = req.body ?? {}

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const periodLabel = period === 'weekly' ? 'week' : 'month'

  const scoredTakes = takes.filter(t => t.score != null)
  const avgScore = scoredTakes.length > 0
    ? Math.round(scoredTakes.reduce((sum, t) => sum + t.score, 0) / scoredTakes.length)
    : null

  const uniquePieces = [...new Set(takes.map(t => t.piece_title).filter(Boolean))]

  const takesSummary = takes.map((t, i) => {
    const date = t.created_at
      ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Unknown date'
    const flagTypes = (t.flags ?? []).reduce((acc, f) => {
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
- Strengths: what went well, even if scores were low (e.g. consistency, coverage).
- Patterns: recurring issue types across sessions (timing, dynamics, intonation, etc.).
- Next steps: concrete, achievable practice targets for the coming ${periodLabel}.
- If there are no sessions, return the JSON with encouragement to start practicing.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: `Generate the ${periodLabel} practice review now.` }],
    })

    const raw = response.content[0].text.trim()
    let feedback
    try {
      feedback = JSON.parse(raw)
    } catch {
      const stripped = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      feedback = JSON.parse(stripped)
    }

    res.status(200).json({ feedback })
  } catch (err) {
    res.status(500).json({ error: 'Feedback unavailable' })
  }
}
