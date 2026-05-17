import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import styles from './PieceDetailPanel.module.css'

function scoreColor(n) {
  if (n >= 88) return '#8fbe9f'
  if (n >= 74) return 'var(--gold)'
  return 'var(--coral)'
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

export default function PieceDetailPanel({ piece, onClose }) {
  const nav        = useNavigate()
  const scoreEl    = useRef(null)
  const osmdRef    = useRef(null)

  const [scoreFetching, setScoreFetching] = useState(false)
  const [scoreReady,    setScoreReady]    = useState(false)
  const [scoreSource,   setScoreSource]   = useState(null)
  const [pastSessions,  setPastSessions]  = useState([])

  // Load past sessions for this piece from localStorage
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('mediant_takes') || '[]')
      setPastSessions(all.filter(t =>
        t.piece_title?.toLowerCase() === piece.title?.toLowerCase()
      ))
    } catch { setPastSessions([]) }
  }, [piece.title])

  // Fetch and render sheet music
  useEffect(() => {
    if (!scoreEl.current) return
    setScoreFetching(true)
    setScoreReady(false)

    fetch('/api/get-score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pieceTitle: piece.title, composer: piece.composer }),
    })
      .then(r => r.json())
      .then(({ xml, source }) => {
        setScoreSource(source ?? null)
        if (!xml || !scoreEl.current) { setScoreReady(true); return }

        const osmd = new OpenSheetMusicDisplay(scoreEl.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          measureNumberInterval: 4,
        })
        osmdRef.current = osmd
        return osmd.load(xml)
          .then(() => { osmd.render(); setScoreReady(true) })
          .catch(() => setScoreReady(true))
      })
      .catch(() => setScoreReady(true))
      .finally(() => setScoreFetching(false))
  }, [piece.title, piece.composer])

  function startRecording() {
    sessionStorage.setItem('mediant_prefill', JSON.stringify({
      pieceTitle: piece.title,
      composer:   piece.composer,
      instrument: piece.instrument,
    }))
    nav('/record')
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>← Back</button>
          <div className={styles.headerMeta}>
            <h2 className={styles.pieceTitle}>{piece.title}</h2>
            <p className={styles.pieceSub}>
              {piece.composer} · {piece.instrument} · {piece.era} · {piece.difficulty}
              {piece.key && piece.key !== '—' ? ` · ${piece.key}` : ''}
              {piece.time && piece.time !== '—' ? ` · ${piece.time}` : ''}
            </p>
          </div>
          <button className={styles.recordBtn} onClick={startRecording}>
            Start Recording →
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className={styles.body}>

          {/* Sheet music */}
          <div className={styles.scoreSection}>
            {scoreFetching && (
              <div className={styles.scoreLoading}>
                <div className={styles.spinner} />
                <p>Searching for sheet music…</p>
              </div>
            )}
            <div ref={scoreEl} />
            {scoreReady && scoreSource && (
              <p className={styles.sourceLabel}>
                {scoreSource === 'mutopia'
                  ? 'Sheet music from Mutopia Project (public domain)'
                  : 'AI-approximated sheet music — may not be note-perfect'}
              </p>
            )}
            {scoreReady && !scoreSource && !scoreFetching && (
              <div className={styles.noScore}>
                <p>Sheet music not available for this piece yet.</p>
              </div>
            )}
          </div>

          {/* Past sessions */}
          <div className={styles.sessionsSection}>
            <h3 className={styles.sessionsTitle}>Past Sessions</h3>
            {pastSessions.length === 0 ? (
              <p className={styles.noSessions}>
                No recordings yet.<br />Hit "Start Recording" to add your first take.
              </p>
            ) : (
              <div className={styles.sessionList}>
                {pastSessions.map((t, i) => (
                  <div key={t.id || i} className={styles.sessionCard}>
                    <div className={styles.sessionRow}>
                      <span className={styles.sessionDate}>{formatDate(t.date)}</span>
                      {t.score != null && (
                        <span className={styles.sessionScore} style={{ color: scoreColor(t.score) }}>
                          {t.score}/100
                        </span>
                      )}
                    </div>
                    {t.flags?.length > 0 && (
                      <div className={styles.flagList}>
                        {t.flags.map((f, fi) => (
                          <div key={fi} className={styles.flagItem}>
                            <span className={styles.flagTag}>m.{f.measure} · {f.type}</span>
                            <span className={styles.flagTitle}>{f.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
