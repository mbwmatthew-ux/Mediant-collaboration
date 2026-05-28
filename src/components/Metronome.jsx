import { useEffect, useRef, useState } from 'react'
import styles from './Metronome.module.css'

const BPM_MIN = 20
const BPM_MAX = 300
const SCHEDULE_AHEAD = 0.12  // seconds to schedule ahead
const TICK_MS        = 25    // scheduler interval

export default function MetronomeModal({ onClose }) {
  const [bpm,     setBpm]     = useState(120)
  const [beats,   setBeats]   = useState(4)
  const [playing, setPlaying] = useState(false)
  const [beat,    setBeat]    = useState(-1) // current lit beat (0-indexed)

  const audioCtxRef      = useRef(null)
  const nextBeatTimeRef  = useRef(0)
  const beatIndexRef     = useRef(0)
  const schedulerRef     = useRef(null)
  const bpmRef           = useRef(bpm)
  const beatsRef         = useRef(beats)
  const tapTimesRef      = useRef([])

  useEffect(() => { bpmRef.current   = bpm   }, [bpm])
  useEffect(() => { beatsRef.current = beats }, [beats])

  function getCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  function playClick(time, accent) {
    const ctx  = getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type            = 'sine'
    osc.frequency.value = accent ? 1760 : 1100
    gain.gain.setValueAtTime(accent ? 0.9 : 0.55, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    osc.start(time)
    osc.stop(time + 0.04)
  }

  function schedule() {
    const ctx = getCtx()
    while (nextBeatTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      const idx    = beatIndexRef.current
      const accent = idx === 0
      playClick(nextBeatTimeRef.current, accent)

      // Schedule visual update to fire at the right audio time
      const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000)
      const capturedIdx = idx
      setTimeout(() => setBeat(capturedIdx), delay)

      nextBeatTimeRef.current += 60 / bpmRef.current
      beatIndexRef.current = (idx + 1) % beatsRef.current
    }
    schedulerRef.current = setTimeout(schedule, TICK_MS)
  }

  useEffect(() => {
    if (!playing) {
      clearTimeout(schedulerRef.current)
      setBeat(-1)
      return
    }
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    beatIndexRef.current   = 0
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    schedule()
    return () => clearTimeout(schedulerRef.current)
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // When beats changes mid-play, clamp current beat index
  useEffect(() => {
    beatIndexRef.current = 0
  }, [beats])

  function tapTempo() {
    const now  = Date.now()
    const taps = tapTimesRef.current
    // Discard taps older than 3s
    const recent = [...taps, now].filter(t => now - t < 3000)
    tapTimesRef.current = recent
    if (recent.length >= 2) {
      const intervals = recent.slice(1).map((t, i) => t - recent[i])
      const avg       = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const newBpm    = Math.round(60000 / avg)
      setBpm(Math.min(BPM_MAX, Math.max(BPM_MIN, newBpm)))
    }
  }

  function changeBpm(delta) {
    setBpm(b => Math.min(BPM_MAX, Math.max(BPM_MIN, b + delta)))
  }

  function tempoLabel(b) {
    if (b < 60)  return 'Largo'
    if (b < 72)  return 'Adagio'
    if (b < 88)  return 'Andante'
    if (b < 108) return 'Moderato'
    if (b < 132) return 'Allegro'
    if (b < 168) return 'Presto'
    return 'Prestissimo'
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Metronome</p>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Beat dots */}
        <div className={styles.beatRow}>
          {Array.from({ length: beats }, (_, i) => (
            <div
              key={i}
              className={`${styles.beatDot} ${beat === i ? (i === 0 ? styles.beatDotAccent : styles.beatDotActive) : ''}`}
            />
          ))}
        </div>

        {/* BPM display */}
        <div className={styles.bpmBlock}>
          <button className={styles.bpmAdj} onClick={() => changeBpm(-1)}>−</button>
          <div className={styles.bpmCenter}>
            <span className={styles.bpmValue}>{bpm}</span>
            <span className={styles.bpmUnit}>BPM</span>
            <span className={styles.tempoLabel}>{tempoLabel(bpm)}</span>
          </div>
          <button className={styles.bpmAdj} onClick={() => changeBpm(+1)}>+</button>
        </div>

        {/* BPM slider */}
        <input
          type="range"
          className={styles.bpmSlider}
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
        />

        {/* Controls row */}
        <div className={styles.controlsRow}>
          {/* Beats selector */}
          <div className={styles.beatsGroup}>
            <span className={styles.beatsLabel}>Beats</span>
            <div className={styles.beatsPills}>
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  className={`${styles.beatsPill} ${beats === n ? styles.beatsPillActive : ''}`}
                  onClick={() => setBeats(n)}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Tap tempo */}
          <button className={styles.tapBtn} onClick={tapTempo}>Tap</button>
        </div>

        {/* Play / Stop */}
        <button
          className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? '■ Stop' : '▶ Start'}
        </button>
      </div>
    </div>
  )
}
