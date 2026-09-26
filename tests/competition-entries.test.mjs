/**
 * ★ Design Competition — the half the PDF never specified.
 *
 *   pnpm test:entries
 *
 * §5.2.7 says how a competition is announced and stops there. Everything
 * tested below is the rest of the cycle: designers answering the brief,
 * someone judging them, one winner taking the prize.
 *
 * ★ The three that matter most:
 *
 *   Test 3  — a designer holds exactly ONE entry per competition. Without the
 *             unique key a refresh on the submit button enters twice.
 *   Test 5  — the database itself refuses a second WINNER on one competition,
 *             so two people can never both be told they won.
 *   Test 6  — declaring a winner leaves nobody waiting: every other entry is
 *             resolved in the same transaction.
 */

import './_test-env.mjs'
import { PrismaClient } from '@prisma/client'
import {
  entryGate, roleMayEnter, daysToDeadline,
  ENTRY_STATUS_LABEL, ENTRY_STATUS_TONE,
} from '../src/lib/competition-entry-status.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

const DAY = 86_400_000
const now = new Date('2026-06-01T12:00:00Z')
const future = new Date(now.getTime() + 10 * DAY)
const past = new Date(now.getTime() - 10 * DAY)

const OPEN = {
  status: 'PUBLISHED',
  submissionDeadline: future,
  winnerAnnouncedAt: null,
  authorId: 'owner-1',
}

// ═══════════════════════════════════════════════════════════
//  1. Who may answer a brief
// ═══════════════════════════════════════════════════════════
console.log('\n── Who may enter ──')

check('a professional may enter', roleMayEnter('PROFESSIONAL'))
check('a consultant may enter', roleMayEnter('CONSULTANT'))
check('a corporate may enter', roleMayEnter('CORPORATE'))
check('a BMF may enter', roleMayEnter('BMF'))
check('★ a client may NOT enter — they are the one with the house to design',
  !roleMayEnter('CLIENT'))
check('a signed-out visitor may not enter', !roleMayEnter(null))
check('an admin may not enter', !roleMayEnter('SUPER_ADMIN'))

// ═══════════════════════════════════════════════════════════
//  2. The gate
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ The submission gate ──')

check('an open competition accepts a professional',
  entryGate(OPEN, 'designer-1', 'PROFESSIONAL', now).open)

const cases = [
  ['★ nothing may be submitted after the deadline',
    { ...OPEN, submissionDeadline: past }, 'designer-1', 'PROFESSIONAL'],
  ['★ nothing may be submitted once the result is out',
    { ...OPEN, winnerAnnouncedAt: past }, 'designer-1', 'PROFESSIONAL'],
  ['an unpublished competition is closed',
    { ...OPEN, status: 'PENDING_REVIEW' }, 'designer-1', 'PROFESSIONAL'],
  ['★ the announcer cannot enter their own competition',
    OPEN, 'owner-1', 'PROFESSIONAL'],
  ['a client is turned away', OPEN, 'client-1', 'CLIENT'],
  ['a signed-out visitor is turned away', OPEN, null, null],
]
for (const [name, comp, uid, role] of cases) {
  const g = entryGate(comp, uid, role, now)
  check(name, g.open === false, `(gate said open)`)
  if (!g.open) {
    check(`  … and says why: "${g.reason}"`, typeof g.reason === 'string' && g.reason.length > 10)
  }
}

check('a competition with no deadline stays open',
  entryGate({ ...OPEN, submissionDeadline: null }, 'designer-1', 'PROFESSIONAL', now).open)

console.log('\n── Days to deadline ──')
check('ten days out reads as 10', daysToDeadline(future, now) === 10,
  `(got ${daysToDeadline(future, now)})`)
check('a passed deadline is negative', daysToDeadline(past, now) < 0)
check('no deadline reads as null', daysToDeadline(null, now) === null)

// ═══════════════════════════════════════════════════════════
//  Fixtures
// ═══════════════════════════════════════════════════════════

const stamp = Date.now()
const mk = (s) => `test-entry-${stamp}-${s}`

async function user(suffix, role) {
  return prisma.user.create({
    data: {
      email: `${mk(suffix)}@example.test`,
      name: `Test ${suffix}`,
      role,
      status: 'ACTIVE',
      passwordHash: 'x',
    },
  })
}

const owner = await user('owner', 'CLIENT')
const d1 = await user('d1', 'PROFESSIONAL')
const d2 = await user('d2', 'PROFESSIONAL')
const d3 = await user('d3', 'CONSULTANT')

const comp = await prisma.post.create({
  data: {
    type: 'DESIGN_COMPETITION',
    status: 'PUBLISHED',
    authorId: owner.id,
    title: `Test competition ${stamp}`,
    slug: mk('comp'),
    description: 'A 3BHK interior, for the tests.',
    category: 'residential',
    prizeMoney: 50000,
    submissionDeadline: new Date(Date.now() + 30 * DAY),
    publishedAt: new Date(),
  },
})

async function enter(designer, title) {
  return prisma.competitionEntry.create({
    data: {
      competitionId: comp.id,
      designerId: designer.id,
      title,
      concept: 'A courtyard plan that pulls light into the middle of the flat.',
    },
  })
}

// ═══════════════════════════════════════════════════════════
//  3. ★ One entry per designer
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ One entry per designer ──')

