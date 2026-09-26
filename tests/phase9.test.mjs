/**
 * Phase 9 — Club Membership, Portal Space and Advertisements.
 *
 *   pnpm test:phase9
 *
 * ★ The two tests that matter most:
 *
 *   Test 4  — renewing early must not throw away days already paid for.
 *   Test 14 — ten advertisers race for the last slot on a placement;
 *             exactly one may get it, and the placement must never be
 *             oversold.
 */

import './_test-env.mjs'
import { PrismaClient, Prisma } from '@prisma/client'
import {
  listClubPlans, getClubPlan, clubPlanTotal, getActiveMembership,
  startClubPurchase, activateClubMembership, grantFreeDaMembership,
  daysLeft, addMonths, ClubError,
} from '../src/lib/club.ts'
import {
  getStorageUsage, startPortalSpacePurchase, activatePortalSpace,
  expirePortalSpace, packTotal, PortalSpaceError,
} from '../src/lib/portal-space.ts'
import { PORTAL_SPACE_PACKS, findPack } from '../src/config/portal-space.ts'
import {
  listPlacements, getPlacement, bookingTotal, slotsLeft, createBooking,
  markBookingPaid, approveBooking, rejectBooking, activeAdsFor,
  endFinishedAds, releaseUnpaidBookings, isSafeUrl, AdError,
} from '../src/lib/ads.ts'
import { BUSINESS_RULES } from '../src/config/permissions.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

const MARK = '@p9.dev'

async function cleanup() {
  const where = { user: { email: { contains: MARK } } }
  await prisma.adBooking.deleteMany({ where: { advertiser: { email: { contains: MARK } } } })
  await prisma.clubMembership.deleteMany({ where })
  await prisma.portalSpace.deleteMany({ where })
  await prisma.payment.deleteMany({ where })
  await prisma.notification.deleteMany({ where })
  await prisma.designAssociate.deleteMany({ where })
  await prisma.user.deleteMany({ where: { email: { contains: MARK } } })
}
await cleanup()

async function mkUser(name, role = 'PROFESSIONAL', extra = {}) {
  return prisma.user.create({
    data: {
      email: `${name}${MARK}`, name, role, status: 'ACTIVE',
      emailVerified: new Date(), pincode: '110016', state: 'Delhi',
      ...extra,
    },
  })
}

/** Walks a purchase all the way through, the way the UI does. */
async function buyClub(userId, slug) {
  const { paymentId } = await startClubPurchase(userId, slug)
  return activateClubMembership(paymentId, `test_${paymentId}`)
}

// ═══════════════════════════════════════════════════════════
//  1. Plans are seeded and priced
// ═══════════════════════════════════════════════════════════
console.log('\n── Club plans ──')

const plans = await listClubPlans()
check(`${plans.length} plans seeded`, plans.length >= 2, `(got ${plans.length})`)
check('every plan has benefits listed', plans.every((p) => p.benefits.length > 0))
check('every plan has a positive price', plans.every((p) => Number(p.price) > 0))
check('exactly one plan is flagged popular',
  plans.filter((p) => p.isPopular).length === 1)

const annual = await getClubPlan('club-individual')
check('club-individual exists', annual !== null)

const t = clubPlanTotal(annual)
check(`GST adds up — ${t.amount} + ${t.tax} = ${t.total}`,
  Math.abs(t.amount + t.tax - t.total) < 0.005)

// ═══════════════════════════════════════════════════════════
//  2. Role filtering
// ═══════════════════════════════════════════════════════════
console.log('\n── Who may buy which plan ──')

// The seeded plans are all open to everyone, so this test builds its own
// role-restricted plan rather than leaning on seed data that may change.
const CORP_ONLY = 'p9-corporate-only'
await prisma.clubPlan.upsert({
  where: { slug: CORP_ONLY },
  create: {
    slug: CORP_ONLY, name: 'Test Corporate Only', months: 12,
    price: new Prisma.Decimal(1000), benefits: ['Test'],
    allowedRoles: ['CORPORATE'], sortOrder: 99,
  },
  update: { allowedRoles: ['CORPORATE'], isActive: true },
})

