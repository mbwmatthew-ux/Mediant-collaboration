import { useEffect, useState } from 'react'
import styles from './MasterclassPanel.module.css'

function timeAgoYear(iso) {
  if (!iso) return null
  const year = new Date(iso).getFullYear()
  const now   = new Date().getFullYear()
  return year === now ? 'This year' : `${year}`
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
    </div>
  )
}

export default function MasterclassPanel({ pieceTitle, composer, instrument }) {
  const [videos,  setVideos]  = useState(null)   // null = loading, [] = empty
  const [error,   setError]   = useState(null)
  const [unavail, setUnavail] = useState(false)

  useEffect(() => {
    if (!pieceTitle) return
    setVideos(null)
    setError(null)
    setUnavail(false)

    const params = new URLSearchParams({ title: pieceTitle })
    if (composer && composer !== 'Unknown') params.set('composer', composer)
    if (instrument) params.set('instrument', instrument)

    fetch(`/api/search-masterclasses?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.unavailable) { setUnavail(true); return }
        if (data.error)       { setError(data.error); return }
        setVideos(data.videos ?? [])
      })
      .catch(() => setError('Could not load masterclasses.'))
  }, [pieceTitle, composer, instrument])

  if (unavail) return null

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Masterclasses</h2>
        <p className={styles.sectionSub}>
          Expert coaching sessions and performances for{' '}
          <em>{pieceTitle}</em>
          {composer && composer !== 'Unknown' ? ` by ${composer}` : ''}
        </p>
      </div>

      {error ? (
        <p className={styles.errorMsg}>{error}</p>
      ) : videos === null ? (
        // Loading skeleton
        <div className={styles.row}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <p className={styles.emptyMsg}>No masterclasses found for this piece.</p>
      ) : (
        <div className={styles.row}>
          {videos.map(v => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.thumb}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className={styles.thumbImg} loading="lazy" />
                  : <div className={styles.thumbPlaceholder}>♩</div>
                }
                <div className={styles.thumbOverlay}>
                  <span className={styles.playIcon}>▶</span>
                </div>
                <span className={styles.ytBadge}>YouTube</span>
              </div>
              <div className={styles.meta}>
                <p className={styles.videoTitle}>{v.title}</p>
                <p className={styles.channel}>
                  {v.channel}
                  {v.publishedAt && <> · {timeAgoYear(v.publishedAt)}</>}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
