import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

/* ── Sheet music SVG ─────────────────────────────────────────── */
const INK = '#1e1008'
const S   = [30, 63, 96, 129, 162]

// Note pools per track — 4 different melodic shapes
const NOTE_TRACKS = [
  [[23,2],[31,4],[39,1],[47,5],[55,3],[63,6],[71,2],[79,4],[87,1],[95,5],[103,3],[111,6],[120,2],[129,4],[138,1]],
  [[23,5],[31,2],[39,6],[47,3],[55,5],[63,1],[71,4],[79,2],[87,6],[95,3],[103,5],[111,2],[120,4],[129,7],[138,3]],
  [[23,3],[31,6],[39,2],[47,5],[55,4],[63,7],[71,3],[79,5],[87,2],[95,6],[103,4],[111,2],[120,5],[129,3],[138,6]],
  [[23,6],[31,3],[39,7],[47,2],[55,5],[63,3],[71,6],[79,4],[87,2],[95,7],[103,3],[111,5],[120,2],[129,6],[138,4]],
]

// Stain configs: each sheet gets a different aged-paper look
const STAIN_CFGS = [
  // 0: heavy top-left + faint bottom-right
  [{cx:10,cy:8,rx:26,ry:15,fill:'#b8740a',op:0.38},{cx:136,cy:152,rx:28,ry:20,fill:'#c8a040',op:0.16},{cx:76,cy:204,rx:50,ry:10,fill:'#d8b850',op:0.13}],
  // 1: top-right corner
  [{cx:144,cy:9,rx:22,ry:14,fill:'#b06820',op:0.35},{cx:20,cy:170,rx:24,ry:16,fill:'#c8a040',op:0.18},{cx:60,cy:80,rx:16,ry:12,fill:'#d0b048',op:0.12}],
  // 2: bottom-left heavy
  [{cx:8,cy:200,rx:30,ry:18,fill:'#b8740a',op:0.38},{cx:130,cy:30,rx:18,ry:12,fill:'#c8a040',op:0.16},{cx:90,cy:110,rx:20,ry:14,fill:'#d8b850',op:0.10}],
  // 3: scattered age spots
  [{cx:28,cy:45,rx:14,ry:9,fill:'#b06820',op:0.28},{cx:115,cy:105,rx:18,ry:12,fill:'#c8a040',op:0.22},{cx:55,cy:180,rx:22,ry:12,fill:'#b8740a',op:0.2},{cx:138,cy:22,rx:12,ry:7,fill:'#a06010',op:0.24}],
  // 4: left-edge water damage
  [{cx:5,cy:55,rx:18,ry:40,fill:'#b8740a',op:0.28},{cx:8,cy:155,rx:14,ry:30,fill:'#c09030',op:0.22},{cx:140,cy:100,rx:10,ry:8,fill:'#d0b048',op:0.12}],
  // 5: faint, mostly clean
  [{cx:8,cy:7,rx:14,ry:8,fill:'#b8740a',op:0.22},{cx:144,cy:205,rx:16,ry:9,fill:'#b06820',op:0.18}],
  // 6: right-edge + top smudge
  [{cx:148,cy:65,rx:16,ry:35,fill:'#a06010',op:0.26},{cx:148,cy:160,rx:14,ry:28,fill:'#c09030',op:0.2},{cx:20,cy:8,rx:18,ry:10,fill:'#b8740a',op:0.28}],
]

const BEAMS = [
  [0,23,47],[0,71,95],[0,120,138],
  [1,23,47],[1,71,95],[1,120,138],
  [2,23,47],[2,71,95],[2,120,138],
  [3,23,47],[3,71,95],[3,120,138],
  [4,23,47],[4,71,95],[4,120,129],
]

const FINGERS = [
  [0,26,2],[0,47,4],[0,63,1],[0,87,3],[0,111,1],[0,129,2],
  [1,26,1],[1,47,3],[1,71,4],[1,95,2],[1,120,1],[1,138,3],
  [2,26,2],[2,55,1],[2,79,4],[2,103,2],[2,129,3],
  [3,26,3],[3,55,1],[3,79,2],[3,103,4],[3,129,1],
  [4,26,2],[4,55,3],[4,79,1],[4,103,4],
]

