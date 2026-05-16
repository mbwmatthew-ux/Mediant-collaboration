import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as Vex from 'vexflow'
import { supabase } from '../lib/supabase'
import styles from './Page.module.css'

// ── Hardcoded fallback (shown when no takeId in URL) ──────────────────────

const MOCK_FLAGS = {
  timing: {
    tag: 'Measure 16 · Timing',
    title: 'Left hand enters early',
    body: 'The left hand arrives just ahead of the beat here. Slow this entrance down and count aloud before bringing it back up to tempo. Try isolating the left hand through measures 14–17 until the arrival feels natural and unhurried.',
  },
  dynamics: {
    tag: 'Measure 28 · Dynamics',
    title: 'Phrase settles too early',
    body: 'The dynamic line softens before the phrase actually ends. Keep the line moving through the final note — the resolution should arrive at the cadence, not before it. Think of this as a long exhale, not a quick release.',
  },
  voicing: {
    tag: 'Measure 33 · Voicing',
    title: 'Inner voices too prominent',
    body: 'The middle voices are slightly louder than the melody, which blurs the harmonic texture. Bring the top line forward and let the inner voices recede — try exaggerated melody weight until the balance becomes instinctive.',
  },
}

const MOCK_CHIPS = [
  { flag: 'timing',   label: 'm.16 · Timing' },
  { flag: 'dynamics', label: 'm.28 · Dynamics' },
  { flag: 'voicing',  label: 'm.33 · Voicing' },
]

const MOCK_FLAG_MEASURES = new Map([[16, 'timing'], [28, 'dynamics'], [33, 'voicing']])

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

// ── Component ─────────────────────────────────────────────────────────────

