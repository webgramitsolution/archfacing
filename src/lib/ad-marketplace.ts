/**
 * The Advertisement marketplace — the read side of §7.4.6.
 *
 * `ads.ts` owns a campaign's life: booking it, paying for it, approving it,
 * ending it. This file owns what the rest of the site is allowed to SEE of
 * those campaigns, plus the featured-slot controls an admin drives.
 *
 * The rule that shapes every function here: **the database decides which
 * advertiser appears, never the frontend.** The public page asks for "the
 * active featured campaigns" and renders whatever comes back. Nothing on it
 * knows the name of a brand.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { AdError } from './ads'

// ═══════════════════════════════════════════════════════════
//  What a visitor may see
// ═══════════════════════════════════════════════════════════

/**
 * The condition a campaign must satisfy before anyone outside the dashboard
 * sees it — §25.
 *
 * Written once and reused by every public query below, so there is no second
 * place for the rule to drift to. A campaign outside its dates, paused,
 * unapproved, or belonging to a suspended advertiser fails it.
 */
export function liveCampaignWhere(now = new Date()): Prisma.AdBookingWhereInput {
  return {
    status: 'RUNNING',
    startsAt: { lte: now },
    endsAt: { gt: now },
    advertiser: { status: 'ACTIVE', deletedAt: null },
  }
}

const FEATURED_SELECT = {
  id: true,
  title: true,
  brandName: true,
  tagline: true,
  headline: true,
  description: true,
  ctaText: true,
  logoUrl: true,
  imageUrl: true,
  mobileImageUrl: true,
  targetUrl: true,
  featuredPriority: true,
  advertiser: {
    select: {
      name: true,
      logo: true,
      corporateProfile: {
        select: { companyName: true, companyLogo: true, isVerified: true },
      },
    },
  },
} satisfies Prisma.AdBookingSelect

/**
 * A featured campaign as the rail needs it.
 *
 * `imageUrl` and `targetUrl` are nullable on the row — a draft has neither —
 * but a campaign cannot reach the rail without them, so the type states that
 * and `featuredAds` enforces it in both the query and the mapping.
 */
export type FeaturedAd = Omit<
  Prisma.AdBookingGetPayload<{ select: typeof FEATURED_SELECT }>,
  'imageUrl' | 'targetUrl'
> & {
  imageUrl: string
  targetUrl: string
  /** The rail position it was assigned to. */
  slot: number
}

/**
 * The Featured Advertisements rail — §4, §25, §27.
 *
 * Slot-based: an admin assigns a campaign to a position and the rail is read
 * in position order. A slot whose campaign has since fallen outside its dates,
 * been paused, or whose advertiser was suspended simply yields nothing — the
 * slot does not have to be emptied by hand for the public page to be correct.
 */
export async function featuredAds(limit = FEATURED_SLOT_COUNT, now = new Date()): Promise<FeaturedAd[]> {
  const slots = await prisma.adFeaturedSlot.findMany({
    where: {
      isEnabled: true,
      bookingId: { not: null },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
      booking: {
        ...liveCampaignWhere(now),
        isFeatured: true,
        // A campaign with no creative has nothing to show; it is skipped here
        // rather than rendering an empty card on the public page.
        imageUrl: { not: null },
        targetUrl: { not: null },
      },
    },
    orderBy: { position: 'asc' },
    take: limit,
    select: { position: true, booking: { select: FEATURED_SELECT } },
  })

  return slots.flatMap((s) => {
    const b = s.booking
    if (!b?.imageUrl || !b.targetUrl) return []
    return [{ ...b, imageUrl: b.imageUrl, targetUrl: b.targetUrl, slot: s.position }]
  })
}

/**
 * The advertisers on the "Popular Advertisers" rail — §16.
 *
 * Ranked by what the campaigns actually did rather than by a list somebody
 * keeps by hand: every advertiser with a live campaign appears, ordered by the
 * attention it earned. A click counts for ten impressions, because a click is
 * the signal the page is really ranking on.
 */
