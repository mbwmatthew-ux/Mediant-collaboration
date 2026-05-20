import Anthropic from '@anthropic-ai/sdk'

const PROMPT_STEP1 = `Look at this sheet music image. Focus ONLY on the very beginning of the first staff line — the region immediately to the right of the clef symbol (before the first note).

Describe exactly what you see there:
1. What clef is used? (treble, bass, alto, etc.)
2. Are there any flat signs (♭, which look like a lowercase 'b') placed on the staff lines or spaces? If yes, count them and say which lines they are on.
3. Are there any sharp signs (♯, which look like a '#' or tic-tac-toe grid) placed on the staff lines or spaces? If yes, count them and say which lines they are on.
4. Is there a time signature number visible (like 4/4, 3/4, 6/8)?

IMPORTANT: Describe only what you literally see in the image. Do NOT use your prior knowledge of the piece's name or composer to guess — read the accidentals visually.`

const PROMPT_STEP2 = `Now, based on your observation above, fill in this JSON. Use the key signature rules below:
- 0 accidentals → C major or A minor
- 1 sharp → G major or E minor
- 2 sharps → D major or B minor
- 3 sharps → A major or F♯ minor
- 4 sharps → E major or C♯ minor
- 5 sharps → B major or G♯ minor
- 1 flat → F major or D minor
- 2 flats → B♭ major or G minor
- 3 flats → E♭ major or C minor
- 4 flats → A♭ major or F minor
- 5 flats → D♭ major or B♭ minor
- 6 flats → G♭ major or E♭ minor

Choose major vs minor based on the mood, tempo markings, and title. Return ONLY valid JSON with these keys (no markdown fences, no extra text):
{
  "title": string or null,
  "composer": string or null,
  "era": "Baroque"|"Classical"|"Romantic"|"Modern",
  "difficulty": "Beginner"|"Intermediate"|"Advanced",
  "key": string or null,
  "time": string or null
}`

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
    // Step 1: force the model to describe what it literally sees on the staff
    const step1 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [imageContent, { type: 'text', text: PROMPT_STEP1 }],
      }],
    })
    const observation = step1.content[0].text.trim()

    // Step 2: derive the structured JSON from that observation
    const step2 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        { role: 'user',      content: [imageContent, { type: 'text', text: PROMPT_STEP1 }] },
        { role: 'assistant', content: observation },
        { role: 'user',      content: PROMPT_STEP2 },
      ],
    })

    const raw = step2.content[0].text.trim().replace(/^```(?:json)?\n?|\n?```$/g, '')
    const data = JSON.parse(raw)
    return res.status(200).json(data)
  } catch {
    return res.status(200).json({ title: null, composer: null, era: null, difficulty: null, key: null, time: null })
  }
}
