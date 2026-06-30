import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Page.module.css'
import { playPop, playTick } from '../utils/sounds'

const FALLBACK_SUGGESTIONS = [
  'How do I fix rushing in fast passages?',
  'What\'s the best way to practice hands separately?',
  'How do I bring out the melody over the accompaniment?',
  'What does it mean to play with more expression?',
]

function buildSuggestions(take) {
  if (!take?.flags?.length) return FALLBACK_SUGGESTIONS
  const suggestions = []
  const seen = new Set()
  for (const f of take.flags) {
    if (!f.type || seen.has(f.type)) continue
    seen.add(f.type)
    if (f.type === 'intonation')
      suggestions.push(`How can I improve my intonation — like the issue in measure ${f.measure}?`)
    else if (f.type === 'rhythm' || f.type === 'timing')
      suggestions.push(`How do I fix rhythm/timing in passages like measure ${f.measure}?`)
    else if (f.type === 'dynamics')
      suggestions.push('How do I bring out more dynamic contrast in my playing?')
    else if (f.type === 'technique' || f.type === 'articulation')
      suggestions.push(`What exercises help with ${f.type} — like the issue in measure ${f.measure}?`)
    if (suggestions.length >= 3) break
  }
  const fills = [
    take.score != null ? `How can I raise my score from ${take.score}/100?` : 'How do I structure my practice most efficiently?',
    'What should I focus on first in my next session?',
    'How do I avoid ingraining bad habits when working on problem spots?',
  ]
  let fi = 0
  while (suggestions.length < 4 && fi < fills.length) suggestions.push(fills[fi++])
  return suggestions
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

export default function Coach() {
  const { user }                           = useAuth()
  const [messages, setMessages]            = useState([])
  const [input, setInput]                  = useState('')
  const [loading, setLoading]              = useState(false)
  const [take, setTake]                    = useState(null)
  const [streamingText, setStreamingText]  = useState(null)
  const endRef    = useRef(null)
  const inputRef  = useRef(null)
  const takeRef   = useRef(null)
  const streamRef = useRef({ reply: '', index: 0, withUser: [] })

  useEffect(() => { takeRef.current = take }, [take])

  useEffect(() => {
    // /coach is auth-gated, so there is normally a user. If somehow there isn't,
    // skip the load rather than fetch a global (someone else's) take.
    if (!user?.id) return
    supabase
      .from('takes')
      .select('id, piece_title, piece_composer, instrument, score, flags, chat_history')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTake(data)
          if (Array.isArray(data.chat_history) && data.chat_history.length > 0) {
            setMessages(data.chat_history)
          }
        }
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem('mediant_last_take')
          if (stored) setTake(JSON.parse(stored))
        } catch {}
      })
  }, [user?.id])

  const isStreaming = streamingText !== null

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, isStreaming])

  // Typewriter streaming effect
  useEffect(() => {
    if (streamingText === null) return
    const { reply, index } = streamRef.current
    if (index >= reply.length) {
      const updated = [...streamRef.current.withUser, { role: 'assistant', content: reply }]
      setMessages(updated)
      const t = takeRef.current
      if (t?.id) {
        supabase.from('takes').update({ chat_history: updated }).eq('id', t.id).catch(() => {})
      }
      setStreamingText(null)
      inputRef.current?.focus()
      return
    }
    const timer = setTimeout(() => {
      const next = Math.min(index + 3, reply.length)
      streamRef.current.index = next
      setStreamingText(reply.slice(0, next))
    }, 12)
    return () => clearTimeout(timer)
  }, [streamingText])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading || isStreaming) return
    playPop()
    setInput('')
    const withUser = [...messages, { role: 'user', content: msg }]
    setMessages(withUser)
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: msg,
          context: {
            pieceTitle:    take?.piece_title    ?? null,
            pieceComposer: take?.piece_composer ?? null,
            instrument:    take?.instrument     ?? null,
            flags:         take?.flags          ?? [],
            coachingStyle: user?.coaching_style ?? 'Balanced',
          },
          history: messages,
        },
      })
      if (error) throw new Error(error.message ?? String(error))
      if (data?.error) throw new Error(data.error)
      const reply = data?.reply ?? ''
      setLoading(false)
      streamRef.current = { reply, index: 0, withUser }
      setStreamingText('')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('Daily coaching limit')) {
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
      }
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleSuggestion(s) {
    playTick()
    send(s)
  }

  const hasContext = take?.piece_title

  return (
    <div className={styles.coachPage}>

      {/* Header */}
      <div className={styles.coachHeader}>
        <div>
          <p className={styles.label}>Mediant</p>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>Ask Mediant</h1>
        </div>
        {hasContext && (
          <div className={styles.coachContextBadge}>
            <span className={styles.coachContextDot} />
            {take.piece_title}{take.piece_composer ? ` · ${take.piece_composer}` : ''}
            {take.score != null && ` · ${take.score}/100`}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className={styles.coachMessages}>
        {messages.length === 0 && !isStreaming && (
          <div className={styles.coachWelcome}>
            <span className={styles.coachWelcomeIcon}>♩</span>
            <p className={styles.coachWelcomeTitle}>Mediant is ready to help</p>
            <p className={styles.coachWelcomeSub}>
              {hasContext
                ? `Ask anything about ${take.piece_title}, or about your practice in general.`
                : 'Ask anything about technique, theory, practice strategy, or musical expression.'}
            </p>
            <div className={styles.coachSuggestions}>
              {buildSuggestions(take).map(s => (
                <button
                  key={s}
                  className={styles.coachSuggestionChip}
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? styles.chatMsgUser : styles.chatMsgAI}>
            {m.content}
          </div>
        ))}

        {loading && (
          <div className={styles.chatMsgAI}>
            <span className={styles.chatTyping}>···</span>
          </div>
        )}

        {isStreaming && (
          <div className={styles.chatMsgAI} style={{ animation: 'none' }}>
            {streamingText}
            <span className={styles.streamCursor} />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className={styles.coachInputBar}>
        <input
          ref={inputRef}
          className={styles.coachInput}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask Mediant anything…"
          disabled={loading || isStreaming}
        />
        <button
          className={styles.coachSendBtn}
          onClick={() => send()}
          disabled={loading || isStreaming || !input.trim()}
        >↑</button>
      </div>
    </div>
  )
}
