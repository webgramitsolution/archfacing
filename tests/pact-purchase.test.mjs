/**
 * The whole journey of buying a PACT — reserve → order → activate.
 *
 *   pnpm test:purchase
 *
 * This walks the very path the UI button walks, so the payment provider
 * wiring is checked here too.
 */

import { PrismaClient } from '@prisma/client'
import { reservePact, activatePact, checkAvailability } from '../src/lib/pact.ts'
import { BUSINESS_RULES } from '../src/config/permissions.ts'
import { getPaymentProvider, isPaymentLive } from '../src/lib/payments/index.ts'

const prisma = new PrismaClient()
const PIN = '560001' // Bengaluru
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.pact.deleteMany({ where: { pincode: PIN } })
  await prisma.payment.deleteMany({ where: { user: { email: { contains: '@buytest.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@buytest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@buytest.dev' } } })
}

await cleanup()

console.log('\n── Payment provider ──')

const provider = getPaymentProvider()
check('the provider was resolved', !!provider)
check('mock is running for now (no Razorpay keys)', provider.name === 'mock', `(${provider.name})`)
check('isLive is false — no real money will be taken', provider.isLive === false)
check('isPaymentLive() agrees', isPaymentLive() === false)

console.log('\n── The whole journey ──')

const buyer = await prisma.user.create({
  data: {
    email: 'buyer@buytest.dev', name: 'Ar. Bengaluru', role: 'PROFESSIONAL',
    status: 'ACTIVE', emailVerified: new Date(), mobile: '9700000099',
    pincode: PIN, state: 'Karnataka',
    professionalProfile: { create: { designaType: 'DESIGNI', tier: 'PROFESSIONAL' } },
  },
})
// PACT needs a paid plan — give the buyer Gold.
{
  const gold = await prisma.subscriptionPlan.findUnique({ where: { slug: 'gold' } })
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  await prisma.subscription.create({ data: { userId: buyer.id, planId: gold.id, planName: gold.name, price: gold.price, expiresAt, paymentId: 'test' } })
}

// 1. is it free?
const before = await checkAvailability(PIN, 'DESIGNI')
check('the seat was free beforehand', before.seat.available === true)
check('the Bengaluru price is ₹29,500', before.price.total === 29500, `(₹${before.price?.total})`)

// 2. reserve it
const reservation = await reservePact({
  userId: buyer.id, role: 'PROFESSIONAL', pincode: PIN, serviceType: 'DESIGNI',
})
check('the seat was reserved', !!reservation.pactId)

// 3. create the order (exactly what the UI does)
const order = await provider.createOrder({
  paymentId: reservation.paymentId,
  amount: reservation.price.total,
  currency: 'INR',
  purpose: 'PACT_PURCHASE',
  userId: buyer.id,
  userEmail: buyer.email,
  userName: buyer.name,
  userMobile: buyer.mobile,
  description: `PACT ${PIN} · DESIGNI`,
})
check('the order was created', !!order.orderId)
check('checkout is null in mock (no popup)', order.checkout === null)

await prisma.payment.update({
  where: { id: reservation.paymentId },
  data: { status: 'PENDING', razorpayOrderId: order.orderId },
})

// nobody else may get the seat in the meantime
const during = await checkAvailability(PIN, 'DESIGNI')
check('the seat shows as RESERVED during payment', during.seat.reason === 'RESERVED')

// 4. payment succeeds
const result = await activatePact(reservation.paymentId, 'mock_pay_final')
check('the PACT became ACTIVE', result.pact.status === 'ACTIVE')

const pact = await prisma.pact.findUnique({ where: { id: reservation.pactId } })
const years = pact.expiresAt.getFullYear() - pact.purchasedAt.getFullYear()
check(`${BUSINESS_RULES.PACT_VALIDITY_YEARS} year(s) were granted`, years === BUSINESS_RULES.PACT_VALIDITY_YEARS, `(${years})`)
check('the state was recorded correctly', pact.state === 'Karnataka', `(${pact.state})`)
check('the district was recorded correctly', pact.city === 'Bengaluru', `(${pact.city})`)

const payment = await prisma.payment.findUnique({ where: { id: reservation.paymentId } })
check('the Payment is PAID', payment.status === 'PAID')
check('the gateway order id was saved', payment.razorpayOrderId === order.orderId)
check('the invoice was created', /^AF\/\d{4}\/\d{6}$/.test(payment.invoiceNumber), `(${payment.invoiceNumber})`)
check('₹29,500 in total (₹25,000 + GST)', Number(payment.totalAmount) === 29500)

// 5. now closed
const after = await checkAvailability(PIN, 'DESIGNI')
check('the seat is now TAKEN', after.seat.reason === 'TAKEN')
check('the holder name is shown', after.seat.holderName === 'Ar. Bengaluru')

// 6. a second buyer cannot get in
const rival = await prisma.user.create({
  data: {
    email: 'rival@buytest.dev', name: 'Ar. Rival', role: 'PROFESSIONAL',
    status: 'ACTIVE', emailVerified: new Date(), mobile: '9700000098',
    pincode: PIN, state: 'Karnataka',
  },
})
{
  // the rival has a paid plan too — the SEAT must be what stops them
  const gold = await prisma.subscriptionPlan.findUnique({ where: { slug: 'gold' } })
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  await prisma.subscription.create({ data: { userId: rival.id, planId: gold.id, planName: gold.name, price: gold.price, expiresAt, paymentId: 'test' } })
}
let blocked = false
try {
  await reservePact({ userId: rival.id, role: 'PROFESSIONAL', pincode: PIN, serviceType: 'DESIGNI' })
} catch (e) { blocked = e.code === 'SEAT_TAKEN' }
check('★ a sold seat is not sold twice', blocked)

// 7. the other category in the same PIN is still open
const designaFree = await checkAvailability(PIN, 'DESIGNA')
check('the DESIGNA seat in the same PIN is still free', designaFree.seat.available === true)

// 8. notification
const notif = await prisma.notification.findFirst({
  where: { userId: buyer.id, type: 'PACT_ACTIVATED' },
})
check('a notification went to the buyer', !!notif)
check('the notification mentions the PIN', notif?.body.includes(PIN))

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
