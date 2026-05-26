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

function PianoShowcase() {
  const whiteKeys = Array.from({ length: 30 })
  const blackKeys = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 28]

  return (
    <section className={`${styles.pianoShowcase} ${styles.reveal}`}>
      <div className={styles.pianoCopy}>
        <p className={styles.sectionLabel}>Keyboard analysis</p>
        <h2 className={styles.pianoTitle}>A living score map for every voice at the piano.</h2>
        <p className={styles.pianoBody}>
          Mediant separates melody, accompaniment, timing, and voicing into a visual layer that feels calm, precise, and teacher-led.
        </p>
      </div>

      <div className={styles.pianoStage} aria-hidden="true">
        <div className={styles.pianoHalo} />
        <svg className={styles.pianoLineArt} viewBox="0 0 960 560" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pianoLine" x1="88" y1="84" x2="875" y2="452" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(232,240,235,0.14)" />
              <stop offset="0.48" stopColor="rgba(232,240,235,0.36)" />
              <stop offset="1" stopColor="rgba(92,184,107,0.44)" />
            </linearGradient>
            <linearGradient id="keySweep" x1="180" y1="356" x2="745" y2="356" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(92,184,107,0.08)" />
              <stop offset="0.5" stopColor="rgba(214,177,104,0.5)" />
              <stop offset="1" stopColor="rgba(92,184,107,0.08)" />
            </linearGradient>
          </defs>

          <g className={styles.pianoSurfaces}>
            <path d="M186 296 C203 182 356 114 548 115 C717 116 858 189 891 291 C922 387 837 464 671 485 C492 508 260 459 192 374 C170 347 166 321 186 296 Z" />
            <path d="M310 96 C491 46 701 58 853 144 L758 220 C613 157 436 150 270 205 Z" />
            <path d="M210 332 L771 332 L726 421 L248 421 Z" />
          </g>

          <g className={styles.pianoDraw} stroke="url(#pianoLine)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            <path d="M186 296 C203 182 356 114 548 115 C717 116 858 189 891 291 C922 387 837 464 671 485 C492 508 260 459 192 374 C170 347 166 321 186 296 Z" />
            <path d="M203 298 C230 205 364 151 542 151 C687 151 815 206 853 289 C891 371 816 430 666 448 C511 467 301 427 230 358 C205 333 196 313 203 298 Z" opacity="0.58" />
            <path d="M270 228 C386 177 600 174 746 224 C806 244 842 271 856 299" opacity="0.22" />
            <path d="M288 255 C414 214 609 214 740 252 C796 268 829 288 843 312" opacity="0.18" />
            <path d="M315 285 C441 258 618 259 732 286 C779 297 810 312 824 329" opacity="0.14" />
            <path d="M310 96 C491 46 701 58 853 144 L758 220 C613 157 436 150 270 205 Z" />
            <path d="M345 101 C505 70 679 82 813 150" opacity="0.46" />
            <path d="M315 188 C466 134 646 145 759 220" opacity="0.34" />
            <path d="M760 220 L853 144" opacity="0.58" />
            <path d="M650 129 L728 416" opacity="0.38" />
            <path d="M682 153 L760 405" opacity="0.1" />
            <path d="M205 301 L210 365 L242 441" opacity="0.5" />
            <path d="M842 312 C824 378 772 426 681 457" opacity="0.38" />
            <path d="M323 220 L760 220" opacity="0.1" />
          </g>

          <g className={styles.pianoKeys}>
            <path d="M210 332 L771 332 L726 421 L248 421 Z" />
            <path className={styles.pianoFallboard} d="M226 304 L755 304 L771 332 L210 332 Z" />
            {whiteKeys.map((_, i) => (
              <rect
                key={i}
                className={styles.pianoWhiteKey}
                x={232 + i * 15.9}
                y="340"
                width="13"
                height="62"
                rx="2"
                style={{ '--ki': i }}
              />
            ))}
            {blackKeys.map((pos, i) => (
              <rect
                key={i}
                className={styles.pianoBlackKey}
                x={239 + pos * 15.9}
                y="340"
                width="9"
                height="39"
                rx="2"
                style={{ '--ki': i + 6 }}
              />
            ))}
            <path className={styles.pianoKeySweep} d="M234 409 L723 409" />
          </g>

          <g className={styles.pianoHands}>
            <g className={`${styles.pianoHand} ${styles.pianoLeftHand}`}>
              <path className={styles.handArm} d="M302 212 C290 246 285 276 294 309 C304 320 324 314 328 299 C322 268 323 238 336 211 Z" />
              <path className={styles.handWrist} d="M292 298 C305 288 324 289 337 303 C330 318 314 324 296 315 Z" />
              <path className={styles.handPalm} d="M318 278 C342 257 381 264 397 290 C408 307 400 330 380 340 C351 355 312 337 305 309 C302 296 307 286 318 278 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '0ms' }} d="M326 294 C332 291 338 292 341 297 C336 313 328 333 319 352 C315 361 302 357 306 347 C312 329 317 309 326 294 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '140ms' }} d="M344 287 C350 285 356 288 358 294 C356 314 352 337 347 356 C344 366 330 364 332 353 C336 331 339 307 344 287 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '260ms' }} d="M363 288 C370 288 374 293 375 300 C377 318 375 341 371 359 C369 369 355 369 356 357 C359 335 359 311 363 288 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '420ms' }} d="M380 296 C386 297 391 302 393 309 C401 326 404 342 405 358 C405 369 391 371 389 360 C385 340 380 319 380 296 Z" />
              <path className={styles.handThumbShape} style={{ '--fd': '560ms' }} d="M318 309 C300 311 284 321 274 338 C268 348 257 341 263 331 C275 309 294 296 320 293 Z" />
              <path className={styles.handKnuckle} d="M322 291 C341 304 371 306 390 295" />
              <path className={styles.handKnuckle} d="M315 311 C336 326 366 329 390 315" />
              <ellipse className={styles.fingernail} cx="313" cy="349" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="340" cy="355" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="363" cy="358" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="397" cy="358" rx="3.8" ry="1.7" />
            </g>

            <g className={`${styles.pianoHand} ${styles.pianoRightHand}`}>
              <path className={styles.handArm} d="M630 210 C643 247 650 279 642 312 C632 324 611 319 607 303 C613 271 611 240 596 211 Z" />
              <path className={styles.handWrist} d="M608 303 C622 290 642 291 653 306 C645 321 628 327 611 317 Z" />
              <path className={styles.handPalm} d="M548 282 C571 260 612 266 632 292 C647 311 640 337 617 349 C586 365 544 347 532 317 C527 303 535 290 548 282 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '80ms' }} d="M556 295 C562 291 568 293 571 299 C564 317 554 337 544 356 C539 365 527 359 532 349 C542 331 549 311 556 295 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '230ms' }} d="M575 288 C581 287 586 291 588 298 C585 319 580 341 574 360 C571 370 557 367 560 356 C565 335 570 311 575 288 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '360ms' }} d="M595 289 C601 290 606 294 607 302 C610 322 609 344 604 362 C601 372 588 371 589 360 C592 337 592 312 595 289 Z" />
              <path className={`${styles.handFingerShape} ${styles.pressFinger}`} style={{ '--fd': '520ms' }} d="M613 297 C619 298 625 303 628 310 C637 330 640 347 640 362 C640 372 626 374 624 363 C620 342 614 320 613 297 Z" />
              <path className={styles.handThumbShape} style={{ '--fd': '660ms' }} d="M626 315 C608 315 590 324 578 341 C572 350 561 342 567 332 C582 311 603 299 629 299 Z" />
              <path className={styles.handKnuckle} d="M554 298 C576 312 607 315 629 305" />
              <path className={styles.handKnuckle} d="M544 318 C568 337 604 341 629 327" />
              <ellipse className={styles.fingernail} cx="538" cy="352" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="568" cy="358" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="598" cy="361" rx="3.8" ry="1.7" />
              <ellipse className={styles.fingernail} cx="632" cy="361" rx="3.8" ry="1.7" />
            </g>
          </g>

          <g className={styles.pianoPedals} stroke="rgba(214,177,104,0.42)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            <path d="M386 420 Q381 451 359 480 L577 480 Q550 451 543 420" />
            <path d="M423 481 Q433 500 453 500 Q473 500 483 481" />
            <path d="M505 481 Q515 500 535 500 Q555 500 565 481" />
            <path d="M255 421 L232 512" opacity="0.46" />
            <path d="M715 421 L764 512" opacity="0.46" />
          </g>

          <g className={styles.pianoAnalysisMarks}>
            <path d="M306 317 C360 289 481 288 572 316" />
            <g>
              <rect x="340" y="282" width="56" height="25" rx="12.5" />
              <text x="368" y="299" textAnchor="middle">m.8</text>
            </g>
          </g>

          <rect className={styles.pianoScan} x="232" y="334" width="2" height="88" />
        </svg>

        <div className={styles.pianoFeedback}>
          <span className={styles.pianoFeedbackKicker}>Mediant sees</span>
          <p>m.8 - the left hand rushes the arpeggio. Let the accompaniment breathe so the melody stays supported.</p>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const [wordIdx, setWordIdx]         = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const canvasRef = useRef(null)

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

      <PianoShowcase />

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
