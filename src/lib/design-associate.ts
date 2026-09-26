/**
 * Design Associate — §3.1.7.
 *
 * Design Associates are professionals who hold a PACT and work with ArchFacing.
 * ArchFacing reviews the design and raises the invoice; the Design Associate
 * collects payment from the client.
 *
 * ★ §3.1.7.7 — 80% goes back to the Design Associate, ArchFacing keeps 20%.
 * ★ §3.1.7.6 f — invoices are raised on the 1st of each month, with payment due
 *   by the end of that month.
 * ★ §3.1.7.9 — KYC is mandatory.
 * ★ §8.2 — the Design Associate's email is "firstname + PACT@gmail.com".
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { BUSINESS_RULES } from '@/config/permissions'
import { grantFreeDaMembership } from './club'
import { slugify } from './utils'

export class DaError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_PROFESSIONAL'
      | 'NO_PACT'
      | 'ALREADY_DA'
      | 'NOT_VERIFIED'
      | 'NOT_FOUND'
      | 'BAD_AMOUNT'
  ) {
    super(message)
  }
}

/**
 * §8.2 — the Design Associate's email address and reference code.
 *
 * "PACT 110005 + Yudhveer" → yudhveer110005@gmail.com
 * That same "Name + PACT" combination is also their reference code.
 */
export function daIdentity(fullName: string, pincode: string) {
  const first =
    fullName
      .trim()
      .split(/\s+/)
      // Skip prefixes such as "Ar." or "Er." — they are not part of the name
      .filter((w) => !/^(ar|er|dr|mr|ms|mrs|shri|smt)\.?$/i.test(w))[0] ?? 'da'

  const slug = first.toLowerCase().replace(/[^a-z]/g, '') || 'da'

  return {
    email: `${slug}${pincode}@gmail.com`,
    code: `${slug}${pincode}`.toUpperCase(),
  }
}

// ═══════════════════════════════════════════════════════════
//  Becoming a Design Associate
// ═══════════════════════════════════════════════════════════

export async function applyForDa(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      professionalProfile: true,
      designAssociate: true,
      pacts: { where: { status: 'ACTIVE' } },
    },
  })

  if (!user) throw new DaError('User not found.', 'NOT_FOUND')

  // §3.1.7 — "These professionals will belongs to DESIGNA AND DESIGNI only"
  if (user.role !== 'PROFESSIONAL' || !user.professionalProfile) {
    throw new DaError(
      'Only Designa and Designi professionals can become a Design Associate.',
      'NOT_PROFESSIONAL'
    )
  }

  if (user.designAssociate) {
    throw new DaError('You are already registered as a Design Associate.', 'ALREADY_DA')
  }

  if (user.status !== 'ACTIVE' || !user.professionalProfile.isVerified) {
    throw new DaError(
      'Your account must be verified before you can apply. Please complete verification and try again.',
      'NOT_VERIFIED'
    )
  }

  // §3.1.7.2 — "Designs Associates concept is based on PACT Franchise basis"
  if (user.pacts.length === 0) {
    throw new DaError(
      'You need at least one ACTIVE PACT to become a Design Associate.',
      'NO_PACT'
    )
  }

  const pincode = user.pacts[0].pincode
  const { email, code } = daIdentity(user.name, pincode)

  // §3.1.7.10.1 — 10 years of free Club Membership
  const clubTill = new Date()
  clubTill.setFullYear(clubTill.getFullYear() + BUSINESS_RULES.DA_FREE_CLUB_YEARS)

  return prisma.designAssociate.create({
    data: {
      userId,
      daEmail: email,
      daCode: code,
      revenueShare: new Prisma.Decimal(BUSINESS_RULES.DA_REVENUE_SHARE_PERCENT),
      clubValidTill: clubTill,
    },
  })
}

