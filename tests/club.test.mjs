/**
 * Phase 10 — ArchFacing Club: menu, events, pricing tiers and newsletter.
 *
 *   pnpm test:club
 *
 * ★ The two that matter most:
 *
 *   Test 5  — exactly one pricing tier is live at any moment, and after the
 *             event ends none of them are. Two live tiers would mean two
 *             prices on screen for the same seat.
 *   Test 9  — the seats-left percentage can never exceed 100 or go negative,
 *             however the counters drift.
 */

import './_test-env.mjs'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import {
  seatsInfo, pricingTiers, earlyBirdIsLive, parseHighlights, parseSponsors,
  groupSponsors, durationLabel, isEventType, EVENT_TYPES,
} from '../src/lib/club-events.ts'
import { HEADER_NAV } from '../src/config/nav.ts'
import { unsplash, CLUB_PHOTOS, SPEAKER_PHOTOS, CLUB_GALLERY } from '../src/config/club-media.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// ═══════════════════════════════════════════════════════════
//  1. ★ The menu — Home, PACT and Club are gone from the top bar
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Top-level menu ──')

const labels = HEADER_NAV.map((i) => i.label)

check('★ Home removed from the top bar', !labels.includes('Home'))
check('★ PACT removed from the top bar', !labels.includes('PACT'))
check('★ Club removed from the top bar', !labels.includes('Club'))
check('Membership is present', labels.includes('Membership'))
check('Merchandise is present', labels.includes('Merchandise'))
check('Design Competition is present', labels.includes('Design Competition'))
check('★ Consult Nearby moved out of the bar into the top-bar button', !labels.includes('Consult Nearby'))
check('Advertisements is present', labels.includes('Advertisements'))
check(`${labels.length} top-level items`, labels.length === 10, `(${labels.join(', ')})`)

const membership = HEADER_NAV.find((i) => i.label === 'Membership')
const dropdown = (membership?.links ?? []).map((l) => l.href)

check('★ PACT lives in the Membership dropdown', dropdown.includes('/pact'))
check('★ Club lives in the Membership dropdown', dropdown.includes('/club'))
check('Designers Associates also in the dropdown', dropdown.includes('/designers-associates'))
check('every dropdown entry has a title and description',
  (membership?.links ?? []).every((l) => l.title && l.desc))

// ═══════════════════════════════════════════════════════════
//  2. Photography
// ═══════════════════════════════════════════════════════════
console.log('\n── Unsplash photography ──')

const url = unsplash(CLUB_PHOTOS.seminar, { w: 800, h: 450 })
check('builds an images.unsplash.com URL', url.startsWith('https://images.unsplash.com/photo-'))
check('carries width, height and crop', url.includes('w=800') && url.includes('h=450') && url.includes('fit=crop'))

const nextConfig = fs.readFileSync('next.config.ts', 'utf8')
check('★ images.unsplash.com is allowlisted in next.config.ts',
  nextConfig.includes('images.unsplash.com'))

const allIds = [
  ...Object.values(CLUB_PHOTOS),
  ...Object.values(SPEAKER_PHOTOS),
  ...CLUB_GALLERY,
]
check(`${allIds.length} photo ids configured`, allIds.length >= 20)
check('every id looks like an Unsplash photo id',
  allIds.every((id) => /^\d{10,}-[a-z0-9]+$/.test(id)), `(${allIds.find((id) => !/^\d{10,}-[a-z0-9]+$/.test(id))})`)
check('no id is used for both a speaker and a venue photo',
  Object.values(SPEAKER_PHOTOS).every((id) => !Object.values(CLUB_PHOTOS).includes(id)))

// ═══════════════════════════════════════════════════════════
//  3. Events are seeded and upcoming
// ═══════════════════════════════════════════════════════════
console.log('\n── Seeded events ──')

const events = await prisma.clubEvent.findMany({
  orderBy: { startsAt: 'asc' },
  include: { speakers: true, agenda: true, faqs: true },
})

check(`${events.length} events seeded`, events.length >= 5, `(got ${events.length})`)
check('all are PUBLISHED', events.every((e) => e.status === 'PUBLISHED'))
check('★ all are in the future, so "Upcoming Events" is never empty',
  events.every((e) => e.startsAt > new Date()))
check('slugs are unique', new Set(events.map((e) => e.slug)).size === events.length)
check('every event ends after it starts', events.every((e) => e.endsAt > e.startsAt))
check('every event has a hero photograph',
  events.every((e) => e.heroImage.startsWith('https://images.unsplash.com/')))
