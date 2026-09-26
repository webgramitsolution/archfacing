/**
 * Merchandise store — cart, stock and checkout.
 *
 *   pnpm test:commerce
 *
 * ★ The most important one is test 5: if ten people race to buy the last
 *   3 items at once, only three may get them, and stock must never go
 *   negative.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import {
  getCart, addToCart, setCartQuantity, removeFromCart,
  createOrder, markOrderPaid, releaseOrder, CommerceError,
} from '../src/lib/commerce.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { user: { email: { contains: '@shop.dev' } } } } })
  await prisma.order.deleteMany({ where: { user: { email: { contains: '@shop.dev' } } } })
  await prisma.cartItem.deleteMany({ where: { cart: { user: { email: { contains: '@shop.dev' } } } } })
  await prisma.cart.deleteMany({ where: { user: { email: { contains: '@shop.dev' } } } })
  await prisma.payment.deleteMany({ where: { user: { email: { contains: '@shop.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@shop.dev' } } } })
  await prisma.merchandiseVariant.deleteMany({ where: { sku: { startsWith: 'TEST-' } } })
  await prisma.post.deleteMany({ where: { slug: { startsWith: 'shoptest-' } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@shop.dev' } } })
}
await cleanup()

const ADDRESS = {
  name: 'Neha Gupta', phone: '9876543210',
  address: '12 Hauz Khas', pincode: '110016',
  city: 'New Delhi', state: 'Delhi',
}

async function mkBuyer(email) {
  return prisma.user.create({
    data: { email, name: email.split('@')[0], role: 'CLIENT', status: 'ACTIVE',
      emailVerified: new Date(), pincode: '110016', state: 'Delhi' },
  })
}

const seller = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })

/** Create one merchandise item */
async function mkProduct(slug, title, variants) {
  const post = await prisma.post.create({
    data: {
      type: 'MERCHANDISE', status: 'PUBLISHED', publishedAt: new Date(),
      authorId: seller.id, title, slug,
      description: 'Test merchandise for the shop test suite.',
      category: 'apparel', year: 2026,
      variants: {
        create: variants.map((v, i) => ({
          sku: `TEST-${slug}-${i}`, label: v.label,
          price: new Prisma.Decimal(v.price), taxPercent: new Prisma.Decimal(12),
          stock: v.stock, sortOrder: i,
        })),
      },
    },
    include: { variants: { orderBy: { sortOrder: 'asc' } } },
  })
  return post
}

// ═══ 1. Cart ═══
console.log('\n── Cart ──')

const tshirt = await mkProduct('shoptest-tshirt', 'ArchFacing T-shirt', [
  { label: 'M', price: 599, stock: 10 },
  { label: 'L', price: 599, stock: 2 },
])
const buyer = await mkBuyer('buyer@shop.dev')

await addToCart(buyer.id, tshirt.variants[0].id, 2)
let cart = await getCart(buyer.id)
check('the item landed in the cart', cart.items.length === 1)
check('the quantity is correct', cart.items[0].quantity === 2)
check('the subtotal is correct (599 × 2)', cart.subtotal === 1198, `(${cart.subtotal})`)
check('12% GST was added', cart.tax === 143.76, `(${cart.tax})`)

// The same item again — no new row, the quantity should go up
await addToCart(buyer.id, tshirt.variants[0].id, 1)
cart = await getCart(buyer.id)
check('adding again raises the quantity, no new row', cart.items.length === 1 && cart.items[0].quantity === 3)

// more than the stock
let blocked = false
try { await addToCart(buyer.id, tshirt.variants[1].id, 5) }
catch (e) { blocked = e instanceof CommerceError && e.code === 'OUT_OF_STOCK' }
check('★ you cannot add more than the stock', blocked)

// more than 10 in one go
blocked = false
try { await addToCart(buyer.id, tshirt.variants[0].id, 11) }
catch (e) { blocked = e.code === 'BAD_QUANTITY' }
check('no more than 10 at a time', blocked)

await setCartQuantity(buyer.id, cart.items[0].id, 1)
cart = await getCart(buyer.id)
check('the quantity can be changed', cart.items[0].quantity === 1)

// ═══ 2. An item withdrawn from sale ═══
console.log('\n── An item withdrawn from sale ──')

const gone = await mkProduct('shoptest-gone', 'Discontinued Mug', [
  { label: null, price: 299, stock: 5 },
])
await addToCart(buyer.id, gone.variants[0].id, 1)
await prisma.post.update({ where: { id: gone.id }, data: { status: 'ARCHIVED' } })

cart = await getCart(buyer.id)
const deadItem = cart.items.find((i) => i.slug === 'shoptest-gone')
check('a withdrawn item shows as inactive in the cart', deadItem?.isActive === false)

