import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { Pagination, fmtDate } from '@/components/admin/parts'
import { leadStats, leadTabCounts, listLeads, leadFilterOptions, leadDetail, type LeadRow } from '@/lib/admin-leads'
import { LeadDrawer } from './lead-drawer'
import { LeadFilters } from './lead-filters'

export const metadata: Metadata = { title: 'Leads & Enquiries' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; status?: string; category?: string; source?: string; location?: string; q?: string; page?: string; view?: string; sort?: string; project?: string; assignee?: string; from?: string; to?: string }

// Per-enquiry-type pill colours (matches the reference's varied Type column).
const TYPE_TINT: Record<string, string> = {
  'Project Enquiry': 'bg-[#EAF2FF] text-[#2563EB]',
  'Product Enquiry': 'bg-[#F3EAFE] text-[#8B5CF6]',
  'Service Enquiry': 'bg-[#E7F7F3] text-[#0D9488]',
  'Profile Enquiry': 'bg-[#FFF1E6] text-[#EA580C]',
  'Corporate Enquiry': 'bg-[#FEF3C7] text-[#B45309]',
  'BMF Enquiry': 'bg-[#E7F7EE] text-[#16A34A]',
  'Consult Nearby': 'bg-[#EEF1FF] text-[#6366F1]',
  'Website Enquiry': 'bg-[#EAF2FF] text-[#2563EB]',
  'RFQ': 'bg-[#FFF1E6] text-[#EA580C]',
  'Contact Request': 'bg-[#F1F5F9] text-[#64748B]',
  'Other': 'bg-[#F1F5F9] text-[#64748B]',
}

