import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const STEPS = [
  {
    icon: '✦',
    title: 'Your analysis is ready',
    body: 'Mediant reviewed your recording measure by measure. Here are the key things to explore.',
  },
  {
    targetLabel: 'analysis-flags',
    title: 'Measure-level flags',
    body: 'Each flag pinpoints a specific moment — pitch, rhythm, technique, or posture. The timestamp links to that point in your video. Hit Loop to repeat just that measure.',
  },
  {
    targetLabel: 'analysis-summary-tab',
    title: 'Session Summary & Masterclasses',
    body: 'Switch to Session Summary to see your score breakdown, compare against past takes of the same piece, and browse expert masterclass videos curated for this exact work.',
  },
]

const PAD = 8
const CARD_W = 308

export default function AnalysisOnboarding({ onClose }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    if (!current.targetLabel) { setRect(null); return }
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-onboarding-label="${current.targetLabel}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }, 80)
    return () => clearTimeout(t)
  }, [step, current.targetLabel])

  function next() {
    if (isLast) { done() } else { setStep(s => s + 1) }
  }

  function done() {
    localStorage.setItem('mediant_analysis_intro', '1')
    onClose()
  }

  // Card positioning: centre when no target, below/above target element otherwise
  let cardStyle
  if (!rect) {
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(420, window.innerWidth - 32),
      zIndex: 1002,
    }
  } else {
    const CARD_H_EST = 210
    const spaceBelow = window.innerHeight - rect.bottom
    const showBelow = spaceBelow >= CARD_H_EST || spaceBelow >= rect.top

    const top = showBelow
      ? rect.bottom + 12
      : Math.max(8, rect.top - CARD_H_EST - 12)

    const left = Math.max(8, Math.min(
      rect.left + rect.width / 2 - CARD_W / 2,
      window.innerWidth - CARD_W - 8,
    ))

    cardStyle = { position: 'fixed', top, left, width: CARD_W, zIndex: 1002 }
  }

  return createPortal(
    <>
      <style>{`@keyframes ob-pulse{0%,100%{box-shadow:0 0 0 9999px rgba(10,12,14,.82),0 0 0 3px var(--accent)}50%{box-shadow:0 0 0 9999px rgba(10,12,14,.82),0 0 0 5px var(--accent),0 0 16px 4px rgba(88,121,101,.45)}}`}</style>

      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: rect ? 'transparent' : 'rgba(10,12,14,.82)' }}
        onClick={e => { if (e.target === e.currentTarget) done() }}
      />

      {/* Spotlight ring */}
      {rect && (
        <div style={{
          position: 'fixed',
          left: rect.left - PAD,
          top: rect.top - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 10,
          zIndex: 1001,
          pointerEvents: 'none',
          animation: 'ob-pulse 2s ease-in-out infinite',
        }} />
      )}

      {/* Card */}
      <div style={cardStyle}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: rect ? '22px 24px' : '40px 36px',
          textAlign: rect ? 'left' : 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        }}>
          {!rect && current.icon && (
            <div style={{ color: 'var(--accent)', fontSize: '2rem', marginBottom: 16 }}>
              {current.icon}
            </div>
          )}

          <h2 style={{ color: 'var(--text)', fontSize: rect ? '1rem' : '1.2rem', fontWeight: 600, margin: '0 0 8px' }}>
            {current.title}
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 18px' }}>
            {current.body}
          </p>

          <div style={{ display: 'flex', gap: 5, marginBottom: 16, justifyContent: rect ? 'flex-start' : 'center' }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer',
                transition: 'width 200ms ease',
                flexShrink: 0,
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: rect ? 'row' : 'column' }}>
            <button
              onClick={next}
              style={{
                flex: rect ? 1 : undefined,
                width: rect ? undefined : '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLast ? 'Got it' : 'Next →'}
            </button>
            <button
              onClick={done}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                padding: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
