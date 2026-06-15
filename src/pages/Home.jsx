import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTakes } from '../hooks/useTakes'
import Onboarding from '../components/Onboarding'
import styles from './Home.module.css'
import { playPop } from '../utils/sounds'

function greet(name) {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${part}, ${name?.split(' ')[0] || 'there'}`
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins || 1} min ago`
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function calcStreak(sessions) {
  if (!sessions.length) return 0
  const today = new Date(); today.setHours(0,0,0,0)
  const dateSet = new Set(
    sessions.map(s => {
      const d = new Date(s.created_at || s.date || '')
      d.setHours(0,0,0,0)
      return d.getTime()
    }).filter(Boolean)
  )
  const check = new Date(today)
  if (!dateSet.has(check.getTime())) check.setDate(check.getDate() - 1)
  let streak = 0
  while (dateSet.has(check.getTime())) { streak++; check.setDate(check.getDate() - 1) }
  return streak
}

function scoreColor(n) {
  if (n >= 88) return 'var(--accent)'
  if (n >= 74) return 'var(--gold)'
  return 'var(--coral)'
}

/* Group takes by piece title into song threads */
function buildThreads(takes) {
  const map = {}
  for (const t of takes) {
    const key = t.piece_title || 'Untitled'
    if (!map[key]) map[key] = { title: key, composer: t.piece_composer || '', takes: [], latestScore: null, latestDate: null }
    map[key].takes.push(t)
  }
  return Object.values(map).map(thread => ({
    ...thread,
    latestScore: thread.takes[0]?.score ?? null,
    latestDate: thread.takes[0]?.created_at ?? null,
    takeCount: thread.takes.length,
  })).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate))
}

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const takes = useTakes({ limit: 20 })
  const sessions = takes ?? []
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!user) return
    const serverDone = user.user_metadata?.onboarded === true
    const localDone  = !!localStorage.getItem('mediant_onboarded')
    if (!serverDone && !localDone) setShowOnboarding(true)
  }, [user])

  const lastTake   = sessions[0] ?? null
  const streak     = useMemo(() => calcStreak(sessions), [sessions])
  const threads    = useMemo(() => buildThreads(sessions), [sessions])
  const latestScore = lastTake?.score ?? null
  const activePieces = threads.length

  const continueTake  = lastTake

  /* Technique trends: compare flag counts between newest and older takes */
  const techniqueTrends = useMemo(() => {
    const keys = ['timing', 'intonation', 'dynamics', 'articulation']
    const countFlags = (takeList) => {
      const c = Object.fromEntries(keys.map(k => [k, 0]))
      for (const t of takeList) {
        for (const f of t.flags ?? []) {
          const type = f.type?.toLowerCase()
          if (type in c) c[type]++
        }
      }
      return c
    }
    const newest = countFlags(sessions.slice(0, 3))
    const older  = countFlags(sessions.slice(3, 8))
    const labels = { timing: 'Timing', intonation: 'Intonation', dynamics: 'Dynamics', articulation: 'Articulation' }
    return keys.map(k => {
      const diff = sessions.length >= 4 ? older[k] - newest[k] : null
      const delta = diff === null ? '—' : diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : '0%'
      return { label: labels[k], key: k, delta, isIssue: diff !== null && diff < 0 }
    })
  }, [sessions])

  /* Practice priorities from flags */
  const priorities = useMemo(() => {
    if (!lastTake?.flags?.length) return []
    return lastTake.flags
      .filter(f => f.type && f.detail)
      .slice(0, 2)
      .map(f => ({
        text: f.detail?.slice(0, 80) || f.type,
        sub: f.type ? `${f.type.charAt(0).toUpperCase() + f.type.slice(1)} issue` : 'Recurring feedback',
      }))
  }, [lastTake])

  const loading = takes === undefined

  return (
    <div className={styles.page}>
      {showOnboarding && user && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      <div className={styles.greeting}>
        <h1 className={styles.greetTitle}>{greet(user?.name)}</h1>
        <p className={styles.greetSub}>
          {streak > 0
            ? `Day ${streak} of your practice streak — ready to continue?`
            : 'Ready to continue your musical journey?'}
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statBig}>{streak} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-faint)' }}>days</span></span>
            <span className={styles.statLabel}>Practice streak</span>
          </div>
          <CircularGauge value={Math.min(streak, 30)} max={30} />
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statBig} style={{ color: latestScore != null ? scoreColor(latestScore) : 'var(--text-faint)' }}>
              {latestScore != null ? `${latestScore}` : '—'}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-faint)' }}>{latestScore != null ? '/100' : ''}</span>
            </span>
            <span className={styles.statLabel}>Latest performance</span>
          </div>
          <CircularGauge value={latestScore ?? 0} max={100} color={latestScore != null ? scoreColor(latestScore) : undefined} />
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statBig}>{activePieces}</span>
            <span className={styles.statLabel}>Active pieces</span>
          </div>
          <CircularGauge value={Math.min(activePieces, 10)} max={10} />
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Main column ─────────────────────────────── */}
        <div className={styles.mainCol}>
          {/* ── Continue Practicing ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Continue Practicing</h2>
              <button
                className={styles.ctaBtn}
                onClick={() => { playPop(); nav('/record') }}
              >
                <PlusIcon /> Record New Take
              </button>
            </div>

            {loading ? (
              <div className={styles.emptyCard}><span className={styles.loadingDots}><span/><span/><span/></span></div>
            ) : continueTake ? (
              <div className={styles.continueCard}>
                <div className={styles.continueCardLeft}>
                  <div className={styles.sheetThumb}><MusicNoteIcon /></div>
                  <div className={styles.continueInfo}>
                    <h3 className={styles.continuePiece}>{continueTake.piece_title || 'Untitled'}</h3>
                    <p className={styles.continueComposer}>{continueTake.piece_composer || 'Unknown'}</p>
                    <div className={styles.continueMeta}>
                      <ClockIcon />
                      <span>{formatDate(continueTake.created_at)}</span>
                      {continueTake.score != null && (
                        <>
                          <span className={styles.metaDot}>·</span>
                          <span>Progress: <strong style={{ color: scoreColor(continueTake.score) }}>{continueTake.score}%</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.continueActions}>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => { playPop(); nav(`/takes?piece=${encodeURIComponent(continueTake.piece_title || '')}`) }}
                  >
                    View Thread
                  </button>
                  <button
                    className={styles.goldBtn}
                    onClick={() => { playPop(); nav('/record') }}
                  >
                    Record Take
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyCard}>
                <p className={styles.emptyText}>No sessions yet.</p>
                <button className={styles.goldBtn} onClick={() => { playPop(); nav('/record') }}>
                  Upload your first recording →
                </button>
              </div>
            )}
          </div>

          {/* ── Recent Song Threads ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Song Threads</h2>
              <button className={styles.viewAllLink} onClick={() => { playPop(); nav('/takes') }}>
                View All
              </button>
            </div>

            <div className={styles.threadsCard}>
              {loading ? (
                <div className={styles.threadEmpty}>Loading…</div>
              ) : threads.length === 0 ? (
                <div className={styles.threadEmpty}>No sessions yet — upload your first recording.</div>
              ) : (
                threads.slice(0, 5).map((thread, i) => (
                  <button
                    key={thread.title + i}
                    className={styles.threadRow}
                    onClick={() => { playPop(); nav(`/takes?piece=${encodeURIComponent(thread.title)}`) }}
                  >
                    <div className={styles.threadThumb}><MusicNoteSmallIcon /></div>
                    <div className={styles.threadInfo}>
                      <span className={styles.threadTitle}>{thread.title}</span>
                      <span className={styles.threadSub}>{thread.composer || 'Unknown'}</span>
                    </div>
                    <div className={styles.threadRight}>
                      <span className={styles.threadTakes}>{thread.takeCount} take{thread.takeCount !== 1 ? 's' : ''}</span>
                      {thread.latestScore != null && (
                        <span className={styles.threadScore} style={{ color: scoreColor(thread.latestScore) }}>
                          Score: {thread.latestScore}/100
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────── */}
        <div className={styles.sideCol}>

          {/* Technique Trends */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Technique Trends</h3>
            <div className={styles.trendsGrid}>
              {techniqueTrends.map(t => (
                <div key={t.key} className={styles.trendRow}>
                  <span className={styles.trendLabel}>{t.label}</span>
                  <span className={styles.trendDelta} style={{
                    color: t.delta === '—' ? 'var(--text-faintest)' : t.isIssue ? 'var(--coral)' : 'var(--mint)'
                  }}>
                    {t.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Practice Priorities */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Practice Priorities</h3>
            {priorities.length > 0 ? (
              <div className={styles.priorityList}>
                {priorities.map((p, i) => (
                  <div key={i} className={styles.priorityItem}>
                    <p className={styles.priorityText}>{p.text}</p>
                    <span className={styles.prioritySub}>{p.sub}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.priorityEmpty}>
                {sessions.length > 0
                  ? 'Great work — no recurring issues from recent sessions.'
                  : 'Upload a recording to see personalized practice priorities.'}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Circular gauge ──────────────────────────────────────── */
function CircularGauge({ value, max, size = 44, color }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const fraction = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circ * (1 - fraction)
  const accentColor = color || 'var(--accent)'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={styles.statGauge}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--surface-hover)" strokeWidth="3.5" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke={accentColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

/* ── Icons ────────────────────────────────────────────────── */
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  )
}
function MusicNoteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )
}
function MusicNoteSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )
}