blocked = false
try { await createOrder(buyer.id, ADDRESS) }
catch (e) { blocked = e.code === 'INACTIVE' }
check('★ no order is created with an inactive item', blocked)

await removeFromCart(buyer.id, deadItem.id)
cart = await getCart(buyer.id)
check('the cart is clean after removal', cart.items.length === 1)

// ═══ 3. Order ═══
console.log('\n── Creating an order ──')

const stockBefore = (await prisma.merchandiseVariant.findUnique({
  where: { id: tshirt.variants[0].id },
})).stock

const { order, paymentId, shipping } = await createOrder(buyer.id, ADDRESS)
check('the order was created', !!order.id)
check('the order number is well-formed', /^AF-\d{4}-\d{5}$/.test(order.orderNumber), `(${order.orderNumber})`)
check('the status is PENDING', order.status === 'PENDING')
check('shipping applies below ₹1,500', shipping === 79, `(${shipping})`)

const stockAfter = (await prisma.merchandiseVariant.findUnique({
  where: { id: tshirt.variants[0].id },
})).stock
check('★ the stock went down', stockAfter === stockBefore - 1, `(${stockBefore} → ${stockAfter})`)

const emptied = await getCart(buyer.id)
check('the cart emptied as soon as the order was created', emptied.items.length === 0)

const items = await prisma.orderItem.findMany({ where: { orderId: order.id } })
check('the variantId was saved on the order item', !!items[0].variantId)
check('the price at that moment was saved', Number(items[0].unitPrice) === 599)

// ═══ 4. Payment ═══
console.log('\n── Payment ──')

const paid = await markOrderPaid(paymentId, 'mock_pay_shop')
check('the order became PAID', paid.order.status === 'PAID')

const again = await markOrderPaid(paymentId, 'mock_pay_shop')
check('confirming a second time breaks nothing', again.alreadyDone === true)

const notif = await prisma.notification.findFirst({
  where: { userId: buyer.id, type: 'ORDER_PAID' },
})
check('a notification went to the buyer', !!notif)

// ═══ 5. ★ Stock race ═══
console.log('\n── ★ Ten people, three items, one instant ──')

const rare = await mkProduct('shoptest-rare', 'Limited Print', [
  { label: null, price: 1999, stock: 3 },
])

const racers = await Promise.all(
  Array.from({ length: 10 }, (_, i) => mkBuyer(`racer${i}@shop.dev`))
)
for (const r of racers) await addToCart(r.id, rare.variants[0].id, 1)

const results = await Promise.allSettled(
  racers.map((r) => createOrder(r.id, ADDRESS))
)
const won = results.filter((r) => r.status === 'fulfilled')
const lost = results.filter((r) => r.status === 'rejected')

check('exactly three got one', won.length === 3, `(${won.length})`)
check('the other seven were cleanly refused', lost.length === 7, `(${lost.length})`)

const rareStock = (await prisma.merchandiseVariant.findUnique({
  where: { id: rare.variants[0].id },
})).stock
check('★ the stock is exactly 0 — not negative', rareStock === 0, `(${rareStock})`)

const rareOrders = await prisma.orderItem.count({ where: { variantId: rare.variants[0].id } })
check('★ only three order items were created', rareOrders === 3, `(${rareOrders})`)

// ═══ 6. Order cancellation ═══
console.log('\n── Payment fails — stock goes back ──')

const won0 = won[0].value
const before = (await prisma.merchandiseVariant.findUnique({
  where: { id: rare.variants[0].id },
})).stock

await releaseOrder(won0.paymentId)

const after = (await prisma.merchandiseVariant.findUnique({
  where: { id: rare.variants[0].id },
})).stock
check('★ the stock came back', after === before + 1, `(${before} → ${after})`)

const cancelled = await prisma.order.findUnique({ where: { id: won0.order.id } })
check('the order became CANCELLED', cancelled.status === 'CANCELLED')

// ═══ 7. Free shipping ═══
console.log('\n── Shipping ──')

const bigBuyer = await mkBuyer('big@shop.dev')
const costly = await mkProduct('shoptest-costly', 'Coffee Table Book', [
  { label: null, price: 1800, stock: 5 },
])
await addToCart(bigBuyer.id, costly.variants[0].id, 1)
const bigOrder = await createOrder(bigBuyer.id, ADDRESS)
check('shipping is free above ₹1,500', bigOrder.shipping === 0, `(${bigOrder.shipping})`)

// ═══ 8. Empty cart ═══
blocked = false
try { await createOrder(bigBuyer.id, ADDRESS) }
catch (e) { blocked = e.code === 'EMPTY_CART' }
check('no order is created from an empty cart', blocked)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
