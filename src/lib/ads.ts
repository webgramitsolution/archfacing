/**
 * Advertisements — PDF §7.4.6
 *
 * Only Corporate accounts and external advertisers may book. Ads run on
 * fixed placements for a whole number of weeks.
 *
 * The rule that shapes this file is `AdPlacement.maxSlots`: a placement can
 * carry only so many ads at one time. Every booking therefore has to count
 * what already overlaps its dates before it is allowed through — and it has
 * to count again inside the transaction, because two advertisers can reach
 * the last slot in the same second.
 */

import { Prisma, type AdStatus, type Role } from '@prisma/client'
import { prisma } from './prisma'

export class AdError extends Error {
  constructor(
    message: string,
    public code:
      | 'PLACEMENT_NOT_FOUND'
      | 'ROLE_NOT_ALLOWED'
      | 'SOLD_OUT'
      | 'BAD_DATES'
      | 'BAD_URL'
      | 'NOT_FOUND'
      | 'WRONG_STATE'
      | 'WRONG_PURPOSE'
  ) {
    super(message)
    this.name = 'AdError'
  }
}

/** §7.4.6 — advertising is open to these roles only. */
export const AD_ROLES: Role[] = ['CORPORATE', 'BMF']

export const MIN_WEEKS = 1
export const MAX_WEEKS = 52

// ═══════════════════════════════════════════════════════════
//  Placements and the rate card
// ═══════════════════════════════════════════════════════════

export async function listPlacements() {
  return prisma.adPlacement.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { weeklyPrice: 'desc' }],
  })
}

export async function getPlacement(slug: string) {
  return prisma.adPlacement.findUnique({ where: { slug } })
}

export function bookingTotal(
  placement: { weeklyPrice: Prisma.Decimal; taxPercent: Prisma.Decimal },
  weeks: number
) {
  const amount = Math.round(Number(placement.weeklyPrice) * weeks * 100) / 100
  const tax = Math.round(amount * Number(placement.taxPercent)) / 100
  return { amount, tax, total: Math.round((amount + tax) * 100) / 100 }
}

/**
 * How many slots are free on a placement across a date range.
 *
 * Two bookings overlap when one starts before the other ends — the classic
 * `startsAt < end && endsAt > start` test. Only bookings that hold a slot
 * count: a DRAFT or REJECTED ad is not occupying anything.
 */