const STATUS: Record<string, { cls: string; label: string }> = {
  NEW: { cls: 'bg-[#EAF2FF] text-[#2563EB]', label: 'New' },
  ASSIGNED: { cls: 'bg-[#EAF2FF] text-[#2563EB]', label: 'Assigned' },
  IN_PROGRESS: { cls: 'bg-warn-soft text-warn', label: 'In Progress' },
  RESPONDED: { cls: 'bg-ok-soft text-ok', label: 'Responded' },
  CONVERTED: { cls: 'bg-ok-soft text-ok', label: 'Converted' },
  CLOSED: { cls: 'bg-paper-3 text-ink-3', label: 'Closed' },
  UNROUTED: { cls: 'bg-danger-soft text-danger', label: 'Unassigned' },
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:leads')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const [stats, tabs, list, options, detail] = await Promise.all([
    leadStats(),
    leadTabCounts(),
    listLeads({ tab, status: sp.status, category: sp.category, source: sp.source, location: sp.location, q: sp.q, sort: sp.sort, project: sp.project, assignee: sp.assignee, from: sp.from, to: sp.to, page, perPage: 8 }),
    leadFilterOptions(),
    sp.view ? leadDetail(sp.view) : Promise.resolve(null),
  ])

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)
  const dense = !!detail // drawer open → hide the two widest non-essential columns so the full table fits beside it

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, status: sp.status, category: sp.category, source: sp.source, location: sp.location, q: sp.q, view: sp.view, sort: sp.sort, project: sp.project, assignee: sp.assignee, from: sp.from, to: sp.to, ...over }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) if (v && v !== 'all' && !(k === 'page' && v === '1')) p.set(k, String(v))
    const s = p.toString()
    return s ? `/admin/leads?${s}` : '/admin/leads'
  }

  const STAT_CARDS: { key: string; label: string; icon: IconName; value: string; hint: string; pct?: number | null; bg: string; fg: string }[] = [
    { key: 't', label: 'Total Enquiries', icon: 'mail', value: stats.total.toLocaleString('en-IN'), hint: `${stats.thisMonth} this month`, pct: stats.totalPct, bg: '#FFE4E6', fg: '#E11D48' },
    { key: 'n', label: 'New Enquiries', icon: 'user', value: stats.newCount.toLocaleString('en-IN'), hint: 'Awaiting a reply', bg: '#EAF2FF', fg: '#2563EB' },
    { key: 'p', label: 'In Progress', icon: 'clock', value: stats.inProgress.toLocaleString('en-IN'), hint: 'Active', bg: '#FEF7E0', fg: '#D97706' },
    { key: 'c', label: 'Converted', icon: 'check', value: stats.converted.toLocaleString('en-IN'), hint: 'All time', bg: '#E7F7EE', fg: '#16A34A' },
    { key: 'x', label: 'Closed', icon: 'alert', value: stats.closed.toLocaleString('en-IN'), hint: 'All time', bg: '#F1F5F9', fg: '#64748B' },
    { key: 'r', label: 'Conversion Rate', icon: 'chart', value: `${stats.conversionRate}%`, hint: 'Converted of all enquiries', bg: '#F3EAFE', fg: '#8B5CF6' },
  ]

  const TABS = [
    { key: 'all', label: 'All Enquiries', count: tabs.all, sub: '' },
    { key: 'direct', label: 'Direct Leads', count: tabs.direct, sub: 'Product / Website Enquiries' },
    { key: 'pact', label: 'PACT Routed', count: tabs.pact, sub: 'Pin Code / Category Based' },
    { key: 'unassigned', label: 'Unassigned', count: tabs.unassigned, sub: '' },
  ]

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">Leads &amp; Enquiries</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">Leads &amp; Enquiries</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Track, manage and distribute all enquiries. See which users received each lead and how it was routed (Direct / PACT).</p>
        </div>
        {/* The current tab, filters and search, as a CSV — built by /admin/leads/export. */}
        <a href={`/admin/leads/export${qs({ page: '1' }).replace('/admin/leads', '')}`} download className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"><Icon name="download" className="h-4 w-4" /> Export Leads</a>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-4">
        {STAT_CARDS.map((m) => (
          <div key={m.key} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: m.bg, color: m.fg }}><Icon name={m.icon} className="h-5 w-5" /></span>
              <span className="text-[12px] font-medium leading-tight text-ink-3">{m.label}</span>
            </div>
            <p className="tabular mt-3 font-display text-[26px] font-bold leading-none text-ink">{m.value}</p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-3">{m.pct ? (m.pct > 0 ? <span className="font-semibold text-ok">↑ {m.pct}%</span> : <span className="font-semibold text-danger">↓ {Math.abs(m.pct)}%</span>) : null} {m.hint}</p>
          </div>
        ))}
      </section>

      {/* tabs */}
      <section className="rise rise-2 flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const on = tab === t.key
          return (
            <Link key={t.key} href={qs({ tab: t.key, page: '1' })}
              className={'rounded-lg border px-4 py-2 text-left transition-colors ' + (on ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-2 hover:border-ink-4')}>
              <span className="block text-[12.5px] font-semibold">{t.label} ({t.count.toLocaleString('en-IN')})</span>
              {t.sub && <span className={'block text-[10px] ' + (on ? 'text-white/80' : 'text-ink-4')}>{t.sub}</span>}
            </Link>
          )
        })}
        <div className="ml-auto flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
            <label className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
              <input name="q" defaultValue={sp.q ?? ''} placeholder="Search enquiries…" className="h-9 w-[200px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
            </label>
          </form>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3">Sort by
            {/* A two-state order, so a link that flips it is the whole control. */}
            <Link href={qs({ sort: sp.sort === 'oldest' ? undefined : 'oldest', page: '1' })} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 font-medium text-ink-2 hover:border-brand hover:text-brand">
              {sp.sort === 'oldest' ? 'Oldest First' : 'Newest First'} <span className="text-[9px] text-ink-4">⇅</span>
            </Link>
          </span>
        </div>
      </section>

      {/* filters — Enquiry Type · Category · Location · Project · Assigned To · Date Range · Reset */}
      <LeadFilters sources={options.sources} categories={options.categories} locations={options.locations}
        projects={options.projects} assignees={options.assignees}
        current={{ source: sp.source, category: sp.category, location: sp.location, tab, q: sp.q, project: sp.project, assignee: sp.assignee, from: sp.from, to: sp.to }} />

      {/* main + drawer */}
      <div className="flex gap-5">
        <section className="rise rise-3 min-w-0 flex-1 rounded-card border border-line bg-white p-4 shadow-card">
          {list.rows.length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name="inbox" className="h-6 w-6" /></span>
              <p className="mt-3 text-[13px] font-semibold text-ink">No enquiries found</p>
              <p className="mt-1 text-[12px] text-ink-3">Try a different tab or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-[8.5px] uppercase tracking-tight text-ink-4">
                    <th className="px-1 py-2 font-semibold"><input type="checkbox" className="h-3 w-3 rounded border-line accent-brand" /></th>
                    <th className="px-1 py-2 font-semibold">#</th>
                    <th className="px-1 py-2 font-semibold">Name &amp; Contact</th>
                    {!dense && <th className="px-1 py-2 font-semibold">Enquiry Details</th>}
                    <th className="px-1 py-2 font-semibold">Category /<br />Project</th>
                    <th className="px-1 py-2 font-semibold">Location<br />(Pincode)</th>
                    <th className="px-1 py-2 font-semibold">Type</th>
                    <th className="px-1 py-2 font-semibold">Assigned To<br />(Direct)</th>
                    <th className="px-1 py-2 font-semibold">Also Sent To<br />(PACT)</th>
                    <th className="px-1 py-2 font-semibold">Status</th>
                    {!dense && <th className="px-1 py-2 font-semibold">Date</th>}
                    <th className="px-1 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {list.rows.map((r, i) => <LeadTr key={r.id} r={r} n={start + i} viewHref={qs({ view: r.id })} dense={dense} />)}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} enquiries</p>
            <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">Rows per page <span className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 font-medium text-ink-2">{list.perPage} <span className="text-[9px] text-ink-4">▼</span></span></span>
          </div>
        </section>

        {detail ? (
          <LeadDrawer d={detail} closeHref={qs({ view: '' })} />
        ) : (
          <aside className="rise rise-3 hidden w-[286px] shrink-0 flex-col items-center justify-center rounded-card border border-dashed border-line bg-paper-2 p-8 text-center xl:flex">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-4 shadow-card"><Icon name="inbox" className="h-6 w-6" /></span>
            <p className="mt-3 text-[13px] font-semibold text-ink">Enquiry details</p>
            <p className="mt-1 text-[11.5px] text-ink-3">Select an enquiry from the list to see its full routing — the direct recipient and every PACT holder it reached.</p>
          </aside>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function LeadTr({ r, n, viewHref, dense }: { r: LeadRow; n: number; viewHref: string; dense: boolean }) {
  const cs = STATUS[r.status] ?? { cls: 'bg-paper-3 text-ink-3', label: r.status }
  return (
    <tr className="align-top text-[10.5px] row-hover">
      <td className="px-1 py-2"><input type="checkbox" className="h-3 w-3 rounded border-line accent-brand" /></td>
      <td className="px-1 py-2 text-ink-4">{n}</td>
      <td className="px-1 py-2">
        <div className="flex items-start gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[9px] font-bold text-brand">{initials(r.contactName)}</span>
          <span className="min-w-0">
            <span className="block max-w-[66px] truncate font-semibold text-ink">{r.contactName}</span>
            <span className="block max-w-[66px] truncate text-[9px] text-ink-3">{r.contactPhone}</span>
            {r.contactEmail && <span className="block max-w-[66px] truncate text-[8.5px] text-ink-4">{r.contactEmail}</span>}
          </span>
        </div>
      </td>
      {!dense && <td className="px-1 py-2"><span className="block max-w-[86px] text-[9.5px] leading-snug text-ink-2 line-clamp-2">{r.message}</span></td>}
      <td className="px-1 py-2"><span className="block max-w-[62px] truncate font-semibold text-ink">{r.category ?? '—'}</span><span className="block max-w-[62px] truncate text-[9px] text-ink-4">{r.sourceTitle ?? ''}</span></td>
      <td className="px-1 py-2"><span className="block font-mono text-[10px] text-ink">{r.pincode}</span><span className="block max-w-[58px] truncate text-[9px] text-ink-4">{[r.city, r.state].filter(Boolean).join(', ')}</span></td>
      <td className="px-1 py-2"><span className={`inline-flex items-center rounded-pill px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${TYPE_TINT[r.sourceLabel] ?? 'bg-[#EEF1FF] text-[#6366F1]'}`}>{r.sourceLabel}</span></td>
      <td className="px-1 py-2">
        {r.direct ? (
          <div className="flex items-start gap-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-soft text-[8px] font-bold text-ok">{initials(r.direct.company ?? r.direct.name)}</span>
            <span className="min-w-0"><span className="block max-w-[62px] truncate text-[9.5px] font-semibold text-ink">{r.direct.company ?? r.direct.name}</span><span className="block text-[8px] text-ink-4">(Website Owner)</span></span>
          </div>
        ) : <span className="text-ink-4">—</span>}
      </td>
      <td className="px-1 py-2">
        {r.pactFirst ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[8px] font-bold text-[#2563EB]">{initials(r.pactFirst.name)}</span>
              <span className="min-w-0"><span className="block max-w-[54px] truncate text-[9.5px] font-semibold text-ink">{r.pactFirst.name}</span><span className="block text-[8px] text-ink-4">(PACT Holder)</span></span>
              {r.pactCount > 1 && <span className="rounded-pill bg-[#EAF2FF] px-1 py-0.5 text-[8px] font-bold text-[#2563EB]">+{r.pactCount - 1}</span>}
            </div>
            <span className="mt-0.5 inline-flex items-center rounded-pill bg-ok-soft px-1 py-0.5 text-[7.5px] font-semibold text-ok">Same Category + Pincode</span>
          </div>
        ) : <span className="text-ink-4">—</span>}
      </td>
      <td className="px-1 py-2"><span className={`inline-flex items-center rounded-pill px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${cs.cls}`}>{cs.label}</span></td>
      {!dense && <td className="whitespace-nowrap px-1 py-2 text-[9px] text-ink-3">{fmtDate(r.createdAt)}</td>}
      <td className="px-1 py-2">
        <div className="flex items-center justify-end gap-0.5 text-ink-4">
          <Link href={viewHref} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3 w-3" /></Link>
        </div>
      </td>
    </tr>
  )
}
