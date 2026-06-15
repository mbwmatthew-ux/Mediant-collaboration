import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import TunerModal from './Tuner'
import MetronomeModal from './Metronome'
import ErrorBoundary from './ErrorBoundary'
import LogoMark from './LogoMark'
import styles from './AppShell.module.css'
import { playNav } from '../utils/sounds'

const NAV_ITEMS = [
  { to: '/home',     label: 'Home',       icon: HomeIcon     },
  { to: '/takes',    label: 'Library',    icon: LibraryIcon  },
  { to: '/record',   label: 'New Take',   icon: RecordIcon   },
  { to: '/progress', label: 'Progress',   icon: ProgressIcon },
  { to: '/settings', label: 'Settings',   icon: SettingsIcon },
]

const TOOL_ITEMS = [
  { to: '/coach',        label: 'AI Coach',   icon: CoachIcon    },
  { to: '/analysis',     label: 'Analysis',   icon: AnalysisIcon },
  { action: 'tuner',     label: 'Tuner',     icon: TunerIcon     },
  { action: 'metronome', label: 'Metronome', icon: MetronomeIcon },
]

export default function AppShell() {
  const { user } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [showTuner,     setShowTuner]    = useState(false)
  const [showMetronome, setShowMetronome]= useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'r' || e.key === 'R') nav('/record')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [nav])

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  function handleToolAction(action) {
    playNav()
    if (action === 'tuner')     setShowTuner(true)
    if (action === 'metronome') setShowMetronome(true)
  }

  return (
    <div className={styles.shell}>
      {showTuner     && <TunerModal     onClose={() => setShowTuner(false)}     />}
      {showMetronome && <MetronomeModal onClose={() => setShowMetronome(false)} />}

      <a className={styles.skipLink} href="#main-content">Skip to content</a>

      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Logo */}
          <NavLink to="/home" className={styles.sidebarLogo} onClick={playNav} title="Mediant">
            <LogoMark size={30} color="rgba(255,255,255,0.9)" />
          </NavLink>

          <nav className={styles.nav} aria-label="Primary navigation">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={playNav}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
                title={item.label}
              >
                <span className={styles.navIcon}><item.icon /></span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ))}

            <div className={styles.navDivider} />

            {TOOL_ITEMS.map(item => item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={playNav}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
                title={item.label}
              >
                <span className={styles.navIcon}><item.icon /></span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ) : (
              <button
                key={item.label}
                className={styles.navItem}
                onClick={() => handleToolAction(item.action)}
                title={item.label}
              >
                <span className={styles.navIcon}><item.icon /></span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Account */}
          <div className={styles.sidebarBottom}>
            <button
              className={`${styles.navItem} ${styles.avatarItem}`}
              onClick={() => { playNav(); nav('/settings') }}
              title={user?.name ?? 'Account'}
            >
              <span className={styles.avatarChip}>{initials}</span>
              <span className={styles.navLabel}>{user?.name?.split(' ')[0] ?? 'Account'}</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.main} id="main-content">
          <ErrorBoundary key={location.pathname}>
            <div key={location.pathname} className={styles.pageIn}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        {[
          { to: '/home',     label: 'Home',     icon: HomeIcon     },
          { to: '/takes',    label: 'Library',  icon: LibraryIcon  },
          { to: '/record',   label: 'Record',   icon: RecordIcon   },
          { to: '/progress', label: 'Progress', icon: ProgressIcon },
          { to: '/coach',    label: 'Coach',    icon: CoachIcon    },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={playNav}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
            }
          >
            <Icon />
            <span className={styles.mobileNavLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────── */

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

function RecordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}

function AnalysisIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M7 9h10M7 13h6M7 17h4"/>
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  )
}

function CoachIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function TunerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v4l3 3"/>
    </svg>
  )
}

function MetronomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 20 22 4 22"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