const proPlans = await listClubPlans('PROFESSIONAL')
const corpPlans = await listClubPlans('CORPORATE')

check('★ a Corporate-only plan is hidden from a Professional',
  !proPlans.some((p) => p.slug === CORP_ONLY))
check('★ Corporate sees it', corpPlans.some((p) => p.slug === CORP_ONLY))
check('open plans show for everyone',
  proPlans.some((p) => p.slug === 'club-individual') &&
  corpPlans.some((p) => p.slug === 'club-individual'))

const pro = await mkUser('pro')
let rejected = false
try {
  await startClubPurchase(pro.id, CORP_ONLY)
} catch (e) {
  rejected = e instanceof ClubError && e.code === 'ROLE_NOT_ALLOWED'
}
check('★ a Professional cannot buy a Corporate-only plan', rejected)

await prisma.clubPlan.deleteMany({ where: { slug: CORP_ONLY } })

// ═══════════════════════════════════════════════════════════
//  3. Buying activates a membership
// ═══════════════════════════════════════════════════════════
console.log('\n── Buying ──')

const buyer = await mkUser('buyer')
check('no membership before buying', (await getActiveMembership(buyer.id)) === null)

const first = await buyClub(buyer.id, 'club-individual')
check('membership created', first.membership !== null)
check('12 months long',
  Math.abs(daysLeft(first.membership.expiresAt) - 365) <= 2,
  `(${daysLeft(first.membership.expiresAt)} days)`)

const active = await getActiveMembership(buyer.id)
check('reads back as active', active?.id === first.membership.id)

const paidRow = await prisma.payment.findFirst({
  where: { userId: buyer.id, purpose: 'CLUB_MEMBERSHIP' },
})
check('payment marked PAID', paidRow?.status === 'PAID')
check('invoice number issued', Boolean(paidRow?.invoiceNumber))
check('notification sent',
  (await prisma.notification.count({ where: { userId: buyer.id, type: 'CLUB_ACTIVE' } })) === 1)

// ═══════════════════════════════════════════════════════════
//  4. ★ Renewing early keeps the days already paid for
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Renewing early loses nothing ──')

const before = (await getActiveMembership(buyer.id)).expiresAt
const basicPlan = await getClubPlan('club-corporate')
// Read the term from the plan rather than hard-coding it — plan lengths
// are seed data and have changed once already.
const addedDays = Math.round(basicPlan.months * 30.44)
const second = await buyClub(buyer.id, 'club-corporate')

check('★ new term starts where the old one ended',
  Math.abs(second.membership.startsAt.getTime() - before.getTime()) < 1000)
check('★ expiry moved forward, never backward',
  second.membership.expiresAt > before)
check(`★ roughly ${basicPlan.months} more months added`,
  Math.abs(daysLeft(second.membership.expiresAt) - (daysLeft(before) + addedDays)) <= 3,
  `(${daysLeft(second.membership.expiresAt)} vs ${daysLeft(before) + addedDays})`)

// ═══════════════════════════════════════════════════════════
//  5. Idempotency — a webhook that fires twice
// ═══════════════════════════════════════════════════════════
console.log('\n── A repeated webhook ──')

const twice = await mkUser('twice')
const { paymentId: pid } = await startClubPurchase(twice.id, 'club-individual')
await activateClubMembership(pid, 'first_call')
const again = await activateClubMembership(pid, 'second_call')

check('★ second confirmation is a no-op', again.alreadyDone === true)
check('★ only one membership exists',
  (await prisma.clubMembership.count({ where: { userId: twice.id } })) === 1)

// ═══════════════════════════════════════════════════════════
//  6. Design Associate — free, and only once
// ═══════════════════════════════════════════════════════════
console.log('\n── Design Associate gets it free ──')

const da = await mkUser('da')
const grant = await grantFreeDaMembership(da.id)

check('free membership granted', grant.created === true)
check('marked as free', grant.membership.isFree === true)
check('costs nothing', Number(grant.membership.price) === 0)
check(`runs ${BUSINESS_RULES.DA_FREE_CLUB_YEARS} years`,
  Math.abs(daysLeft(grant.membership.expiresAt) - BUSINESS_RULES.DA_FREE_CLUB_YEARS * 365) <= 5)

