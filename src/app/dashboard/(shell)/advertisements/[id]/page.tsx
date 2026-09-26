import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AD_ROLES } from '@/lib/ads'
import { getCampaign, AD_STATUS_META } from '@/lib/advertiser'
import { campaignTimeline } from '@/lib/ad-audit'
import {
  StatusPill, TypePill, CampaignThumb, RailCard, SupportCard,
  compact, money, shortDate, dateTime, ago,
} from '@/components/dashboard/advertiser-parts'
import { Icon } from '@/components/ui'
import { NotAnAdvertiser } from '../list-params'
import { CampaignActions } from './campaign-actions'
import { ALLOWED } from './permissions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Campaign' }
export const dynamic = 'force-dynamic'

/**
 * §13 — one campaign, everything about it.
 *
 * This is the page every list links to, and it is the same row those lists
 * read: the id in the URL is the campaign id used by the wizard, the review
 * queue, the payment and the audit trail. There is no per-page copy.
 *
 * Which actions appear is decided by `ALLOWED[status]` on the server — the
 * same table each action re-checks — so the page cannot offer a button the
 * campaign would refuse.
 */
export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const { id } = await params
  const c = await getCampaign(user.id, id)
  if (!c) notFound()

  const [timeline, payment] = await Promise.all([
    campaignTimeline(id),
    prisma.payment.findFirst({
      where: { referenceId: id, purpose: 'ADVERTISEMENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, amount: true, taxAmount: true, totalAmount: true,
        invoiceNumber: true, paidAt: true, createdAt: true,
      },
    }),
  ])

  const allowed = ALLOWED[c.status]
  const meta = AD_STATUS_META[c.status]

  return (
    <div>
      {/* ═══════════ masthead ═══════════ */}
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
          <li>
            <Link href="/dashboard" className="transition-colors hover:text-brand">Dashboard</Link>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="text-ink-4">›</span>
            <Link href="/dashboard/advertisements" className="transition-colors hover:text-brand">
              Advertisements
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="text-ink-4">›</span>
            <span className="min-w-0 truncate font-medium text-ink-2">{c.title}</span>
          </li>
        </ol>
      </nav>

      <div className="mb-5 flex flex-col gap-4 md:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <CampaignThumb src={c.imageUrl} alt={c.title} className="h-[76px] w-[124px]" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 font-display text-[22px] font-bold leading-tight tracking-tight text-ink">
                {c.title}
              </h1>
              <StatusPill status={c.status} />
              {c.adType && <TypePill name={c.adType.name} slug={c.adType.slug} />}
            </div>
            {c.description && (
              <p className="mt-1.5 max-w-2xl text-[13px] text-ink-3">{c.description}</p>
            )}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-4">
              <span className="tabular">Campaign ID {c.id}</span>
              <span>Created {ago(c.createdAt)}</span>
            </p>
          </div>
        </div>

        <CampaignActions id={c.id} allowed={allowed} className="shrink-0 lg:justify-end" />
      </div>

      {/* ═══════════ what the reviewer said ═══════════ */}
      {(c.status === 'REJECTED' || c.status === 'CHANGES_REQUESTED') && c.rejectionReason && (
        <section className="mb-5 rounded-card border border-danger/30 bg-danger-soft p-5">
          <p className="flex items-center gap-2 font-display text-[14px] font-bold text-danger">
            <Icon name="alert" className="h-4 w-4" />
            {c.status === 'REJECTED' ? 'This campaign was rejected' : 'Changes are needed'}
            {c.rejectionCode && (
              <span className="rounded-card bg-danger px-2 py-[3px] text-[10.5px] font-semibold text-white">
                {c.rejectionCode}
              </span>
            )}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{c.rejectionReason}</p>
          <p className="mt-2 text-[11.5px] text-ink-3">
            Reviewed {c.reviewedAt ? dateTime(c.reviewedAt) : '—'}
            {c.resubmitCount > 0 && ` · resubmitted ${c.resubmitCount} time${c.resubmitCount === 1 ? '' : 's'}`}
          </p>
        </section>
      )}

      {/* ═══════════ performance ═══════════ */}
      {/* `#performance` is where "View Analytics" lands — this page's metrics
          are the campaign's analytics; there is no separate analytics route.
          So whenever that button is offered the section is drawn, even if a
          new campaign's real figures are still all zero. */}
      {(c.impressions > 0 || c.clicks > 0 || allowed.includes('analytics')) && (
        <section
          id="performance"
          className="mb-5 scroll-mt-4 grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(164px, 1fr))' }}
        >
          <Metric icon="eye" label="Impressions" value={compact(c.impressions)} tone="info" />
          <Metric icon="target" label="Clicks" value={compact(c.clicks)} tone="brand" />
          <Metric icon="chart" label="CTR" value={`${c.ctr.toFixed(2)}%`} tone="violet" />
          <Metric icon="users" label="Leads" value={compact(c.leads)} tone="ok" />
          <Metric icon="rupee" label="Spend" value={money(c.spend)} tone="danger" />
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr_276px] xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ─── creative ─── */}
          <Card title="Creative">
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div>
                {c.imageUrl ? (
                  // A plain <img>: the creative may be hosted anywhere, and
                  // next/image only loads the hosts in remotePatterns.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="w-full rounded-card border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-card border border-dashed border-line bg-paper-2">
                    <span className="text-[12px] text-ink-4">No creative yet</span>
                  </div>
                )}
              </div>

              <dl className="flex flex-col gap-2.5">
                <Detail label="Headline" value={c.headline ?? '—'} />
                <Detail label="Description" value={c.description ?? '—'} />
                <Detail label="Objective" value={c.objective ?? '—'} />
              </dl>
            </div>
          </Card>

          {/* ─── placement & audience ─── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={`Placements (${c.placements.length})`}>
              {c.placements.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">No placement chosen yet.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {c.placements.map((p, i) => (
                    <li key={p.slug} className="flex items-start gap-2.5">
                      <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-card bg-paper-3">
                        <Icon name="monitor" className="h-3.5 w-3.5 text-ink-3" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-ink">
                          {p.name}
                          {i === 0 && (
                            <span className="ml-1.5 text-[10px] font-normal text-brand">Primary</span>
                          )}
                        </span>
                        <span className="tabular block text-[10.5px] text-ink-3">{p.size}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Audience">
              {c.targeting ? (
                <dl className="flex flex-col gap-2.5">
                  <Detail
                    label="Location"
                    value={
                      [c.targeting.country, ...c.targeting.states, ...c.targeting.cities]
                        .filter(Boolean)
                        .join(' › ') || 'All India'
                    }
                  />
                  <Detail
                    label="Audience type"
                    value={c.targeting.audienceRoles.join(', ') || '—'}
                  />
                  {c.targeting.pincodes.length > 0 && (
                    <Detail label="PIN codes" value={c.targeting.pincodes.join(', ')} />
                  )}
                  <Detail
                    label="Categories"
                    value={
                      [
                        ...c.targeting.productCategories,
                        ...c.targeting.projectCategories,
                        ...c.targeting.professionalCategories,
                      ].join(', ') || 'All categories'
                    }
                  />
                </dl>
              ) : (
                <p className="text-[12.5px] text-ink-3">No targeting set yet.</p>
              )}
            </Card>
          </div>

          {/* ─── schedule & package ─── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Schedule">
              <dl className="flex flex-col gap-2.5">
                <Detail label="Start" value={shortDate(c.startsAt)} />
                <Detail label="End" value={shortDate(c.endsAt)} />
                <Detail
                  label="Duration"
                  value={c.durationDays > 0 ? `${c.durationDays} days` : '—'}
                />
                {c.startTime && <Detail label="Daily from" value={c.startTime} />}
                {c.daysLeft !== null && (
                  <Detail label="Remaining" value={`${c.daysLeft} days`} />
                )}
              </dl>
            </Card>

            <Card title="Package & Payment">
              <dl className="flex flex-col gap-2.5">
                <Detail label="Package" value={c.package?.name ?? 'Not chosen'} />
                {payment ? (
                  <>
                    <Detail label="Amount" value={money(Number(payment.amount))} />
                    <Detail label="GST" value={money(Number(payment.taxAmount))} />
                    <Detail label="Total" value={money(Number(payment.totalAmount))} />
                    <div>
                      <dt className="text-[10.5px] text-ink-4">Payment status</dt>
                      <dd className="mt-0.5">
                        <span
                          className={cn(
                            'inline-flex rounded-card px-2 py-[3px] text-[10.5px] font-semibold',
                            payment.status === 'PAID'
                              ? 'bg-ok-soft text-ok'
                              : payment.status === 'FAILED'
                                ? 'bg-danger-soft text-danger'
                                : 'bg-warn-soft text-warn'
                          )}
                        >
                          {payment.status}
                        </span>
                      </dd>
                    </div>
                    {payment.invoiceNumber && (
                      <Detail label="Invoice" value={payment.invoiceNumber} />
                    )}
                  </>
                ) : (
                  <p className="text-[12.5px] text-ink-3">
                    No payment yet — one is created when the campaign is submitted.
                  </p>
                )}
              </dl>

              {payment && payment.status !== 'PAID' && (
                <p className="mt-3 rounded-card border border-warn/30 bg-warn-soft px-3 py-2 text-[11.5px] leading-snug text-warn">
                  Payment is not settled. A campaign is not published on payment
                  alone — it still goes through review — but it will not start
                  until the payment clears.
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* ═══════════ the rail ═══════════ */}
        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="Status">
            <div className="flex items-center gap-3">
              <StatusPill status={c.status} />
              <span className="text-[12px] text-ink-3">{meta.label}</span>
            </div>
            <dl className="mt-4 flex flex-col gap-2.5">
              <Detail label="Submitted" value={c.submittedAt ? dateTime(c.submittedAt) : '—'} />
              <Detail label="Reviewed" value={c.reviewedAt ? dateTime(c.reviewedAt) : '—'} />
              <Detail label="Last updated" value={ago(c.updatedAt)} />
            </dl>
          </RailCard>

          <RailCard title="Activity Timeline">
            {timeline.length === 0 ? (
              <p className="text-[12px] text-ink-3">Nothing recorded yet.</p>
            ) : (
              <ol className="flex flex-col gap-3.5">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-2.5">
                    <span
                      className={cn(
                        'mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        t.byPlatform ? 'bg-navy text-white' : 'bg-brand-soft text-brand'
                      )}
                    >
                      <Icon name={t.byPlatform ? 'shield' : 'user'} className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-ink">{t.what}</span>
                      <span className="block text-[10.5px] text-ink-4">
                        {t.by} · {dateTime(t.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </RailCard>

          <SupportCard />
        </aside>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Pieces
// ═══════════════════════════════════════════════════════════

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3.5 font-display text-[14.5px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] text-ink-4">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] font-medium text-ink-2">{value}</dd>
    </div>
  )
}

const TONE = {
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  violet: 'bg-[#F5F3FF] text-[#7C3AED]',
} as const

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  value: string
  tone: keyof typeof TONE
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 shadow-card">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-card', TONE[tone])}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] text-ink-3">{label}</span>
        <span className="tabular block font-display text-[17px] font-bold leading-none text-ink">
          {value}
        </span>
      </span>
    </div>
  )
}
