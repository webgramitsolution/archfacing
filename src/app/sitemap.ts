import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { ALL_POST_TYPES } from '@/config/post-types'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

/**
 * Sitemap — tells Google which pages exist.
 *
 * Published postings are added automatically, so the sitemap keeps
 * growing with every new project.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${BASE}/pact`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/consult-nearby`, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE}/designers-associates`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE}/merchandise`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE}/podcast`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE}/membership`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/club`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/club/join`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE}/club/events`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE}/advertisements`, changeFrequency: 'monthly' as const, priority: 0.5 },
    ...ALL_POST_TYPES.map((c) => ({
      url: `${BASE}${c.publicPath}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...[
      'about', 'privacy', 'cookies', 'terms', 'refund', 'need-help', 'contact',
    ].map((slug) => ({
      url: `${BASE}/legal/${slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ].map((p) => ({ lastModified: now, ...p }))

  // published club events
  let clubEvents: MetadataRoute.Sitemap = []
  try {
    const rows = await prisma.clubEvent.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    })
    clubEvents = rows.map((e) => ({
      url: `${BASE}/club/events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // the database may be unreachable at build time — the static list still ships
  }

  // published postings
  let posts: MetadataRoute.Sitemap = []
  try {
    const rows = await prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, type: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    })

    posts = rows.flatMap((p) => {
      const config = ALL_POST_TYPES.find((c) => c.type === p.type)
      if (!config) return []
      return [{
        url: `${BASE}${config.publicPath}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }]
    })
  } catch {
    // If the DB is unreachable, still build the sitemap — the static part is enough
  }

  return [...staticPages, ...clubEvents, ...posts]
}
