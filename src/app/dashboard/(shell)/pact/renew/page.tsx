import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { BUSINESS_RULES, can, termYears } from '@/config/permissions'
import { renewalOpen } from '@/lib/pact'
import { serviceLabel } from '@/lib/my-pact'
import { RenewPactButton } from '../../../pact-renew'

export const metadata: Metadata = { title: 'Renew PACT' }
export const dynamic = 'force-dynamic'

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/** Where the expiry reminders point: every PACT the holder has, and what renewing each would do. */
export default async function RenewPactPage() {
  const me = await requireAuth()
  const graceStart = new Date(Date.now() - BUSINESS_RULES.PACT_RENEWAL_GRACE_DAYS * 86_400_000)
  const pacts = can(me.role, 'pact:buy')
    ? await prisma.pact.findMany({
        where: { holderId: me.id, OR: [{ status: { in: ['ACTIVE', 'SUSPENDED'] } }, { status: 'EXPIRED', expiresAt: { gte: graceStart } }] },
        orderBy: { expiresAt: 'asc' },
      })
    : []
  const now = new Date()

  return (
    <div className="space-y-5">
      <PageHeading title="Renew PACT" />
      <p className="max-w-3xl text-[13px] text-ink-2">
        Each PACT runs for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}. Renewal opens {BUSINESS_RULES.PACT_RENEWAL_WINDOW_DAYS} days
        before expiry and adds a full term on top of the days you have left. After expiry you still have{' '}
        {BUSINESS_RULES.PACT_RENEWAL_GRACE_DAYS} days to renew — as long as nobody else has bought the seat.
      </p>

      {pacts.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink">You have no PACT to renew</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Territories you buy will appear here as they come up for renewal.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">PIN code</th>
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Expires</th>
                <th className="px-4 py-2.5 text-right">Renewal</th>
              </tr>
            </thead>
            <tbody>
              {pacts.map((p) => {
                const days = p.expiresAt ? Math.ceil((p.expiresAt.getTime() - now.getTime()) / 86_400_000) : null
                const open = renewalOpen(p, now)
                return (
                  <tr key={p.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <span className="tabular font-mono font-semibold text-ink">{p.pincode}</span>
                      <span className="block text-[11.5px] text-ink-3">{[p.city, p.state].filter(Boolean).join(', ')}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {serviceLabel(p.serviceType)}{p.subCategory !== '-' && <span className="text-ink-4"> · {p.subCategory.replace(/-/g, ' ')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.status === 'ACTIVE' ? (days != null && days <= 30 ? 'pill-warn' : 'pill-ok') : p.status === 'EXPIRED' ? 'pill-muted' : 'pill-warn'}>
                        {p.status === 'ACTIVE' ? (days != null && days <= 30 ? `${days} days left` : 'Active') : p.status === 'EXPIRED' ? 'Expired' : 'Suspended'}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-ink-2">{fmt(p.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'SUSPENDED' ? (
                        <Link href="/dashboard/help" className="text-[12px] font-semibold text-brand hover:underline">Contact support</Link>
                      ) : open ? (
                        <RenewPactButton pactId={p.id} label="Renew now" />
                      ) : (
                        <span className="text-[12px] text-ink-4">
                          Opens {fmt(p.expiresAt && new Date(p.expiresAt.getTime() - BUSINESS_RULES.PACT_RENEWAL_WINDOW_DAYS * 86_400_000))}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
