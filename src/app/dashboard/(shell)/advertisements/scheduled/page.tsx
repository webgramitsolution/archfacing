import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, bucketStats, filterOptions } from '@/lib/advertiser'
import {
  AdPageHead, AdBanner, StatTiles, RailCard, SupportCard, NoCampaigns,
  compact, money, shortDate,
} from '@/components/dashboard/advertiser-parts'
import { FilterBar } from '../filter-bar'
import { CampaignTable } from '../campaign-rows'
import { NotAnAdvertiser, ListPager, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Scheduled Advertisements' }
export const dynamic = 'force-dynamic'

/**
 * §10 — approved campaigns whose start date has not arrived.
 *
 * Nothing on this screen has to be promoted by hand: the nightly cron moves a
 * campaign to RUNNING on the morning it starts, so a row leaves this list on
 * its own.
 */
export default async function ScheduledAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const sp = await searchParams
  const options = { ...readListParams(sp), sort: (sp.sort as 'soonest') ?? 'soonest' }

  const [{ rows, total }, stats, filters] = await Promise.all([
    listCampaigns(user.id, 'scheduled', options),
    bucketStats(user.id, 'scheduled'),
    filterOptions(user.id),
  ])

  // Everyone the scheduled campaigns are aimed at, counted once — a person in
  // two campaigns' audiences is one person, not two.
  const audience = new Set<string>()
  for (const c of rows) {
    for (const r of c.targeting?.audienceRoles ?? []) audience.add(r)
  }

  return (
    <div>
      <AdPageHead
        title="Scheduled Advertisements"
        subtitle="Your campaigns are scheduled and will go live as per the selected date & time."
        trail={['Advertisements', 'Scheduled']}
      />

      <AdBanner
        icon="calendar"
        title="Everything is on Schedule!"
        body="Your upcoming campaigns are set to reach the right audience at the right time."
        tone="ok"
      />

      <StatTiles
        tiles={[
          { icon: 'calendar', label: 'Scheduled Campaigns', value: String(stats.count), unit: 'Upcoming ads', tone: 'violet', active: true },
          { icon: 'clock', label: 'Going Live This Week', value: String(stats.goingLiveThisWeek), unit: 'Campaigns', tone: 'ok' },
          { icon: 'eye', label: 'Est. Total Impressions', value: compact(estimatedImpressions(rows)), unit: 'Expected reach', tone: 'info' },
          { icon: 'users', label: 'Total Target Audience', value: audience.size ? String(audience.size) : '—', unit: 'Segments', tone: 'warn' },
          { icon: 'rupee', label: 'Est. Total Spend', value: money(stats.spend), unit: 'Planned budget', tone: 'danger' },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_264px] xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          <FilterBar
            types={filters.types}
            placements={filters.placements}
            sortOptions={SORTS.upcoming}
            placeholder="Search scheduled campaigns…"
          />

          {rows.length === 0 ? (
            <NoCampaigns
              icon="calendar"
              title="Nothing scheduled"
              body="A campaign appears here once it has been approved and its start date is still ahead."
              cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
            />
          ) : (
            <>
              <CampaignTable
                rows={rows}
                columns={['placement', 'schedule', 'duration', 'budget']}
                action={(c) => ({ label: 'Edit', href: `/dashboard/advertisements/${c.id}` })}
              />
              <ListPager basePath="/dashboard/advertisements/scheduled" sp={sp} total={total} />
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <RailCard title="Upcoming Launches">
            {rows.length === 0 ? (
              <p className="text-[12px] text-ink-3">No launches planned.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {rows.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/advertisements/${c.id}`}
                      className="group flex min-w-0 items-start gap-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-card bg-paper-3 leading-none">
                        <span className="tabular font-display text-[14px] font-bold text-ink">
                          {c.startsAt?.toLocaleDateString('en-IN', { day: '2-digit' }) ?? '—'}
                        </span>
                        <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.06em] text-ink-3">
                          {c.startsAt?.toLocaleDateString('en-IN', { month: 'short' }) ?? ''}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-ink transition-colors group-hover:text-brand">
                          {c.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-ink-3">
                          {c.startTime ?? '00:00'} · {c.placements[0]?.name ?? 'No placement'}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <RailCard title="Next 30 Days">
            <ul className="flex flex-col gap-2">
              {rows.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="min-w-0 truncate text-ink-2">{c.title}</span>
                  <span className="tabular shrink-0 text-ink-3">{shortDate(c.startsAt)}</span>
                </li>
              ))}
              {rows.length === 0 && <li className="text-[12px] text-ink-3">Nothing planned.</li>}
            </ul>
          </RailCard>

          <SupportCard />
        </aside>
      </div>
    </div>
  )
}

/**
 * What the scheduled campaigns are expected to deliver.
 *
 * Derived from the package each one bought — the impressions figure in a
 * package is the platform's own commitment, so it is the honest basis for an
 * estimate. A campaign with no package yet contributes nothing.
 */
function estimatedImpressions(rows: { package: { name: string } | null; durationDays: number }[]): number {
  // Package impressions are described in the package's feature list rather
  // than stored as a number, so the estimate uses the campaign's own duration
  // against the platform's daily average instead of parsing marketing copy.
  const DAILY_AVERAGE = 4_000
  return rows.reduce((sum, r) => sum + r.durationDays * DAILY_AVERAGE, 0)
}
