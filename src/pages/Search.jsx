import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Page.module.css'

const PIECES = [
  { id:  1, instrument: 'Piano',  era: 'Romantic',  difficulty: 'Advanced',     title: 'Clair de Lune',             composer: 'Claude Debussy',        key: 'D♭ major', time: '9/8',  scoreReady: true  },
  { id:  2, instrument: 'Piano',  era: 'Baroque',   difficulty: 'Intermediate', title: 'Invention No. 8',           composer: 'J.S. Bach',             key: 'F major',  time: '3/4',  scoreReady: true  },
  { id:  3, instrument: 'Voice',  era: 'Classical', difficulty: 'Beginner',     title: 'Caro Mio Ben',              composer: 'Tommaso Giordani',      key: 'G major',  time: '4/4',  scoreReady: true  },
  { id:  4, instrument: 'Piano',  era: 'Romantic',  difficulty: 'Advanced',     title: 'Moonlight Sonata',          composer: 'Ludwig van Beethoven',  key: 'C♯ minor', time: '4/4',  scoreReady: true  },
  { id:  5, instrument: 'Violin', era: 'Baroque',   difficulty: 'Advanced',     title: 'Partita No. 2 in D minor',  composer: 'J.S. Bach',             key: 'D minor',  time: '4/4',  scoreReady: false },
  { id:  6, instrument: 'Piano',  era: 'Modern',    difficulty: 'Beginner',     title: 'Gymnopédie No. 1',          composer: 'Erik Satie',            key: 'G major',  time: '3/4',  scoreReady: true  },
  { id:  7, instrument: 'Piano',  era: 'Classical', difficulty: 'Intermediate', title: 'Sonata K. 331',             composer: 'Wolfgang A. Mozart',    key: 'A major',  time: '6/8',  scoreReady: false },
  { id:  8, instrument: 'Violin', era: 'Romantic',  difficulty: 'Intermediate', title: 'Meditation from Thaïs',     composer: 'Jules Massenet',        key: 'D major',  time: '4/4',  scoreReady: true  },
  { id:  9, instrument: 'Piano',  era: 'Romantic',  difficulty: 'Advanced',     title: 'Ballade No. 1',             composer: 'Frédéric Chopin',       key: 'G minor',  time: '6/4',  scoreReady: true  },
  { id: 10, instrument: 'Voice',  era: 'Classical', difficulty: 'Intermediate', title: 'Nessun Dorma',              composer: 'Giacomo Puccini',       key: 'B♭ major', time: '4/4',  scoreReady: false },
  { id: 11, instrument: 'Piano',  era: 'Baroque',   difficulty: 'Beginner',     title: 'Minuet in G',               composer: 'J.S. Bach',             key: 'G major',  time: '3/4',  scoreReady: true  },
  { id: 12, instrument: 'Violin', era: 'Modern',    difficulty: 'Advanced',     title: 'Violin Sonata No. 1',       composer: 'Béla Bartók',           key: 'Atonal',   time: '4/4',  scoreReady: false },
]

const INSTRUMENT_FILTERS = ['All', 'Piano', 'Voice', 'Violin']
const ERA_FILTERS         = ['All eras', 'Baroque', 'Classical', 'Romantic', 'Modern']
const DIFFICULTY_FILTERS  = ['Any level', 'Beginner', 'Intermediate', 'Advanced']
const difficultyColor     = { Beginner: 'green', Intermediate: 'gold', Advanced: 'coral' }

export default function Search() {
  const nav = useNavigate()
  const [query, setQuery]         = useState('')
  const [instrument, setInstrument] = useState('All')
  const [era, setEra]             = useState('All eras')
  const [difficulty, setDifficulty] = useState('Any level')

  const results = PIECES.filter(p => {
    if (query) {
      const q = query.toLowerCase()
      if (!p.title.toLowerCase().includes(q) &&
          !p.composer.toLowerCase().includes(q) &&
          !p.instrument.toLowerCase().includes(q)) return false
    }
    if (instrument !== 'All' && p.instrument !== instrument) return false
    if (era !== 'All eras' && p.era !== era) return false
    if (difficulty !== 'Any level' && p.difficulty !== difficulty) return false
    return true
  })

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Music Library</h1>
          <p className={styles.sub}>{PIECES.length} pieces available with score matching</p>
        </div>
      </div>

      {/* Search + filter toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by title, composer, or instrument…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className={styles.toolbarFilters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Instrument</span>
            <div className={styles.filterStrip}>
              {INSTRUMENT_FILTERS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterChip} ${instrument === f ? styles.filterChipActive : ''}`}
                  onClick={() => setInstrument(f)}
                >{f}</button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Era</span>
            <div className={styles.filterStrip}>
              {ERA_FILTERS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterChip} ${era === f ? styles.filterChipActive : ''}`}
                  onClick={() => setEra(f)}
                >{f}</button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Level</span>
            <div className={styles.filterStrip}>
              {DIFFICULTY_FILTERS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterChip} ${difficulty === f ? styles.filterChipActive : ''}`}
                  onClick={() => setDifficulty(f)}
                >{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeaderTitle}>
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {results.length === 0 ? (
        <p className={styles.emptyState}>No pieces match your filters.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Composer</th>
                <th className={styles.th}>Instrument</th>
                <th className={styles.th}>Era</th>
                <th className={styles.th}>Level</th>
                <th className={styles.th}>Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id} className={styles.tableRow} onClick={() => nav('/record')}>
                  <td className={styles.td}>{p.title}</td>
                  <td className={styles.tdSoft}>{p.composer}</td>
                  <td className={styles.tdSoft}>{p.instrument}</td>
                  <td className={styles.tdSoft}>{p.era}</td>
                  <td className={styles.td}>
                    <span className={`${styles.diffBadge} ${styles[difficultyColor[p.difficulty]]}`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {p.scoreReady
                      ? <span className={styles.scoreReadyBadge}>Ready</span>
                      : <span className={styles.tdMuted}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