export async function slotsLeft(
  placementId: string,
  startsAt: Date,
  endsAt: Date,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const placement = await tx.adPlacement.findUnique({ where: { id: placementId } })
  if (!placement) throw new AdError('This ad slot no longer exists.', 'PLACEMENT_NOT_FOUND')

  const taken = await tx.adBooking.count({
    where: {
      placementId,
      status: { in: HOLDS_SLOT },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  })

  return { free: Math.max(0, placement.maxSlots - taken), total: placement.maxSlots, taken }
}

/** States that occupy a slot. DRAFT, ENDED and REJECTED do not. */
// Approved-but-not-started (SCHEDULED) and PAUSED ads keep their slot too —
// leaving them out let a future fortnight be sold twice.
const HOLDS_SLOT: AdStatus[] = ['PENDING_PAYMENT', 'PENDING_REVIEW', 'SCHEDULED', 'RUNNING', 'PAUSED']

// ═══════════════════════════════════════════════════════════
//  Booking
// ═══════════════════════════════════════════════════════════

export type BookingInput = {
  advertiserId: string
  placementSlug: string
  title: string
  imageUrl: string
  targetUrl: string
  startsAt: Date
  weeks: number
}

/**
 * Creates a booking in PENDING_PAYMENT plus its Payment row.
 *
 * The slot is held from this moment, not from payment — otherwise an
 * advertiser could fill in the form, start paying, and find the slot gone.
 * If payment never lands, `releaseUnpaidBookings` gives the slot back.
 */
export async function createBooking(input: BookingInput) {
  const advertiser = await prisma.user.findUnique({
    where: { id: input.advertiserId },
    select: { role: true, status: true, name: true },
  })
  if (!advertiser) throw new AdError('Account not found.', 'NOT_FOUND')

  if (!AD_ROLES.includes(advertiser.role)) {
    throw new AdError(
      'Advertising is open to Corporate and Building Materials Facilitator accounts only.',
      'ROLE_NOT_ALLOWED'
    )
  }

  if (input.weeks < MIN_WEEKS || input.weeks > MAX_WEEKS || !Number.isInteger(input.weeks)) {
    throw new AdError(`Choose between ${MIN_WEEKS} and ${MAX_WEEKS} whole weeks.`, 'BAD_DATES')
  }

  const startsAt = startOfDay(input.startsAt)
  const today = startOfDay(new Date())
  if (startsAt < today) {
    throw new AdError('The start date cannot be in the past.', 'BAD_DATES')
  }

  if (!isSafeUrl(input.targetUrl)) {
    throw new AdError('The landing page must be a full http:// or https:// address.', 'BAD_URL')
  }

  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + input.weeks * 7)

  const placement = await prisma.adPlacement.findUnique({
    where: { slug: input.placementSlug },
  })
  if (!placement || !placement.isActive) {
    throw new AdError('This ad slot is not available right now.', 'PLACEMENT_NOT_FOUND')
  }

  const price = bookingTotal(placement, input.weeks)

  return prisma.$transaction(async (tx) => {
    // ★★ Lock the placement row before counting.
    //
    //    Counting alone cannot enforce `maxSlots`. Postgres runs at READ
    //    COMMITTED, so two concurrent bookings each COUNT the same "1 slot
    //    taken", each see room, and both insert — the placement ends up
    //    oversold. There is no unique index that could catch it either,
    //    because "an overlapping date range" is not a uniqueness constraint
    //    the way a PACT seat is.
    //
    //    Taking FOR UPDATE on the placement makes bookings for the SAME
    //    placement queue up, so each one counts a settled number. Bookings
    //    for different placements are untouched and still run in parallel.
    await tx.$queryRaw`SELECT id FROM "AdPlacement" WHERE id = ${placement.id} FOR UPDATE`

    // Counted again inside the lock. The check above is only for a friendly
    // early error; this one is the check that actually decides.
    const { free } = await slotsLeft(placement.id, startsAt, endsAt, tx)
    if (free < 1) {
      throw new AdError(
        'Every slot on this placement is booked for those dates. Try different dates or another placement.',
        'SOLD_OUT'
      )
    }

    const booking = await tx.adBooking.create({
      data: {
        placementId: placement.id,
        advertiserId: input.advertiserId,
        title: input.title.trim(),
        imageUrl: input.imageUrl,
        targetUrl: input.targetUrl.trim(),
        startsAt,
        endsAt,
        weeks: input.weeks,
        status: 'PENDING_PAYMENT',
      },
    })

    const payment = await tx.payment.create({
      data: {
        userId: input.advertiserId,
        purpose: 'ADVERTISEMENT',
        status: 'CREATED',
        amount: new Prisma.Decimal(price.amount),
        taxAmount: new Prisma.Decimal(price.tax),
        totalAmount: new Prisma.Decimal(price.total),
        referenceId: booking.id,
        metadata: {
          placement: placement.slug,
          weeks: input.weeks,
          startsAt: startsAt.toISOString(),
        },
      },
    })

    await tx.adBooking.update({
      where: { id: booking.id },
      data: { paymentId: payment.id },
    })

    return { bookingId: booking.id, paymentId: payment.id, price, placement, endsAt }
  })
}

/**
 * Payment confirmed — the ad now waits for admin review.
 *
 * It deliberately does NOT go straight to RUNNING. Paying for an ad does not
 * entitle anyone to publish an unreviewed image on the site (§7.4.6).
 */
export async function markBookingPaid(paymentId: string, gatewayPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new AdError('Payment not found.', 'NOT_FOUND')
    if (payment.purpose !== 'ADVERTISEMENT') {
      throw new AdError('This payment is not for an advertisement.', 'WRONG_PURPOSE')
    }
    if (payment.status === 'PAID') return { alreadyDone: true }

    const booking = await tx.adBooking.findUnique({
      where: { id: payment.referenceId ?? '' },
    })
    if (!booking) throw new AdError('Booking not found.', 'NOT_FOUND')

    await tx.adBooking.update({
      where: { id: booking.id },
      data: { status: 'PENDING_REVIEW' },
    })

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        razorpayPaymentId: gatewayPaymentId ?? null,
        invoiceNumber: await nextInvoiceNumber(tx),
      },
    })

    await tx.notification.create({
      data: {
        userId: booking.advertiserId,
        type: 'AD_PAID',
        title: 'Advertisement payment received',
        body: `"${booking.title}" is with our team for review. We usually respond within one working day.`,
        link: '/dashboard/advertisements',
      },
    })

    return { alreadyDone: false }
  })
}

// ═══════════════════════════════════════════════════════════
//  Admin review
// ═══════════════════════════════════════════════════════════

