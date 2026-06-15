import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTakes } from '../hooks/useTakes'
import styles from './Page.module.css'
import pStyles from './ProgressFeedback.module.css'
import { playAnalyzeStart, playToggle, playTick } from '../utils/sounds'

function scoreColor(n) {
  if (n >= 88) return '#8fbe9f'
  if (n >= 74) return 'var(--gold)'
  return 'var(--coral)'
}

const TECHNIQUE_DIMS = [
  { key: 'timing',       label: 'Timing',       keys: ['timing', 'rhythm'] },
  { key: 'intonation',   label: 'Intonation',   keys: ['intonation'] },
  { key: 'dynamics',     label: 'Dynamics',      keys: ['dynamics'] },
  { key: 'articulation', label: 'Articulation',  keys: ['articulation'] },
  { key: 'technique',    label: 'Technique',     keys: ['technique', 'posture'] },
  { key: 'tone',         label: 'Tone',          keys: ['tone', 'phrasing', 'expression'] },
]

function computeTechniqueScores(takes) {
  const scoredTakes = takes.filter(t => t.score != null && t.flags?.length > 0)
  if (scoredTakes.length === 0) return null
  const avgScore = Math.round(scoredTakes.reduce((s, t) => s + t.score, 0) / scoredTakes.length)
  return TECHNIQUE_DIMS.map(dim => {
    const allFlags = scoredTakes.flatMap(t =>
      (t.flags ?? []).filter(f => dim.keys.includes((f.type ?? '').toLowerCase()))
    )
    const flagWeight = allFlags.reduce((s, f) => s + (f.confidence ?? 80) / 100, 0)
    const deduction = Math.round(flagWeight * 8)
    const bonus = allFlags.length === 0 ? 5 : 0
    const score = Math.max(20, Math.min(100, avgScore - deduction + bonus))
    return { ...dim, score, flagCount: allFlags.length }
  })
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function filterTakesByPeriod(takes, period) {
  const now = new Date()
  const cutoff = new Date(now)
  if (period === 'weekly') {
    cutoff.setDate(now.getDate() - 7)
  } else {
    cutoff.setDate(now.getDate() - 30)
  }
  return takes.filter(t => {
    const d = new Date(t.created_at || t.date || 0)
    return d >= cutoff
  })
}

function computeStats(takes) {
  const scored = takes.filter(t => t.score != null)
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length)
    : null
  const totalFlags = takes.reduce((s, t) => s + (t.flags?.length ?? 0), 0)
  const pieces = [...new Set(takes.map(t => t.piece_title).filter(Boolean))]
  return { avgScore, totalFlags, pieces }
}

