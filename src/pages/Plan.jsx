import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTakes } from '../hooks/useTakes'
import styles from './Plan.module.css'
import { playPop, playTick } from '../utils/sounds'

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

const PRACTICE_TIPS = {
  intonation:   'Long-tone with tuner: sustain each note 8 beats, centering pitch against a drone.',
  timing:       'Isolate passage at 60% tempo. Subdivide internally before raising speed in 5 BPM steps.',
  rhythm:       'Clap the rhythm separately from pitch, counting aloud with a metronome.',
  dynamics:     'Practice extremes (pp then ff only). Use arm weight for forte — not finger force.',
  articulation: 'Exaggerate the style first, then find the correct midpoint. Record and compare.',
  technique:    'Slow hands-separately practice at 40% speed, attending to position and motion efficiency.',
  tone:         'Sustain a single pitch 8 beats per note, listening for evenness across the full duration.',
  phrasing:     'Sing the phrase aloud to feel its shape. Transfer that arc to your instrument.',
  expression:   'Identify the emotional peak. Practice leading deliberately to that moment.',
  posture:      'Mirror or video practice. Focus on releasing shoulder tension, neutral wrists.',
}

function estimateMinutes(type) {
  if (['intonation', 'phrasing', 'expression'].includes(type)) return 10
  if (['timing', 'rhythm', 'articulation'].includes(type)) return 15
  return 12
}

const STORAGE_KEY = 'practa_plan_state'

export default function Plan() {
  const nav = useNavigate()
  const takes = useTakes({ limit: 20 })
  const sessions = takes ?? []
  const lastTake = sessions[0] ?? null

  /* Build plan items from flags + warmup */
  const planItems = useMemo(() => {
    const items = []

    // Always include a warm-up
    items.push({
      id: 'warmup',
      title: 'Warm-up',
      description: 'Long tones or scales on open strings. Aim for a steady, ringing sound on each note.',
      minutes: 8,
      type: 'warmup',
    })

    if (lastTake?.flags?.length) {
      lastTake.flags.slice(0, 4).forEach((f, i) => {
        const type = (f.type ?? '').toLowerCase()
        items.push({
          id: `flag_${i}`,
          title: f.title || `${capitalize(f.type)} — m.${f.measure}`,
          description: PRACTICE_TIPS[type] ?? f.detail?.slice(0, 120) ?? 'Practice this passage slowly.',
          minutes: estimateMinutes(type),
          type,
          measure: f.measure,
        })
      })
    } else {
      // Generic items if no analysis yet
      items.push({
        id: 'scales',
        title: 'Scales review',
        description: 'Run through your primary scales at a comfortable tempo with a metronome.',
        minutes: 10,
        type: 'technique',
      })
      items.push({
        id: 'repertoire',
        title: 'Repertoire run-through',
        description: 'Play your current piece from start to finish. Note any trouble spots.',
        minutes: 20,
        type: 'repertoire',
      })
    }

    // Always end with cool-down if we have real items
    if (lastTake?.flags?.length) {
      items.push({
        id: 'cooldown',
        title: 'Cool-down: slow vibrato',
        description: 'Sustained notes with slow, wide vibrato. Focus on releasing any tension.',
        minutes: 5,
        type: 'cooldown',
      })
    }

    return items
  }, [lastTake])

  const totalMinutes = planItems.reduce((sum, i) => sum + i.minutes, 0)

  /* Persist completion state for today */
  const todayKey = new Date().toISOString().slice(0, 10)
  const [completed, setCompleted] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return stored.date === todayKey ? (stored.completed ?? {}) : {}
    } catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey, completed }))
  }, [completed, todayKey])

  function toggle(id) {
    playTick()
    setCompleted(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const doneCount = planItems.filter(i => completed[i.id]).length

  /* Context message */
  const contextMsg = useMemo(() => {
    if (!lastTake) return 'Upload your first recording to get a personalized practice plan.'
    const piece = lastTake.piece_title || 'your last piece'
    const score = lastTake.score
    const flagCount = lastTake.flags?.length ?? 0
    if (flagCount > 0) {
      const topType = lastTake.flags[0]?.type ?? 'technique'
      return `Your last session on "${piece}" scored ${score ?? '—'}/100. I've weighted today's plan toward the ${topType} flags I found. Work through each item in order — don't skip the warm-up!`
    }
    return `Your last session on "${piece}" scored ${score ?? '—'}/100 — great work! Today's plan keeps you sharp with focused practice.`
  }, [lastTake])

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>Today's plan</h1>
          <p className={styles.pageSubtitle}>
            {doneCount} of {planItems.length} complete · {totalMinutes} min total
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={() => { playPop(); nav('/record') }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New session
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill}
          style={{ width: planItems.length ? `${(doneCount / planItems.length) * 100}%` : '0%' }} />
      </div>

      {/* ── AI context banner ── */}
      <div className={styles.contextBanner}>
        <span className={styles.contextIcon}>
          <StarIcon />
        </span>
        <p className={styles.contextMsg}>
          <span className={styles.contextLabel}>GENERATED FROM YOUR LAST ANALYSIS </span>
          "{contextMsg}"
        </p>
      </div>

      {/* ── Plan items ── */}
      <div className={styles.planList}>
        {planItems.map((item, idx) => {
          const done = !!completed[item.id]
          return (
            <div key={item.id} className={`${styles.planItem} ${done ? styles.planItemDone : ''}`}>
              <button
                className={`${styles.checkBtn} ${done ? styles.checkBtnDone : ''}`}
                onClick={() => toggle(item.id)}
                aria-label={done ? 'Mark incomplete' : 'Mark complete'}
              >
                {done && <CheckIcon />}
              </button>
              <div className={styles.planItemContent}>
                <div className={styles.planItemHeader}>
                  <span className={styles.planItemNum}>{idx + 1}</span>
                  <span className={`${styles.planItemTitle} ${done ? styles.planItemTitleDone : ''}`}>
                    {item.title}
                  </span>
                  <span className={styles.planItemTime}>
                    <ClockIcon /> {item.minutes} min
                  </span>
                </div>
                <p className={styles.planItemDesc}>{item.description}</p>
                {item.measure && (
                  <span className={styles.planItemMeasure}>m. {item.measure}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Done state ── */}
      {doneCount === planItems.length && planItems.length > 0 && (
        <div className={styles.allDone}>
          <span className={styles.allDoneIcon}>✓</span>
          <p className={styles.allDoneText}>Practice complete! Great work today.</p>
          <button className={styles.recordBtn} onClick={() => { playPop(); nav('/record') }}>
            Record a take to track your progress
          </button>
        </div>
      )}

    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}>
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  )
}
function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}
