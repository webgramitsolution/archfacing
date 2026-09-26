/**
 * Check for the renewal engine against the TEST DB.
 * Creates two throwaway @renewtest.dev holders and their PACTs, exercises the
 * rules, and deletes only what it made. Pincode rows are read, never written.
 * Run: TEST_DATABASE_URL=... npx tsx tests/pact-renewal.check.ts
 */
import './_test-env.mjs'
import { prisma } from '../src/lib/prisma'
import { startPactRenewal, activatePact, renewalOpen, PactError } from '../src/lib/pact'

const DAY = 86_400_000
const DOMAIN = '@renewtest.dev'
let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  // Read-only: a PIN whose DESIGNI seat nobody holds, so we never touch someone else's PACT.
  const pins = await prisma.pincode.findMany({ take: 50, orderBy: { code: 'asc' }, select: { code: true, state: true, district: true } })
  const taken = new Set((await prisma.pact.findMany({
    where: { pincode: { in: pins.map((p) => p.code) }, serviceType: 'DESIGNI', subCategory: '-', status: { in: ['ACTIVE', 'RESERVED'] } },
    select: { pincode: true },
  })).map((p) => p.pincode))
  const place = pins.find((p) => !taken.has(p.code))
  if (!place) throw new Error('no Pincode rows, or none of the first 50 has a free DESIGNI seat — import pincodes into the test DB')

  const stamp = Date.now()
  const userIds: string[] = []
  const mkPro = async (tag: string) => {
    const u = await prisma.user.create({
      data: { email: `${tag}-${stamp}${DOMAIN}`, name: `Renew ${tag}`, role: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: new Date() },
      select: { id: true },
    })
    userIds.push(u.id)
    return u
  }

  const made: string[] = []
  const pay: string[] = []
  try {
    const holder = await mkPro('holder')
    const other = await mkPro('rival')

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
    const rival = await prisma.pact.create({ data: { pincode: place.code, state: place.state, serviceType: 'DESIGNI', holderId: other.id, status: 'ACTIVE', expiresAt: new Date(Date.now() + 300 * DAY) } })
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
    // Only this run's rows: payments/PACTs of the fixture holders (no cascade from
    // User), then the users themselves (notifications cascade).
    const mine = { in: userIds }
    await prisma.payment.deleteMany({ where: { OR: [{ id: { in: pay } }, { userId: mine }] } })
    await prisma.pact.deleteMany({ where: { OR: [{ id: { in: made } }, { holderId: mine }] } })
    await prisma.user.deleteMany({ where: { id: mine, email: { endsWith: DOMAIN } } })
    await prisma.$disconnect()
  }
  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
