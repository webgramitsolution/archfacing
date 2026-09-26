import { prisma } from '@/lib/prisma'

/**
 * The platform's real reach, for the advertiser screens.
 *
 * These numbers are shown to someone deciding whether to BUY advertising, so
 * they have to be true. They used to be hardcoded as "500K+ Active
 * Professionals" and "120K+ Daily Impressions" — figures nothing produced.
 * Each is now counted; a figure the platform cannot measure is returned as
 * null so the caller can print a value proposition instead of a number.
 */
export type PlatformReach = {
  /** Active member accounts that can be advertised to. */
  professionals: number
  /** Impressions actually served across every campaign, all time. */
  impressions: number
}

export async function platformReach(): Promise<PlatformReach> {
  const [professionals, agg] = await Promise.all([
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        role: { in: ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'] },
      },
    }).catch(() => 0),
    prisma.adBooking.aggregate({ _sum: { impressions: true } }).catch(() => ({ _sum: { impressions: 0 } })),
  ])

  return { professionals, impressions: agg._sum.impressions ?? 0 }
}

/** Compact Indian-format count — 1,240 · 12.4K · 1.2L. */
export function compactCount(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