const regrant = await grantFreeDaMembership(da.id)
check('★ calling again does not stack another term', regrant.created === false)
check('★ still exactly one membership',
  (await prisma.clubMembership.count({ where: { userId: da.id } })) === 1)

let blocked = false
try {
  await startClubPurchase(da.id, 'club-individual')
} catch (e) {
  blocked = e instanceof ClubError && e.code === 'ALREADY_FREE'
}
check('★ a DA is not allowed to pay for what they already have free', blocked)

// ═══════════════════════════════════════════════════════════
//  7. addMonths does not roll past a month end
// ═══════════════════════════════════════════════════════════
console.log('\n── Month arithmetic ──')

const jan31 = new Date(2026, 0, 31)
const feb = addMonths(jan31, 1)
check('★ 31 Jan + 1 month = 28 Feb, not 3 March',
  feb.getMonth() === 1 && feb.getDate() === 28,
  `(got ${feb.toDateString()})`)

const mar31 = addMonths(new Date(2026, 2, 31), 1)
check('31 March + 1 month = 30 April',
  mar31.getMonth() === 3 && mar31.getDate() === 30)

const yearOn = addMonths(new Date(2026, 5, 15), 12)
check('15 June + 12 months = 15 June next year',
  yearOn.getFullYear() === 2027 && yearOn.getMonth() === 5 && yearOn.getDate() === 15)

// ═══════════════════════════════════════════════════════════
//  8. Portal Space — packs and pricing
// ═══════════════════════════════════════════════════════════
console.log('\n── Portal Space packs ──')

check(`${PORTAL_SPACE_PACKS.length} packs defined`, PORTAL_SPACE_PACKS.length >= 4)
check('every pack adds space', PORTAL_SPACE_PACKS.every((p) => p.extraMb > 0))
check('slugs are unique',
  new Set(PORTAL_SPACE_PACKS.map((p) => p.slug)).size === PORTAL_SPACE_PACKS.length)
check('bigger packs cost more per pack',
  PORTAL_SPACE_PACKS.every((p, i, a) => i === 0 || p.price > a[i - 1].price))
check('bigger packs cost less per MB',
  PORTAL_SPACE_PACKS.every((p, i, a) =>
    i === 0 || p.price / p.extraMb < a[i - 1].price / a[i - 1].extraMb))

const pk = packTotal(findPack('space-500'))
check(`pack GST adds up — ${pk.amount} + ${pk.tax} = ${pk.total}`,
  Math.abs(pk.amount + pk.tax - pk.total) < 0.005)

// ═══════════════════════════════════════════════════════════
//  9. Buying space raises the quota
// ═══════════════════════════════════════════════════════════
console.log('\n── Buying space ──')

const stor = await mkUser('stor')
const u0 = await getStorageUsage(stor.id)

check(`starts on the free ${BUSINESS_RULES.FREE_STORAGE_MB} MB`,
  u0.quotaMb === BUSINESS_RULES.FREE_STORAGE_MB, `(got ${u0.quotaMb})`)
check('nothing purchased yet', u0.purchasedMb === 0)

const sp = await startPortalSpacePurchase(stor.id, 'space-500')
const midway = await getStorageUsage(stor.id)
check('★ quota unchanged while the payment is still pending',
  midway.quotaMb === BUSINESS_RULES.FREE_STORAGE_MB)

await activatePortalSpace(sp.paymentId, `ps_${sp.paymentId}`)
const u1 = await getStorageUsage(stor.id)

check('quota raised by 500 MB',
  u1.quotaMb === BUSINESS_RULES.FREE_STORAGE_MB + 500, `(got ${u1.quotaMb})`)
check('purchased total reported', u1.purchasedMb === 500)

const spRow = await prisma.portalSpace.findFirst({ where: { userId: stor.id } })
check(`valid for ${BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS} years`,
  Math.abs(daysLeft(spRow.expiresAt) - BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS * 365) <= 5)

const spTwice = await activatePortalSpace(sp.paymentId, `ps_${sp.paymentId}`)
check('★ a repeated webhook does not grant the space twice',
  spTwice.alreadyDone === true &&
  (await getStorageUsage(stor.id)).quotaMb === BUSINESS_RULES.FREE_STORAGE_MB + 500)