const DYNAMICS   = ['ff','p','f','ff','p']
const ANNOT_LEFT = ['ad lib.','a tempo','cresc.','poco rit.','dolciss.']
const ANNOT_RIGHT= ['rit.','subito','espressivo','mf','rall.']

function SheetMusicPage({ seed = 0, showTitle = false }) {
  const stains = STAIN_CFGS[seed % STAIN_CFGS.length]

  // Each staff uses a different note track, shifted by seed
  const notes = S.flatMap((_, si) => {
    const track = NOTE_TRACKS[(si + seed) % NOTE_TRACKS.length]
    return track.map(([x, p]) => [si, x, Math.min(8, Math.max(0, p + ((seed * 3 + si) % 3) - 1))])
  })

  const annots = seed % 2 === 0 ? ANNOT_LEFT : ANNOT_RIGHT

  return (
    <svg viewBox="0 0 152 210" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="152" height="210" fill="#f7e8be"/>

      {/* Varied staining */}
      {stains.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={b.fill} opacity={b.op}/>
      ))}

      {/* Title — only on 2 sheets */}
      {showTitle ? (
        <>
          <text x="76" y="11"   textAnchor="middle" fontFamily="Georgia,serif" fontSize="7"   fontWeight="bold" letterSpacing="2.5" fill={INK}>CONCERTO</text>
          <text x="76" y="18.5" textAnchor="middle" fontFamily="Georgia,serif" fontSize="4.8" fill={INK}>CELLO  ·  I. PRELUDE</text>
          <text x="76" y="25"   textAnchor="middle" fontFamily="Georgia,serif" fontSize="3.8" fontStyle="italic" fill={INK} opacity="0.6">EDOUARD LALO</text>
          <text x="8"  y="27.5"                     fontFamily="Georgia,serif" fontSize="3.5" fill={INK} opacity="0.7">Lento ♩=56</text>
        </>
      ) : (
        /* Non-title sheets: just a measure number or tempo hint */
        <text x="8" y="28" fontFamily="Georgia,serif" fontSize="3.5" fill={INK} opacity="0.55">
          {['Allegro','Lento','Andante','Vivace','Moderato','Adagio','Presto'][seed % 7]}
        </text>
      )}

      {/* Staff lines */}
      {S.map((sy, si) =>
        [0,5,10,15,20].map(dy => (
          <line key={`sl${si}${dy}`} x1="6" y1={sy+dy} x2="146" y2={sy+dy} stroke={INK} strokeWidth="0.6" opacity="0.8"/>
        ))
      )}

      {/* Opening double bar */}
      {S.map((sy, si) => (
        <g key={`ob${si}`}>
          <line x1="6"   y1={sy} x2="6"   y2={sy+20} stroke={INK} strokeWidth="0.5" opacity="0.7"/>
          <line x1="8.5" y1={sy} x2="8.5" y2={sy+20} stroke={INK} strokeWidth="1.8" opacity="0.7"/>
        </g>
      ))}

      {/* Bar lines */}
      {S.map((sy, si) =>
        [50, 93, 128].map(bx => (
          <line key={`bar${si}${bx}`} x1={bx} y1={sy} x2={bx} y2={sy+20} stroke={INK} strokeWidth="0.55" opacity="0.65"/>
        ))
      )}

      {/* Time signature — varies per seed */}
      {S.map((sy, si) => {
        const [top, bot] = [['3','4'],['4','4'],['6','8'],['2','4'],['12','8']][(si + seed) % 5]
        return (
          <g key={`ts${si}`}>
            <text x="13" y={sy+11} fontFamily="Georgia,serif" fontSize="8" fontWeight="bold" fill={INK} opacity="0.82">{top}</text>
            <text x="13" y={sy+20} fontFamily="Georgia,serif" fontSize="8" fontWeight="bold" fill={INK} opacity="0.82">{bot}</text>
          </g>
        )
      })}

      {/* Note heads + stems */}
      {notes.map(([si, x, p], i) => {
        const cy = S[si] + 20 - p * 2.5
        const up = p < 4
        const sx = x + (up ? 2.2 : -2.2)
        return (
          <g key={`n${i}`}>
            <ellipse cx={x} cy={cy} rx="2.3" ry="2.1" fill={INK} opacity="0.88"/>
            <line x1={sx} y1={cy} x2={sx} y2={up ? cy-11 : cy+11} stroke={INK} strokeWidth="0.7" opacity="0.88"/>
          </g>
        )
      })}

      {/* Beams */}
      {BEAMS.map(([si, x1, x2], i) => {
        const grp  = notes.filter(([s,x]) => s===si && x>=x1 && x<=x2)
        const avgP = grp.length ? grp.reduce((a,[,,p])=>a+p, 0)/grp.length : 4
        const up   = avgP < 4
        const by   = S[si] + 20 - avgP*2.5 + (up ? -11 : 11)
        return (
          <rect key={`bm${i}`}
            x={x1+(up?2.2:-2.2)} y={by-(up?1.5:0)}
            width={x2-x1} height="1.5" fill={INK} opacity="0.82"/>
        )
      })}

      {/* Slurs */}
      {S.map((sy, si) => (
        <path key={`slur${si}`}
          d={`M ${si%2===0?39:37},${sy+6} Q 76,${sy+(si%2===0?1:2)} ${si%2===0?113:111},${sy+6}`}
          stroke={INK} strokeWidth="0.65" fill="none" opacity="0.55"/>
      ))}

      {/* Fingering */}
      {FINGERS.map(([si,x,f], i) => (
        <text key={`fi${i}`} x={x} y={S[si]-2} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize="3.8" fill={INK} opacity="0.72">{f}</text>
      ))}

      {/* Dynamics */}
      {DYNAMICS.map((d, si) => (
        <text key={`dyn${si}`} x="8" y={S[si]-2}
          fontFamily="Georgia,serif" fontSize="4.5" fontStyle="italic" fill={INK} opacity="0.65">{d}</text>
      ))}

      {/* Pencil annotations */}
      {S.map((sy, si) => (
        <text key={`ann${si}`} x={si%2===0?38:82} y={si<4?sy+28:sy-4}
          fontFamily="Arial,sans-serif" fontSize="3.6" fill="#6a5030" opacity="0.5">
          {annots[si % annots.length]}
        </text>
      ))}
    </svg>
  )
}

