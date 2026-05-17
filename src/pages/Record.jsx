import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Page.module.css'

const INSTRUMENTS = [
  'Piano', 'Violin', 'Viola', 'Cello', 'Double Bass',
  'Flute', 'Oboe', 'Clarinet', 'Bassoon',
  'French Horn', 'Trumpet', 'Trombone', 'Tuba',
  'Guitar', 'Harp', 'Voice', 'Other',
]

export default function Record() {
  const nav  = useNavigate()
  const { user } = useAuth()

  // Piece info form
  const [pieceTitle,  setPieceTitle]  = useState('')
  const [composer,    setComposer]    = useState('')
  const [instrument,  setInstrument]  = useState('Piano')
  const [part,        setPart]        = useState('')

  // Upload state
  const [file,       setFile]       = useState(null)
  const [scoreFile,  setScoreFile]  = useState(null)
  const [dragging,   setDragging]   = useState(false)
  const [phase,      setPhase]      = useState('idle')   // idle | uploading | analyzing | error
  const [progress,   setProgress]   = useState(0)
  const [errorMsg,   setErrorMsg]   = useState('')
  const inputRef      = useRef()
  const scoreInputRef = useRef()

  const formComplete   = pieceTitle.trim() && composer.trim() && instrument
  const readyToAnalyze = formComplete && file && phase !== 'error'

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
    if (!readyToAnalyze) return
    if (!user?.id) {
      setErrorMsg('You must be logged in to analyze a recording.')
      setPhase('error')
      return
    }

    setPhase('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      // Phase 1: uploading — tick up to 45%
      const progressTick = setInterval(() => {
        setProgress(p => Math.min(p + 8, 45))
      }, 300)

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const filePath = `${user.id}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, file, {
          contentType: file.type || 'video/mp4',
          upsert: false,
        })

      // Upload MusicXML score if provided
      let scorePath = undefined
      if (scoreFile) {
        const safeSN = scoreFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const sp = `${user.id}/xml/${Date.now()}-${safeSN}`
        const { error: scoreUploadErr } = await supabase.storage
          .from('sheet-music')
          .upload(sp, scoreFile, { contentType: 'text/xml', upsert: false })
        if (!scoreUploadErr) scorePath = sp
      }

      clearInterval(progressTick)
      if (uploadError) throw new Error(uploadError.message || 'Upload failed')

      // Phase 2: analyzing — tick from 50% up to 95%
      setProgress(50)
      setPhase('analyzing')
      const analysisTick = setInterval(() => {
        setProgress(p => Math.min(p + 2, 95))
      }, 800)

      const { data: result, error: fnError } = await supabase.functions.invoke('analyze-performance', {
        body: {
          videoPath:     filePath,
          videoMimeType: file.type || 'video/mp4',
          scorePath,
          pieceTitle:    pieceTitle.trim(),
          composer:      composer.trim(),
          instrument,
          part:          part.trim() || undefined,
          timeSig:       '4/4',
        },
      })

      clearInterval(progressTick)
      clearInterval(analysisTick)

      if (fnError) throw new Error(fnError.message || 'Analysis failed')
      if (!result || result.error) throw new Error(result?.error || 'Analysis failed')

      // Store result locally so Analysis page can read it without a DB
      localStorage.setItem('mediant_last_take', JSON.stringify({
        id:             result.takeId ?? `local-${Date.now()}`,
        piece_title:    pieceTitle.trim(),
        piece_composer: composer.trim(),
        score:          result.score,
        flags:          result.flags,
        video_path:     filePath,
        video_mime_type:file.type || 'video/mp4',
      }))

      setProgress(100)
      setTimeout(() => {
        nav(result.takeId ? `/analysis?takeId=${encodeURIComponent(result.takeId)}` : '/analysis')
      }, 400)

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
        {readyToAnalyze && (
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
        {/* Left column — piece info + dropzone */}
        <div className={styles.recordLeft}>
          <div className={styles.pieceForm}>
            <p className={styles.label}>About this piece</p>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Piece title</label>
                <input
                  className={styles.formInput}
                  value={pieceTitle}
                  onChange={e => setPieceTitle(e.target.value)}
                  placeholder="e.g. Clair de Lune"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Composer</label>
                <input
                  className={styles.formInput}
                  value={composer}
                  onChange={e => setComposer(e.target.value)}
                  placeholder="e.g. Claude Debussy"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Instrument</label>
                <select
                  className={styles.formSelect}
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                >
                  {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Movement / part <span className={styles.formOptional}>(optional)</span></label>
                <input
                  className={styles.formInput}
                  value={part}
                  onChange={e => setPart(e.target.value)}
                  placeholder="e.g. III. Passepied"
                />
              </div>
            </div>
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

          {/* Optional MusicXML score upload */}
          <div className={styles.scoreAttach}>
            <input
              ref={scoreInputRef}
              type="file"
              accept=".xml,.musicxml,.mxl"
              style={{ display: 'none' }}
              onChange={e => setScoreFile(e.target.files[0] || null)}
            />
            <button
              className={styles.scoreAttachBtn}
              onClick={() => scoreInputRef.current?.click()}
              type="button"
            >
              {scoreFile ? `♩ ${scoreFile.name}` : '+ Attach MusicXML score (optional)'}
            </button>
            {scoreFile && (
              <button className={styles.scoreAttachClear} onClick={() => setScoreFile(null)} type="button">✕</button>
            )}
            <span className={styles.formHint}>Helps AI identify exact measure numbers</span>
          </div>

          {!formComplete && (
            <p className={styles.formHint}>Fill in the piece details above before analyzing.</p>
          )}
        </div>

        {/* Right column — waveform + info cards */}
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

      {readyToAnalyze && (
        <button className={`${styles.primaryBtn} ${styles.submitBtn}`} onClick={handleSubmit}>
          Analyze recording →
        </button>
      )}
    </div>
  )
}
