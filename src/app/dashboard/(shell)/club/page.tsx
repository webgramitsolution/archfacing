import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import {
  getActiveMembership,
  getMembershipHistory,
  listClubPlans,
  daysLeft,
} from '@/lib/club'
import { BUSINESS_RULES } from '@/config/permissions'
import { PageTitle, StatCard, EmptyState, Callout, Icon, SectionHead } from '@/components/ui'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Club Membership' }

export default async function MyClubPage() {
  const user = await requireAuth()

  const [membership, history, plans] = await Promise.all([
    getActiveMembership(user.id),
    getMembershipHistory(user.id),
    listClubPlans(user.role),
  ])

  const left = membership ? daysLeft(membership.expiresAt) : 0
  // Nudge to renew only once it is genuinely close — a warning three months
  // out is noise, and noise trains people to ignore the banner.
  const expiringSoon = membership !== null && left <= 30

  return (
    <>

      <div>
        <PageTitle
          eyebrow="Membership"
          title="My Club Membership"
          action={
            <Link href="/club/join" className="btn-outline">
              {membership ? 'Extend membership' : 'See plans'}
            </Link>
          }
        >
          Your membership status, what it covers, and everything you have paid
          for so far.
        </PageTitle>

        {!membership ? (
          <>
            <EmptyState
              icon="star"
              title="You are not a Club member yet"
              action={
                <Link href="/club/join" className="btn-primary">
                  Look at the plans
                </Link>
              }
            >
              Club members rank above non-members in Consult Nearby, carry a
              badge on every posting, and pay less for Merchandise.
            </EmptyState>

            {plans.length > 0 && (
              <div className="mt-8">
                <SectionHead title="Available to you">
                  {plans.length} plan{plans.length !== 1 ? 's' : ''} your account
                  can join.
                </SectionHead>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {plans.map((p) => (
                    <li key={p.slug}>
                      <Link href="/club/join" className="card-hover block p-5">
                        <p className="font-display text-[15px] font-bold text-ink">
                          {p.name}
                        </p>
                        <p className="tabular mt-2 font-display text-[20px] font-bold text-brand">
                          {formatINR(Number(p.price))}
                        </p>
                        <p className="mt-1 text-[12.5px] text-ink-3">
                          for {p.months} months
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            {expiringSoon && (
              <div className="mb-6">
                <Callout
                  tone="warn"
                  icon="clock"
                  title={
                    left === 0
                      ? 'Your membership ends today'
                      : `${left} day${left !== 1 ? 's' : ''} left`
                  }
                  action={
                    <Link href="/club/join" className="btn-primary">
                      Extend now
                    </Link>
                  }
                >
                  Extending before it lapses keeps your badge and your ranking
                  in Consult Nearby without a break. The new term starts the day
                  this one ends, so nothing you have paid for is lost.
                </Callout>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon="star"
                value={membership.planName}
                label="Current plan"
                tone={membership.isFree ? 'info' : 'brand'}
              />
              <StatCard
                icon="clock"
                value={left}
                label="Days remaining"
                tone={expiringSoon ? 'warn' : 'ok'}
              />
              <StatCard
                icon="check"
                value={membership.startsAt.toLocaleDateString('en-IN')}
                label="Started on"
                tone="muted"
              />
              <StatCard
                icon="file"
                value={membership.expiresAt.toLocaleDateString('en-IN')}
                label="Runs until"
                tone="muted"
              />
            </div>

            {membership.isFree && (
              <div className="mt-6">
                <Callout tone="info" icon="shield" title="Included with Design Associate status">
                  As an approved Design Associate you receive{' '}
                  {BUSINESS_RULES.DA_FREE_CLUB_YEARS} years of Club Membership at
                  no cost. There is nothing to pay and nothing to
                  renew until{' '}
                  {membership.expiresAt.toLocaleDateString('en-IN')}.
                </Callout>
              </div>
            )}

            {/* ─── what it covers ─── */}
            <section className="mt-9">
              <SectionHead title="What your membership covers" />

              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Priority placement in Consult Nearby for your PIN code',
                  'Club badge on your profile and every posting',
                  'Quarterly reach and enquiry report',
                  'Discount on all ArchFacing Merchandise',
                  'Early access to Design Competition briefs',
                  'Priority support on email and phone',
                ].map((b) => (
                  <li key={b} className="card flex gap-3 p-4">
                    <Icon name="check" className="mt-px h-4 w-4 shrink-0 text-ok" />
                    <span className="text-[13.5px] leading-snug text-ink-2">{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* ─── history ─── */}
        {history.length > 0 && (
          <section className="mt-10">
            <SectionHead title="Membership history">
              Every term on this account, most recent first.
            </SectionHead>

            <div className="card scroll-slim-light mt-4 overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="bg-paper-3">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Until
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((m) => {
                    const live = m.expiresAt > new Date()
                    return (
                      <tr key={m.id} className="border-t border-line-soft">
                        <td className="px-4 py-3 font-medium text-ink">{m.planName}</td>
                        <td className="tabular px-4 py-3 text-ink-2">
                          {m.startsAt.toLocaleDateString('en-IN')}
                        </td>
                        <td className="tabular px-4 py-3 text-ink-2">
                          {m.expiresAt.toLocaleDateString('en-IN')}
                        </td>
                        <td className="tabular px-4 py-3 text-right text-ink-2">
                          {m.isFree ? '—' : formatINR(Number(m.price))}
                        </td>
                        <td className="px-4 py-3">
                          {m.isFree ? (
                            <span className="pill-info">Complimentary</span>
                          ) : live ? (
                            <span className="pill-ok">Active</span>
                          ) : (
                            <span className="pill-muted">Ended</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

    </>
  )
}
