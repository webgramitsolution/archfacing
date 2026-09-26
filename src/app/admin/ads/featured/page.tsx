import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { featuredSlots, featurableBookings } from '@/lib/ad-marketplace'
import { AdminPageHead } from '@/components/admin/parts'
import { SlotControls, type Featurable } from './slot-controls'

export const metadata: Metadata = { title: 'Featured Advertisements' }

/** Slot state is decided by the database on every load — never cached here. */
export const dynamic = 'force-dynamic'

const shortDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * §15, §27 — the four positions on the public Featured Advertisements rail.
 *
 * Featuring is a property of a campaign, not a copy of it: a slot points at an
 * AdBooking. Emptying a slot leaves the campaign running exactly as it was; it
 * simply stops appearing on the rail.
 *
 * A slot can be filled and still show nothing publicly — if the campaign has
 * finished, been paused, or its advertiser suspended. The row says so rather
 * than letting an admin wonder why the page looks different.
 */
export default async function AdminFeaturedAdsPage() {
  await requirePermission('admin:ads')

  const [slots, featurable] = await Promise.all([featuredSlots(), featurableBookings()])
  const now = new Date()

  const options: Featurable[] = featurable.map((b) => ({
    id: b.id,
    label:
      (b.brandName ?? b.advertiser.corporateProfile?.companyName ?? b.advertiser.name) +
      ` — ${b.title}`,
    window: `${shortDate(b.startsAt)} → ${shortDate(b.endsAt)}`,
    status: b.status === 'SCHEDULED' ? 'Scheduled' : 'Active',
  }))

  return (
    <div>
      <AdminPageHead title="Featured Advertisements">
        The four positions on the rail at{' '}
        <Link href="/advertisements" className="font-semibold text-brand hover:underline">
          /advertisements
        </Link>
        . Assign an approved campaign to a slot and the public page shows it on
        the next request — there is nothing to deploy. A slot whose campaign has
        finished, been paused or whose advertiser is suspended shows nothing,
        without having to be emptied by hand.
      </AdminPageHead>

      {options.length === 0 && (
        <p className="mb-5 rounded-card border border-line bg-paper-2 px-5 py-4 text-[13px] text-ink-2">
          No approved campaign is free to be featured right now. Approve one in{' '}
          <Link href="/admin/ads" className="font-semibold text-brand hover:underline">
            the review queue
          </Link>{' '}
          first — only a campaign that is running or scheduled can go on the rail.
        </p>
      )}

      <ul className="flex flex-col gap-5">
        {slots.map((slot, i) => {
          const b = slot.booking
          const brand = b
            ? (b.brandName ?? b.advertiser.corporateProfile?.companyName ?? b.advertiser.name)
            : null

          // Why it might be filled and still invisible to a visitor.
          const hidden =
            !b ? null
            : !slot.isEnabled ? 'This slot is disabled'
            : b.status !== 'RUNNING' ? `Campaign is ${b.status.toLowerCase().replace(/_/g, ' ')}`
            : b.startsAt && b.startsAt > now ? 'Campaign has not started yet'
            : b.endsAt && b.endsAt <= now ? 'Campaign has finished'
            : null

          return (
            <li key={slot.id} className="overflow-hidden rounded-card border border-line bg-paper-2">
              <div className="flex flex-col gap-4 p-5 sm:flex-row">
                <div className="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-paper-3 p-2 sm:w-48">
                  {b ? (
                    // A plain <img>: an advertiser's creative can be hosted on
                    // their own domain, and next/image only loads the hosts in
                    // remotePatterns.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imageUrl ?? undefined} alt="" className="max-h-28 w-auto object-contain" />
                  ) : (
                    <span className="py-9 text-[12.5px] text-ink-4">Empty</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-card bg-navy px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.05em] text-white">
                      Slot {String(slot.position).padStart(2, '0')}
                    </span>

                    {hidden ? (
                      <span className="rounded-card bg-warn-soft px-2 py-1 text-[10.5px] font-semibold text-warn">
                        Not showing — {hidden}
                      </span>
                    ) : b ? (
                      <span className="rounded-card bg-ok-soft px-2 py-1 text-[10.5px] font-semibold text-ok">
                        Live on the page
                      </span>
                    ) : null}
                  </div>

                  {b ? (
                    <>
                      <p className="mt-2.5 font-display text-[15.5px] font-bold text-ink">
                        {brand}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-2">{b.title}</p>
                      <dl className="tabular mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
                        <span>
                          {shortDate(b.startsAt)} → {shortDate(b.endsAt)}
                        </span>
                        <span>{b.impressions.toLocaleString('en-IN')} impressions</span>
                        <span>{b.clicks.toLocaleString('en-IN')} clicks</span>
                      </dl>
                    </>
                  ) : (
                    <p className="mt-2.5 text-[13px] text-ink-2">
                      Nothing assigned. The public rail simply skips this position.
                    </p>
                  )}
                </div>
              </div>

              <SlotControls
                position={slot.position}
                isEnabled={slot.isEnabled}
                isFilled={Boolean(b)}
                isFirst={i === 0}
                isLast={i === slots.length - 1}
                options={options}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