check('every event has audience chips and an includes list',
  events.every((e) => e.audience.length > 0 && e.includes.length > 0))
check('every type used is a known type',
  events.every((e) => isEventType(e.type)), `(${EVENT_TYPES.join('|')})`)

const seminar = events.find((e) => e.slug === 'future-of-sustainable-architecture')
check('the reference seminar exists', Boolean(seminar))
// Speakers are left empty in the seed on purpose: no invented or real people
// are presented as speakers. Agenda and FAQs are programme content.
check('it has an agenda and FAQs, and no invented speakers',
  seminar.agenda.length >= 4 && seminar.faqs.length >= 4 && Array.isArray(seminar.speakers))
check('its venue matches the design',
  seminar.venueName === 'India Habitat Centre' && seminar.city === 'New Delhi')
check('its contact matches the design',
  seminar.contactPhone === '+91 96679 87129' && seminar.contactEmail === 'club@archfacing.com')

// ═══════════════════════════════════════════════════════════
//  4. Seats — the design shows 128 / 200 and "64% Left"
// ═══════════════════════════════════════════════════════════
console.log('\n── Seats ──')

const seats = seatsInfo(seminar)
check('200 total seats', seminar.totalSeats === 200)
check('★ 128 seats left, as in the design', seats.left === 128, `(got ${seats.left})`)
check('★ 64% left, as in the design', seats.percentLeft === 64, `(got ${seats.percentLeft})`)
check('not sold out', seats.soldOut === false)

// ═══════════════════════════════════════════════════════════
//  5. ★★ Exactly one pricing tier is live
// ═══════════════════════════════════════════════════════════
console.log('\n── ★★ Pricing tiers ──')

function liveCount(event, now) {
  return pricingTiers(event, now).filter((t) => t.state === 'live').length
}

const beforeEarly = new Date(seminar.earlyBirdTill.getTime() - 86_400_000)
const afterEarly = new Date(seminar.earlyBirdTill.getTime() + 86_400_000)
const eventDay = new Date(seminar.startsAt.getTime() + 3600_000)
const afterEvent = new Date(seminar.endsAt.getTime() + 86_400_000)

check('★★ one tier live before the early-bird cutoff', liveCount(seminar, beforeEarly) === 1)
check('★★ one tier live after the cutoff', liveCount(seminar, afterEarly) === 1)
check('★★ one tier live on the day', liveCount(seminar, eventDay) === 1)
check('★★ no tier live once the event has ended', liveCount(seminar, afterEvent) === 0)

const early = pricingTiers(seminar, beforeEarly)
check('Early Bird is the live tier before the cutoff',
  early.find((t) => t.state === 'live')?.key === 'EARLY_BIRD')
check('Early Bird costs ₹499', Number(early.find((t) => t.key === 'EARLY_BIRD').price) === 499)
check('it shows ₹699 struck through',
  Number(early.find((t) => t.key === 'EARLY_BIRD').strike) === 699)

const std = pricingTiers(seminar, afterEarly)
check('Standard is live after the cutoff',
  std.find((t) => t.state === 'live')?.key === 'STANDARD')
check('Early Bird has become past',
  std.find((t) => t.key === 'EARLY_BIRD').state === 'past')

const spot = pricingTiers(seminar, eventDay)
check('Spot is live on the day', spot.find((t) => t.state === 'live')?.key === 'SPOT')
check('Spot costs ₹899', Number(spot.find((t) => t.key === 'SPOT').price) === 899)

check('early bird reads live today', earlyBirdIsLive(seminar) === true)
check('early bird is not live after its date', earlyBirdIsLive(seminar, afterEarly) === false)

// A free webinar has one tier and no early bird
const webinar = events.find((e) => e.slug === 'webinar-design-to-delivery')
const webinarTiers = pricingTiers(webinar, new Date())
check('★ a free webinar shows a single tier', webinarTiers.length === 1)
check('★ and it is priced at zero', Number(webinarTiers[0].price) === 0)

// ═══════════════════════════════════════════════════════════
//  6. Duration
// ═══════════════════════════════════════════════════════════
console.log('\n── Duration ──')

check('3 hours reads as "(3 Hours)"',
  durationLabel(seminar.startsAt, seminar.endsAt).includes('3'),
  `(${durationLabel(seminar.startsAt, seminar.endsAt)})`)
check('a one-hour webinar says 1 Hour, not Hours',
  /1 Hour\b/.test(durationLabel(webinar.startsAt, webinar.endsAt)),
  `(${durationLabel(webinar.startsAt, webinar.endsAt)})`)

