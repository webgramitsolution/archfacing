/**
 * PACT Engine — the heart of ArchFacing.
 *
 * PDF §3.1.8: every PIN code is a franchise territory sold for a fixed term
 * (BUSINESS_RULES.PACT_VALIDITY_YEARS — currently 1 year, renewable). The
 * cardinal rule — "archfacing is not sailing one PACT area with same services
 * to two persons."
 *
 * ★ A seat is identified by (pincode, serviceType, subCategory), not by pincode
 *   alone. For Designa/Designi/BMF the subCategory stays '-'; for Consultant it
 *   is one of the 24 sub-categories (§7.4.2).
 *
 * ★ Two people must never buy the same seat at once, so there are two layers:
 *   1. The database's partial unique index (the last line of defence — it never
 *      fails)
 *   2. The transaction here, plus clear error messages
 *   An application-level check alone is not sufficient.
 */

import { Prisma, type PactServiceType, type Role } from '@prisma/client'
import { prisma } from './prisma'
import {
  BUSINESS_RULES,
  NO_SUBCATEGORY,
  normalizeSubCategory,
  canBuyPactType,
  PACT_SEATS_PER_PINCODE,
} from '@/config/permissions'
import { CONSULTANT_GROUPS } from '@/config/taxonomy'

// ═══════════════════════════════════════════════════════════
//  Checking availability
// ═══════════════════════════════════════════════════════════

export type SeatStatus =
  | { available: true }
  | { available: false; reason: 'TAKEN'; holderName: string; expiresAt: Date | null }
  | { available: false; reason: 'RESERVED'; freesAt: Date | null }
  | { available: false; reason: 'NOT_OFFERED' }

export type AvailabilityResult = {
  pincode: string
  district: string
  state: string
  serviceType: PactServiceType
  subCategory: string
  seat: SeatStatus
  price: { amount: number; tax: number; total: number } | null
}

/** Whether a given seat is available */
export async function checkAvailability(
  pincode: string,
  serviceType: PactServiceType,
  subCategory?: string | null
): Promise<AvailabilityResult | { error: string }> {
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { error: 'A PIN code must be 6 digits. Please check and try again.' }
  }

  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  if (!place) {
    return { error: `PIN ${pincode} is not in our records. Please try a different PIN code.` }
  }

  let sub: string
  try {
    sub = normalizeSubCategory(serviceType, subCategory)
  } catch (e) {
    return { error: (e as Error).message }
  }

  // §7.4.2 — PACT is not yet open to Corporate registrants
  if (PACT_SEATS_PER_PINCODE[serviceType] === 0) {
    return {
      pincode,
      district: place.district,
      state: place.state,
      serviceType,
      subCategory: sub,
      seat: { available: false, reason: 'NOT_OFFERED' },
      price: null,
    }
  }

  const occupant = await prisma.pact.findFirst({
    where: {
      pincode,
      serviceType,
      subCategory: sub,
      status: { in: ['RESERVED', 'ACTIVE'] },
    },
    include: { holder: { select: { name: true } } },
  })

  let seat: SeatStatus
  if (!occupant) {
    seat = { available: true }
  } else if (occupant.status === 'ACTIVE') {
    seat = {
      available: false,
      reason: 'TAKEN',
      holderName: occupant.holder?.name ?? 'another registrant',
      expiresAt: occupant.expiresAt,
    }
  } else {
    seat = { available: false, reason: 'RESERVED', freesAt: occupant.reservedTill }
  }

  return {
    pincode,
    district: place.district,
    state: place.state,
    serviceType,
    subCategory: sub,
    seat,
    price: seat.available ? await getPrice(serviceType, place.state) : null,
  }
}

/**
 * The status of every seat in a PIN code — for the "what is still available in
 * my territory" screen.
 */
