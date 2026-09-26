/**
 * Testing the PACT Engine — the most important part of Phase 2.
 *
 *   pnpm test:pact
 *
 * ★ The real exam is test 6: ten people race to buy the same seat at the
 *   same moment, and exactly one of them must get it. If this goes wrong,
 *   one territory gets sold to two people — the business is finished.
 */

import { PrismaClient } from '@prisma/client'
import {
  pactPlanBlock, pactAllowance,
  checkAvailability,
  reservePact,
  activatePact,
  releaseExpiredReservations,
  releasePactForFailedPayment,
  expireOldPacts,
  seatMapForPincode,
  PactError,
} from '../src/lib/pact.ts'
import { BUSINESS_RULES } from '../src/config/permissions.ts'

const prisma = new PrismaClient()
const PIN = '110005'
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// PACT needs a paid plan (Free has none), so test buyers get Gold unless told not to.
async function planFor(userId, slug = 'gold') {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug } })
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  await prisma.subscription.create({ data: { userId, planId: plan.id, planName: plan.name, price: plan.price, expiresAt, paymentId: 'test' } })
}

async function makeUser(email, role, extra = {}, { plan = 'gold' } = {}) {
  const u = await prisma.user.create({
    data: {
      email, name: email.split('@')[0], role, status: 'ACTIVE',
      emailVerified: new Date(), pincode: PIN, state: 'Delhi', ...extra,
    },
  })
  if (plan) await planFor(u.id, plan)
  return u
}

