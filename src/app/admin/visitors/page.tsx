import type { Metadata } from 'next'
import Link from 'next/link'
import { BulkBar } from '@/components/admin/bulk-bar'
import { bulkUserAction } from '@/app/admin/users/actions'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { DonutChart } from '@/components/admin/charts'
import { AdminStatCard, Panel, ViewAll, Select, Pagination, fmtDate } from '@/components/admin/parts'
import { buyersOverview, listBuyers, type BuyerRow } from '@/lib/admin-buyers'

export const metadata: Metadata = { title: 'Buyers / Clients' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; industry?: string; status?: string; q?: string; page?: string }

export default async function BuyersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:users')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const overview = await buyersOverview()
  const list = await listBuyers({ tab, industry: sp.industry, status: sp.status, q: sp.q, page, perPage: 10 })

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)
  const maxIndustry = Math.max(1, ...overview.topIndustries.map((i) => i.value))

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, industry: sp.industry, status: sp.status, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.industry && merged.industry !== 'all') p.set('industry', merged.industry)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/visitors?${s}` : '/admin/visitors'
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Buyers / Clients</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Manage individual buyers and client companies who purchase products, submit RFQs, and engage with the platform.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/admin/users/import?kind=CLIENT" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">
            <Icon name="download" className="h-3.5 w-3.5 rotate-180" /> Import Buyers
          </Link>
          <a href="/admin/users/export?role=CLIENT" download className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">
            <Icon name="download" className="h-3.5 w-3.5" /> Export
          </a>
          <Link href="/admin/visitors/add" className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">
            <Icon name="plus" className="h-4 w-4" /> Add Buyer / Client
          </Link>
        </div>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {overview.stats.map((m) => (
          <AdminStatCard key={m.key} icon={m.icon} label={m.label} value={m.value} trend={m.trend} tint={m.tint} />
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
                <Link
                  key={t.key}
                  href={qs({ tab: t.key, page: '1' })}
                  className={
                    'border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ' +
                    (on ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')
                  }
                >
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
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  name="q"
                  defaultValue={sp.q ?? ''}
                  placeholder="Search by name, email, company, phone…"
                  className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
              </label>
              <Select name="industry" value={sp.industry} options={overview.industryOptions} />
              <Select
                name="status"
                value={sp.status}
                options={[
                  { value: 'all', label: 'Account Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:bg-paper-3">
                <Icon name="settings" className="h-3.5 w-3.5" /> Apply Filters
              </button>
            </form>

            {/*
              One form around the bar and the table: the row checkboxes are
              name="ids", BulkBar counts them and submits the chosen status to
              bulkUserAction. The old bar printed a fixed "0 selected" beside
              buttons with no handler, a sort chip that sorted nothing and a
              list/grid toggle with no grid.
            */}
            <form action={bulkUserAction}>
            <div className="mt-3 border-y border-line-soft py-2.5">
              <BulkBar choices={[{ value: 'ACTIVATE', label: 'Activate', tone: 'ok' }, { value: 'SUSPEND', label: 'Suspend', tone: 'danger' }]} />
            </div>

            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No buyers match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold"><span className="sr-only">Select</span></th>
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">Name / Company</th>
                      <th className="px-2 py-2.5 font-semibold">Type</th>
                      <th className="px-2 py-2.5 font-semibold">Industry</th>
                      <th className="px-2 py-2.5 font-semibold">Location</th>
                      <th className="px-2 py-2.5 font-semibold">PACT Area</th>
                      <th className="px-2 py-2.5 text-center font-semibold">Orders</th>
                      <th className="px-2 py-2.5 text-center font-semibold">RFQs</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Joined On</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((b, i) => (
                      <BuyerTr key={b.id} b={b} n={start + i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </form>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">
                Showing {start} to {end} of {list.total.toLocaleString('en-IN')} buyers / clients
              </p>
              <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            </div>
          </section>
        </div>

        {/* right sidebar */}
        <div className="w-[300px] shrink-0 space-y-5">
          <Panel title="Client Type Distribution">
            <div className="pt-2">
              <DonutChart total={overview.typeDistribution.total} slices={overview.typeDistribution.slices} centerLabel="Total Clients" showCounts stacked />
            </div>
          </Panel>

          <Panel title="Top Industries" action={<ViewAll />}>
            {overview.topIndustries.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-ink-3">No industry data yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.topIndustries.map((ind) => (
                  <li key={ind.label} className="flex items-center gap-2.5">
                    <span className="w-[92px] shrink-0 truncate text-[11.5px] text-ink-2">{ind.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
                      <span className="block h-full rounded-full" style={{ width: `${(ind.value / maxIndustry) * 100}%`, backgroundColor: ind.color }} />
                    </span>
                    <span className="tabular w-8 shrink-0 text-right text-[11.5px] font-semibold text-ink">{ind.value.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent Registrations" action={<ViewAll href="/admin/users?role=CLIENT" />}>
            {overview.recent.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-ink-3">No registrations yet.</p>
            ) : (
              <ul className="space-y-3">
                {overview.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                      {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{r.name}</span>
                    </span>
                    <span className={'shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold ' + (r.type === 'Company' ? 'bg-[#F3EAFE] text-[#8B5CF6]' : 'bg-[#EEF1FF] text-[#2563EB]')}>{r.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* quick actions */}
      <section className="rise rise-3 grid grid-cols-6 gap-3">
        {QUICK.map((a) => (
          <Link key={a.label} href={a.href} className="flex items-center gap-2.5 rounded-card border border-line bg-white p-3.5 shadow-card transition-colors hover:border-brand/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name={a.icon} className="h-4 w-4" /></span>
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


function BuyerTr({ b, n }: { b: BuyerRow; n: number }) {
  const cs = STATUS[b.status] ?? { cls: 'bg-paper-3 text-ink-3', label: b.status }
  const initials = b.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <tr className="text-[12px] row-hover">
      <td className="px-2 py-2.5"><input type="checkbox" name="ids" value={b.id} aria-label={`Select ${b.name}`} className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' + (b.type === 'Company' ? 'bg-[#F3EAFE] text-[#8B5CF6]' : 'bg-brand-soft text-brand')}>
            {b.type === 'Company' ? <Icon name="building" className="h-4 w-4" /> : initials}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[180px] truncate font-semibold text-ink">{b.name}</span>
            <span className="block max-w-[180px] truncate text-[10.5px] text-ink-4">{b.email}</span>
          </span>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <span className={'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ' + (b.type === 'Company' ? 'bg-[#F3EAFE] text-[#8B5CF6]' : 'bg-[#EEF1FF] text-[#2563EB]')}>{b.type}</span>
      </td>
      <td className="px-2 py-2.5 text-ink-2">{b.industry ?? '—'}</td>
      <td className="px-2 py-2.5">
        <span className="flex items-center gap-1 text-ink-2"><Icon name="map" className="h-3 w-3 shrink-0 text-ink-4" />{b.city ?? '—'}</span>
      </td>
      <td className="px-2 py-2.5">
        {b.pactArea ? <span className="tabular rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{b.pactArea}</span> : <span className="text-ink-4">—</span>}
      </td>
      <td className="px-2 py-2.5 text-center tabular font-semibold text-ink">{b.orders}</td>
      <td className="px-2 py-2.5 text-center tabular font-semibold text-ink">{b.rfqs}</td>
      <td className="px-2 py-2.5">
        <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${cs.cls}`}>{cs.label}</span>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{fmtDate(b.createdAt)}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1 text-ink-4">
          <Link href={`/admin/users/${b.id}`} title={`Open ${b.name}`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3.5 w-3.5" /></Link>
        </div>
      </td>
    </tr>
  )
}

