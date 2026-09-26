/**
 * The professional's review aggregation — ONE source of truth (§18).
 *
 * ArchFacing already has a single `Review` model keyed by `postId`, and every
 * public listing (product, project, artistry, blog, around-us) is a `Post`
 * row. So a professional's reviews are simply the reviews left on the posts
 * they authored — no per-content-type review tables, no duplicate systems.
 *
 * These helpers power BOTH the dashboard "Reviews & Ratings" tab and the
 * public profile's Reviews section, so the two can never drift apart.
 */

import { prisma } from './prisma'
import { POST_TYPES } from '@/config/post-types'
import type { PostType } from '@prisma/client'

/** The content types a professional can be reviewed through, in display order. */
export const REVIEW_SOURCES = ['PROJECT', 'PRODUCT', 'ARTISTRY', 'BLOG', 'AROUND_US'] as const
export type ReviewSource = (typeof REVIEW_SOURCES)[number]
export type ReviewFilter = 'all' | ReviewSource
export type ReviewSort = 'recent' | 'highest' | 'lowest'

const PAGE_SIZE = 5

/** A friendly one-word tag for the reviewer, from their account role. */
function reviewerRole(role: string): string {
  switch (role) {
    case 'PROFESSIONAL': return 'Professional'
    case 'CONSULTANT': return 'Consultant'
    case 'BMF': return 'Building Materials'
    case 'CORPORATE': return 'Corporate'
    default: return 'Client'
  }
}

/** Detail-page link + label for the reviewed item, from its post type. */
function sourceMeta(type: PostType, slug: string) {
  const cfg = (POST_TYPES as Record<string, { label: string; publicPath: string }>)[type]
  return {
    label: cfg?.label ?? 'Listing',
    href: cfg?.publicPath ? `${cfg.publicPath}/${slug}` : null,
  }
}

export type ReviewSummary = {
  average: number
  total: number
  /** 5★ → 1★, each with its count and percentage of the total. */
  distribution: { star: number; count: number; pct: number }[]
  /** How many reviews came through each content type — drives which filters show. */
  byType: Record<ReviewFilter, number>
}

/**
 * Overall rating, total, star distribution and per-source counts for one pro.
 * All computed from real `Review` rows on the pro's own (non-deleted) posts.
 */
export async function professionalReviewSummary(professionalId: string): Promise<ReviewSummary> {
  const rows = await prisma.review.groupBy({
    by: ['rating'],
    where: { post: { authorId: professionalId, deletedAt: null } },
    _count: { _all: true },
  })

  const counts = new Map<number, number>()
  let total = 0
  let weighted = 0
  for (const r of rows) {
    counts.set(r.rating, r._count._all)
    total += r._count._all
    weighted += r.rating * r._count._all
  }

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = counts.get(star) ?? 0
    return { star, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })

  // Per-source counts, so the UI only offers filters that have reviews.
  const byTypeRows = await prisma.review.groupBy({
    by: ['postId'],
    where: { post: { authorId: professionalId, deletedAt: null } },
    _count: { _all: true },
  })
  const postTypes = byTypeRows.length
    ? await prisma.post.findMany({
        where: { id: { in: byTypeRows.map((b) => b.postId) } },
        select: { id: true, type: true },
      })
    : []
  const typeById = new Map(postTypes.map((p) => [p.id, p.type]))
  const byType: Record<ReviewFilter, number> = {
    all: total, PROJECT: 0, PRODUCT: 0, ARTISTRY: 0, BLOG: 0, AROUND_US: 0,
  }
  for (const b of byTypeRows) {
    const t = typeById.get(b.postId)
    if (t && t in byType) byType[t as ReviewFilter] += b._count._all
  }

  return {
    average: total ? Math.round((weighted / total) * 10) / 10 : 0,
    total,
    distribution,
    byType,
  }
}

export type ReviewCard = {
  id: string
  reviewer: { name: string; photo: string | null; role: string }
  rating: number
  body: string | null
  createdAt: string
  sourceType: string
  sourceLabel: string
  sourceTitle: string
  sourceHref: string | null
}

export type ReviewPage = {
  reviews: ReviewCard[]
  total: number
  page: number
  pages: number
  pageSize: number
  from: number
  to: number
}

/**
 * One page of a professional's reviews, filtered by source and sorted.
 * `filter` narrows to a single content type; `sort` orders the cards.
 */
export async function professionalReviews(
  professionalId: string,
  opts: { filter?: ReviewFilter; sort?: ReviewSort; page?: number } = {}
): Promise<ReviewPage> {
  const filter = opts.filter ?? 'all'
  const sort = opts.sort ?? 'recent'
  const page = Math.max(1, opts.page ?? 1)

  const where = {
    post: {
      authorId: professionalId,
      deletedAt: null,
      ...(filter !== 'all' ? { type: filter as PostType } : {}),
    },
  }

  const orderBy =
    sort === 'highest'
      ? [{ rating: 'desc' as const }, { createdAt: 'desc' as const }]
      : sort === 'lowest'
        ? [{ rating: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }]

  const total = await prisma.review.count({ where })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pages)

  const rows = await prisma.review.findMany({
    where,
    orderBy,
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, profilePhoto: true, role: true } },
      post: { select: { title: true, slug: true, type: true } },
    },
  })

  const reviews: ReviewCard[] = rows.map((r) => {
    const meta = sourceMeta(r.post.type, r.post.slug)
    return {
      id: r.id,
      reviewer: {
        name: r.author.name || 'ArchFacing Client',
        photo: r.author.profilePhoto,
        role: reviewerRole(r.author.role),
      },
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      sourceType: r.post.type,
      sourceLabel: meta.label,
      sourceTitle: r.post.title,
      sourceHref: meta.href,
    }
  })

  return {
    reviews,
    total,
    page: safePage,
    pages,
    pageSize: PAGE_SIZE,
    from: total ? (safePage - 1) * PAGE_SIZE + 1 : 0,
    to: Math.min(safePage * PAGE_SIZE, total),
  }
}
