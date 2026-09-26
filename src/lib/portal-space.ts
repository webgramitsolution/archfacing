/**
 * Portal Space — PDF §5.2.9, §6.1.2.2.6 IX
 *
 * Extra upload storage, sold in packs, valid for 5 years and explicitly
 * non-refundable.
 *
 * The quota itself lives on `User.storageQuotaMb`, because that is what the
 * upload path checks on every single file. A purchase raises that number and
 * records a `PortalSpace` row so we know when to lower it again.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { BUSINESS_RULES } from '@/config/permissions'
import {
  PORTAL_SPACE_PACKS,
  PORTAL_SPACE_TAX_PERCENT,
  findPack,
  type PortalSpacePack,
} from '@/config/portal-space'

export class PortalSpaceError extends Error {
  constructor(
    message: string,
    public code: 'PACK_NOT_FOUND' | 'NOT_FOUND' | 'WRONG_PURPOSE'
  ) {
    super(message)
    this.name = 'PortalSpaceError'
  }
}

export { PORTAL_SPACE_PACKS }

// ═══════════════════════════════════════════════════════════
//  How much space is left
// ═══════════════════════════════════════════════════════════

export async function getStorageUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageQuotaMb: true, storageUsedMb: true },
  })
  if (!user) throw new PortalSpaceError('User not found.', 'NOT_FOUND')

  const quotaMb = user.storageQuotaMb
  const usedMb = user.storageUsedMb
  const freeMb = Math.max(0, quotaMb - usedMb)

  return {
    quotaMb,
    usedMb,
    freeMb,
    /** 0–100, capped so a bar can never overflow its track */
    percentUsed: quotaMb === 0 ? 100 : Math.min(100, Math.round((usedMb / quotaMb) * 100)),
    isFull: usedMb >= quotaMb,
    /** how much of the quota came from purchases, rather than the free grant */
    purchasedMb: Math.max(0, quotaMb - BUSINESS_RULES.FREE_STORAGE_MB),
  }
}

/** Purchases that are still within their 5-year term. */
export async function getActivePacks(userId: string) {
  return prisma.portalSpace.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { purchasedAt: 'desc' },
  })
}

export async function getPurchaseHistory(userId: string) {
  return prisma.portalSpace.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
  })
}

export function packTotal(pack: PortalSpacePack) {
  const tax = Math.round(pack.price * PORTAL_SPACE_TAX_PERCENT) / 100
  return { amount: pack.price, tax, total: Math.round((pack.price + tax) * 100) / 100 }
}

// ═══════════════════════════════════════════════════════════
//  Buying
// ═══════════════════════════════════════════════════════════

/**
 * Creates the Payment row. No storage is granted here — an unpaid checkout
 * must never raise anyone's quota.
 */
export async function startPortalSpacePurchase(userId: string, packSlug: string) {
  const pack = findPack(packSlug)
  if (!pack) throw new PortalSpaceError('That storage pack does not exist.', 'PACK_NOT_FOUND')

  const price = packTotal(pack)

  const payment = await prisma.payment.create({
    data: {
      userId,
      purpose: 'PORTAL_SPACE',
      status: 'CREATED',
      amount: new Prisma.Decimal(price.amount),
      taxAmount: new Prisma.Decimal(price.tax),
      totalAmount: new Prisma.Decimal(price.total),
      metadata: { packSlug: pack.slug, extraMb: pack.extraMb, packName: pack.name },
    },
  })

  return { paymentId: payment.id, pack, price }
}

/**
 * Grants the space once payment is confirmed.
 *
 * Idempotent: a repeated webhook must not raise the quota twice, so a
 * payment already marked PAID returns early.
 */
export async function activatePortalSpace(paymentId: string, gatewayPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new PortalSpaceError('Payment not found.', 'NOT_FOUND')
    if (payment.purpose !== 'PORTAL_SPACE') {
      throw new PortalSpaceError('This payment is not for Portal Space.', 'WRONG_PURPOSE')
    }

    if (payment.status === 'PAID') {
      const already = await tx.portalSpace.findFirst({ where: { paymentId } })
      return { alreadyDone: true, space: already }
    }

    const meta = (payment.metadata ?? {}) as { packSlug?: string; extraMb?: number }
    const pack = meta.packSlug ? findPack(meta.packSlug) : undefined
    if (!pack) throw new PortalSpaceError('The pack for this payment is missing.', 'PACK_NOT_FOUND')

    const purchasedAt = new Date()
    const expiresAt = new Date(purchasedAt)
    expiresAt.setFullYear(
      expiresAt.getFullYear() + BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS
    )

    const space = await tx.portalSpace.create({
      data: {
        userId: payment.userId,
        extraMb: pack.extraMb,
        price: new Prisma.Decimal(pack.price),
        purchasedAt,
        expiresAt,
        paymentId,
      },
    })

    await tx.user.update({
      where: { id: payment.userId },
      data: { storageQuotaMb: { increment: pack.extraMb } },
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
        type: 'PORTAL_SPACE_ADDED',
        title: `${pack.name} of Portal Space added`,
        body: `Valid until ${expiresAt.toLocaleDateString('en-IN')}. You can upload again straight away.`,
        link: '/dashboard/portal-space',
      },
    })

    return { alreadyDone: false, space }
  })
}

// ═══════════════════════════════════════════════════════════
//  Expiry — runs from the nightly cron
// ═══════════════════════════════════════════════════════════

/**
 * Takes back space whose 5 years are up.
 *
 * Files already uploaded are NOT deleted. The quota simply falls, so the
 * account cannot upload more until it buys again or removes old posts —
 * deleting someone's published work over an expiry would be far worse than
 * letting them sit above their limit.
 *
 * The quota never drops below the free grant.
 */
export async function expirePortalSpace(now = new Date()) {
  const due = await prisma.portalSpace.findMany({
    where: { expiresAt: { lte: now }, reclaimedAt: null },
    select: { id: true, userId: true, extraMb: true },
  })
  if (due.length === 0) return { reclaimed: 0 }

  let reclaimed = 0

  for (const row of due) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: row.userId },
        select: { storageQuotaMb: true },
      })
      if (!user) return

      const next = Math.max(
        BUSINESS_RULES.FREE_STORAGE_MB,
        user.storageQuotaMb - row.extraMb
      )

      await tx.user.update({
        where: { id: row.userId },
        data: { storageQuotaMb: next },
      })

      await tx.portalSpace.update({
        where: { id: row.id },
        data: { reclaimedAt: now },
      })

      await tx.notification.create({
        data: {
          userId: row.userId,
          type: 'PORTAL_SPACE_EXPIRED',
          title: 'Portal Space expired',
          body: `${row.extraMb} MB of purchased storage has completed its ${BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS}-year term. Your files are safe — buy again to keep uploading.`,
          link: '/dashboard/portal-space',
        },
      })

      reclaimed++
    })
  }

  return { reclaimed }
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.payment.count({ where: { invoiceNumber: { not: null } } })
  return `AF/${year}/${String(count + 1).padStart(6, '0')}`
}
