import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import type { Trend } from '@/lib/admin-metrics'

/**
 * Shared presentational pieces for the admin section pages (Users & Roles,
 * Professionals, …). Plain server components — no client hooks — so every page
 * that follows the same blueprint renders identical cards, panels, trends and
 * pagination without copying markup.
 */

export type Tint = { bg: string; fg: string }

/** The minimalist page header every admin page opens with. */
export function AdminPageHead({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  // Heading only — the description line was removed from every admin/panel page
  // on request. `children` stays in the signature so callers compile unchanged.
  void children
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[24px] font-bold text-ink">{title}</h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/** A compact tinted stat, used in 4-across rows on section pages. */
export function MiniStat({
  icon,
  label,
  value,
  tint,
  hint,
}: {
  icon: IconName
  label: string
  value: number | string
  tint: Tint
  hint?: string
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 text-[12.5px] leading-tight text-ink-3">{label}</span>
      </div>
      <p className="tabular mt-3 truncate font-display text-[22px] font-bold leading-none text-ink">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      {hint && <p className="mt-1.5 truncate text-[11px] text-ink-3">{hint}</p>}
    </div>
  )
}

export function AdminStatCard({
  icon,
  label,
  value,
  trend,
  tint,
}: {
  icon: IconName
  label: string
  value: number
  trend: Trend
  tint: Tint
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 text-[12.5px] leading-tight text-ink-3">{label}</span>
      </div>
      <p className="tabular mt-3 font-display text-[24px] font-bold leading-none text-ink">
        {value.toLocaleString('en-IN')}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-3">
        <TrendText trend={trend} /> vs last 30 days
      </p>
    </div>
  )
}

export function TrendText({ trend }: { trend: Trend }) {
  // No previous window to compare against — a dash beats a fake "↑ 100%".
  if (!trend.hasBase) {
    return <span className="text-[10.5px] font-semibold text-ink-4">—</span>
  }
  const up = trend.direction === 'up'
  const flat = trend.direction === 'flat'
  const color = flat ? 'text-ink-4' : up ? 'text-ok' : 'text-danger'
  const arrow = flat ? '' : up ? '↑' : '↓'
  const abs = Math.abs(trend.pct)
  // A real spike off a tiny base (e.g. 1150%) reads as noise — show ×N instead.
  const label = abs >= 300 ? `${Math.round(abs / 100 + 1)}×` : `${abs}%`
  return <span className={`tabular font-semibold ${color}`}>{arrow} {label}</span>
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-card border border-line bg-white p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-[14px] font-bold text-ink">
          {title}
          {subtitle && <span className="ml-1.5 text-[11px] font-normal text-ink-4">({subtitle})</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ViewAll({ href, label = 'View All' }: { href?: string; label?: string }) {
  // Renders only with a real destination — the old default was "#".
  if (!href) return null
  return (
    <Link href={href} className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
      {label} ›
    </Link>
  )
}

export function Select({
  name,
  value,
  options,
}: {
  name: string
  value?: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? 'all'}
      className="h-9 rounded-lg border border-line bg-paper-2 px-3 text-[12.5px] text-ink-2 focus:border-brand focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Pagination({
  page,
  pages,
  makeHref,
  perPageLabel = '10 per page',
}: {
  page: number
  pages: number
  makeHref: (n: number) => string
  perPageLabel?: string
}) {
  const nums: number[] = []
  const from = Math.max(1, page - 2)
  const to = Math.min(pages, from + 4)
  for (let i = from; i <= to; i++) nums.push(i)

  return (
    <div className="flex items-center gap-1">
      <PageArrow href={page > 1 ? makeHref(page - 1) : undefined}>‹</PageArrow>
      {from > 1 && <span className="px-1 text-[11px] text-ink-4">1 …</span>}
      {nums.map((n) => (
        <Link
          key={n}
          href={makeHref(n)}
          aria-current={n === page ? 'page' : undefined}
          className={
            'tabular flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-medium ' +
            (n === page ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-3')
          }
        >
          {n}
        </Link>
      ))}
      {to < pages && <span className="px-1 text-[11px] text-ink-4">… {pages}</span>}
      <PageArrow href={page < pages ? makeHref(page + 1) : undefined}>›</PageArrow>
      <span className="ml-2 text-[11.5px] text-ink-3">
        {perPageLabel}
      </span>
    </div>
  )
}

function PageArrow({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) {
    return <span className="flex h-7 w-7 items-center justify-center rounded-md text-ink-4 opacity-40">{children}</span>
  }
  return (
    <Link href={href} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-2 hover:bg-paper-3">
      {children}
    </Link>
  )
}

export function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function fmtTime(d: Date): string {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
export function ago(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}