// ═══════════════════════════════════════════════════════════
//  10. Usage percentage never lies
// ═══════════════════════════════════════════════════════════
console.log('\n── Usage reporting ──')

await prisma.user.update({ where: { id: stor.id }, data: { storageUsedMb: 300 } })
const u2 = await getStorageUsage(stor.id)
check('50% of 600 MB', u2.percentUsed === 50, `(got ${u2.percentUsed})`)
check('300 MB still free', u2.freeMb === 300)
check('not full yet', u2.isFull === false)

await prisma.user.update({ where: { id: stor.id }, data: { storageUsedMb: 900 } })
const u3 = await getStorageUsage(stor.id)
check('★ over quota still caps the bar at 100%', u3.percentUsed === 100)
check('★ free space never goes negative', u3.freeMb === 0)
check('reported as full', u3.isFull === true)

// ═══════════════════════════════════════════════════════════
//  11. ★ Expiry takes the space back exactly once
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Expiry reclaims space once, not every night ──')

await prisma.portalSpace.update({
  where: { id: spRow.id },
  data: { expiresAt: new Date(Date.now() - 86_400_000) },
})

const r1 = await expirePortalSpace()
check('one pack reclaimed', r1.reclaimed === 1)

const afterExpiry = await getStorageUsage(stor.id)
check('quota back to the free grant',
  afterExpiry.quotaMb === BUSINESS_RULES.FREE_STORAGE_MB, `(got ${afterExpiry.quotaMb})`)

const r2 = await expirePortalSpace()
check('★ running the cron again reclaims nothing', r2.reclaimed === 0)
check('★ quota did not drop below the free grant',
  (await getStorageUsage(stor.id)).quotaMb === BUSINESS_RULES.FREE_STORAGE_MB)

const filesKept = await prisma.portalSpace.findUnique({ where: { id: spRow.id } })
check('the purchase record is kept for the receipt', filesKept !== null)
check('marked as reclaimed', filesKept.reclaimedAt !== null)

// ═══════════════════════════════════════════════════════════
//  12. Advertisement placements
// ═══════════════════════════════════════════════════════════
console.log('\n── Ad placements ──')

const places = await listPlacements()
check(`${places.length} placements seeded`, places.length >= 6)
check('every placement has a size', places.every((p) => /^\d+x\d+$/.test(p.size)))
check('every placement has at least one slot', places.every((p) => p.maxSlots >= 1))

const hero = await getPlacement('home-hero')
check('home-hero exists', hero !== null)

const bt = bookingTotal(hero, 4)
check(`4 weeks priced correctly — ${bt.amount}`,
  bt.amount === Number(hero.weeklyPrice) * 4)
check(`ad GST adds up — ${bt.amount} + ${bt.tax} = ${bt.total}`,
  Math.abs(bt.amount + bt.tax - bt.total) < 0.005)

// ═══════════════════════════════════════════════════════════
//  13. Only the right roles may advertise, with safe URLs
// ═══════════════════════════════════════════════════════════
console.log('\n── Who may advertise ──')

const corp = await mkUser('corp', 'CORPORATE')
const client = await mkUser('client', 'CLIENT')

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const baseBooking = {
  placementSlug: 'blog-inline',
  title: 'Test campaign',
  imageUrl: '/img/ad-building-materials.svg',
  targetUrl: 'https://example.com/landing',
  startsAt: tomorrow,
  weeks: 2,
}

let roleBlocked = false
try {
  await createBooking({ ...baseBooking, advertiserId: client.id })
} catch (e) {
  roleBlocked = e instanceof AdError && e.code === 'ROLE_NOT_ALLOWED'
}
check('★ a Client cannot book an advertisement', roleBlocked)

check('javascript: URL rejected', isSafeUrl('javascript:alert(1)') === false)
check('data: URL rejected', isSafeUrl('data:text/html,<script>') === false)
check('bare domain rejected', isSafeUrl('example.com') === false)
check('https accepted', isSafeUrl('https://example.com') === true)
check('http accepted', isSafeUrl('http://example.com/a?b=c') === true)

