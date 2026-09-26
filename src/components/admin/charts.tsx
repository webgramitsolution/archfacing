import type { DonutSlice, LineSeries } from '@/lib/admin-metrics'

/**
 * Dashboard charts as plain inline SVG — no charting library, no client
 * JavaScript. Everything the reference draws (a multi-series line chart, a
 * role donut, a revenue sparkline, ranked bars) is a handful of `<path>`s
 * computed from real numbers on the server.
 */

// ─────────────────────────────────────────────────────────────
//  Multi-line chart — the Platform Overview
// ─────────────────────────────────────────────────────────────

export function MultiLineChart({
  labels,
  series,
  height = 260,
  hideLegend = false,
}: {
  labels: string[]
  series: LineSeries[]
  height?: number
  /** The Platform Overview renders its own legend above the chart. */
  hideLegend?: boolean
}) {
  const W = 720
  const H = height
  const padL = 34
  const padR = 12
  const padT = 12
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const n = labels.length
  const max = Math.max(1, ...series.flatMap((s) => s.points))
  // A rounded ceiling so the gridlines land on tidy numbers.
  const ceil = niceCeil(max)

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / ceil) * innerH

  const gridLines = 4
  const allZero = series.every((s) => s.points.every((p) => p === 0))

  return (
    <div className="min-w-0">
      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Platform activity over time"
        >
          {/* horizontal gridlines + y labels */}
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const gv = (ceil / gridLines) * i
            const gy = y(gv)
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="#E5E7EB" strokeWidth={1} />
                <text x={padL - 6} y={gy + 3} textAnchor="end" className="fill-ink-4" fontSize={9}>
                  {formatTick(gv)}
                </text>
              </g>
            )
          })}

          {/* x labels */}
          {labels.map((l, i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-4" fontSize={9}>
              {l}
            </text>
          ))}

          {/* series lines */}
          {!allZero &&
            series.map((s) => (
              <g key={s.label}>
                <path
                  d={linePath(s.points.map((v, i) => [x(i), y(v)]))}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.points.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={2.4} fill={s.color} />
                ))}
              </g>
            ))}

          {allZero && (
            <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-ink-4" fontSize={12}>
              No activity in this window yet
            </text>
          )}
        </svg>
      </div>

      {/* legend */}
      {!hideLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Donut — user distribution by role
// ─────────────────────────────────────────────────────────────

export function DonutChart({
  total,
  slices,
  centerLabel = 'Total Users',
  showCounts = false,
  stacked = false,
}: {
  total: number
  slices: DonutSlice[]
  centerLabel?: string
  /** Show the raw count between the label and the percentage. */
  showCounts?: boolean
  /**
   * Ring on top, legend full-width below — for the narrow three-across panels.
   * No responsive breakpoints are used anywhere here: the admin canvas is one
   * fixed desktop layout scaled by zoom, so a `sm:`/`md:` switch would make a
   * phone reflow this chart while the rest of the page stayed put.
   */
  stacked?: boolean
}) {
  const size = stacked ? 148 : 160
  const stroke = 24
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r

  // A small gap between segments gives the reference's modern segmented look.
  const GAP = Math.min(5, circ * 0.014)
  let offset = 0
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0
    const len = frac * circ
    const dash = Math.max(0.6, len - GAP)
    const arc = { ...s, dash, offset }
    offset += len
    return arc
  })

  return (
    <div className={stacked ? 'flex flex-col items-center gap-4' : 'flex flex-row items-center gap-5'}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF1F5" strokeWidth={stroke} />
          {total > 0 &&
            arcs.map((a) => (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${a.dash} ${circ - a.dash}`}
                strokeDashoffset={-a.offset}
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-[22px] font-bold leading-none text-ink">
            {total.toLocaleString('en-IN')}
          </span>
          <span className="mt-1 text-[10.5px] text-ink-4">{centerLabel}</span>
        </div>
      </div>

      <ul className={stacked ? 'w-full space-y-1.5' : 'min-w-0 flex-1 space-y-2'}>
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0
          return (
            <li key={s.label} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
              {showCounts && (
                <span className="tabular shrink-0 text-ink-3">{s.value.toLocaleString('en-IN')}</span>
              )}
              <span className="tabular w-11 shrink-0 text-right font-semibold text-ink">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Area sparkline — revenue over time
// ─────────────────────────────────────────────────────────────

export function AreaSpark({
  points,
  labels,
  color = '#8B5CF6',
  height = 96,
}: {
  points: number[]
  labels?: string[]
  color?: string
  height?: number
}) {
  const W = 320
  const H = height
  const padB = labels ? 16 : 4
  const innerH = H - 6 - padB
  const n = points.length
  const max = Math.max(1, ...points)
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v: number) => 4 + innerH - (v / max) * innerH

  const pts = points.map((v, i) => [x(i), y(v)] as [number, number])
  const line = linePath(pts)
  const area = `${line} L ${x(n - 1)} ${innerH + 4} L ${x(0)} ${innerH + 4} Z`
  const gid = `spark-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {labels &&
        labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" className="fill-ink-4" fontSize={8.5}>
            {l}
          </text>
        ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Bar spark — the little 12-month bar strip in the mid panels
// ─────────────────────────────────────────────────────────────

export function BarSpark({
  points,
  color = '#2563EB',
  height = 40,
}: {
  points: number[]
  color?: string
  height?: number
}) {
  const n = Math.max(1, points.length)
  const max = Math.max(1, ...points)
  const gap = 0.18 // fraction of each slot left as gap
  const slot = 100 / n
  const bw = slot * (1 - gap)

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="12-month trend">
      {points.map((p, i) => {
        const h = Math.max(1.5, (p / max) * (height - 2))
        return (
          <rect
            key={i}
            x={i * slot + slot * gap * 0.5}
            y={height - h}
            width={bw}
            height={h}
            rx={0.8}
            fill={color}
            opacity={i === n - 1 ? 1 : 0.55}
          />
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Area trend — a single filled series with axes (registration trend)
// ─────────────────────────────────────────────────────────────

export function AreaTrendChart({
  labels,
  points,
  color = '#6366F1',
  height = 240,
  everyNthLabel = 1,
}: {
  labels: string[]
  points: number[]
  color?: string
  height?: number
  /** Show only every Nth x-label when there are many buckets. */
  everyNthLabel?: number
}) {
  const W = 720
  const H = height
  const padL = 34
  const padR = 12
  const padT = 12
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const n = points.length
  const max = Math.max(1, ...points)
  const ceil = niceCeil(max)
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / ceil) * innerH

  const pts = points.map((v, i) => [x(i), y(v)] as [number, number])
  const line = linePath(pts)
  const area = `${line} L ${x(n - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`
  const gid = `area-${color.replace('#', '')}`
  const grid = 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Registration trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {Array.from({ length: grid + 1 }).map((_, i) => {
        const gv = (ceil / grid) * i
        const gy = y(gv)
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padL - 6} y={gy + 3} textAnchor="end" className="fill-ink-4" fontSize={9}>
              {formatTick(gv)}
            </text>
          </g>
        )
      })}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2} fill={color} />
      ))}

      {labels.map((l, i) =>
        i % everyNthLabel === 0 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-4" fontSize={9}>
            {l}
          </text>
        ) : null
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function linePath(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
}

function niceCeil(max: number): number {
  if (max <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) {
    const c = s * pow
    if (c >= max) return c
  }
  return 10 * pow
}

function formatTick(v: number): string {
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`
  return String(Math.round(v))
}
