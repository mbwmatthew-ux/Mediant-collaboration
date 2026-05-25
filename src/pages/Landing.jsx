import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const ROTATING_LINES = [
  { we: 'elevate', you: 'create',  color: '#a58fe8' },
  { we: 'listen',  you: 'perform', color: '#e18676' },
  { we: 'analyze', you: 'refine',  color: '#d6b168' },
  { we: 'map',     you: 'improve', color: '#5cb86b' },
  { we: 'guide',   you: 'grow',    color: '#5cb86b' },
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

/* ── Instrument helpers ── */
const NOTES = ['♩', '♪', '♫', '♬']

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

/* Notes that drift upward from the bell area */
function BellNotes({ count = 5, color = '#5cb86b', fromBottom = true }) {
  return (
    <div className={styles.bellNotes} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={styles.bellNote}
          style={{
            '--nd': `${i * 0.7}s`,
            '--nx': `${-16 + (i * 11) % 36}px`,
            '--ndur': `${2.4 + (i % 3) * 0.6}s`,
            color,
            fontSize: `${0.82 + (i % 3) * 0.28}rem`,
            bottom: fromBottom ? 0 : 'auto',
            top: fromBottom ? 'auto' : 0,
          }}
        >
          {NOTES[i % NOTES.length]}
        </span>
      ))}
    </div>
  )
}

/* Google-Docs-style collaborative cursor */
function DocTyping({ text, color, name = 'Mediant', active, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]         = useState('idle') // idle | forward | deleting | finishing | done
  const timerRef = useRef(null)

  // Type to ~65% → delete back ~15% → retype to end
  const pauseAt  = Math.floor(text.length * 0.65)
  const minLen   = Math.floor(text.length * 0.50)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => { setDisplayed(''); setPhase('forward') }, delay)
    return () => clearTimeout(t)
  }, [active, delay])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (phase === 'idle' || phase === 'done') return

    if (phase === 'forward') {
      if (displayed.length < pauseAt) {
        timerRef.current = setTimeout(
          () => setDisplayed(text.slice(0, displayed.length + 1)),
          95 + Math.random() * 55
        )
      } else {
        timerRef.current = setTimeout(() => setPhase('deleting'), 750)
      }
    } else if (phase === 'deleting') {
      if (displayed.length > minLen) {
        timerRef.current = setTimeout(
          () => setDisplayed(text.slice(0, displayed.length - 1)),
          60 + Math.random() * 32
        )
      } else {
        timerRef.current = setTimeout(() => setPhase('finishing'), 480)
      }
    } else if (phase === 'finishing') {
      if (displayed.length < text.length) {
        timerRef.current = setTimeout(
          () => setDisplayed(text.slice(0, displayed.length + 1)),
          82 + Math.random() * 48
        )
      } else {
        setPhase('done')
      }
    }

    return () => clearTimeout(timerRef.current)
  }, [phase, displayed, text, pauseAt, minLen])

  const isTyping = phase === 'forward' || phase === 'deleting' || phase === 'finishing'

  return (
    <div className={styles.docTyping}>
      <p className={styles.docText}>
        {displayed}
        {phase !== 'idle' && (
          <span className={styles.docCaret} style={{ '--cc': color }}>
            {isTyping && (
              <span className={styles.docCaretLabel} style={{ background: color }}>{name}</span>
            )}
          </span>
        )}
      </p>
    </div>
  )
}

