import { useRef, useState } from 'react'
import styles from './UploadPieceModal.module.css'

// BACKEND DISABLED — file is accepted locally; AI analysis + Supabase storage
// will be wired in once migrations and edge functions are deployed.

const ACCEPTED   = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_MB     = 20
const INSTRUMENTS = ['Piano', 'Violin', 'Cello', 'Viola', 'Guitar', 'Flute', 'Clarinet', 'Trumpet', 'Saxophone', 'Oboe', 'Horn', 'Harp', 'Other']
const ERAS        = ['Baroque', 'Classical', 'Romantic', 'Modern']
const LEVELS      = ['Beginner', 'Intermediate', 'Advanced']

const EMPTY = { title: '', composer: '', instrument: 'Piano', era: 'Romantic', difficulty: 'Intermediate', key: '', time: '' }

export default function UploadPieceModal({ onClose, onAdded }) {
  const inputRef = useRef(null)
  const [file,   setFile]   = useState(null)
  const [drag,   setDrag]   = useState(false)
  const [form,   setForm]   = useState(EMPTY)
  const [error,  setError]  = useState(null)

  function pickFile(f) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) { setError('Please upload a PNG, JPG, WEBP, or PDF file.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File must be under ${MAX_MB} MB.`); return }
    setError(null)
    setFile(f)
    if (!form.title) {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setForm(prev => ({ ...prev, title: name }))
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    pickFile(e.dataTransfer.files[0])
  }

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleAdd() {
    if (!file)        { setError('Please select a file first.'); return }
    if (!form.title.trim()) { setError('Please enter a title.'); return }

    onAdded({
      id:         `upload-${Date.now()}`,
      ...form,
      title:      form.title.trim(),
      composer:   form.composer.trim() || 'Unknown',
      key:        form.key.trim()      || '—',
      time:       form.time.trim()     || '—',
      userUploaded: true,
    })
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add a piece</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={styles.modalSub}>
          Upload your sheet music and fill in the details — it'll appear in your library instantly.
        </p>

        {/* Drop zone */}
        <div
          className={`${styles.dropzone} ${drag ? styles.dropzoneDrag : ''} ${file ? styles.dropzoneFilled : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            style={{ display: 'none' }}
            onChange={e => pickFile(e.target.files[0])}
          />
          {file ? (
            <>
              <span className={styles.dzIcon}>✓</span>
              <strong className={styles.dzFileName}>{file.name}</strong>
              <span className={styles.dzHint}>Click to change</span>
            </>
          ) : (
            <>
              <span className={styles.dzIcon}>♩</span>
              <strong className={styles.dzLabel}>Drop your sheet music here</strong>
              <span className={styles.dzHint}>PNG, JPG, WEBP, or PDF · up to {MAX_MB} MB</span>
            </>
          )}
        </div>

        {/* Details form */}
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} value={form.title} onChange={set('title')} placeholder="e.g. Clair de Lune" />
          </div>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Composer</label>
            <input className={styles.formInput} value={form.composer} onChange={set('composer')} placeholder="e.g. Claude Debussy" />
          </div>
          <div className={styles.formRowGroup}>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Instrument</label>
              <select className={styles.formSelect} value={form.instrument} onChange={set('instrument')}>
                {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Era</label>
              <select className={styles.formSelect} value={form.era} onChange={set('era')}>
                {ERAS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Level</label>
              <select className={styles.formSelect} value={form.difficulty} onChange={set('difficulty')}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formRowGroup}>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Key</label>
              <input className={styles.formInput} value={form.key} onChange={set('key')} placeholder="e.g. D♭ major" />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>Time</label>
              <input className={styles.formInput} value={form.time} onChange={set('time')} placeholder="e.g. 4/4" />
            </div>
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.uploadBtn} onClick={handleAdd} disabled={!file}>
            Add to library
          </button>
        </div>

      </div>
    </div>
  )
}