export async function seatMapForPincode(pincode: string) {
  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  if (!place) return null

  const taken = await prisma.pact.findMany({
    where: { pincode, status: { in: ['RESERVED', 'ACTIVE'] } },
    select: { serviceType: true, subCategory: true, status: true },
  })

  const isTaken = (t: PactServiceType, sub: string) =>
    taken.find((x) => x.serviceType === t && x.subCategory === sub)

  const rows: {
    serviceType: PactServiceType
    subCategory: string
    label: string
    taken: boolean
    status?: string
  }[] = []

  for (const t of ['DESIGNA', 'DESIGNI', 'BMF'] as const) {
    const hit = isTaken(t, NO_SUBCATEGORY)
    rows.push({
      serviceType: t,
      subCategory: NO_SUBCATEGORY,
      label: t === 'BMF' ? 'Building Materials Facilitator' : t,
      taken: !!hit,
      status: hit?.status,
    })
  }

  for (const group of CONSULTANT_GROUPS) {
    for (const child of group.children ?? []) {
      const hit = isTaken('CONSULTANT', child.slug)
      rows.push({
        serviceType: 'CONSULTANT',
        subCategory: child.slug,
        label: `${child.name} · ${group.name}`,
        taken: !!hit,
        status: hit?.status,
      })
    }
  }

  return {
    pincode,
    district: place.district,
    state: place.state,
    totalSeats: rows.length,
    takenSeats: rows.filter((r) => r.taken).length,
    rows,
  }
}

// ═══════════════════════════════════════════════════════════
//  Pricing
// ═══════════════════════════════════════════════════════════

/** §3.1.8.4 — prices live in the DB so an admin can change them */
export async function getPrice(serviceType: PactServiceType, state: string) {
  const row =
    (await prisma.pactPrice.findFirst({
      where: { serviceType, state, isActive: true },
    })) ??
    (await prisma.pactPrice.findFirst({
      where: { serviceType, state: null, isActive: true },
    }))

  if (!row) return null

  const amount = Number(row.price)
  const tax = Number(((amount * Number(row.taxPercent)) / 100).toFixed(2))
  return { amount, tax, total: Number((amount + tax).toFixed(2)) }
}

// ═══════════════════════════════════════════════════════════
//  Reservation — holding a seat before payment
// ═══════════════════════════════════════════════════════════

export class PactError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'SEAT_TAKEN'
      | 'NOT_ELIGIBLE'
      | 'BAD_PINCODE'
      | 'NO_PRICE'
      | 'ALREADY_HELD'
      | 'NOT_OFFERED'
      | 'NO_PLAN'
      | 'PLAN_LIMIT'
      | 'NO_USER'
      | 'BAD_PRICE'
  ) {
    super(message)
  }
}

export type ReservationResult = {
  pactId: string
  paymentId: string
  reservedTill: Date
  price: { amount: number; tax: number; total: number }
}

/**
 * Holds the seat for 15 minutes and creates a Payment row.
 *
 * ⚠️ The PACT is NOT made `ACTIVE` here. That happens only after payment is
 *    confirmed (`activatePact`). This distinction matters — otherwise someone
 *    could reserve a seat, walk away, and block it forever.
 */
/**
 * PACT reach comes from the membership plan (client rule, Sept 2026):
 *  · no active paid plan (the Free plan) → no PACT at all;
 *  · a paid plan → at most `pactTerritories` held PACTs (null = unlimited).
 * Held = RESERVED or ACTIVE. Admin assignment and renewals are not gated.
 */
export async function pactAllowance(userId: string): Promise<{ plan: string | null; limit: number | null; held: number }> {
  const now = new Date()
  const [subs, held] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: now }, price: { gt: 0 } },
      select: { planName: true, plan: { select: { pactTerritories: true } } },
    }),
    prisma.pact.count({ where: { holderId: userId, status: { in: ['RESERVED', 'ACTIVE'] } } }),
  ])
  if (subs.length === 0) return { plan: null, limit: 0, held }
  // The most generous plan the member has running wins (null = unlimited).
  const best = subs.reduce((a, b) => {
    const la = a.plan.pactTerritories, lb = b.plan.pactTerritories
    if (la === null) return a
    if (lb === null) return b
    return lb > la ? b : a
  })
  return { plan: best.planName, limit: best.plan.pactTerritories, held }
}

