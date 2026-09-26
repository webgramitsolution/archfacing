import type { Metadata } from 'next'
import Link from 'next/link'

import { requirePermission } from '@/lib/guard'
import { ACCESS_TEMPLATES, GRANTABLE } from '@/config/permissions'
import { Icon, type IconName } from '@/components/ui'
import { AreaTrendChart, DonutChart } from '@/components/admin/charts'
import {
  AdminStatCard, Panel, ViewAll, Select, Pagination,
} from '@/components/admin/parts'
import { rolesOverview, type RoleRow } from '@/lib/admin-roles'

export const metadata: Metadata = { title: 'Role Permissions' }
export const dynamic = 'force-dynamic'

type SP = { tab?: string; status?: string; q?: string; page?: string }

export default async function RolePermissionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('admin:users')
  const sp = await searchParams
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)
  const perPage = 10

  const overview = await rolesOverview()

  // The role set is small and fixed — filter and paginate in memory.
  let roles = overview.roles
  if (tab === 'system') roles = roles.filter((r) => r.type === 'System')
  else if (tab === 'custom') roles = roles.filter((r) => r.type === 'Custom')
  if (sp.status && sp.status !== 'all') {
    if (sp.status === 'active') roles = roles.filter((r) => r.active)
    else if (sp.status === 'inactive') roles = roles.filter((r) => !r.active)
  }
  if (sp.q) {
    const q = sp.q.toLowerCase()
    roles = roles.filter((r) => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }

  const total = roles.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const pageRoles = roles.slice((page - 1) * perPage, page * perPage)
  const start = total === 0 ? 0 : (page - 1) * perPage + 1
  const end = Math.min(total, page * perPage)

  const qs = (over: Partial<SP>) => {
    const merged: SP = { tab, status: sp.status, q: sp.q, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `/admin/role-permissions?${s}` : '/admin/role-permissions'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Role Permissions</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Manage user roles and control module-wise access permissions across the platform.
          </p>
        </div>
        <Link href="/admin/employees" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover">
          <Icon name="plus" className="h-4 w-4" /> Create New Role
        </Link>
      </div>

      <section className="grid grid-cols-5 gap-4">
        {overview.stats.map((m) => (
          <AdminStatCard key={m.key} icon={m.icon} label={m.label} value={m.value} trend={m.trend} tint={m.tint} />
        ))}
      </section>

      <section className="grid grid-cols-[1.5fr_1fr_1fr] gap-5">
        <Panel title="Role Assignment Trend" action={<span className="text-[11.5px] font-medium text-ink-3">Last 30 days</span>}>
          <AreaTrendChart labels={overview.trend.labels} points={overview.trend.points} color="#6366F1" everyNthLabel={4} />
        </Panel>
        <Panel title="Users by Role">
          <div className="pt-2">
            <DonutChart total={overview.usersByRole.total} slices={overview.usersByRole.slices} centerLabel="Total Users" showCounts stacked />
          </div>
        </Panel>
        <Panel title="Permission Distribution">
          <div className="pt-2">
            <DonutChart total={overview.permissionDist.total} slices={overview.permissionDist.slices} centerLabel="Grants" stacked />
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
              <label className="relative min-w-[240px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  name="q"
                  defaultValue={sp.q ?? ''}
                  placeholder="Search roles by name or description…"
                  className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
              </label>
              <Select
                name="status"
                value={sp.status}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">
                <Icon name="settings" className="h-3.5 w-3.5" /> Filter
              </button>
              <Link href={qs({ tab, status: 'all', q: '', page: '1' })} className="flex h-9 items-center rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:bg-paper-3">
                Reset
              </Link>
            </form>

            {pageRoles.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No roles match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-2 py-2.5 font-semibold">#</th>
                      <th className="px-2 py-2.5 font-semibold">Role Name</th>
                      <th className="px-2 py-2.5 font-semibold">Type</th>
                      <th className="px-2 py-2.5 font-semibold">Description</th>
                      <th className="px-2 py-2.5 font-semibold">Users Assigned</th>
                      <th className="px-2 py-2.5 font-semibold">Permissions</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {pageRoles.map((r, i) => (
                      <RoleTr key={r.role} r={r} n={start + i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">
                Showing {start} to {end} of {total.toLocaleString('en-IN')} roles
              </p>
              <Pagination page={page} pages={pages} makeHref={(n) => qs({ page: String(n) })} />
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

          <Panel title="Role Templates" action={<ViewAll href="/admin/employees" />}>
            <ul className="space-y-2">
              {ACCESS_TEMPLATES.map((t, i) => {
                const look = TEMPLATE_LOOK[i % TEMPLATE_LOOK.length]
                return (
                  <li key={t.key} className="flex items-center gap-2.5 rounded-lg border border-line-soft p-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: look.tint, color: look.fg }}>
                      <Icon name={look.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{t.label}</span>
                      <span className="block truncate text-[10.5px] text-ink-3" title={t.keys.map((k) => GRANTABLE.find((g) => g.key === k)?.label).join(', ')}>
                        {t.sub} · {overview.templateUse[t.key] ?? 0} staff
                      </span>
                    </span>
                    <Link href={`/admin/employees/add?template=${t.key}`} className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-soft">
                      Use
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <div className="rounded-card border border-line bg-[#EEF1FF] p-5 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <p className="mt-2.5 font-display text-[13.5px] font-bold text-ink">Access Control Best Practices</p>
            <p className="mt-1 text-[11.5px] text-ink-3">
              Follow security best practices to manage roles and permissions effectively.
            </p>
            <Link href="/admin/settings" className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-hover">
              View Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function RoleTr({ r, n }: { r: RoleRow; n: number }) {
  return (
    <tr className="text-[12px]">
      <td className="px-2 py-2.5 text-ink-4">{n}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon name={r.icon} className="h-4 w-4" />
          </span>
          <span className="truncate font-semibold text-ink">{r.label}</span>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <span className={
          'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ' +
          (r.type === 'System' ? 'bg-[#EEF1FF] text-[#6366F1]' : 'bg-[#F3EAFE] text-[#8B5CF6]')
        }>
          {r.type}
        </span>
      </td>
      <td className="px-2 py-2.5 text-ink-2">{r.description}</td>
      <td className="tabular px-2 py-2.5 font-semibold text-ink">{r.users.toLocaleString('en-IN')}</td>
      <td className="tabular px-2 py-2.5 text-ink-2">{r.permissions}</td>
      <td className="px-2 py-2.5">
        <span className={
          'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ' +
          (r.active ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')
        }>
          {r.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1 text-ink-4">
          {/* Roles are defined in code; the one real thing to open is who holds it. */}
          <Link href={`/admin/users?role=${r.role}`} title="People with this role" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3.5 w-3.5" /></Link>
        </div>
      </td>
    </tr>
  )
}

const QUICK: { label: string; icon: IconName; href: string }[] = [
  { label: 'Add Employee', icon: 'plus', href: '/admin/employees/add' },
  { label: 'Employees & Access', icon: 'shield', href: '/admin/employees' },
  { label: 'Verification Rules', icon: 'file', href: '/admin/visitors/verification/settings' },
  { label: 'All Users', icon: 'users', href: '/admin/users' },
  { label: 'Export Staff', icon: 'download', href: '/admin/users/export?role=SUPER_ADMIN,ADMIN,ADMIN_SELLER,RM_EMPLOYEE' },
]

const TEMPLATE_LOOK: { icon: IconName; tint: string; fg: string }[] = [
  { icon: 'target', tint: '#EAF2FF', fg: '#2563EB' }, { icon: 'file', tint: '#EEF1FF', fg: '#6366F1' },
  { icon: 'star', tint: '#FCE7F3', fg: '#DB2777' }, { icon: 'help', tint: '#E3F6F5', fg: '#0D9488' },
  { icon: 'rupee', tint: '#E7F7EE', fg: '#16A34A' }, { icon: 'eye', tint: '#FEF7E0', fg: '#D97706' },
]