export default function Analysis() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const scoreEl = useRef(null)

  // take: undefined = loading, null = not found / no takeId, object = loaded
  const [take, setTake]           = useState(undefined)
  const [activeFlag, setActiveFlag] = useState(null)

  // Fetch take from DB if takeId present
  useEffect(() => {
    const takeId = searchParams.get('takeId')
    if (!takeId) { setTake(null); return }

    supabase
      .from('takes')
      .select('*')
      .eq('id', takeId)
      .single()
      .then(({ data, error }) => setTake(error || !data ? null : data))
  }, [])

  // Render VexFlow score once take status is determined
  useEffect(() => {
    if (take === undefined) return           // still fetching
    if (!scoreEl.current) return
    if (scoreEl.current.querySelector('svg')) return  // already rendered

    const flagMeasures = take?.flags?.length
      ? new Map(take.flags.map((f, i) => [f.measure, `flag_${i}`]))
      : MOCK_FLAG_MEASURES

    try {
      renderScore(scoreEl.current, setActiveFlag, flagMeasures)
    } catch (err) {
      console.error('VexFlow render error:', err)
    }
  }, [take])

  // Derive FLAGS map and chips from real take or hardcoded mock
  const flagsMap = take?.flags?.length
    ? Object.fromEntries(
        take.flags.map((f, i) => [
          `flag_${i}`,
          {
            tag:   `Measure ${f.measure} · ${capitalize(f.type)}`,
            title: f.title,
            body:  f.body,
          },
        ])
      )
    : MOCK_FLAGS

  const chips = take?.flags?.length
    ? take.flags.map((f, i) => ({ flag: `flag_${i}`, label: `m.${f.measure} · ${capitalize(f.type)}` }))
    : MOCK_CHIPS

  const pieceTitle    = take?.piece_title    ?? 'Clair de Lune'
  const pieceComposer = take?.piece_composer ?? 'Claude Debussy'
  const issueCount    = chips.length
  const score         = take?.score

  const info = activeFlag ? flagsMap[activeFlag] : null

  if (take === undefined) {
    return (
      <div className={styles.page}>
        <div className={styles.analyzeScreen}>
          <div className={styles.analyzeIcon}>♩</div>
          <p className={styles.analyzeSub}>Loading your analysis…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Score Review</p>
          <h1 className={styles.reviewTitle}>{pieceTitle}</h1>
          <p className={styles.sub}>
            {pieceComposer} · Solo Piano · {issueCount} issue{issueCount !== 1 ? 's' : ''} found
            {score != null && <> · <span style={{ color: scoreColor(score) }}>{score}/100</span></>}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn} onClick={() => nav('/record')}>Re-upload</button>
          <button className={styles.primaryBtn} onClick={() => nav('/follow')}>Follow Along ▶</button>
        </div>
      </div>

      <div className={styles.issueStrip}>
        <span className={styles.issueStripLabel}>Issues:</span>
        {chips.map(({ flag, label }) => (
          <button
            key={flag}
            className={`${styles.issueChip} ${activeFlag === flag ? styles.issueChipActive : ''}`}
            onClick={() => setActiveFlag(activeFlag === flag ? null : flag)}
          >
            {label}
          </button>
        ))}
        <span className={styles.issueStripHint}>Click a highlighted measure or issue to read feedback.</span>
      </div>

      <div className={styles.reviewBody}>
        <div className={styles.scoreArea}>
          <div ref={scoreEl} id="vf-score" />
        </div>

        <aside className={styles.feedbackSidebar}>
          {!info ? (
            <div className={styles.feedbackIdle}>
              <span className={styles.feedbackIdleIcon}>♩</span>
              <p>Click a highlighted measure in the score, or one of the issue chips above, to read coaching feedback.</p>
            </div>
          ) : (
            <div className={styles.feedbackDetail}>
              <p className={styles.detailTag}>{info.tag}</p>
              <h3 className={styles.detailTitle}>{info.title}</h3>
              <p className={styles.detailBody}>{info.body}</p>
              <button className={styles.loopBtn} onClick={() => nav('/follow')}>Loop this section</button>
              <button className={styles.dismissBtn} onClick={() => setActiveFlag(null)}>Dismiss</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function scoreColor(n) {
  if (n >= 88) return '#8fbe9f'
  if (n >= 74) return 'var(--gold)'
  return 'var(--coral)'
}

// ── VexFlow score renderer ────────────────────────────────────────────────

function renderScore(el, setActiveFlag, flagMeasures) {
  const { Renderer, Stave, StaveNote, Voice, Formatter } = Vex

  const W       = Math.max(el.clientWidth, 480)
  const ROW_H   = 120
  const H       = ROW_H * 4 + 48
  const MARGIN  = 22
  const INNER_W = W - MARGIN * 2
  const PER_ROW = 4
  const PREAMBLE = 108
  const BASE_W  = (INNER_W - PREAMBLE) / PER_ROW
  const FIRST_W = BASE_W + PREAMBLE

  const renderer = new Renderer(el, Renderer.Backends.SVG)
  renderer.resize(W, H)
  const ctx = renderer.getContext()

  const measureDefs = [
    { num: 12, notes: [['db/5'], ['f/5'],  ['ab/5']] },
    { num: 13, notes: [['bb/5'], ['ab/5'], ['gb/5']] },
    { num: 14, notes: [['f/5'],  ['eb/5'], ['db/5']] },
    { num: 15, notes: [['c/5'],  ['bb/4'], ['ab/4']] },
    { num: 16, notes: [['ab/4'], ['gb/4'], ['f/4']]  },
    { num: 17, notes: [['eb/4'], ['f/4'],  ['gb/4']] },
    { num: 18, notes: [['ab/4'], ['bb/4'], ['c/5']]  },
    { num: 19, notes: [['db/5'], ['eb/5'], ['f/5']]  },
    { num: 28, notes: [['db/5'], ['c/5'],  ['bb/4']] },
    { num: 29, notes: [['ab/4'], ['gb/4'], ['f/4']]  },
    { num: 30, notes: [['eb/4'], ['f/4'],  ['gb/4']] },
    { num: 31, notes: [['ab/4'], ['bb/4'], ['c/5']]  },
    { num: 33, notes: [['db/5'], ['eb/5'], ['f/5']]  },
    { num: 34, notes: [['gb/5'], ['f/5'],  ['eb/5']] },
    { num: 35, notes: [['db/5'], ['c/5'],  ['bb/4']] },
    { num: 36, notes: [['ab/4', 'db/5', 'f/5']]     },
  ]

  const svg = el.querySelector('svg')

  measureDefs.forEach((m, i) => {
    const row      = Math.floor(i / PER_ROW)
    const col      = i % PER_ROW
    const isFirst  = col === 0
    const isVeryFirst = i === 0

    const x = MARGIN + (isFirst ? 0 : PREAMBLE + col * BASE_W)
    const y = 28 + row * ROW_H
    const w = isFirst ? FIRST_W : BASE_W

    const stave = new Stave(x, y, w)
    if (isFirst) {
      stave.addClef('treble').addKeySignature('Db')
      if (isVeryFirst) stave.addTimeSignature('3/4')
    }
    stave.setContext(ctx).draw()

    if (svg) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(x + 4))
      label.setAttribute('y', String(y - 6))
      label.setAttribute('font-size', '10')
      label.setAttribute('font-family', 'Avenir Next, Inter, sans-serif')
      label.setAttribute('fill', '#879484')
      label.textContent = `m.${m.num}`
      svg.appendChild(label)
    }

    let voice
    if (m.notes.length === 1 && m.notes[0].length > 1) {
      const chord = new StaveNote({ clef: 'treble', keys: m.notes[0], duration: 'h.' })
      voice = new Voice({ num_beats: 3, beat_value: 4 })
      voice.setStrict(false)
      voice.addTickables([chord])
    } else {
      const staveNotes = m.notes.map(keys => new StaveNote({ clef: 'treble', keys, duration: 'q' }))
      voice = new Voice({ num_beats: 3, beat_value: 4 })
      voice.setStrict(false)
      voice.addTickables(staveNotes)
    }

    const noteWidth = (stave.getX() + stave.getWidth()) - stave.getNoteStartX() - 8
    new Formatter().joinVoices([voice]).format([voice], noteWidth)
    voice.draw(ctx, stave)

    // Highlight flagged measures
    const flagId = flagMeasures.get(m.num) ?? null
    if (flagId && svg) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(x + 1))
      rect.setAttribute('y', String(y - 10))
      rect.setAttribute('width', String(w - 2))
      rect.setAttribute('height', '88')
      rect.setAttribute('rx', '8')
      rect.setAttribute('fill', 'rgba(225, 134, 118, 0.09)')
      rect.setAttribute('stroke', 'rgba(225, 134, 118, 0.5)')
      rect.setAttribute('stroke-width', '1.5')
      rect.setAttribute('data-flag', flagId)
      rect.style.cursor = 'pointer'
      svg.appendChild(rect)
      rect.addEventListener('click', () => setActiveFlag(f => f === flagId ? null : flagId))
    }
  })
}