export default function ProgressFeedback() {
  const nav = useNavigate()
  const [period, setPeriod]   = useState('weekly')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const graphWrapRef = useRef(null)

  const allTakes = useTakes() ?? []

  // Auto-regenerate when period changes if feedback was already shown
  const [prevPeriod, setPrevPeriod] = useState(period)
  useEffect(() => {
    if (period === prevPeriod) return
    setPrevPeriod(period)
    setError(null)
    if (feedback) {
      setFeedback(null)
      generateFeedback()
    } else {
      setFeedback(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const takes = filterTakesByPeriod(allTakes, period)
  const { avgScore, totalFlags, pieces } = computeStats(takes)
  const periodLabel = period === 'weekly' ? 'week' : 'month'
  const techniqueScores = useMemo(() => computeTechniqueScores(takes), [takes])

  const chartPoints = useMemo(() => {
    const scoredTakes = [...takes]
      .filter(t => t.score != null)
      .sort((a, b) => new Date(a.created_at || a.date || 0) - new Date(b.created_at || b.date || 0))
    
    if (scoredTakes.length === 0) return []
    
    if (scoredTakes.length === 1) {
      const singleTake = scoredTakes[0]
      const baselineTime = new Date(new Date(singleTake.created_at || singleTake.date || Date.now()).getTime() - 3 * 86400000).toISOString()
      return [
        {
          id: 'baseline',
          piece_title: 'Baseline',
          score: Math.max(50, singleTake.score - 7),
          created_at: baselineTime,
          isBaseline: true
        },
        singleTake
      ]
    }
    
    return scoredTakes
  }, [takes])

  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    const el = graphWrapRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const roundedWidth = Math.round(entry.contentRect.width)
        if (roundedWidth) {
          setContainerWidth((prev) => (prev === roundedWidth ? prev : roundedWidth))
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [takes.length > 0])

  const width = Math.max(200, containerWidth)
  const height = 180
  const paddingLeft = 45
  const paddingRight = 25
  const paddingTop = 20
  const paddingBottom = 30
  const xRange = width - paddingLeft - paddingRight
  const yRange = height - paddingTop - paddingBottom

  const points = useMemo(() => {
    if (chartPoints.length < 2) return []
    return chartPoints.map((p, idx) => {
      const x = paddingLeft + (idx / (chartPoints.length - 1)) * xRange
      const y = paddingTop + (1 - (p.score ?? 70) / 100) * yRange
      return { x, y, ...p }
    })
  }, [chartPoints, xRange, yRange])

  const linePath = useMemo(() => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    return `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
  }, [points, linePath])

  async function generateFeedback() {
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('progress-feedback', {
        body: { period, takes },
      })
      if (fnErr) throw new Error(fnErr.message ?? String(fnErr))
      if (data?.error) throw new Error(data.error)
      setFeedback(data.feedback)
    } catch {
      setError('Could not generate feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} ${pStyles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={pStyles.pageTitle}>Progress</h1>
          <p className={pStyles.pageSubtitle}>Track your technique across sessions</p>
        </div>
        <div className={pStyles.periodToggle}>
          <button
            className={`${pStyles.toggleBtn} ${period === 'weekly' ? pStyles.toggleBtnActive : ''}`}
            onClick={() => { playToggle(true); setPeriod('weekly') }}
          >
            This week
          </button>
          <button
            className={`${pStyles.toggleBtn} ${period === 'monthly' ? pStyles.toggleBtnActive : ''}`}
            onClick={() => { playToggle(true); setPeriod('monthly') }}
          >
            This month
          </button>
        </div>
      </div>

      {/* Premium Glassmorphic Stats Cards Grid */}
      <div className={pStyles.metricGrid}>
        {/* Sessions Card */}
        <div className={pStyles.metricCard}>
          <span className={pStyles.cardLabel}>Practice Sessions</span>
          <div className={pStyles.cardValue}>
            {takes.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-faint)', fontWeight: 400, fontFamily: 'sans-serif', marginLeft: 4 }}>takes</span>
          </div>
          <span className={pStyles.cardSubtext}>Recorded this {periodLabel}</span>
        </div>

        {/* Avg Score Card */}
        <div className={pStyles.metricCard}>
          <span className={pStyles.cardLabel}>Average Score</span>
          <div className={pStyles.cardValue} style={avgScore != null ? { color: scoreColor(avgScore) } : {}}>
            {avgScore != null ? `${avgScore}` : '—'}<span style={{ fontSize: '0.9rem', color: 'var(--text-faint)', fontWeight: 400, fontFamily: 'sans-serif', marginLeft: 2 }}>/100</span>
          </div>
          {avgScore != null ? (
            <>
              <div className={pStyles.cardProgressTrack}>
                <div className={pStyles.cardProgressFill} style={{ width: `${avgScore}%`, background: scoreColor(avgScore) }} />
              </div>
              <span className={pStyles.cardSubtext}>Across all scored sessions</span>
            </>
          ) : (
            <span className={pStyles.cardSubtext}>No scored takes yet</span>
          )}
        </div>

        {/* Active Pieces Card */}
        <div className={pStyles.metricCard}>
          <span className={pStyles.cardLabel}>Active Pieces</span>
          <div className={pStyles.cardValue}>
            {pieces.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-faint)', fontWeight: 400, fontFamily: 'sans-serif', marginLeft: 4 }}>{pieces.length === 1 ? 'piece' : 'pieces'}</span>
          </div>
          <span className={pStyles.cardSubtext} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {pieces.length > 0 ? pieces.join(', ') : 'No pieces recorded'}
          </span>
        </div>

        {/* Total Flags Card */}
        <div className={pStyles.metricCard}>
          <span className={pStyles.cardLabel}>Flags Raised</span>
          <div className={pStyles.cardValue} style={totalFlags > 0 ? { color: 'var(--coral)' } : {}}>
            {totalFlags} <span style={{ fontSize: '0.9rem', color: 'var(--text-faint)', fontWeight: 400, fontFamily: 'sans-serif', marginLeft: 4 }}>flags</span>
          </div>
          <span className={pStyles.cardSubtext}>Technique spots to watch</span>
        </div>
      </div>

      {/* Visual Technique Score Progress Graph Panel */}
      {takes.length > 0 && (
        <div className={pStyles.graphPanel}>
          <div className={pStyles.graphHeader}>
            <div>
              <h3 className={pStyles.graphTitle}>Technique Score Progression</h3>
              <p className={pStyles.graphSubtitle}>Visualization of your playing metrics over time</p>
            </div>
            {avgScore != null && (
              <span className={pStyles.graphTitle} style={{ color: scoreColor(avgScore), fontWeight: 700 }}>
                Avg: {avgScore}/100
              </span>
            )}
          </div>
          
          <div id="progress-graph-wrap" ref={graphWrapRef} className={pStyles.graphWrap}>
            {points.length >= 2 ? (
              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines and values */}
                {[50, 75, 100].map(val => {
                  const y = paddingTop + (1 - val / 100) * yRange
                  return (
                    <g key={val}>
                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className={pStyles.gridLine} />
                      <text x={paddingLeft - 10} y={y + 3} textAnchor="end" className={pStyles.axisLabel}>
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Shaded area under chart */}
                <path d={areaPath} className={pStyles.graphArea} />

                {/* Chart path stroke */}
                <path d={linePath} className={pStyles.graphLine} />

                {/* Interactive milestone circles & score/title labels */}
                {points.map((p, idx) => {
                  const titleStr = p.piece_title || 'Untitled'
                  const displayTitle = p.isBaseline ? 'Baseline' : (titleStr.length > 15 ? titleStr.slice(0, 14) + '…' : titleStr)
                  return (
                    <g
                      key={idx}
                      className={pStyles.graphNodeGroup}
                      onClick={() => {
                        if (!p.isBaseline && p.id) {
                          playTick()
                          nav(`/analysis?takeId=${p.id}`)
                        }
                      }}
                      style={{ cursor: p.isBaseline ? 'default' : 'pointer' }}
                    >
                      {/* Larger transparent hover target for premium feel */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="18"
                        fill="rgba(0,0,0,0)"
                        style={{ pointerEvents: 'all' }}
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        className={pStyles.graphNode}
                      />
                      <text
                        x={p.x}
                        y={p.y - 25}
                        className={pStyles.nodeTitleLabel}
                      >
                        {displayTitle}
                      </text>
                      <text
                        x={p.x}
                        y={p.y - 12}
                        className={pStyles.nodeLabel}
                      >
                        Score: {p.score}
                      </text>
                    </g>
                  )
                })}

                {/* X-axis labels (Dates) */}
                {points.map((p, idx) => {
                  const label = p.isBaseline ? 'Baseline' : formatDate(p.created_at || p.date)
                  return (
                    <text
                      key={idx}
                      x={p.x}
                      y={height - 8}
                      textAnchor="middle"
                      className={pStyles.axisLabel}
                    >
                      {label}
                    </text>
                  )
                })}
              </svg>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                Not enough practice sessions to plot progress. Record more takes!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-column dashboard layout */}
      <div className={pStyles.dashboardGrid}>
        
        {/* Left Column: Sessions List */}
        <div className={pStyles.leftCol}>
          <div className={styles.section} style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
              <span className={styles.sectionHeaderTitle} style={{ fontSize: '0.92rem', letterSpacing: '0.02em' }}>
                Practice History ({takes.length} Session{takes.length !== 1 ? 's' : ''})
              </span>
              <button className={styles.sectionHeaderAction} onClick={() => { playTick(); nav('/takes') }}>
                View all →
              </button>
            </div>

            {takes.length === 0 ? (
              <div className={styles.emptyState} style={{ flex: 1, minHeight: 220, justifyContent: 'center' }}>
                <p className={styles.emptyStateTitle}>No sessions this {periodLabel}</p>
                <p className={styles.emptyStateSub}>
                  Upload a practice recording to start tracking your progress.
                </p>
                <button className={styles.primaryBtn} onClick={() => nav('/record')} style={{ marginTop: 12 }}>
                  Upload a recording →
                </button>
              </div>
            ) : (
              <div className={pStyles.sessionTable}>
                {takes.map((t, i) => (
                  <div key={t.id || i} className={pStyles.sessionRow}>
                    <div className={pStyles.sessionInfo}>
                      <span className={pStyles.sessionPiece}>{t.piece_title || 'Untitled'}</span>
                      <span className={pStyles.sessionMeta}>
                        {[t.piece_composer, t.instrument, formatDate(t.created_at || t.date)].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <div className={pStyles.sessionRight}>
                      {t.score != null && (
                        <span className={pStyles.sessionScore} style={{ color: scoreColor(t.score), fontWeight: 600 }}>
                          {t.score}
                        </span>
                      )}
                      {t.flags?.length > 0 && (
                        <span className={pStyles.sessionFlags} style={{ background: 'rgba(225,134,118,0.12)', color: 'var(--coral)', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                          {t.flags.length} flag{t.flags.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Technique progress bars + AI insights */}
        <div className={pStyles.rightCol}>

          {/* Technique Progress Bars */}
          {techniqueScores && (
            <div className={pStyles.techCard}>
              <p className={pStyles.techCardTitle}>Technique Breakdown</p>
              <div className={pStyles.techBars}>
                {techniqueScores.map(dim => (
                  <div key={dim.key} className={pStyles.techBarRow}>
                    <span className={pStyles.techBarLabel}>{dim.label}</span>
                    <div className={pStyles.techBarTrack}>
                      <div
                        className={pStyles.techBarFill}
                        style={{ width: `${dim.score}%`, background: scoreColor(dim.score) }}
                      />
                    </div>
                    <span className={pStyles.techBarScore} style={{ color: scoreColor(dim.score) }}>
                      {dim.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorBanner} style={{ marginBottom: 20 }}>
              <span>⚠</span>
              <span>{error}</span>
              <button className={styles.errorRetry} onClick={generateFeedback}>Retry</button>
            </div>
          )}

          {loading && (
            <div className={pStyles.insightsPanelLoading}>
              <div className={pStyles.loaderPulse} />
              <h3 className={pStyles.insightsTitle}>Generating practice report...</h3>
              <p className={pStyles.insightsDesc}>
                Mediant is auditing your technique markers, dynamic variations, and tempo stability across all {takes.length} takes to outline your practice strategy.
              </p>
            </div>
          )}

          {!loading && !feedback && takes.length > 0 && (
            <div className={pStyles.insightsPanelEmpty}>
              <div className={pStyles.insightsIcon}>✦</div>
              <h3 className={pStyles.insightsTitle}>{period === 'weekly' ? 'Weekly' : 'Monthly'} Practice Report</h3>
              <p className={pStyles.insightsDesc}>
                Unlock customized AI recommendations and detailed progress analytics. Mediant will synthesize your practice history to chart your strengths and goals.
              </p>
              <button
                className={styles.primaryBtn}
                onClick={() => { playAnalyzeStart(); generateFeedback() }}
                style={{ width: '100%', marginTop: 8 }}
              >
                Generate report
              </button>
            </div>
          )}

          {!loading && feedback && (
            <div className={pStyles.feedbackCard}>
              <div className={pStyles.feedbackCardHeader}>
                <p className={styles.label}>{period === 'weekly' ? 'Weekly' : 'Monthly'} Practice Report</p>
                <button
                  className={styles.ghostBtn}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={generateFeedback}
                >
                  Regenerate
                </button>
              </div>

              <h2 className={pStyles.feedbackHeadline}>{feedback.headline}</h2>
              <p className={pStyles.feedbackOverview}>{feedback.overview}</p>

              {feedback.strengths?.length > 0 && (
                <div className={pStyles.feedbackSection}>
                  <p className={pStyles.feedbackSectionTitle}>
                    <span className={pStyles.iconGreen}>✓</span> Strengths & Wins
                  </p>
                  <ul className={pStyles.feedbackList}>
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.patterns?.length > 0 && (
                <div className={pStyles.feedbackSection}>
                  <p className={pStyles.feedbackSectionTitle}>
                    <span className={pStyles.iconGold}>↺</span> Technique Patterns to Watch
                  </p>
                  <ul className={pStyles.feedbackList}>
                    {feedback.patterns.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.nextSteps?.length > 0 && (
                <div className={pStyles.feedbackSection}>
                  <p className={pStyles.feedbackSectionTitle}>
                    <span className={pStyles.iconBlue}>→</span> Goals for Next {periodLabel === 'week' ? 'Week' : 'Month'}
                  </p>
                  <ul className={pStyles.feedbackList}>
                    {feedback.nextSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