export async function popularAdvertisers(limit = 8, now = new Date()) {
  const live = await prisma.adBooking.findMany({
    where: liveCampaignWhere(now),
    select: {
      advertiserId: true,
      impressions: true,
      clicks: true,
      brandName: true,
      tagline: true,
      logoUrl: true,
      targetUrl: true,
      advertiser: {
        select: {
          name: true,
          logo: true,
          corporateProfile: { select: { companyName: true, companyLogo: true, website: true } },
        },
      },
    },
  })

  type Row = {
    id: string
    name: string
    tagline: string
    logo: string | null
    href: string
    score: number
  }
  const byAdvertiser = new Map<string, Row>()

  for (const b of live) {
    const c = b.advertiser.corporateProfile
    const score = b.impressions + b.clicks * 10
    const prev = byAdvertiser.get(b.advertiserId)

    if (prev) {
      prev.score += score
      if (!prev.tagline) prev.tagline = b.tagline ?? ''
      if (!prev.logo) prev.logo = b.logoUrl ?? c?.companyLogo ?? b.advertiser.logo
    } else {
      byAdvertiser.set(b.advertiserId, {
        id: b.advertiserId,
        name: b.brandName ?? c?.companyName ?? b.advertiser.name,
        tagline: b.tagline ?? '',
        logo: b.logoUrl ?? c?.companyLogo ?? b.advertiser.logo,
        href: c?.website ?? b.targetUrl ?? '#',
        score,
      })
    }
  }

  return [...byAdvertiser.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/**
 * The category shelf, each name with a real count beside it — §17.
 *
 * The count is a `groupBy` over live campaigns, so "120+ Ads" can never be a
 * number typed into a component.
 */
export async function adCategoriesWithCounts(now = new Date()) {
  const [categories, counts] = await Promise.all([
    prisma.adCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.adBooking.groupBy({
      by: ['categoryId'],
      where: { ...liveCampaignWhere(now), categoryId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const byId = new Map(counts.map((c) => [c.categoryId, c._count._all]))
  return categories.map((c) => ({ ...c, adCount: byId.get(c.id) ?? 0 }))
}

/** The packages, priced in the database rather than in the page — §11 step 6. */
export async function listAdPackages() {
  return prisma.adPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  })
}

/** The placements drawn on the public shelf — §3, §9. */
export async function publicPlacements() {
  return prisma.adPlacement.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, icon: true, size: true },
  })
}

/**
 * The four figures on the stats rail — §21.
 *
 * Summed from the campaigns themselves. "Per day" and "per month" are derived
 * from the last 30 days rather than stored, so an empty database honestly
 * reports nothing instead of printing "120K+".
 */
export async function adMarketplaceStats(now = new Date()) {
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000)

  const [advertisers, recent, allTime] = await Promise.all([
    prisma.adBooking.findMany({
      where: liveCampaignWhere(now),
      select: { advertiserId: true },
      distinct: ['advertiserId'],
    }),
    prisma.adBooking.aggregate({
      where: { status: { in: ['RUNNING', 'ENDED'] }, endsAt: { gte: monthAgo } },
      _sum: { impressions: true, clicks: true },
    }),
    prisma.adBooking.aggregate({ _sum: { impressions: true } }),
  ])

  return {
    activeAdvertisers: advertisers.length,
    impressionsPerDay: Math.round((recent._sum.impressions ?? 0) / 30),
    leadsPerMonth: recent._sum.clicks ?? 0,
    totalReach: allTime._sum.impressions ?? 0,
  }
}

// ═══════════════════════════════════════════════════════════
//  Featured slots — the admin's control surface (§15, §27)
// ═══════════════════════════════════════════════════════════

export const FEATURED_SLOT_COUNT = 4

/**
 * Every slot, filled or not, in position order.
 *
 * Missing rows are created on first read, so an admin always sees the full set
 * of positions rather than an empty page on a fresh database.
 */
export async function featuredSlots() {
  const existing = await prisma.adFeaturedSlot.findMany({ select: { position: true } })
  const have = new Set(existing.map((s) => s.position))

  const missing = Array.from({ length: FEATURED_SLOT_COUNT }, (_, i) => i + 1).filter(
    (p) => !have.has(p)
  )
  if (missing.length) {
    await prisma.adFeaturedSlot.createMany({
      data: missing.map((position) => ({ position })),
      skipDuplicates: true,
    })
  }

  return prisma.adFeaturedSlot.findMany({
    orderBy: { position: 'asc' },
    include: {
      booking: {
        select: {
          id: true,
          title: true,
          brandName: true,
          imageUrl: true,
          logoUrl: true,
          status: true,
          startsAt: true,
          endsAt: true,
          impressions: true,
          clicks: true,
          advertiser: {
            select: { name: true, corporateProfile: { select: { companyName: true } } },
          },
        },
      },
    },
  })
}

/** Campaigns an admin may drop into a slot: approved, not yet finished, unassigned. */
export async function featurableBookings(now = new Date()) {
  return prisma.adBooking.findMany({
    where: {
      status: { in: ['RUNNING', 'SCHEDULED'] },
      endsAt: { gt: now },
      featuredSlot: null,
      advertiser: { status: 'ACTIVE', deletedAt: null },
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      title: true,
      brandName: true,
      status: true,
      startsAt: true,
      endsAt: true,
      advertiser: {
        select: { name: true, corporateProfile: { select: { companyName: true } } },
      },
    },
  })
}

/**
 * Put a campaign into a slot, or empty the slot when `bookingId` is null.
 *
 * `isFeatured` is written here and nowhere else, which is what stops an
 * advertiser from featuring their own campaign (§26).
 */
export async function assignFeaturedSlot(position: number, bookingId: string | null) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.adFeaturedSlot.findUnique({ where: { position } })
    if (!slot) throw new AdError('That featured slot does not exist.', 'NOT_FOUND')

    // Whatever was in the slot stops being featured — but keeps running.
    if (slot.bookingId && slot.bookingId !== bookingId) {
      await tx.adBooking.update({
        where: { id: slot.bookingId },
        data: { isFeatured: false, featuredPriority: 0 },
      })
    }

    if (bookingId) {
      const booking = await tx.adBooking.findUnique({ where: { id: bookingId } })
      if (!booking) throw new AdError('That campaign no longer exists.', 'NOT_FOUND')
      if (booking.status !== 'RUNNING' && booking.status !== 'SCHEDULED') {
        throw new AdError(
          'Only an approved campaign can be featured — this one is ' +
            `${booking.status.toLowerCase().replace(/_/g, ' ')}.`,
          'WRONG_STATE'
        )
      }

      // A campaign belongs to one slot at a time, so free any other it holds.
      await tx.adFeaturedSlot.updateMany({
        where: { bookingId, position: { not: position } },
        data: { bookingId: null },
      })

      await tx.adBooking.update({
        where: { id: bookingId },
        data: { isFeatured: true, featuredPriority: position },
      })
    }

    return tx.adFeaturedSlot.update({ where: { position }, data: { bookingId } })
  })
}