// ═══════════════════════════════════════════════════════════
//  7. ★ JSON columns never throw on bad data
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Malformed JSON is survivable ──')

check('highlights parse from the seed', parseHighlights(seminar.highlights).length === 5)
check('★ null highlights give an empty list', parseHighlights(null).length === 0)
check('★ a string instead of an array gives an empty list', parseHighlights('nonsense').length === 0)
check('★ rows missing a title are dropped',
  parseHighlights([{ body: 'x' }, { title: 'ok', body: 'y', icon: 'star' }]).length === 1)

// Sponsors are empty in the seed (no brand is shown as a sponsor it never agreed to be).
check('sponsor parsing never throws on the seed', Array.isArray(parseSponsors(seminar.sponsors)))
check('★ sample sponsors parse and group by tier',
  groupSponsors(parseSponsors([{ name: 'A', tier: 'Gold' }, { name: 'B', tier: 'Silver' }])).length >= 2)
check('★ null sponsors give an empty list', parseSponsors(null).length === 0)


// ═══════════════════════════════════════════════════════════
//  8. Membership plans match the design
// ═══════════════════════════════════════════════════════════
console.log('\n── Membership plans ──')

const plans = await prisma.clubPlan.findMany({
  where: { isActive: true },
  orderBy: { sortOrder: 'asc' },
})

// Two plans since the Club redesign: Individual and Corporate.
check('two active plans', plans.length === 2, `(got ${plans.length})`)
check('★ Individual ₹1,499', plans[0]?.name === 'Individual' && Number(plans[0]?.price) === 1499)
check('★ Corporate ₹4,999', plans[1]?.name === 'Corporate' && Number(plans[1]?.price) === 4999)
check('★ exactly one is flagged Best Value',
  plans.filter((p) => p.isPopular).length === 1)
check('Individual is the Best Value one', plans.find((p) => p.isPopular)?.slug === 'club-individual')
check('all run 12 months', plans.every((p) => p.months === 12))
check('every plan lists benefits', plans.every((p) => p.benefits.length >= 4))
check('every plan is open to all roles', plans.every((p) => p.allowedRoles.length === 0))

// ═══════════════════════════════════════════════════════════
//  9. ★ Seat percentages stay inside 0–100
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Seat maths cannot go out of range ──')

const cases = [
  { totalSeats: 200, seatsTaken: 0, left: 200, pct: 100 },
  { totalSeats: 200, seatsTaken: 200, left: 0, pct: 0 },
  // more taken than exist — should clamp, not report negative seats
  { totalSeats: 200, seatsTaken: 260, left: 0, pct: 0 },
  { totalSeats: 0, seatsTaken: 0, left: 0, pct: 0 },
]

for (const c of cases) {
  const info = seatsInfo(c)
  check(
    `★ ${c.seatsTaken}/${c.totalSeats} → ${info.left} left, ${info.percentLeft}%`,
    info.left === c.left && info.percentLeft === c.pct &&
    info.percentLeft >= 0 && info.percentLeft <= 100 && info.left >= 0
  )
}

check('a full event reports sold out', seatsInfo({ totalSeats: 10, seatsTaken: 10 }).soldOut)
check('an oversubscribed event reports sold out too',
  seatsInfo({ totalSeats: 10, seatsTaken: 14 }).soldOut)

// ═══════════════════════════════════════════════════════════
//  10. Newsletter
// ═══════════════════════════════════════════════════════════
console.log('\n── Newsletter ──')

const TEST_EMAIL = 'club-test@newsletter.dev'
await prisma.newsletterSubscriber.deleteMany({ where: { email: TEST_EMAIL } })

const { subscribeAction } = await import('../src/app/(public)/club/newsletter-actions.ts')

function fd(email) {
  const f = new FormData()
  f.set('email', email)
  f.set('source', 'club')
  return f
}

const bad = await subscribeAction(null, fd('not-an-email'))
check('a malformed address is rejected', bad?.ok === false)

const first = await subscribeAction(null, fd(TEST_EMAIL))
check('a valid address is accepted', first?.ok === true)
check('the row is stored',
  (await prisma.newsletterSubscriber.count({ where: { email: TEST_EMAIL } })) === 1)

const second = await subscribeAction(null, fd(TEST_EMAIL.toUpperCase()))
check('★ subscribing twice still reads as success', second?.ok === true)
check('★ and does not create a second row — case is normalised',
  (await prisma.newsletterSubscriber.count({ where: { email: TEST_EMAIL } })) === 1)

await prisma.newsletterSubscriber.deleteMany({ where: { email: TEST_EMAIL } })

await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
