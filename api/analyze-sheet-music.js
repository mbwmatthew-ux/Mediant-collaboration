import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Analyze this sheet music image and return ONLY a JSON object with these exact keys:
- "title": the piece title as printed (string or null)
- "composer": the composer name as printed (string or null)
- "era": one of "Baroque", "Classical", "Romantic", "Modern" — infer from composer/style
- "difficulty": one of "Beginner", "Intermediate", "Advanced" — based on notation complexity
- "key": the key signature as a string e.g. "D♭ major" or "A minor" (string or null)
- "time": the time signature e.g. "4/4" or "3/4" (string or null)

To identify the key signature, focus specifically on the VERY BEGINNING of the first staff line:
1. Look immediately to the right of the clef symbol (treble, bass, or alto clef) for any sharp (♯) or flat (♭) symbols placed on specific staff lines/spaces — these form the key signature.
2. Count the sharps or flats carefully:
   - 0 accidentals → C major or A minor
   - 1 sharp (F♯) → G major or E minor
   - 2 sharps (F♯ C♯) → D major or B minor
   - 3 sharps → A major or F♯ minor
   - 4 sharps → E major or C♯ minor
   - 5 sharps → B major or G♯ minor
   - 6 sharps → F♯ major or D♯ minor
   - 7 sharps → C♯ major or A♯ minor
   - 1 flat (B♭) → F major or D minor
   - 2 flats (B♭ E♭) → B♭ major or G minor
   - 3 flats → E♭ major or C minor
   - 4 flats → A♭ major or F minor
   - 5 flats → D♭ major or B♭ minor
   - 6 flats → G♭ major or E♭ minor
   - 7 flats → C♭ major or A♭ minor
3. Determine major vs minor by examining the character of the piece (tempo marking, title, and melodic/harmonic content).
4. Also look for the time signature (a fraction-like number such as 4/4, 3/4, 6/8) immediately after the key signature.

Return only valid JSON. No markdown fences, no extra text.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, mediaType } = req.body ?? {}
  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: 'Missing image data' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const imageContent = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType,           data: imageBase64 } }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [imageContent, { type: 'text', text: PROMPT }],
      }],
    })

    const raw = message.content[0].text.trim().replace(/^```(?:json)?\n?|\n?```$/g, '')
    const data = JSON.parse(raw)
    return res.status(200).json(data)
  } catch {
    return res.status(200).json({ title: null, composer: null, era: null, difficulty: null, key: null, time: null })
  }
}
