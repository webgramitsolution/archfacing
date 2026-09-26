import { prisma } from '@/lib/prisma'

/**
 * Analytics & Insights for one member (Professional / Consultant / BMF /
 * Corporate). Every figure is counted from real rows scoped to `userId`:
 * posting views (Post.viewCount), leads (Enquiry owner + LeadRecipient rows)
 * and reviews. Nothing is estimated.
 */

const MONTHS = 6

export type MemberAnalytics = {
  kpis: { views: number; live: number; leads: number; leadsThisMonth: number; responseRate: number | null; rating: number | null; reviews: number }
  leadTrend: { labels: string[]; points: number[] }
  viewsByType: { type: string; views: number; posts: number }[]
  topPosts: { id: string; title: string; type: string; slug: string; views: number; status: string }[]
  leadSources: { source: string; count: number }[]
  leadAreas: { pincode: string; city: string | null; count: number }[]
}

export async function memberAnalytics(userId: string): Promise<MemberAnalytics> {
  const leadWhere = {
    OR: [{ holderId: userId }, { directRecipientId: userId }, { recipients: { some: { recipientId: userId } } }],
  }
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const since = new Date(monthStart); since.setMonth(since.getMonth() - (MONTHS - 1))

  const [byType, live, topPosts, leads, answeredOwner, answeredRec, recTotal, reviewAgg] = await Promise.all([
    prisma.post.groupBy({ by: ['type'], where: { authorId: userId, deletedAt: null }, _sum: { viewCount: true }, _count: { _all: true } }),
    prisma.post.count({ where: { authorId: userId, deletedAt: null, status: 'PUBLISHED' } }),
    prisma.post.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { viewCount: 'desc' }, take: 5,
      select: { id: true, title: true, type: true, slug: true, viewCount: true, status: true },
    }),
    prisma.enquiry.findMany({ where: leadWhere, select: { createdAt: true, sourceType: true, pincode: true, city: true } }),
    prisma.enquiry.count({ where: { holderId: userId, status: { in: ['RESPONDED', 'CONVERTED', 'CLOSED'] }, recipients: { none: { recipientId: userId } } } }),
    prisma.leadRecipient.count({ where: { recipientId: userId, deliveryStatus: { in: ['RESPONDED', 'CONVERTED', 'CLOSED'] } } }),
    prisma.leadRecipient.count({ where: { recipientId: userId } }),
    prisma.review.aggregate({ where: { post: { authorId: userId } }, _avg: { rating: true }, _count: { _all: true } }).catch(() => null),
  ])

  // Leads answered = own-row RESPONDED+ for routed leads, plus legacy owner-only enquiries.
  const ownerOnly = await prisma.enquiry.count({ where: { holderId: userId, recipients: { none: { recipientId: userId } } } })
  const denominator = recTotal + ownerOnly
  const responseRate = denominator ? Math.round(((answeredRec + answeredOwner) / denominator) * 100) : null

  const labels: string[] = []
  const keys: string[] = []
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(since); d.setMonth(since.getMonth() + i)
    labels.push(d.toLocaleDateString('en-IN', { month: 'short' }))
    keys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }
  const perMonth = new Map<string, number>()
  const sources = new Map<string, number>()
  const areas = new Map<string, { city: string | null; count: number }>()
  for (const l of leads) {
    if (l.createdAt >= since) {
      const k = `${l.createdAt.getFullYear()}-${l.createdAt.getMonth()}`
      perMonth.set(k, (perMonth.get(k) ?? 0) + 1)
    }
    sources.set(l.sourceType, (sources.get(l.sourceType) ?? 0) + 1)
    const a = areas.get(l.pincode) ?? { city: l.city, count: 0 }
    a.count++; areas.set(l.pincode, a)
  }

  return {
    kpis: {
      views: byType.reduce((n, t) => n + (t._sum.viewCount ?? 0), 0),
      live,
      leads: leads.length,
      leadsThisMonth: leads.filter((l) => l.createdAt >= monthStart).length,
      responseRate,
      rating: reviewAgg?._avg.rating != null ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
      reviews: reviewAgg?._count._all ?? 0,
    },
    leadTrend: { labels, points: keys.map((k) => perMonth.get(k) ?? 0) },
    viewsByType: byType.map((t) => ({ type: t.type, views: t._sum.viewCount ?? 0, posts: t._count._all })).sort((a, b) => b.views - a.views),
    topPosts: topPosts.map((p) => ({ id: p.id, title: p.title, type: p.type, slug: p.slug, views: p.viewCount, status: p.status })),
    leadSources: [...sources].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    leadAreas: [...areas].map(([pincode, v]) => ({ pincode, ...v })).sort((a, b) => b.count - a.count).slice(0, 8),
  }
}
