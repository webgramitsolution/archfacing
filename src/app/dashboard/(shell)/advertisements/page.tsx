import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import {
  overviewStats, overviewDeltas, listAllCampaigns, performanceSeries,
  audienceByLocation, recentActivity, BUCKETS,
} from '@/lib/advertiser'
import {
  AdPageHead, RailCard, NoCampaigns,
  CampaignThumb, StatusPill,
  compact, money, dateRange, ago,
} from '@/components/dashboard/advertiser-parts'
import {
  CreateAdButton, AdvertiserHero, OverviewTiles,
  PerformanceChart, AudienceMap, HelpBar,
} from '@/components/dashboard/advertiser-overview-parts'
import { Icon } from '@/components/ui'
import { NotAnAdvertiser } from './list-params'
import { cn } from '@/lib/utils'
import { adTone } from '@/lib/ad-tone'
import { platformReach } from '@/lib/platform-reach'
import type { AdStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'My Advertisements' }
export const dynamic = 'force-dynamic'

/** The tabs over the table, and which statuses each one shows. */
const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'active', label: 'Active', statuses: BUCKETS.active },
  { key: 'scheduled', label: 'Scheduled', statuses: BUCKETS.scheduled },
  { key: 'pending', label: 'Pending Approval', statuses: BUCKETS.pending },
  { key: 'drafts', label: 'Drafts', statuses: BUCKETS.drafts },
  { key: 'completed', label: 'Completed', statuses: BUCKETS.completed },
  { key: 'rejected', label: 'Rejected', statuses: BUCKETS.rejected },
] as const


/**
 * §5 — the advertiser's advertisement home.
 *
 * Every figure here is the same figure the individual screens print, because
 * both read `lib/advertiser.ts`. There is no second place for a total to be
 * computed and drift.
 */
