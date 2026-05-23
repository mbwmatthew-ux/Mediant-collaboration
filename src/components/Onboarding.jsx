import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    icon: '♩',
    title: 'Welcome to Mediant',
    body: 'Your personal AI music coach. Upload a recording of yourself playing and get measure-level feedback — just like working with a professional teacher.',
    cta: 'Next →',
  },
  {
    icon: '◎',
    title: 'How it works',
    body: 'Drop in your sheet music and a video of your performance. Mediant listens for timing, intonation, and technique issues — and tells you exactly which measures to work on.',
    cta: 'Next →',
  },
  {
    icon: '✓',
    title: "You're all set",
    body: 'Upload your first recording to get started. You can use a phone video — no fancy equipment needed.',
    cta: 'Upload a recording',
    action: 'record',
  },
]

export default function Onboarding({ onClose }) {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  function handleCta() {
    if (current.action === 'record') {
      localStorage.setItem('mediant_onboarded', '1')
      onClose()
      nav('/record')
    } else {
      setStep(s => s + 1)
    }
  }

  function handleSkip() {
    localStorage.setItem('mediant_onboarded', '1')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,12,14,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleSkip() }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '40px 36px',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.4rem', marginBottom: 20, color: 'var(--accent)' }}>
          {current.icon}
        </div>

        <h2 style={{ color: 'var(--text)', fontSize: '1.35rem', fontWeight: 600, marginBottom: 12 }}>
          {current.title}
        </h2>

        <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: 32 }}>
          {current.body}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === step ? 'var(--accent)' : 'var(--border)',
              transition: 'width 200ms ease, background 200ms ease',
            }} />
          ))}
        </div>

        <button
          onClick={handleCta}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '13px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          {current.cta}
        </button>

        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Skip intro
        </button>
      </div>
    </div>
  )
}