/* ── Intro sheet music fan ────────────────────────────────────── */
const INTRO_SHEETS = [
  { angle: -75, rx: '4px 11px 9px 5px' },
  { angle: -50, rx: '6px  8px 11px 4px' },
  { angle: -25, rx: '3px 10px  7px 8px' },
  { angle:   0, rx: '7px  9px  6px 10px' },
  { angle:  25, rx: '4px 12px  8px 5px' },
  { angle:  50, rx: '8px  7px 10px 4px' },
  { angle:  75, rx: '5px  9px  5px 11px' },
]

const DECOR_SHEETS = [
  { seed: 0,  top: '94vh',  left: '-5%',  right: 'auto', angle: -15, rx: '4px 11px 9px 5px',  i: 0 },
  { seed: 8,  top: '128vh', left: 'auto', right: '-4%',  angle:  22, rx: '6px 8px 11px 4px',  i: 1 },
  { seed: 3,  top: '178vh', left: '-3%',  right: 'auto', angle: -20, rx: '3px 10px 7px 8px',  i: 2 },
  { seed: 11, top: '215vh', left: 'auto', right: '-2%',  angle:  16, rx: '7px 9px 6px 10px',  i: 3 },
  { seed: 5,  top: '280vh', left: '1%',   right: 'auto', angle: -10, rx: '4px 12px 8px 5px',  i: 4 },
  { seed: 2,  top: '340vh', left: 'auto', right: '-3%',  angle:  26, rx: '8px 7px 10px 4px',  i: 5 },
  { seed: 9,  top: '410vh', left: '-2%',  right: 'auto', angle: -18, rx: '5px 9px 5px 11px',  i: 6 },
]

