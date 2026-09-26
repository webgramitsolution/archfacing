import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import {
  getStorageUsage,
  getPurchaseHistory,
  PORTAL_SPACE_PACKS,
} from '@/lib/portal-space'
import { PORTAL_SPACE_TAX_PERCENT } from '@/config/portal-space'
import { BUSINESS_RULES } from '@/config/permissions'
import { PageTitle, StatCard, SectionHead, Callout, Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { PackPicker } from './pack-picker'

export const metadata: Metadata = { title: 'Portal Space' }

export default async function PortalSpacePage() {
  const user = await requireAuth()

  const [usage, history] = await Promise.all([
    getStorageUsage(user.id),
    getPurchaseHistory(user.id),
  ])

  // Warn while there is still room to act, not once uploads already fail.
  const tight = usage.percentUsed >= 80

  return (
    <>

      <div>
        <PageTitle eyebrow="Storage" title="Portal Space">
          Every account gets {BUSINESS_RULES.FREE_STORAGE_MB} MB free. When that
          fills up, extra space can be added for{' '}
          {BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS} years at a time.
        </PageTitle>

        {/* ─── usage ─── */}
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Space used</p>
              <p className="tabular font-display text-[26px] font-bold leading-none text-ink">
                {usage.usedMb} MB
                <span className="ml-2 text-[15px] font-semibold text-ink-3">
                  of {usage.quotaMb} MB
                </span>
              </p>
            </div>
            <p
              className={
                usage.isFull
                  ? 'tabular font-display text-[20px] font-bold text-brand'
                  : tight
                    ? 'tabular font-display text-[20px] font-bold text-warn'
                    : 'tabular font-display text-[20px] font-bold text-ok'
              }
            >
              {usage.percentUsed}%
            </p>
          </div>

          <div
            className="h-2.5 w-full overflow-hidden rounded-pill bg-paper-3"
            role="progressbar"
            aria-valuenow={usage.percentUsed}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Storage used"
          >
            <div
              className={
                usage.isFull ? 'h-full bg-brand' : tight ? 'h-full bg-warn' : 'h-full bg-ok'
              }
              style={{ width: `${usage.percentUsed}%` }}
            />
          </div>

          <p className="mt-3 text-[13px] text-ink-3">
            {usage.freeMb} MB still free
            {usage.purchasedMb > 0 &&
              ` · ${usage.purchasedMb} MB of this quota was purchased`}
          </p>
        </div>

        {usage.isFull && (
          <div className="mt-5">
            <Callout tone="brand" icon="alert" title="Your space is full">
              New uploads will be refused until you add space or remove some
              older postings. Files already published are safe and stay
              online.
            </Callout>
          </div>
        )}

        {!usage.isFull && tight && (
          <div className="mt-5">
            <Callout tone="warn" icon="alert" title="Running low on space">
              Only {usage.freeMb} MB left. Adding space now avoids an upload
              failing halfway through a posting.
            </Callout>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard icon="box" value={`${usage.quotaMb} MB`} label="Total quota" tone="brand" />
          <StatCard
            icon="check"
            value={`${BUSINESS_RULES.FREE_STORAGE_MB} MB`}
            label="Free with every account"
            tone="ok"
          />
          <StatCard
            icon="rupee"
            value={`${usage.purchasedMb} MB`}
            label="Purchased space"
            tone={usage.purchasedMb > 0 ? 'info' : 'muted'}
          />
        </div>

        {/* ─── buy ─── */}
        <section className="mt-10">
          <SectionHead title="Add more space">
            Each pack lasts {BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS} years
            from the day it is added. Prices are shown before GST.
          </SectionHead>

          <div className="mt-4">
            <PackPicker packs={PORTAL_SPACE_PACKS} taxPercent={PORTAL_SPACE_TAX_PERCENT} />
          </div>

          <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-ink-3">
            <Icon name="alert" className="mt-px h-4 w-4 shrink-0 text-ink-4" />
            <span>
              Portal Space is <strong className="font-semibold text-ink-2">non-refundable</strong>. When a pack reaches the end of its term the quota
              drops back, but nothing you have already published is deleted —
              see the{' '}
              <Link href="/legal/refund" className="font-semibold text-brand hover:underline">
                refund policy
              </Link>
              .
            </span>
          </p>
        </section>

        {/* ─── history ─── */}
        {history.length > 0 && (
          <section className="mt-10">
            <SectionHead title="Purchase history" />

            <div className="card scroll-slim-light mt-4 overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="bg-paper-3">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Space
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Purchased
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                      Valid until
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
                  {history.map((s) => {
                    const live = s.expiresAt > new Date() && s.reclaimedAt === null
                    return (
                      <tr key={s.id} className="border-t border-line-soft">
                        <td className="tabular px-4 py-3 font-medium text-ink">
                          {s.extraMb} MB
                        </td>
                        <td className="tabular px-4 py-3 text-ink-2">
                          {s.purchasedAt.toLocaleDateString('en-IN')}
                        </td>
                        <td className="tabular px-4 py-3 text-ink-2">
                          {s.expiresAt.toLocaleDateString('en-IN')}
                        </td>
                        <td className="tabular px-4 py-3 text-right text-ink-2">
                          {formatINR(Number(s.price))}
                        </td>
                        <td className="px-4 py-3">
                          {live ? (
                            <span className="pill-ok">Active</span>
                          ) : (
                            <span className="pill-muted">Expired</span>
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