let urlBlocked = false
try {
  await createBooking({
    ...baseBooking, advertiserId: corp.id, targetUrl: 'javascript:alert(1)',
  })
} catch (e) {
  urlBlocked = e instanceof AdError && e.code === 'BAD_URL'
}
check('★ a script URL never reaches the database', urlBlocked)

let pastBlocked = false
try {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 3)
  await createBooking({ ...baseBooking, advertiserId: corp.id, startsAt: yesterday })
} catch (e) {
  pastBlocked = e instanceof AdError && e.code === 'BAD_DATES'
}
check('a start date in the past is refused', pastBlocked)

let weeksBlocked = false
try {
  await createBooking({ ...baseBooking, advertiserId: corp.id, weeks: 0 })
} catch (e) {
  weeksBlocked = e instanceof AdError && e.code === 'BAD_DATES'
}
check('zero weeks is refused', weeksBlocked)

// ═══════════════════════════════════════════════════════════
//  14. ★★ Ten advertisers race for the last slot
// ═══════════════════════════════════════════════════════════
console.log('\n── ★★ Ten advertisers, two slots ──')

// home-hero carries 2 slots. Ten Corporate accounts try the same fortnight.
const racers = await Promise.all(
  Array.from({ length: 10 }, (_, i) => mkUser(`racer${i}`, 'CORPORATE'))
)

// Two years out, clear of the demo campaigns in the dev database.
const raceStart = new Date()
raceStart.setDate(raceStart.getDate() + 730)

const results = await Promise.allSettled(
  racers.map((u) =>
    createBooking({
      advertiserId: u.id,
      placementSlug: 'home-hero',
      title: `Race ${u.name}`,
      imageUrl: '/img/ad-building-materials.svg',
      targetUrl: 'https://example.com',
      startsAt: raceStart,
      weeks: 2,
    })
  )
)

const won = results.filter((r) => r.status === 'fulfilled').length
const lost = results.filter((r) => r.status === 'rejected').length

check(`★★ exactly ${hero.maxSlots} bookings succeeded`, won === hero.maxSlots, `(got ${won})`)
check(`★★ the other ${10 - hero.maxSlots} were told it is sold out`,
  lost === 10 - hero.maxSlots)
check('★★ every rejection was SOLD_OUT, not a crash',
  results.filter((r) => r.status === 'rejected')
    .every((r) => r.reason instanceof AdError && r.reason.code === 'SOLD_OUT'))

const raceEnd = new Date(raceStart)
raceEnd.setDate(raceEnd.getDate() + 14)
const left = await slotsLeft(hero.id, raceStart, raceEnd)
check('★★ the placement is not oversold', left.free === 0 && left.taken === hero.maxSlots)

// Dates that do not overlap must still be bookable.
const laterStart = new Date(raceStart)
laterStart.setDate(laterStart.getDate() + 60)
const laterEnd = new Date(laterStart)
laterEnd.setDate(laterEnd.getDate() + 14)
const laterFree = await slotsLeft(hero.id, laterStart, laterEnd)
check('★ a different fortnight is still fully available',
  laterFree.free === hero.maxSlots)

// ═══════════════════════════════════════════════════════════
//  15. Payment does not skip review
// ═══════════════════════════════════════════════════════════
console.log('\n── Paying does not publish ──')

const winner = results.find((r) => r.status === 'fulfilled').value
let booking = await prisma.adBooking.findUnique({ where: { id: winner.bookingId } })
check('starts as PENDING_PAYMENT', booking.status === 'PENDING_PAYMENT')

await markBookingPaid(winner.paymentId, `ad_${winner.paymentId}`)
booking = await prisma.adBooking.findUnique({ where: { id: winner.bookingId } })

check('★ after payment it waits for review, it does not go live',
  booking.status === 'PENDING_REVIEW')
check('★ a paid but unreviewed ad is not served',
  (await activeAdsFor('home-hero')).every((a) => a.id !== booking.id))

const twicePaid = await markBookingPaid(winner.paymentId, `ad_${winner.paymentId}`)
check('repeated payment webhook is a no-op', twicePaid.alreadyDone === true)

