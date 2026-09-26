import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { GRANTABLE_KEYS } from '@/config/permissions'
import { employeeOverview } from '@/lib/employee-panel'
import { PageHeading } from '@/components/dashboard-shell'
import { Icon, type IconName } from '@/components/ui'

export const metadata: Metadata = { title: 'Employee Dashboard' }
export const dynamic = 'force-dynamic'

/**
 * The RM's home: their open leads, the unrouted enquiries waiting in their
 * territory, the PACT holders and complaints there — every number scoped to
 * the territory set on their account.
 */
export default async function EmployeeDashboardPage() {
  const user = await requireRole('RM_EMPLOYEE')
  const d = await employeeOverview(user.id)
  const hasAdmin = user.permissions.some((p) => GRANTABLE_KEYS.has(p))

  const cards: { label: string; value: number; hint: string; icon: IconName; href: string; tone: string }[] = [
    { label: 'My open leads', value: d.mine, hint: 'assigned to you', icon: 'inbox', href: '/dashboard/employee/leads', tone: 'bg-info-soft text-info' },
    { label: 'Unrouted in my area', value: d.unrouted, hint: 'need a holder', icon: 'alert', href: '/dashboard/employee/leads?tab=unrouted', tone: 'bg-warn-soft text-warn' },
    { label: 'Converted this month', value: d.convertedMonth, hint: 'by you', icon: 'check', href: '/dashboard/employee/leads?tab=done', tone: 'bg-ok-soft text-ok' },
    { label: 'PACT holders', value: d.holders, hint: 'active in your area', icon: 'map', href: '/dashboard/employee/pact-holders', tone: 'bg-brand-soft text-brand' },
    { label: 'Open complaints', value: d.complaints, hint: 'in your area', icon: 'shield', href: '/dashboard/employee/complaints', tone: 'bg-danger-soft text-danger' },
  ]

  return (
    <div className="space-y-5">
      <PageHeading title={`Welcome, ${user.name?.split(' ')[0] ?? 'there'}`} />

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-card">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="map" className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-ink-3">Your territory</span>
          <span className="block text-[13.5px] font-semibold text-ink">{d.territory.label}</span>
        </span>
        {d.tickets > 0 && hasAdmin && (
          <Link href="/admin/support?tab=mine" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-brand hover:text-brand">{d.tickets} support ticket{d.tickets === 1 ? '' : 's'}</Link>
        )}
        {hasAdmin && (
          <Link href="/admin" className="flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white"><Icon name="shield" className="h-4 w-4" /> Open admin panel</Link>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card-hover rounded-card border border-line bg-white p-4 shadow-card">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}><Icon name={c.icon} className="h-[18px] w-[18px]" /></span>
            <p className="tabular mt-3 font-display text-[24px] font-bold leading-none text-ink">{c.value.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-[12px] font-medium text-ink-2">{c.label}</p>
            <p className="text-[11px] text-ink-4">{c.hint}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-card border border-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold text-ink">My leads</h2>
          <Link href="/dashboard/employee/leads" className="text-[12px] font-semibold text-brand hover:underline">View all ›</Link>
        </div>
        {d.recentMine.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-3">No leads are assigned to you right now.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {d.recentMine.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{l.subject}</span>
                  <span className="block text-[11.5px] text-ink-3">{l.contactName} · PIN {l.pincode}</span>
                </span>
                <span className="shrink-0 rounded-pill bg-paper-3 px-2 py-0.5 text-[11px] font-semibold capitalize text-ink-3">{l.status.toLowerCase().replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
