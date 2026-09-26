import type { Metadata } from 'next'
import Link from 'next/link'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { MultiLineChart } from '@/components/admin/charts'
import { Panel, ViewAll, Select, Pagination, ago } from '@/components/admin/parts'
import { activityOverview, listActivity, deviceIcon, type ActivityRow } from '@/lib/admin-user-activity'

export const metadata: Metadata = { title: 'User Activity' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; q?: string; page?: string }

const STATUS_PILL: Record<string, string> = {
  SUCCESS: 'bg-ok-soft text-ok',
  FAILED: 'bg-danger-soft text-danger',
  PENDING: 'bg-warn-soft text-warn',
}

function dt(d: Date) {
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
  return { date, time }
}

export default async function UserActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:reports')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const overview = await activityOverview()
  const list = await listActivity({ tab, q: sp.q, page, perPage: 10 })

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)
  const maxTop = Math.max(1, ...overview.topUsers.map((u) => u.count))

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/user-activity?${s}` : '/admin/user-activity'
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">User Activity</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">User Activity</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Track and monitor all user activities across the platform. View logins, profile updates, purchases, RFQs, and more.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        </div>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {overview.stats.map((m) => (
          <div key={m.key} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: m.tint.bg, color: m.tint.fg }}><Icon name={m.icon} className="h-[18px] w-[18px]" /></span>
              <span className="text-[11.5px] leading-tight text-ink-3">{m.label}</span>
            </div>
            <p className="tabular mt-2.5 font-display text-[24px] font-bold leading-none text-ink">{m.value.toLocaleString('en-IN')}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-3">{m.pct != null && m.pct !== 0 ? (m.pct > 0 ? <span className="font-semibold text-ok">↑ {m.pct}%</span> : <span className="font-semibold text-danger">↓ {Math.abs(m.pct)}%</span>) : null} {m.hint}</p>
          </div>
        ))}
      </section>

      <div className="flex gap-5">
        {/* main column */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* tabs */}
          <div className="rise rise-2 flex flex-wrap items-center gap-1 border-b border-line">
            {overview.tabs.map((t) => {
              const on = tab === t.key
              return (
                <Link key={t.key} href={qs({ tab: t.key, page: '1' })}
                  className={'border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ' + (on ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}>
                  {t.label} <span className="tabular text-ink-4">({t.count.toLocaleString('en-IN')})</span>
                </Link>
              )
            })}
          </div>

          <section className="rise rise-2 rounded-card border border-line bg-white p-4 shadow-card">
            {/* filters */}
            <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <label className="relative min-w-[220px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
                <input name="q" defaultValue={sp.q ?? ''} placeholder="Search by user name, email, activity type…" className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              </label>
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:bg-paper-3"><Icon name="search" className="h-3.5 w-3.5" /> Search</button>
            </form>

            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No activities match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-1 py-2.5 font-semibold"><input type="checkbox" className="h-3.5 w-3.5 rounded border-line accent-brand" /></th>
                      <th className="px-1 py-2.5 font-semibold">#</th>
                      <th className="px-1 py-2.5 font-semibold">User</th>
                      <th className="px-1 py-2.5 font-semibold">Activity</th>
                      <th className="px-1 py-2.5 font-semibold">Details</th>
                      <th className="px-1 py-2.5 font-semibold">IP Address</th>
                      <th className="px-1 py-2.5 font-semibold">Device</th>
                      <th className="px-1 py-2.5 font-semibold">Date &amp; Time</th>
                      <th className="px-1 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((r, i) => <ActivityTr key={r.id} r={r} n={start + i} />)}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} activities</p>
              <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            </div>
          </section>
        </div>

        {/* right sidebar */}
        <div className="w-[206px] shrink-0 space-y-5">
          <Panel title="Activity Overview" action={<span className="flex h-7 items-center rounded-lg border border-line bg-paper-2 px-2.5 text-[11.5px] font-medium text-ink-3">Last 30 days</span>}>
            <MultiLineChart labels={overview.chart.labels} series={overview.chart.series} height={200} />
          </Panel>

          <Panel title="Top Active Users" action={<ViewAll />}>
            <ul className="space-y-3">
              {overview.topUsers.map((u, i) => (
                <li key={u.id} className="flex items-center gap-2.5">
                  <span className="tabular w-4 shrink-0 text-center text-[12px] font-bold text-ink-4">{i + 1}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{u.name}</span>
                  <span className="shrink-0 whitespace-nowrap text-[11.5px] font-medium text-ink-3">{u.count.toLocaleString('en-IN')} activities</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Recent Activity Feed" action={<ViewAll />}>
            <ul className="space-y-3">
              {overview.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">{r.detail}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(r.at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* quick actions */}
      <section className="rise rise-3 grid grid-cols-5 gap-3">
        {QUICK.map((a) => (
          <Link key={a.label} href={a.href} className="flex items-center gap-2.5 rounded-card border border-line bg-white p-3.5 shadow-card transition-colors hover:border-brand/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: a.bg, color: a.fg }}><Icon name={a.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-ink">{a.label}</span>
              <span className="block truncate text-[10.5px] text-ink-4">{a.hint}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────


function ActivityTr({ r, n }: { r: ActivityRow; n: number }) {
  const initials = r.userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const { date, time } = dt(r.at)
  return (
    <tr className="text-[12px] row-hover">
      <td className="px-1 py-2.5"><input type="checkbox" className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-1 py-2.5 text-ink-4">{n}</td>
      <td className="px-1 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{initials}</span>
          <span className="min-w-0"><span className="block max-w-[80px] truncate font-semibold text-ink">{r.userName}</span><span className="block max-w-[80px] truncate text-[10.5px] text-ink-4">{r.userEmail}</span></span>
        </div>
      </td>
      <td className="px-1 py-2.5"><span className={`inline-flex items-center whitespace-nowrap rounded-pill px-1.5 py-0.5 text-[10.5px] font-semibold ${r.pill}`}>{r.label}</span></td>
      <td className="px-1 py-2.5"><span className="block max-w-[48px] truncate text-ink-2">{r.detail}</span></td>
      <td className="px-1 py-2.5 tabular font-mono text-[10.5px] text-ink-2">{r.ip}</td>
      <td className="px-1 py-2.5"><span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-ink-2"><Icon name={deviceIcon(r.device)} className="h-3.5 w-3.5 shrink-0 text-ink-4" />{r.device}</span></td>
      <td className="whitespace-nowrap px-1 py-2.5"><span className="block text-ink-2">{date}</span><span className="block text-[10.5px] text-ink-4">{time}</span></td>
      <td className="px-1 py-2.5"><span className={`inline-flex items-center whitespace-nowrap rounded-pill px-1.5 py-0.5 text-[10.5px] font-semibold ${STATUS_PILL[r.status] ?? 'bg-paper-3 text-ink-3'}`}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span></td>
    </tr>
  )
}

const QUICK: { label: string; hint: string; icon: IconName; href: string; bg: string; fg: string }[] = [
  { label: 'View All Users', hint: 'Browse user accounts', icon: 'users', href: '/admin/users', bg: '#EEF1FF', fg: '#6366F1' },
  { label: 'Download Activity Report', hint: 'Last 30 days as CSV', icon: 'download', href: '/admin/user-activity/export?days=30', bg: '#E7F7EE', fg: '#16A34A' },
  { label: 'Notifications', hint: 'Alerts sent to you', icon: 'bell', href: '/admin/notifications', bg: '#FEF7E0', fg: '#D97706' },
  { label: 'Trust & Complaints', hint: 'Complaints and flagged accounts', icon: 'shield', href: '/admin/trust', bg: '#FEE9E1', fg: '#EA580C' },
  { label: 'Download 90 Days', hint: 'Longer activity export (CSV)', icon: 'settings', href: '/admin/user-activity/export?days=90', bg: '#F3EAFE', fg: '#8B5CF6' },
]
