import Anthropic from '@anthropic-ai/sdk'

const PROMPT_STEP1 = `Look at this sheet music image. I need you to identify the key signature by carefully examining the very beginning of the first staff line.

Step 1 — Identify the clef:
The clef is the large decorative symbol at the far left of the staff. Common clefs:
- Treble clef: a large ornate curling symbol (like a stylised 'G'). Its decorative curls and the loop at the bottom are part of the clef itself — they are NOT key signature accidentals.
- Bass clef: looks like a backwards 'C' with two dots to the right. The dots are part of the clef — NOT accidentals.
- Alto/tenor clef: a 'B'-shaped bracket.

Step 2 — Identify key signature accidentals:
Immediately after the clef ends (before the time signature and before any notes), look for:
- Flat signs (♭): each looks like a small, clean lowercase 'b' sitting ON a staff line or space. They are smaller and simpler than the clef.
- Sharp signs (♯): each looks like a small '#' or tic-tac-toe grid sitting ON a staff line or space.
These will appear as a group of identical symbols (all flats or all sharps — never mixed).

IMPORTANT: Do NOT count any part of the clef symbol itself. The clef's curves, serifs, loops, or dots are decorative — ignore them. Only count the small standalone ♭ or ♯ symbols that appear AFTER the clef has ended.

Step 3 — Count and report:
- How many flat signs (♭) do you see in the key signature? (Could be 0)
- How many sharp signs (♯) do you see in the key signature? (Could be 0)
- What is the time signature? (e.g. 4/4, 3/4, 6/8 — the fraction-like number after the key signature)

Reply with just these three answers, clearly labelled: "Flats: N", "Sharps: N", "Time: X".`

const PROMPT_STEP2 = (keyCandidates, time) => `Based on the key signature already identified (${keyCandidates}), determine whether this piece is in the major or minor key by looking at:
- The tempo/expression marking (e.g. "Allegro", "Adagio", "con fuoco")
- The overall mood and character visible in the notation
- The title if printed

Return ONLY valid JSON with no markdown fences:
{
  "title": string or null,
  "composer": string or null,
  "era": "Baroque"|"Classical"|"Romantic"|"Modern",
  "difficulty": "Beginner"|"Intermediate"|"Advanced",
  "key": "${keyCandidates.split(' or ')[0]} or ${keyCandidates.split(' or ')[1]} — pick the correct one",
  "time": "${time || 'string or null'}"
}
Replace the "key" value with just the single correct key (e.g. "D minor" or "F major"), not both options.`

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
    // Step 1: model counts flats/sharps visually
    const step1 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: [imageContent, { type: 'text', text: PROMPT_STEP1 }] }],
    })
    const observation = step1.content[0].text.trim()

    // Parse counts from the model's response
    const flatMatch  = observation.match(/flats?:\s*(\d+)/i)
    const sharpMatch = observation.match(/sharps?:\s*(\d+)/i)
    const timeMatch  = observation.match(/time:\s*([^\n,]+)/i)

    const numFlats  = flatMatch  ? parseInt(flatMatch[1],  10) : 0
    const numSharps = sharpMatch ? parseInt(sharpMatch[1], 10) : 0
    const timeStr   = timeMatch  ? timeMatch[1].trim() : null

    // Programmatic circle-of-fifths mapping — no model guesswork
    const KEY_FLATS  = [null, 'F major or D minor', 'B♭ major or G minor', 'E♭ major or C minor',
                        'A♭ major or F minor', 'D♭ major or B♭ minor', 'G♭ major or E♭ minor', 'C♭ major or A♭ minor']
    const KEY_SHARPS = [null, 'G major or E minor', 'D major or B minor', 'A major or F♯ minor',
                        'E major or C♯ minor', 'B major or G♯ minor', 'F♯ major or D♯ minor', 'C♯ major or A♯ minor']

    let keyCandidates = 'C major or A minor'
    if (numFlats > 0 && numFlats <= 7)  keyCandidates = KEY_FLATS[numFlats]
    if (numSharps > 0 && numSharps <= 7) keyCandidates = KEY_SHARPS[numSharps]

    // Step 2: model picks major/minor and fills in all other metadata
    const step2 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        { role: 'user',      content: [imageContent, { type: 'text', text: PROMPT_STEP1 }] },
        { role: 'assistant', content: observation },
        { role: 'user',      content: PROMPT_STEP2(keyCandidates, timeStr) },
      ],
    })

    const raw = step2.content[0].text.trim().replace(/^```(?:json)?\n?|\n?```$/g, '')
    const data = JSON.parse(raw)
    return res.status(200).json(data)
  } catch {
    return res.status(200).json({ title: null, composer: null, era: null, difficulty: null, key: null, time: null })
  }
}
