import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { pendingReviewBookings } from '@/lib/ads'
import { AdminPageHead, MiniStat, Panel } from '@/components/admin/parts'
import { DataTable, Td } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { AdReviewActions } from './ad-review-actions'
import { AdOpButtons, PlacementRow } from './ads-controls'

export const metadata: Metadata = { title: 'Advertisements' }

const longDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const CAMPAIGN_TABS = [
  { key: 'RUNNING', label: 'Running' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'ENDED', label: 'Ended' },
  { key: 'REJECTED', label: 'Rejected' },
] as const
const STATUS_PILL: Record<string, string> = {
  RUNNING: 'bg-ok-soft text-ok', SCHEDULED: 'bg-[#EAF2FF] text-[#2563EB]', PAUSED: 'bg-warn-soft text-warn',
  ENDED: 'bg-paper-3 text-ink-3', REJECTED: 'bg-danger-soft text-danger',
}

export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission('admin:ads')
  const sp = await searchParams
  const view = CAMPAIGN_TABS.find((t) => t.key === sp.status)?.key ?? 'RUNNING'

  const [queue, live, adRevenue, statusCounts, placements, placementLive, running] = await Promise.all([
    pendingReviewBookings(),
    prisma.adBooking.findMany({
      where: { status: view },
      take: 50,
      include: {
        placement: { select: { name: true, size: true } },
        advertiser: { select: { name: true, email: true } },
      },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID', purpose: 'ADVERTISEMENT' },
      _sum: { totalAmount: true },
    }),
    prisma.adBooking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.adPlacement.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.adBooking.groupBy({ by: ['placementId'], where: { status: { in: ['RUNNING', 'SCHEDULED', 'PAUSED'] } }, _count: { _all: true } }),
    prisma.adBooking.findMany({ where: { status: 'RUNNING' }, select: { impressions: true } }),
  ])
  // Impressions across what is live right now, whichever tab is open.
  const impressions = running.reduce((a, b) => a + b.impressions, 0)
  const countOf = (st: string) => statusCounts.find((r) => r.status === st)?._count._all ?? 0
  const liveIn = new Map(placementLive.map((r) => [r.placementId, r._count._all]))

  // The amount each queued booking actually paid, pulled in one query rather
  // than one per row.
  const paymentIds = queue.map((b) => b.paymentId).filter((id): id is string => Boolean(id))
  const payments = paymentIds.length
    ? await prisma.payment.findMany({
        where: { id: { in: paymentIds } },
        select: { id: true, totalAmount: true, status: true, invoiceNumber: true },
      })
    : []
  const paidBy = new Map(payments.map((p) => [p.id, p]))

  return (
    <div className="space-y-5">
      <AdminPageHead title="Advertisements">
        Payment does not publish an ad — approving it does. Check the creative
        against the placement size and the landing page against what the banner
        promises.
      </AdminPageHead>

      {/* monetization quick-links */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: 'Featured ad slots', href: '/admin/ads/featured' },
          { label: 'Merchandise & Podcast', href: '/admin/seller' },
          { label: 'Payments ledger', href: '/admin/payments' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-pill border border-line bg-white px-3 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
          >
            {l.label} ›
          </Link>
        ))}
      </div>

      {/* stats */}
      <section className="grid grid-cols-4 gap-4">
        <MiniStat
          icon="shield"
          label="Waiting for review"
          value={queue.length}
          tint={queue.length > 0 ? { bg: '#FFE9EC', fg: '#E11D48' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint="paid, not yet approved"
        />
        <MiniStat icon="star" label="Running now" value={countOf('RUNNING')} tint={{ bg: '#E4EEFF', fg: '#2563EB' }} hint="live on the site" />
        <MiniStat icon="eye" label="Impressions" value={impressions} tint={{ bg: '#F3EAFE', fg: '#8B5CF6' }} hint="across running ads" />
        <MiniStat icon="rupee" label="Ad revenue" value={formatINR(Number(adRevenue._sum.totalAmount ?? 0))} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint="all time, paid" />
      </section>

      {/* ═══════════ review queue ═══════════ */}
      {queue.length === 0 ? (
        <div className="rounded-card border border-line bg-white px-6 py-16 text-center shadow-card">
          <p className="font-display text-[15px] font-bold text-ink">Nothing waiting for review</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Every paid advertisement has been dealt with.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {queue.map((b) => {
            const payment = b.paymentId ? paidBy.get(b.paymentId) : undefined

            return (
              <li
                key={b.id}
                className="overflow-hidden rounded-card border border-line bg-white shadow-card"
              >
                <div className="flex gap-4 p-5">
                  {/*
                    A plain <img>, not next/image. The banner is hosted on the
                    advertiser's own domain, and next/image only loads hosts
                    listed in next.config.ts remotePatterns — widening that to a
                    wildcard would turn our optimiser into an open proxy for any
                    URL a user can type.
                  */}
                  <div className="flex w-64 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper-2 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.imageUrl ?? undefined}
                      alt={b.title}
                      className="max-h-40 w-auto max-w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="eyebrow">{b.placement?.name ?? "No placement"}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                        {b.placement?.size ?? "—"} px
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                        {b.advertiser.role}
                      </span>
                    </div>

                    <h2 className="font-display text-[16px] font-semibold">{b.title}</h2>

                    <p className="mt-1.5 text-[13.5px] text-ink-2">
                      Clicks through to{' '}
                      <a
                        href={b.targetUrl ?? "#"}
                        target="_blank"
                        rel="nofollow sponsored noopener"
                        className="break-all text-brand hover:underline"
                      >
                        {b.targetUrl}
                      </a>
                    </p>

                    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                      <span>{b.advertiser.name}</span>
                      <span>{b.advertiser.email}</span>
                      <span>
                        {longDate(b.startsAt)} → {longDate(b.endsAt)}
                      </span>
                      <span>
                        {b.weeks} {b.weeks === 1 ? 'week' : 'weeks'}
                      </span>
                      {payment && (
                        <span className="text-ok">
                          {formatINR(Number(payment.totalAmount))} paid
                        </span>
                      )}
                      {payment?.invoiceNumber && <span>{payment.invoiceNumber}</span>}
                    </dl>

                    <p className="mt-2 text-[12.5px] text-ink-3">
                      Banner file —{' '}
                      <a
                        href={b.imageUrl ?? "#"}
                        target="_blank"
                        rel="nofollow sponsored noopener"
                        className="break-all text-brand hover:underline"
                      >
                        {b.imageUrl}
                      </a>
                    </p>
                  </div>
                </div>

                <AdReviewActions bookingId={b.id} />
              </li>
            )
          })}
        </ul>
      )}

      {/* ═══════════ live ═══════════ */}
      <Panel title="Campaigns">
        <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">
          {CAMPAIGN_TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === 'RUNNING' ? '/admin/ads' : `/admin/ads?status=${t.key}`}
              className={'rounded-pill px-3 py-1 text-[12px] font-medium transition-colors ' + (view === t.key ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4')}
            >
              {t.label} <span className={view === t.key ? 'text-white/70' : 'text-ink-4'}>{countOf(t.key)}</span>
            </Link>
          ))}
        </div>
        {live.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-ink-3">
            No {CAMPAIGN_TABS.find((t) => t.key === view)?.label.toLowerCase()} campaigns.
          </p>
        ) : (
          <DataTable bare
            head={['Placement', 'Ad', 'Advertiser', 'Dates', 'Impressions', 'Clicks', 'CTR', 'Status', '']}
          >
            {live.map((b) => {
              const ctr = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0

              return (
                <tr key={b.id}>
                  <Td>
                    <span className="font-medium text-ink">{b.placement?.name ?? "No placement"}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                      {b.placement?.size ?? "—"} px
                    </span>
                  </Td>
                  <Td>
                    <span className="font-medium text-ink">{b.title}</span>
                    {b.targetUrl && (
                      <a
                        href={b.targetUrl}
                        target="_blank"
                        rel="nofollow sponsored noopener"
                        className="mt-0.5 block truncate text-[12px] text-brand hover:underline"
                      >
                        {b.targetUrl}
                      </a>
                    )}
                  </Td>
                  <Td className="text-ink-2">
                    {b.advertiser.name}
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      {b.advertiser.email}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-2">
                    {longDate(b.startsAt)} → {longDate(b.endsAt)}
                  </Td>
                  <Td className="tabular text-ink-2">
                    {b.impressions.toLocaleString('en-IN')}
                  </Td>
                  <Td className="tabular text-ink-2">
                    {b.clicks.toLocaleString('en-IN')}
                  </Td>
                  <Td className="tabular text-ink-2">{ctr.toFixed(2)}%</Td>
                  <Td><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (STATUS_PILL[b.status] ?? 'bg-paper-3 text-ink-3')}>{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</span></Td>
                  <Td className="text-right"><AdOpButtons id={b.id} status={b.status} /></Td>
                </tr>
              )
            })}
          </DataTable>
        )}
        <p className="mt-3 border-t border-line-soft pt-2.5 text-[11.5px] text-ink-3">
          The public rate card is at{' '}
          <Link href="/advertisements" className="font-medium text-brand hover:underline">
            /advertisements
          </Link>
          . Finished runs are closed and unpaid bookings released by the nightly cron.
        </p>
      </Panel>

      {/* ═══════════ placements ═══════════ */}
      <Panel title="Placements & Pricing" subtitle="what advertisers can buy">
        {placements.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-3">No placements are set up yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
                  <th className="py-2 pr-2 font-semibold">Placement</th>
                  <th className="py-2 pr-2 font-semibold">Price</th>
                  <th className="py-2 pr-2 font-semibold">Slots used</th>
                  <th className="py-2 pr-2 font-semibold">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {placements.map((p) => (
                  <PlacementRow
                    key={p.id}
                    p={{
                      id: p.id, name: p.name, size: p.size,
                      weeklyPrice: Number(p.weeklyPrice), taxPercent: Number(p.taxPercent),
                      maxSlots: p.maxSlots, isActive: p.isActive, live: liveIn.get(p.id) ?? 0,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
