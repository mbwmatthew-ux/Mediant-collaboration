import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTakes } from '../hooks/useTakes'
import styles from './ProgressFeedback.module.css'
import { playPop } from '../utils/sounds'

const SKILL_DIMS = [
  { key: 'intonation',   label: 'Intonation',   keys: ['intonation'],                         color: 'var(--accent)' },
  { key: 'timing',       label: 'Rhythm',        keys: ['timing', 'rhythm'],                   color: '#7b8fEE' },
  { key: 'dynamics',     label: 'Dynamics',      keys: ['dynamics'],                            color: '#C09230' },
  { key: 'articulation', label: 'Articulation',  keys: ['articulation'],                        color: 'var(--coral)' },
  { key: 'technique',    label: 'Technique',     keys: ['technique', 'posture'],                color: 'var(--mint)' },
  { key: 'tone',         label: 'Tone',          keys: ['tone', 'phrasing', 'expression'],     color: '#aa8fEE' },
]

function scoreColor(n) {
  if (n == null) return 'var(--text-faint)'
  if (n >= 88) return 'var(--mint)'
  if (n >= 74) return 'var(--accent)'
  return 'var(--coral)'
}

function computeSkillScores(takes) {
  const scoredTakes = takes.filter(t => t.score != null)
  if (!scoredTakes.length) return null
  const avg = Math.round(scoredTakes.reduce((s, t) => s + t.score, 0) / scoredTakes.length)
  return SKILL_DIMS.map(dim => {
    const allFlags = scoredTakes.flatMap(t =>
      (t.flags ?? []).filter(f => dim.keys.includes((f.type ?? '').toLowerCase()))
    )
    const flagWeight = allFlags.reduce((s, f) => s + (f.confidence ?? 80) / 100, 0)
    const deduction = Math.round(flagWeight * 8)
    const bonus = allFlags.length === 0 ? 5 : 0
    const score = Math.max(20, Math.min(100, avg - deduction + bonus))
    return { ...dim, score, flagCount: allFlags.length }
  })
}

function getMonthLabel(monthsAgo) {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toLocaleDateString('en-US', { month: 'short' })
}

/* Build 6-month trend data per skill */
function buildMonthlyTrend(takes, skillDim) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const end   = new Date(d.getFullYear(), d.getMonth() - i + 1, 0)
    const monthTakes = takes.filter(t => {
      const td = new Date(t.created_at || '')
      return td >= start && td <= end && t.score != null
    })
    let score = null
    if (monthTakes.length > 0) {
      const avg = Math.round(monthTakes.reduce((s, t) => s + t.score, 0) / monthTakes.length)
      const allFlags = monthTakes.flatMap(t =>
        (t.flags ?? []).filter(f => skillDim.keys.includes((f.type ?? '').toLowerCase()))
      )
      const flagWeight = allFlags.reduce((s, f) => s + (f.confidence ?? 80) / 100, 0)
      const deduction = Math.round(flagWeight * 8)
      const bonus = allFlags.length === 0 ? 5 : 0
      score = Math.max(20, Math.min(100, avg - deduction + bonus))
    }
    months.push({ label: getMonthLabel(i), score })
  }
  return months
}

