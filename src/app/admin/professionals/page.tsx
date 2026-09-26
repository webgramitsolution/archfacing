import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { BulkBar } from '@/components/admin/bulk-bar'
import { bulkUserAction } from '@/app/admin/users/actions'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { DonutChart } from '@/components/admin/charts'
import { TrendText } from '@/components/admin/parts'
import {
  professionalsOverview, listProfessionalsTable, professionTypes,
  type ProTableRow, type ProStatCard,
} from '@/lib/admin-professionals'

export const metadata: Metadata = { title: 'Professionals' }
export const dynamic = 'force-dynamic'

const TINT: Record<string, { bg: string; fg: string }> = {
  total: { bg: '#EEF1FF', fg: '#6366F1' },
  verified: { bg: '#E7F7EE', fg: '#16A34A' },
  pending: { bg: '#FFE9EC', fg: '#E11D48' },
  featured: { bg: '#FEF7E0', fg: '#D97706' },
  active: { bg: '#E4EEFF', fg: '#2563EB' },
  projects: { bg: '#F3EAFE', fg: '#8B5CF6' },
}

type SP = { tab?: string; type?: string; city?: string; verification?: string; q?: string; page?: string }

export default async function ProfessionalsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:users')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const [overview, list, types] = await Promise.all([
    professionalsOverview(),
    listProfessionalsTable({ tab, type: sp.type, city: sp.city, verification: sp.verification, q: sp.q, page, perPage: 10 }),
    professionTypes(),
  ])

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, type: sp.type, city: sp.city, verification: sp.verification, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.type && merged.type !== 'all') p.set('type', merged.type)
    if (merged.city && merged.city !== 'all') p.set('city', merged.city)
    if (merged.verification && merged.verification !== 'all') p.set('verification', merged.verification)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/professionals?${s}` : '/admin/professionals'
  }

  return (
    <div className="space-y-5">
      <nav className="rise flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/users" className="hover:text-brand">Professionals</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">All Professionals</span>
      </nav>

      <div className="rise flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Professionals</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Manage architects, interior designers, engineers, contractors and other industry professionals.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/admin/users/import?kind=PROFESSIONAL" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink"><Icon name="download" className="h-4 w-4 rotate-180 text-ink-4" /> Import Professionals</Link>
          <a href="/admin/users/export?role=PROFESSIONAL&tier=PROFESSIONAL" download className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink"><Icon name="download" className="h-4 w-4 text-ink-4" /> Export</a>
          <Link href="/admin/professionals/add" className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"><Icon name="plus" className="h-4 w-4" /> Add Professional</Link>
        </div>
      </div>

      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {overview.stats.map((m) => <StatCard key={m.key} m={m} />)}
      </section>

      <div className="rise rise-2 flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line">
            {overview.tabs.map((t) => {
              const on = tab === t.key
              return (
                <Link key={t.key} href={qs({ tab: t.key, page: '1' })}
                  className={'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors ' + (on ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}>
                  {t.label}{['all', 'pending', 'verified', 'featured'].includes(t.key) && <span className="tabular text-ink-4"> ({t.count.toLocaleString('en-IN')})</span>}
                </Link>
              )
            })}
          </div>

          <section className="rounded-card border border-line bg-white p-4 shadow-card">
            <form method="get" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <label className="relative min-w-[190px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
                <input name="q" defaultValue={sp.q ?? ''} placeholder="Search by name, company, email, location…" className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              </label>
              <FilterSelect name="type" value={sp.type} placeholder="Profession Type" options={types.map((t) => ({ value: t, label: t }))} />
              <FilterSelect name="verification" value={sp.verification} placeholder="Verification" options={[{ value: 'verified', label: 'Verified' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-ink-4 hover:text-ink"><Icon name="settings" className="h-3.5 w-3.5 text-ink-4" /> Apply Filters</button>
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
              <BulkBar choices={[{ value: 'VERIFY', label: 'Verify', tone: 'info' }, { value: 'ACTIVATE', label: 'Activate', tone: 'ok' }, { value: 'SUSPEND', label: 'Suspend', tone: 'danger' }]} />
            </div>

            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No professionals match these filters.</p>
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold"><span className="sr-only">Select</span></th>
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">Professional</th>
                      <th className="px-2 py-2.5 font-semibold">Type</th>
                      <th className="px-2 py-2.5 font-semibold">Company / Organisation</th>
                      <th className="px-2 py-2.5 font-semibold">Location</th>
                      <th className="px-2 py-2.5 font-semibold">Experience</th>
                      <th className="px-2 py-2.5 font-semibold">Projects</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Verification</th>
                      <th className="px-2 py-2.5 font-semibold">Joined On</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((p, i) => <ProTr key={p.id} p={p} n={start + i} />)}
                  </tbody>
                </table>
              </div>
            )}
            </form>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} professionals</p>
              <Pagination page={list.page} pages={list.pages} qs={qs} />
            </div>
          </section>
        </div>

        <div className="w-[290px] shrink-0 space-y-4">
          <Panel title="Professional Type Distribution">
            <DonutChart total={overview.typeDistribution.total} slices={overview.typeDistribution.slices} centerLabel="Total Professionals" stacked />
          </Panel>
          <Panel title="Verification Status">
            <ul className="space-y-3">
              {overview.verification.rows.map((r) => (
                <li key={r.label}>
                  <div className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="flex items-center gap-2"><span className="tabular font-semibold text-ink">{r.value.toLocaleString('en-IN')}</span><span className="tabular w-10 text-right text-ink-3">{r.pct}%</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${r.pct}%`, backgroundColor: r.color }} /></div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Top Cities" subtitle="by professionals" action={<Link href="/admin/reports" className="text-[11px] font-semibold text-brand hover:underline">View All</Link>}>
            {overview.topCities.rows.length === 0 ? <p className="py-4 text-center text-[12px] text-ink-3">No city data.</p> : (
              <ul className="space-y-2">
                {overview.topCities.rows.map((c, i) => (
                  <li key={c.label} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-[10.5px] font-bold text-ink-4">{i + 1}</span>
                    <span className="w-[64px] shrink-0 truncate text-[11px] text-ink-2">{c.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${(c.value / overview.topCities.max) * 100}%` }} /></span>
                    <span className="tabular w-9 shrink-0 text-right text-[11px] font-semibold text-ink">{c.value.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <section className="rise rise-3 grid grid-cols-6 gap-3">
        {QUICK.map((q) => (
          <Link key={q.title} href={q.href} className="row-hover flex items-center gap-3 rounded-card border border-line bg-white p-3.5 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: q.tint.bg, color: q.tint.fg }}><Icon name={q.icon} className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-ink">{q.title}</span><span className="block truncate text-[10px] text-ink-3">{q.sub}</span></span>
          </Link>
        ))}
      </section>
    </div>
  )
}

// ── pieces ──────────────────────────────────────────────────

function StatCard({ m }: { m: ProStatCard }) {
  const tint = TINT[m.key] ?? { bg: '#EEF1FF', fg: '#6366F1' }
  return (
    <div className="rounded-card border border-line bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint.bg, color: tint.fg }}><Icon name={m.icon} className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 truncate text-[11px] leading-tight text-ink-3">{m.label}</span>
      </div>
      <p className="tabular mt-2.5 font-display text-[21px] font-bold leading-none tracking-tight text-ink">{m.value.toLocaleString('en-IN')}</p>
      <p className="mt-1.5 truncate text-[10px] text-ink-3"><TrendText trend={m.trend} /> this month</p>
    </div>
  )
}

const STATUS: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: 'bg-ok-soft text-ok', label: 'Active' },
  PENDING_VERIFICATION: { cls: 'bg-warn-soft text-warn', label: 'Pending' },
  SUSPENDED: { cls: 'bg-danger-soft text-danger', label: 'Inactive' },
  BANNED: { cls: 'bg-danger-soft text-danger', label: 'Banned' },
}
const TYPE_PILL = 'bg-[#EEF1FF] text-[#4F46E5]'

function ProTr({ p, n }: { p: ProTableRow; n: number }) {
  const s = STATUS[p.status] ?? { cls: 'bg-paper-3 text-ink-3', label: p.status }
  return (
    <tr className="row-hover text-[12px]">
      <td className="px-2 py-2.5"><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[11px] font-bold text-brand">
            {p.photo ? <Image src={p.photo} alt="" fill sizes="32px" className="object-cover" /> : p.name.replace(/^(ar|er|id|dr)\.?\s+/i, '')[0]?.toUpperCase()}
          </span>
          <span className="min-w-0"><span className="flex items-center gap-1 truncate font-semibold text-ink"><Link href={`/admin/users/${p.id}`} className="hover:text-brand">{p.name}</Link>{p.featured && <Icon name="star" className="h-3 w-3 text-warn" />}</span><span className="block truncate text-[10.5px] text-ink-4">{p.email}</span></span>
        </div>
      </td>
      <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${TYPE_PILL}`}>{p.type}</span></td>
      <td className="px-2 py-2.5 text-ink-2">{p.company}</td>
      <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1 text-ink-2"><Icon name="map" className="h-3 w-3 text-ink-4" />{p.location}</span></td>
      <td className="px-2 py-2.5 text-ink-2">{p.experience != null ? `${p.experience} Years` : '—'}</td>
      <td className="tabular px-2 py-2.5 font-semibold text-ink">{p.projects}</td>
      <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${s.cls}`}>{s.label}</span></td>
      <td className="px-2 py-2.5">
        {p.verified
          ? <span className="inline-flex items-center gap-1 rounded-pill bg-ok-soft px-2 py-0.5 text-[10.5px] font-semibold text-ok"><Icon name="check" className="h-3 w-3" />Verified</span>
          : <span className="inline-flex items-center gap-1 rounded-pill bg-warn-soft px-2 py-0.5 text-[10.5px] font-semibold text-warn"><Icon name="clock" className="h-3 w-3" />Pending</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{fmtDate(p.createdAt)}</td>
      <td className="px-2 py-2.5"><div className="flex items-center justify-end text-ink-4"><Link href={`/admin/users/${p.id}`} aria-label={`View ${p.name}`} className="flex h-7 items-center justify-center rounded-md px-2 text-[11.5px] font-semibold text-ink-3 hover:bg-paper-3 hover:text-brand">View</Link></div></td>
    </tr>
  )
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-[13.5px] font-bold text-ink">{title}{subtitle && <span className="ml-1.5 text-[10.5px] font-normal text-ink-4">{subtitle}</span>}</h2>{action}</div>
      {children}
    </section>
  )
}
function FilterSelect({ name, value, placeholder, options }: { name: string; value?: string; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <select name={name} defaultValue={value ?? 'all'} className="h-9 max-w-[140px] rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink-2 focus:border-brand focus:outline-none">
      <option value="all">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
function Pagination({ page, pages, qs }: { page: number; pages: number; qs: (o: Partial<SP>) => string }) {
  const nums: number[] = []
  const from = Math.max(1, page - 2), to = Math.min(pages, from + 4)
  for (let i = from; i <= to; i++) nums.push(i)
  return (
    <div className="flex items-center gap-1">
      <PageLink href={page > 1 ? qs({ page: String(page - 1) }) : undefined}>‹</PageLink>
      {nums.map((nn) => <Link key={nn} href={qs({ page: String(nn) })} className={'tabular flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-medium ' + (nn === page ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-3')}>{nn}</Link>)}
      {to < pages && <span className="px-1 text-[11px] text-ink-4">… {pages.toLocaleString('en-IN')}</span>}
      <PageLink href={page < pages ? qs({ page: String(page + 1) }) : undefined}>›</PageLink>
      <span className="ml-2 text-[11.5px] text-ink-3">10 per page</span>
    </div>
  )
}
function PageLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span className="flex h-7 w-7 items-center justify-center rounded-md text-ink-4 opacity-40">{children}</span>
  return <Link href={href} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-2 hover:bg-paper-3">{children}</Link>
}

const QUICK: { title: string; sub: string; icon: IconName; href: string; tint: { bg: string; fg: string } }[] = [
  { title: 'Add New Professional', sub: 'Create a professional account', icon: 'user', href: '/admin/professionals/add', tint: { bg: '#EEF1FF', fg: '#6366F1' } },
  { title: 'Manage Categories', sub: 'View professional categories', icon: 'tag', href: '/admin/categories', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  { title: 'Verification Queue', sub: 'Review pending applications', icon: 'check', href: '/admin/professionals?tab=pending', tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  { title: 'Featured Professionals', sub: 'Manage featured listings', icon: 'star', href: '/admin/professionals?tab=featured', tint: { bg: '#FEF7E0', fg: '#D97706' } },
  { title: 'Professional Reports', sub: 'Download analytics reports', icon: 'file', href: '/admin/reports', tint: { bg: '#FFEEE0', fg: '#F97316' } },
  { title: 'Bulk Import', sub: 'Import from a CSV', icon: 'download', href: '/admin/users/import?kind=PROFESSIONAL', tint: { bg: '#E7F7EE', fg: '#16A34A' } },
]

function fmtDate(d: Date): string { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