export async function setFeaturedSlotEnabled(position: number, isEnabled: boolean) {
  return prisma.adFeaturedSlot.update({ where: { position }, data: { isEnabled } })
}

/**
 * Swap what sits in two slots — how "move up" and "move down" are done.
 *
 * `bookingId` is unique on the slot table, so the two rows cannot simply be
 * updated in place: one side is parked at null first.
 */
export async function swapFeaturedSlots(a: number, b: number) {
  return prisma.$transaction(async (tx) => {
    const [first, second] = await Promise.all([
      tx.adFeaturedSlot.findUnique({ where: { position: a } }),
      tx.adFeaturedSlot.findUnique({ where: { position: b } }),
    ])
    if (!first || !second) throw new AdError('That featured slot does not exist.', 'NOT_FOUND')

    await tx.adFeaturedSlot.update({ where: { position: a }, data: { bookingId: null } })
    await tx.adFeaturedSlot.update({ where: { position: b }, data: { bookingId: first.bookingId } })
    await tx.adFeaturedSlot.update({ where: { position: a }, data: { bookingId: second.bookingId } })

    if (first.bookingId) {
      await tx.adBooking.update({ where: { id: first.bookingId }, data: { featuredPriority: b } })
    }
    if (second.bookingId) {
      await tx.adBooking.update({ where: { id: second.bookingId }, data: { featuredPriority: a } })
    }
  })
}

// ═══════════════════════════════════════════════════════════
//  Placement availability — §13
// ═══════════════════════════════════════════════════════════

export type PlacementAvailability = {
  slug: string
  name: string
  /** Slots free across the whole requested window. */
  free: number
  total: number
  available: boolean
}

/**
 * Whether the chosen placements can actually carry the campaign on those dates.
 *
 * A placement holds `maxSlots` advertisements at one time, so "available" means
 * a slot is free for EVERY day of the requested run, not merely on the start
 * date. Counting overlaps once over the whole window is what gives that: any
 * booking that overlaps any part of the range is counted against it.
 *
 * The campaign being edited is excluded, so re-saving step 5 does not report a
 * clash with itself.
 */
export async function placementAvailability(
  slugs: string[],
  startsAt: Date,
  endsAt: Date,
  exceptBookingId?: string
): Promise<PlacementAvailability[]> {
  if (slugs.length === 0) return []

  const placements = await prisma.adPlacement.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { id: true, slug: true, name: true, maxSlots: true },
  })

  const taken = await prisma.adBooking.groupBy({
    by: ['placementId'],
    where: {
      placementId: { in: placements.map((p) => p.id) },
      // The states that actually hold a slot. A draft, a rejected campaign or
      // a cancelled one is not occupying anything.
      status: { in: ['PENDING_PAYMENT', 'PENDING_REVIEW', 'SCHEDULED', 'RUNNING', 'PAUSED'] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(exceptBookingId ? { id: { not: exceptBookingId } } : {}),
    },
    _count: { _all: true },
  })

  const byPlacement = new Map(taken.map((t) => [t.placementId, t._count._all]))

  return placements.map((p) => {
    const free = Math.max(0, p.maxSlots - (byPlacement.get(p.id) ?? 0))
    return { slug: p.slug, name: p.name, free, total: p.maxSlots, available: free > 0 }
  })
}
