/**
 * Club Membership — PDF §5.2.10, §7.4.3, §9.1
 *
 * A paid membership that runs for a fixed number of months. Plans live in
 * the `ClubPlan` table so pricing can change without a deploy.
 *
 * Two rules shape everything here:
 *
 *   1. A Design Associate gets it free for 10 years (§3.1.7.10.1). That
 *      grant is issued once, at approval, and is never charged for.
 *
 *   2. Buying while still a member does not throw the remaining days away —
 *      the new term starts the day the old one ends. Losing paid-for days
 *      because you renewed early would be indefensible.
 */

import { Prisma, type Role } from '@prisma/client'
import { prisma } from './prisma'
import { BUSINESS_RULES } from '@/config/permissions'

export class ClubError extends Error {
  constructor(
    message: string,
    public code:
      | 'PLAN_NOT_FOUND'
      | 'ROLE_NOT_ALLOWED'
      | 'ALREADY_FREE'
      | 'NOT_FOUND'
      | 'WRONG_PURPOSE'
  ) {
    super(message)
    this.name = 'ClubError'
  }
}

// ═══════════════════════════════════════════════════════════
//  Plans
// ═══════════════════════════════════════════════════════════

/**
 * Active plans, in display order.
 *
 * `allowedRoles` empty means every role may buy it. When a role is passed
 * in we filter, so a Client never sees a plan built for Professionals.
 */
export async function listClubPlans(role?: Role) {
  const plans = await prisma.clubPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  })

  if (!role) return plans
  return plans.filter(
    (p) => p.allowedRoles.length === 0 || p.allowedRoles.includes(role)
  )
}

export async function getClubPlan(slug: string) {
  return prisma.clubPlan.findUnique({ where: { slug } })
}

/** Price + GST, rounded to paise. */
export function clubPlanTotal(plan: { price: Prisma.Decimal; taxPercent: Prisma.Decimal }) {
  const amount = Number(plan.price)
  const tax = Math.round(amount * Number(plan.taxPercent)) / 100
  return { amount, tax, total: Math.round((amount + tax) * 100) / 100 }
}

// ═══════════════════════════════════════════════════════════
//  Membership state
// ═══════════════════════════════════════════════════════════

/** The membership that is live right now, or null. */
export async function getActiveMembership(userId: string) {
  return prisma.clubMembership.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
  })
}

export async function getMembershipHistory(userId: string) {
  return prisma.clubMembership.findMany({
    where: { userId },
    orderBy: { startsAt: 'desc' },
  })
}

export function daysLeft(expiresAt: Date): number {
  const ms = expiresAt.getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

// ═══════════════════════════════════════════════════════════
//  Buying
// ═══════════════════════════════════════════════════════════

/**
 * Creates the Payment row for a club plan.
 *
 * The ClubMembership row is deliberately NOT created here — only a
 * confirmed payment may create one. Otherwise an abandoned checkout would
 * leave a free membership behind.
 */
export async function startClubPurchase(userId: string, planSlug: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) throw new ClubError('User not found.', 'NOT_FOUND')

  const plan = await prisma.clubPlan.findUnique({ where: { slug: planSlug } })
  if (!plan || !plan.isActive) {
    throw new ClubError('This plan is no longer available.', 'PLAN_NOT_FOUND')
  }

  if (plan.allowedRoles.length > 0 && !plan.allowedRoles.includes(user.role)) {
    throw new ClubError(
      'This plan is not open to your account type. Please pick another one.',
      'ROLE_NOT_ALLOWED'
    )
  }

  // A free Design Associate membership already covers this period.
  const existing = await getActiveMembership(userId)
  if (existing?.isFree) {
    throw new ClubError(
      'Your Design Associate membership is already active and free — there is nothing to pay for.',
      'ALREADY_FREE'
    )
  }

  const price = clubPlanTotal(plan)

  const payment = await prisma.payment.create({
    data: {
      userId,
      purpose: 'CLUB_MEMBERSHIP',
      status: 'CREATED',
      amount: new Prisma.Decimal(price.amount),
      taxAmount: new Prisma.Decimal(price.tax),
      totalAmount: new Prisma.Decimal(price.total),
      referenceId: plan.id,
      metadata: { planSlug: plan.slug, planName: plan.name, months: plan.months },
    },
  })

  return { paymentId: payment.id, plan, price }
}