function MusicIntro() {
  const [state, setState] = useState('initial')

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setState('fanned')))
    const t1 = setTimeout(() => setState('gliding'), 2300)
    const t2 = setTimeout(() => setState('settled'), 4500)
    return () => { cancelAnimationFrame(id); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  function cls(side) {
    return [
      styles.introSheet,
      side === 'right' && styles.introSheetR,
      state === 'fanned'  && styles.introFanning,
      state === 'fanned'  && styles.introSheetFanned,
      state === 'gliding' && styles.introGliding,
      state === 'gliding' && styles.introSheetGlide,
    ].filter(Boolean).join(' ')
  }

  if (state === 'settled') {
    return (
      <div className={styles.introDecor} aria-hidden="true">
        {DECOR_SHEETS.map((d) => (
          <div
            key={d.seed}
            className={styles.decorSheet}
            style={{
              top: d.top,
              left: d.left,
              right: d.right,
              '--angle': `${d.angle}deg`,
              '--i': d.i,
              borderRadius: d.rx,
            }}
          >
            <SheetMusicPage seed={d.seed} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.introOverlay} aria-hidden="true">
      <div className={styles.introAnchorL}>
        {INTRO_SHEETS.map((s, i) => (
          <div key={i} className={cls('left')}
            style={{ '--angle': `${s.angle}deg`, '--i': i, borderRadius: s.rx }}>
            <SheetMusicPage seed={i} showTitle={i === 3} />
          </div>
        ))}
      </div>
      <div className={styles.introAnchorR}>
        {INTRO_SHEETS.map((s, i) => (
          <div key={i} className={cls('right')}
            style={{ '--angle': `${s.angle}deg`, '--i': i, borderRadius: s.rx }}>
            <SheetMusicPage seed={i + 7} showTitle={i === 1} />
          </div>
        ))}
      </div>
    </div>
  )
}

const ANALYSIS_TEXT =
  "The triplet figures in mm. 12–15 are rushing by about 18ms ahead of the pulse — a common response to the harmonic tension building here, but it softens the improvisatory character Chopin intended. Try isolating mm. 13–14 at 76bpm: anchor on the left hand's bass octaves and let the right hand breathe over them rather than leading. Your voicing in the opening phrase is outstanding — carry that patience into this passage and the crescendo at m. 16 will land with real weight."

const ROTATING_LINES = [
  { we: 'elevate', you: 'create',  color: '#7a5230' },
  { we: 'listen',  you: 'perform', color: '#c4824a' },
  { we: 'analyze', you: 'refine',  color: '#b8922a' },
  { we: 'map',     you: 'improve', color: '#8b6f3a' },
  { we: 'guide',   you: 'grow',    color: '#d4a644' },
]

const FEATURES = [
  {
    icon: ScoreIcon,
    num: '01',
    title: 'Score-aware analysis',
    body: 'Every flag is tied to a specific measure and beat — not a vague average. Mediant reads the sheet music, not just the audio.',
  },
  {
    icon: CoachIcon,
    num: '02',
    title: 'Coaching, not just corrections',
    body: 'Every note you play has context — the phrase it belongs to, the style it\'s drawn from, the habit behind it. Mediant addresses all three.',
  },
  {
    icon: ProgressIcon,
    num: '03',
    title: 'Session history',
    body: 'Track exactly which passages improved across every take. See where your practice is paying off.',
  },
]

const STEPS = [
  { num: '01', title: 'Upload your recording', body: 'Drop in a video or audio file from your practice session.' },
  { num: '02', title: 'Maps it to the score',  body: 'Mediant aligns every note to your sheet music, measure by measure.' },
  { num: '03', title: 'Get targeted feedback', body: 'Click any flagged measure for specific, actionable feedback.' },
]

const STATS = [
  { value: 40,  suffix: '+', label: 'Instruments supported' },
  { value: 6,   suffix:  '', label: 'Types of feedback' },
  { value: 100, suffix: '%', label: 'Your recordings stay private' },
]


/* ── IntersectionObserver hook ── */
function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ── Typing caret animation (loops: type → highlight → clear → repeat) ── */
function DocTyping({ text, active, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]         = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => {
    if (!active) { setPhase('idle'); setDisplayed(''); return }
    const id = setTimeout(() => setPhase('typing'), delay)
    return () => clearTimeout(id)
  }, [active, delay])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (phase === 'idle') return

    if (phase === 'typing') {
      if (displayed.length < text.length) {
        timerRef.current = setTimeout(
          () => setDisplayed(text.slice(0, displayed.length + 1)),
          95 + Math.random() * 75,
        )
      } else {
        // Done typing — pause then enter highlight phase
        timerRef.current = setTimeout(() => setPhase('selected'), 700)
      }
    } else if (phase === 'selected') {
      // Hold highlight, then clear and loop
      timerRef.current = setTimeout(() => {
        setDisplayed('')
        setPhase('pausing')
      }, 900)
    } else if (phase === 'pausing') {
      timerRef.current = setTimeout(() => setPhase('typing'), 500)
    }

    return () => clearTimeout(timerRef.current)
  }, [phase, displayed, text])

  return (
    <div className={styles.docTypingCard}>
      <p className={styles.docText}>
        <span className={phase === 'selected' ? styles.docSelected : undefined}>
          {displayed}
        </span>
        {phase === 'typing' && (
          <span className={styles.docCaret}>
            <span className={styles.docCaretLabel}>Mediant</span>
          </span>
        )}
      </p>
    </div>
  )
}

