/**
 * Dual distribution — every recipient can answer, each tracks their own
 * progress, and silent PACTs fall under the 30-day cessation rule.
 * Creates throwaway @leadtest.dev users + their rows on the TEST DB and removes
 * only those. Pincode rows are read, never written. Run:
 *   TEST_DATABASE_URL=... npx tsx tests/lead-dual-reply.check.ts
 */
import './_test-env.mjs'
import { prisma } from '../src/lib/prisma'
import { respondToEnquiry } from '../src/lib/enquiry'
import { runCessationChecks } from '../src/lib/pact'

const DAY = 86_400_000
const DOMAIN = '@leadtest.dev'
let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  // Read-only: a PIN whose DESIGNA and CONSULTANT/test-sub seats are free.
  const pins = await prisma.pincode.findMany({ take: 50, orderBy: { code: 'asc' }, select: { code: true, state: true } })
  const taken = new Set((await prisma.pact.findMany({
    where: {
      pincode: { in: pins.map((p) => p.code) }, status: { in: ['ACTIVE', 'RESERVED'] },
      OR: [{ serviceType: 'DESIGNA', subCategory: '-' }, { serviceType: 'CONSULTANT', subCategory: 'test-sub' }],
    },
    select: { pincode: true },
  })).map((p) => p.pincode))
  const place = pins.find((p) => !taken.has(p.code))
  if (!place) throw new Error('no Pincode rows, or none of the first 50 has free seats — import pincodes into the test DB')

  const stamp = Date.now()
  const userIds: string[] = []
  const mkUser = async (tag: string, role: 'PROFESSIONAL' | 'CLIENT') => {
    const u = await prisma.user.create({
      data: { email: `${tag}-${stamp}${DOMAIN}`, name: `Lead ${tag}`, role, status: 'ACTIVE', emailVerified: new Date() },
      select: { id: true },
    })
    userIds.push(u.id)
    return u
  }

  const pacts: string[] = []
  let enquiryId = ''
  let oldEnquiryId = ''
  try {
    const owner = await mkUser('owner', 'PROFESSIONAL')
    const pactPro = await mkUser('pactpro', 'PROFESSIONAL')
    const silentPro = await mkUser('silentpro', 'PROFESSIONAL')
    const client = await mkUser('client', 'CLIENT')

    const pact = await prisma.pact.create({ data: { pincode: place.code, state: place.state, serviceType: 'DESIGNA', holderId: pactPro.id, status: 'ACTIVE', expiresAt: new Date(Date.now() + 200 * DAY) } })
    const silent = await prisma.pact.create({ data: { pincode: place.code, state: place.state, serviceType: 'CONSULTANT', subCategory: 'test-sub', holderId: silentPro.id, status: 'ACTIVE', expiresAt: new Date(Date.now() + 200 * DAY) } })
    pacts.push(pact.id, silent.id)

    const e = await prisma.enquiry.create({
      data: {
        clientId: client.id, holderId: owner.id, directRecipientId: owner.id, serviceType: 'DESIGNA', pincode: place.code,
        subject: 'check', message: 'check', status: 'NEW', contactName: 'Check', contactPhone: '9000000000',
        recipients: { create: [
          { recipientId: owner.id, type: 'DIRECT', routingReason: 'owner', deliveryStatus: 'SENT' },
          { recipientId: pactPro.id, type: 'PACT', routingReason: 'pact', pactId: pact.id, deliveryStatus: 'SENT' },
        ] },
      },
    })
    enquiryId = e.id

    await respondToEnquiry({ enquiryId, senderId: pactPro.id, message: 'from the PACT holder' })
    const rec = await prisma.leadRecipient.findUnique({ where: { enquiryId_recipientId: { enquiryId, recipientId: pactPro.id } } })
    const ownerRec = await prisma.leadRecipient.findUnique({ where: { enquiryId_recipientId: { enquiryId, recipientId: owner.id } } })
    ok(rec!.deliveryStatus === 'RESPONDED', 'PACT holder can reply; their row is RESPONDED')
    ok(ownerRec!.deliveryStatus === 'SENT', "owner's own progress is untouched")
    ok(!!(await prisma.pact.findUnique({ where: { id: pact.id } }))!.lastResponseAt, 'PACT cessation clock restarted')
    ok((await prisma.enquiry.findUnique({ where: { id: enquiryId } }))!.status === 'RESPONDED', 'enquiry marked answered')

    let forbidden = false
    try { await respondToEnquiry({ enquiryId, senderId: silentPro.id, message: 'x' }) } catch (err) { forbidden = (err as Error).message === 'FORBIDDEN' }
    ok(forbidden, 'a professional the lead was not sent to is refused')

    const before = await prisma.notification.count({ where: { userId: { in: [owner.id, pactPro.id] }, type: 'ENQUIRY_REPLY' } })
    await respondToEnquiry({ enquiryId, senderId: client.id, message: 'buyer reply' })
    const after = await prisma.notification.count({ where: { userId: { in: [owner.id, pactPro.id] }, type: 'ENQUIRY_REPLY' } })
    ok(after - before === 2, 'buyer reply notifies the owner and the engaged PACT holder')

    // Cessation: an unanswered lead routed to the silent PACT 31 days ago
    const old = await prisma.enquiry.create({
      data: {
        clientId: client.id, serviceType: 'CONSULTANT', pincode: place.code, subject: 'old', message: 'old', status: 'NEW', contactName: 'Check', contactPhone: '9000000000',
        createdAt: new Date(Date.now() - 31 * DAY),
        recipients: { create: [{ recipientId: silentPro.id, type: 'PACT', routingReason: 'pact', pactId: silent.id, deliveryStatus: 'SENT', createdAt: new Date(Date.now() - 31 * DAY) }] },
      },
    })
    oldEnquiryId = old.id
    await runCessationChecks()
    ok((await prisma.pact.findUnique({ where: { id: silent.id } }))!.status === 'SUSPENDED', 'a PACT that never answered a 31-day-old lead is suspended')
    ok((await prisma.pact.findUnique({ where: { id: pact.id } }))!.status === 'ACTIVE', 'the PACT that replied stays active')
  } finally {
    // Only this run's rows. Enquiries/lead rows/PACTs don't cascade from User, so
    // they go first (responses cascade from Enquiry); notifications cascade with the users.
    const ids = [enquiryId, oldEnquiryId].filter(Boolean)
    const mine = { in: userIds }
    const enqWhere = { OR: [{ id: { in: ids } }, { clientId: mine }] }
    await prisma.enquiryResponse.deleteMany({ where: { enquiry: enqWhere } })
    await prisma.leadRecipient.deleteMany({ where: { OR: [{ enquiry: enqWhere }, { recipientId: mine }] } })
    await prisma.enquiry.deleteMany({ where: enqWhere })
    await prisma.pact.deleteMany({ where: { OR: [{ id: { in: pacts } }, { holderId: mine }] } })
    await prisma.user.deleteMany({ where: { id: mine, email: { endsWith: DOMAIN } } })
    await prisma.$disconnect()
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