export default async function MyAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const sp = await searchParams
  // Real platform reach for the hero band — never a hardcoded claim.
  const reach = await platformReach()
  const tab = TABS.find((t) => t.key === (sp.tab ?? 'all')) ?? TABS[0]
  const q = sp.q?.trim().toLowerCase() ?? ''

  const [stats, deltas, all, series, locations, activity] = await Promise.all([
    overviewStats(user.id),
    overviewDeltas(user.id),
    listAllCampaigns(user.id),
    performanceSeries(user.id, 30),
    audienceByLocation(user.id),
    recentActivity(user.id),
  ])

  const rows = all
    .filter((c) => (tab.statuses ? (tab.statuses as readonly AdStatus[]).includes(c.status) : true))
    .filter((c) => (q ? `${c.title} ${c.headline ?? ''}`.toLowerCase().includes(q) : true))

  return (
    <div>
      <AdPageHead
        title="Advertisements"
        subtitle="Create, manage and grow your brand with India's largest Architecture & Design community."
        trail={['Advertisements']}
        action={<CreateAdButton />}
        showHelp={false}
      />

      <AdvertiserHero reach={reach} />

      <OverviewTiles
        tiles={[
          { icon: 'bolt', label: 'Total Campaigns', value: String(stats.counts.all), tone: 'brand', delta: deltas.total },
          { icon: 'check', label: 'Active Campaigns', value: String(stats.counts.active), tone: 'ok', delta: deltas.active },
          { icon: 'calendar', label: 'Scheduled', value: String(stats.counts.scheduled), tone: 'warn', delta: deltas.scheduled },
          { icon: 'eye', label: 'Impressions', value: compact(stats.impressions), tone: 'violet', delta: deltas.impressions },
          { icon: 'target', label: 'Clicks', value: compact(stats.clicks), tone: 'sky', delta: deltas.clicks },
          { icon: 'users', label: 'Leads Generated', value: compact(stats.leads), tone: 'info', delta: deltas.leads },
          { icon: 'rupee', label: 'Total Spent', value: money(stats.totalSpent), tone: 'danger', delta: null },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-[1fr_276px] xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* ═══ performance ═══ */}
          <section className="card mb-5 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-bold text-ink">Campaign Performance</h2>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  Track your advertisement performance over time
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* The chart's fixed scope, stated as plain text — these used to
                    be styled like dropdowns but could not be changed. */}
                <span className="text-[11.5px] font-medium text-ink-3">Last 30 days · All campaigns</span>
                <Link
                  href="/dashboard/advertisements/active"
                  className="text-[11.5px] font-semibold text-brand hover:underline"
                >
                  View Active Campaigns →
                </Link>
              </div>
            </div>

            {series.every((s) => s.impressions === 0) ? (
              <p className="rounded-card border border-dashed border-line bg-paper-2 px-4 py-12 text-center text-[12.5px] text-ink-3">
                No campaign ran in the last 30 days. The chart fills in as soon as one does.
              </p>
            ) : (
              <PerformanceChart series={series} />
            )}
          </section>

          {/* ═══ the table ═══ */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-bold text-ink">My Advertisements</h2>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  Manage and track all your advertising campaigns
                </p>
              </div>

              {/*
                A plain GET form, not a client component: the search lands in
                the URL, the server filters, and the result can be linked to or
                reloaded without losing the query.
              */}
              <form className="flex shrink-0 items-center gap-2" action="/dashboard/advertisements">
                {tab.key !== 'all' && <input type="hidden" name="tab" value={tab.key} />}
                <label className="relative">
                  <span className="sr-only">Search campaigns</span>
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4"
                  />
                  <input
                    name="q"
                    defaultValue={sp.q ?? ''}
                    placeholder="Search campaigns…"
                    className="input h-9 w-[13rem] py-0 pl-8 text-[12.5px]"
                  />
                </label>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-card border border-line bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
                >
                  <Icon name="search" className="h-3.5 w-3.5" />
                  Search
                </button>
              </form>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-3 scrollbar-none">
              {TABS.map((t) => {
                const count =
                  t.key === 'all'
                    ? stats.counts.all
                    : stats.counts[t.key as keyof typeof stats.counts]
                return (
                  <Link
                    key={t.key}
                    href={t.key === 'all' ? '/dashboard/advertisements' : `/dashboard/advertisements?tab=${t.key}`}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-t-card border-b-2 px-3.5 pb-2.5 pt-1 text-[12.5px] font-semibold transition-colors',
                      t.key === tab.key
                        ? 'border-brand text-brand'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    )}
                  >
                    {t.label} ({count})
                  </Link>
                )
              })}
            </div>

            {rows.length === 0 ? (
              <div className="p-5">
                <NoCampaigns
                  icon="image"
                  title={q ? 'Nothing matched that search' : 'No campaigns here'}
                  body={
                    q
                      ? 'Try a different campaign name, or clear the search to see everything.'
                      : 'Create your first advertisement and it will appear in this table as it moves through review, scheduling and going live.'
                  }
                  cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
                />
              </div>
            ) : (
              <div className="scroll-slim-light overflow-x-auto">
                <table className="w-full min-w-[840px] border-collapse">
                  <thead>
                    <tr className="border-b border-line-soft">
                      {['Campaign', 'Type', 'Placement', 'Duration', 'Status', 'Performance', 'Spend', 'Actions'].map(
                        (h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-ink-3"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-b border-line-soft last:border-0">
                        <td className="px-4 py-3">
                          <span className="flex min-w-0 items-center gap-3">
                            <CampaignThumb src={c.imageUrl} alt={c.title} className="h-[42px] w-[68px]" />
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-bold text-ink">
                                {c.title}
                              </span>
                              {c.headline && (
                                <span className="block truncate text-[11px] text-ink-3">
                                  {c.headline}
                                </span>
                              )}
                            </span>
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {c.adType ? (
                            <span
                              className={cn(
                                'inline-flex rounded-card border px-2 py-[3px] text-[10.5px] font-semibold',
                                adTone(c.adType.slug).pill
                              )}
                            >
                              {c.adType.name.replace(' Advertisement', '')}
                            </span>
                          ) : (
                            <Dash />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[12px] text-ink-2">
                          {c.placements[0]?.name ?? <Dash />}
                        </td>

                        <td className="tabular whitespace-nowrap px-4 py-3 text-[11.5px] text-ink-2">
                          {dateRange(c.startsAt, c.endsAt)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill status={c.status} />
                        </td>

                        <td className="tabular whitespace-nowrap px-4 py-3 text-[11.5px] text-ink-2">
                          {c.impressions > 0 ? (
                            <>
                              {c.impressions.toLocaleString('en-IN')}
                              <span className="block text-[10.5px] text-ink-3">
                                {c.clicks.toLocaleString('en-IN')} clicks · {c.leads} leads
                              </span>
                            </>
                          ) : (
                            <Dash />
                          )}
                        </td>

                        <td className="tabular whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-ink">
                          {c.spend > 0 ? money(c.spend) : <Dash />}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={
                              c.status === 'DRAFT'
                                ? `/dashboard/advertisements/create?draft=${c.id}`
                                : `/dashboard/advertisements/${c.id}`
                            }
                            className="rounded-card border border-line px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                          >
                            {c.status === 'DRAFT' ? 'Continue' : 'View'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/*
          ═══ the rail ═══

          Below `lg` the rail is no longer a rail — it is a full-width band
          under the table, and two stacked cards there leave half the row
          empty. On tablet it runs as two columns side by side; from `lg` it
          becomes the single column beside the table again.
        */}
        <aside className="grid min-w-0 content-start gap-4 md:grid-cols-2 lg:grid-cols-1">
          <RailCard
            title="Audience Reach"
            action={<span className="shrink-0 text-[11px] font-medium text-ink-3">By location</span>}
          >
            <AudienceMap rows={locations} />
          </RailCard>

          <RailCard
            title="Recent Activity"
            action={
              <Link href="/dashboard/notifications" className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
                View All →
              </Link>
            }
          >
            {activity.length === 0 ? (
              <p className="text-[12px] text-ink-3">Nothing has happened yet.</p>
            ) : (
              <ul className="flex flex-col">
                {activity.map((a) => (
                  <li
                    key={a.id + a.at.toISOString()}
                    className="border-b border-line-soft last:border-0"
                  >
                    <Link
                      href={`/dashboard/advertisements/${a.id}`}
                      className="group flex items-center gap-2.5 py-2.5"
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          activityTone(a.what)
                        )}
                      >
                        <Icon name={activityIcon(a.what)} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-ink transition-colors group-hover:text-brand">
                          {a.what}
                        </span>
                        <span className="block text-[10.5px] text-ink-4">{ago(a.at)}</span>
                      </span>
                      <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>
        </aside>
      </div>

      <HelpBar />
    </div>
  )
}

/** The activity dot takes its colour from what happened, not from its position. */
function activityTone(what: string): string {
  if (/approved|live|completed/i.test(what)) return 'bg-ok-soft text-ok'
  if (/rejected|changes/i.test(what)) return 'bg-danger-soft text-danger'
  if (/paused|awaiting/i.test(what)) return 'bg-warn-soft text-warn'
  if (/submitted|review/i.test(what)) return 'bg-info-soft text-info'
  return 'bg-brand-soft text-brand'
}

function activityIcon(what: string): Parameters<typeof Icon>[0]['name'] {
  if (/approved|live|completed/i.test(what)) return 'check'
  if (/rejected|changes/i.test(what)) return 'alert'
  if (/submitted|review/i.test(what)) return 'clock'
  if (/draft/i.test(what)) return 'file'
  return 'bell'
}

function Dash() {
  return <span className="text-ink-4">—</span>
}
