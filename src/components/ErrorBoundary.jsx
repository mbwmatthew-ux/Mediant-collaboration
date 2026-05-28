import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          justifyContent: 'center',
          minHeight: '40vh',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <span style={{ color: 'var(--coral)', fontSize: '1.4rem' }}>⚠</span>
          <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>
            Something went wrong
          </p>
          <p style={{ color: 'var(--text-soft)', fontSize: '0.88rem', margin: 0 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: 8,
              color: '#fff', cursor: 'pointer', fontSize: '0.88rem',
              marginTop: 4, padding: '8px 18px',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
