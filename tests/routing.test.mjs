/**
 * Lead routing — the heart of Consult Nearby.
 *
 *   pnpm test:routing
 *
 * ★ Most important: an enquiry must reach the right PACT holder, and if
 *   there is no holder it must not be lost — it goes to UNROUTED and lands
 *   with an RM Employee.
 */

import './_test-env.mjs'
import { PrismaClient } from '@prisma/client'
import { findRecipient, createEnquiry, respondToEnquiry, assignEnquiry } from '../src/lib/enquiry.ts'

const prisma = new PrismaClient()
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.enquiryResponse.deleteMany({ where: { enquiry: { client: { email: { contains: '@rtest.dev' } } } } })
  await prisma.enquiry.deleteMany({ where: { client: { email: { contains: '@rtest.dev' } } } })
  await prisma.pact.deleteMany({ where: { holder: { email: { contains: '@rtest.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@rtest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@rtest.dev' } } })
}
await cleanup()

async function mkUser(email, role, pincode, state) {
  return prisma.user.create({
    data: { email, name: email.split('@')[0], role, status: 'ACTIVE',
      emailVerified: new Date(), pincode, state },
  })
}

async function mkPact(holderId, pincode, serviceType, sub = '-', status = 'ACTIVE') {
  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  const expires = new Date(); expires.setFullYear(expires.getFullYear() + 10)
  return prisma.pact.create({
    data: { pincode, state: place.state, city: place.district, serviceType,
      subCategory: sub, holderId, status,
      purchasedAt: status === 'ACTIVE' ? new Date() : null,
      expiresAt: status === 'ACTIVE' ? expires : null },
  })
}

// ═══ 1. Direct match ═══
console.log('\n── A holder in the same PIN ──')

const delhi = await mkUser('delhi.architect@rtest.dev', 'PROFESSIONAL', '110005', 'Delhi')
await mkPact(delhi.id, '110005', 'DESIGNA')

const r1 = await findRecipient('110005', 'DESIGNA')
check('a holder in the same PIN was found', r1.routed === true && r1.via === 'exact')
check('the right holder was chosen', r1.routed && r1.holderName === 'delhi.architect')

const r2 = await findRecipient('110005', 'DESIGNI')
check('with no holder for the other service it looks nearby', r2.routed === false || r2.via === 'nearby')

// ═══ 2. The Consultant sub-category ═══
console.log('\n── The separate Consultant seats ──')

const civil = await mkUser('civil@rtest.dev', 'CONSULTANT', '110005', 'Delhi')
await mkPact(civil.id, '110005', 'CONSULTANT', 'civil-engineer')

const r3 = await findRecipient('110005', 'CONSULTANT', 'civil-engineer')
check('a civil-engineer enquiry went to civil', r3.routed && r3.holderName === 'civil')

const r4 = await findRecipient('110005', 'CONSULTANT', 'astrologer')
check('an astrologer enquiry did not go to civil',
  !r4.routed || r4.holderName !== 'civil', `(${r4.routed ? r4.holderName : 'unrouted'})`)

// ═══ 3. A nearby PIN ═══
console.log('\n── From a nearby PIN ──')

// A Consultant seat nobody holds in the dev data, so this test owns it.
let rareSub = null
for (const s of ['lal-kitabh', 'numerologist', 'punchange-reader', 'signature-reader', 'cibil-clearing-agent', 'document-writer', 'renting-services']) {
  if (!(await prisma.pact.count({ where: { serviceType: 'CONSULTANT', subCategory: s, status: { in: ['ACTIVE', 'RESERVED'] } } }))) { rareSub = s; break }
}
const near = await mkUser('near@rtest.dev', 'CONSULTANT', '110005', 'Delhi')
await mkPact(near.id, '110005', 'CONSULTANT', rareSub)
// nobody at 110001 (Delhi), but 110005 is right next door
const r5 = await findRecipient('110001', 'CONSULTANT', rareSub)
check('a holder in a nearby PIN was found', r5.routed === true && r5.via === 'nearby', `(${r5.routed ? r5.via : r5.reason})`)
check('it reports which PIN it came from', r5.routed && r5.fromPincode === '110005')
check('it reports the distance too', r5.routed && typeof r5.distanceKm === 'number', `(${r5.routed && r5.distanceKm} km)`)

// far away — Mumbai
const r6 = await findRecipient('400001', 'CONSULTANT', rareSub)
check('★ nobody beyond 50 km is chosen', r6.routed === false, `(${r6.routed ? r6.fromPincode : 'unrouted'})`)

// ═══ 4. SUSPENDED holder ═══
console.log('\n── A suspended PACT (§3.1.8.5) ──')

