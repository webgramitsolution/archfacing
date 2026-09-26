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
  employeesOverview, listEmployeesPaged, employeeDepartments,
  type EmployeeRow, type EmpStat,
} from '@/lib/admin-employees'

export const metadata: Metadata = { title: 'Employees' }
export const dynamic = 'force-dynamic'

const TINT: Record<string, { bg: string; fg: string }> = {
  total: { bg: '#EEF1FF', fg: '#6366F1' },
  active: { bg: '#E7F7EE', fg: '#16A34A' },
  inactive: { bg: '#FFE9EC', fg: '#E11D48' },
  leave: { bg: '#FEF2E2', fg: '#EA9412' },
  field: { bg: '#F3EAFE', fg: '#8B5CF6' },
  remote: { bg: '#E3F6F5', fg: '#0D9488' },
}

type SP = { tab?: string; department?: string; role?: string; status?: string; q?: string; page?: string }

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:employees')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const [overview, list, depts] = await Promise.all([
    employeesOverview(),
    listEmployeesPaged({ tab, department: sp.department, role: sp.role, status: sp.status, q: sp.q, page, perPage: 10 }),
    employeeDepartments(),
  ])

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, department: sp.department, role: sp.role, status: sp.status, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.department && merged.department !== 'all') p.set('department', merged.department)
    if (merged.role && merged.role !== 'all') p.set('role', merged.role)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/employees?${s}` : '/admin/employees'
  }

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <nav className="rise flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Employees</span>
      </nav>

      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Employees</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Manage platform employees, roles, departments, PACT assignments and performance.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/admin/users/import?kind=RM_EMPLOYEE" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink"><Icon name="download" className="h-4 w-4 rotate-180 text-ink-4" /> Import Employees</Link>
          <a href="/admin/users/export?role=RM_EMPLOYEE" download className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink"><Icon name="download" className="h-4 w-4 text-ink-4" /> Export</a>
          <Link href="/admin/employees/add" className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"><Icon name="plus" className="h-4 w-4" /> Add Employee</Link>
        </div>
      </div>

      {/* 6 stat cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {overview.stats.map((m) => <StatCard key={m.key} m={m} />)}
      </section>

      {/* table + rail */}
      <div className="rise rise-2 flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-3">
          {/* tabs */}
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line">
            {overview.tabs.map((t) => {
              const on = tab === t.key
              return (
                <Link key={t.key} href={qs({ tab: t.key, page: '1' })}
                  className={'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors ' + (on ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}>
                  {t.label} <span className="tabular text-ink-4">({t.count.toLocaleString('en-IN')})</span>
                </Link>
              )
            })}
          </div>

          <section className="rounded-card border border-line bg-white p-4 shadow-card">
            {/* toolbar */}
            <form method="get" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <label className="relative min-w-[200px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
                <input name="q" defaultValue={sp.q ?? ''} placeholder="Search by name, email, employee ID, department…" className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              </label>
              <FilterSelect name="department" value={sp.department} placeholder="Department" options={depts.map((d) => ({ value: d, label: d }))} />
              <FilterSelect name="role" value={sp.role} placeholder="Role" options={[{ value: 'RM', label: 'RM' }, { value: 'Employee', label: 'Employee' }, { value: 'Manager', label: 'Manager' }, { value: 'Admin', label: 'Admin' }]} />
              <FilterSelect name="status" value={sp.status} placeholder="Status" options={[{ value: 'active', label: 'Active' }, { value: 'leave', label: 'On Leave' }, { value: 'inactive', label: 'Inactive' }]} />
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
              <BulkBar choices={[{ value: 'ACTIVATE', label: 'Activate', tone: 'ok' }, { value: 'SUSPEND', label: 'Suspend', tone: 'danger' }]} />
            </div>

            {/* table */}
            {list.rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No employees match these filters.</p>
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold"><span className="sr-only">Select</span></th>
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">Employee</th>
                      <th className="px-2 py-2.5 font-semibold">Employee ID</th>
                      <th className="px-2 py-2.5 font-semibold">Department</th>
                      <th className="px-2 py-2.5 font-semibold">Designation</th>
                      <th className="px-2 py-2.5 font-semibold">Location</th>
                      <th className="px-2 py-2.5 font-semibold">PACT Area</th>
                      <th className="px-2 py-2.5 font-semibold">Role</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Joining Date</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((e, i) => <EmpTr key={e.id} e={e} n={start + i} />)}
                  </tbody>
                </table>
              </div>
            )}
            </form>

            {/* pagination */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} employees</p>
              <Pagination page={list.page} pages={list.pages} qs={qs} />
            </div>
          </section>
        </div>

        {/* right rail */}
        <div className="w-[290px] shrink-0 space-y-4">
          <Panel title="Employee Distribution">
            <DonutChart total={overview.distribution.total} slices={overview.distribution.slices} centerLabel="Total Employees" stacked />
          </Panel>

          <Panel title="Employees by Location">
            {overview.byLocation.rows.length === 0 ? <p className="py-4 text-center text-[12px] text-ink-3">No location data.</p> : (
              <ul className="space-y-2">
                {overview.byLocation.rows.map((r) => (
                  <li key={r.label} className="flex items-center gap-2">
                    <span className="w-[70px] shrink-0 truncate text-[11px] text-ink-2">{r.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${(r.value / overview.byLocation.max) * 100}%` }} /></span>
                    <span className="tabular w-7 shrink-0 text-right text-[11px] font-semibold text-ink">{r.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Upcoming Leave" action={<Link href="/admin/employees?tab=leave" className="text-[11px] font-semibold text-brand hover:underline">View All</Link>}>
            {overview.upcomingLeave.length === 0 ? <p className="py-4 text-center text-[12px] text-ink-3">No upcoming leave.</p> : (
              <ul className="space-y-3">
                {overview.upcomingLeave.map((l, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                      {l.photo ? <Image src={l.photo} alt="" fill sizes="28px" className="object-cover" /> : l.name[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-ink">{l.name}</span>
                      <span className="block truncate text-[10px] text-ink-4">{fmtRange(l.from, l.to)}</span>
                    </span>
                    <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[9.5px] font-semibold ${LEAVE_PILL[l.type] ?? 'bg-paper-3 text-ink-3'}`}>{l.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* quick actions */}
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

function StatCard({ m }: { m: EmpStat }) {
  const tint = TINT[m.key] ?? { bg: '#EEF1FF', fg: '#6366F1' }
  return (
    <div className="rounded-card border border-line bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint.bg, color: tint.fg }}><Icon name={m.icon} className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 truncate text-[11px] leading-tight text-ink-3">{m.label}</span>
      </div>
      <p className="tabular mt-2.5 font-display text-[22px] font-bold leading-none tracking-tight text-ink">{m.value.toLocaleString('en-IN')}</p>
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
const LEVEL_PILL: Record<string, string> = {
  RM: 'bg-[#E4EEFF] text-[#2563EB]',
  Employee: 'bg-paper-3 text-ink-2',
  Manager: 'bg-[#F3EAFE] text-[#8B5CF6]',
  Admin: 'bg-[#FFE9EC] text-[#E11D48]',
}
const LEAVE_PILL: Record<string, string> = {
  'Sick Leave': 'bg-[#FFE9EC] text-[#E11D48]',
  'Casual Leave': 'bg-[#E4EEFF] text-[#2563EB]',
  'Annual Leave': 'bg-[#FEF2E2] text-[#EA9412]',
}

function EmpTr({ e, n }: { e: EmployeeRow; n: number }) {
  const s = e.onLeave ? { cls: 'bg-warn-soft text-warn', label: 'On Leave' } : (STATUS[e.status] ?? { cls: 'bg-paper-3 text-ink-3', label: e.status })
  return (
    <tr className="row-hover text-[12px]">
      <td className="px-2 py-2.5"><input type="checkbox" name="ids" value={e.id} aria-label={`Select ${e.name}`} className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[11px] font-bold text-brand">
            {e.photo ? <Image src={e.photo} alt="" fill sizes="32px" className="object-cover" /> : e.name[0]?.toUpperCase()}
          </span>
          <span className="min-w-0"><Link href={`/admin/users/${e.id}`} className="block truncate font-semibold text-ink hover:text-brand">{e.name}</Link><span className="block truncate text-[10.5px] text-ink-4">{e.email}</span></span>
        </div>
      </td>
      <td className="tabular px-2 py-2.5 font-mono text-[11.5px] text-ink-2">{e.code}</td>
      <td className="px-2 py-2.5 text-ink-2">{e.department}</td>
      <td className="px-2 py-2.5 text-ink-2">{e.designation}</td>
      <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1 text-ink-2"><Icon name="map" className="h-3 w-3 text-ink-4" />{e.location}</span></td>
      <td className="tabular px-2 py-2.5 font-mono text-[11.5px] text-ink-2">{e.pactCode}</td>
      <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${LEVEL_PILL[e.level] ?? 'bg-paper-3 text-ink-2'}`}>{e.level}</span></td>
      <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${s.cls}`}>{s.label}</span></td>
      <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{e.joinedAt ? fmtDate(e.joinedAt) : '—'}</td>
      <td className="px-2 py-2.5"><div className="flex items-center justify-end text-ink-4"><span aria-hidden="true">—</span></div></td>
    </tr>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-[13.5px] font-bold text-ink">{title}</h2>{action}</div>
      {children}
    </section>
  )
}
function FilterSelect({ name, value, placeholder, options }: { name: string; value?: string; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <select name={name} defaultValue={value ?? 'all'} className="h-9 max-w-[140px] rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink-2 focus:border-brand focus:outline-none">
      <option value="all">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
function Pagination({ page, pages, qs }: { page: number; pages: number; qs: (o: Partial<SP>) => string }) {
  const nums: number[] = []
  const from = Math.max(1, page - 2)
  const to = Math.min(pages, from + 4)
  for (let i = from; i <= to; i++) nums.push(i)
  return (
    <div className="flex items-center gap-1">
      <PageLink href={page > 1 ? qs({ page: String(page - 1) }) : undefined}>‹</PageLink>
      {nums.map((nn) => <Link key={nn} href={qs({ page: String(nn) })} className={'tabular flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-medium ' + (nn === page ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-3')}>{nn}</Link>)}
      {to < pages && <span className="px-1 text-[11px] text-ink-4">… {pages}</span>}
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
  { title: 'Add New Employee', sub: 'Create a new employee account', icon: 'user', href: '/admin/employees/add', tint: { bg: '#EEF1FF', fg: '#6366F1' } },
  { title: 'Export Employees', sub: 'Download the employee list (CSV)', icon: 'grid', href: '/admin/users/export?role=RM_EMPLOYEE', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  { title: 'Assign PACT Areas', sub: 'Map employees to PACT areas', icon: 'map', href: '/admin/pact', tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  { title: 'Employee Activity', sub: 'What staff did, when', icon: 'file', href: '/admin/user-activity', tint: { bg: '#FFEEE0', fg: '#F97316' } },
  { title: 'Bulk Import', sub: 'Import employees from a CSV', icon: 'download', href: '/admin/users/import?kind=RM_EMPLOYEE', tint: { bg: '#E7F7EE', fg: '#16A34A' } },
  { title: 'Access & Permissions', sub: 'Manage employee access', icon: 'shield', href: '/admin/role-permissions', tint: { bg: '#FFE9EC', fg: '#E11D48' } },
]

function fmtDate(d: Date): string { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtRange(a: Date, b: Date): string {
  const f = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return `${f(a)} - ${f(b)}`
}
