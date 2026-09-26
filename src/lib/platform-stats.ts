import { prisma } from '@/lib/prisma'

/**
 * The platform's real, countable figures — for every public stat band.
 *
 * The home, projects, products, PACT and club pages each carried their own
 * hardcoded numbers ("52,000+ Verified Professionals", "25,000+ Projects",
 * "10K+"…). They were invented, and worse, they disagreed with each other:
 * the same 25,000+ was labelled Products on one page and Projects on another.
 *
 * One query set, one meaning per number, used everywhere.
 */
export type PlatformStats = {
  projects: number
  products: number
  /** Active member accounts that trade on the platform. */
  members: number
  /** PIN codes the platform actually indexes — this one is genuinely large. */
  pincodes: number
  /** Distinct cities that have published work. */
  cities: number
  activePacts: number
}

export async function platformStats(): Promise<PlatformStats> {
  const [projects, products, members, pincodes, cityRows, activePacts] = await Promise.all([
    prisma.post.count({ where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null } }).catch(() => 0),
    prisma.post.count({ where: { type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null } }).catch(() => 0),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        role: { in: ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'] },
      },
    }).catch(() => 0),
    prisma.pincode.count().catch(() => 0),
    prisma.post
      .findMany({ where: { status: 'PUBLISHED', deletedAt: null }, select: { city: true }, distinct: ['city'] })
      .catch(() => [] as { city: string | null }[]),
    prisma.pact.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
  ])

  return {
    projects,
    products,
    members,
    pincodes,
    cities: cityRows.filter((c) => c.city).length,
    activePacts,
  }
}

/**
 * How a count is printed in a stat band.
 *
 * Small numbers are shown exactly — rounding 21 up to "10K+" is the habit this
 * replaces. Only genuinely large counts get the compact form, and the "+" is
 * only added where it is true (i.e. the figure was rounded down).
 */
export function statValue(n: number): string {
  if (n >= 100000) return `${Math.floor(n / 100000)}L+`
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`
  return n.toLocaleString('en-IN')
}
