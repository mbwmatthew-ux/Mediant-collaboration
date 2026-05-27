import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Auth.module.css'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Auto-redirect when user arrives already authenticated — happens after clicking
  // the email confirmation link, which sets the session before landing here.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav('/home', { replace: true })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) nav('/home', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [nav])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.ok) {
      nav('/home')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.brandMark}>Mediant</Link>
      </nav>

      <div className={styles.card}>
        <p className={styles.eyebrow}>Welcome back</p>
        <h1 className={styles.heading}>Log in</h1>
        <p className={styles.sub}>Pick up right where you left off.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button className={styles.submitBtn} type="submit">Log in</button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className={styles.footerLink}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
