import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, bucketStats, filterOptions } from '@/lib/advertiser'
import {
  AdPageHead, AdBanner, StatTiles, RailCard, SupportCard, NoCampaigns,
} from '@/components/dashboard/advertiser-parts'
import { Icon } from '@/components/ui'
import { FilterBar } from '../filter-bar'
import { PendingCard } from '../campaign-rows'
import { NotAnAdvertiser, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Pending Approval' }
export const dynamic = 'force-dynamic'

/** §8 — what happens to a campaign after it is submitted. */
const TIMELINE = [
  {
    title: 'Campaign Submitted',
    body: 'Your campaign has been successfully submitted.',
  },
  {
    title: 'Under Review',
    body: 'Our team is reviewing your campaign (typically within 24–48 hours).',
  },
  {
    title: 'Approval / Changes',
    body: "You'll be notified once it's approved or if any changes are required.",
  },
  {
    title: 'Go Live',
    body: 'After approval, your campaign will go live as per the selected schedule.',
  },
]

const FAQS = [
  'How long does the approval process take?',
  'What if my campaign is rejected?',
  'Can I edit my campaign during review?',
  'Will I be notified after approval?',
  'What are the content guidelines?',
]

export default async function PendingAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const options = readListParams(await searchParams)

  const [{ rows }, stats, filters] = await Promise.all([
    listCampaigns(user.id, 'pending', options),
    bucketStats(user.id, 'pending'),
    filterOptions(user.id),
  ])

  return (
    <div>
      <AdPageHead
        title="Pending Approval"
        subtitle="Your campaigns are under review. We'll notify you once they are approved."
        trail={['Advertisements', 'Pending Approval']}
      />

      <AdBanner
        icon="clock"
        title="Your Brand is One Step Away!"
        body="Our team is reviewing your campaigns. Approved campaigns will go live as per schedule."
      />

      <StatTiles
        tiles={[
          {
            icon: 'clock',
            label: 'Pending Approval',
            value: String(stats.count),
            unit: 'Campaigns',
            tone: 'warn',
            active: true,
          },
          {
            icon: 'clock',
            label: 'Avg. Review Time',
            value: stats.avgReviewDays === null ? '—' : stats.avgReviewDays.toFixed(1),
            unit: 'Days',
            tone: 'ok',
          },
          {
            icon: 'check',
            label: 'Approved This Month',
            value: String(stats.approvedThisMonth),
            unit: 'Campaigns',
            tone: 'violet',
            // Approved campaigns are the ones running or waiting to run.
            href: '/dashboard/advertisements/active',
          },
          {
            icon: 'alert',
            label: 'Changes Requested',
            value: String(stats.changesRequested),
            unit: 'Campaigns',
            tone: 'danger',
            // CHANGES_REQUESTED shares the Rejected bucket — see BUCKETS.
            href: '/dashboard/advertisements/rejected',
          },
          {
            icon: 'chart',
            label: 'Approval Rate',
            value: stats.approvalRate === null ? '—' : `${Math.round(stats.approvalRate)}%`,
            unit: 'This Month',
            tone: 'info',
          },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_264px] xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          <FilterBar
            types={filters.types}
            placements={filters.placements}
            sortOptions={SORTS.submitted}
          />

          {rows.length === 0 ? (
            <NoCampaigns
              icon="clock"
              title="No campaigns waiting for review"
              body="Everything you have submitted has been dealt with. Create a campaign and submit it to see it here."
              cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((c) => (
                <PendingCard key={c.id} c={c} />
              ))}
            </ul>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="What Happens Next?">
            <ol className="flex flex-col gap-4">
              {TIMELINE.map((t, i) => (
                <li key={t.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-ink">{t.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">
                      {t.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
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