/* ── Clarinet SVG ── */
function ClarinetSVG() {
  const s  = 'rgba(232,240,235,0.28)'   // main stroke
  const sf = 'rgba(232,240,235,0.05)'   // main fill
  const ks = 'rgba(232,240,235,0.38)'   // key stroke
  const kf = 'rgba(232,240,235,0.07)'   // key fill
  const gs = 'rgba(214,177,104,0.5)'    // gold (ligature) stroke
  const gf = 'rgba(214,177,104,0.15)'   // gold fill
  return (
    <svg viewBox="0 0 72 390" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ height: 340, width: 'auto', filter: 'drop-shadow(0 0 18px rgba(232,240,235,0.06))' }}>
      {/* Mouthpiece */}
      <path d="M27 2 L45 2 L47 10 L45 32 L27 32 L25 10 Z" fill={sf} stroke={s} strokeWidth="1.2" strokeLinejoin="round"/>
      {/* Reed */}
      <rect x="30" y="5" width="12" height="25" rx="1" fill="rgba(232,240,235,0.09)" stroke="rgba(232,240,235,0.18)" strokeWidth="0.7"/>
      {/* Ligature bands */}
      <rect x="25" y="13" width="22" height="3.5" rx="1.5" fill={gf} stroke={gs} strokeWidth="0.9"/>
      <rect x="25" y="20" width="22" height="3.5" rx="1.5" fill={gf} stroke={gs} strokeWidth="0.9"/>
      {/* Barrel */}
      <rect x="27" y="34" width="18" height="28" rx="2.5" fill={sf} stroke={s} strokeWidth="1.2"/>
      <line x1="27" y1="37" x2="45" y2="37" stroke="rgba(232,240,235,0.14)" strokeWidth="0.7"/>
      <line x1="27" y1="59" x2="45" y2="59" stroke="rgba(232,240,235,0.14)" strokeWidth="0.7"/>
      {/* Upper joint */}
      <rect x="27" y="64" width="18" height="128" rx="2" fill={sf} stroke={s} strokeWidth="1.2"/>
      {/* Register (octave) key — left side */}
      <path d="M27 82 L19 78 L16 82 L19 86 L27 86 Z" fill={kf} stroke={ks} strokeWidth="0.9"/>
      <circle cx="15" cy="82" r="4" fill={kf} stroke={ks} strokeWidth="0.9"/>
      {/* 3 left-hand tone holes */}
      {[98, 122, 146].map(y => (
        <circle key={y} cx="36" cy={y} r="5" fill="rgba(232,240,235,0.04)" stroke={s} strokeWidth="1.3"/>
      ))}
      {/* Left side keys (right of body) */}
      {[102, 116].map((y, i) => (
        <path key={i} d={`M45 ${y} L54 ${y-3} L55 ${y+3} L46 ${y+6} Z`} fill={kf} stroke={ks} strokeWidth="0.8"/>
      ))}
      {/* Left pinky keys */}
      <rect x="45" y="166" width="13" height="6" rx="2" fill={kf} stroke={ks} strokeWidth="0.9"/>
      <rect x="45" y="175" width="13" height="6" rx="2" fill={kf} stroke={ks} strokeWidth="0.9"/>
      {/* Joint ring */}
      <rect x="25" y="193" width="22" height="7" rx="1" fill="rgba(232,240,235,0.04)" stroke="rgba(232,240,235,0.2)" strokeWidth="1"/>
      {/* Lower joint */}
      <rect x="27" y="201" width="18" height="110" rx="2" fill={sf} stroke={s} strokeWidth="1.2"/>
      {/* 3 right-hand tone holes */}
      {[224, 248, 272].map(y => (
        <circle key={y} cx="36" cy={y} r="5" fill="rgba(232,240,235,0.04)" stroke={s} strokeWidth="1.3"/>
      ))}
      {/* Right side keys */}
      {[228, 244].map((y, i) => (
        <path key={i} d={`M45 ${y} L54 ${y-3} L55 ${y+3} L46 ${y+6} Z`} fill={kf} stroke={ks} strokeWidth="0.8"/>
      ))}
      {/* Right pinky cluster */}
      <rect x="45" y="283" width="13" height="6" rx="2" fill={kf} stroke={ks} strokeWidth="0.9"/>
      <rect x="45" y="292" width="11" height="6" rx="2" fill={kf} stroke={ks} strokeWidth="0.9"/>
      {/* Bell socket */}
      <rect x="25" y="312" width="22" height="7" rx="1" fill="rgba(232,240,235,0.05)" stroke="rgba(232,240,235,0.22)" strokeWidth="1.1"/>
      {/* Bell */}
      <path d="M27 321 Q23 348 12 372 Q10 377 10 380 L62 380 Q62 377 60 372 Q49 348 45 321 Z"
            fill={sf} stroke={s} strokeWidth="1.2"/>
      {/* Bell rim */}
      <ellipse cx="36" cy="380" rx="26" ry="7" fill="rgba(232,240,235,0.03)" stroke={s} strokeWidth="1"/>
      {/* Subtle inner bell shine */}
      <path d="M16 348 Q14 362 13 374" stroke="rgba(232,240,235,0.08)" strokeWidth="1" fill="none"/>
    </svg>
  )
}

