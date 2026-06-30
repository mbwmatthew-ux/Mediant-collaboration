import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { playToggle, playSave, playThud, playTick } from '../utils/sounds'
import { INSTRUMENTS } from '../lib/instruments'
import styles from './Settings.module.css'

const TABS = [
  { id: 'account',  label: 'Account'  },
  { id: 'security', label: 'Security' },
  { id: 'privacy',  label: 'Privacy'  },
  { id: 'billing',  label: 'Billing'  },
]

/* ── Shared bits ─────────────────────────────────────────────── */

function Toggle({ checked, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
    >
      <span className={styles.toggleKnob} />
    </button>
  )
}

function Row({ icon, label, sub, onClick, danger, children, value }) {
  return (
    <div
      className={`${styles.row} ${onClick ? styles.rowClickable : ''} ${danger ? styles.rowDanger : ''}`}
      onClick={onClick}
    >
      {icon && <span className={styles.rowIcon}>{icon}</span>}
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </div>
      {value && <span className={styles.rowValue}>{value}</span>}
      {children && <div className={styles.rowControl}>{children}</div>}
      {onClick && !children && <span className={styles.rowChevron}>›</span>}
    </div>
  )
}

function StatusNote({ kind, children }) {
  if (!children) return null
  return (
    <p className={`${styles.statusNote} ${kind === 'ok' ? styles.statusOk : kind === 'err' ? styles.statusErr : ''}`}>
      {children}
    </p>
  )
}

/* ── Account tab ─────────────────────────────────────────────── */

