/**
 * Design Associate — §3.1.7.
 *
 *   pnpm test:da
 *
 * ★ Most important: the 80/20 arithmetic must always add up exactly — not
 *   even a single paisa may go astray.
 */

import './_test-env.mjs'
import { PrismaClient } from '@prisma/client'
import {
  daIdentity, splitRevenue, applyForDa, approveDa,
  createDaInvoice, markInvoicePaid, markOverdueInvoices, daSummary, DaError,
} from '../src/lib/design-associate.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.daInvoice.deleteMany({ where: { da: { user: { email: { contains: '@datest.dev' } } } } })
  await prisma.designAssociate.deleteMany({ where: { user: { email: { contains: '@datest.dev' } } } })
  await prisma.pact.deleteMany({ where: { holder: { email: { contains: '@datest.dev' } } } })
  // approveDa() grants the free Club Membership (§3.1.7.10.1), so those rows
  // exist by the time we clean up and must go before the users they point at.
  await prisma.clubMembership.deleteMany({ where: { user: { email: { contains: '@datest.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@datest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@datest.dev' } } })
}
await cleanup()

// ═══ 1. §8.2 — email and code ═══
console.log('\n── §8.2 — the DA email ──')

const y = daIdentity('Yudhveer Singh', '110005')
check('the example from the PDF is produced correctly', y.email === 'yudhveer110005@gmail.com', `(${y.email})`)
check('the reference code is produced', y.code === 'YUDHVEER110005', `(${y.code})`)

const withTitle = daIdentity('Ar. Kavita Rao', '560001')
check('prefixes such as "Ar." are dropped', withTitle.email === 'kavita560001@gmail.com', `(${withTitle.email})`)

const messy = daIdentity('  Dr.  Ramesh   Kumar ', '400001')
check('extra whitespace and prefixes are handled', messy.email === 'ramesh400001@gmail.com', `(${messy.email})`)

// ═══ 2. ★ 80/20 ═══
console.log('\n── ★ §3.1.7.7 — the 80/20 arithmetic ──')

const cases = [100000, 250000, 33333, 1, 99999.99, 7777.77]
let allExact = true
for (const gross of cases) {
  const { daShare, afShare } = splitRevenue(gross)
  const sum = Math.round((daShare + afShare) * 100) / 100
  const exact = sum === Math.round(gross * 100) / 100
  if (!exact) allExact = false
}
check('★ for every amount 80% + 20% = the whole (not a paisa left over)', allExact)

const lakh = splitRevenue(100000)
check('₹1,00,000 → DA ₹80,000', lakh.daShare === 80000, `(${lakh.daShare})`)
check('₹1,00,000 → ArchFacing ₹20,000', lakh.afShare === 20000, `(${lakh.afShare})`)

const odd = splitRevenue(33333)
check('₹33,333 → DA ₹26,666.40', odd.daShare === 26666.4, `(${odd.daShare})`)
check('the sum is correct even for odd amounts', odd.daShare + odd.afShare === 33333)

// ═══ 3. Eligibility ═══
console.log('\n── §3.1.7 — who can become a DA ──')

async function mkUser(email, role, status = 'ACTIVE', extra = {}) {
  return prisma.user.create({
    data: { email, name: email.split('@')[0], role, status,
      emailVerified: new Date(), pincode: '110005', state: 'Delhi', ...extra },
  })
}

const client = await mkUser('client@datest.dev', 'CLIENT')
let blocked = false
try { await applyForDa(client.id) }
catch (e) { blocked = e instanceof DaError && e.code === 'NOT_PROFESSIONAL' }
check('a Client cannot become a DA', blocked)

const consultant = await mkUser('consultant@datest.dev', 'CONSULTANT')
blocked = false
try { await applyForDa(consultant.id) }
catch (e) { blocked = e.code === 'NOT_PROFESSIONAL' }
check('★ nor can a Consultant (Designa/Designi only)', blocked)

const unverified = await mkUser('unverified@datest.dev', 'PROFESSIONAL', 'PENDING_VERIFICATION', {
  professionalProfile: { create: { designaType: 'DESIGNA', tier: 'PROFESSIONAL', isVerified: false } },
})
blocked = false
try { await applyForDa(unverified.id) }
catch (e) { blocked = e.code === 'NOT_VERIFIED' }
check('not without verification', blocked)

const noPact = await mkUser('nopact@datest.dev', 'PROFESSIONAL', 'ACTIVE', {
  professionalProfile: { create: { designaType: 'DESIGNA', tier: 'PROFESSIONAL', isVerified: true } },
})
blocked = false
try { await applyForDa(noPact.id) }
catch (e) { blocked = e.code === 'NO_PACT' }
check('★ not without a PACT (§3.1.7.2)', blocked)

// ═══ 4. Becoming a DA ═══
console.log('\n── Becoming a DA ──')

