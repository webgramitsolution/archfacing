import 'server-only'

import type { PostType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * The reader's own activity — saves, view history and reviews.
 *
 * All three hang off `Post`, which is the one table every public listing lives
 * in, so one function each serves projects, products, artistry, blog and
 * Around Us alike.
 *
 * ★ Nothing here invents a figure. Every count is a row count; where a reader
 *   has done nothing yet the answer is 0 and the dashboard says so.
 */

/** Only published, undeleted items are ever shown back to a reader. */
const LIVE = { status: 'PUBLISHED' as const, deletedAt: null }

/** What a saved / viewed / reviewed row needs in order to render as a card. */
const CARD_SELECT = {
  id: true,
  slug: true,
  type: true,
  title: true,
  category: true,
  city: true,
  state: true,
  viewCount: true,
  publishedAt: true,
  author: { select: { name: true } },
  media: { select: { url: true }, orderBy: { sortOrder: 'asc' as const }, take: 1 },
} as const

export type VisitorCard = {
  id: string
  slug: string
  type: PostType
  title: string
  category: string
  place: string
  author: string
  image: string | null
  /** The public URL for this kind of post. */
  href: string
}

/** Where each post type is published. */
const PUBLIC_PATH: Record<string, string> = {
  PROJECT: '/projects',
  PRODUCT: '/products',
  ARTISTRY: '/artistry',
  BLOG: '/blog',
  AROUND_US: '/around-us',
  MERCHANDISE: '/merchandise',
  DESIGN_COMPETITION: '/competition',
  PODCAST: '/podcast',
}

export function publicHref(type: PostType, slug: string): string {
  const base = PUBLIC_PATH[type] ?? '/projects'
  return base + '/' + slug
}

type CardRow = {
  id: string
  slug: string
  type: PostType
  title: string
  category: string
  city: string | null
  state: string | null
  author: { name: string } | null
  media: { url: string }[]
}

function toCard(p: CardRow): VisitorCard {
  return {
    id: p.id,
    slug: p.slug,
    type: p.type,
    title: p.title,
    category: p.category,
    place: [p.city, p.state].filter(Boolean).join(', '),
    author: p.author?.name ?? 'ArchFacing',
    image: p.media[0]?.url ?? null,
    href: publicHref(p.type, p.slug),
  }
}

// ═══════════════════════════════════════════════════════════
//  Saved items
// ═══════════════════════════════════════════════════════════

/** Idempotent — saving something already saved leaves one row. */
export async function saveItem(userId: string, postId: string): Promise<void> {
  await prisma.savedItem.upsert({
    where: { userId_postId: { userId, postId } },
    update: {},
    create: { userId, postId },
  })
}

export async function unsaveItem(userId: string, postId: string): Promise<void> {
  await prisma.savedItem.deleteMany({ where: { userId, postId } })
}

/** Returns the state AFTER the toggle, so a caller can redraw the button. */
export async function toggleSaved(userId: string, postId: string): Promise<boolean> {
  const existing = await prisma.savedItem.findUnique({
    where: { userId_postId: { userId, postId } },
    select: { id: true },
  })
  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } })
    return false
  }
  await prisma.savedItem.create({ data: { userId, postId } })
  return true
}

export async function isSaved(userId: string, postId: string): Promise<boolean> {
  const row = await prisma.savedItem.findUnique({
    where: { userId_postId: { userId, postId } },
    select: { id: true },
  })
  return Boolean(row)
}

/** The ids a reader has saved out of a given set — one query for a whole grid. */
export async function savedIdsAmong(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set()
  const rows = await prisma.savedItem.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  })
  return new Set(rows.map((r) => r.postId))
}

export async function listSaved(userId: string, take = 24): Promise<VisitorCard[]> {
  const rows = await prisma.savedItem.findMany({
    where: { userId, post: LIVE },
    orderBy: { createdAt: 'desc' },
    take,
    select: { post: { select: CARD_SELECT } },
  })
  return rows.map((r) => toCard(r.post))
}

// ═══════════════════════════════════════════════════════════
//  Recently viewed
// ═══════════════════════════════════════════════════════════

/**
 * Stamp a visit.
 *
 * One row per (reader, item) — a revisit moves the timestamp rather than
 * adding a row, so the history stays a list of DISTINCT items and someone
 * refreshing a page does not flood their own dashboard.
 */
export async function recordView(userId: string, postId: string): Promise<void> {
  await prisma.recentlyViewed.upsert({
    where: { userId_postId: { userId, postId } },
    update: { viewedAt: new Date() },
    create: { userId, postId },
  })
}