// ═══════════════════════════════════════════════════════════
//  16. Admin review
// ═══════════════════════════════════════════════════════════
console.log('\n── Admin review ──')

const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })

let shortReason = false
try {
  await rejectBooking(winner.bookingId, admin.id, 'no')
} catch (e) {
  shortReason = e instanceof AdError
}
check('★ rejecting requires a real reason', shortReason)

const approved = await approveBooking(winner.bookingId, admin.id)
// Its start date is in the future, so approval schedules it; the nightly cron promotes it to RUNNING.
check('approved future ad is SCHEDULED', approved.status === 'SCHEDULED')
check('reviewer recorded', approved.reviewedById === admin.id)

let doubleApprove = false
try {
  await approveBooking(winner.bookingId, admin.id)
} catch (e) {
  doubleApprove = e instanceof AdError && e.code === 'WRONG_STATE'
}
check('★ an already-approved ad cannot be approved again', doubleApprove)

// A second winner, rejected this time.
const other = results.filter((r) => r.status === 'fulfilled')[1].value
await markBookingPaid(other.paymentId, `ad_${other.paymentId}`)
const rejectedAd = await rejectBooking(
  other.bookingId, admin.id, 'The creative is blurred at 1200x300 — please resupply at full size.'
)
check('rejected ad carries its reason',
  rejectedAd.status === 'REJECTED' && rejectedAd.rejectionReason.length > 10)
check('advertiser was told why',
  (await prisma.notification.count({
    where: { userId: rejectedAd.advertiserId, type: 'AD_REJECTED' },
  })) === 1)

// ═══════════════════════════════════════════════════════════
//  17. ★ A rejected ad gives its slot back
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Slots come back ──')

const afterReject = await slotsLeft(hero.id, raceStart, raceEnd)
check('★ rejecting an ad frees its slot',
  afterReject.free === 1, `(free: ${afterReject.free})`)

// ═══════════════════════════════════════════════════════════
//  18. Cron — finishing and releasing
// ═══════════════════════════════════════════════════════════
console.log('\n── Nightly maintenance ──')

await prisma.adBooking.update({
  where: { id: winner.bookingId },
  data: { startsAt: new Date(Date.now() - 20 * 86_400_000), endsAt: new Date(Date.now() - 86_400_000) },
})

const ended = await endFinishedAds()
check('finished ads are closed', ended.ended >= 1)
check('closed ad is no longer served',
  (await activeAdsFor('home-hero')).every((a) => a.id !== winner.bookingId))

// An abandoned checkout, an hour old.
const ghost = await mkUser('ghost', 'CORPORATE')
const ghostBooking = await createBooking({
  ...baseBooking, advertiserId: ghost.id, title: 'Abandoned',
})
await prisma.adBooking.update({
  where: { id: ghostBooking.bookingId },
  data: { createdAt: new Date(Date.now() - 3 * 3600_000) },
})

const blogInline = await getPlacement('blog-inline')
const heldBefore = await slotsLeft(blogInline.id, tomorrow, ghostBooking.endsAt)
const released = await releaseUnpaidBookings(60)
check('★ an abandoned booking releases its slot', released.released >= 1)

const ghostRow = await prisma.adBooking.findUnique({ where: { id: ghostBooking.bookingId } })
check('★ it becomes a DRAFT rather than being deleted', ghostRow.status === 'DRAFT')
check('★ the advertiser can still see what they started',
  ghostRow.title === 'Abandoned' && heldBefore.taken >= 1)

// ═══════════════════════════════════════════════════════════
//  19. Config sanity
// ═══════════════════════════════════════════════════════════
console.log('\n── Config ──')

check('DA free club years is set', BUSINESS_RULES.DA_FREE_CLUB_YEARS === 10)
check('Portal Space runs 5 years', BUSINESS_RULES.PORTAL_SPACE_VALIDITY_YEARS === 5)
check('free storage is 100 MB', BUSINESS_RULES.FREE_STORAGE_MB === 100)

let badPack = false
try {
  await startPortalSpacePurchase(stor.id, 'space-does-not-exist')
} catch (e) {
  badPack = e instanceof PortalSpaceError && e.code === 'PACK_NOT_FOUND'
}
check('an unknown pack slug is refused', badPack)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
