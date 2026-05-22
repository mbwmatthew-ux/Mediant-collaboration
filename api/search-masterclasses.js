export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { title, composer, instrument } = req.query
  if (!title) return res.status(400).json({ error: 'title is required' })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return res.status(200).json({ videos: [], unavailable: true })

  // Build query: piece title + composer (if known) + instrument + "masterclass"
  const parts = [title]
  if (composer && composer !== 'Unknown') parts.push(composer)
  if (instrument) parts.push(instrument)
  parts.push('masterclass')
  const q = parts.join(' ')

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('q', q)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', '8')
  url.searchParams.set('relevanceLanguage', 'en')
  url.searchParams.set('order', 'relevance')

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      console.error('YouTube API error:', await response.text())
      return res.status(200).json({ videos: [], error: 'YouTube search unavailable' })
    }
    const data = await response.json()

    const videos = (data.items ?? []).map(item => ({
      id:          item.id.videoId,
      title:       item.snippet.title,
      channel:     item.snippet.channelTitle,
      thumbnail:   item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? null,
      publishedAt: item.snippet.publishedAt,
    }))

    return res.status(200).json({ videos })
  } catch (err) {
    console.error('search-masterclasses error:', err.message)
    return res.status(200).json({ videos: [], error: 'YouTube search unavailable' })
  }
}
