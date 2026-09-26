import { prisma } from '@/lib/prisma'
import { listAssociates, associateFacets, tierLabel, type Associate } from '@/lib/design-associates'
import { listCompetitions } from '@/lib/competition'

/**
 * The extra, counted figures the Designers Associates PHONE layout prints.
 * Every associate comes from `listAssociates()` (the same eligibility rule
 * as the desktop directory); ratings are Review rows on their own posts;
 * "trending" is the views their published posts have actually received.
 */

export type DaRated = Associate & {
  cover: string | null
  rating: { avg: number; count: number } | null
  views: number
}

export type DaPhoneData = {
  all: DaRated[]
  stats: { professionals: number; cities: number; projects: number; products: number; pactAreas: number; states: number }
  professions: { label: string; count: number; href: string; cover: string | null }[]
  popular: { label: string; href: string }[]
  topArchitects: DaRated[]
  topInterior: DaRated[]
  competition: { slug: string; title: string; category: string; prize: number; cover: string | null } | null
  ofTheWeek: DaRated | null
  trending: DaRated[]
  guidanceImage: string | null
}

const score = (a: DaRated) => [a.rating?.avg ?? 0, a.rating?.count ?? 0, a.counts.projects + a.counts.products + a.counts.artistry]
function byScore(a: DaRated, b: DaRated) {
  const x = score(a)
  const y = score(b)
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]
  return a.name.localeCompare(b.name)
}

export async function daPhoneData(facets: Awaited<ReturnType<typeof associateFacets>>): Promise<DaPhoneData> {
  const { rows } = await listAssociates({ take: 500 })
  const ids = rows.map((r) => r.id)

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const [shots, reviews, views, comps, recentViews, latest] = await Promise.all([
    ids.length
      ? prisma.post.findMany({
          where: { authorId: { in: ids }, status: 'PUBLISHED', deletedAt: null, media: { some: { type: 'IMAGE' } } },
          orderBy: { publishedAt: 'desc' },
          select: { authorId: true, media: { where: { type: 'IMAGE' }, select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.review.findMany({
          where: { post: { authorId: { in: ids }, deletedAt: null } },
          select: { rating: true, post: { select: { authorId: true } } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.post.groupBy({
          by: ['authorId'],
          where: { authorId: { in: ids }, status: 'PUBLISHED', deletedAt: null },
          _sum: { viewCount: true },
        })
      : Promise.resolve([]),
    listCompetitions({ sort: 'prize' }, { take: 12 }),
    // Signed-in visits to their posts in the last 30 days (one row per viewer+post).
    ids.length
      ? prisma.recentlyViewed.findMany({
          where: { viewedAt: { gte: since }, post: { authorId: { in: ids }, status: 'PUBLISHED', deletedAt: null } },
          select: { post: { select: { authorId: true } } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.post.groupBy({
          by: ['authorId'],
          where: { authorId: { in: ids }, status: 'PUBLISHED', deletedAt: null },
          _max: { publishedAt: true },
        })
      : Promise.resolve([]),
  ])

  const covers = new Map<string, string>()
  for (const s of shots) if (!covers.has(s.authorId) && s.media[0]) covers.set(s.authorId, s.media[0].url)

  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of reviews) {
    const a = acc.get(r.post.authorId) ?? { sum: 0, n: 0 }
    a.sum += r.rating
    a.n += 1
    acc.set(r.post.authorId, a)
  }
  const viewMap = new Map(views.map((v) => [v.authorId, v._sum.viewCount ?? 0]))
  for (const r of recentViews) viewMap.set(r.post.authorId, (viewMap.get(r.post.authorId) ?? 0) + 1)
  const lastPub = new Map(latest.map((l) => [l.authorId, l._max.publishedAt?.getTime() ?? 0]))

  const all: DaRated[] = rows.map((r) => {
    const a = acc.get(r.id)
    return {
      ...r,
      cover: covers.get(r.id) ?? null,
      rating: a ? { avg: Math.round((a.sum / a.n) * 10) / 10, count: a.n } : null,
      views: viewMap.get(r.id) ?? 0,
    }
  })

  const ranked = [...all].sort(byScore)
  const firstCover = (list: DaRated[]) => list.find((a) => a.cover)?.cover ?? null

  // Open competition with the biggest prize — submissions still being taken.
  const now = new Date()
  const open = comps.find((c) => !c.submissionEnds || c.submissionEnds > now) ?? null
  let compCover: string | null = null
  if (open) {
    const m = await prisma.media.findFirst({ where: { postId: open.id, type: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, select: { url: true } })
    compCover = m?.url ?? null
  }

  const n = (t: string) => facets.designaTypes.find(([k]) => k === t)?.[1] ?? 0
  const professions: DaPhoneData['professions'] = [
    { label: 'Architects', count: n('DESIGNA'), href: '/designers-associates?type=DESIGNA', cover: firstCover(ranked.filter((a) => a.designaType === 'DESIGNA')) },
    { label: 'Interior Designers', count: n('DESIGNI'), href: '/designers-associates?type=DESIGNI', cover: firstCover(ranked.filter((a) => a.designaType === 'DESIGNI')) },
    ...facets.tiers.map(([t, c]) => ({
      label: `${tierLabel(t)}s`,
      count: c,
      href: `/designers-associates?tier=${t}`,
      cover: firstCover(ranked.filter((a) => a.tier === t)),
    })),
  ]

  const popular: DaPhoneData['popular'] = []
  for (const [state] of facets.states.slice(0, 3)) {
    for (const [t] of facets.designaTypes) {
      const who = t === 'DESIGNA' ? 'Architect' : 'Interior Designer'
      if (all.some((a) => a.location.endsWith(state) && a.designaType === t)) {
        popular.push({ label: `${who} in ${state}`, href: `/designers-associates?type=${t}&state=${encodeURIComponent(state)}` })
      }
    }
  }

  const pactAreas = new Set(all.flatMap((a) => a.pacts.map((p) => p.pincode))).size
  const cities = new Set(all.map((a) => a.location.split(',')[0]?.trim().toLowerCase()).filter(Boolean)).size

  return {
    all,
    stats: {
      professionals: all.length,
      cities,
      projects: all.reduce((s, a) => s + a.counts.projects, 0),
      products: all.reduce((s, a) => s + a.counts.products, 0),
      pactAreas,
      states: facets.states.length,
    },
    professions,
    popular: popular.slice(0, 5),
    topArchitects: ranked.filter((a) => a.designaType === 'DESIGNA').slice(0, 4),
    topInterior: ranked.filter((a) => a.designaType === 'DESIGNI').slice(0, 4),
    competition: open ? { slug: open.slug, title: open.title, category: open.category, prize: open.prize, cover: compCover } : null,
    ofTheWeek: ranked[0] ?? null,
    // Most viewed (post views + last-30-day visits); ties — and associates
    // nobody has viewed yet — fall back to who published most recently.
    trending: [...all]
      .filter((a) => a.views > 0 || lastPub.has(a.id))
      .sort((a, b) => b.views - a.views || (lastPub.get(b.id) ?? 0) - (lastPub.get(a.id) ?? 0) || a.name.localeCompare(b.name))
      .slice(0, 8),
    guidanceImage: firstCover(ranked.slice(1)),
  }
}
