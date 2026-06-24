import { useState } from 'react'
import { Link } from 'react-router-dom'

const KEY = 'mediant_cookie_ok'

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(KEY))

  if (dismissed) return null

  function accept() {
    localStorage.setItem(KEY, '1')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--bg-card, #1a1710)',
      borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.5, flex: 1, minWidth: 200 }}>
        We use cookies to keep you signed in. No tracking or advertising.{' '}
        <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          Privacy policy
        </Link>
      </p>
      <button
        onClick={accept}
        style={{
          background: 'var(--accent, #587965)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
          padding: '8px 18px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  )
}
