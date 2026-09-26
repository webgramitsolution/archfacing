import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Merchandise coupons (created in /admin/seller/coupons) applied at checkout.
 *
 * The discount comes off the order total (items incl. GST, before shipping).
 * A code is valid when it is active, inside its start/expiry window, still
 * has redemptions left and the cart meets its minimum. The redemption itself
 * is taken atomically inside the order transaction (`redeemCoupon`), so two
 * buyers cannot both use the last one.
 */

export type CouponQuote =
  | { ok: true; couponId: string; code: string; discount: number; label: string }
  | { ok: false; error: string }

type Db = Prisma.TransactionClient | typeof prisma

const round = (n: number) => Math.round(n * 100) / 100

export async function quoteCoupon(rawCode: string, subtotal: number, itemsTotal: number, db: Db = prisma): Promise<CouponQuote> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Enter a coupon code.' }
  const c = await db.coupon.findUnique({ where: { code } })
  const now = new Date()
  if (!c || !c.isActive) return { ok: false, error: 'That coupon code is not valid.' }
  if (c.startsAt && c.startsAt > now) return { ok: false, error: 'This coupon is not active yet.' }
  if (c.expiresAt && c.expiresAt <= now) return { ok: false, error: 'This coupon has expired.' }
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, error: 'This coupon has been fully used.' }
  const min = c.minOrder == null ? 0 : Number(c.minOrder)
  if (subtotal < min) return { ok: false, error: `This coupon needs an order of at least ₹${min.toLocaleString('en-IN')}.` }

  const value = Number(c.value)
  let discount = c.type === 'PERCENT' ? (itemsTotal * value) / 100 : value
  if (c.type === 'PERCENT' && c.maxDiscount != null) discount = Math.min(discount, Number(c.maxDiscount))
  discount = round(Math.max(0, Math.min(discount, itemsTotal)))
  if (discount <= 0) return { ok: false, error: 'This coupon gives no discount on this cart.' }

  const label = c.type === 'PERCENT' ? `${value}% off` : `₹${value.toLocaleString('en-IN')} off`
  return { ok: true, couponId: c.id, code: c.code, discount, label }
}

/** Takes one redemption, only if one is left. Returns false when the last one was just taken. */
export async function redeemCoupon(tx: Prisma.TransactionClient, couponId: string): Promise<boolean> {
  const n = await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
    WHERE id = ${couponId} AND "isActive" = true AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`
  return n === 1
}

/** Gives a redemption back — an order that was never paid for. */
export async function releaseCoupon(tx: Prisma.TransactionClient, code: string) {
  await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE code = ${code}`
}
