import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, bucketStats, filterOptions, performanceSeries } from '@/lib/advertiser'
import {
  AdPageHead, AdBanner, StatTiles, RailCard, SupportCard, NoCampaigns,
  CampaignThumb, compact, money,
} from '@/components/dashboard/advertiser-parts'
import { FilterBar } from '../filter-bar'
import { CampaignTable } from '../campaign-rows'
import { NotAnAdvertiser, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Completed Advertisements' }
export const dynamic = 'force-dynamic'

/**
 * §11 — campaigns whose run has finished.
 *
 * The report stays available after completion: the figures live on the
 * campaign row, so nothing is lost when it stops running.
 */
export default async function CompletedAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const options = readListParams(await searchParams)

  const [{ rows, total }, stats, filters, series] = await Promise.all([
    listCampaigns(user.id, 'completed', options),
    bucketStats(user.id, 'completed'),
    filterOptions(user.id),
    performanceSeries(user.id, 30),
  ])

  const top = [...rows].sort((a, b) => b.impressions - a.impressions)[0]
  const peak = Math.max(1, ...series.map((s) => s.impressions))

  return (
    <div>
      <AdPageHead
        title="Completed Advertisements"
        subtitle="Your campaigns have completed successfully. View performance and results."
        trail={['Advertisements', 'Completed']}
      />

      <AdBanner
        icon="check"
        title="Great Results!"
        body="Your completed campaigns have successfully reached their target audience."
        tone="info"
      />

      <StatTiles
        tiles={[
          { icon: 'check', label: 'Completed Campaigns', value: String(stats.count), unit: 'Total completed ads', tone: 'ok', active: true },
          { icon: 'eye', label: 'Total Impressions', value: compact(stats.impressions), unit: 'People viewed your ads', tone: 'info' },
          { icon: 'target', label: 'Total Clicks', value: compact(stats.clicks), unit: 'People clicked', tone: 'brand' },
          { icon: 'chart', label: 'Avg. CTR', value: `${stats.ctr.toFixed(2)}%`, unit: 'Click through rate', tone: 'violet' },
          { icon: 'rupee', label: 'Total Spend', value: money(stats.spend), unit: 'Total amount spent', tone: 'danger' },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_264px] xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          <FilterBar
            types={filters.types}
            placements={filters.placements}
            sortOptions={SORTS.recent}
            placeholder="Search completed campaigns…"
          />

          {rows.length === 0 ? (
            <NoCampaigns
              icon="check"
              title="No completed campaigns yet"
              body="A campaign moves here on the day after its run ends, and its report stays available."
              cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
            />
          ) : (
            <>
              <CampaignTable
                rows={rows}
                columns={['placement', 'dates', 'duration', 'spend', 'results']}
                action={(c) => ({ label: 'View Report', href: `/dashboard/advertisements/${c.id}` })}
              />
              <p className="mt-3 text-[12px] text-ink-3">
                Showing {rows.length} of {total} campaign{total === 1 ? '' : 's'}
              </p>
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="Performance Overview">
            {series.every((s) => s.impressions === 0) ? (
              <p className="rounded-card border border-dashed border-line bg-paper-2 px-4 py-8 text-center text-[12px] text-ink-3">
                No campaign ran in the last 30 days.
              </p>
            ) : (
              <>
            {/*
              A plain flex chart rather than a charting library: 30 bars of two
              series is not worth a dependency, and inline bars keep the panel
              in the server bundle.
            */}
            <div className="flex h-[120px] items-end gap-[3px]">
              {series.map((s) => (
                <span
                  key={s.at.toISOString()}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end gap-[2px]"
                  title={`${s.at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${compact(s.impressions)} impressions, ${compact(s.clicks)} clicks`}
                >
                  <span
                    className="w-full rounded-t-[2px] bg-info"
                    style={{ height: `${(s.impressions / peak) * 82}%` }}
                  />
                  <span
                    className="w-full rounded-t-[2px] bg-ok"
                    style={{ height: `${(s.clicks / peak) * 82}%` }}
                  />
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-info" /> Impressions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ok" /> Clicks
              </span>
            </div>
              </>
            )}
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