const pro = await mkUser('yudhveer@datest.dev', 'PROFESSIONAL', 'ACTIVE', {
  name: 'Yudhveer Singh',
  professionalProfile: { create: { designaType: 'DESIGNA', tier: 'PROFESSIONAL', isVerified: true, coaNumber: 'CA/2010/1' } },
})
const place = await prisma.pincode.findUnique({ where: { code: '110005' } })
const exp = new Date(); exp.setFullYear(exp.getFullYear() + 10)
await prisma.pact.create({
  data: { pincode: '110005', state: place.state, city: place.district,
    serviceType: 'DESIGNA', subCategory: '-', holderId: pro.id, status: 'ACTIVE',
    purchasedAt: new Date(), expiresAt: exp },
})

const da = await applyForDa(pro.id)
check('became a DA', !!da.id)
check('the email was built from the PACT', da.daEmail === 'yudhveer110005@gmail.com', `(${da.daEmail})`)
check('the revenue share is 80%', Number(da.revenueShare) === 80)
check('KYC is still outstanding', da.kycVerified === false)

const years = da.clubValidTill.getFullYear() - new Date().getFullYear()
check('★ 10 years free club membership (§3.1.7.10.1)', years === 10, `(${years})`)

blocked = false
try { await applyForDa(pro.id) }
catch (e) { blocked = e.code === 'ALREADY_DA' }
check('you cannot become a DA twice', blocked)

// ═══ 5. No invoice before KYC ═══
console.log('\n── §3.1.7.9 — KYC ──')

blocked = false
try { await createDaInvoice({ daId: da.id, clientName: 'Test', grossAmount: 50000 }) }
catch (e) { blocked = e.code === 'NOT_VERIFIED' }
check('★ no invoice is created without KYC', blocked)

const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
await approveDa(da.id, admin.id)

const approved = await prisma.designAssociate.findUnique({ where: { id: da.id } })
check('the KYC was approved', approved.kycVerified === true)

const notif = await prisma.notification.findFirst({
  where: { userId: pro.id, type: 'DA_APPROVED' },
})
check('a notification went to the DA', !!notif)

// ★ §3.1.7.10.1 — approval carries the free Club Membership with it.
//   If this ever stops firing, a DA silently loses a benefit they were
//   promised, and nothing else in the system would notice.
const freeClub = await prisma.clubMembership.findFirst({
  where: { userId: pro.id, isFree: true },
})
check('★ approval granted the free Club Membership', !!freeClub)
check('★ it costs the DA nothing', freeClub && Number(freeClub.price) === 0)
check(
  '★ it runs for 10 years',
  freeClub &&
    Math.abs(
      (freeClub.expiresAt - freeClub.startsAt) / (365 * 86_400_000) - 10
    ) < 0.1
)

// Approving twice must not hand out a second term.
await approveDa(da.id, admin.id).catch(() => {})
check(
  '★ a second approval does not stack another membership',
  (await prisma.clubMembership.count({ where: { userId: pro.id, isFree: true } })) === 1
)

// ═══ 6. Invoice ═══
console.log('\n── §3.1.7.6 — Invoice ──')

const inv = await createDaInvoice({
  daId: da.id, clientName: 'Sharma Residence',
  projectRef: 'PRJ-2026-014', grossAmount: 250000,
})
check('the invoice was created', !!inv.id)
check('the invoice number is well-formed', /^AF\/DA\/\d{4}\/\d{5}$/.test(inv.invoiceNumber), `(${inv.invoiceNumber})`)
check('the DA share is ₹2,00,000', Number(inv.daShare) === 200000, `(${inv.daShare})`)
check('the ArchFacing share is ₹50,000', Number(inv.afShare) === 50000, `(${inv.afShare})`)

check('★ issued on the 1st of the month', inv.issuedOn.getDate() === 1, `(${inv.issuedOn.getDate()})`)
const dueMonth = inv.dueOn.getMonth()
const issueMonth = inv.issuedOn.getMonth()
check('★ payable by the end of the month', dueMonth === issueMonth && inv.dueOn > inv.issuedOn)

const paid = await markInvoicePaid(inv.id)
check('the invoice became PAID', paid.invoice.status === 'PAID')
check('paidOn was filled in', !!paid.invoice.paidOn)

const again = await markInvoicePaid(inv.id)
check('marking it again breaks nothing', again.alreadyDone === true)

// ═══ 7. Overdue ═══
console.log('\n── When it runs late ──')

const old = new Date(); old.setMonth(old.getMonth() - 2)
const lateInv = await createDaInvoice({
  daId: da.id, clientName: 'Old Project', grossAmount: 60000, issuedOn: old,
})
check('the old invoice was created', lateInv.status === 'ISSUED')

const marked = await markOverdueInvoices()
check('★ elapsed invoices became OVERDUE', marked >= 1, `(${marked})`)

const after = await prisma.daInvoice.findUnique({ where: { id: lateInv.id } })
check('the status is OVERDUE', after.status === 'OVERDUE')

// ═══ 8. Summary ═══
console.log('\n── The DA account ──')

const s = await daSummary(pro.id)
check('the summary came back', !!s)
check('total gross ₹3,10,000', s.totals.gross === 310000, `(${s.totals.gross})`)
check('DA earnings ₹2,48,000', s.totals.earned === 248000, `(${s.totals.earned})`)
check('settled ₹2,00,000', s.totals.settled === 200000, `(${s.totals.settled})`)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
