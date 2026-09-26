import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'

export const metadata: Metadata = { title: 'Area Analytics' }
export const dynamic = 'force-dynamic'

const ANSWERED = ['RESPONDED', 'CONVERTED', 'CLOSED'] as const
const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/**
 * One row per PACT this BMF holds: the leads that seat brought in, how many
 * were answered, the members registered in that PIN code and the projects
 * published there (the demand a materials supplier sells into). Every number
 * is a count of real rows scoped to the BMF's own PACTs.
 */
export default async function AreaAnalyticsPage() {
  const me = await requireRole('BMF')
  const pacts = await prisma.pact.findMany({
    where: { holderId: me.id, status: { in: ['ACTIVE', 'SUSPENDED'] } },
    orderBy: { purchasedAt: 'asc' },
    select: { id: true, pincode: true, city: true, state: true, status: true, expiresAt: true, lastResponseAt: true, complaintCount: true },
  })
  const pins = [...new Set(pacts.map((p) => p.pincode))]
  const ids = pacts.map((p) => p.id)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const [leads, leadsMonth, answered, members, projects] = ids.length
    ? await Promise.all([
        prisma.leadRecipient.groupBy({ by: ['pactId'], where: { pactId: { in: ids }, recipientId: me.id }, _count: { _all: true } }),
        prisma.leadRecipient.groupBy({ by: ['pactId'], where: { pactId: { in: ids }, recipientId: me.id, createdAt: { gte: monthStart } }, _count: { _all: true } }),
        prisma.leadRecipient.groupBy({ by: ['pactId'], where: { pactId: { in: ids }, recipientId: me.id, deliveryStatus: { in: [...ANSWERED] } }, _count: { _all: true } }),
        prisma.user.groupBy({ by: ['pincode', 'role'], where: { pincode: { in: pins }, deletedAt: null, status: 'ACTIVE', NOT: { id: me.id } }, _count: { _all: true } }),
        prisma.post.groupBy({ by: ['pincode'], where: { pincode: { in: pins }, type: 'PROJECT', status: 'PUBLISHED', deletedAt: null }, _count: { _all: true } }),
      ])
    : [[], [], [], [], []]

  const byPact = (rows: { pactId: string | null; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.pactId, r._count._all]))
  const L = byPact(leads), LM = byPact(leadsMonth), A = byPact(answered)
  const P = new Map(projects.map((r) => [r.pincode, r._count._all]))
  const memberCount = (pin: string, role: string) => members.find((m) => m.pincode === pin && m.role === role)?._count._all ?? 0

  const totals = {
    leads: [...L.values()].reduce((a, b) => a + b, 0),
    month: [...LM.values()].reduce((a, b) => a + b, 0),
    answered: [...A.values()].reduce((a, b) => a + b, 0),
    pros: pins.reduce((n, p) => n + memberCount(p, 'PROFESSIONAL') + memberCount(p, 'CONSULTANT'), 0),
  }

  return (
    <div className="space-y-5">
      <PageHeading title="Area Analytics" />

      {pacts.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-ink">You do not hold a PACT yet</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Area analytics appear once you hold a PIN code territory.</p>
          <Link href="/dashboard/bmf/pact" className="btn-primary mt-4 inline-flex px-4 py-2 text-[13px]">Get a PACT</Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Territories', pacts.length, `${pacts.filter((p) => p.status === 'ACTIVE').length} active`],
              ['Leads from PACT', totals.leads, `${totals.month} this month`],
              ['Answered', totals.leads ? `${Math.round((totals.answered / totals.leads) * 100)}%` : '—', `${totals.answered} of ${totals.leads}`],
              ['Designers in area', totals.pros, 'professionals + consultants'],
            ].map(([label, value, hint]) => (
              <div key={String(label)} className="rounded-card border border-line bg-white p-4 shadow-card">
                <p className="text-[12px] text-ink-3">{label}</p>
                <p className="tabular mt-1 font-display text-[22px] font-bold text-ink">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
                <p className="text-[11.5px] text-ink-4">{hint}</p>
              </div>
            ))}
          </section>

          <section className="card overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-2.5">PIN code</th>
                  <th className="px-4 py-2.5">Leads</th>
                  <th className="px-4 py-2.5">Answered</th>
                  <th className="px-4 py-2.5">Professionals</th>
                  <th className="px-4 py-2.5">Consultants</th>
                  <th className="px-4 py-2.5">Live projects</th>
                  <th className="px-4 py-2.5">Last reply</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {pacts.map((p) => {
                  const total = L.get(p.id) ?? 0
                  const ans = A.get(p.id) ?? 0
                  return (
                    <tr key={p.id} className="border-b border-line-soft last:border-0">
                      <td className="px-4 py-3">
                        <span className="tabular font-mono font-semibold text-ink">{p.pincode}</span>
                        <span className="block text-[11.5px] text-ink-3">{[p.city, p.state].filter(Boolean).join(', ')}</span>
                      </td>
                      <td className="tabular px-4 py-3 text-ink">
                        <Link href={`/dashboard/bmf/enquiries?pincode=${p.pincode}`} className="font-semibold hover:text-brand">{total}</Link>
                        <span className="block text-[11px] text-ink-4">{LM.get(p.id) ?? 0} this month</span>
                      </td>
                      <td className="tabular px-4 py-3 text-ink-2">{total ? `${Math.round((ans / total) * 100)}%` : '—'}</td>
                      <td className="tabular px-4 py-3 text-ink-2">{memberCount(p.pincode, 'PROFESSIONAL')}</td>
                      <td className="tabular px-4 py-3 text-ink-2">{memberCount(p.pincode, 'CONSULTANT')}</td>
                      <td className="tabular px-4 py-3 text-ink-2">{P.get(p.pincode) ?? 0}</td>
                      <td className="px-4 py-3 text-[12px] text-ink-3">{fmt(p.lastResponseAt)}</td>
                      <td className="px-4 py-3">
                        <span className={p.status === 'ACTIVE' ? 'pill-ok' : 'pill-warn'}>{p.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span>
                        {p.complaintCount > 0 && <span className="block text-[11px] text-danger">{p.complaintCount} complaint{p.complaintCount === 1 ? '' : 's'}</span>}
                        <span className="block text-[11px] text-ink-4">until {fmt(p.expiresAt)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
          <p className="text-[12px] text-ink-3">
            A PACT is suspended when a lead waits unanswered for 30 days — keep “Answered” high. See{' '}
            <Link href="/dashboard/bmf/professionals" className="font-semibold text-brand hover:underline">Professionals in Area</Link> for who they are.
          </p>
        </>
      )}
    </div>
  )
}
