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

/* Music notes drifting upward from the instrument's sound origin */
function BellNotes({ count = 5, color = '#5cb86b', fromBottom = true, topPct }) {
  const posStyle = fromBottom
    ? {}
    : { top: topPct != null ? `${topPct}%` : '40%', bottom: 'auto' }
  return (
    <div className={styles.bellNotes} aria-hidden style={posStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={styles.bellNote}
          style={{
            '--nd': `${i * 0.85}s`,
            '--nx': `${-22 + (i * 14) % 48}px`,
            '--ndur': `${2.8 + (i % 3) * 0.7}s`,
            color,
            fontSize: `${0.9 + (i % 3) * 0.22}rem`,
          }}
        >
          {NOTES[i % NOTES.length]}
        </span>
      ))}
    </div>
  )
}

/* Google-Docs-style typing indicator — simple left-border box */
function DocTyping({ text, color, active, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]         = useState('idle')
  const timerRef = useRef(null)

  const pauseAt = Math.floor(text.length * 0.65)
  const minLen  = Math.floor(text.length * 0.50)

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
          58 + Math.random() * 30
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
    <div className={styles.docTyping} style={{ '--cc': color }}>
      <p className={styles.docText}>
        {displayed}
        {phase !== 'idle' && (
          <span className={styles.docCaret} style={{ '--cc': color }}>
            {isTyping && (
              <span className={styles.docCaretLabel} style={{ background: color }}>Mediant</span>
            )}
          </span>
        )}
      </p>
    </div>
  )
}


const CLARINET_TEXT = "m.12 – entrance is 18ms early. Ease into the pickup note and let the phrase settle onto the downbeat."
const CELLO_TEXT    = "m.24 – the shift lands slightly sharp. Relax the left hand and settle into the pitch before the phrase opens."
const PIANO_TEXT_1  = "m.8 – the left hand rushes the arpeggio. Let the accompaniment breathe so the melody stays supported."

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

        <div className={`${styles.instrumentBand} ${styles.revealL}`} ref={clarinetRef}>
          <div className={styles.instrumentText}>
            <span className={styles.sectionLabel}>Woodwinds</span>
            <h2 className={styles.instrumentTitle}>Measure-by-measure clarity for wind players</h2>
            <p className={styles.instrumentBody}>
              Mediant catches timing drift, intonation shifts, and tonal inconsistencies — flagged to the exact beat, not a vague average.
            </p>
          </div>
          <div className={`${styles.instrumentVisual} ${styles.revealR}`} style={{ '--d': '80ms' }}>
            {/* Lottie clarinet animation — coming soon */}
            <DocTyping text={CLARINET_TEXT} color="#d6b168" active={clarinetInView} />
          </div>
        </div>

        <div className={`${styles.instrumentBand} ${styles.instrumentBandFlip} ${styles.revealR}`} ref={pianoRef}>
          <div className={styles.instrumentText}>
            <span className={styles.sectionLabel}>Keyboard</span>
            <h2 className={styles.instrumentTitle}>Every voice, every hand, every measure</h2>
            <p className={styles.instrumentBody}>
              Piano analysis tracks both hands independently — voicing balance, dynamic shaping, and rhythmic precision, simultaneously.
            </p>
          </div>
          <div className={`${styles.instrumentVisual} ${styles.revealL}`} style={{ '--d': '80ms' }}>
            {/* Lottie piano animation — coming soon */}
            <DocTyping text={PIANO_TEXT_1} color="#5cb86b" active={pianoInView} />
          </div>
        </div>

        <div className={`${styles.instrumentBand} ${styles.revealL}`} ref={celloRef}>
          <div className={styles.instrumentText}>
            <span className={styles.sectionLabel}>Strings</span>
            <h2 className={styles.instrumentTitle}>Bow technique feedback you can act on</h2>
            <p className={styles.instrumentBody}>
              From bow pressure to phrasing shape — Mediant hears what your ear misses and tells you exactly what to change.
            </p>
          </div>
          <div className={`${styles.instrumentVisual} ${styles.revealR}`} style={{ '--d': '80ms' }}>
            {/* Lottie cello animation — coming soon */}
            <DocTyping text={CELLO_TEXT} color="#9d85d9" active={celloInView} />
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