/* ── Cello SVG ── */
function CelloSVG() {
  const s  = 'rgba(232,240,235,0.26)'
  const sf = 'rgba(232,240,235,0.04)'
  const gs = 'rgba(214,177,104,0.48)'
  return (
    <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ height: 340, width: 'auto', filter: 'drop-shadow(0 0 18px rgba(232,240,235,0.05))' }}>
      {/* Scroll */}
      <path d="M73 14 C73 8 78 4 83 6 C89 8 90 14 86 18 C82 22 76 20 76 15 C76 11 80 9 83 11"
            fill="none" stroke={s} strokeWidth="1.3"/>
      {/* Pegbox */}
      <rect x="72" y="18" width="16" height="28" rx="2" fill={sf} stroke={s} strokeWidth="1.2"/>
      {/* Pegs */}
      {[[68,24],[90,24],[68,36],[90,36]].map(([x,y],i) => (
        <line key={i} x1={x} y1={y} x2={x === 68 ? 82 : 78} y2={y} stroke={s} strokeWidth="1.5"/>
      ))}
      {/* Nut */}
      <rect x="71" y="46" width="18" height="4" rx="1" fill="rgba(232,240,235,0.1)" stroke={s} strokeWidth="0.9"/>
      {/* Neck */}
      <path d="M75 50 L85 50 L87 100 L73 100 Z" fill={sf} stroke={s} strokeWidth="1.2"/>
      {/* Body — full outline using smooth bezier curves */}
      {/* Right side */}
      <path
        d="M80 100
           C 112 100, 132 118, 132 148
           C 132 170, 118 182, 116 204
           C 114 220, 130 234, 136 262
           C 142 292, 138 340, 80 358"
        fill="none" stroke={s} strokeWidth="1.5"/>
      {/* Left side */}
      <path
        d="M80 100
           C 48 100, 28 118, 28 148
           C 28 170, 42 182, 44 204
           C 46 220, 30 234, 24 262
           C 18 292, 22 340, 80 358"
        fill="none" stroke={s} strokeWidth="1.5"/>
      {/* Body fill (two halves) */}
      <path
        d="M80 100 C112 100,132 118,132 148 C132 170,118 182,116 204 C114 220,130 234,136 262 C142 292,138 340,80 358 C22 340,18 292,24 262 C30 234,46 220,44 204 C42 182,28 170,28 148 C28 118,48 100,80 100 Z"
        fill={sf}/>
      {/* Top plate line (purfling hint) */}
      <path
        d="M80 106 C108 106,126 122,126 148 C126 168,114 180,112 202 C110 218,125 232,130 258"
        fill="none" stroke="rgba(232,240,235,0.06)" strokeWidth="0.8"/>
      <path
        d="M80 106 C52 106,34 122,34 148 C34 168,46 180,48 202 C50 218,35 232,30 258"
        fill="none" stroke="rgba(232,240,235,0.06)" strokeWidth="0.8"/>
      {/* F-holes */}
      <path d="M60 218 C55 228,54 238,60 246 C66 254,66 264,60 274" fill="none" stroke="rgba(232,240,235,0.35)" strokeWidth="1.3"/>
      <circle cx="60" cy="217" r="2.5" fill="rgba(232,240,235,0.18)"/>
      <circle cx="60" cy="275" r="2.5" fill="rgba(232,240,235,0.18)"/>
      <path d="M100 218 C105 228,106 238,100 246 C94 254,94 264,100 274" fill="none" stroke="rgba(232,240,235,0.35)" strokeWidth="1.3"/>
      <circle cx="100" cy="217" r="2.5" fill="rgba(232,240,235,0.18)"/>
      <circle cx="100" cy="275" r="2.5" fill="rgba(232,240,235,0.18)"/>
      {/* Bridge */}
      <path d="M64 302 L68 296 L80 294 L92 296 L96 302 L88 302 L86 308 L74 308 L72 302 Z"
            fill="rgba(232,240,235,0.06)" stroke={gs} strokeWidth="1"/>
      {/* Strings */}
      {[-4,-1.5,1.5,4].map((x,i) => (
        <line key={i} x1={80+x} y1={48} x2={80+x*0.6} y2={350} stroke="rgba(232,240,235,0.15)" strokeWidth="0.8"/>
      ))}
      {/* Tailpiece */}
      <path d="M68 350 L92 350 L94 360 L66 360 Z" fill="rgba(232,240,235,0.05)" stroke={s} strokeWidth="1"/>
      {/* Endpin */}
      <line x1="80" y1="360" x2="80" y2="420" stroke={s} strokeWidth="1.8"/>
      <circle cx="80" cy="422" r="3" fill="rgba(232,240,235,0.06)" stroke={s} strokeWidth="1"/>

      {/* ── Bow (crossing strings at playing position) ── */}
      {/* Horsehair ribbon — slightly concave toward strings */}
      <path d="M8 316 Q80 286 152 258" fill="none" stroke="rgba(232,240,235,0.24)" strokeWidth="3" strokeLinecap="round"/>
      {/* Stick — gently arched above the horsehair */}
      <path d="M6 308 Q80 274 154 248" fill="none" stroke={gs} strokeWidth="1.6" strokeLinecap="round"/>
      {/* Frog (handle block at lower-left) */}
      <rect x="0" y="300" width="16" height="12" rx="2.5" fill="rgba(214,177,104,0.15)" stroke={gs} strokeWidth="1.1"/>
      <rect x="3" y="303" width="9" height="5" rx="1" fill="rgba(9,17,12,0.3)" stroke="rgba(214,177,104,0.28)" strokeWidth="0.7"/>
      {/* Frog grip wrap lines */}
      {[0, 4, 8].map(dx => (
        <line key={dx} x1={4 + dx} y1="300" x2={4 + dx} y2="312" stroke="rgba(214,177,104,0.22)" strokeWidth="0.8"/>
      ))}
      {/* Tip (upper-right end of bow) */}
      <path d="M150 251 L156 247 L155 256 L149 259 Z" fill="rgba(214,177,104,0.1)" stroke={gs} strokeWidth="0.9"/>
    </svg>
  )
}

