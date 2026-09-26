import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════
//  Section card — the white panel every block on the page sits in
// ═══════════════════════════════════════════════════════════

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: { label: string; href: string }
  children: React.ReactNode
  className?: string
}) {
  /*
   * `min-w-0` is what stops the page scrolling sideways on a phone.
   *
   * A panel is always a grid or flex child, and such a child defaults to
   * `min-width: auto` — it refuses to shrink below its own min-content. The
   * rows inside use `truncate`, which is `white-space: nowrap`, so their
   * min-content is the full untruncated string. Without it the track
   * stretched to fit the longest enquiry subject and took 76px of a 375px
   * viewport with it, the ellipsis never appearing because there was nothing
   * left to clip against.
   */
  return (
    <section className={cn('min-w-0 rounded-xl border border-line bg-paper-2', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
        <h2 className="font-display text-[14.5px] font-bold text-ink">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-brand hover:gap-1.5"
          >
            {action.label}
            <Icon name="arrow" className="h-3 w-3 transition-all" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Stat tile
// ═══════════════════════════════════════════════════════════

const TILE_TONES: Record<string, string> = {
  brand: 'bg-brand-soft text-brand',
  info: 'bg-info-soft text-info',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
}

export function StatTile({
  icon,
  label,
  value,
  tone = 'brand',
  note,
}: {
  icon: IconName
  label: string
  value: string
  tone?: keyof typeof TILE_TONES
  /**
   * The line under the number. The blueprint shows a month-on-month delta
   * here; this platform keeps no historical snapshots yet, so a caller passes
   * something it can actually stand behind, or nothing at all.
   */
  note?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-2 p-2.5 sm:p-3 xl:p-4">
      <span className={cn('chip-icon mb-2 h-7 w-7 xl:mb-3 xl:h-9 xl:w-9', TILE_TONES[tone])}>
        <Icon name={icon} className="h-[15px] w-[15px] xl:h-[17px] xl:w-[17px]" />
      </span>
      <p className="text-[10.5px] leading-snug text-ink-3 xl:text-[12px]">{label}</p>
      <p className="tabular mt-0.5 font-display text-[18px] font-bold leading-tight text-ink xl:text-[24px]">
        {value}
      </p>
      {/* the caption needs room the six-across row has only from xl */}
      {note && <p className="mt-1 hidden text-[11.5px] leading-snug text-ink-4 xl:block">{note}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Donut — the status breakdown in the blueprint
// ═══════════════════════════════════════════════════════════

export type Slice = { label: string; value: number; color: string }

/**
 * A ring chart drawn with one SVG circle per slice.
 *
 * `stroke-dasharray` plus a running `stroke-dashoffset` walks each slice round
 * the circumference — no charting library for four numbers, and it renders on
 * the server with no hydration at all.
 */
export function Donut({
  slices,
  total,
  caption,
  size = 132,
}: {
  slices: Slice[]
  total: number
  caption: string
  size?: number
}) {
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  let walked = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-paper-3"
        />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-walked}
              />
            )
            walked += len
            return el
          })}
      </svg>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-[22px] font-bold leading-none text-ink">
          {total}
        </span>
        <span className="mt-1 text-[10.5px] leading-tight text-ink-3">{caption}</span>
      </span>
    </div>
  )
}

export function DonutLegend({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center gap-2.5 text-[12.5px]">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
          <span className="tabular shrink-0 font-semibold text-ink">{s.value}</span>
          <span className="tabular w-11 shrink-0 text-right text-ink-4">
            {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '0%'}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════
//  Right-rail card
// ═══════════════════════════════════════════════════════════

export function RailCard({
  title,
  action,
  tone = 'plain',
  children,
}: {
  title: string
  action?: React.ReactNode
  /**
   * `info` gives the card the pale blue ground the reference uses on Profile
   * Strength — the one card in the rail that is a prompt rather than a
   * report, so it is the one that is tinted.
   */
  tone?: 'plain' | 'info'
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-4',
        tone === 'info'
          ? 'border-info/20 bg-info-soft'
          : 'border-line bg-paper-2'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-[13.5px] font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** The ring in "Profile Strength". */
export function Gauge({ percent, size = 62 }: { percent: number; size?: number }) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * c

  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke="currentColor" className="text-paper-3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke="currentColor" className="text-brand" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`} />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-[13px] font-bold text-ink">
        {percent}%
      </span>
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Formatters and small rows every overview needs
// ═══════════════════════════════════════════════════════════

/** SENT_BACK → "Sent back". */
export function pretty(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * The enum values that are names rather than words. Sentence-casing them the
 * way `pretty` does turns BMF into "Bmf" and DESIGNI into "Designi", which is
 * nobody's name for them.
 */
const NAMES: Record<string, string> = {
  BMF: 'BMF',
  DESIGNA: 'DESIGNA',
  DESIGNI: 'DESIGNI',
}

export const label = (s: string): string => NAMES[s] ?? pretty(s)

export function ago(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Hours as a person would say them. */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}

/** "+4 vs last month", or nothing at all in the first month of use. */
export function monthNote(thisMonth: number, lastMonth: number): string | undefined {
  if (lastMonth === 0) return undefined
  const d = thisMonth - lastMonth
  if (d === 0) return 'Level with last month'
  return `${d > 0 ? '+' : ''}${d} vs last month`
}

/**
 * One of the facts under the greeting — a bare outline glyph in its own
 * colour, not an icon inside a tinted square. The chip version reads as a row
 * of buttons and pulls attention off the values beside it.
 */
export function BannerMeta({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconName
  tone: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} className={`mt-px h-[16px] w-[16px] shrink-0 ${tone}`} />
      <span className="min-w-0">
        <dt className="text-[10.5px] leading-tight text-ink-3">{label}</dt>
        <dd className="tabular mt-px whitespace-nowrap text-[12px] font-semibold leading-tight text-ink">
          {value}
        </dd>
      </span>
    </div>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-[12.5px] leading-relaxed text-ink-3">
      {children}
    </p>
  )
}