export default function ProgressFeedback() {
  const nav = useNavigate()
  const allTakes = useTakes() ?? []
  const [period, setPeriod] = useState('6mo')

  const filteredTakes = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now)
    if (period === '1mo')  cutoff.setMonth(now.getMonth() - 1)
    else if (period === '3mo')  cutoff.setMonth(now.getMonth() - 3)
    else cutoff.setMonth(now.getMonth() - 6)
    return allTakes.filter(t => new Date(t.created_at || '') >= cutoff)
  }, [allTakes, period])

  const skillScores  = useMemo(() => computeSkillScores(filteredTakes), [filteredTakes])
  const allScores    = useMemo(() => computeSkillScores(allTakes), [allTakes])

  /* Deltas: compare recent half vs earlier half */
  const deltas = useMemo(() => {
    if (!skillScores) return {}
    const result = {}
    SKILL_DIMS.forEach((dim, i) => {
      const recent  = computeSkillScores(filteredTakes.slice(0, Math.ceil(filteredTakes.length / 2)))
      const earlier = computeSkillScores(filteredTakes.slice(Math.ceil(filteredTakes.length / 2)))
      if (recent && earlier) {
        result[dim.key] = (recent[i]?.score ?? 0) - (earlier[i]?.score ?? 0)
      }
    })
    return result
  }, [filteredTakes, skillScores])

  /* Monthly trend data for all skills */
  const monthlyTrends = useMemo(() => {
    return SKILL_DIMS.map(dim => ({
      ...dim,
      months: buildMonthlyTrend(allTakes, dim),
    }))
  }, [allTakes])

  const loading = allTakes.length === 0

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>Progress Reports</h1>
          <p className={styles.pageSubtitle}>Skill growth · last 6 months</p>
        </div>
        <div className={styles.periodToggle}>
          {['1mo', '3mo', '6mo'].map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === '1mo' ? '1M' : p === '3mo' ? '3M' : '6M'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 skill summary tiles ── */}
      <div className={styles.skillTiles}>
        {(allScores ?? SKILL_DIMS.map(d => ({ ...d, score: null }))).slice(0, 4).map((dim, i) => {
          const delta = deltas[dim.key] ?? null
          return (
            <div key={dim.key} className={styles.skillTile}>
              <span className={styles.skillTileLabel}>{dim.label.toUpperCase()}</span>
              <div className={styles.skillTileBottom}>
                <span className={styles.skillTileValue} style={{ color: scoreColor(dim.score) }}>
                  {dim.score != null ? `${dim.score}%` : '—'}
                </span>
                {delta != null && (
                  <span className={styles.skillTileDelta}
                    style={{ color: delta >= 0 ? 'var(--mint)' : 'var(--coral)' }}>
                    {delta >= 0 ? `↑ +${delta}` : `↓ ${delta}`}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Monthly skill trends ── */}
      <div className={styles.trendsSection}>
        <h2 className={styles.trendsSectionTitle}>Monthly skill trend</h2>

        {loading ? (
          <div className={styles.emptyState}>
            Upload recordings to see your skill trends over time.
          </div>
        ) : (
          <div className={styles.trendList}>
            {monthlyTrends.map(dim => {
              const hasData = dim.months.some(m => m.score != null)
              const first   = dim.months.find(m => m.score != null)?.score
              const last    = [...dim.months].reverse().find(m => m.score != null)?.score
              return (
                <div key={dim.key} className={styles.trendDim}>
                  <div className={styles.trendDimHeader}>
                    <span className={styles.trendDimLabel}>{dim.label}</span>
                    {hasData && first != null && last != null && (
                      <span className={styles.trendDimRange}>
                        {first}% → {last}%
                      </span>
                    )}
                  </div>
                  <div className={styles.trendBars}>
                    {dim.months.map((m, i) => (
                      <div key={i} className={styles.trendBarCol}>
                        <div className={styles.trendBarWrap}>
                          {m.score != null ? (
                            <div
                              className={styles.trendBar}
                              style={{
                                height: `${m.score}%`,
                                background: dim.color,
                                opacity: 0.55 + (i / dim.months.length) * 0.45,
                              }}
                              title={`${m.label}: ${m.score}%`}
                            />
                          ) : (
                            <div className={styles.trendBarEmpty} />
                          )}
                        </div>
                        <span className={styles.trendBarLabel}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Session score history ── */}
      {filteredTakes.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyHeader}>
            <h2 className={styles.historySectionTitle}>Session history</h2>
            <button className={styles.viewAllBtn} onClick={() => { playPop(); nav('/takes') }}>
              View all →
            </button>
          </div>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Piece</th>
                <th>Score</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {filteredTakes.slice(0, 8).map((t, i) => {
                const d = new Date(t.created_at || '')
                const dateLabel = isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <tr key={t.id ?? i} className={styles.historyRow}
                    onClick={() => { playPop(); nav('/analysis') }}>
                    <td className={styles.historyDate}>{dateLabel}</td>
                    <td className={styles.historyPiece}>
                      {t.piece_title || 'Untitled'}
                      {t.piece_composer ? <span className={styles.historyComposer}> · {t.piece_composer}</span> : ''}
                    </td>
                    <td className={styles.historyScore} style={{ color: scoreColor(t.score) }}>
                      {t.score ?? '—'}
                    </td>
                    <td className={styles.historyFlags}>{t.flags?.length ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