/* ── Piano SVG — grand piano, 3/4 perspective ── */
function PianoSVG() {
  const s  = 'rgba(232,240,235,0.22)'
  const sf = 'rgba(232,240,235,0.045)'
  const ks = 'rgba(232,240,235,0.12)'
  const gs = 'rgba(214,177,104,0.44)'
  const wkW = 21; const wkCount = 26

  return (
    <svg viewBox="0 0 660 330" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: 'auto', maxWidth: 700 }}>

      {/* === Rear case panel (top face visible from slightly above) === */}
      <path d="M24 56 L24 16 Q24 4 46 4 L614 4 Q636 4 636 16 L636 56 Z"
            fill="rgba(232,240,235,0.04)" stroke={s} strokeWidth="1.3"/>

      {/* === Open lid surface === */}
      {/* Primary lid panel — angled back-upward from the hinge */}
      <path d="M24 56 L24 16 Q24 4 46 4 L614 4 Q636 4 636 16 L636 56 L490 -28 Q380 -44 140 -20 Z"
            fill="rgba(232,240,235,0.038)" stroke={s} strokeWidth="1.1"/>
      {/* Lid underside edge (inner face slightly darker) */}
      <path d="M24 56 L140 -20 Q380 -44 490 -28 L636 56"
            fill="none" stroke="rgba(232,240,235,0.1)" strokeWidth="0.7"/>
      {/* Lid prop stick */}
      <line x1="390" y1="8" x2="372" y2="56" stroke="rgba(232,240,235,0.38)" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="372" cy="57" r="3" fill="rgba(232,240,235,0.06)" stroke={s} strokeWidth="1"/>

      {/* === Right side wall — gives 3D depth === */}
      <path d="M636 56 L636 244 L614 256 L614 56 Z"
            fill="rgba(232,240,235,0.03)" stroke={s} strokeWidth="0.9"/>

      {/* === Fallboard / nameboard === */}
      <path d="M24 56 L636 56 L614 70 L46 70 Z"
            fill="rgba(232,240,235,0.055)" stroke={s} strokeWidth="1.1"/>

      {/* Keybed back wall */}
      <rect x="24" y="70" width="590" height="18" rx="1.5"
            fill="rgba(232,240,235,0.07)" stroke={s} strokeWidth="1"/>

      {/* White keys */}
      {Array.from({ length: wkCount }).map((_, i) => (
        <rect key={i}
              x={27 + i * wkW} y="88" width={wkW - 1.5} height="118" rx="2"
              fill="rgba(232,240,235,0.11)" stroke={ks} strokeWidth="0.8"/>
      ))}

      {/* Black keys — 2+3 per octave, 3.5 octaves:
          positions: 1,2,4,5,6 | 8,9,11,12,13 | 15,16,18,19,20 | 22,23,25 */}
      {[1,2,4,5,6, 8,9,11,12,13, 15,16,18,19,20, 22,23,25].map((pos, i) => (
        <rect key={i}
              x={27 + pos * wkW + 13} y="88" width="13" height="76" rx="2"
              fill="rgba(9,17,12,0.92)" stroke="rgba(232,240,235,0.09)" strokeWidth="0.7"/>
      ))}

      {/* Key bottom edge (depth) */}
      <rect x="24" y="206" width="590" height="13"
            fill="rgba(232,240,235,0.04)" stroke="rgba(232,240,235,0.09)" strokeWidth="1"/>

      {/* Front rail */}
      <rect x="24" y="219" width="590" height="30" rx="4"
            fill="rgba(232,240,235,0.03)" stroke="rgba(232,240,235,0.1)" strokeWidth="1.2"/>

      {/* Right-side depth of front rail */}
      <path d="M614 219 L636 207 L636 244 L614 249 Z"
            fill="rgba(232,240,235,0.025)" stroke={s} strokeWidth="0.7"/>

      {/* === Pedal lyre === */}
      <path d="M226 249 Q224 264 234 276 L426 276 Q436 264 434 249 Z"
            fill={sf} stroke={s} strokeWidth="1"/>
      {[289, 330, 371].map((x, i) => (
        <ellipse key={i} cx={x} cy="278" rx="16" ry="8"
                 fill="rgba(214,177,104,0.12)" stroke={gs} strokeWidth="1"/>
      ))}

      {/* === Legs === */}
      <path d="M30 249 L30 295 Q30 303 24 303 L24 308 L46 308 L46 303 Q40 303 40 295 L40 249 Z"
            fill={sf} stroke={s} strokeWidth="1"/>
      <path d="M608 249 L608 295 Q608 303 602 303 L602 308 L624 308 L624 303 Q618 303 618 295 L618 249 Z"
            fill={sf} stroke={s} strokeWidth="1"/>
    </svg>
  )
}

