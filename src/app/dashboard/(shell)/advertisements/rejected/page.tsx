import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, bucketStats, filterOptions, rejectionBreakdown } from '@/lib/advertiser'
import {
  AdPageHead, AdBanner, StatTiles, RailCard, SupportCard, NoCampaigns,
} from '@/components/dashboard/advertiser-parts'
import { Icon } from '@/components/ui'
import { FilterBar } from '../filter-bar'
import { CampaignTable } from '../campaign-rows'
import { NotAnAdvertiser, ListPager, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Rejected Advertisements' }
export const dynamic = 'force-dynamic'

/** The colours of the reason wheel, in the order reasons come back. */
const WHEEL = ['#DC2626', '#F59E0B', '#F97316', '#7C3AED', '#2563EB', '#94A3B8']

const TIPS = [
  'Use original and high-quality images',
  'Avoid misleading claims or fake offers',
  'Follow content and industry guidelines',
  'Provide valid business documents',
  'Use correct brand assets and permissions',
]

const FAQS = [
  'Why was my ad rejected?',
  'How can I resubmit my advertisement?',
  'What content is not allowed?',
  'How long does the review take?',
  'Can I contact support for help?',
]

/**
 * §12 — campaigns that could not be approved, and what to do about them.
 *
 * The reasons on this screen are the reviewer's own: `rejectionCode` is the
 * category they chose and `rejectionReason` is the sentence they wrote. The
 * wheel counts what has actually been used, so a reason nobody has given never
 * appears.
 */
export default async function RejectedAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const sp = await searchParams
  const options = readListParams(sp)

  const [{ rows, total }, stats, filters, reasons] = await Promise.all([
    listCampaigns(user.id, 'rejected', options),
    bucketStats(user.id, 'rejected'),
    filterOptions(user.id),
    rejectionBreakdown(user.id),
  ])

  const commonest = reasons.rows[0]

  return (
    <div>
      <AdPageHead
        title="Rejected Advertisements"
        subtitle="Some of your campaigns could not be approved. Review the reasons and make the required changes."
        trail={['Advertisements', 'Rejected']}
      />

      <AdBanner
        icon="alert"
        title="Don't Worry, You Can Resubmit!"
        body="Review the rejection reasons, make the necessary changes, and submit again for approval."
        tone="danger"
      />

      <StatTiles
        tiles={[
          { icon: 'alert', label: 'Rejected Campaigns', value: String(stats.count), unit: 'Total rejected ads', tone: 'danger', active: true },
          {
            icon: 'clock',
            label: 'Avg. Review Time',
            value: stats.avgReviewDays === null ? '—' : stats.avgReviewDays.toFixed(1),
            unit: 'Days',
            tone: 'ok',
          },
          { icon: 'recycle', label: 'Resubmitted', value: String(stats.resubmitted), unit: 'After rejection', tone: 'info' },
          { icon: 'check', label: 'Approved After Resubmit', value: String(stats.approvedThisMonth), unit: 'Campaigns', tone: 'ok' },
          {
            icon: 'file',
            label: 'Common Issue',
            value: commonest?.code ?? '—',
            unit: commonest ? 'Most frequent reason' : 'Nothing yet',
            tone: 'violet',
          },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_264px] xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          <FilterBar
            types={filters.types}
            placements={filters.placements}
            sortOptions={SORTS.recent}
            placeholder="Search rejected campaigns…"
          />

          {rows.length === 0 ? (
            <NoCampaigns
              icon="check"
              title="Nothing has been rejected"
              body="Campaigns that need changes appear here with the reviewer's reason, ready to edit and resubmit."
              cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
            />
          ) : (
            <>
              <CampaignTable
                rows={rows}
                columns={['placement', 'submitted', 'rejectedOn', 'reason']}
                action={(c) => ({
                  label: 'Edit & Resubmit',
                  href: `/dashboard/advertisements/create?draft=${c.id}`,
                })}
              />
              <p className="mt-3 text-[12px] text-ink-3">
                Showing {rows.length} of {total} rejected campaign{total === 1 ? '' : 's'}
              </p>
              <ListPager basePath="/dashboard/advertisements/rejected" sp={sp} total={total} />
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="Rejection Reasons">
            {reasons.total === 0 ? (
              <p className="text-[12px] text-ink-3">No campaign has been turned down.</p>
            ) : (
              <div className="flex items-center gap-4">
                <Wheel rows={reasons.rows} total={reasons.total} />
                <ul className="min-w-0 flex-1 flex-col gap-1.5">
                  {reasons.rows.map((r, i) => (
                    <li key={r.code} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: WHEEL[i % WHEEL.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-ink-2">{r.code}</span>
                      <span className="tabular shrink-0 font-semibold text-ink">{r.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </RailCard>

          <RailCard title="Tips to Get Approved">
            <ul className="flex flex-col gap-2">
              {TIPS.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Icon name="check" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ok" />
                  <span className="text-[11.5px] leading-snug text-ink-2">{t}</span>
                </li>
              ))}
            </ul>
          </RailCard>

          <RailCard
            title="Frequently Asked Questions"
            action={
              <Link href="/legal/need-help" className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
                View All →
              </Link>
            }
          >
            <ul className="flex flex-col">
              {FAQS.map((q) => (
                <li key={q} className="border-b border-line-soft last:border-0">
                  <Link
                    href="/legal/need-help"
                    className="group flex items-center gap-2 py-2.5 text-[12px] text-ink-2 transition-colors hover:text-brand"
                  >
                    <span className="min-w-0 flex-1">{q}</span>
                    <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-ink-4 group-hover:text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          </RailCard>

          <SupportCard />
        </aside>
      </div>
    </div>
  )
}

/**
 * The reason wheel.
 *
 * One SVG circle per reason, drawn with `stroke-dasharray` around a shared
 * radius — a donut without a charting library. The total sits in the hole.
 */
function Wheel({ rows, total }: { rows: { code: string; percent: number }[]; total: number }) {
  const R = 30
  const C = 2 * Math.PI * R
  let offset = 0

  return (
    <span className="relative flex h-[86px] w-[86px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        {rows.map((r, i) => {
          const len = (r.percent / 100) * C
          const dash = `${len} ${C - len}`
          const el = (
            <circle
              key={r.code}
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke={WHEEL[i % WHEEL.length]}
              strokeWidth="10"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <span className="absolute flex flex-col items-center leading-none">
        <span className="tabular font-display text-[17px] font-bold text-ink">{total}</span>
        <span className="mt-0.5 text-[9px] text-ink-3">Total</span>
      </span>
    </span>
  )
}
