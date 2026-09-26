import type { Metadata } from 'next'
import Link from 'next/link'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { Panel, ViewAll, Select, Pagination, ago, fmtDate } from '@/components/admin/parts'
import { queueOverview, listQueue, type QueueRow } from '@/lib/admin-buyer-verification'
import { BulkBar } from '@/components/admin/bulk-bar'
import { setBuyerVerificationAction } from '../actions'

export const metadata: Metadata = { title: 'Verification Queue' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; industry?: string; status?: string; q?: string; page?: string; notice?: string }

export default async function VerificationQueuePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:users')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const overview = await queueOverview()
  const list = await listQueue({ tab, industry: sp.industry, status: sp.status, q: sp.q, page, perPage: 10 })

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)
  const maxType = Math.max(1, ...overview.usersByType.map((u) => u.value))
  const maxIssue = Math.max(1, ...overview.topIssues.map((i) => i.value))

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, industry: sp.industry, status: sp.status, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.industry && merged.industry !== 'all') p.set('industry', merged.industry)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/visitors/verification?${s}` : '/admin/visitors/verification'
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
            <Link href="/admin/visitors" className="hover:text-brand">Buyers / Clients</Link><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">Verification Queue</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">Verification Queue</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Review and verify buyer and client accounts, documents and business details before activation.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/admin/visitors/verification/settings" className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"><Icon name="settings" className="h-4 w-4" /> Verification Settings</Link>
        </div>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-4 gap-4">
        {overview.stats.map((m) => (
          <div key={m.key} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: m.tint.bg, color: m.tint.fg }}><Icon name={m.icon} className="h-5 w-5" /></span>
              <span className="text-[12.5px] leading-tight text-ink-3">{m.label}</span>
            </div>
            <p className="tabular mt-3 font-display text-[26px] font-bold leading-none text-ink">{m.value.toLocaleString('en-IN')}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3">
              <span className="font-semibold text-ok">↑ {m.trend.pct}%</span> {m.hint}
            </p>
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
                <input name="q" defaultValue={sp.q ?? ''} placeholder="Search by name, email, company, phone…" className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              </label>
              <Select name="industry" value={sp.industry} options={overview.industryOptions} />
              <Select name="status" value={sp.status} options={[{ value: 'all', label: 'Verification Status' }, { value: 'PENDING', label: 'Pending' }, { value: 'UNDER_REVIEW', label: 'Under Review' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }]} />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:bg-paper-3"><Icon name="search" className="h-3.5 w-3.5" /> Apply</button>
            </form>

            {/*
              One form for the bulk bar, the row checkboxes and each row's own
              buttons — all post to setBuyerVerificationAction. "Request
              Documents", the sort chip and the list/grid toggle were dropped:
              none had anything behind them.
            */}
            {sp.notice && (
              <p role="status" className="mb-3 rounded-lg border border-line bg-paper-2 px-3 py-2 text-[12.5px] font-medium text-ink-2">{sp.notice.slice(0, 200)}</p>
            )}
            <form action={setBuyerVerificationAction}>
            <input type="hidden" name="back" value={qs({ page: String(list.page) })} />
            <div className="mb-3 border-y border-line-soft py-2.5">
              <BulkBar
                choices={[
                  { value: 'VERIFIED', label: 'Approve', tone: 'ok' },
                  { value: 'UNDER_REVIEW', label: 'Send for Review', tone: 'info' },
                  { value: 'REJECTED', label: 'Reject', tone: 'danger' },
                ]}
              />
            </div>

            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No records match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold"><span className="sr-only">Select</span></th>
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">User / Company</th>
                      <th className="px-2 py-2.5 font-semibold">Type</th>
                      <th className="px-2 py-2.5 font-semibold">Industry</th>
                      <th className="px-2 py-2.5 font-semibold">Location</th>
                      <th className="px-2 py-2.5 font-semibold">Submitted On</th>
                      <th className="px-2 py-2.5 font-semibold">Documents</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((r, i) => <QueueTr key={r.id} r={r} n={start + i} />)}
                  </tbody>
                </table>
              </div>
            )}
            </form>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} records</p>
              <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            </div>
          </section>
        </div>

        {/* right sidebar */}
        <div className="w-[300px] shrink-0 space-y-5">
          <Panel title="Verification Status">
            <div className="flex items-center gap-4 pt-1">
              <StatusDonut slices={overview.statusDonut.slices} centerValue={overview.statusDonut.centerValue} centerLabel={overview.statusDonut.centerLabel} />
              <ul className="min-w-0 flex-1 space-y-2">
                {overview.statusDonut.slices.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
                    <span className="tabular shrink-0 font-semibold text-ink">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="Users by Type">
            <ul className="space-y-2.5">
              {overview.usersByType.map((u) => (
                <li key={u.label} className="flex items-center gap-2.5">
                  <span className="w-[92px] shrink-0 truncate text-[11.5px] text-ink-2">{u.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full" style={{ width: `${(u.value / maxType) * 100}%`, backgroundColor: u.color }} /></span>
                  <span className="tabular w-8 shrink-0 text-right text-[11.5px] font-semibold text-ink">{u.value}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top Document Issues">
            <ul className="space-y-2.5">
              {overview.topIssues.map((iss) => (
                <li key={iss.label} className="flex items-center gap-2.5">
                  <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">{iss.label}</span>
                  <span className="tabular shrink-0 text-[11.5px] font-semibold text-ink">{iss.value.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Recent Verification Activity" action={<ViewAll href="/admin/user-activity" />}>
            <ul className="space-y-3">
              {overview.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{r.name}</span>
                    <span className={'block truncate text-[11px] font-medium ' + r.tone}>{r.verb}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(r.at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* quick actions */}
      <section className="rise rise-3 grid grid-cols-4 gap-3">
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


function StatusDonut({ slices, centerValue, centerLabel }: { slices: { label: string; value: number; color: string; pct: number }[]; centerValue: number; centerLabel: string }) {
  const size = 120, stroke = 18, r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r
  const total = slices.reduce((a, s) => a + s.value, 0)
  let offset = 0
  const arcs = slices.map((s) => {
    const len = total > 0 ? (s.value / total) * circ : 0
    const a = { color: s.color, dash: len, offset }
    offset += len
    return a
  })
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={stroke} strokeDasharray={`${a.dash} ${circ - a.dash}`} strokeDashoffset={-a.offset} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-[20px] font-bold leading-none text-ink">{centerValue.toLocaleString('en-IN')}</span>
        <span className="mt-0.5 text-[10px] text-ink-4">{centerLabel}</span>
      </div>
    </div>
  )
}

function QueueTr({ r, n }: { r: QueueRow; n: number }) {
  const initials = r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <tr className="text-[12px] row-hover">
      <td className="px-2 py-2.5"><input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.name}`} className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' + (r.type === 'Company' ? 'bg-[#F3EAFE] text-[#8B5CF6]' : 'bg-brand-soft text-brand')}>{r.type === 'Company' ? <Icon name="building" className="h-4 w-4" /> : initials}</span>
          <span className="min-w-0"><Link href={`/admin/users/${r.id}`} className="block max-w-[170px] truncate font-semibold text-ink hover:text-brand">{r.name}</Link><span className="block max-w-[170px] truncate text-[10.5px] text-ink-4">{r.email}</span></span>
        </div>
      </td>
      <td className="px-2 py-2.5"><span className={'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ' + (r.type === 'Company' ? 'bg-[#F3EAFE] text-[#8B5CF6]' : 'bg-[#EEF1FF] text-[#2563EB]')}>{r.type}</span></td>
      <td className="px-2 py-2.5 text-ink-2">{r.industry ?? '—'}</td>
      <td className="px-2 py-2.5"><span className="flex items-center gap-1 text-ink-2"><Icon name="map" className="h-3 w-3 shrink-0 text-ink-4" />{r.city ?? '—'}</span></td>
      <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{fmtDate(r.submittedAt)}</td>
      <td className="px-2 py-2.5">
        <span className="flex items-center gap-1.5 text-ink-3">
          <Icon name="file" className="h-3.5 w-3.5 text-brand" />
          <Icon name="file" className="h-3.5 w-3.5 text-ink-4" />
          <span className="tabular font-semibold text-ink">{r.documents}</span>
        </span>
      </td>
      <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${r.statusPill}`}>{r.statusLabel}</span></td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {r.status !== 'VERIFIED' && (
            <button type="submit" name="row" value={`${r.id}:VERIFIED`} title={`Approve ${r.name}`} className="flex h-7 items-center rounded-md bg-ok-soft px-2 text-[11px] font-semibold text-ok hover:opacity-80">Approve</button>
          )}
          {r.status !== 'REJECTED' && (
            <button type="submit" name="row" value={`${r.id}:REJECTED`} title={`Reject ${r.name}`} className="flex h-7 items-center rounded-md bg-danger-soft px-2 text-[11px] font-semibold text-danger hover:opacity-80">Reject</button>
          )}
        </div>
      </td>
    </tr>
  )
}

const QUICK: { label: string; hint: string; icon: IconName; href: string; bg: string; fg: string }[] = [
  { label: 'Verification Guidelines', hint: 'View verification policy & rules', icon: 'file', href: '/admin/visitors/verification/settings', bg: '#EEF1FF', fg: '#6366F1' },
  { label: 'Pending Accounts', hint: 'Everything still waiting on a decision', icon: 'shield', href: '/admin/visitors/verification?status=PENDING', bg: '#E7F7EE', fg: '#16A34A' },
  { label: 'Under Review', hint: 'Accounts sent for a second look', icon: 'users', href: '/admin/visitors/verification?tab=review', bg: '#F3EAFE', fg: '#8B5CF6' },
  { label: 'Rejected Users', hint: 'View and manage rejected accounts', icon: 'alert', href: '/admin/visitors/verification?tab=rejected', bg: '#FEE9E1', fg: '#EA580C' },
]
