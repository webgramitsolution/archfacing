import { cn } from '@/lib/utils'

/**
 * The "Leads Performance" chart from the BMF blueprint.
 *
 * A line over a soft fill, with a dot on each reading and a light grid behind
 * it. Drawn as one SVG from an array of numbers — no charting library for a
 * dozen points, and it renders on the server with nothing to hydrate.
 *
 * The viewBox is a fixed 0-100 grid and the svg is set to 100% width, so the
 * whole thing scales with its container without any measuring in JavaScript.
 */

export type Point = { label: string; value: number }

export function LineChart({
  points,
  height = 150,
  className,
}: {
  points: Point[]
  height?: number
  className?: string
}) {
  if (points.length === 0) {
    return (
      <p className={cn('py-10 text-center text-[12.5px] text-ink-3', className)}>
        Nothing to chart yet.
      </p>
    )
  }

  const values = points.map((p) => p.value)
  const rawMax = Math.max(...values)

  /*
   * The scale tops out at a multiple of four, because the axis is drawn with
   * five lines — four gaps — and any other ceiling labels them with halves.
   * A 10 scale reads 10 · 8 · 5 · 3 · 0, which is not a scale anyone would
   * write down. A flat series of zeroes still gets 4, so the axis has labels
   * and the line has somewhere to sit.
   */
  const niceMax = rawMax <= 0 ? 4 : Math.ceil(rawMax / 4) * 4

  // 0-100 in both directions; y is flipped so 0 sits at the bottom
  const x = (i: number) =>
    points.length === 1 ? 50 : (i / (points.length - 1)) * 100
  const y = (v: number) => 100 - (v / niceMax) * 100

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')
  const area = `0,100 ${line} 100,100`

  // four gridlines, evenly spaced, labelled with the value they stand for
  const ticks = [0, 1, 2, 3, 4].map((i) => ({
    at: (i / 4) * 100,
    value: Math.round(niceMax - (i / 4) * niceMax),
  }))

  // the labels under the axis — every point on a short series, thinned out on
  // a long one, so they never collide
  const step = Math.max(1, Math.ceil(points.length / 6))

  /*
   * A gradient is addressed by a document-wide id, so a fixed one would mean
   * two charts on the same page fighting over it. Deriving it from the series
   * keeps each chart's fill its own; two charts of identical data would share
   * an id, which is harmless because they would share the gradient too.
   *
   * Not `useId` — that is a hook, and this renders on the server.
   */
  const gradientId =
    'lc-' +
    Math.abs(
      points.reduce((h, p) => (h * 31 + p.label.charCodeAt(0) + p.value) | 0, 7)
    ).toString(36)

  return (
    <div className={className}>
      <div className="flex gap-2">
        {/* the value axis */}
        <ul
          className="tabular flex w-[22px] shrink-0 flex-col justify-between py-px text-right text-[10px] text-ink-4"
          style={{ height }}
          aria-hidden
        >
          {ticks.map((t) => (
            <li key={t.at} className="leading-none">
              {t.value}
            </li>
          ))}
        </ul>

        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Leads from ${points[0].label} to ${points[points.length - 1].label}, peaking at ${rawMax}`}
          >
            {/* gridlines */}
            {ticks.map((t) => (
              <line
                key={t.at}
                x1="0"
                x2="100"
                y1={t.at}
                y2={t.at}
                stroke="currentColor"
                strokeWidth="0.35"
                className="text-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2563EB" stopOpacity="0.22" />
                <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>

            <polygon points={area} fill={`url(#${gradientId})`} />
            <polyline
              points={line}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              // `preserveAspectRatio="none"` squashes the 0-100 box to fit
              // whatever width the panel has. Without this the stroke is
              // squashed with it and the line thins as the container widens.
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/*
            The dots are HTML, not SVG.

            Inside a non-uniformly scaled viewBox a <circle> is drawn as an
            ellipse — `vectorEffect` rescues the stroke width but not the
            geometry, so every reading came out as a flattened oval. Placed
            over the chart as absolutely positioned spans they are round at
            any width, and centring them on their own point means the first
            and last are not half-clipped by the edges either.
          */}
          {points.map((p, i) => (
            <span
              key={p.label + i}
              title={`${p.label}: ${p.value}`}
              className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-info bg-paper-2"
              style={{ left: `${x(i)}%`, top: `${y(p.value)}%` }}
            />
          ))}
        </div>
      </div>

      {/* the date axis — offset to start under the plot, not under the
          value column beside it */}
      <div className="mt-2 flex gap-2">
        <span className="w-[22px] shrink-0" aria-hidden />
        <ul className="flex min-w-0 flex-1 justify-between text-[10px] text-ink-4" aria-hidden>
          {points
            .map((p, i) => ({ ...p, i }))
            .filter((p) => p.i % step === 0 || p.i === points.length - 1)
            .map((p) => (
              <li key={p.label + p.i} className="whitespace-nowrap">
                {p.label}
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * The four totals under the chart in the blueprint.
 * Kept here because it only ever appears with the chart.
 */
export function ChartTotals({
  items,
}: {
  items: { label: string; value: string; note?: string }[]
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((t) => (
        <li key={t.label} className="rounded-lg border border-line px-3 py-2.5">
          <p className="text-[11px] text-ink-3">{t.label}</p>
          <p className="tabular mt-0.5 font-display text-[18px] font-bold leading-tight text-ink">
            {t.value}
          </p>
          {t.note && <p className="mt-0.5 text-[10.5px] text-ink-4">{t.note}</p>}
        </li>
      ))}
    </ul>
  )
}