function AccountTab() {
  const { user, subscription, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const nav = useNavigate()

  const [name,          setName]          = useState(user?.name ?? '')
  const [instrument,    setInstrument]    = useState(user?.instrument ?? 'Piano')
  const [coachingStyle, setCoachingStyle] = useState(user?.coaching_style ?? 'Balanced')
  const [defaultNote,   setDefaultNote]   = useState(user?.default_note ?? '')
  const [saveStatus,    setSaveStatus]    = useState('idle') // idle | saving | saved

  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem('mediant_sound') !== 'false'
  )

  const initials = (user?.name ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const isPaid = subscription?.plan && subscription.plan !== 'free'

  async function saveProfile() {
    if (saveStatus === 'saving') return
    setSaveStatus('saving')
    try {
      await supabase.auth.updateUser({ data: { name, instrument, coaching_style: coachingStyle, default_note: defaultNote.trim() } })
      playSave()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2200)
    } catch {
      setSaveStatus('idle')
    }
  }

  function handleThemeToggle() {
    playToggle(theme !== 'dark')
    toggleTheme()
  }

  function handleSoundToggle() {
    const next = !soundOn
    setSoundOn(next)
    localStorage.setItem('mediant_sound', String(next))
    if (next) playToggle(true)
  }

  function handleSignOut() {
    playThud()
    logout()
    nav('/')
  }

  return (
    <>
      {/* Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account information</h2>
        <div className={styles.card}>
          <div className={styles.profileCard}>

            <div className={styles.profileTop}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.profileMeta}>
                <span style={{ fontSize: '0.925rem', fontWeight: 500, color: 'var(--text)' }}>
                  {user?.name ?? 'Guest'}
                </span>
                <span className={styles.profileEmail}>{user?.email}</span>
                <span className={`${styles.planBadge} ${isPaid ? '' : styles.planBadgeFree}`}>
                  {isPaid ? `${subscription.plan} plan` : 'Free plan'}
                </span>
              </div>
            </div>

            <div className={styles.profileFields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Display name</label>
                <input
                  className={styles.fieldInput}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Email</label>
                <input
                  className={styles.fieldInput}
                  value={user?.email ?? ''}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Primary instrument</label>
                <select
                  className={styles.fieldSelect}
                  value={instrument}
                  onChange={e => { playTick(); setInstrument(e.target.value) }}
                >
                  {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Coaching style</label>
                <select
                  className={styles.fieldSelect}
                  value={coachingStyle}
                  onChange={e => { playTick(); setCoachingStyle(e.target.value) }}
                >
                  <option value="Balanced">Balanced — mix of encouragement and critique</option>
                  <option value="Encouraging">Encouraging — warm, motivating tone</option>
                  <option value="Technical">Technical — detailed, analytical focus</option>
                  <option value="Direct">Direct — concise, no-nonsense feedback</option>
                </select>
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label className={styles.fieldLabel}>Default note for the AI</label>
              <textarea
                className={styles.fieldTextarea}
                value={defaultNote}
                onChange={e => setDefaultNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Always tell the AI this about your playing — e.g. an instrument quirk, an injury, or your usual setup. It pre-fills the notes on every new recording."
              />
            </div>

            <div className={styles.profileFooter}>
              <button
                className={`${styles.saveBtn} ${saveStatus === 'saved' ? styles.saveBtnSaved : ''}`}
                onClick={saveProfile}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save changes'}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.card}>
          <Row
            icon={theme === 'dark' ? '🌙' : '☀️'}
            label="Dark mode"
            sub="Switch between light and dark theme"
          >
            <Toggle checked={theme === 'dark'} onChange={handleThemeToggle} />
          </Row>
        </div>
      </section>

      {/* Sound */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sound</h2>
        <div className={styles.card}>
          <Row
            icon="♪"
            label="Sound effects"
            sub="Subtle audio feedback for interactions and analysis"
          >
            <Toggle checked={soundOn} onChange={handleSoundToggle} />
          </Row>
        </div>
      </section>

      {/* Help */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Help</h2>
        <div className={styles.card}>
          <Row icon="⌨" label="Keyboard shortcuts">
            <div />
          </Row>
          <div className={styles.shortcutsGrid}>
            {[
              ['Space', 'Play / pause'],
              ['← →',  'Previous / next measure'],
              ['L',     'Toggle loop on current section'],
              ['Esc',   'Close any panel'],
              ['R',     'Go to upload recording'],
              ['S',     'Go to score review'],
            ].map(([key, desc]) => (
              <div key={key} className={styles.shortcutRow}>
                <kbd className={styles.shortcutKey}>{key}</kbd>
                <span className={styles.shortcutDesc}>{desc}</span>
              </div>
            ))}
          </div>
          <Row
            icon="✉"
            label="Contact support"
            sub="mediantteam@gmail.com"
            onClick={() => window.location.href = 'mailto:mediantteam@gmail.com'}
          />
        </div>
      </section>

      {/* About */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.card}>
          <div className={styles.versionRow}>
            <span className={styles.versionLabel}>Mediant</span>
            <span className={styles.versionValue}>Version 0.1</span>
          </div>
          <div className={styles.versionRow}>
            <span className={styles.versionLabel}>Music performance analysis</span>
            <a href="/terms" className={styles.versionLink}>Terms ↗</a>
          </div>
        </div>
      </section>

      <button className={styles.signOutBtn} onClick={handleSignOut}>
        Sign out
      </button>
    </>
  )
}

/* ── Security tab ────────────────────────────────────────────── */

function SecurityTab() {
  const { user } = useAuth()

  const [pw,  setPw]  = useState('')
  const [pw2, setPw2] = useState('')
  const [pwState, setPwState] = useState('idle') // idle | saving | saved | error
  const [pwMsg,   setPwMsg]   = useState('')

  const [email, setEmail] = useState('')
  const [emailState, setEmailState] = useState('idle')
  const [emailMsg,   setEmailMsg]   = useState('')

  async function updatePassword(e) {
    e.preventDefault()
    if (pwState === 'saving') return
    if (pw.length < 8)  { setPwState('error'); setPwMsg('Use at least 8 characters.'); return }
    if (pw !== pw2)     { setPwState('error'); setPwMsg("The two passwords don't match."); return }
    setPwState('saving'); setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { setPwState('error'); setPwMsg(error.message); return }
    playSave()
    setPwState('saved'); setPwMsg('Password updated.')
    setPw(''); setPw2('')
    setTimeout(() => { setPwState('idle'); setPwMsg('') }, 3200)
  }

  async function updateEmail(e) {
    e.preventDefault()
    if (emailState === 'saving') return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailState('error'); setEmailMsg('Enter a valid email address.'); return
    }
    setEmailState('saving'); setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email })
    if (error) { setEmailState('error'); setEmailMsg(error.message); return }
    playSave()
    setEmailState('saved'); setEmailMsg('Confirmation link sent — check your inbox to finish the change.')
    setEmail('')
    setTimeout(() => { setEmailState('idle'); setEmailMsg('') }, 5000)
  }

  return (
    <>
      {/* Password */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Password</h2>
        <div className={styles.card}>
          <form className={styles.cardBody} onSubmit={updatePassword}>
            <p className={styles.cardDesc}>Choose a new password for your account. You'll stay signed in on this device.</p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>New password</label>
              <input
                className={styles.fieldInput}
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Confirm new password</label>
              <input
                className={styles.fieldInput}
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <div className={styles.formActions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={pwState === 'saving' || !pw || !pw2}
              >
                {pwState === 'saving' ? 'Updating…' : 'Update password'}
              </button>
              <StatusNote kind={pwState === 'saved' ? 'ok' : pwState === 'error' ? 'err' : ''}>{pwMsg}</StatusNote>
            </div>
          </form>
        </div>
      </section>

      {/* Two-factor */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Two-factor authentication</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <div className={styles.cardHeadRow}>
              <div>
                <p className={styles.cardTitle}>Authenticator app</p>
                <p className={styles.cardDesc}>Add a second step at sign-in using a one-time code from an authenticator app.</p>
              </div>
              <span className={styles.tag}>Coming soon</span>
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} disabled>
                Set up two-factor
              </button>
              <span className={styles.cardDesc}>Available in an upcoming release.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Email */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Email address</h2>
        <div className={styles.card}>
          <form className={styles.cardBody} onSubmit={updateEmail}>
            <p className={styles.cardDesc}>
              Your account email is <strong className={styles.inlineStrong}>{user?.email ?? '—'}</strong>. Changing it sends a confirmation link to the new address.
            </p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>New email</label>
              <input
                className={styles.fieldInput}
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className={styles.formActions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={emailState === 'saving' || !email}
              >
                {emailState === 'saving' ? 'Sending…' : 'Send confirmation'}
              </button>
              <StatusNote kind={emailState === 'saved' ? 'ok' : emailState === 'error' ? 'err' : ''}>{emailMsg}</StatusNote>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

/* ── Privacy tab ─────────────────────────────────────────────── */

function PrivacyTab() {
  const { logout } = useAuth()
  const nav = useNavigate()
  const [exportState, setExportState] = useState('idle') // idle | requested
  const [clearState,  setClearState]  = useState('idle') // idle | confirm | done
  const [delState,    setDelState]    = useState('idle') // idle | confirm | deleting | error
  const [delError,    setDelError]    = useState('')

  function requestExport() {
    playTick()
    setExportState('requested')
    setTimeout(() => setExportState('idle'), 5000)
  }

  function clearCache() {
    if (clearState !== 'confirm') { playTick(); setClearState('confirm'); return }
    playThud()
    try { indexedDB.deleteDatabase('mediant_files') } catch { /* ignore */ }
    setClearState('done')
    setTimeout(() => setClearState('idle'), 2600)
  }

  async function deleteAccount() {
    if (delState === 'idle') { playTick(); setDelState('confirm'); return }
    if (delState !== 'confirm') return
    playThud()
    setDelState('deleting')
    setDelError('')
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error || !data?.ok) {
        setDelState('error')
        setDelError(error?.message ?? data?.error ?? 'Something went wrong. Please email mediantteam@gmail.com.')
        return
      }
      await logout()
      nav('/')
    } catch (e) {
      setDelState('error')
      setDelError((e instanceof Error ? e.message : null) ?? 'Something went wrong.')
    }
  }

  return (
    <>
      {/* How your data is handled */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your data</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              When you upload a recording, the audio and any sheet music are sent to Mediant's
              secure storage and processed by our analysis service to generate your feedback.
              Your recordings are tied to your account and are not sold or shared with advertisers.
              Use of your data is covered by our privacy policy.
            </p>
            <div className={styles.formActions}>
              <Link to="/privacy" className={`${styles.btn} ${styles.btnGhost}`}>
                Read privacy policy ↗
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Export */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Export your data</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Request a copy of your recordings, takes, and feedback history. We'll prepare an
              archive and email you a download link when it's ready.
            </p>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={requestExport}>
                Request data export
              </button>
              <StatusNote kind={exportState === 'requested' ? 'ok' : ''}>
                {exportState === 'requested' ? "Export isn't live yet — this is where your download will appear soon." : ''}
              </StatusNote>
            </div>
          </div>
        </div>
      </section>

      {/* Cached recordings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cached recordings</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Mediant keeps recent recordings in this browser for faster playback. Clearing them
              frees up space on this device and doesn't delete anything from your account.
            </p>
            <div className={styles.formActions}>
              <button
                className={`${styles.btn} ${clearState === 'confirm' ? styles.btnDanger : styles.btnSecondary}`}
                onClick={clearCache}
              >
                {clearState === 'confirm' ? 'Click again to confirm' : clearState === 'done' ? '✓ Cleared' : 'Clear cached recordings'}
              </button>
              {clearState === 'confirm' && (
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setClearState('idle')}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Delete account</h2>
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Permanently delete your account and all associated recordings, takes, and feedback.
              This cannot be undone — all your data will be removed immediately.
            </p>
            <div className={styles.formActions}>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={deleteAccount}
                disabled={delState === 'deleting'}
              >
                {delState === 'deleting' ? 'Deleting…' : delState === 'confirm' ? 'Confirm — delete everything' : 'Delete account'}
              </button>
              {(delState === 'confirm' || delState === 'error') && (
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setDelState('idle'); setDelError('') }}>Cancel</button>
              )}
            </div>
            {delState === 'error' && delError && (
              <StatusNote kind="err">{delError}</StatusNote>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

/* ── Billing tab ─────────────────────────────────────────────── */

function StatusPill({ status }) {
  const map = {
    paid:     ['Paid',     styles.pillPaid],
    pending:  ['Pending',  styles.pillPending],
    refunded: ['Refunded', styles.pillRefunded],
  }
  const [label, cls] = map[status] ?? ['—', '']
  return (
    <span className={`${styles.statusPill} ${cls}`}>
      <span className={styles.pillDot} />{label}
    </span>
  )
}

function BillingTab() {
  const { subscription } = useAuth()
  const nav = useNavigate()

  const isPaid    = subscription?.plan && subscription.plan !== 'free'
  const planName  = isPaid ? subscription.plan : 'Free'
  const renewal   = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const invoices = [
    { id: 'INV-2026-0007', date: 'Jun 1, 2026', amount: '$14.99', status: 'paid' },
    { id: 'INV-2026-0006', date: 'May 1, 2026', amount: '$14.99', status: 'paid' },
    { id: 'INV-2026-0005', date: 'Apr 1, 2026', amount: '$14.99', status: 'refunded' },
  ]

  return (
    <>
      {/* Current plan */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Current plan</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <div className={styles.cardHeadRow}>
              <div>
                <p className={styles.cardTitle}>{planName} plan</p>
                <p className={styles.cardDesc}>
                  {isPaid
                    ? renewal ? `Renews on ${renewal}.` : 'Active subscription.'
                    : "You're on the free plan — 5 uploads per month."}
                </p>
              </div>
              <span className={`${styles.planBadge} ${isPaid ? '' : styles.planBadgeFree}`}>{planName}</span>
            </div>
            <div className={styles.formActions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => { playTick(); nav('/pricing') }}
              >
                {isPaid ? 'Change plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Payment method */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payment method</h2>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <p className={styles.cardDesc}>
              Billing is handled securely by Stripe — your card details never touch Mediant's servers.
            </p>
            <div className={styles.cardOnFile}>
              <span className={styles.cardBrand}>VISA</span>
              <div className={styles.cardMeta}>
                <span className={styles.cardDigits}>•••• •••• •••• 4242</span>
                <span className={styles.cardExp}>Expires 04 / 2028</span>
              </div>
              <span className={styles.tag} style={{ marginLeft: 'auto' }}>Sample</span>
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} disabled>
                Manage via Stripe
              </button>
              <span className={styles.cardDesc}>Available once Stripe billing is connected.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Billing history */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Billing history</h2>
        <div className={styles.card}>
          <div className={styles.cardBody} style={{ paddingBottom: 0 }}>
            <div className={styles.cardHeadRow}>
              <div>
                <p className={styles.cardTitle}>Invoices</p>
                <p className={styles.cardDesc}>Receipts for past payments.</p>
              </div>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.billingTable}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th><span className={styles.srOnly}>Receipt</span></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className={styles.mono}>{inv.id}</td>
                    <td>{inv.date}</td>
                    <td>{inv.amount}</td>
                    <td><StatusPill status={inv.status} /></td>
                    <td className={styles.tableActionCell}>
                      <button className={styles.dlBtn} disabled aria-label="Download receipt">
                        <DownloadIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            Sample data — your real invoices will appear here once Stripe billing is live.
          </p>
        </div>
      </section>
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────── */

export default function Settings() {
  const [tab, setTab] = useState('account')

  function selectTab(id) {
    if (id === tab) return
    playTick()
    setTab(id)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSub}>Manage your profile, security, privacy, and billing.</p>
      </div>

      <nav className={styles.tabStrip} role="tablist" aria-label="Settings sections">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabPanel} role="tabpanel" key={tab}>
        {tab === 'account'  && <AccountTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'privacy'  && <PrivacyTab />}
        {tab === 'billing'  && <BillingTab />}
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────── */

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
