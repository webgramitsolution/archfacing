import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { AreaTrendChart, DonutChart } from '@/components/admin/charts'
import {
  AdminStatCard, Panel, ViewAll, Select, Pagination, ago, fmtDate,
} from '@/components/admin/parts'
import {
  corpOverview, listCorporates, recentCorporates, type CorpRow,
} from '@/lib/admin-corporates'

export const metadata: Metadata = { title: 'Corporates & BMFs' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; industry?: string; city?: string; status?: string; q?: string; page?: string }

export default async function CorporatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:users')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const overview = await corpOverview()
  const [list, recent] = await Promise.all([
    listCorporates({ tab, industry: sp.industry, city: sp.city, status: sp.status, q: sp.q, page, perPage: 10, dominant: overview.dominant }),
    recentCorporates(overview.dominant, 5),
  ])

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, industry: sp.industry, city: sp.city, status: sp.status, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.industry && merged.industry !== 'all') p.set('industry', merged.industry)
    if (merged.city && merged.city !== 'all') p.set('city', merged.city)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/corporates?${s}` : '/admin/corporates'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Corporates &amp; BMFs</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Manage corporate companies, brands, manufacturers and building material firms.
          </p>
        </div>
        <Link href="/admin/corporates/add" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover">
          <Icon name="plus" className="h-4 w-4" /> Add New Corporate
        </Link>
      </div>

      <section className="grid grid-cols-5 gap-4">
        {overview.stats.map((m) => (
          <AdminStatCard key={m.key} icon={m.icon} label={m.label} value={m.value} trend={m.trend} tint={m.tint} />
        ))}
      </section>

      <section className="grid grid-cols-[1.5fr_1fr_1fr] gap-5">
        <Panel title="Corporate Registrations" action={<span className="rounded-lg border border-line bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-3">Last 30 days</span>}>
          <AreaTrendChart labels={overview.registration.labels} points={overview.registration.points} everyNthLabel={4} />
        </Panel>
        <Panel title="Corporates by Industry">
          <div className="pt-2">
            <DonutChart total={overview.byIndustry.total} slices={overview.byIndustry.slices} centerLabel="Total" showCounts stacked />
          </div>
        </Panel>
        <Panel title="Verification Status">
          <div className="pt-2">
            <DonutChart total={overview.verification.total} slices={overview.verification.slices} centerLabel="Corporates" stacked />
          </div>
        </Panel>
      </section>

      <div className="flex gap-5">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-1 border-b border-line">
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

          <section className="rounded-card border border-line bg-white p-4 shadow-card">
            <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <label className="relative min-w-[200px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  name="q"
                  defaultValue={sp.q ?? ''}
                  placeholder="Search company name, email, industry…"
                  className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
              </label>
              <Select name="industry" value={sp.industry} options={overview.industryOptions} />
              <Select name="city" value={sp.city} options={overview.cityOptions} />
              <Select
                name="status"
                value={sp.status}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">
                <Icon name="settings" className="h-3.5 w-3.5" /> Filter
              </button>
              <Link href={qs({ tab, industry: 'all', city: 'all', status: 'all', q: '', page: '1' })} className="flex h-9 items-center rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:bg-paper-3">
                Reset
              </Link>
              <span className="ml-auto flex items-center gap-2">
                <a href="/admin/users/export?role=CORPORATE,BMF" download className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">
                  <Icon name="download" className="h-3.5 w-3.5" /> Export
                </a>
                <Link href="/admin/users/import?kind=CORPORATE" className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">
                  <Icon name="download" className="h-3.5 w-3.5 rotate-180" /> Import
                </Link>
              </span>
            </form>

            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No companies match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">Company Name</th>
                      <th className="px-2 py-2.5 font-semibold">Industry</th>
                      <th className="px-2 py-2.5 font-semibold">Location</th>
                      <th className="px-2 py-2.5 font-semibold">Contact Person</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Verified</th>
                      <th className="px-2 py-2.5 font-semibold">Joined On</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((c, i) => (
                      <CorpTr key={c.id} c={c} n={start + i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">
                Showing {start} to {end} of {list.total.toLocaleString('en-IN')} corporates
              </p>
              <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            </div>
          </section>
        </div>

        <div className="w-[290px] shrink-0 space-y-5">
          <Panel title="Quick Actions">
            <ul className="space-y-1">
              {QUICK.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon name={a.icon} className="h-3.5 w-3.5" />
                    </span>
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top Cities" action={<ViewAll />}>
            {overview.topCities.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-ink-3">No cities yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {overview.topCities.map((l) => (
                  <li key={l.city} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-paper-3">
                    <Icon name="map" className="h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="flex-1 truncate text-[12.5px] text-ink-2">{l.city}</span>
                    <span className="tabular text-[12.5px] font-semibold text-ink">{l.count.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent Registrations" action={<ViewAll href="/admin/users?role=CORPORATE" />}>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-ink-3">No registrations yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5">
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper text-[11px] font-bold text-brand">
                      {r.logo ? (
                        <Image src={r.logo} alt="" fill sizes="32px" className="object-cover" />
                      ) : (
                        r.company[0]?.toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{r.company}</span>
                      <span className="block truncate text-[11px] text-ink-3">{r.industry}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="rounded-card border border-line bg-[#EEF1FF] p-5 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand">
              <Icon name="building" className="h-5 w-5" />
            </span>
            <p className="mt-2.5 font-display text-[13.5px] font-bold text-ink">Partner with Leading Brands</p>
            <p className="mt-1 text-[11.5px] text-ink-3">
              Grow your corporate network and create new business opportunities.
            </p>
            <Link href="/admin/users" className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-hover">
              Invite Corporates
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function CorpTr({ c, n }: { c: CorpRow; n: number }) {
  const s = STATUS[c.status] ?? { cls: 'bg-paper-3 text-ink-3', label: c.status }
  return (
    <tr className="text-[12px]">
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper text-[11px] font-bold text-brand">
            {c.logo ? (
              <Image src={c.logo} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              c.company[0]?.toUpperCase()
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-semibold text-ink">{c.company}</span>
              {c.isBmf && <span className="rounded bg-warn-soft px-1 text-[9px] font-bold text-warn">BMF</span>}
            </span>
            <span className="tabular block text-[10.5px] text-ink-4">#CORP{c.id.slice(-5).toUpperCase()}</span>
          </span>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <span className="inline-flex items-center rounded-pill bg-[#EEF1FF] px-2 py-0.5 text-[11px] font-semibold text-[#6366F1]">
          {c.industry}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <span className="flex items-center gap-1 text-ink-2">
          <Icon name="map" className="h-3 w-3 shrink-0 text-ink-4" />
          {c.city ?? '—'}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <span className="block truncate font-medium text-ink">{c.contact}</span>
        <span className="block truncate text-[10.5px] text-ink-4">{c.contactEmail}</span>
      </td>
      <td className="px-2 py-2.5">
        <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
      </td>
      <td className="px-2 py-2.5">
        {c.verified ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok-soft text-ok">
            <Icon name="check" className="h-3 w-3" />
          </span>
        ) : (
          <span className="text-ink-4">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{fmtDate(c.createdAt)}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1 text-ink-4">
          <Link href={`/admin/users/${c.id}`} title={`Open ${c.company}`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3.5 w-3.5" /></Link>
        </div>
      </td>
    </tr>
  )
}

const QUICK: { label: string; icon: IconName; href: string }[] = [
  { label: 'Add New Corporate', icon: 'building', href: '/admin/corporates/add' },
  { label: 'Bulk Import', icon: 'download', href: '/admin/users/import?kind=CORPORATE' },
  { label: 'Newsletter List', icon: 'mail', href: '/admin/newsletter' },
  { label: 'Manage Industries', icon: 'tag', href: '/admin/categories' },
  { label: 'Manage BMF Partners', icon: 'award', href: '/admin/users?role=BMF' },
]

const STATUS: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: 'bg-ok-soft text-ok', label: 'Active' },
  PENDING_VERIFICATION: { cls: 'bg-warn-soft text-warn', label: 'Pending' },
  SUSPENDED: { cls: 'bg-danger-soft text-danger', label: 'Rejected' },
  BANNED: { cls: 'bg-danger-soft text-danger', label: 'Banned' },
}
