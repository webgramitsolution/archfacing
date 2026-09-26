import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel, fmtDate } from '@/components/admin/parts'
import { PlanCard, type PlanView } from './plan-editor'

export const metadata: Metadata = { title: 'Subscription & Plans' }
export const dynamic = 'force-dynamic'

/**
 * Subscription & Plans — the Bronze / Silver / Gold plans members buy from
 * /dashboard/membership. Edits here are what that page sells next; the
 * numbers beside each plan are counted from real Subscription rows.
 */
export default async function AdminPlansPage() {
  await requirePermission('admin:plans')
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86_400_000)

  const [plans, activeByPlan, soldByPlan, active, expiring, recent] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.subscription.groupBy({ by: ['planId'], where: { status: 'ACTIVE', expiresAt: { gte: now } }, _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ['planId'], _sum: { price: true } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gte: now } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gte: now, lte: in30 } } }),
    prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, planName: true, price: true, startsAt: true, expiresAt: true, status: true, user: { select: { id: true, name: true, role: true } } },
    }),
  ])
  const activeOf = new Map(activeByPlan.map((r) => [r.planId, r._count._all]))
  const soldOf = new Map(soldByPlan.map((r) => [r.planId, Number(r._sum.price ?? 0)]))
  const totalSold = [...soldOf.values()].reduce((a, b) => a + b, 0)

  const views: PlanView[] = plans.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, price: Number(p.price), months: p.months,
    taxPercent: Number(p.taxPercent), pactTerritories: p.pactTerritories, benefits: p.benefits,
    isActive: p.isActive, isPopular: p.isPopular, sortOrder: p.sortOrder,
    activeSubs: activeOf.get(p.id) ?? 0, revenue: soldOf.get(p.id) ?? 0,
  }))

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Subscription & Plans"
        action={<Link href="/dashboard/membership" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4">See the member page</Link>}
      />

      <section className="grid grid-cols-4 gap-4">
        <MiniStat icon="users" label="Active members" value={active} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="on a paid plan today" />
        <MiniStat icon="calendar" label="Renewing in 30 days" value={expiring} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint="expire soon" />
        <MiniStat icon="rupee" label="Plan sales" value={'₹' + Math.round(totalSold).toLocaleString('en-IN')} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="all subscriptions, pre-tax" />
        <MiniStat icon="tag" label="Plans on sale" value={plans.filter((p) => p.isActive).length} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint={`${plans.length} defined`} />
      </section>

      {views.length === 0 ? (
        <Panel title="Plans"><p className="py-8 text-center text-[13px] text-ink-3">No plans exist yet — run the plans seed.</p></Panel>
      ) : (
        <section className="grid grid-cols-3 gap-5">{views.map((p) => <PlanCard key={p.id} p={p} />)}</section>
      )}

      <Panel title="Latest subscriptions">
        {recent.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-3">Nobody has bought a plan yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                <th className="py-2 font-semibold">Member</th><th className="py-2 font-semibold">Plan</th><th className="py-2 font-semibold">Paid</th>
                <th className="py-2 font-semibold">From</th><th className="py-2 font-semibold">Until</th><th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {recent.map((s) => {
                const live = s.status === 'ACTIVE' && s.expiresAt >= now
                return (
                  <tr key={s.id} className="text-[12.5px]">
                    <td className="py-2.5"><Link href={`/admin/users/${s.user.id}`} className="font-medium text-ink hover:text-brand">{s.user.name}</Link><span className="block text-[10.5px] capitalize text-ink-4">{s.user.role.toLowerCase().replace('_', ' ')}</span></td>
                    <td className="py-2.5 text-ink-2">{s.planName}</td>
                    <td className="tabular py-2.5 text-ink-2">₹{Number(s.price).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-ink-3">{fmtDate(s.startsAt)}</td>
                    <td className="py-2.5 text-ink-3">{fmtDate(s.expiresAt)}</td>
                    <td className="py-2.5"><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (live ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{live ? 'Active' : s.status === 'ACTIVE' ? 'Expired' : s.status.toLowerCase()}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