export async function listRecentlyViewed(userId: string, take = 24): Promise<VisitorCard[]> {
  const rows = await prisma.recentlyViewed.findMany({
    where: { userId, post: LIVE },
    orderBy: { viewedAt: 'desc' },
    take,
    select: { post: { select: CARD_SELECT } },
  })
  return rows.map((r) => toCard(r.post))
}

// ═══════════════════════════════════════════════════════════
//  Reviews
// ═══════════════════════════════════════════════════════════

export class ReviewError extends Error {}

/**
 * Write or amend a review. A second submission for the same item edits the
 * first rather than stacking, which is what the unique pair in the schema
 * enforces.
 */
export async function upsertReview(params: {
  authorId: string
  postId: string
  rating: number
  body?: string | null
}): Promise<void> {
  const rating = Math.round(params.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ReviewError('A rating has to be between 1 and 5.')
  }

  const post = await prisma.post.findFirst({
    where: { id: params.postId, ...LIVE },
    select: { id: true, authorId: true },
  })
  if (!post) throw new ReviewError('That item is not available to review.')
  if (post.authorId === params.authorId) {
    throw new ReviewError('You cannot review your own posting.')
  }

  const body = (params.body ?? '').trim() || null

  await prisma.review.upsert({
    where: { authorId_postId: { authorId: params.authorId, postId: params.postId } },
    update: { rating, body },
    create: { authorId: params.authorId, postId: params.postId, rating, body },
  })
}

export async function deleteReview(authorId: string, postId: string): Promise<void> {
  await prisma.review.deleteMany({ where: { authorId, postId } })
}

export type MyReview = {
  id: string
  rating: number
  body: string | null
  createdAt: Date
  item: VisitorCard
}

export async function listMyReviews(authorId: string, take = 24): Promise<MyReview[]> {
  const rows = await prisma.review.findMany({
    where: { authorId, post: LIVE },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      post: { select: CARD_SELECT },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt,
    item: toCard(r.post),
  }))
}

/** The average and count for one item — for a public listing to show. */
export async function ratingFor(postId: string): Promise<{ average: number | null; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { postId },
    _avg: { rating: true },
    _count: { _all: true },
  })
  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count._all,
  }
}

// ═══════════════════════════════════════════════════════════
//  The dashboard read
// ═══════════════════════════════════════════════════════════

export type VisitorCounts = {
  enquiries: number
  saved: number
  viewed: number
  posts: number
  messages: number
  reviews: number
}

/**
 * Every number on the visitor dashboard, in one round trip.
 *
 * "Messages" is not a table of its own on this platform — a conversation IS an
 * enquiry thread, so the figure is the count of the reader's enquiries a
 * professional has replied to.
 */
export async function visitorCounts(userId: string): Promise<VisitorCounts> {
  const [enquiries, saved, viewed, posts, messages, reviews] = await Promise.all([
    prisma.enquiry.count({ where: { clientId: userId } }),
    prisma.savedItem.count({ where: { userId, post: LIVE } }),
    prisma.recentlyViewed.count({ where: { userId, post: LIVE } }),
    prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
    prisma.enquiry.count({ where: { clientId: userId, status: 'RESPONDED' } }),
    prisma.review.count({ where: { authorId: userId } }),
  ])

  return { enquiries, saved, viewed, posts, messages, reviews }
}

/**
 * Things the reader might like next.
 *
 * There is no recommendation engine, and pretending otherwise would be a lie —
 * this is honestly "what is popular near you": published items in the reader's
 * own state, most-viewed first, with anything they wrote or already saved
 * filtered out. Falls back to the platform's most-viewed when the reader has
 * set no location.
 */
export async function recommendedFor(
  userId: string,
  place: { state?: string | null },
  take = 8
): Promise<VisitorCard[]> {
  const already = await prisma.savedItem.findMany({
    where: { userId },
    select: { postId: true },
  })
  const skip = already.map((a) => a.postId)

  const base = {
    ...LIVE,
    authorId: { not: userId },
    ...(skip.length ? { id: { notIn: skip } } : {}),
    type: { in: ['PROJECT', 'PRODUCT', 'ARTISTRY'] as PostType[] },
  }

  const near = place.state
    ? await prisma.post.findMany({
        where: { ...base, state: place.state },
        orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        take,
        select: CARD_SELECT,
      })
    : []

  if (near.length >= take) return near.map(toCard)

  // Top up from everywhere, never repeating what the local slice already found.
  const seen = near.map((n) => n.id)
  const rest = await prisma.post.findMany({
    where: { ...base, ...(seen.length ? { id: { notIn: [...skip, ...seen] } } : {}) },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: take - near.length,
    select: CARD_SELECT,
  })

  return [...near, ...rest].map(toCard)
}
