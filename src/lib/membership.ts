import { prisma } from '@/lib/prisma'

/**
 * The data a Membership Certificate needs — resolved from a seller's account
 * plus their active ArchFacing Club membership.
 *
 * Every field falls back to a neutral placeholder so the certificate never
 * crashes on missing data.
 */
export type CertificateData = {
  companyName: string
  city: string
  state: string
  directorName: string
  gstNumber: string
  businessAddress: string
  phone: string
  email: string
  membershipLevel: string
  /** The member's active PACT PIN codes — empty when they hold none. */
  pactPins: string[]
  /** ISO strings — formatted at render time. */
  issueDate: string
  expiryDate: string
}

/**
 * The seller's currently-active membership certificate, or `null` when they
 * have no active paid subscription (Free / Starter sellers show no certificate).
 *
 * "Active" = a `Subscription` whose `expiresAt` is in the future. The newest
 * such row wins if there is more than one. This is the seller SUBSCRIPTION
 * (Bronze / Silver / Gold) — separate from the ArchFacing Club.
 */
export async function getSellerCertificate(userId: string): Promise<CertificateData | null> {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, mobile: true, addressLine: true, city: true, state: true,
        corporateProfile: { select: { companyName: true, gstNumber: true } },
        bmfProfile: { select: { businessName: true, gstNumber: true } },
        professionalProfile: { select: { firmName: true } },
        pacts: {
          where: { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { pincode: true },
          orderBy: { purchasedAt: 'asc' },
          take: 6,
        },
      },
    }),
    prisma.subscription.findFirst({
      // A certificate is for a PAID plan — Free members have nothing to certify.
      where: { userId, status: 'ACTIVE', expiresAt: { gte: new Date() }, price: { gt: 0 } },
      // The highest plan wins, so the certificate matches the tick colour.
      orderBy: [{ price: 'desc' }, { expiresAt: 'desc' }],
      select: { planName: true, startsAt: true, expiresAt: true },
    }),
  ])

  if (!user || !membership) return null

  const companyName =
    user.corporateProfile?.companyName ??
    user.bmfProfile?.businessName ??
    user.professionalProfile?.firmName ??
    user.name

  const gstNumber = user.corporateProfile?.gstNumber ?? user.bmfProfile?.gstNumber ?? 'Not available'

  return {
    companyName,
    city: user.city ?? 'India',
    state: user.state ?? '',
    directorName: user.name,
    gstNumber,
    businessAddress: user.addressLine ?? ([user.city, user.state].filter(Boolean).join(', ') || 'India'),
    phone: user.mobile ?? 'Contact via ArchFacing',
    email: user.email,
    membershipLevel: membership.planName,
    pactPins: user.pacts.map((p) => p.pincode),
    issueDate: membership.startsAt.toISOString(),
    expiryDate: membership.expiresAt.toISOString(),
  }
}

/** Just the active plan name for a lightweight badge, or `null`. */
export async function activePlanName(userId: string): Promise<string | null> {
  const m = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gte: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { planName: true },
  })
  return m?.planName ?? null
}

/**
 * The subscription plans a seller can buy.
 *
 * Corporate accounts get their own higher-priced Silver + Gold tiers
 * (`audience = 'CORPORATE'`); every other role sees the standard
 * Free / Bronze / Silver / Gold (`audience = 'ALL'`). Pass no role — e.g. the
 * public compare table — to get the standard set.
 */
export async function subscriptionPlans(role?: string) {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true, audience: role === 'CORPORATE' ? 'CORPORATE' : 'ALL' },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  })
}