/** §3.1.7.9 — an admin reviews KYC and activates the Design Associate */
export async function approveDa(daId: string, adminId: string) {
  const da = await prisma.designAssociate.findUnique({
    where: { id: daId },
    include: { user: { select: { id: true, name: true, professionalProfile: { select: { firmName: true } } } } },
  })
  if (!da) throw new DaError('Design Associate not found.', 'NOT_FOUND')

  // The public /designers-associates/<slug> address is fixed here, once.
  let slug = da.slug
  if (!slug) {
    const base = slugify(da.user.professionalProfile?.firmName || da.user.name).slice(0, 60) || 'associate'
    slug = base
    for (let n = 2; await prisma.designAssociate.findFirst({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`
  }

  const updated = await prisma.designAssociate.update({
    where: { id: daId },
    data: { kycVerified: true, approvedAt: new Date(), approvedById: adminId, slug },
  })

  await prisma.notification.create({
    data: {
      userId: da.user.id,
      type: 'DA_APPROVED',
      title: 'You are now a Design Associate',
      body: `Your Design Associate code is ${da.daCode}. ArchFacing projects will now be assigned to you.`,
      link: '/dashboard',
    },
  })

  // §3.1.7.10.1 — approval carries free Club Membership. It is granted here
  // rather than left to a nightly job, so the benefit exists the moment the
  // admin approves. `grantFreeDaMembership` is safe to call more than once.
  await grantFreeDaMembership(da.user.id)

  return updated
}

// ═══════════════════════════════════════════════════════════
//  Invoice — §3.1.7.6, §3.1.7.7
// ═══════════════════════════════════════════════════════════

/**
 * The 80/20 split.
 *
 * ⚠️ Rounding to whole paise is essential — otherwise 80% + 20% can add up to
 *    a paisa more or less than the gross amount. So we round the Design
 *    Associate's share and give ArchFacing whatever remains: the two always
 *    add back up to the exact total.
 */
export function splitRevenue(
  gross: number,
  // BUSINESS_RULES is `as const`, so its type would narrow to the literal 80.
  // Annotating `number` explicitly here allows a DA-specific share to be used.
  sharePercent: number = BUSINESS_RULES.DA_REVENUE_SHARE_PERCENT
) {
  const daShare = Math.round(gross * sharePercent) / 100
  const afShare = Math.round((gross - daShare) * 100) / 100
  return { daShare, afShare }
}

export async function createDaInvoice(params: {
  daId: string
  clientName: string
  projectRef?: string
  grossAmount: number
  taxAmount?: number
  /** Defaults to the 1st of the current month if not supplied */
  issuedOn?: Date
}) {
  const { daId, clientName, grossAmount } = params

  if (grossAmount <= 0) {
    throw new DaError('The invoice amount must be greater than zero.', 'BAD_AMOUNT')
  }

  const da = await prisma.designAssociate.findUnique({ where: { id: daId } })
  if (!da) throw new DaError('Design Associate not found.', 'NOT_FOUND')
  if (!da.kycVerified) {
    throw new DaError('An invoice cannot be raised until KYC is complete. Please complete KYC verification first.', 'NOT_VERIFIED')
  }

  const { daShare, afShare } = splitRevenue(grossAmount, Number(da.revenueShare))

  // §3.1.7.6 f — invoice on the 1st of the month, payment due by month end
  const issuedOn = params.issuedOn ?? firstOfThisMonth()
  const dueOn = lastOfMonth(issuedOn)

  const count = await prisma.daInvoice.count()
  const invoiceNumber = `AF/DA/${issuedOn.getFullYear()}/${String(count + 1).padStart(5, '0')}`

  return prisma.daInvoice.create({
    data: {
      daId,
      invoiceNumber,
      projectRef: params.projectRef ?? null,
      clientName,
      grossAmount: new Prisma.Decimal(grossAmount),
      daShare: new Prisma.Decimal(daShare),
      afShare: new Prisma.Decimal(afShare),
      taxAmount: new Prisma.Decimal(params.taxAmount ?? 0),
      issuedOn,
      dueOn,
      status: 'ISSUED',
    },
  })
}

function firstOfThisMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function lastOfMonth(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59)
}

export async function markInvoicePaid(invoiceId: string) {
  const inv = await prisma.daInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) throw new DaError('Invoice not found.', 'NOT_FOUND')
  if (inv.status === 'PAID') return { alreadyDone: true, invoice: inv }

  const updated = await prisma.daInvoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID', paidOn: new Date() },
  })

  return { alreadyDone: false, invoice: updated }
}

/** Month end has passed and payment has not arrived — run daily by cron */
export async function markOverdueInvoices(): Promise<number> {
  const { count } = await prisma.daInvoice.updateMany({
    where: { status: 'ISSUED', dueOn: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  })
  return count
}

export async function daSummary(userId: string) {
  const da = await prisma.designAssociate.findUnique({
    where: { userId },
    include: { invoices: { orderBy: { issuedOn: 'desc' }, take: 24 } },
  })
  if (!da) return null

  const totals = da.invoices.reduce(
    (acc, i) => {
      const gross = Number(i.grossAmount)
      const mine = Number(i.daShare)
      acc.gross += gross
      acc.earned += mine
      if (i.status === 'PAID') acc.settled += mine
      if (i.status === 'OVERDUE') acc.overdue += Number(i.afShare)
      return acc
    },
    { gross: 0, earned: 0, settled: 0, overdue: 0 }
  )

  return { da, totals }
}
