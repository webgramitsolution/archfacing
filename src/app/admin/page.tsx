import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { redirect } from 'next/navigation'
import { requireAdminShell } from '@/lib/guard'
import { can, type Permission } from '@/config/permissions'
import { formatINR } from '@/lib/utils'
import { Icon, type IconName } from '@/components/ui'
import { MultiLineChart, DonutChart, BarSpark } from '@/components/admin/charts'
import { IndiaChoropleth } from '@/components/admin/india-map'
import { TrendText, ago } from '@/components/admin/parts'
import {
  userStats, contentStats, roleDistribution, platformOverview,
  leadsPanel, revenuePanel, clubPanel, adsPanel, systemHealth,
  geoDistribution, topCategories, topCitiesByEnquiry, platformActivity,
  type StatMetric, type StatPanel, type Trend, type HealthRow,
  type RankedBar, type PlatformActivity, type ActivityKind,
} from '@/lib/admin-metrics'

export const metadata: Metadata = { title: 'Platform Overview' }
export const dynamic = 'force-dynamic'

/**
 * The Super-Admin "Platform Overview" — a dense, real-time command dashboard:
 * nine headline counters, three analytical charts, four business panels plus
 * system health, and a bottom band of recent activity, top categories, top
 * cities and quick actions. Every figure is a live database read.
 */

const TINT: Record<string, { bg: string; fg: string }> = {
  users: { bg: '#EEF1FF', fg: '#6366F1' },
  pro: { bg: '#F3EAFE', fg: '#8B5CF6' },
  corp: { bg: '#E7F7EE', fg: '#16A34A' },
  students: { bg: '#FEF2E2', fg: '#EA9412' },
  clients: { bg: '#E3F6F5', fg: '#0D9488' },
  PROJECT: { bg: '#E4EEFF', fg: '#2563EB' },
  PRODUCT: { bg: '#FFE9EC', fg: '#E11D48' },
  AROUND_US: { bg: '#E3F6F5', fg: '#0D9488' },
  ARTISTRY: { bg: '#F3EAFE', fg: '#8B5CF6' },
}

const TABS: { key: string; label: string; kind?: ActivityKind }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'Users', kind: 'user' },
  { key: 'project', label: 'Projects', kind: 'project' },
  { key: 'product', label: 'Products', kind: 'product' },
  { key: 'lead', label: 'Leads', kind: 'lead' },
  { key: 'membership', label: 'Memberships', kind: 'membership' },
  { key: 'ad', label: 'Advertisements', kind: 'ad' },
]