/** Why this member may not buy a PACT right now, or null when they may. */
export async function pactPlanBlock(userId: string): Promise<{ code: 'NO_PLAN' | 'PLAN_LIMIT'; message: string } | null> {
  const a = await pactAllowance(userId)
  if (!a.plan) {
    return {
      code: 'NO_PLAN',
      message: 'PACT is not included in the Free plan. Choose Bronze, Silver or Gold under Membership & Plans to buy a PACT.',
    }
  }
  if (a.limit !== null && a.held >= a.limit) {
    return {
      code: 'PLAN_LIMIT',
      message: `Your ${a.plan} plan includes ${a.limit} PACT territor${a.limit === 1 ? 'y' : 'ies'} and you already hold ${a.held}. Upgrade your plan under Membership & Plans to add more.`,
    }
  }
  return null
}

async function assertPlanAllowsPact(userId: string) {
  const block = await pactPlanBlock(userId)
  if (block) throw new PactError(block.message, block.code)
}

export async function reservePact(params: {
  userId: string
  role: Role
  pincode: string
  serviceType: PactServiceType
  subCategory?: string | null
}): Promise<ReservationResult> {
  const { userId, role, pincode, serviceType } = params

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    throw new PactError('That PIN code is not valid. Please enter a 6-digit PIN code.', 'BAD_PINCODE')
  }

  if (PACT_SEATS_PER_PINCODE[serviceType] === 0) {
    throw new PactError(
      'PACT is not yet available for this category.',
      'NOT_OFFERED'
    )
  }

  // §7.4.1 — which registrant types may buy which PACT
  if (!canBuyPactType(role, serviceType)) {
    throw new PactError(
      'Your registrant category is not eligible for this type of PACT.',
      'NOT_ELIGIBLE'
    )
  }

  // The membership plan decides PACT reach: Free has none, paid plans cap it.
  await assertPlanAllowsPact(userId)

  const sub = normalizeSubCategory(serviceType, params.subCategory)

  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  if (!place) {
    throw new PactError(`PIN ${pincode} is not in our records. Please try a different PIN code.`, 'BAD_PINCODE')
  }

  const price = await getPrice(serviceType, place.state)
  if (!price) {
    throw new PactError('No price has been set for this category. Please contact the ArchFacing team.', 'NO_PRICE')
  }

  const now = new Date()
  const reservedTill = new Date(
    now.getTime() + BUSINESS_RULES.PACT_RESERVATION_MINUTES * 60 * 1000
  )

  // Clear expired reservations first, or the seat will look occupied for no reason
  await releaseExpiredReservations()

  try {
    return await prisma.$transaction(async (tx) => {
      // Does this same user already hold this seat?
      const mine = await tx.pact.findFirst({
        where: {
          pincode,
          serviceType,
          subCategory: sub,
          holderId: userId,
          status: { in: ['RESERVED', 'ACTIVE'] },
        },
      })
      if (mine) {
        throw new PactError(
          mine.status === 'ACTIVE'
            ? 'You already hold this PACT.'
            : 'You have already reserved this seat — please complete the payment.',
          'ALREADY_HELD'
        )
      }

      const pact = await tx.pact.create({
        data: {
          pincode,
          state: place.state,
          city: place.district,
          serviceType,
          subCategory: sub,
          holderId: userId,
          status: 'RESERVED',
          reservedTill,
          price: new Prisma.Decimal(price.amount),
        },
      })

      const payment = await tx.payment.create({
        data: {
          userId,
          purpose: 'PACT_PURCHASE',
          status: 'CREATED',
          amount: new Prisma.Decimal(price.amount),
          taxAmount: new Prisma.Decimal(price.tax),
          totalAmount: new Prisma.Decimal(price.total),
          referenceId: pact.id,
          metadata: { pincode, serviceType, subCategory: sub, state: place.state },
        },
      })

      await tx.pact.update({
        where: { id: pact.id },
        data: { paymentId: payment.id },
      })

      return { pactId: pact.id, paymentId: payment.id, reservedTill, price }
    })
  } catch (e) {
    if (e instanceof PactError) throw e

    // ★ This is the moment the database's partial unique index saves us.
    //   Two requests arrived at once and both saw the seat as "available" — but
    //   only one insert will succeed; the other gets P2002.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new PactError(
        'This seat was just taken by someone else. Please choose a different PIN code or category.',
        'SEAT_TAKEN'
      )
    }
    throw e
  }
}

