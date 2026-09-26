/**
 * Merchandise coupons end to end on the TEST DB.
 *   TEST_DATABASE_URL=... npx tsx tests/coupon.check.ts
 *
 * Everything it touches is its own: a throwaway buyer and seller
 * (@coupontest.dev), one published merchandise item, and a TEST-named coupon.
 * All of it is removed in `finally`; no real user, cart or product is touched.
 */
import './_test-env.mjs'
import { prisma } from '../src/lib/prisma'
import { quoteCoupon } from '../src/lib/coupons'
import { addToCart, createOrder, releaseOrder, getCart, CommerceError } from '../src/lib/commerce'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

const ADDRESS = { name: 'Test', phone: '9876500000', address: 'Test address line', pincode: '110001', city: 'Delhi', state: 'Delhi' }

async function main() {
  const stamp = Date.now().toString()
  const userIds: string[] = []
  let couponId: string | null = null

  try {
    const seller = await prisma.user.create({
      data: { email: `coupon-seller-${stamp}@coupontest.dev`, name: 'Coupon Seller', role: 'BMF', status: 'ACTIVE', emailVerified: new Date() },
    })
    userIds.push(seller.id)
    const user = await prisma.user.create({
      data: { email: `coupon-${stamp}@coupontest.dev`, name: 'Coupon Buyer', role: 'CLIENT', status: 'ACTIVE', emailVerified: new Date(), pincode: '110001', state: 'Delhi' },
    })
    userIds.push(user.id)
    const post = await prisma.post.create({
      data: {
        type: 'MERCHANDISE', status: 'PUBLISHED', publishedAt: new Date(),
        authorId: seller.id, title: 'Coupon test item', slug: `coupontest-${stamp}`,
        description: 'Throwaway merchandise for the coupon check.', category: 'apparel', year: 2026,
        variants: { create: [{ sku: `TEST-COUPON-${stamp}`, label: 'M', price: 599, taxPercent: 12, stock: 10 }] },
      },
      include: { variants: true },
    })
    const variant = post.variants[0]

    const code = 'TEST' + stamp.slice(-6)
    const c = await prisma.coupon.create({ data: { code, description: 'coupon.check.ts fixture', type: 'PERCENT', value: 10, maxDiscount: 100, minOrder: 1, usageLimit: 1 } })
    couponId = c.id

    ok(!(await quoteCoupon('NOPE-XYZ', 1000, 1000)).ok, 'unknown code refused')
    const q = await quoteCoupon(code.toLowerCase(), 5000, 5000)
    ok(q.ok && q.discount === 100, '10% capped at ₹100, code is case-insensitive')
    await prisma.coupon.update({ where: { id: c.id }, data: { minOrder: 999999 } })
    ok(!(await quoteCoupon(code, 500, 500)).ok, 'minimum order enforced')
    await prisma.coupon.update({ where: { id: c.id }, data: { minOrder: 1 } })

    await addToCart(user.id, variant.id, 1)
    const cart = await getCart(user.id)
    const r = await createOrder(user.id, ADDRESS, code)
    const expected = Math.min(100, Math.round(cart.total * 10) / 100)
    ok(Math.abs(Number(r.order.discount) - expected) < 0.01 && r.order.couponCode === code, `order carries the discount (₹${Number(r.order.discount)})`)
    ok((await prisma.coupon.findUnique({ where: { id: c.id } }))!.usedCount === 1, 'one redemption taken')

    await addToCart(user.id, variant.id, 1)
    let refused = false
    try {
      await createOrder(user.id, ADDRESS, code)
    } catch (e) { refused = e instanceof CommerceError }
    ok(refused, 'usage limit 1 → second order with the code refused')

    await releaseOrder(r.paymentId)
    ok((await prisma.coupon.findUnique({ where: { id: c.id } }))!.usedCount === 0, 'unpaid order gives the redemption back')
    ok((await prisma.merchandiseVariant.findUnique({ where: { id: variant.id } }))!.stock === variant.stock, 'stock restored')
  } finally {
    // Only this run's rows. Order/Payment have no cascade from User, so they go first;
    // cart, notifications and the post (+ its variant) cascade with the users.
    const mine = { userId: { in: userIds } }
    await prisma.orderItem.deleteMany({ where: { order: mine } })
    await prisma.order.deleteMany({ where: mine })
    await prisma.payment.deleteMany({ where: mine })
    await prisma.cartItem.deleteMany({ where: { cart: mine } })
    await prisma.cart.deleteMany({ where: mine })
    if (couponId) await prisma.coupon.delete({ where: { id: couponId } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { endsWith: '@coupontest.dev' } } })
    await prisma.$disconnect()
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
