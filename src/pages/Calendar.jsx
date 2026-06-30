import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTakes } from '../hooks/useTakes'
import styles from './Calendar.module.css'
import { playPop } from '../utils/sounds'

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function Calendar() {
  const nav = useNavigate()
  const takes = useTakes({ limit: 200 })
  const sessions = takes ?? []

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  /* Build set of days that have practice sessions */
  const sessionsByDay = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const d = new Date(s.created_at || '')
      if (isNaN(d)) return
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [sessions])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth   = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth)

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  })

  /* Count practice days this month */
  const practiceDaysThisMonth = Object.keys(sessionsByDay).filter(key => {
    const parts = key.split('-')
    return parseInt(parts[0]) === viewYear && parseInt(parts[1]) === viewMonth
  }).length

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>Practice Calendar</h1>
          <p className={styles.pageSubtitle}>{monthLabel}</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navBtn} onClick={prevMonth} title="Previous month">‹</button>
          <button className={styles.navBtn} onClick={nextMonth} title="Next month">›</button>
          <button className={styles.primaryBtn} onClick={() => { playPop(); nav('/record') }}>
            + New session
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{practiceDaysThisMonth}</span>
          <span className={styles.statLabel}>Practice days this month</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{sessions.length}</span>
          <span className={styles.statLabel}>Total sessions</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {sessions.length > 0
              ? Math.round(sessions.filter(s => s.score != null).reduce((sum, s) => sum + s.score, 0) /
                  Math.max(1, sessions.filter(s => s.score != null).length))
              : '—'}
          </span>
          <span className={styles.statLabel}>Avg score</span>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className={styles.calendarBody}>
        {/* Day-of-week headers */}
        <div className={styles.dayLabels}>
          {DAY_LABELS.map(l => (
            <div key={l} className={styles.dayLabel}>{l}</div>
          ))}
        </div>

        {/* Grid rows */}
        <div className={styles.grid}>
          {cells.map((d, i) => {
            if (d === null) return <div key={`e-${i}`} className={styles.emptyCell} />

            const isToday = d === today.getDate()
              && viewMonth === today.getMonth()
              && viewYear  === today.getFullYear()
            const key      = `${viewYear}-${viewMonth}-${d}`
            const daySessions = sessionsByDay[key] ?? []
            const hasPractice = daySessions.length > 0

            return (
              <div key={d} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''}`}>
                <span className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{d}</span>

                {hasPractice && (
                  <button
                    className={styles.practiceTag}
                    onClick={() => { playPop(); nav('/analysis') }}
                  >
                    Practice
                    {daySessions.length > 1 && (
                      <span className={styles.practiceCount}>×{daySessions.length}</span>
                    )}
                  </button>
                )}

                {/* Show best score for the day if available */}
                {hasPractice && (() => {
                  const best = daySessions.reduce((b, s) =>
                    s.score != null && (b == null || s.score > b) ? s.score : b, null)
                  return best != null ? (
                    <span className={styles.dayScore}>{best}</span>
                  ) : null
                })()}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Recent sessions list ── */}
      {sessions.length > 0 && (
        <div className={styles.recentSection}>
          <h3 className={styles.recentTitle}>Recent sessions</h3>
          <div className={styles.recentList}>
            {sessions.slice(0, 5).map((s, i) => {
              const d = new Date(s.created_at || '')
              const dateLabel = isNaN(d) ? '' : d.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })
              return (
                <div key={s.id ?? i} className={styles.recentRow}
                  onClick={() => { playPop(); nav('/analysis') }}>
                  <span className={styles.recentDate}>{dateLabel}</span>
                  <span className={styles.recentPiece}>
                    {s.piece_title || 'Untitled'}
                    {s.piece_composer ? ` · ${s.piece_composer}` : ''}
                  </span>
                  {s.score != null && (
                    <span className={styles.recentScore}
                      style={{ color: s.score >= 88 ? 'var(--mint)' : s.score >= 74 ? 'var(--accent)' : 'var(--coral)' }}>
                      {s.score}
                    </span>
                  )}
                  <span className={styles.recentChevron}>›</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
