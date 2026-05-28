import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Sentry is loaded lazily so it doesn't block initial parse.
// It initialises before the app renders but after the critical JS is evaluated.
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
  import('@sentry/react').then((Sentry) => {
    window.__SENTRY_INITIALIZED__ = true
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ],
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
