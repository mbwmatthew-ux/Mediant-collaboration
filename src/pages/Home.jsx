import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTakes } from '../hooks/useTakes'
import Onboarding from '../components/Onboarding'
import styles from './Home.module.css'
import { playPop, playTick } from '../utils/sounds'

const FLAG_COLOR = {
  intonation: 'var(--coral)',
  rhythm:     'var(--gold)',
  timing:     'var(--gold)',
  dynamics:   'var(--accent)',
  technique:  'var(--accent)',
  articulation: 'var(--accent)',
}

function scoreColor(n) {
  if (n >= 88) return 'var(--accent)'
  if (n >= 74) return 'var(--gold)'
  return 'var(--coral)'
}

function greet(name) {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${part}, ${name?.split(' ')[0] || 'there'}.`
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function calcStreak(sessions) {
  if (!sessions.length) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateSet = new Set(
    sessions.map(s => {
      const d = new Date(s.date || s.created_at || '')
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }).filter(Boolean)
  )
  // If no session today, start from yesterday — streak stays alive until midnight
  const check = new Date(today)
  if (!dateSet.has(check.getTime())) check.setDate(check.getDate() - 1)
  let streak = 0
  while (dateSet.has(check.getTime())) {
    streak++
    check.setDate(check.getDate() - 1)
  }
  return streak
}

function buildWaveformBars(flags = [], count = 52) {
  const hasTimingData = flags.some(f => f.timestamp_start != null && Number(f.timestamp_start) > 0)

  if (!hasTimingData) {
    // No timing breakdown from this analysis — show a neutral decorative bar
    const bars = Array.from({ length: count }, (_, i) => ({
      height: 16 + Math.sin(i * 0.38) * 6 + Math.sin(i * 1.1 + 1) * 3,
      color: 'var(--accent)',
      opacity: 0.2,
    }))
    return { bars, duration: 0, hasTimingData: false }
  }

  const maxTs = flags.reduce((m, f) => Math.max(m, Number(f.timestamp_start) || 0), 0)
  const duration = maxTs * 1.15

  const bars = []
  for (let i = 0; i < count; i++) {
    const tStart = (i / count) * duration
    const tEnd   = ((i + 1) / count) * duration
    const windowFlags = flags.filter(f => {
      const ts = Number(f.timestamp_start) || 0
      return ts >= tStart && ts < tEnd
    })

    let height  = 10
    let color   = 'var(--accent)'
    let opacity = 0.3

    if (windowFlags.length > 0) {
      height  = Math.min(58, 22 + windowFlags.length * 16)
      opacity = 1
      if (windowFlags.some(f => f.type === 'intonation')) {
        color = 'var(--coral)'
      } else if (windowFlags.some(f => ['rhythm', 'timing'].includes(f.type))) {
        color = 'var(--gold)'
      } else {
        color = 'var(--accent)'
      }
    }

    bars.push({ height, color, opacity })
  }
  return { bars, duration, hasTimingData: true }
}

function formatDuration(secs) {
  if (!secs) return '—:——'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()

  const takes = useTakes({ limit: 5 })
  const recentSessions = takes ?? []

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!user) return
    const serverDone = user.user_metadata?.onboarded === true
    const localDone  = !!localStorage.getItem('mediant_onboarded')
    if (!serverDone && !localDone) setShowOnboarding(true)
  }, [user])

  const lastTake  = recentSessions[0] ?? null
  const streak    = useMemo(() => calcStreak(recentSessions), [recentSessions])
  const { bars, duration, hasTimingData } = useMemo(
    () => buildWaveformBars(lastTake?.flags ?? []),
    [lastTake?.flags],
  )

  const todayCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return recentSessions.filter(s => {
      const d = new Date(s.created_at || s.date || '')
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    }).length
  }, [recentSessions])

  const tips = useMemo(() => {
    if (!lastTake?.flags?.length) return []
    return lastTake.flags.slice(0, 3).map(f => ({
      type:   f.type || 'technique',
      title:  f.detail || f.type || 'Practice note',
      body:   typeof f.raw_detail === 'string' ? f.raw_detail.slice(0, 120) : '',
      color:  FLAG_COLOR[f.type] ?? 'var(--accent)',
    }))
  }, [lastTake])

  const subtitle = streak > 0
    ? `Day ${streak} of your practice streak — pick up where you left off.`
    : 'Upload a recording to get started.'

  const pieceName = lastTake
    ? [lastTake.piece_composer, lastTake.piece_title].filter(Boolean).join(' · ')
    : null

  return (
    <div className={styles.dashboard}>
      {showOnboarding && user && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      {/* ── Main column ─────────────────────────────────────── */}
      <div className={styles.mainCol}>

        {/* Greeting */}
        <div className={styles.greeting}>
          <h1 className={styles.greetTitle}>{greet(user?.name)}</h1>
          <p className={styles.greetSub}>{subtitle}</p>
        </div>

        {/* Live analysis hero card */}
        <div className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <div className={styles.heroCardTitleRow}>
              <LiveIcon />
              <span className={styles.heroCardTitle}>Last session</span>
              {pieceName && (
                <span className={styles.piecePill}>{pieceName}</span>
              )}
            </div>
            {lastTake && (
              <button className={styles.heroCardAction} onClick={() => { playPop(); nav(`/analysis?takeId=${lastTake.id}`) }}>
                View →
              </button>
            )}
          </div>

          {lastTake ? (
            <>
              <div className={styles.waveHeader}>
                {hasTimingData ? (
                  <>
                    <span className={styles.waveDesc}>Each bar is a moment in your recording — height and color show where issues were detected.</span>
                    <div className={styles.waveLegendRow}>
                      <span className={styles.waveLegendChip} style={{ '--chip-color': 'var(--coral)' }}>Intonation</span>
                      <span className={styles.waveLegendChip} style={{ '--chip-color': 'var(--gold)' }}>Rhythm</span>
                      <span className={styles.waveLegendChip} style={{ '--chip-color': 'var(--accent)' }}>Other / clean</span>
                    </div>
                  </>
                ) : (
                  <span className={styles.waveNoData}>Timing breakdown not available for this take — view full analysis for details.</span>
                )}
              </div>
              <div className={styles.waveformWrap}>
                {bars.map((bar, i) => (
                  <div
                    key={i}
                    className={styles.waveBar}
                    style={{
                      '--bi': i,
                      height: `${bar.height}px`,
                      opacity: bar.opacity,
                      background: bar.color,
                    }}
                  />
                ))}
              </div>
              {hasTimingData && (
                <div className={styles.waveFooter}>
                  <span>0:00</span>
                  {lastTake.bpm && <span>TEMPO · {lastTake.bpm} BPM</span>}
                  <span>{formatDuration(duration)}</span>
                </div>
              )}
            </>
          ) : (
            <div className={styles.heroEmpty}>
              <button className={styles.heroUploadBtn} onClick={() => { playPop(); nav('/record') }}>
                + Upload a recording
              </button>
            </div>
          )}
        </div>

        {/* Technique tips */}
        <div className={styles.tipsSection}>
          <div className={styles.tipsSectionHeader}>
            <StarIcon />
            <span>Technique tips</span>
          </div>

          {tips.length > 0 ? (
            tips.map((tip, i) => (
              <div key={i} className={styles.tipItem} style={{ borderLeftColor: tip.color }}>
                <strong className={styles.tipTitle}>{tip.title}</strong>
                {tip.body && <span className={styles.tipBody}>{tip.body}</span>}
              </div>
            ))
          ) : (
            <div className={styles.tipsEmpty}>
              {lastTake
                ? 'No flags from your last session — great work!'
                : 'Upload a recording to see personalized tips here.'}
            </div>
          )}
        </div>

      </div>

      {/* ── Right column ────────────────────────────────────── */}
      <div className={styles.rightCol}>

        {/* Stats */}
        <div className={styles.statsCard}>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>TODAY'S SESSIONS</span>
            <div className={styles.statValue}>
              {todayCount} <span className={styles.statUnit}>takes</span>
            </div>
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>TECHNIQUE SCORE</span>
            <div className={styles.statValue} style={{ color: lastTake?.score != null ? scoreColor(lastTake.score) : undefined }}>
              {lastTake?.score ?? '—'} <span className={styles.statUnit}>/100</span>
            </div>
            {lastTake?.score != null && (
              <div className={styles.scoreBar}>
                <div
                  className={styles.scoreBarFill}
                  style={{
                    width: `${lastTake.score}%`,
                    background: scoreColor(lastTake.score),
                  }}
                />
              </div>
            )}
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>STREAK</span>
            <div className={styles.statValue}>
              {streak} <span className={styles.statUnit}>days</span>
            </div>
          </div>
        </div>

        {/* Recent sessions */}
        <div className={styles.recentCard}>
          <div className={styles.recentHeader}>
            <div className={styles.recentHeaderLeft}>
              <ClockIcon />
              <span>Recent sessions</span>
            </div>
            {recentSessions.length > 0 && (
              <button className={styles.viewAllBtn} onClick={() => { playPop(); nav('/takes') }}>
                VIEW ALL
              </button>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className={styles.recentEmpty}>No sessions yet</div>
          ) : (
            recentSessions.map((s, i) => (
              <button
                key={s.id || i}
                className={styles.sessionRow}
                onClick={() => { playTick(); nav(s.id ? `/analysis?takeId=${s.id}` : '/analysis') }}
              >
                <div className={styles.sessionIcon}>♩</div>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionPiece}>
                    {[s.piece_composer, s.piece_title].filter(Boolean).join(' · ') || 'Untitled'}
                  </span>
                  <span className={styles.sessionMeta}>
                    {formatDate(s.created_at || s.date)} · {s.flags?.length ?? 0} tip{(s.flags?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                {s.score != null && (
                  <span className={styles.sessionScore} style={{ color: scoreColor(s.score) }}>
                    {s.score}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

function LiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )
}
