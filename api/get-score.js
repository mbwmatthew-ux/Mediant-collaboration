import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pieceTitle, composer } = req.body ?? {}
  if (!pieceTitle) return res.status(400).json({ error: 'Missing pieceTitle' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Generate valid MusicXML 3.1 for the opening 8 measures of "${pieceTitle}" by ${composer ?? 'the composer'}.

Rules:
- Use the correct key signature, time signature, and melody from the original piece
- Include both treble and bass clef staves if it is a piano piece
- Use proper MusicXML 3.1 structure with score-partwise root element
- Return ONLY the raw MusicXML starting with <?xml version="1.0" encoding="UTF-8"?>
- No markdown, no explanation, no code fences — only the XML itself`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const xml = message.content[0].text.trim()

    // Verify it looks like MusicXML before returning
    if (!xml.startsWith('<?xml') && !xml.startsWith('<score')) {
      return res.status(200).json({ xml: null })
    }

    return res.status(200).json({ xml })
  } catch {
    return res.status(200).json({ xml: null })
  }
}
