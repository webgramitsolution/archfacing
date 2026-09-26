import Link from 'next/link'
import Image from 'next/image'
import { Icon, type IconName } from '@/components/ui'
import { compactCount, type PlatformReach } from '@/lib/platform-reach'
import { cn } from '@/lib/utils'
import type { Delta } from '@/lib/advertiser'

/**
 * The pieces of the My Advertisements page, as the blueprint draws it.
 *
 * Kept out of the page file because each one is a shape with its own rules —
 * a chart with axes, a map with hotspots — and a page that inlined all of
 * them would be unreadable.
 */

// ═══════════════════════════════════════════════════════════
//  Masthead — the big CTA
// ═══════════════════════════════════════════════════════════

export function CreateAdButton() {
  return (
    <Link
      href="/dashboard/advertisements/create"
      className="flex shrink-0 items-center gap-2.5 rounded-card bg-brand px-4 py-2.5 text-white transition-colors hover:bg-brand-hover"
    >
      <Icon name="plus" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 text-left">
        <span className="block text-[13.5px] font-bold leading-tight">Create Advertisement</span>
        <span className="block text-[10.5px] leading-tight text-white/80">Turn your ideas into visibility</span>
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  The hero band
// ═══════════════════════════════════════════════════════════

/** ArchFacing's own banner artwork, served from the ImageKit CDN. */
const HERO_PHOTO =
  'https://ik.imagekit.io/archfacing/around%20us%20banner%201.png?updatedAt=1784753557073'

/**
 * The reach band. The two counts are REAL — passed in from platformReach()
 * — because an advertiser reads them while deciding whether to buy. They were
 * previously hardcoded as "500K+" and "120K+", which nothing produced.
 */
function heroProof(reach: PlatformReach): { icon: IconName; value: string; label: string }[] {
  return [
    { icon: 'shield', value: compactCount(reach.professionals), label: 'Active Professionals' },
    {
      icon: 'eye',
      value: reach.impressions > 0 ? compactCount(reach.impressions) : '—',
      label: 'Impressions Served',
    },
    { icon: 'target', value: 'Targeted', label: 'By Category & PIN' },
    { icon: 'award', value: 'A&D Focused', label: 'One Industry' },
  ]
}

/**
 * The band across the top of the advertiser's home.
 *
 * The artwork covers the whole band with NO overlay of any kind — no gradient,
 * no scrim. That is possible because the type is kept off the bright half:
 * measured on this picture, the left 60% carries 0.2% of pixels above a
 * luminance of 150 (the left 45%, none at all), against a mean of 43. White
 * type there clears comfortably, so nothing has to be laid over the building
 * to make it work.
 *
 * The right 40% is therefore deliberately empty. Anything written into it —
 * including the pull-quote an earlier version had — lands on the lit facade
 * and breaks. If copy is ever added there, the measurement has to be redone.
 *
 * The four figures are ArchFacing's own reach, not this advertiser's: platform
 * copy, which is why they sit beside the sales line rather than among the
 * statistic tiles below, where the reader's own numbers live.
 */
export function AdvertiserHero({ reach }: { reach: PlatformReach }) {
  const HERO_PROOF = heroProof(reach)
  return (
    <section className="relative isolate mb-5 overflow-hidden rounded-card bg-navy">
      <Image
        src={HERO_PHOTO}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />

      {/*
        One layout at every width — the tablet gets the desktop arrangement,
        not a cut-down one. `md:w-[60%]` is the whole trick: it holds the copy
        off the building at any size, so the picture never has to be dimmed.
      */}
      <div className="px-6 py-7 md:w-[60%]">
        <p className="font-display text-[19px] font-bold leading-tight text-white/85">
          Grow Your Brand
        </p>
        <p className="font-display text-[22px] font-bold leading-tight text-white">
          Where Design Meets Opportunity
        </p>
        {/*
          Balanced, so the sentence sets as lines of about the same length
          instead of a full line followed by a short orphan. The hard break
          that used to be in the source is gone with it — a manual break is a
          guess about one width, and this block is 60% of whatever the
          viewport is.
        */}
        <p className="mt-2.5 text-balance text-[12px] leading-relaxed text-white/75">
          Reach Architects, Designers, Builders, Clients and Industry Professionals across
          India with targeted advertising.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-4">
          {HERO_PROOF.map((p) => (
            <li key={p.label} className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white">
                <Icon name={p.icon} className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold leading-tight text-white">
                  {p.value}
                </span>
                <span className="block text-[9.5px] leading-tight text-white/65">{p.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Statistic tiles — icon above, delta beside the number
// ═══════════════════════════════════════════════════════════

const TILE_TONE = {
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  violet: 'bg-[#F5F3FF] text-[#7C3AED]',
  sky: 'bg-[#ECFEFF] text-[#0891B2]',
} as const

export type OverviewTile = {
  icon: IconName
  label: string
  value: string
  tone: keyof typeof TILE_TONE
  delta: Delta
}

export function OverviewTiles({ tiles }: { tiles: OverviewTile[] }) {
  return (
    <section
      className="mb-5 grid gap-2.5"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(146px, 1fr))' }}
    >
      {tiles.map((t) => (
        <div key={t.label} className="card flex flex-col p-3.5">
          <span
            className={cn(
              'mb-3 flex h-10 w-10 items-center justify-center rounded-card',
              TILE_TONE[t.tone]
            )}
          >
            <Icon name={t.icon} className="h-[18px] w-[18px]" />
          </span>

          <span className="block truncate text-[12px] font-medium text-ink-3">{t.label}</span>

          <span className="mt-1 flex flex-wrap items-baseline gap-1.5">
            <span className="tabular font-display text-[21px] font-bold leading-none text-ink">
              {t.value}
            </span>
            {t.delta && (
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  t.delta.direction === 'up' ? 'text-ok'
                  : t.delta.direction === 'down' ? 'text-danger'
                  : 'text-ink-4'
                )}
              >
                {t.delta.direction === 'up' ? '↑' : t.delta.direction === 'down' ? '↓' : '→'}{' '}
                {t.delta.text}
              </span>
            )}
          </span>

          {t.delta && (
            <span className="mt-0.5 block text-[10px] text-ink-4">vs last month</span>
          )}
        </div>
      ))}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Campaign performance — an area chart with real axes
// ═══════════════════════════════════════════════════════════

export type SeriesPoint = { at: Date; impressions: number; clicks: number; leads: number }

/**
 * Thirty days of three series.
 *
 * Drawn as SVG paths rather than with a charting library: three lines over a
 * fixed window is a handful of coordinates, and a dependency here would put a
 * chart runtime into a page that is otherwise entirely server-rendered.
 *
 * The y-axis is scaled to the largest value across all three series and
 * rounded up to a clean step, so the gridline labels are readable numbers
 * rather than whatever the data happened to peak at.
 */
export function PerformanceChart({ series }: { series: SeriesPoint[] }) {
  const W = 640
  const H = 210
  const PAD = { top: 8, right: 8, bottom: 22, left: 38 }

  const peak = Math.max(
    1,
    ...series.map((s) => Math.max(s.impressions, s.clicks, s.leads))
  )

  // A clean ceiling: 1, 2 or 5 times a power of ten above the peak.
  const magnitude = 10 ** Math.floor(Math.log10(peak))
  const ceiling =
    peak / magnitude <= 2 ? 2 * magnitude : peak / magnitude <= 5 ? 5 * magnitude : 10 * magnitude

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x = (i: number) => PAD.left + (i / Math.max(1, series.length - 1)) * innerW
  const y = (v: number) => PAD.top + innerH - (v / ceiling) * innerH

  const path = (key: 'impressions' | 'clicks' | 'leads') =>
    series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(s[key]).toFixed(1)}`).join(' ')

  const area = (key: 'impressions' | 'clicks' | 'leads') =>
    `${path(key)} L ${x(series.length - 1).toFixed(1)} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(ceiling * f))

  const label = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}K` : String(n)

  const LINES = [
    { key: 'impressions' as const, colour: '#F97316', fill: 'url(#fillImpressions)' },
    { key: 'clicks' as const, colour: '#2563EB', fill: 'url(#fillClicks)' },
    { key: 'leads' as const, colour: '#16A34A', fill: 'url(#fillLeads)' },
  ]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Campaign performance over the last 30 days">
        <defs>
          <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16A34A" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines and the y scale */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#EEF1F5"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#94A3B8">
              {label(t)}
            </text>
          </g>
        ))}

        {LINES.map((l) => (
          <g key={l.key}>
            <path d={area(l.key)} fill={l.fill} />
            <path
              d={path(l.key)}
              fill="none"
              stroke={l.colour}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* the x scale — first, middle and last day only, so it stays readable */}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) =>
          series[i] ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
              fontSize="9"
              fill="#94A3B8"
            >
              {series[i].at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </text>
          ) : null
        )}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-5 text-[11.5px] text-ink-3">
        <Legend colour="#F97316" label="Impressions" />
        <Legend colour="#2563EB" label="Clicks" />
        <Legend colour="#16A34A" label="Leads" />
      </div>
    </div>
  )
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: colour }} />
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Audience reach — the map
// ═══════════════════════════════════════════════════════════

/**
 * Where the campaigns are aimed, on a map of India.
 *
 * The outline is a deliberately simplified silhouette — enough for a reader to
 * recognise the country and place a dot, not a survey boundary. It carries no
 * disputed-border claim: it is a decorative locator, and the figures beside it
 * are the actual answer.
 */
const INDIA =
  'M36 8 L44 6 L52 10 L58 8 L64 14 L62 22 L68 26 L74 24 L78 30 L74 38 L78 44 ' +
  'L74 52 L66 58 L62 68 L56 80 L50 94 L46 108 L42 118 L38 108 L34 96 L28 86 ' +
  'L22 76 L18 64 L14 52 L10 42 L14 34 L20 30 L24 22 L28 14 Z'

/** Approximate positions of the cities the rail can name, on that silhouette. */
const CITY_AT: Record<string, [number, number]> = {
  'Delhi NCR': [33, 33],
  Delhi: [33, 33],
  Gurugram: [32, 34],
  Mumbai: [24, 72],
  Pune: [27, 77],
  Bengaluru: [34, 96],
  Hyderabad: [38, 82],
  Chennai: [42, 98],
  Kolkata: [59, 58],
  Ahmedabad: [22, 58],
  Jaipur: [28, 42],
}

export function AudienceMap({
  rows,
}: {
  rows: { name: string; percent: number }[]
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 92 126"
        className="h-[120px] w-[88px] shrink-0"
        role="img"
        aria-label="Map of India showing where the audience is"
      >
        <path d={INDIA} fill="#FFF1E6" stroke="#FED7AA" strokeWidth="1.2" strokeLinejoin="round" />

        {rows.map((r) => {
          const at = CITY_AT[r.name]
          if (!at) return null
          // The dot grows with the share, so the map says the same thing as
          // the list beside it rather than merely decorating it.
          const radius = 2 + Math.min(4, r.percent / 8)
          return (
            <g key={r.name}>
              <circle cx={at[0]} cy={at[1]} r={radius + 2.5} fill="#F97316" opacity="0.18" />
              <circle cx={at[0]} cy={at[1]} r={radius} fill="#F97316" />
            </g>
          )
        })}
      </svg>

      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[11.5px] font-semibold text-ink">Top Locations</p>
        {rows.length === 0 ? (
          <p className="text-[12px] text-ink-3">
            No campaign has location targeting set yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-2 text-[11.5px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.name}</span>
                <span className="tabular shrink-0 font-semibold text-ink">{r.percent}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  The bar that closes the page
// ═══════════════════════════════════════════════════════════

const HELP_LINKS: { icon: IconName; title: string; sub: string; href: string }[] = [
  { icon: 'help', title: 'Talk to Our Team', sub: 'Get expert consultation', href: '/legal/contact' },
  { icon: 'download', title: 'Download Media Kit', sub: 'Formats, Guidelines, Specs', href: '/advertisements' },
  { icon: 'box', title: 'Explore Packages', sub: 'Find the right plan', href: '/advertisements' },
]

export function HelpBar() {
  return (
    <section className="card mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
      <div className="min-w-[14rem] flex-1">
        <p className="font-display text-[15px] font-bold text-ink">
          Need Help with Advertising?
        </p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          Our team is here to help you plan the right campaign for your business goals.
        </p>
      </div>

      {HELP_LINKS.map((h) => (
        <Link
          key={h.title}
          href={h.href}
          className="group flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-paper-3 text-ink-2 transition-colors group-hover:bg-brand-soft group-hover:text-brand">
            <Icon name={h.icon} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-ink transition-colors group-hover:text-brand">
              {h.title}
            </span>
            <span className="block truncate text-[11px] text-ink-3">{h.sub}</span>
          </span>
        </Link>
      ))}

      <Link href="/legal/contact" className="btn-primary shrink-0 gap-2 px-5">
        Contact Sales
        <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </section>
  )
}
