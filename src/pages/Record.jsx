import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Page.module.css'

const PIECE = {
  title:    'Clair de Lune',
  composer: 'Claude Debussy',
  timeSig:  '3/4',
  instrument: 'Piano',
}

export default function Record() {
  const nav  = useNavigate()
  const { user } = useAuth()
  const [file, setFile]       = useState(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase]     = useState('idle')   // idle | uploading | analyzing | error
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  async function handleSubmit() {
    if (!file || !user) return
    setPhase('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      // 1. Upload video to Supabase Storage
      const ext      = file.name.split('.').pop()
      const videoPath = `${user.id}/${Date.now()}.${ext}`

      // Simulate upload progress (Supabase JS SDK doesn't expose byte progress yet)
      const progressTick = setInterval(() => {
        setProgress(p => Math.min(p + 6, 45))
      }, 300)

      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(videoPath, file, { contentType: file.type })

      clearInterval(progressTick)
      if (uploadError) throw uploadError

      setProgress(50)
      setPhase('analyzing')

      // 2. Call analyze-performance edge function
      const { data: { session } } = await supabase.auth.getSession()

      // Advance progress bar during AI analysis
      const analysisTick = setInterval(() => {
        setProgress(p => Math.min(p + 3, 95))
      }, 800)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-performance`,
        {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            videoPath,
            videoMimeType: file.type,
            pieceTitle:  PIECE.title,
            composer:    PIECE.composer,
            timeSig:     PIECE.timeSig,
            instrument:  PIECE.instrument,
          }),
        }
      )

      clearInterval(analysisTick)
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'Analysis failed')

      setProgress(100)
      setTimeout(() => nav(`/analysis?takeId=${result.takeId}`), 400)

    } catch (err) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }

  // ── Loading screens ────────────────────────────────────────

  if (phase === 'uploading' || phase === 'analyzing') {
    const title = phase === 'uploading'
      ? 'Uploading your video…'
      : 'AI is listening to your performance…'
    const sub = phase === 'uploading'
      ? 'Sending your recording to the server.'
      : 'Gemini is analyzing timing, dynamics, and technique. This takes about 30 seconds.'

    return (
      <div className={styles.page}>
        <div className={styles.analyzeScreen}>
          <div className={styles.analyzeIcon}>♪</div>
          <h2 className={styles.analyzeTitle}>{title}</h2>
          <p className={styles.analyzeSub}>{sub}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
          <p className={styles.progressLabel}>{Math.round(progress)}%</p>
        </div>
      </div>
    )
  }

  // ── Upload form ────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Upload Recording</p>
          <h1 className={styles.title}>Submit your take</h1>
        </div>
        {file && phase !== 'error' && (
          <button className={styles.primaryBtn} onClick={handleSubmit}>
            Analyze recording →
          </button>
        )}
      </div>

      {phase === 'error' && (
        <div className={styles.errorBanner}>
          <strong>Analysis failed:</strong> {errorMsg}
          <button className={styles.errorRetry} onClick={() => setPhase('idle')}>Try again</button>
        </div>
      )}

      <div className={styles.recordLayout}>
        <div>
          <div className={styles.pieceCard}>
            <p className={styles.label}>Selected piece</p>
            <h3 className={styles.resultTitle}>{PIECE.title}</h3>
            <p className={styles.resultSub}>{PIECE.instrument} · the app will match your recording to this score.</p>
          </div>

          <div
            className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${file ? styles.dropzoneDone : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            {file ? (
              <>
                <span className={styles.dropzoneCheck}>✓</span>
                <strong>{file.name}</strong>
                <span className={styles.dropzoneSub}>Click to choose a different file</span>
              </>
            ) : (
              <>
                <span className={styles.dropzoneIcon}>↑</span>
                <strong>Drag a video here or click to upload</strong>
                <span className={styles.dropzoneSub}>MP4, MOV, or WebM · max 200 MB</span>
              </>
            )}
          </div>
        </div>

        <div>
          <div className={styles.waveformCard}>
            <div className={styles.waveform}>
              {[22, 46, 62, 34, 78, 48, 70, 31, 64, 52, 38, 68].map((h, i) => (
                <span key={i} style={{ height: `${h}%`, opacity: file ? 1 : 0.35 }} />
              ))}
            </div>
            <p className={styles.resultSub}>
              {file ? `${file.name} · ready for review` : 'No recording loaded yet'}
            </p>
          </div>

          <div className={styles.captureGrid}>
            <div className={styles.captureCard}>
              <p className={styles.label}>What AI listens for</p>
              <strong>Timing · Dynamics · Articulation · Intonation</strong>
            </div>
            <div className={styles.captureCard}>
              <p className={styles.label}>Expected output</p>
              <strong>Flagged measures + coaching feedback</strong>
            </div>
          </div>
        </div>
      </div>

      {file && phase !== 'error' && (
        <button className={`${styles.primaryBtn} ${styles.submitBtn}`} onClick={handleSubmit}>
          Analyze recording →
        </button>
      )}
    </div>
  )
}