const QUICK: { label: string; hint: string; icon: IconName; href: string }[] = [
  { label: 'Add New Buyer / Client', hint: 'Create an individual or company client', icon: 'user', href: '/admin/visitors/add' },
  { label: 'Import Buyers / Clients', hint: 'Upload a CSV', icon: 'download', href: '/admin/users/import?kind=CLIENT' },
  { label: 'Verification Queue', hint: 'Review and verify new registrations', icon: 'shield', href: '/admin/visitors/verification' },
  { label: 'Company Clients', hint: 'Buyers registered as companies', icon: 'grid', href: '/admin/visitors?tab=company' },
  { label: 'Export Clients', hint: 'Download buyers (CSV)', icon: 'chart', href: '/admin/users/export?role=CLIENT' },
  { label: 'Pending Verification', hint: 'Buyers waiting for a check', icon: 'users', href: '/admin/visitors/verification?status=PENDING' },
]

const STATUS: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: 'bg-ok-soft text-ok', label: 'Active' },
  PENDING_VERIFICATION: { cls: 'bg-warn-soft text-warn', label: 'Pending' },
  SUSPENDED: { cls: 'bg-danger-soft text-danger', label: 'Inactive' },
  BANNED: { cls: 'bg-danger-soft text-danger', label: 'Banned' },
}