const CLARINET_TEXT = "m.12 — entrance is 18ms early. Ease into the pickup note and let the phrase settle onto the downbeat."
const CELLO_TEXT    = "m.24 — bow pressure uneven on the sustained G. Keep arm weight consistent through the full stroke."
const PIANO_TEXT_1  = "m.8 — left hand too prominent. Pull the bass back to mp."
const PIANO_TEXT_2  = "m.16 — inner voices masking the soprano. Lift the top line."
const PIANO_TEXT_3  = "m.31 — rubato slightly rushed. Hold the phrase peak a beat longer."

/* ── Logo mark ── */
function AnimatedLogo({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: 'white',
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

/* ── Per-character word materialization ── */
function AnimatedWord({ word, visible, color }) {
  return (
    <>
      {word.split('').map((char, i) => (
        <span
          key={i}
          className={`${styles.heroChar} ${visible ? styles.heroCharIn : styles.heroCharOut}`}
          style={{ '--ci': i, '--ct': word.length, '--w-color': color }}
        >
          {char}
        </span>
      ))}
    </>
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

  return (
    <div ref={ref} className={`${styles.statCard} ${styles.revealScale}`} style={{ '--d': delay }}>
      <span className={styles.statValue}>{count.toLocaleString()}{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

export default function Landing() {
  const [wordIdx, setWordIdx]         = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const canvasRef = useRef(null)
  const [clarinetRef, clarinetInView] = useInView()
  const [celloRef,    celloInView]    = useInView()
  const [pianoRef,    pianoInView]    = useInView()

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
        ctx.strokeStyle = `rgba(92,184,107,${wave.alpha})`
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

  /* ── Word cycling ── */
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false)
      // Give the exit animation time to fully finish before swapping text
      setTimeout(() => setWordIdx(i => (i + 1) % ROTATING_LINES.length), 480)
      setTimeout(() => setWordVisible(true), 540)
    }, 3600)
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
      <section className={styles.hero}>
        <canvas ref={canvasRef} className={styles.waveCanvas} aria-hidden="true" />

        <div className={styles.heroLogoLarge}>
          <AnimatedLogo size={140} />
        </div>

        <h1 className={styles.heroHeading}>
          <span className={styles.heroLine}>
            <span className={styles.heroStatic}>We</span>
            <span className={styles.heroWordFrame} aria-live="polite" aria-atomic="true">
              <AnimatedWord word={current.we} visible={wordVisible} color={current.color} />
            </span>
            <span className={styles.heroComma}>,&nbsp;you</span>
            <span className={styles.heroWordFrame} aria-live="polite" aria-atomic="true">
              <AnimatedWord word={current.you} visible={wordVisible} color={current.color} />
            </span>
          </span>
        </h1>

        <p className={styles.heroSub}>
          Upload a recording. Mediant maps it to your sheet music and delivers
          feedback that sounds like it came from a teacher — not an app.
        </p>

        <div className={styles.heroCtas}>
          <Link to="/signup" className={styles.ctaPrimary}>Start for free →</Link>
          <Link to="/login"  className={styles.ctaGhost}>Log in</Link>
        </div>

        <p className={styles.heroNote}>Free to start · No credit card · Any instrument</p>
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

      {/* ── Instruments ── */}
      <section className={styles.instrumentsSection}>

        {/* Clarinet — text left, instrument+doc right */}
        <div className={`${styles.instrumentBand} ${styles.revealL}`} ref={clarinetRef}>
          <div className={styles.instrumentText}>
            <span className={styles.sectionLabel}>Woodwinds</span>
            <h2 className={styles.instrumentTitle}>Measure-by-measure<br />clarity for wind players</h2>
            <p className={styles.instrumentBody}>
              Mediant catches timing drift, intonation shifts, and tonal inconsistencies flagged to the exact measure — not a vague average.
            </p>
          </div>
          <div className={`${styles.instrumentVisual} ${styles.revealR}`} style={{ '--d': '80ms' }}>
            <div className={styles.instrumentGlow} style={{ '--glow-color': 'rgba(232,112,80,0.1)' }} />
            <div className={styles.instrumentTilt} style={{ '--tilt': '-16deg' }}>
              <ClarinetSVG />
              <BellNotes count={5} color="#e8706a" />
            </div>
            <DocTyping text={CLARINET_TEXT} color="#e8706a" active={clarinetInView} />
          </div>
        </div>

        {/* Cello — instrument+doc left, text right */}
        <div className={`${styles.instrumentBand} ${styles.instrumentBandFlip} ${styles.revealR}`} ref={celloRef}>
          <div className={styles.instrumentText}>
            <span className={styles.sectionLabel}>Strings</span>
            <h2 className={styles.instrumentTitle}>Bow technique feedback<br />you can act on</h2>
            <p className={styles.instrumentBody}>
              From bow pressure to phrasing shape — Mediant hears what your ear misses and tells you exactly what to change.
            </p>
          </div>
          <div className={`${styles.instrumentVisual} ${styles.revealL}`} style={{ '--d': '80ms' }}>
            <div className={styles.instrumentGlow} style={{ '--glow-color': 'rgba(157,133,217,0.1)' }} />
            <div className={styles.instrumentTilt} style={{ '--tilt': '10deg' }}>
              <CelloSVG />
              <BellNotes count={5} color="#9d85d9" fromBottom={false} />
            </div>
            <DocTyping text={CELLO_TEXT} color="#9d85d9" active={celloInView} />
          </div>
        </div>

        {/* Piano — center */}
        <div className={`${styles.pianoBand} ${styles.reveal}`} ref={pianoRef}>
          <div className={styles.pianoHead}>
            <span className={styles.sectionLabel}>Keyboard</span>
            <h2 className={styles.instrumentTitle}>Every voice, every hand,<br />every measure</h2>
            <p className={styles.instrumentBody} style={{ maxWidth: 480, margin: '0 auto' }}>
              Piano analysis tracks both hands independently — voicing balance, dynamic shaping, and rhythmic precision simultaneously.
            </p>
          </div>
          <div className={styles.pianoVisualWrap}>
            <div className={styles.pianoFadeLeft} />
            <div className={styles.pianoFadeRight} />
            <BellNotes count={8} color="#5cb86b" />
            <PianoSVG />
          </div>
          <div className={styles.pianoBoxes}>
            <DocTyping text={PIANO_TEXT_1} color="#5cb86b"  active={pianoInView} delay={0} />
            <DocTyping text={PIANO_TEXT_2} color="#d6b168"  active={pianoInView} delay={900} />
            <DocTyping text={PIANO_TEXT_3} color="#5cb86b"  active={pianoInView} delay={1800} />
          </div>
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
            <div className={styles.featureVisual}>
              <f.icon />
            </div>
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