// ═══════════════════════════════════════════════════════════
//  Activation — after payment is confirmed
// ═══════════════════════════════════════════════════════════

/**
 * Marks the PACT ACTIVE once payment succeeds and gives it a full term.
 * A renewal (PACT_RENEWAL) extends from the current expiry, so renewing early
 * never loses the days already paid for.
 *
 * It is idempotent — if the same payment is confirmed twice (a webhook arriving
 * more than once), nothing breaks.
 */
export async function activatePact(paymentId: string, gatewayPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new Error('Payment record not found.')
    if (payment.purpose !== 'PACT_PURCHASE' && payment.purpose !== 'PACT_RENEWAL') {
      throw new Error('This payment is not for a PACT purchase or renewal.')
    }

    // Already done — quietly return the existing record
    if (payment.status === 'PAID') {
      const existing = await tx.pact.findFirst({
        where: { id: payment.referenceId ?? '' },
      })
      return { alreadyDone: true, pact: existing }
    }

    const pact = await tx.pact.findUnique({ where: { id: payment.referenceId ?? '' } })
    if (!pact) throw new Error('No PACT is linked to this payment.')

    const now = new Date()
    const renewal = payment.purpose === 'PACT_RENEWAL'
    if (renewal && pact.status !== 'ACTIVE' && pact.status !== 'EXPIRED') {
      throw new Error('Only an active or recently expired PACT can be renewed.')
    }
    const base = renewal && pact.expiresAt && pact.expiresAt > now ? pact.expiresAt : now
    const expiresAt = new Date(base)
    expiresAt.setFullYear(expiresAt.getFullYear() + BUSINESS_RULES.PACT_VALIDITY_YEARS)

    // An EXPIRED seat coming back to ACTIVE is guarded by the partial unique
    // index — if someone else bought it meanwhile this throws P2002.
    const updated = await tx.pact.update({
      where: { id: pact.id },
      data: renewal
        ? { status: 'ACTIVE', expiresAt }
        : { status: 'ACTIVE', purchasedAt: now, expiresAt, reservedTill: null },
    })

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: now,
        razorpayPaymentId: gatewayPaymentId ?? null,
        invoiceNumber: await nextInvoiceNumber(tx),
      },
    })

    await tx.notification.create({
      data: {
        userId: pact.holderId!,
        type: renewal ? 'PACT_RENEWED' : 'PACT_ACTIVATED',
        title: renewal ? 'Your PACT has been renewed' : 'Your PACT is now active',
        body: renewal
          ? `PIN ${pact.pincode} · ${pact.serviceType} — valid until ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
          : `PIN ${pact.pincode} · ${pact.serviceType} — enquiries from this territory will now come to you.`,
        link: '/dashboard',
      },
    })

    return { alreadyDone: false, pact: updated }
  })
}

// ═══════════════════════════════════════════════════════════
//  Admin assignment — the office sells a territory directly
// ═══════════════════════════════════════════════════════════

export type AdminAssignResult = {
  pactId: string
  pincode: string
  place: string
  holderName: string
  price: number
}

/**
 * An admin allots a territory to a user directly — no online checkout. Used
 * when a deal closes offline (cheque, bank transfer, complimentary).
 *
 * The same three rules as a self-serve purchase still hold:
 *  1. the seat must be free (the partial unique index is the final word),
 *  2. the user's registrant category must be eligible for the service type,
 *  3. a Consultant seat needs its sub-category.
 *
 * `price` is what was actually charged — 0 records a complimentary allotment
 * and writes no Payment row; anything above 0 writes a PAID offline Payment
 * with an invoice number, so revenue reports stay truthful.
 */
export async function assignPactByAdmin(params: {
  adminId: string
  userEmail: string
  pincode: string
  serviceType: PactServiceType
  subCategory?: string | null
  price: number
}): Promise<AdminAssignResult> {
  const { adminId, pincode, serviceType } = params
  const userEmail = params.userEmail.trim().toLowerCase()

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    throw new PactError('That PIN code is not valid. Please enter a 6-digit PIN code.', 'BAD_PINCODE')
  }
  if (PACT_SEATS_PER_PINCODE[serviceType] === 0) {
    throw new PactError('PACT is not offered for this category yet.', 'NOT_OFFERED')
  }
  if (!Number.isFinite(params.price) || params.price < 0) {
    throw new PactError('The price must be 0 (complimentary) or a positive amount.', 'BAD_PRICE')
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, name: true, role: true, deletedAt: true },
  })
  if (!user || user.deletedAt) {
    throw new PactError(`No account found for ${userEmail}.`, 'NO_USER')
  }
  if (!canBuyPactType(user.role, serviceType)) {
    throw new PactError(
      `${user.name}'s registrant category (${user.role}) is not eligible for a ${serviceType} PACT.`,
      'NOT_ELIGIBLE'
    )
  }

  const sub = normalizeSubCategory(serviceType, params.subCategory)

  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  if (!place) {
    throw new PactError(`PIN ${pincode} is not in our records.`, 'BAD_PINCODE')
  }

  await releaseExpiredReservations()

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setFullYear(expiresAt.getFullYear() + BUSINESS_RULES.PACT_VALIDITY_YEARS)

  try {
    return await prisma.$transaction(async (tx) => {
      const taken = await tx.pact.findFirst({
        where: { pincode, serviceType, subCategory: sub, status: { in: ['RESERVED', 'ACTIVE'] } },
        include: { holder: { select: { name: true } } },
      })
      if (taken) {
        throw new PactError(
          taken.holderId === user.id
            ? `${user.name} already holds this seat.`
            : `This seat is already held by ${taken.holder?.name ?? 'another user'}.`,
          'SEAT_TAKEN'
        )
      }

      const pact = await tx.pact.create({
        data: {
          pincode,
          state: place.state,
          city: place.district,
          serviceType,
          subCategory: sub,
          holderId: user.id,
          status: 'ACTIVE',
          purchasedAt: now,
          expiresAt,
          price: new Prisma.Decimal(params.price),
        },
      })

      if (params.price > 0) {
        const payment = await tx.payment.create({
          data: {
            userId: user.id,
            purpose: 'PACT_PURCHASE',
            status: 'PAID',
            amount: new Prisma.Decimal(params.price),
            taxAmount: new Prisma.Decimal(0),
            totalAmount: new Prisma.Decimal(params.price),
            referenceId: pact.id,
            paidAt: now,
            invoiceNumber: await nextInvoiceNumber(tx),
            metadata: {
              pincode, serviceType, subCategory: sub, state: place.state,
              mode: 'OFFLINE_ADMIN_ASSIGN', assignedById: adminId,
            },
          },
        })
        await tx.pact.update({ where: { id: pact.id }, data: { paymentId: payment.id } })
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'PACT_ACTIVATED',
          title: 'A PACT territory has been allotted to you',
          body: `PIN ${pincode} · ${serviceType} — enquiries from this territory will now come to you.`,
          link: '/dashboard',
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'PACT_ASSIGNED',
          entityType: 'Pact',
          entityId: pact.id,
          after: {
            pincode, serviceType, subCategory: sub,
            holderEmail: userEmail, price: params.price, expiresAt: expiresAt.toISOString(),
          },
        },
      })

      return {
        pactId: pact.id,
        pincode,
        place: `${place.district}, ${place.state}`,
        holderName: user.name,
        price: params.price,
      }
    })
  } catch (e) {
    if (e instanceof PactError) throw e
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new PactError('This seat was just taken. Refresh and try again.', 'SEAT_TAKEN')
    }
    throw e
  }
}

