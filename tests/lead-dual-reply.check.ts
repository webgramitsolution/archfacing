/**
 * Dual distribution — every recipient can answer, each tracks their own
 * progress, and silent PACTs fall under the 30-day cessation rule.
 * Creates throwaway rows on the dev DB and removes them. Run:
 *   npx tsx tests/lead-dual-reply.check.ts
 */
import { prisma } from '../src/lib/prisma'
import { respondToEnquiry } from '../src/lib/enquiry'
import { runCessationChecks } from '../src/lib/pact'

const DAY = 86_400_000
let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  const pros = await prisma.user.findMany({ where: { role: 'PROFESSIONAL', status: 'ACTIVE', deletedAt: null }, take: 3, select: { id: true } })
  const client = await prisma.user.findFirst({ where: { role: 'CLIENT', deletedAt: null }, select: { id: true } })
  const place = await prisma.pincode.findFirst({ skip: 7, select: { code: true, state: true } })
  if (pros.length < 3 || !client || !place) throw new Error('need 3 pros, a client, a pincode')
  const [owner, pactPro, silentPro] = pros

  const pacts: string[] = []
  let enquiryId = ''
  let oldEnquiryId = ''
  try {
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
    const ids = [enquiryId, oldEnquiryId].filter(Boolean)
    await prisma.enquiryResponse.deleteMany({ where: { enquiryId: { in: ids } } })
    await prisma.leadRecipient.deleteMany({ where: { enquiryId: { in: ids } } })
    await prisma.enquiry.deleteMany({ where: { id: { in: ids } } })
    await prisma.notification.deleteMany({ where: { userId: { in: [...pros.map((p) => p.id), client.id] }, createdAt: { gte: new Date(Date.now() - 5 * 60_000) }, type: { in: ['ENQUIRY_REPLY', 'PACT_SUSPENDED'] } } })
    await prisma.pact.deleteMany({ where: { id: { in: pacts } } })
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main()