/**
 * Turns a confirmed payment into a membership.
 *
 * Idempotent — a webhook that arrives twice must not hand out two terms,
 * so a payment already marked PAID returns the existing membership.
 */
export async function activateClubMembership(
  paymentId: string,
  gatewayPaymentId?: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new ClubError('Payment not found.', 'NOT_FOUND')
    if (payment.purpose !== 'CLUB_MEMBERSHIP') {
      throw new ClubError('This payment is not for a club membership.', 'WRONG_PURPOSE')
    }

    if (payment.status === 'PAID') {
      const already = await tx.clubMembership.findFirst({
        where: { paymentId },
      })
      return { alreadyDone: true, membership: already }
    }

    const plan = await tx.clubPlan.findUnique({
      where: { id: payment.referenceId ?? '' },
    })
    if (!plan) throw new ClubError('The plan for this payment is missing.', 'PLAN_NOT_FOUND')

    // Stack on top of any running term instead of overwriting it.
    const current = await tx.clubMembership.findFirst({
      where: { userId: payment.userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    })

    const startsAt = current ? current.expiresAt : new Date()
    const expiresAt = addMonths(startsAt, plan.months)

    const membership = await tx.clubMembership.create({
      data: {
        userId: payment.userId,
        planName: plan.name,
        price: plan.price,
        startsAt,
        expiresAt,
        isFree: false,
        paymentId,
      },
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
        userId: payment.userId,
        type: 'CLUB_ACTIVE',
        title: 'Club Membership active',
        body: `${plan.name} is running until ${expiresAt.toLocaleDateString('en-IN')}.`,
        link: '/dashboard/club',
      },
    })

    return { alreadyDone: false, membership }
  })
}

// ═══════════════════════════════════════════════════════════
//  Design Associate — 10 years, free (§3.1.7.10.1)
// ═══════════════════════════════════════════════════════════

/**
 * Grants the free DA membership. Safe to call more than once — if a free
 * membership is already running, it returns that one rather than extending
 * the term every time a DA record is touched.
 */
export async function grantFreeDaMembership(userId: string) {
  const existingFree = await prisma.clubMembership.findFirst({
    where: { userId, isFree: true, expiresAt: { gt: new Date() } },
  })
  if (existingFree) return { created: false, membership: existingFree }

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setFullYear(expiresAt.getFullYear() + BUSINESS_RULES.DA_FREE_CLUB_YEARS)

  const membership = await prisma.clubMembership.create({
    data: {
      userId,
      planName: `Design Associate — ${BUSINESS_RULES.DA_FREE_CLUB_YEARS} years complimentary`,
      price: new Prisma.Decimal(0),
      startsAt,
      expiresAt,
      isFree: true,
    },
  })

  await prisma.notification.create({
    data: {
      userId,
      type: 'CLUB_ACTIVE',
      title: 'Club Membership added — free',
      body: `As a Design Associate you get ${BUSINESS_RULES.DA_FREE_CLUB_YEARS} years of Club Membership at no cost.`,
      link: '/dashboard/club',
    },
  })

  return { created: true, membership }
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Adds months without rolling over the month end.
 *
 * Plain `setMonth` turns 31 January + 1 month into 3 March, which would
 * silently hand out two extra days. Clamping to the last valid day avoids that.
 */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.payment.count({ where: { invoiceNumber: { not: null } } })
  return `AF/${year}/${String(count + 1).padStart(6, '0')}`
}