// ═══════════════════════════════════════════════════════════
//  Renewal — the holder extends their own seat
// ═══════════════════════════════════════════════════════════

const DAY_MS = 86_400_000

/**
 * Can this PACT be renewed right now? Pure, so the UI and the server agree.
 * ACTIVE: within PACT_RENEWAL_WINDOW_DAYS of expiry.
 * EXPIRED: within PACT_RENEWAL_GRACE_DAYS after expiry (the seat check is
 * separate — someone else may have bought it).
 */
export function renewalOpen(p: { status: string; expiresAt: Date | null }, now = new Date()): boolean {
  if (!p.expiresAt) return false
  const left = (p.expiresAt.getTime() - now.getTime()) / DAY_MS
  if (p.status === 'ACTIVE') return left <= BUSINESS_RULES.PACT_RENEWAL_WINDOW_DAYS
  if (p.status === 'EXPIRED') return left >= -BUSINESS_RULES.PACT_RENEWAL_GRACE_DAYS
  return false
}

export type RenewalStart = { paymentId: string; price: { amount: number; tax: number; total: number }; newExpiry: Date; pincode: string }

/** Creates the PACT_RENEWAL payment. The PACT itself changes only in activatePact. */
export async function startPactRenewal(userId: string, pactId: string): Promise<RenewalStart> {
  const pact = await prisma.pact.findFirst({ where: { id: pactId, holderId: userId } })
  if (!pact) throw new PactError('That PACT was not found on your account.', 'NO_USER')
  if (pact.status === 'SUSPENDED') throw new PactError('A suspended PACT cannot be renewed. Please contact the ArchFacing team.', 'NOT_ELIGIBLE')
  if (!renewalOpen(pact)) {
    throw new PactError(
      pact.status === 'ACTIVE'
        ? `Renewal opens ${BUSINESS_RULES.PACT_RENEWAL_WINDOW_DAYS} days before expiry.`
        : 'The renewal period for this PACT has ended. You can buy the seat again if it is still free.',
      'NOT_ELIGIBLE'
    )
  }
  if (pact.status === 'EXPIRED') {
    const other = await prisma.pact.findFirst({
      where: { pincode: pact.pincode, serviceType: pact.serviceType, subCategory: pact.subCategory, status: { in: ['RESERVED', 'ACTIVE'] }, NOT: { id: pact.id } },
      select: { id: true },
    })
    if (other) throw new PactError('Someone else has taken this seat since it expired.', 'SEAT_TAKEN')
  }
  const price = await getPrice(pact.serviceType, pact.state)
  if (!price) throw new PactError('No price has been set for this category. Please contact the ArchFacing team.', 'NO_PRICE')

  // Abandon any earlier unfinished renewal attempt for the same PACT.
  await prisma.payment.updateMany({
    where: { userId, purpose: 'PACT_RENEWAL', referenceId: pact.id, status: { in: ['CREATED', 'PENDING'] } },
    data: { status: 'FAILED' },
  })
  const payment = await prisma.payment.create({
    data: {
      userId,
      purpose: 'PACT_RENEWAL',
      status: 'CREATED',
      amount: new Prisma.Decimal(price.amount),
      taxAmount: new Prisma.Decimal(price.tax),
      totalAmount: new Prisma.Decimal(price.total),
      referenceId: pact.id,
      metadata: { pincode: pact.pincode, serviceType: pact.serviceType, subCategory: pact.subCategory, state: pact.state, renewal: true },
    },
  })
  const now = new Date()
  const newExpiry = new Date(pact.expiresAt && pact.expiresAt > now ? pact.expiresAt : now)
  newExpiry.setFullYear(newExpiry.getFullYear() + BUSINESS_RULES.PACT_VALIDITY_YEARS)
  return { paymentId: payment.id, price, newExpiry, pincode: pact.pincode }
}

