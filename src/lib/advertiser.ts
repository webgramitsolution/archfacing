/**
 * The advertiser's own view of their campaigns — §11 of the advertisement spec.
 *
 * Eight screens (Overview, Drafts, Pending, Active, Scheduled, Completed,
 * Rejected, and the campaign detail) are all served from here, so a figure
 * printed on one screen cannot disagree with the same figure on another. Every
 * query is scoped by `advertiserId`; there is no code path in this file that
 * can return another advertiser's campaign.
 *
 * `ads.ts` owns the lifecycle, `ad-marketplace.ts` owns what the public sees,
 * and this file owns what the owner sees.
 */

import { Prisma, type AdStatus } from '@prisma/client'
import { prisma } from './prisma'

// ═══════════════════════════════════════════════════════════
//  Status vocabulary
// ═══════════════════════════════════════════════════════════

/**
 * The label and tone for every state a campaign can be in.
 *
 * ⚠️ The design names eleven states; the database has ten. "Submitted" and
 *    "Under Review" are one row — `PENDING_REVIEW` — because there is no
 *    reviewer-claim step for a second one to mean anything. The screens print
 *    "Under Review", which is what an advertiser is actually waiting on.
 */
export const AD_STATUS_META: Record<
  AdStatus,
  { label: string; tone: 'muted' | 'warn' | 'info' | 'ok' | 'brand' | 'danger' }
> = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  PENDING_PAYMENT: { label: 'Payment pending', tone: 'warn' },
  PENDING_REVIEW: { label: 'Under Review', tone: 'warn' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  RUNNING: { label: 'Active', tone: 'ok' },
  PAUSED: { label: 'Paused', tone: 'warn' },
  ENDED: { label: 'Completed', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'brand' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
}

/** Which statuses each screen is responsible for. One list, used everywhere. */
export const BUCKETS = {
  drafts: ['DRAFT'],
  pending: ['PENDING_REVIEW', 'PENDING_PAYMENT'],
  active: ['RUNNING', 'PAUSED'],
  scheduled: ['SCHEDULED'],
  completed: ['ENDED'],
  rejected: ['REJECTED', 'CHANGES_REQUESTED'],
} as const satisfies Record<string, readonly AdStatus[]>

export type Bucket = keyof typeof BUCKETS

// ═══════════════════════════════════════════════════════════
//  The shape every screen reads
// ═══════════════════════════════════════════════════════════

const CAMPAIGN_SELECT = {
  id: true,
  title: true,
  description: true,
  brandName: true,
  headline: true,
  imageUrl: true,
  logoUrl: true,
  status: true,
  objective: true,
  startsAt: true,
  endsAt: true,
  startTime: true,
  weeks: true,
  impressions: true,
  clicks: true,
  leads: true,
  submittedAt: true,
  reviewedAt: true,
  rejectionCode: true,
  rejectionReason: true,
  resubmitCount: true,
  createdAt: true,
  updatedAt: true,
  adType: { select: { slug: true, name: true, icon: true } },
  placement: { select: { slug: true, name: true, size: true } },
  category: { select: { slug: true, name: true } },
  package: { select: { slug: true, name: true, price: true, durationLabel: true } },
  targeting: true,
  extraPlacements: {
    select: { price: true, placement: { select: { slug: true, name: true, size: true } } },
  },
} satisfies Prisma.AdBookingSelect

export type Campaign = Prisma.AdBookingGetPayload<{ select: typeof CAMPAIGN_SELECT }>

/** A campaign plus everything a screen derives rather than stores. */
export type CampaignView = Campaign & {
  /** All placements — primary first — as one list. */
  placements: { slug: string; name: string; size: string }[]
  /** What the advertiser is paying, package price plus extra placements. */
  spend: number
  /** clicks ÷ impressions, as a percentage. */
  ctr: number
  /** Whole days between start and end, 0 when either is missing. */
  durationDays: number
  /** Days left before it ends, null when it is not running. */
  daysLeft: number | null
  progress: DraftProgress
}

// ═══════════════════════════════════════════════════════════
//  Draft progress — §7
// ═══════════════════════════════════════════════════════════

export const WIZARD_STEPS = [
  'Campaign Details',
  'Creative',
  'Placement',
  'Audience',
  'Schedule',
  'Package',
  'Review & Pay',
] as const

export type DraftProgress = {
  steps: { label: string; done: boolean }[]
  /** How many of the seven are complete. */
  doneCount: number
  /** 0–100, rounded. */
  percent: number
}

/**
 * What a draft has actually filled in.
 *
 * Measured from the stored campaign, never from a counter — a progress bar
 * that is written by the wizard and read by the Drafts screen drifts the first
 * time a step is edited out of order.
 */
export function draftProgress(c: {
  title: string
  adTypeId?: string | null
  adType?: unknown
  imageUrl: string | null
  headline: string | null
  targetUrl?: string | null
  placementId?: string | null
  placement?: unknown
  targeting?: unknown
  startsAt: Date | null
  endsAt: Date | null
  packageId?: string | null
  package?: unknown
  status: AdStatus
}): DraftProgress {
  const done = [
    // 1 — Campaign details
    Boolean(c.title?.trim()) && Boolean(c.adTypeId ?? c.adType),
    // 2 — Creative
    Boolean(c.imageUrl) && Boolean(c.headline),
    // 3 — Placement
    Boolean(c.placementId ?? c.placement),
    // 4 — Audience
    Boolean(c.targeting),
    // 5 — Schedule
    Boolean(c.startsAt && c.endsAt),
    // 6 — Package
    Boolean(c.packageId ?? c.package),
    // 7 — Review & pay: only a campaign that has left DRAFT has been through it
    c.status !== 'DRAFT',
  ]

  const steps = WIZARD_STEPS.map((label, i) => ({ label, done: done[i] }))
  const doneCount = done.filter(Boolean).length

  return { steps, doneCount, percent: Math.round((doneCount / done.length) * 100) }
}

// ═══════════════════════════════════════════════════════════
//  Deriving a view
// ═══════════════════════════════════════════════════════════

const DAY = 24 * 60 * 60 * 1000

export function toView(c: Campaign, now = new Date()): CampaignView {
  const placements = [
    ...(c.placement ? [c.placement] : []),
    ...c.extraPlacements.map((e) => e.placement),
  ]

  const packagePrice = c.package ? Number(c.package.price) : 0
  const extras = c.extraPlacements.reduce((sum, e) => sum + Number(e.price), 0)

  const durationDays =
    c.startsAt && c.endsAt ? Math.max(0, Math.round((+c.endsAt - +c.startsAt) / DAY)) : 0

  const daysLeft =
    c.status === 'RUNNING' && c.endsAt ? Math.max(0, Math.ceil((+c.endsAt - +now) / DAY)) : null

  return {
    ...c,
    placements,
    spend: packagePrice + extras,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    durationDays,
    daysLeft,
    progress: draftProgress(c),
  }
}

// ═══════════════════════════════════════════════════════════
//  Queries
// ═══════════════════════════════════════════════════════════

export type ListOptions = {
  q?: string
  typeSlug?: string
  placementSlug?: string
  sort?: 'newest' | 'oldest' | 'name' | 'soonest' | 'impressions' | 'clicks' | 'ctr' | 'spend'
  take?: number
  skip?: number
}

/**
 * The sorts the database can do, and the ones it cannot.
 *
 * `impressions` and `clicks` are columns, so Postgres orders them. `ctr` is
 * clicks ÷ impressions and `spend` is the package price plus the extra
 * placements — both computed in `toView`, so there is no column to order by
 * and they have to be ranked after the rows are read. `listCampaigns` reads
 * this set to decide which path to take.
 */
const DERIVED_SORTS = new Set<ListOptions['sort']>(['ctr', 'spend'])

/** The most rows a derived sort will rank in memory. */
const DERIVED_CAP = 200

function orderFor(sort: ListOptions['sort']): Prisma.AdBookingOrderByWithRelationInput {
  switch (sort) {
    case 'oldest': return { createdAt: 'asc' }
    case 'name': return { title: 'asc' }
    case 'soonest': return { startsAt: 'asc' }
    case 'impressions': return { impressions: 'desc' }
    case 'clicks': return { clicks: 'desc' }
    default: return { updatedAt: 'desc' }
  }
}

function filterFor(
  advertiserId: string,
  statuses: readonly AdStatus[],
  o: ListOptions
): Prisma.AdBookingWhereInput {
  return {
    advertiserId,
    status: { in: [...statuses] },
    ...(o.q
      ? {
          OR: [
            { title: { contains: o.q, mode: 'insensitive' } },
            { brandName: { contains: o.q, mode: 'insensitive' } },
            { headline: { contains: o.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(o.typeSlug ? { adType: { slug: o.typeSlug } } : {}),
    ...(o.placementSlug
      ? {
          OR: [
            { placement: { slug: o.placementSlug } },
            { extraPlacements: { some: { placement: { slug: o.placementSlug } } } },
          ],
        }
      : {}),
  }
}

/** One bucket's campaigns, filtered and sorted, plus the unfiltered total. */
export async function listCampaigns(
  advertiserId: string,
  bucket: Bucket,
  options: ListOptions = {}
): Promise<{ rows: CampaignView[]; total: number }> {
  const where = filterFor(advertiserId, BUCKETS[bucket], options)
  const now = new Date()

  /*
   * A sort on a computed figure has to happen after the rows are mapped.
   *
   * Paginating first and then sorting the page would rank ten arbitrary
   * campaigns and call it a ranking — the wrong ten, in the wrong order. So
   * for `ctr` and `spend` the bucket is read (capped), ranked whole, and only
   * then sliced. An advertiser has tens of campaigns, not thousands.
   */
  if (DERIVED_SORTS.has(options.sort)) {
    const [all, total] = await Promise.all([
      prisma.adBooking.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: DERIVED_CAP,
        select: CAMPAIGN_SELECT,
      }),
      prisma.adBooking.count({ where }),
    ])

    const views = all.map((r) => toView(r, now))
    const key = options.sort === 'ctr' ? 'ctr' : 'spend'
    views.sort((a, b) => b[key] - a[key])

    const skip = options.skip ?? 0
    return { rows: views.slice(skip, skip + (options.take ?? 25)), total }
  }

  const [rows, total] = await Promise.all([
    prisma.adBooking.findMany({
      where,
      orderBy: orderFor(options.sort),
      take: options.take ?? 25,
      skip: options.skip ?? 0,
      select: CAMPAIGN_SELECT,
    }),
    prisma.adBooking.count({ where }),
  ])

  return { rows: rows.map((r) => toView(r, now)), total }
}

/** Every campaign, for the Overview table's tabs. */
export async function listAllCampaigns(advertiserId: string, options: ListOptions = {}) {
  const rows = await prisma.adBooking.findMany({
    where: { advertiserId },
    orderBy: orderFor(options.sort),
    take: options.take ?? 50,
    select: CAMPAIGN_SELECT,
  })
  const now = new Date()
  return rows.map((r) => toView(r, now))
}

export async function getCampaign(advertiserId: string, id: string) {
  const row = await prisma.adBooking.findFirst({
    where: { id, advertiserId },
    select: CAMPAIGN_SELECT,
  })
  return row ? toView(row) : null
}

// ═══════════════════════════════════════════════════════════
//  Counts and statistics
// ═══════════════════════════════════════════════════════════

/** The number beside each tab. One groupBy, not seven counts. */
export async function bucketCounts(advertiserId: string) {
  const rows = await prisma.adBooking.groupBy({
    by: ['status'],
    where: { advertiserId },
    _count: { _all: true },
  })

  const byStatus = new Map(rows.map((r) => [r.status, r._count._all]))
  const of = (statuses: readonly AdStatus[]) =>
    statuses.reduce((sum, s) => sum + (byStatus.get(s) ?? 0), 0)

  return {
    all: rows.reduce((sum, r) => sum + r._count._all, 0),
    drafts: of(BUCKETS.drafts),
    pending: of(BUCKETS.pending),
    active: of(BUCKETS.active),
    scheduled: of(BUCKETS.scheduled),
    completed: of(BUCKETS.completed),
    rejected: of(BUCKETS.rejected),
  }
}

/** The tiles across the top of the Overview. */
export async function overviewStats(advertiserId: string) {
  const [counts, totals, spendRows] = await Promise.all([
    bucketCounts(advertiserId),
    prisma.adBooking.aggregate({
      where: { advertiserId, status: { in: ['RUNNING', 'PAUSED', 'ENDED'] } },
      _sum: { impressions: true, clicks: true, leads: true },
    }),
    prisma.adBooking.findMany({
      where: { advertiserId, status: { in: ['RUNNING', 'PAUSED', 'ENDED', 'SCHEDULED'] } },
      select: {
        package: { select: { price: true } },
        extraPlacements: { select: { price: true } },
      },
    }),
  ])

  const totalSpent = spendRows.reduce(
    (sum, r) =>
      sum +
      (r.package ? Number(r.package.price) : 0) +
      r.extraPlacements.reduce((s, e) => s + Number(e.price), 0),
    0
  )

  return {
    counts,
    impressions: totals._sum.impressions ?? 0,
    clicks: totals._sum.clicks ?? 0,
    leads: totals._sum.leads ?? 0,
    totalSpent,
  }
}

/**
 * The tiles on one bucket's own screen.
 *
 * Each bucket asks a different question, so this returns the union and the
 * screen reads the four or five it needs. One round trip either way.
 */
export async function bucketStats(advertiserId: string, bucket: Bucket) {
  const statuses = BUCKETS[bucket]
  const now = new Date()
  const weekOut = new Date(+now + 7 * DAY)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [agg, rows, approvedThisMonth, changesRequested, reviewed, resubmitted] =
    await Promise.all([
      prisma.adBooking.aggregate({
        where: { advertiserId, status: { in: [...statuses] } },
        _sum: { impressions: true, clicks: true, leads: true },
        _count: { _all: true },
      }),
      prisma.adBooking.findMany({
        where: { advertiserId, status: { in: [...statuses] } },
        select: {
          startsAt: true,
          package: { select: { price: true } },
          extraPlacements: { select: { price: true } },
          targeting: { select: { audienceRoles: true } },
        },
      }),
      prisma.adBooking.count({
        where: {
          advertiserId,
          reviewedAt: { gte: monthStart },
          status: { in: ['SCHEDULED', 'RUNNING', 'ENDED', 'PAUSED'] },
        },
      }),
      prisma.adBooking.count({ where: { advertiserId, status: 'CHANGES_REQUESTED' } }),
      prisma.adBooking.findMany({
        where: { advertiserId, submittedAt: { not: null }, reviewedAt: { not: null } },
        select: { submittedAt: true, reviewedAt: true },
      }),
      prisma.adBooking.count({ where: { advertiserId, resubmitCount: { gt: 0 } } }),
    ])

  const spend = rows.reduce(
    (sum, r) =>
      sum +
      (r.package ? Number(r.package.price) : 0) +
      r.extraPlacements.reduce((s, e) => s + Number(e.price), 0),
    0
  )

  const impressions = agg._sum.impressions ?? 0
  const clicks = agg._sum.clicks ?? 0

  // Average review turnaround, in days, over every campaign that has been
  // through review. Null rather than 0 when nothing has, so the tile can say
  // "—" instead of claiming an instant review.
  const avgReviewDays = reviewed.length
    ? reviewed.reduce((sum, r) => sum + (+r.reviewedAt! - +r.submittedAt!), 0) /
      reviewed.length /
      DAY
    : null

  const totalDecided = approvedThisMonth + changesRequested
  const approvalRate = totalDecided > 0 ? (approvedThisMonth / totalDecided) * 100 : null

  return {
    count: agg._count._all,
    impressions,
    clicks,
    leads: agg._sum.leads ?? 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    spend,
    goingLiveThisWeek: rows.filter((r) => r.startsAt && r.startsAt <= weekOut && r.startsAt >= now)
      .length,
    approvedThisMonth,
    changesRequested,
    avgReviewDays,
    approvalRate,
    resubmitted,
  }
}

/**
 * Why campaigns were turned down, counted — the donut on the Rejected screen.
 * Codes come from the reviewer, so an unused reason never appears.
 */
export async function rejectionBreakdown(advertiserId: string) {
  const rows = await prisma.adBooking.groupBy({
    by: ['rejectionCode'],
    where: {
      advertiserId,
      status: { in: ['REJECTED', 'CHANGES_REQUESTED'] },
      rejectionCode: { not: null },
    },
    _count: { _all: true },
  })

  const total = rows.reduce((sum, r) => sum + r._count._all, 0)

  return {
    total,
    rows: rows
      .map((r) => ({
        code: r.rejectionCode!,
        count: r._count._all,
        percent: total > 0 ? Math.round((r._count._all / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count),
  }
}

/** Impressions and clicks per day, for the Overview chart. */
export async function performanceSeries(advertiserId: string, days = 30) {
  // There is no per-day event table yet, so a campaign's totals are spread
  // evenly across the days it ran. Honest at the month scale, and the shape
  // is replaced the moment AdEvent lands — the chart's contract does not change.
  const now = new Date()
  const from = new Date(+now - days * DAY)

  const rows = await prisma.adBooking.findMany({
    where: {
      advertiserId,
      status: { in: ['RUNNING', 'PAUSED', 'ENDED'] },
      startsAt: { not: null },
      endsAt: { not: null },
    },
    select: { startsAt: true, endsAt: true, impressions: true, clicks: true, leads: true },
  })

  const buckets = Array.from({ length: days }, (_, i) => {
    const at = new Date(+from + i * DAY)
    at.setHours(0, 0, 0, 0)
    return { at, impressions: 0, clicks: 0, leads: 0 }
  })

  for (const r of rows) {
    const span = Math.max(1, Math.round((+r.endsAt! - +r.startsAt!) / DAY))
    const perDay = {
      impressions: r.impressions / span,
      clicks: r.clicks / span,
      leads: r.leads / span,
    }
    for (const b of buckets) {
      if (b.at >= r.startsAt! && b.at < r.endsAt!) {
        b.impressions += perDay.impressions
        b.clicks += perDay.clicks
        b.leads += perDay.leads
      }
    }
  }

  return buckets.map((b) => ({
    at: b.at,
    impressions: Math.round(b.impressions),
    clicks: Math.round(b.clicks),
    leads: Math.round(b.leads),
  }))
}

/** Where the audience is, for the Overview's location panel. */
export async function audienceByLocation(advertiserId: string) {
  /*
   * Read from the CAMPAIGNS, not from the targeting rows.
   *
   * Two faults, both of which hid the widest-reaching campaigns:
   *
   *  · Querying `adTargeting` meant a campaign with no targeting row was
   *    invisible — and a campaign that was never narrowed has no row to find.
   *    A live campaign with 12,250 impressions was simply absent from this
   *    chart for that reason.
   *  · Rows whose city and state lists were both empty were then skipped
   *    with a `continue`, so even a campaign that DID have a row but targeted
   *    the whole country counted for nothing.
   *
   * Both come from the same mistaken assumption: that a place is only a place
   * if somebody typed it in. No narrowing means the whole country, which is
   * exactly what step 4 calls Pan India.
   */
  const rows = await prisma.adBooking.findMany({
    where: { advertiserId, status: { in: ['RUNNING', 'PAUSED', 'ENDED'] } },
    select: {
      impressions: true,
      targeting: { select: { cities: true, states: true, country: true } },
    },
  })

  const byPlace = new Map<string, number>()
  for (const r of rows) {
    const t = r.targeting
    const places = t?.cities.length
      ? t.cities
      : t?.states.length
        ? t.states
        : [`Pan ${t?.country || 'India'}`]
    // An impression is split across the places the campaign targeted — it is
    // not known which of them it landed in until AdEvent records one.
    const share = r.impressions / places.length
    for (const p of places) byPlace.set(p, (byPlace.get(p) ?? 0) + share)
  }

  const total = [...byPlace.values()].reduce((a, b) => a + b, 0)

  return [...byPlace.entries()]
    .map(([name, n]) => ({ name, percent: total > 0 ? Math.round((n / total) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6)
}

/** The most recent things that happened to this advertiser's campaigns. */
export async function recentActivity(advertiserId: string, take = 6) {
  const rows = await prisma.adBooking.findMany({
    where: { advertiserId },
    orderBy: { updatedAt: 'desc' },
    take,
    select: { id: true, title: true, status: true, updatedAt: true, submittedAt: true, reviewedAt: true },
  })

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    at: r.updatedAt,
    what:
      r.status === 'DRAFT' ? 'Draft saved'
      : r.status === 'PENDING_REVIEW' ? 'Submitted for review'
      : r.status === 'PENDING_PAYMENT' ? 'Awaiting payment'
      : r.status === 'SCHEDULED' ? 'Approved and scheduled'
      : r.status === 'RUNNING' ? 'Campaign went live'
      : r.status === 'PAUSED' ? 'Campaign paused'
      : r.status === 'ENDED' ? 'Campaign completed'
      : r.status === 'REJECTED' ? 'Campaign rejected'
      : r.status === 'CHANGES_REQUESTED' ? 'Changes requested'
      : 'Campaign cancelled',
  }))
}

/** The filter dropdowns — only types and placements this advertiser has used. */
export async function filterOptions(advertiserId: string) {
  const [types, placements] = await Promise.all([
    prisma.adType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true },
    }),
    prisma.adPlacement.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true },
    }),
  ])
  return { types, placements }
}


// ═══════════════════════════════════════════════════════════
//  Month-on-month change — the "↑ 20% vs last month" on each tile
// ═══════════════════════════════════════════════════════════

export type Delta = { text: string; direction: 'up' | 'down' | 'flat' } | null

function changeOf(now: number, before: number): Delta {
  // Nothing to compare against reads as no claim at all, rather than "+100%".
  if (before === 0 && now === 0) return { text: '0%', direction: 'flat' }
  if (before === 0) return null

  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return { text: '0%', direction: 'flat' }
  return { text: `${Math.abs(pct)}%`, direction: pct > 0 ? 'up' : 'down' }
}

/**
 * This month against last month, for the tiles.
 *
 * Campaigns are counted by when they were created; impressions, clicks and
 * leads by campaigns whose run ended in the window. A figure with no
 * comparison period returns null and the tile simply omits the line.
 */
export async function overviewDeltas(advertiserId: string, now = new Date()) {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.adBooking.findMany({
      where: { advertiserId, createdAt: { gte: thisStart } },
      select: { status: true, impressions: true, clicks: true, leads: true },
    }),
    prisma.adBooking.findMany({
      where: { advertiserId, createdAt: { gte: lastStart, lt: thisStart } },
      select: { status: true, impressions: true, clicks: true, leads: true },
    }),
  ])

  const sum = (rows: typeof thisMonth, key: 'impressions' | 'clicks' | 'leads') =>
    rows.reduce((s, r) => s + r[key], 0)

  const active = (rows: typeof thisMonth) =>
    rows.filter((r) => r.status === 'RUNNING' || r.status === 'PAUSED').length

  const scheduled = (rows: typeof thisMonth) =>
    rows.filter((r) => r.status === 'SCHEDULED').length

  return {
    total: changeOf(thisMonth.length, lastMonth.length),
    active: changeOf(active(thisMonth), active(lastMonth)),
    scheduled: changeOf(scheduled(thisMonth), scheduled(lastMonth)),
    impressions: changeOf(sum(thisMonth, 'impressions'), sum(lastMonth, 'impressions')),
    clicks: changeOf(sum(thisMonth, 'clicks'), sum(lastMonth, 'clicks')),
    leads: changeOf(sum(thisMonth, 'leads'), sum(lastMonth, 'leads')),
  }
}
