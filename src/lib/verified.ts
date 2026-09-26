import { prisma } from '@/lib/prisma'

/**
 * Who gets the verified tick, and in which colour (client rules, Sept 2026):
 *
 *  · BLUE  — the member holds an ACTIVE PACT that has not run out.
 *  · GOLD  — the member is on the highest paid membership plan (today: Gold)
 *            with an active subscription. Gold outranks blue.
 *
 * Nothing else — a profile flag, a seeded `meta.verified`, a checked
 * qualification — earns the badge.
 */
export type BadgeTone = 'gold' | 'blue'

export async function badgeTones(userIds: (string | null | undefined)[]): Promise<Map<string, BadgeTone>> {
  const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))]
  const out = new Map<string, BadgeTone>()
  if (ids.length === 0) return out
  const now = new Date()

  const [pacts, topPlan] = await Promise.all([
    prisma.pact.findMany({
      where: { holderId: { in: ids }, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { holderId: true },
      distinct: ['holderId'],
    }),
    // "The higher plan" = the most expensive active paid plan.
    prisma.subscriptionPlan.findFirst({
      where: { isActive: true, price: { gt: 0 } },
      orderBy: { price: 'desc' },
      select: { id: true },
    }),
  ])
  for (const p of pacts) if (p.holderId) out.set(p.holderId, 'blue')

  if (topPlan) {
    const gold = await prisma.subscription.findMany({
      where: { userId: { in: ids }, planId: topPlan.id, status: 'ACTIVE', expiresAt: { gt: now } },
      select: { userId: true },
      distinct: ['userId'],
    })
    for (const g of gold) out.set(g.userId, 'gold')
  }
  return out
}

/** Everyone who shows a tick of either colour. */
export async function pactVerifiedIds(userIds: (string | null | undefined)[]): Promise<Set<string>> {
  return new Set((await badgeTones(userIds)).keys())
}

/** One member's tick — `null` when they have none. */
export async function badgeTone(userId: string | null | undefined): Promise<BadgeTone | null> {
  if (!userId) return null
  return (await badgeTones([userId])).get(userId) ?? null
}

/** One member. */
export async function isPactVerified(userId: string | null | undefined): Promise<boolean> {
  return (await badgeTone(userId)) !== null
}

/** Adds `author.pactVerified` + `author.badgeTone` to post rows, one pass for the whole list. */
export async function withPactVerified<T extends { author: { id: string } }>(
  rows: T[]
): Promise<(T & { author: T['author'] & { pactVerified: boolean; badgeTone: BadgeTone | null } })[]> {
  const tones = await badgeTones(rows.map((r) => r.author.id))
  return rows.map((r) => {
    const tone = tones.get(r.author.id) ?? null
    return { ...r, author: { ...r.author, pactVerified: tone !== null, badgeTone: tone } }
  })
}