/** Release the seat immediately when a payment fails */
export async function releasePactForFailedPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment?.referenceId) return

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED' },
    }),
    prisma.pact.deleteMany({
      where: { id: payment.referenceId, status: 'RESERVED' },
    }),
  ])
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.payment.count({ where: { invoiceNumber: { not: null } } })
  return `AF/${year}/${String(count + 1).padStart(6, '0')}`
}

// ═══════════════════════════════════════════════════════════
//  Maintenance — jobs run by cron
// ═══════════════════════════════════════════════════════════

/**
 * Releases a seat when payment has not completed within 15 minutes.
 * It also runs before every reservation, so old stuck seats never block
 * anyone else.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const { count } = await prisma.pact.deleteMany({
    where: { status: 'RESERVED', reservedTill: { lt: new Date() } },
  })
  return count
}

/** Marks PACTs past their term as EXPIRED — the seat opens up again */
export async function expireOldPacts(): Promise<number> {
  const { count } = await prisma.pact.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  })
  return count
}

/**
 * §3.1.8.5 — Cessation. A PACT is suspended in two situations:
 *   1. No response to any enquiry for 30 days
 *   2. 5 complaints have accumulated
 */
export async function runCessationChecks() {
  const cutoff = new Date(
    Date.now() - BUSINESS_RULES.PACT_INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  )

  const complaintSuspended = await prisma.pact.updateMany({
    where: {
      status: 'ACTIVE',
      complaintCount: { gte: BUSINESS_RULES.PACT_MAX_COMPLAINTS },
    },
    data: {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: `${BUSINESS_RULES.PACT_MAX_COMPLAINTS} complaints`,
    },
  })

  // A lead routed through this PACT has waited unanswered for 30+ days, and
  // the holder has not answered anything through it in that time either.
  // (A holder who never replied has lastResponseAt = null — that counts too.)
  const inactive = await prisma.pact.findMany({
    where: {
      status: 'ACTIVE',
      OR: [{ lastResponseAt: null }, { lastResponseAt: { lt: cutoff } }],
      AND: [{
        OR: [
          { leadRecipients: { some: { createdAt: { lt: cutoff }, deliveryStatus: { in: ['CREATED', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED'] } } } },
          // enquiries from before per-recipient tracking existed
          { enquiries: { some: { createdAt: { lt: cutoff }, status: { in: ['NEW', 'ASSIGNED'] }, recipients: { none: {} } } } },
        ],
      }],
    },
    select: { id: true, holderId: true, pincode: true },
  })
  const holders = inactive.filter((p) => p.holderId)
  if (holders.length) {
    await prisma.notification.createMany({
      data: holders.map((p) => ({
        userId: p.holderId!, type: 'PACT_SUSPENDED', title: 'Your PACT has been suspended',
        body: `PIN ${p.pincode} — an enquiry went unanswered for ${BUSINESS_RULES.PACT_INACTIVITY_DAYS} days. Contact ArchFacing support to reinstate it.`,
        link: '/dashboard/help',
      })),
    })
  }

  const inactiveSuspended = inactive.length
    ? await prisma.pact.updateMany({
        where: { id: { in: inactive.map((p) => p.id) } },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspensionReason: `No response for ${BUSINESS_RULES.PACT_INACTIVITY_DAYS} days`,
        },
      })
    : { count: 0 }

  return {
    byComplaints: complaintSuspended.count,
    byInactivity: inactiveSuspended.count,
  }
}

/** Reminders before the term ends (at 90 / 30 / 7 days) */
export async function sendExpiryReminders(): Promise<number> {
  const today = new Date()
  let sent = 0

  for (const days of [90, 30, 7]) {
    const from = new Date(today)
    from.setDate(from.getDate() + days)
    const to = new Date(from)
    to.setDate(to.getDate() + 1)

    const due = await prisma.pact.findMany({
      where: { status: 'ACTIVE', expiresAt: { gte: from, lt: to } },
      select: { id: true, holderId: true, pincode: true, serviceType: true },
    })

    for (const p of due) {
      if (!p.holderId) continue
      await prisma.notification.create({
        data: {
          userId: p.holderId,
          type: 'PACT_EXPIRING',
          title: `Your PACT expires in ${days} days`,
          body: `PIN ${p.pincode} · ${p.serviceType} — renew your PACT to keep receiving enquiries from this territory.`,
          link: '/dashboard/pact/renew',
        },
      })
      sent++
    }
  }

  return sent
}