export async function approveBooking(bookingId: string, adminId: string) {
  const booking = await prisma.adBooking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AdError('Booking not found.', 'NOT_FOUND')
  if (booking.status !== 'PENDING_REVIEW') {
    throw new AdError('Only ads awaiting review can be approved.', 'WRONG_STATE')
  }

  // §7 — approval does not mean "live". A campaign whose start date is still
  // ahead becomes SCHEDULED and is promoted to RUNNING by the nightly cron on
  // the morning it begins; one whose window has already closed is ENDED.
  const now = new Date()
  // A campaign only reaches review with dates on it — the wizard refuses to
  // submit without them — but the columns are nullable so that a DRAFT can
  // exist before step 5, so both are checked rather than asserted.
  if (!booking.startsAt || !booking.endsAt) {
    throw new AdError('This campaign has no schedule to approve.', 'BAD_DATES')
  }

  const status: AdStatus =
    booking.endsAt <= now ? 'ENDED' : booking.startsAt > now ? 'SCHEDULED' : 'RUNNING'

  const updated = await prisma.adBooking.update({
    where: { id: bookingId },
    data: {
      status,
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  })

  await prisma.notification.create({
    data: {
      userId: booking.advertiserId,
      type: 'AD_APPROVED',
      title: 'Advertisement approved',
      body: `"${booking.title}" is live from ${booking.startsAt.toLocaleDateString("en-IN")}.`,
      link: '/dashboard/advertisements',
    },
  })

  return updated
}

export async function rejectBooking(bookingId: string, adminId: string, reason: string) {
  const clean = reason.trim()
  if (clean.length < 10) {
    throw new AdError(
      'Give the advertiser a reason of at least 10 characters so they know what to fix.',
      'WRONG_STATE'
    )
  }

  const booking = await prisma.adBooking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new AdError('Booking not found.', 'NOT_FOUND')
  if (booking.status !== 'PENDING_REVIEW') {
    throw new AdError('Only ads awaiting review can be rejected.', 'WRONG_STATE')
  }

  const updated = await prisma.adBooking.update({
    where: { id: bookingId },
    data: {
      status: 'REJECTED',
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: clean,
    },
  })

  await prisma.notification.create({
    data: {
      userId: booking.advertiserId,
      type: 'AD_REJECTED',
      title: 'Advertisement needs changes',
      body: clean,
      link: '/dashboard/advertisements',
    },
  })

  return updated
}

// ═══════════════════════════════════════════════════════════
//  Serving
// ═══════════════════════════════════════════════════════════

/** The ads a visitor should see on a placement right now. */
export async function activeAdsFor(placementSlug: string) {
  const now = new Date()
  return prisma.adBooking.findMany({
    where: {
      placement: { slug: placementSlug, isActive: true },
      status: 'RUNNING',
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    select: { id: true, title: true, imageUrl: true, targetUrl: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function recordImpression(bookingId: string) {
  await prisma.adBooking.updateMany({
    where: { id: bookingId, status: 'RUNNING' },
    data: { impressions: { increment: 1 } },
  })
}

export async function recordClick(bookingId: string) {
  await prisma.adBooking.updateMany({
    where: { id: bookingId, status: 'RUNNING' },
    data: { clicks: { increment: 1 } },
  })
}

// ═══════════════════════════════════════════════════════════
//  My bookings
// ═══════════════════════════════════════════════════════════

export async function myBookings(advertiserId: string) {
  return prisma.adBooking.findMany({
    where: { advertiserId },
    include: { placement: { select: { name: true, size: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function pendingReviewBookings() {
  return prisma.adBooking.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: {
      placement: { select: { name: true, size: true } },
      advertiser: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ═══════════════════════════════════════════════════════════
//  Cron
// ═══════════════════════════════════════════════════════════

/**
 * Ends ads whose last day has passed, so their slot reopens.
 * Runs from the nightly cron.
 */
export async function endFinishedAds(now = new Date()) {
  const res = await prisma.adBooking.updateMany({
    where: { status: { in: ['RUNNING', 'SCHEDULED'] }, endsAt: { lte: now } },
    data: { status: 'ENDED' },
  })
  return { ended: res.count }
}

/**
 * Promotes approved campaigns whose start date has arrived — §24.
 *
 * The pair with `endFinishedAds` is what makes a campaign's dates real: the
 * public page never has to ask "has this started yet", because a campaign that
 * has not started is not RUNNING.
 */
export async function startScheduledAds(now = new Date()) {
  const res = await prisma.adBooking.updateMany({
    where: { status: 'SCHEDULED', startsAt: { lte: now }, endsAt: { gt: now } },
    data: { status: 'RUNNING' },
  })
  return { started: res.count }
}

/**
 * Frees slots held by bookings that were never paid for.
 *
 * Without this, an advertiser who opened the form and walked away would keep
 * a slot blocked until its end date — which on a 52-week booking is a year.
 */
export async function releaseUnpaidBookings(olderThanMinutes = 60, now = new Date()) {
  const cutoff = new Date(now.getTime() - olderThanMinutes * 60_000)

  const res = await prisma.adBooking.updateMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
    data: { status: 'DRAFT' },
  })
  return { released: res.count }
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Only http and https land here. Blocking `javascript:` matters — the target
 * URL is rendered into an anchor, and a script URL there would run on click
 * for every visitor who sees the ad.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.payment.count({ where: { invoiceNumber: { not: null } } })
  return `AF/${year}/${String(count + 1).padStart(6, '0')}`
}