/* ── Logo mark ── */
function AnimatedLogo({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: '#1a0f05',
      WebkitMask: `url('/logo-mark.png') center/contain no-repeat`,
      WebkitMaskMode: 'luminance',
      mask: `url('/logo-mark.png') center/contain no-repeat`,
      maskMode: 'luminance',
    }} />
  )
}

function Wordmark({ className }) {
  return <span className={`${styles.wordmark} ${className || ''}`}>Mediant</span>
}

/* ── Per-character fade word ── */
function AnimatedWord({ word, color, visible }) {
  return (
    <span className={styles.heroWordFrame}>
      {word.split('').map((ch, i) => (
        <span
          key={ch + i}
          className={visible ? styles.heroCharVisible : styles.heroCharHidden}
          style={{ '--wi': i, '--w-color': color }}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

/* ── Stacked shuffle cards ── */
const SHUFFLE_ITEMS = [
  { color: '#7a5230', text: 'Aligning your recording to the score...' },
  { color: '#c4824a', text: 'Detecting timing drift in measures 12–15...' },
  { color: '#b8922a', text: 'Mapping pitch accuracy across 47 notes...' },
  { color: '#8b6f3a', text: 'Comparing this take to your last session...' },
  { color: '#d4a644', text: 'Generating targeted practice feedback...' },
]

function ShuffleCards({ idx }) {
  const [hist, setHist] = useState(() => [
    idx,
    (idx + SHUFFLE_ITEMS.length - 1) % SHUFFLE_ITEMS.length,
    (idx + SHUFFLE_ITEMS.length - 2) % SHUFFLE_ITEMS.length,
  ])
  useEffect(() => {
    setHist(prev => [idx, prev[0], prev[1]])
  }, [idx])

  const cur = SHUFFLE_ITEMS[hist[0]]
  const gh1 = SHUFFLE_ITEMS[hist[1]]
  const gh2 = SHUFFLE_ITEMS[hist[2]]

  return (
    <div className={styles.shuffleWrap}>
      <div className={`${styles.shuffleGhostCard} ${styles.shuffleGhostFar}`} style={{ borderColor: gh2.color, background: `${gh2.color}10` }}>
        <span className={styles.shuffleText}>{gh2.text}</span>
      </div>
      <div className={`${styles.shuffleGhostCard} ${styles.shuffleGhostNear}`} style={{ borderColor: gh1.color, background: `${gh1.color}1e` }}>
        <span className={styles.shuffleText}>{gh1.text}</span>
      </div>
      <div key={hist[0]} className={styles.shuffleCard} style={{ borderColor: cur.color, boxShadow: `0 0 14px 2px ${cur.color}33` }}>
        <span className={styles.shuffleText}>{cur.text}</span>
      </div>
    </div>
  )
}

/* ── Animated stat counter ── */
function StatCard({ value, suffix, label, delay }) {
  const [active, setActive] = useState(false)
  const [count, setCount]   = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setActive(true); obs.disconnect() }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const dur   = 2200
    function frame(now) {
      const p    = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setCount(Math.round(ease * value))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [active, value])

  function onMove(e) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
    el.style.transition = 'transform 0.08s ease, background 300ms ease'
    el.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) scale(1.03)`
  }
  function onLeave() {
    const el = ref.current; if (!el) return
    el.style.transition = 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), background 300ms ease'
    el.style.transform = ''
  }

  return (
    <div ref={ref} className={`${styles.statCard} ${styles.revealScale}`} style={{ '--d': delay }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      <span className={styles.statValue}>{count.toLocaleString()}{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

/* ── 3D tilt wrapper ── */
function TiltBox({ className, style, children }) {
  const ref = useRef(null)
  function onMove(e) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width  - 0.5
    const y = (e.clientY - r.top)  / r.height - 0.5
    el.style.transition = 'transform 0.08s ease'
    el.style.transform = `perspective(500px) rotateY(${x * 22}deg) rotateX(${-y * 16}deg) scale(1.06)`
  }
  function onLeave() {
    const el = ref.current; if (!el) return
    el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.transform = ''
  }
  return (
    <div ref={ref} className={className} style={style} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  )
}

export default function Landing() {
  const [wordIdx, setWordIdx]     = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const canvasRef = useRef(null)
  const [analysisRef, analysisInView] = useInView(0.15)
  const heroRef        = useRef(null)
  const parallaxLogoRef  = useRef(null)
  const parallaxMeshRef  = useRef(null)
  const parallaxHeadRef  = useRef(null)
  const parallaxCardsRef = useRef(null)

  /* ── Waveform canvas (breathing, not scrolling) ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const WAVES = [
      { freq: 0.010, baseAmp: 36, breatheFreq: 0.40, breathePhase: 0.0, alpha: 0.07, yRatio: 0.35 },
      { freq: 0.016, baseAmp: 22, breatheFreq: 0.60, breathePhase: 1.5, alpha: 0.09, yRatio: 0.50 },
      { freq: 0.007, baseAmp: 50, breatheFreq: 0.28, breathePhase: 0.8, alpha: 0.04, yRatio: 0.65 },
      { freq: 0.022, baseAmp: 16, breatheFreq: 0.72, breathePhase: 2.2, alpha: 0.07, yRatio: 0.43 },
      { freq: 0.013, baseAmp: 30, breatheFreq: 0.50, breathePhase: 3.8, alpha: 0.05, yRatio: 0.72 },
    ]

    const dpr = window.devicePixelRatio || 1

    function resize() {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    window.addEventListener('resize', resize)
    resize()

    function tick(now) {
      const t = now * 0.001
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (!w || !h) { raf = requestAnimationFrame(tick); return }
      ctx.clearRect(0, 0, w, h)

      for (const wave of WAVES) {
        const amp = wave.baseAmp * (0.3 + 0.7 * Math.sin(t * wave.breatheFreq + wave.breathePhase))
        ctx.beginPath()
        ctx.strokeStyle = `rgba(184,146,42,${wave.alpha})`
        ctx.lineWidth = 1.5
        for (let x = 0; x <= w; x += 3) {
          const y = h * wave.yRatio + Math.sin(x * wave.freq) * amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  /* ── Mouse parallax ── */
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    let tx = 0, ty = 0, cx = 0, cy = 0, raf
    const lerp = (a, b, t) => a + (b - a) * t

    function tick() {
      cx = lerp(cx, tx, 0.055)
      cy = lerp(cy, ty, 0.055)
      const mesh  = parallaxMeshRef.current
      const head  = parallaxHeadRef.current
      const cards = parallaxCardsRef.current
      if (mesh)  mesh.style.transform  = `translate(${(cx * 32).toFixed(2)}px, ${(cy * 20).toFixed(2)}px)`
      if (head)  head.style.transform  = `translate(${(cx * 8).toFixed(2)}px, ${(cy * 5).toFixed(2)}px)`
      if (cards) cards.style.transform = `translate(${(cx * -12).toFixed(2)}px, ${(cy * -8).toFixed(2)}px)`
      raf = requestAnimationFrame(tick)
    }

    function onMove(e) {
      const r = hero.getBoundingClientRect()
      tx = (e.clientX - r.left) / r.width  - 0.5
      ty = (e.clientY - r.top)  / r.height - 0.5
    }
    function onLeave() { tx = 0; ty = 0 }

    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(tick)
    return () => {
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  /* ── Word cycling with fade out / in ── */
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => setWordIdx(i => (i + 1) % ROTATING_LINES.length), 320)
      setTimeout(() => setWordVisible(true), 360)
    }, 3400)
    return () => clearInterval(id)
  }, [])

  /* ── Scroll reveals (bidirectional) ── */
  useEffect(() => {
    const classes = [styles.reveal, styles.revealL, styles.revealR, styles.revealScale]
    const query = classes.map(c => `.${c}`).join(', ')
    const els = document.querySelectorAll(query)
    if (!els.length) return

    // threshold:0 fires only when element fully leaves — user never sees the reset
    // rootMargin shrinks trigger zone slightly so enter animation happens just after element edge crosses
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealVisible)
        } else {
          // Fully offscreen — reset regardless of direction so it re-animates on re-entry
          e.target.classList.remove(styles.revealVisible)
        }
      }),
      { threshold: 0, rootMargin: '-8px 0px -8px 0px' },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const current = ROTATING_LINES[wordIdx]

  return (
    <div className={styles.page}>

      <MusicIntro />

      {/* ── Bottom watercolor glow (color-synced with hero) ── */}
      <div
        className={styles.bottomGlow}
        style={{ '--glow-color': current.color }}
        aria-hidden="true"
      />

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.navBrand}>
          <AnimatedLogo size={34} />
          <Wordmark />
        </Link>
        <div className={styles.navRight}>
          <Link to="/login"  className={styles.navLogin}>Log in</Link>
          <Link to="/signup" className={styles.navCta}>Get started free →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero} ref={heroRef}>
        <div ref={parallaxMeshRef} className={styles.meshBg} aria-hidden="true">
          <div className={`${styles.meshBlob} ${styles.meshBlob1}`} />
          <div className={`${styles.meshBlob} ${styles.meshBlob2}`} />
          <div className={`${styles.meshBlob} ${styles.meshBlob3}`} />
          <div className={`${styles.meshBlob} ${styles.meshBlob4}`} />
        </div>
        <canvas ref={canvasRef} className={styles.waveCanvas} aria-hidden="true" />

        <div className={styles.heroLogoLarge} ref={parallaxLogoRef}>
          <AnimatedLogo size={140} />
        </div>

        <div ref={parallaxHeadRef} className={styles.parallaxNode}>
          <h1 className={styles.heroHeading}>
            <span className={styles.heroLine}>
              <span className={styles.heroStatic}>We</span>
              <AnimatedWord word={current.we}  color={current.color} visible={wordVisible} />
              <span className={styles.heroComma}>,&nbsp;you</span>
              <AnimatedWord word={current.you} color={current.color} visible={wordVisible} />
            </span>
          </h1>
        </div>

        <div ref={parallaxCardsRef} className={styles.parallaxNode}>
          <ShuffleCards idx={wordIdx} />
        </div>

        <p className={styles.heroSub}>
          Upload a recording. Mediant maps it to your sheet music and delivers
          feedback that sounds like it came from a teacher — not an app.
        </p>

        <div className={styles.heroCtas}>
          <Link to="/signup" className={styles.ctaPrimary}>Start for free →</Link>
          <Link to="/login"  className={styles.ctaGhost}>Log in</Link>
        </div>

        <p className={styles.heroNote}>Free to start · No credit card · Any instrument</p>

        <Link to="/demo" className={styles.heroSeeExample}>
          See an example analysis ↗
        </Link>
      </section>

      {/* ── Analysis Demo ── */}
      <section className={styles.analysisSection}>
        <div className={`${styles.analysisHead} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>AI Analysis</p>
          <h2 className={styles.analysisTitle}>Your personal<br />practice analyst</h2>
          <p className={styles.analysisSub}>
            Mediant doesn't just flag wrong notes. It reads the phrase, the style,
            and the habit behind every mistake — then explains exactly what to fix and why.
          </p>
        </div>

        <div className={`${styles.analysisDemo} ${styles.reveal}`} ref={analysisRef} style={{ '--d': '120ms' }}>
          <div className={styles.analysisStatus}>
            <span className={styles.analysisPulse} />
            <span className={styles.analysisStatusText}>Mediant</span>
            <span className={styles.analysisDivider}>·</span>
            <span className={styles.analysisStatusMeta}>Chopin — Nocturne in E♭ major, Op. 9 No. 2</span>
          </div>

          <DocTyping text={ANALYSIS_TEXT} active={analysisInView} delay={400} />

          <div className={styles.analysisFooter}>
            <span>mm. 12–15</span>
            <span className={styles.analysisSep}>·</span>
            <span>Timing</span>
            <span className={styles.analysisSep}>·</span>
            <span>Phrasing</span>
            <span className={styles.analysisSep}>·</span>
            <span className={styles.analysisFooterGreen}>3 flags resolved</span>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {STATS.map((s, i) => (
            <StatCard
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              delay={`${i * 130}ms`}
            />
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className={`${styles.featuresHead} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>What you get</p>
          <h2 className={styles.featuresTitle}>Everything a serious<br />practice session needs</h2>
        </div>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`${styles.featureRow} ${i % 2 === 1 ? styles.featureRowFlip : ''} ${i % 2 === 0 ? styles.revealL : styles.revealR}`}
            style={{ '--d': `${i * 60}ms` }}
          >
            <div className={styles.featureText}>
              <span className={styles.featureNum}>{f.num}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </div>
            <TiltBox className={styles.featureVisual}>
              <f.icon />
            </TiltBox>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section className={styles.howItWorks}>
        <div className={`${styles.howHead} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2 className={styles.howTitle}>Three steps to<br />better practice</h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={`${styles.step} ${styles.reveal}`} style={{ '--d': `${i * 160}ms` }}>
              <span className={styles.stepNum}>{s.num}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
              {i < STEPS.length - 1 && <div className={styles.stepArrow}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className={`${styles.ctaSection} ${styles.reveal}`}>
        <h2 className={styles.ctaTitle}>Practice with intention,<br />not just repetition.</h2>
        <p className={styles.ctaSub}>Join musicians turning practice time into real, measurable progress.</p>
        <div className={styles.heroCtas}>
          <Link to="/signup" className={styles.ctaPrimary}>Create your free account</Link>
          <Link to="/login"  className={styles.ctaGhost}>Log in</Link>
        </div>
        <p className={styles.heroNote}>No credit card · Cancel anytime</p>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <Link to="/" className={styles.navBrand} style={{ opacity: 0.6 }}>
            <AnimatedLogo size={28} />
            <Wordmark />
          </Link>
          <p className={styles.footerTagline}>Intelligent music performance analysis.</p>
        </div>
        <div className={styles.footerLinks}>
          <Link to="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link to="/terms"   className={styles.footerLink}>Terms</Link>
          <Link to="/contact" className={styles.footerLink}>Contact</Link>
        </div>
        <p className={styles.footerCopy}>© 2026 Mediant</p>
      </footer>
    </div>
  )
}

/* ── Icons (large, artistic) ── */
function ScoreIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )
}
function CoachIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function ProgressIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
