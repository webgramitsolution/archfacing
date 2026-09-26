import { prisma } from '@/lib/prisma'
import { savedIdsAmong } from '@/lib/visitor'

/**
 * The extra, counted figures the phone home page prints — nothing typed in.
 *
 *  · industry cards: published PROJECT posts per category slug;
 *  · designer cards: the average star rating and review count across the
 *    Review rows on each professional's own posts;
 *  · the Featured Projects hearts: which of them this reader has saved.
 */
export async function mobileHomeExtras({
  industrySlugs,
  designerIds,
  projectIds,
  userId,
}: {
  industrySlugs: string[]
  designerIds: string[]
  projectIds: string[]
  userId?: string | null
}) {
  const [byCategory, reviews, saved] = await Promise.all([
    prisma.post.groupBy({
      by: ['category'],
      where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null, category: { in: industrySlugs } },
      _count: { _all: true },
    }),
    designerIds.length
      ? prisma.review.findMany({
          where: { post: { authorId: { in: designerIds }, deletedAt: null } },
          select: { rating: true, post: { select: { authorId: true } } },
        })
      : Promise.resolve([] as { rating: number; post: { authorId: string } }[]),
    userId ? savedIdsAmong(userId, projectIds) : Promise.resolve(new Set<string>()),
  ])

  const industryCount: Record<string, number> = {}
  for (const r of byCategory) industryCount[r.category] = r._count._all

  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of reviews) {
    const a = acc.get(r.post.authorId) ?? { sum: 0, n: 0 }
    a.sum += r.rating
    a.n += 1
    acc.set(r.post.authorId, a)
  }
  const rating: Record<string, { avg: number; count: number }> = {}
  for (const [id, a] of acc) rating[id] = { avg: Math.round((a.sum / a.n) * 10) / 10, count: a.n }

  return { industryCount, rating, saved }
}

/** 2500 → "2.5K", 850 → "850". */
export function shortCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