async function cleanup() {
  await prisma.pact.deleteMany({ where: { pincode: { in: [PIN, '400001'] } } })
  await prisma.payment.deleteMany({ where: { user: { email: { contains: '@pacttest.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@pacttest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@pacttest.dev' } } })
}

await cleanup()

// ═══ 1. Availability ═══
console.log('\n── Checking availability ──')

const avail = await checkAvailability(PIN, 'DESIGNA')
check('an empty seat shows as "available"', avail.seat?.available === true)
check('PIN district/state resolved', avail.district === 'Central Delhi' && avail.state === 'Delhi', `(${avail.district})`)
check('price came through', avail.price?.total === 29500, `(₹${avail.price?.total})`)

const badPin = await checkAvailability('999999', 'DESIGNA')
check('unknown PIN rejected', 'error' in badPin)

const badFormat = await checkAvailability('11005', 'DESIGNA')
check('5-digit PIN rejected', 'error' in badFormat)

const noSub = await checkAvailability(PIN, 'CONSULTANT')
check('Consultant without a sub-category rejected', 'error' in noSub)

const badSub = await checkAvailability(PIN, 'CONSULTANT', 'not-a-real-one')
check('invalid sub-category rejected', 'error' in badSub)

const corp = await checkAvailability(PIN, 'CORPORATE')
check('Corporate PACT reports "not yet"', corp.seat?.reason === 'NOT_OFFERED')

// ═══ 1b. The plan gate ═══
console.log('\n── Membership plan decides PACT ──')

const freeUser = await makeUser('free@pacttest.dev', 'PROFESSIONAL', {}, { plan: null })
let freeBlocked = null
try { await reservePact({ userId: freeUser.id, role: 'PROFESSIONAL', pincode: PIN, serviceType: 'DESIGNA' }) } catch (e) { freeBlocked = e.code }
check('a Free-plan member cannot reserve a PACT', freeBlocked === 'NO_PLAN', `(${freeBlocked})`)
check('pactPlanBlock explains it', (await pactPlanBlock(freeUser.id))?.code === 'NO_PLAN')
await planFor(freeUser.id, 'bronze')
check('with Bronze and nothing held, the gate opens', (await pactPlanBlock(freeUser.id)) === null)
check('Bronze allows 2 territories', (await pactAllowance(freeUser.id)).limit === 2)

// ═══ 2. Reservation ═══
console.log('\n── Reserving a seat ──')

const designa = await makeUser('designa@pacttest.dev', 'PROFESSIONAL')
const res = await reservePact({
  userId: designa.id, role: 'PROFESSIONAL',
  pincode: PIN, serviceType: 'DESIGNA',
})
check('the seat was reserved', !!res.pactId)
check('a 15-minute window was applied', Math.round((res.reservedTill - Date.now()) / 60000) === 15)

const pact1 = await prisma.pact.findUnique({ where: { id: res.pactId } })
check('status is RESERVED, not ACTIVE', pact1.status === 'RESERVED')
check('expiresAt is still empty', pact1.expiresAt === null)

const pay1 = await prisma.payment.findUnique({ where: { id: res.paymentId } })
check('Payment row created', pay1.status === 'CREATED')
check('GST added (₹25,000 + 18% = ₹29,500)', Number(pay1.totalAmount) === 29500)

const after = await checkAvailability(PIN, 'DESIGNA')
check('the seat now shows as RESERVED', after.seat?.reason === 'RESERVED')

// ═══ 3. Eligibility ═══
console.log('\n── Who can buy what (§7.4.1) ──')

const client = await makeUser('client@pacttest.dev', 'CLIENT')
try {
  await reservePact({ userId: client.id, role: 'CLIENT', pincode: PIN, serviceType: 'DESIGNI' })
  check('a Client cannot take a PACT', false, '(it took one!)')
} catch (e) {
  check('a Client cannot take a PACT', e instanceof PactError && e.code === 'NOT_ELIGIBLE')
}

const consultant = await makeUser('consultant@pacttest.dev', 'CONSULTANT')
try {
  await reservePact({ userId: consultant.id, role: 'CONSULTANT', pincode: PIN, serviceType: 'DESIGNA' })
  check('a Consultant cannot take a Designa seat', false, '(it took one!)')
} catch (e) {
  check('a Consultant cannot take a Designa seat', e instanceof PactError && e.code === 'NOT_ELIGIBLE')
}

const cRes = await reservePact({
  userId: consultant.id, role: 'CONSULTANT',
  pincode: PIN, serviceType: 'CONSULTANT', subCategory: 'civil-engineer',
})
check('a Consultant can take its own sub-category', !!cRes.pactId)

const consultant2 = await makeUser('consultant2@pacttest.dev', 'CONSULTANT')
const cRes2 = await reservePact({
  userId: consultant2.id, role: 'CONSULTANT',
  pincode: PIN, serviceType: 'CONSULTANT', subCategory: 'astrologer',
})
check('another sub-category in the same PIN is a separate seat', !!cRes2.pactId)

// ═══ 4. Double booking ═══
console.log('\n── The same seat a second time ──')

const designa2 = await makeUser('designa2@pacttest.dev', 'PROFESSIONAL')
try {
  await reservePact({ userId: designa2.id, role: 'PROFESSIONAL', pincode: PIN, serviceType: 'DESIGNA' })
  check('an occupied seat cannot be taken again', false, '(it was taken!)')
} catch (e) {
  check('an occupied seat cannot be taken again', e instanceof PactError && e.code === 'SEAT_TAKEN', `(${e.code})`)
}

try {
  await reservePact({ userId: designa.id, role: 'PROFESSIONAL', pincode: PIN, serviceType: 'DESIGNA' })
  check('you cannot take your own seat again', false)
} catch (e) {
  check('you cannot take your own seat again', e.code === 'ALREADY_HELD', `(${e.code})`)
}

// ═══ 5. Activation ═══
console.log('\n── Activation after payment ──')

const act = await activatePact(res.paymentId, 'mock_pay_123')
check('the PACT became ACTIVE', act.pact.status === 'ACTIVE')

const years = (act.pact.expiresAt.getFullYear() - act.pact.purchasedAt.getFullYear())
check(`a ${BUSINESS_RULES.PACT_VALIDITY_YEARS}-year term was granted (PACT_VALIDITY_YEARS)`, years === BUSINESS_RULES.PACT_VALIDITY_YEARS, `(${years} years)`)
check('reservedTill was cleared', act.pact.reservedTill === null)

const paidRow = await prisma.payment.findUnique({ where: { id: res.paymentId } })
check('the Payment became PAID', paidRow.status === 'PAID')
check('an invoice number was generated', /^AF\/\d{4}\/\d{6}$/.test(paidRow.invoiceNumber), `(${paidRow.invoiceNumber})`)

const again = await activatePact(res.paymentId, 'mock_pay_123')
check('activating a second time breaks nothing', again.alreadyDone === true)

const notif = await prisma.notification.findFirst({
  where: { userId: designa.id, type: 'PACT_ACTIVATED' },
})
check('a notification went to the holder', !!notif)

const takenNow = await checkAvailability(PIN, 'DESIGNA')
check('the seat now shows as TAKEN', takenNow.seat?.reason === 'TAKEN')

// ═══ 6. ★ Race condition ═══
console.log('\n── ★ Ten people, one seat, one instant ──')

const racers = await Promise.all(
  Array.from({ length: 10 }, (_, i) =>
    makeUser(`racer${i}@pacttest.dev`, 'PROFESSIONAL')
  )
)

const results = await Promise.allSettled(
  racers.map((u) =>
    reservePact({ userId: u.id, role: 'PROFESSIONAL', pincode: '400001', serviceType: 'DESIGNI' })
  )
)

const won = results.filter((r) => r.status === 'fulfilled')
const lost = results.filter((r) => r.status === 'rejected')

check('exactly one got the seat', won.length === 1, `(${won.length} got it)`)
check('the other nine were cleanly refused', lost.length === 9, `(${lost.length})`)
check(
  'everyone received an understandable error',
  lost.every((r) => r.reason instanceof PactError && r.reason.code === 'SEAT_TAKEN'),
  `(${[...new Set(lost.map((r) => r.reason?.code ?? r.reason?.message))].join(', ')})`
)

const dbRows = await prisma.pact.count({
  where: { pincode: '400001', serviceType: 'DESIGNI', status: { in: ['RESERVED', 'ACTIVE'] } },
})
check('★ there is exactly one row in the database', dbRows === 1, `(${dbRows} rows!)`)

// ═══ 7. Reservation lapsing ═══
console.log('\n── Once 15 minutes have passed ──')

await prisma.pact.updateMany({
  where: { pincode: '400001', status: 'RESERVED' },
  data: { reservedTill: new Date(Date.now() - 60_000) },
})
const released = await releaseExpiredReservations()
check('the lapsed reservation was released', released >= 1, `(${released})`)

const freeAgain = await checkAvailability('400001', 'DESIGNI')
check('the seat is available again', freeAgain.seat?.available === true)

// ═══ 8. Payment fail ═══
console.log('\n── When payment fails ──')

const failUser = await makeUser('failpay@pacttest.dev', 'BMF', { role: 'BMF' })
const failRes = await reservePact({
  userId: failUser.id, role: 'BMF', pincode: PIN, serviceType: 'BMF',
})
await releasePactForFailedPayment(failRes.paymentId)

const gone = await prisma.pact.findUnique({ where: { id: failRes.pactId } })
check('the seat was released the moment it failed', gone === null)

const failedPay = await prisma.payment.findUnique({ where: { id: failRes.paymentId } })
check('the Payment was recorded as FAILED', failedPay.status === 'FAILED')

// ═══ 9. Term expiry ═══
console.log('\n── When 10 years are complete ──')

await prisma.pact.update({
  where: { id: res.pactId },
  data: { expiresAt: new Date(Date.now() - 86400_000) },
})
const expired = await expireOldPacts()
check('the old PACT became EXPIRED', expired === 1, `(${expired})`)

const reopened = await checkAvailability(PIN, 'DESIGNA')
check('★ after EXPIRED the seat is sellable again', reopened.seat?.available === true)

// ═══ 10. Seat map ═══
console.log('\n── Map of the whole PIN ──')

const map = await seatMapForPincode(PIN)
check('27 seats in total (Designa+Designi+BMF+24 consultant)', map.totalSeats === 27, `(${map.totalSeats})`)
check('occupied seats were counted', map.takenSeats === 2, `(${map.takenSeats})`)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