const suspended = await mkUser('suspended@rtest.dev', 'BMF', '700001', 'West Bengal')
await mkPact(suspended.id, '700001', 'BMF', '-', 'SUSPENDED')

const r7 = await findRecipient('700001', 'BMF')
check('★ no lead goes to a suspended holder', r7.routed === false, `(${r7.routed ? r7.holderName : 'unrouted'})`)

// ═══ 5. Creating an enquiry ═══
console.log('\n── Creating and sending an enquiry ──')

const client = await mkUser('client@rtest.dev', 'CLIENT', '110005', 'Delhi')

const { enquiry: e1, pactRecipients: pr1 } = await createEnquiry({
  clientId: client.id, pincode: '110005', serviceType: 'DESIGNA',
  subject: 'I need house plans drawn up', message: 'It is a 200-square-yard plot and two floors are to be built.',
  budget: 1500000, contactName: 'Test Client', contactPhone: '9876543210',
})
check('the enquiry was created', !!e1.id)
check('it went to the right holder', pr1.some((p) => p.holderId === delhi.id) && e1.holderId === delhi.id)
check('the status is NEW', e1.status === 'NEW')
check('it is linked to the PACT', !!e1.pactId)

const notif = await prisma.notification.findFirst({
  where: { userId: delhi.id, type: 'NEW_ENQUIRY' },
})
check('a notification went to the holder', !!notif)

// ═══ 6. UNROUTED ═══
console.log('\n── When there is no holder at all ──')

const { enquiry: e2, pactRecipients: pr2, directId: d2 } = await createEnquiry({
  clientId: client.id, pincode: '781001', serviceType: 'DESIGNI',
  subject: 'Interior design needed', message: 'I want the interior of a flat done.',
  contactName: 'Test Client', contactPhone: '9876543210',
})
check('routing failed', pr2.length === 0 && !d2)
check('★ the enquiry was created anyway — not lost', !!e2.id)
check('it went into UNROUTED', e2.status === 'UNROUTED')
check('it was not given to any holder', e2.holderId === null)

// ═══ 7. An RM Employee assigns it ═══
console.log('\n── RM Employee manual assign ──')

const rm = await mkUser('rm@rtest.dev', 'RM_EMPLOYEE', '110005', 'Delhi')
const assigned = await assignEnquiry({
  enquiryId: e2.id, holderId: delhi.id, employeeId: rm.id,
})
check('it was assigned', assigned.holderId === delhi.id)
check('the status became ASSIGNED', assigned.status === 'ASSIGNED')
check('the employee was recorded', assigned.employeeId === rm.id)

// ═══ 8. Responding ═══
console.log('\n── Responses and the cessation timer ──')

const pactBefore = await prisma.pact.findFirst({
  where: { holderId: delhi.id, pincode: '110005' },
  select: { lastResponseAt: true },
})
check('lastResponseAt was empty beforehand', pactBefore.lastResponseAt === null)

await respondToEnquiry({
  enquiryId: e1.id, senderId: delhi.id,
  message: 'Hello, I will come and look at your plot tomorrow.',
})

const e1After = await prisma.enquiry.findUnique({
  where: { id: e1.id }, include: { responses: true },
})
check('the response was saved', e1After.responses.length === 1)
check('the status became RESPONDED', e1After.status === 'RESPONDED')
check('respondedAt was filled in', !!e1After.respondedAt)

const pactAfter = await prisma.pact.findFirst({
  where: { holderId: delhi.id, pincode: '110005' },
  select: { lastResponseAt: true },
})
check('★ the PACT cessation timer was reset', pactAfter.lastResponseAt !== null)

const clientNotif = await prisma.notification.findFirst({
  where: { userId: client.id, type: 'ENQUIRY_REPLY' },
})
check('the client was notified of the response', !!clientNotif)

// ═══ 9. Strangers must not be able to respond ═══
console.log('\n── Security ──')

const outsider = await mkUser('outsider@rtest.dev', 'PROFESSIONAL', '110005', 'Delhi')
let blocked = false
try {
  await respondToEnquiry({ enquiryId: e1.id, senderId: outsider.id, message: 'I can do it too' })
} catch (err) { blocked = err.message === 'FORBIDDEN' }
check('★ an outsider cannot break into an enquiry', blocked)

const badPin = await findRecipient('99999', 'DESIGNA')
check('a bad PIN is rejected', badPin.routed === false && badPin.reason === 'BAD_PINCODE')

const badSub = await findRecipient('110005', 'CONSULTANT', 'not-real')
check('a bad sub-category is rejected', badSub.routed === false)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