export default async function PlatformOverview({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const me = await requireAdminShell()
  // The overview shows platform revenue and every user count; staff without
  // Reports access start on the first module they do have.
  if (!can(me.role, 'admin:reports', me.permissions)) {
    const FIRST: [Permission, string][] = [
      ['admin:leads', '/admin/leads'], ['admin:users', '/admin/users'], ['admin:moderate', '/admin/moderation'],
      ['admin:pact', '/admin/pact'], ['admin:ads', '/admin/ads'], ['admin:support', '/admin/support'],
      ['admin:club', '/admin/club'], ['admin:payments', '/admin/payments'], ['admin:categories', '/admin/categories'],
      ['seller:merchandise', '/admin/seller'], ['seller:podcast', '/admin/seller/podcasts'], ['admin:employees', '/admin/employees'],
      ['admin:settings', '/admin/settings'], ['admin:plans', '/admin/plans'], ['admin:audit', '/admin/trust'],
    ]
    const to = FIRST.find(([p]) => can(me.role, p, me.permissions))
    redirect(to ? to[1] : '/dashboard')
  }
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]

  const [u, c, dist, growth, leads, revenue, club, ads, health, geo, cats, cities, activity] =
    await Promise.all([
      userStats(),
      contentStats(),
      roleDistribution(),
      platformOverview('monthly'),
      leadsPanel(),
      revenuePanel(),
      clubPanel(),
      adsPanel(),
      systemHealth(),
      geoDistribution(28),
      topCategories('PRODUCT', 20),
      topCitiesByEnquiry(20),
      platformActivity(6),
    ])

  const people = [u.totalUsers, u.professionals, u.corporatesBmfs, u.students, u.visitorsClients]
  const content = [c.projects, c.products, c.aroundUs, c.artistry]
  const feed = tab.kind ? activity.filter((a) => a.kind === tab.kind) : activity

  // Platform Growth — match the reference's 4 lines & colours exactly:
  // Users (blue), Professionals (purple), Products (orange), Projects (green).
  const GROWTH_COLORS: Record<string, string> = { Users: '#2563EB', Professionals: '#8B5CF6', Products: '#F97316', Projects: '#16A34A' }
  const growthSeries = (['Users', 'Professionals', 'Products', 'Projects'] as const).map((label) => ({
    label,
    color: GROWTH_COLORS[label],
    points: growth.series.find((s) => s.label === label)?.points ?? [],
  }))

  // Geographical list — top 8 states + an "Others" row (as the reference).
  const geoClean = geo.rows.filter((r) => r.label !== 'Others')
  const geoTop = geoClean.slice(0, 8)
  const geoRest = geoClean.slice(8).reduce((a, r) => a + r.value, 0)
  const geoListRows = geoRest > 0 ? [...geoTop, { label: 'Others', value: geoRest }] : geoTop
  const geoList = { rows: geoListRows, max: Math.max(1, ...geoListRows.map((r) => r.value)) }

  // Top Categories & Top Cities — top 9 + an "Others" row (as the reference).
  const withOthers = (data: { rows: RankedBar[] }, keep: number) => {
    const head = data.rows.slice(0, keep)
    const rest = data.rows.slice(keep).reduce((a, r) => a + r.value, 0)
    const rows = rest > 0 ? [...head, { label: 'Others', value: rest }] : head
    return { rows, max: Math.max(1, ...rows.map((r) => r.value)) }
  }
  const catsList = withOthers(cats, 9)
  const citiesList = withOthers(cities, 9)

  return (
    <div className="space-y-5">
      {/* ═══════════ header ═══════════ */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Platform Overview</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Real-time insights across users, content, business and marketplace activity.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/reports"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <Icon name="download" className="h-4 w-4" />
            Generate Report
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
          >
            <Icon name="settings" className="h-4 w-4 text-ink-4" />
            Customise
          </Link>
        </div>
      </div>

      {/* ═══════════ 9 headline counters ═══════════ */}
      <section className="rise rise-1 flex gap-3">
        <div className="grid grid-cols-5 gap-3" style={{ flex: 5 }}>
          {people.map((m) => <StatCard key={m.key} m={m} />)}
        </div>
        <div className="grid grid-cols-4 gap-3" style={{ flex: 4 }}>
          {content.map((m) => <StatCard key={m.key} m={m} />)}
        </div>
      </section>

      {/* ═══════════ charts ═══════════ */}
      <section className="rise rise-2 grid grid-cols-[1.5fr_1fr_1.15fr] gap-4">
        <Panel title="Platform Growth" subtitle="Last 12 months">
          <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
            {growthSeries.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5 text-[10.5px] text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <MultiLineChart labels={growth.labels} series={growthSeries} height={230} hideLegend />
        </Panel>

        <Panel title="User Distribution" subtitle="by role">
          <div className="pt-1">
            <DonutChart total={dist.total} slices={dist.slices} centerLabel="Total Users" stacked />
          </div>
        </Panel>

        <Panel title="Geographical Distribution" subtitle="users by state">
          <div className="flex items-start gap-2">
            <IndiaChoropleth states={geo.rows} max={geo.max} className="h-[172px] w-[150px]" />
            <div className="min-w-0 flex-1">
              <RankedBars data={geoList} color="#6366F1" />
            </div>
          </div>
        </Panel>
      </section>

      {/* ═══════════ business panels + system health ═══════════ */}
      <section className="rise rise-3 grid grid-cols-5 gap-4">
        <MidPanel title="Leads & Enquiries" href="/admin/leads" linkLabel="View all" panel={leads} color="#2563EB" />
        <MidPanel title="Revenue Overview" href="/admin/payments" linkLabel="View report" panel={revenue} color="#16A34A" money />
        <MidPanel title="Club Membership" href="/admin/club" linkLabel="Manage" panel={club} color="#8B5CF6" />
        <MidPanel title="Advertisements" href="/admin/ads" linkLabel="Manage" panel={ads} color="#F97316" />
        <HealthPanel rows={health} />
      </section>

      {/* ═══════════ activity · categories · cities · quick actions ═══════════ */}
      <section className="rise rise-4 grid grid-cols-[1.55fr_1.15fr_1.15fr_1.05fr] gap-4">
        {/* recent activity */}
        <Panel
          title="Recent Platform Activity"
          action={
            <Link href="/admin/user-activity" className="text-[11px] font-semibold text-brand hover:underline">
              View all ›
            </Link>
          }
        >
          <div className="-mx-1 mb-2 flex flex-wrap gap-0.5 border-b border-line pb-2">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === 'all' ? '/admin' : `/admin?tab=${t.key}`}
                className={
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ' +
                  (t.key === tab.key ? 'bg-brand-soft text-brand' : 'text-ink-3 hover:text-ink')
                }
              >
                {t.label}
              </Link>
            ))}
          </div>

          {feed.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-ink-3">No activity in this view yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {feed.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </ul>
          )}
        </Panel>

        {/* top categories */}
        <Panel title="Top Categories" subtitle="products">
          <RankedBars data={catsList} color="#2563EB" leadingIcon="box" iconTint={{ bg: '#EAF2FF', fg: '#2563EB' }} fill />
        </Panel>

        {/* top cities */}
        <Panel title="Top Cities" subtitle="by enquiries">
          <RankedBars data={citiesList} color="#16A34A" leadingIcon="map" iconTint={{ bg: '#E7F7EE', fg: '#16A34A' }} fill />
        </Panel>

        {/* quick actions */}
        <Panel title="Quick Actions">
          <div className="grid h-full grid-cols-4 content-between gap-1.5">
            {QUICK_ACTIONS.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="row-hover flex flex-col items-center gap-1 rounded-xl border border-line-soft px-0.5 py-2.5 text-center"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: q.tint.bg, color: q.tint.fg }}
                >
                  <Icon name={q.icon} className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-medium leading-[1.15] text-ink-2">{q.label}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Pieces
