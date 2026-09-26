/**
 * Scratch check for the renewal engine against the dev DB.
 * Creates a throwaway PACT on an existing holder, exercises the rules, and
 * deletes everything it made. Run: npx tsx tests/pact-renewal.check.ts
 */
import { prisma } from '../src/lib/prisma'
import { startPactRenewal, activatePact, renewalOpen, PactError } from '../src/lib/pact'

const DAY = 86_400_000
let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  const holder = await prisma.user.findFirst({ where: { role: 'PROFESSIONAL', status: 'ACTIVE', deletedAt: null }, select: { id: true } })
  const place = await prisma.pincode.findFirst({ select: { code: true, state: true, district: true } })
  if (!holder || !place) throw new Error('need a holder and a pincode')
  const free = await prisma.pact.findFirst({ where: { pincode: place.code, serviceType: 'DESIGNI', subCategory: '-', status: { in: ['ACTIVE', 'RESERVED'] } } })
  if (free) throw new Error('test seat is occupied; pick another')

  const made: string[] = []
  const pay: string[] = []
  try {
    // 1. Too early: 200 days left
    const early = await prisma.pact.create({ data: { pincode: place.code, state: place.state, city: place.district, serviceType: 'DESIGNI', holderId: holder.id, status: 'ACTIVE', purchasedAt: new Date(), expiresAt: new Date(Date.now() + 200 * DAY) } })
    made.push(early.id)
    ok(!renewalOpen(early), 'window closed at 200 days left')
    try { await startPactRenewal(holder.id, early.id); ok(false, 'early renewal refused') } catch (e) { ok(e instanceof PactError, 'early renewal refused') }

    // 2. In window: 20 days left → extends from old expiry
    const oldExpiry = new Date(Date.now() + 20 * DAY)
    await prisma.pact.update({ where: { id: early.id }, data: { expiresAt: oldExpiry } })
    const r = await startPactRenewal(holder.id, early.id)
    pay.push(r.paymentId)
    await activatePact(r.paymentId, 'check')
    const after = await prisma.pact.findUnique({ where: { id: early.id } })
    const expect = new Date(oldExpiry); expect.setFullYear(expect.getFullYear() + 1)
    ok(after!.status === 'ACTIVE' && Math.abs(after!.expiresAt!.getTime() - expect.getTime()) < 2000, 'renewal adds a full year on top of remaining days')
    const p = await prisma.payment.findUnique({ where: { id: r.paymentId } })
    ok(p!.status === 'PAID' && !!p!.invoiceNumber, 'renewal payment PAID with invoice')

    // 3. Expired in grace, seat taken by someone else → refused
    await prisma.pact.update({ where: { id: early.id }, data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 5 * DAY) } })
    const other = await prisma.user.findFirst({ where: { role: 'PROFESSIONAL', status: 'ACTIVE', deletedAt: null, NOT: { id: holder.id } }, select: { id: true } })
    const rival = await prisma.pact.create({ data: { pincode: place.code, state: place.state, serviceType: 'DESIGNI', holderId: other!.id, status: 'ACTIVE', expiresAt: new Date(Date.now() + 300 * DAY) } })
    made.push(rival.id)
    try { await startPactRenewal(holder.id, early.id); ok(false, 'taken seat refused') } catch (e) { ok(e instanceof PactError && e.code === 'SEAT_TAKEN', 'taken seat refused') }

    // 4. Expired in grace, seat free → renews from today
    await prisma.pact.delete({ where: { id: rival.id } }); made.pop()
    const r2 = await startPactRenewal(holder.id, early.id)
    pay.push(r2.paymentId)
    await activatePact(r2.paymentId, 'check2')
    const back = await prisma.pact.findUnique({ where: { id: early.id } })
    ok(back!.status === 'ACTIVE' && back!.expiresAt!.getTime() > Date.now() + 360 * DAY, 'expired-in-grace PACT is ACTIVE again for a year from today')

    // 5. Past grace → refused
    await prisma.pact.update({ where: { id: early.id }, data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 40 * DAY) } })
    ok(!renewalOpen((await prisma.pact.findUnique({ where: { id: early.id } }))!), 'closed after the 30-day grace')
  } finally {
    await prisma.notification.deleteMany({ where: { userId: holder.id, type: 'PACT_RENEWED' } })
    await prisma.payment.deleteMany({ where: { id: { in: pay } } })
    await prisma.pact.deleteMany({ where: { id: { in: made } } })
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main()
