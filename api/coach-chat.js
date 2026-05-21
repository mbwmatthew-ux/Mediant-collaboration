import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, context = {}, history = [] } = req.body ?? {}
  if (!message) return res.status(400).json({ error: 'Missing message' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextLines = []
  if (context.pieceTitle) {
    contextLines.push(
      `The student is currently working on "${context.pieceTitle}"${context.pieceComposer ? ` by ${context.pieceComposer}` : ''}.`
    )
  }
  if (context.score != null) {
    contextLines.push(`Their last recorded performance scored ${context.score}/100.`)
  }
  if (context.flags?.length) {
    contextLines.push(`Flagged issues from their last session: ${context.flags.map(f => f.title).join(', ')}.`)
  }

  const system = [
    'You are a warm, knowledgeable music teacher and practice coach. You help students improve through clear, encouraging, and practical advice.',
    'Answer questions about technique, theory, interpretation, practice strategies, and musical expression.',
    'Keep responses focused — 2 to 5 sentences unless a longer explanation is genuinely needed. Speak like a real teacher, not a textbook.',
    ...contextLines,
  ].join(' ')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    })
    res.status(200).json({ reply: response.content[0].text.trim() })
  } catch {
    res.status(500).json({ error: 'Coach unavailable' })
  }
}