const e1 = await enter(d1, 'Courtyard Light')
check('a designer can enter', Boolean(e1.id))
check('it starts as SUBMITTED', e1.status === 'SUBMITTED')
check('it carries no score yet', e1.score === null)

let duplicated = false
try {
  await enter(d1, 'Courtyard Light again')
  duplicated = true
} catch {
  /* the unique key did its job */
}
check('★★ the same designer cannot enter twice', !duplicated,
  '(a second entry was accepted)')

const e2 = await enter(d2, 'Open Plan')
const e3 = await enter(d3, 'Split Level')
check('other designers can still enter', Boolean(e2.id) && Boolean(e3.id))

check('three entries are counted',
  (await prisma.competitionEntry.count({ where: { competitionId: comp.id } })) === 3)

// ═══════════════════════════════════════════════════════════
//  4. Judging
// ═══════════════════════════════════════════════════════════
console.log('\n── Judging ──')

await prisma.competitionEntry.update({
  where: { id: e2.id },
  data: { status: 'SHORTLISTED', score: 88, reviewedById: owner.id, reviewedAt: new Date() },
})
const judged = await prisma.competitionEntry.findUnique({ where: { id: e2.id } })
check('an entry can be shortlisted with a score', judged.status === 'SHORTLISTED' && judged.score === 88)
check('the reviewer is recorded', judged.reviewedById === owner.id)

// ═══════════════════════════════════════════════════════════
//  5. ★★ Exactly one winner, enforced by the database
// ═══════════════════════════════════════════════════════════
console.log('\n── ★★ One winner per competition ──')

await prisma.competitionEntry.update({ where: { id: e2.id }, data: { status: 'WINNER' } })
check('a winner can be set', true)

let twoWinners = false
try {
  await prisma.competitionEntry.update({ where: { id: e3.id }, data: { status: 'WINNER' } })
  twoWinners = true
} catch {
  /* the partial unique index did its job */
}
check('★★ a SECOND winner is refused by the database', !twoWinners,
  '(two entries are marked WINNER — two people would both be told they won)')

check('★ the index does not restrict the other statuses',
  (await prisma.competitionEntry.count({
    where: { competitionId: comp.id, status: 'SUBMITTED' },
  })) === 2,
  '(a partial index written wrong would cap SUBMITTED at one too)')

// ═══════════════════════════════════════════════════════════
//  6. ★ Declaring a winner leaves nobody waiting
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Declaring resolves every entry ──')

await prisma.$transaction([
  prisma.competitionEntry.updateMany({
    where: { competitionId: comp.id, id: { not: e2.id }, status: { in: ['SUBMITTED', 'SHORTLISTED'] } },
    data: { status: 'REJECTED', reviewedById: owner.id, reviewedAt: new Date() },
  }),
  prisma.post.update({ where: { id: comp.id }, data: { winnerAnnouncedAt: new Date() } }),
])

const after = await prisma.competitionEntry.findMany({
  where: { competitionId: comp.id },
  select: { id: true, status: true },
})
check('★ no entry is left undecided',
  after.every((e) => e.status !== 'SUBMITTED' && e.status !== 'SHORTLISTED'),
  `(${after.filter((e) => e.status === 'SUBMITTED').length} still submitted)`)
check('exactly one winner remains', after.filter((e) => e.status === 'WINNER').length === 1)
check('the others are marked not selected', after.filter((e) => e.status === 'REJECTED').length === 2)

const closed = await prisma.post.findUnique({
  where: { id: comp.id },
  select: { winnerAnnouncedAt: true },
})
check('the competition is marked closed', closed.winnerAnnouncedAt !== null)

console.log('\n── The gate after the result ──')
check('★ submissions stop once the result is out',
  entryGate(
    { status: 'PUBLISHED', submissionDeadline: future, winnerAnnouncedAt: new Date(), authorId: owner.id },
    d1.id, 'PROFESSIONAL', now
  ).open === false)

// ═══════════════════════════════════════════════════════════
//  7. Labels
// ═══════════════════════════════════════════════════════════
console.log('\n── Labels ──')

for (const s of ['SUBMITTED', 'SHORTLISTED', 'REJECTED', 'WINNER']) {
  check(`${s} has a label and a tone`,
    Boolean(ENTRY_STATUS_LABEL[s]) && Boolean(ENTRY_STATUS_TONE[s]))
}
check('★ REJECTED reads as "Not selected", not "Rejected"',
  ENTRY_STATUS_LABEL.REJECTED === 'Not selected',
  '(a designer reads this about their own work)')

// ═══════════════════════════════════════════════════════════
//  Cascade + cleanup
// ═══════════════════════════════════════════════════════════
console.log('\n── Cleanup cascades ──')

await prisma.post.delete({ where: { id: comp.id } })
check('★ deleting a competition takes its entries with it',
  (await prisma.competitionEntry.count({ where: { competitionId: comp.id } })) === 0)

await prisma.user.deleteMany({
  where: { id: { in: [owner.id, d1.id, d2.id, d3.id] } },
})

console.log('\n────────────────────────────────────────────────────')
console.log(`  ${pass} passed · ${fail} failed`)
console.log('────────────────────────────────────────────────────\n')

await prisma.$disconnect()
process.exit(fail ? 1 : 0)
