/**
 * Merchandise coupons end to end on the dev DB (cleans up after itself).
 *   npx tsx tests/coupon.check.ts
 */
import { prisma } from '../src/lib/prisma'
import { quoteCoupon } from '../src/lib/coupons'
import { addToCart, createOrder, releaseOrder, getCart, CommerceError } from '../src/lib/commerce'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'CLIENT', status: 'ACTIVE', deletedAt: null }, select: { id: true } })
  const variant = await prisma.merchandiseVariant.findFirst({ where: { stock: { gte: 5 }, post: { status: 'PUBLISHED', deletedAt: null } }, select: { id: true, stock: true } })
  if (!user || !variant) throw new Error('need a client and an in-stock variant')
  const code = 'TEST' + Date.now().toString().slice(-6)
  const c = await prisma.coupon.create({ data: { code, type: 'PERCENT', value: 10, maxDiscount: 100, minOrder: 1, usageLimit: 1 } })
  const existingCart = await prisma.cartItem.findMany({ where: { cart: { userId: user.id } } })
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } })
  let paymentId: string | null = null
  let orderId: string | null = null
  try {
    ok(!(await quoteCoupon('NOPE-XYZ', 1000, 1000)).ok, 'unknown code refused')
    const q = await quoteCoupon(code.toLowerCase(), 5000, 5000)
    ok(q.ok && q.discount === 100, '10% capped at ₹100, code is case-insensitive')
    const big = await prisma.coupon.update({ where: { id: c.id }, data: { minOrder: 999999 } })
    ok(!(await quoteCoupon(code, 500, 500)).ok, 'minimum order enforced')
    await prisma.coupon.update({ where: { id: big.id }, data: { minOrder: 1 } })

    await addToCart(user.id, variant.id, 1)
    const cart = await getCart(user.id)
    const r = await createOrder(user.id, { name: 'Test', phone: '9876500000', address: 'Test address line', pincode: '110001', city: 'Delhi', state: 'Delhi' }, code)
    paymentId = r.paymentId; orderId = r.order.id
    const expected = Math.min(100, Math.round(cart.total * 10) / 100)
    ok(Math.abs(Number(r.order.discount) - expected) < 0.01 && r.order.couponCode === code, `order carries the discount (₹${Number(r.order.discount)})`)
    ok((await prisma.coupon.findUnique({ where: { id: c.id } }))!.usedCount === 1, 'one redemption taken')

    await addToCart(user.id, variant.id, 1)
    let refused = false
    try { await createOrder(user.id, { name: 'Test', phone: '9876500000', address: 'Test address line', pincode: '110001', city: 'Delhi', state: 'Delhi' }, code) } catch (e) { refused = e instanceof CommerceError }
    ok(refused, 'usage limit 1 → second order with the code refused')

    await releaseOrder(paymentId)
    ok((await prisma.coupon.findUnique({ where: { id: c.id } }))!.usedCount === 0, 'unpaid order gives the redemption back')
    ok((await prisma.merchandiseVariant.findUnique({ where: { id: variant.id } }))!.stock === variant.stock, 'stock restored')
  } finally {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } })
    for (const it of existingCart) await prisma.cartItem.create({ data: { cartId: it.cartId, variantId: it.variantId, quantity: it.quantity } }).catch(() => {})
    if (orderId) { await prisma.orderItem.deleteMany({ where: { orderId } }); await prisma.order.delete({ where: { id: orderId } }).catch(() => {}) }
    if (paymentId) await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {})
    await prisma.coupon.delete({ where: { id: c.id } })
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main()