// ═══════════════════════════════════════════════════════════

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-display text-[13.5px] font-bold text-ink">
          {title}
          {subtitle && <span className="ml-1.5 text-[10.5px] font-normal text-ink-4">{subtitle}</span>}
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function StatCard({ m }: { m: StatMetric }) {
  const tint = TINT[m.key] ?? { bg: '#EEF1FF', fg: '#6366F1' }
  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint.bg, color: tint.fg }}
        >
          <Icon name={m.icon} className="h-[15px] w-[15px]" />
        </span>
        <span className="min-w-0 text-[10.5px] leading-[1.15] text-ink-3">{m.label}</span>
      </div>
      <p className="tabular mt-2.5 font-display text-[20px] font-bold leading-none tracking-tight text-ink">
        {m.value.toLocaleString('en-IN')}
      </p>
      <p className="mt-1.5 truncate text-[10px] text-ink-3">
        <TrendText trend={m.trend} /> this month
      </p>
    </>
  )
  const cls = 'rounded-card border border-line bg-white p-3 shadow-card'
  return m.href ? (
    <Link href={m.href} className={`${cls} card-hover block`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function MidPanel({
  title,
  href,
  linkLabel,
  panel,
  color,
  money = false,
}: {
  title: string
  href: string
  linkLabel: string
  panel: StatPanel
  color: string
  money?: boolean
}) {
  return (
    <section className="min-w-0 rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="font-display text-[13px] font-bold text-ink">{title}</h2>
        <Link href={href} className="shrink-0 text-[10.5px] font-semibold text-brand hover:underline">
          {linkLabel} ›
        </Link>
      </div>
      <p className="tabular font-display text-[22px] font-bold leading-none tracking-tight text-ink">
        {money ? formatINR(panel.total) : panel.total.toLocaleString('en-IN')}
      </p>
      <p className="mt-1 text-[10.5px] text-ink-3">
        <TrendText trend={panel.trend} /> vs last month
      </p>
      <div className="mt-2.5">
        <BarSpark points={panel.spark} color={color} height={34} />
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line-soft pt-2.5">
        {panel.breakdown.map((b) => (
          <li key={b.label} className="min-w-0">
            <span className="block truncate text-[9.5px] text-ink-4">{b.label}</span>
            <span className="tabular block truncate text-[11.5px] font-bold text-ink">
              {money ? formatINR(b.value) : b.value.toLocaleString('en-IN')}
              {b.pct > 0 && <span className="ml-1 text-[9.5px] font-normal text-ink-3">{b.pct}%</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function HealthPanel({ rows }: { rows: HealthRow[] }) {
  const badge: Record<HealthRow['tone'], string> = {
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    info: 'bg-info-soft text-info',
  }
  return (
    <section className="min-w-0 rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="font-display text-[13px] font-bold text-ink">System Health</h2>
        <Link href="/admin/settings" className="text-[10.5px] font-semibold text-brand hover:underline">
          Details ›
        </Link>
      </div>
      <ul className="space-y-2.5">
        {rows.map((h) => (
          <li key={h.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[11.5px] text-ink-2">
              <Icon name={HEALTH_ICON[h.label] ?? 'shield'} className="h-3.5 w-3.5 text-ink-4" />
              {h.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge[h.tone]}`}>
              {h.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RankedBars({
  data,
  color,
  numbered = false,
  leadingIcon,
  iconTint,
  fill = false,
}: {
  data: { rows: RankedBar[]; max: number }
  color: string
  numbered?: boolean
  leadingIcon?: IconName
  iconTint?: { bg: string; fg: string }
  fill?: boolean
}) {
  if (data.rows.length === 0) {
    return <p className="py-8 text-center text-[12px] text-ink-3">No data yet.</p>
  }
  const tint = iconTint ?? { bg: '#EEF1FF', fg: '#6366F1' }
  return (
    <ul className={fill ? 'flex h-full flex-col justify-between gap-1' : 'space-y-2'}>
      {data.rows.map((r, i) => (
        <li key={r.label} className="flex items-center gap-2">
          {leadingIcon ? (
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: tint.bg, color: tint.fg }}>
              <Icon name={leadingIcon} className="h-[11px] w-[11px]" />
            </span>
          ) : numbered ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-paper-2 text-[9px] font-bold text-ink-3">
              {i + 1}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[11px] text-ink-2">{r.label}</span>
          <span className="h-1.5 w-[40px] shrink-0 overflow-hidden rounded-full bg-paper-3">
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.value / data.max) * 100}%`, backgroundColor: color }}
            />
          </span>
          <span className="tabular w-9 shrink-0 text-right text-[11px] font-semibold text-ink">
            {r.value.toLocaleString('en-IN')}
          </span>
        </li>
      ))}
    </ul>
  )
}

const KIND_TINT: Record<ActivityKind, { bg: string; fg: string; icon: IconName }> = {
  user: { bg: '#EEF1FF', fg: '#6366F1', icon: 'user' },
  project: { bg: '#E4EEFF', fg: '#2563EB', icon: 'building' },
  product: { bg: '#FFE9EC', fg: '#E11D48', icon: 'box' },
  lead: { bg: '#E3F6F5', fg: '#0D9488', icon: 'inbox' },
  membership: { bg: '#F3EAFE', fg: '#8B5CF6', icon: 'award' },
  ad: { bg: '#FFEEE0', fg: '#F97316', icon: 'star' },
}

function ActivityRow({ a }: { a: PlatformActivity }) {
  const k = KIND_TINT[a.kind]
  const initial = a.name.replace(/^(ar|er|dr)\.?\s+/i, '')[0]?.toUpperCase() ?? '?'
  return (
    <li className="row-hover -mx-1 flex items-center gap-2 rounded-lg px-1 py-1.5">
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold" style={{ backgroundColor: k.bg, color: k.fg }}>
        {a.photo ? <Image src={a.photo} alt="" fill sizes="32px" className="object-cover" /> : initial}
      </span>
      <span className="min-w-0 flex-[0.85]">
        <span className="block truncate text-[12px] font-semibold text-ink">{a.name}</span>
        <span className="block truncate text-[10.5px] text-ink-4">{a.role}</span>
      </span>
      <span className="min-w-0 flex-[1.3]">
        <span className="block truncate text-[12px] text-ink-2">{a.action}</span>
        <span className="block truncate text-[10.5px] text-ink-4">{a.detail}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(a.at)}</span>
    </li>
  )
}

const HEALTH_ICON: Record<string, IconName> = {
  'Server Status': 'monitor',
  Database: 'grid',
  'Storage Usage': 'box',
  'Backup Status': 'download',
  'SSL Certificate': 'shield',
  'Queue Jobs': 'list',
}

const QUICK_ACTIONS: { label: string; icon: IconName; href: string; tint: { bg: string; fg: string } }[] = [
  { label: 'Add Employee', icon: 'user', href: '/admin/employees/add', tint: { bg: '#EEF1FF', fg: '#6366F1' } },
  { label: 'Add Professional', icon: 'user', href: '/admin/professionals/add', tint: { bg: '#E4EEFF', fg: '#2563EB' } },
  { label: 'Add Corporate', icon: 'building', href: '/admin/corporates/add', tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  { label: 'Add Project', icon: 'box', href: '/admin/projects/add', tint: { bg: '#FFE9EC', fg: '#E11D48' } },
  { label: 'Add Product', icon: 'bag', href: '/admin/products/add', tint: { bg: '#FFEEE0', fg: '#F97316' } },
  { label: 'Review Ads', icon: 'star', href: '/admin/ads', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  { label: 'Manage PACT Areas', icon: 'map', href: '/admin/pact', tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  { label: 'View Reports', icon: 'chart', href: '/admin/reports', tint: { bg: '#EEF1FF', fg: '#6366F1' } },
  { label: 'Manage Categories', icon: 'tag', href: '/admin/categories', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  { label: 'Newsletter', icon: 'mail', href: '/admin/newsletter', tint: { bg: '#E4EEFF', fg: '#2563EB' } },
  { label: 'System Settings', icon: 'settings', href: '/admin/settings', tint: { bg: '#F1F5F9', fg: '#64748B' } },
  { label: 'Support Tickets', icon: 'download', href: '/admin/support', tint: { bg: '#E7F7EE', fg: '#16A34A' } },
]
