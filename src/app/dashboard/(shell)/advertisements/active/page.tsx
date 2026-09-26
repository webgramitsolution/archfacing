import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, bucketStats, filterOptions } from '@/lib/advertiser'
import {
  AdPageHead, AdBanner, StatTiles, RailCard, SupportCard, NoCampaigns,
  CampaignThumb, compact, money,
} from '@/components/dashboard/advertiser-parts'
import { FilterBar } from '../filter-bar'
import { CampaignTable } from '../campaign-rows'
import { NotAnAdvertiser, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Active Advertisements' }
export const dynamic = 'force-dynamic'

/** §9 — the campaigns running right now. */
export default async function ActiveAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const options = readListParams(await searchParams)

  const [{ rows }, stats, filters] = await Promise.all([
    listCampaigns(user.id, 'active', options),
    bucketStats(user.id, 'active'),
    filterOptions(user.id),
  ])

  const top = [...rows].sort((a, b) => b.impressions - a.impressions)[0]

  return (
    <div>
      <AdPageHead
        title="Active Advertisements"
        subtitle="These campaigns are live right now. Track their performance and pause any of them at any time."
        trail={['Advertisements', 'Active']}
      />

      <AdBanner
        icon="bolt"
        title="Your Campaigns are Live!"
        body="Your advertisements are being seen across ArchFacing right now."
        tone="ok"
      />

      {/*
        Every tile leads somewhere, and where it leads is the point: clicking
        a figure ranks the list below by that figure. "Avg. CTR" opens the
        campaigns ordered by click-through rate, so the number and the list
        answer the same question.
      */}
      <StatTiles
        tiles={[
          {
            icon: 'bolt',
            label: 'Active Campaigns',
            value: String(stats.count),
            unit: 'Running now',
            tone: 'ok',
            active: true,
            href: '/dashboard/advertisements/active',
          },
          {
            icon: 'eye',
            label: 'Total Impressions',
            value: compact(stats.impressions),
            unit: 'People reached',
            tone: 'info',
            href: '/dashboard/advertisements/active?sort=impressions',
          },
          {
            icon: 'target',
            label: 'Total Clicks',
            value: compact(stats.clicks),
            unit: 'Engagements',
            tone: 'brand',
            href: '/dashboard/advertisements/active?sort=clicks',
          },
          {
            icon: 'chart',
            label: 'Avg. CTR',
            value: `${stats.ctr.toFixed(2)}%`,
            unit: 'Click through rate',
            tone: 'violet',
            href: '/dashboard/advertisements/active?sort=ctr',
          },
          {
            icon: 'rupee',
            label: 'Total Spend',
            value: money(stats.spend),
            unit: 'Committed',
            tone: 'danger',
            href: '/dashboard/advertisements/active?sort=spend',
          },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_264px] xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          <FilterBar
            types={filters.types}
            placements={filters.placements}
            sortOptions={SORTS.performance}
            placeholder="Search active campaigns…"
          />

          {rows.length === 0 ? (
            <NoCampaigns
              icon="bolt"
              title="No campaigns running"
              body="An approved campaign appears here from its start date until its last day."
              cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
            />
          ) : (
            <CampaignTable
              rows={rows}
              columns={['placement', 'dates', 'performance', 'spend']}
              action={(c) => ({ label: 'View Analytics', href: `/dashboard/advertisements/${c.id}` })}
            />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="Live Performance">
            <ul className="flex flex-col gap-3">
              <Metric label="Impressions today" value={compact(Math.round(stats.impressions / 30))} />
              <Metric label="Clicks today" value={compact(Math.round(stats.clicks / 30))} />
              <Metric label="Leads generated" value={compact(stats.leads)} />
              <Metric label="Click through rate" value={`${stats.ctr.toFixed(2)}%`} />
            </ul>
            <p className="mt-3 border-t border-line-soft pt-2.5 text-[10.5px] leading-snug text-ink-4">
              Daily figures are the campaign total spread across its run. Per-day
              recording arrives with the event tracker.
            </p>
          </RailCard>

          {top && (
            <RailCard
              title="Top Performing Campaign"
              action={
                <Link href="/dashboard/advertisements" className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
                  View All →
                </Link>
              }
            >
              <Link href={`/dashboard/advertisements/${top.id}`} className="group flex gap-3">
                <CampaignThumb src={top.imageUrl} alt={top.title} className="h-[54px] w-[86px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold text-ink transition-colors group-hover:text-brand">
                    {top.title}
                  </span>
                  <span className="tabular mt-1.5 flex gap-3 text-[11px] text-ink-3">
                    <span>{compact(top.impressions)} impressions</span>
                    <span>{compact(top.clicks)} clicks</span>
                  </span>
                </span>
              </Link>
            </RailCard>
          )}

          <SupportCard />
        </aside>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-[12px] text-ink-3">{label}</span>
      <span className="tabular shrink-0 font-display text-[14px] font-bold text-ink">{value}</span>
    </li>
  )
}
