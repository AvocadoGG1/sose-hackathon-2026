import { useState } from 'react'

// Items donated vs picked up per day, as grouped columns.
// data: [{ date: '2026-10-22', donated, pickedUp }] from GET /api/admin/trends.
// Colors come from --chart-donated / --chart-picked in Admin.css (validated for
// colorblind separation and contrast on the chart surface in both themes).

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 12, right: 8, bottom: 28, left: 36 }
const BAR_MAX = 18 // px, never fill the whole slot
const BAR_GAP = 2 // surface gap between a day's two bars

const SERIES = [
  { key: 'donated', label: 'Donated', className: 'bar-donated' },
  { key: 'pickedUp', label: 'Picked up', className: 'bar-picked' },
]

// '2026-10-22' -> "Oct 22", built from parts so the time zone can't shift the day
function shortDate(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// y-axis ticks on clean whole numbers: a 1/2/5 x 10^n step, 4 or 5 of them,
// whichever reaches max with the least wasted headroom (45 -> 0,10,...,50)
function niceTicks(max) {
  const best = [4, 5]
    .map((count) => {
      const raw = Math.max(max, 1) / count
      const magnitude = 10 ** Math.floor(Math.log10(raw))
      const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw))
      return { count, step, top: step * count }
    })
    .sort((a, b) => a.top - b.top)[0]
  return Array.from({ length: best.count + 1 }, (_, i) => i * best.step)
}

// column with a 4px rounded top and a square base
function barPath(x, y, w, h) {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function AdminTrendChart({ data }) {
  const [hover, setHover] = useState(null) // index of the hovered day

  const totals = Object.fromEntries(SERIES.map((s) => [s.key, data.reduce((sum, day) => sum + day[s.key], 0)]))
  if (data.length === 0 || (totals.donated === 0 && totals.pickedUp === 0)) {
    return <p className="admin-empty">No donations or pickups in the last {data.length || 14} days yet.</p>
  }

  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const ticks = niceTicks(Math.max(...data.flatMap((day) => [day.donated, day.pickedUp])))
  const top = ticks.at(-1)
  const y = (value) => PAD.top + plotH - (value / top) * plotH
  const slot = plotW / data.length
  const barW = Math.min(BAR_MAX, (slot * 0.7 - BAR_GAP) / 2)
  const labelEvery = data.length > 7 ? 2 : 1
  const hovered = hover != null ? data[hover] : null

  return (
    <div className="trend">
      <ul className="trend-legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <svg width="12" height="12" aria-hidden="true">
              <rect width="12" height="12" rx="3" className={s.className} />
            </svg>
            {s.label} <strong>{totals[s.key]}</strong>
          </li>
        ))}
      </ul>

      <div className="trend-plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Items donated and picked up per day, last ${data.length} days`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="trend-grid" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="trend-axis">
                {tick}
              </text>
            </g>
          ))}

          {data.map((day, i) => {
            const center = PAD.left + slot * i + slot / 2
            const left = center - barW - BAR_GAP / 2
            return (
              <g key={day.date}>
                <path d={barPath(left, y(day.donated), barW, y(0) - y(day.donated))} className="bar-donated" />
                <path d={barPath(center + BAR_GAP / 2, y(day.pickedUp), barW, y(0) - y(day.pickedUp))} className="bar-picked" />
                {i % labelEvery === (data.length - 1) % labelEvery && (
                  <text x={center} y={HEIGHT - 8} textAnchor="middle" className="trend-axis">
                    {shortDate(day.date)}
                  </text>
                )}
                {/* the whole day's column is the hover / focus target */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  className={hover === i ? 'trend-hit trend-hit-on' : 'trend-hit'}
                  tabIndex={0}
                  aria-label={`${shortDate(day.date)}: ${day.donated} donated, ${day.pickedUp} picked up`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>

        {hovered && (
          <div
            className="trend-tooltip"
            style={{ left: `${((PAD.left + slot * hover + slot / 2) / WIDTH) * 100}%` }}
            aria-hidden="true"
          >
            <strong>{shortDate(hovered.date)}</strong>
            <span>{hovered.donated} donated</span>
            <span>{hovered.pickedUp} picked up</span>
          </div>
        )}
      </div>

      <details className="trend-table">
        <summary>Show as a table</summary>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Day</th>
              <th className="num">Donated</th>
              <th className="num">Picked up</th>
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date}>
                <td>{shortDate(day.date)}</td>
                <td className="num">{day.donated}</td>
                <td className="num">{day.pickedUp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

export default AdminTrendChart
