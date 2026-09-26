/**
 * Blog articles and podcast episodes.
 *
 * Both live in the shared `Post` table; everything specific to one of them
 * sits in `Post.meta`, which is a `Json` column and therefore untyped.
 *
 * ⚠️ `meta` is the only place this app stores loosely-shaped data. Every read
 *    of it goes through a parser in this file, and every parser drops a row it
 *    does not understand rather than throwing. A malformed block written years
 *    ago must never take a published page down.
 */

import { prisma } from './prisma'
import type { IconName } from '@/components/ui'

// ═══════════════════════════════════════════════════════════
//  Blog
// ═══════════════════════════════════════════════════════════

export type ArticleMeta = {
  excerpt: string
  readMinutes: number
  featured: boolean
  categoryLabel: string
  heroImage: string
  cardImage: string
  thumbImage: string
  authorRole: string
  authorPhoto: string
  tags: string[]
  /** Falls back to the title and the excerpt when the author leaves it blank */
  seoTitle: string
  seoDescription: string
}

const FALLBACK_IMAGE = '/img/hero-professionals.svg'

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function articleMeta(meta: unknown): ArticleMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const hero = str(m.heroImage, FALLBACK_IMAGE)

  return {
    excerpt: str(m.excerpt),
    readMinutes: num(m.readMinutes, 5),
    featured: m.featured === true,
    categoryLabel: str(m.categoryLabel, 'Article'),
    heroImage: hero,
    cardImage: str(m.cardImage, hero),
    thumbImage: str(m.thumbImage, hero),
    authorRole: str(m.authorRole),
    authorPhoto: str(m.authorPhoto),
    tags: Array.isArray(m.tags) ? m.tags.filter((t): t is string => typeof t === 'string') : [],
    seoTitle: str(m.seoTitle),
    seoDescription: str(m.seoDescription),
  }
}

// ─── the article body, as blocks ───

/**
 * One section of an article.
 *
 * This union is the contract between the dashboard's Blog Builder, which
 * writes it into `Post.meta.body`, and `ArticleBlocks`, which renders it. Add
 * a member here, a parser case below and a renderer in `blog.tsx` — in that
 * order — and every existing article keeps working, because the parser drops
 * what it does not recognise.
 *
 * Text fields carry light Markdown (`**bold**`, `*italic*`, `[text](url)`);
 * see `renderInline` in `src/lib/blog-blocks.ts`. Nothing here is ever HTML,
 * so nothing is ever passed to `dangerouslySetInnerHTML`.
 */
export type Block =
  | { type: 'lead'; text: string }
  | { type: 'para'; text: string }
  | { type: 'heading'; number?: number; level?: 2 | 3 | 4; text: string }
  | { type: 'quote'; text: string }
  | { type: 'iconGrid'; title?: string; columns?: number; items: { icon: IconName; title: string; body: string }[] }
  | { type: 'imageGrid'; title?: string; columns?: number; items: { image: string; caption: string }[] }
  | { type: 'pills'; items: { icon: IconName; text: string }[] }
  // ─── added for the Blog Builder ───
  | { type: 'bullets'; title?: string; items: string[] }
  | { type: 'image'; image: string; caption?: string; alt?: string; width?: 'full' | 'contained' }
  | { type: 'numbered'; title?: string; items: { title: string; body: string }[] }
  | { type: 'cards'; title?: string; items: { icon: IconName; title: string; body?: string }[] }
  | { type: 'cta'; title: string; body?: string; buttonText: string; buttonUrl: string }

/** Every `Block['type']`, for the builder's section picker. */
export type BlockType = Block['type']

/**
 * Parses the block body out of `meta.body`.
 *
 * Anything unrecognised is dropped silently — a page missing one section is
 * far better than a page that will not render at all.
 */
export function articleBody(meta: unknown): Block[] {
  const m = (meta ?? {}) as Record<string, unknown>
  if (!Array.isArray(m.body)) return []

  const out: Block[] = []

  for (const raw of m.body) {
    if (!raw || typeof raw !== 'object') continue
    const b = raw as Record<string, unknown>
    const type = str(b.type)

    switch (type) {
      case 'lead':
      case 'para':
      case 'quote': {
        const text = str(b.text)
        if (text) out.push({ type, text } as Block)
        break
      }
      case 'heading': {
        const text = str(b.text)
        if (text) {
          const n = num(b.number, 0)
          const lvl = num(b.level, 2)
          out.push({
            type: 'heading',
            text,
            ...(n > 0 ? { number: n } : {}),
            level: lvl === 3 || lvl === 4 ? (lvl as 3 | 4) : 2,
          })
        }
        break
      }
      case 'iconGrid': {
        const items = asArray(b.items)
          .map((i) => ({
            icon: str(i.icon, 'star') as IconName,
            title: str(i.title),
            body: str(i.body),
          }))
          .filter((i) => i.title)
        if (items.length) {
          out.push({
            type: 'iconGrid',
            title: str(b.title) || undefined,
            ...cols(b.columns),
            items,
          })
        }
        break
      }
      case 'imageGrid': {
        const items = asArray(b.items)
          .map((i) => ({ image: str(i.image), caption: str(i.caption) }))
          .filter((i) => i.image)
        if (items.length) {
          out.push({
            type: 'imageGrid',
            title: str(b.title) || undefined,
            ...cols(b.columns),
            items,
          })
        }
        break
      }
      case 'pills': {
        const items = asArray(b.items)
          .map((i) => ({ icon: str(i.icon, 'check') as IconName, text: str(i.text) }))
          .filter((i) => i.text)
        if (items.length) out.push({ type: 'pills', items })
        break
      }
      case 'bullets': {
        // a plain string array, unlike every other `items` on this union
        const items = (Array.isArray(b.items) ? b.items : [])
          .map((i) => str(i))
          .filter(Boolean)
        if (items.length) out.push({ type: 'bullets', title: str(b.title) || undefined, items })
        break
      }
      case 'image': {
        const image = str(b.image)
        if (image) {
          out.push({
            type: 'image',
            image,
            caption: str(b.caption) || undefined,
            alt: str(b.alt) || undefined,
            width: b.width === 'contained' ? 'contained' : 'full',
          })
        }
        break
      }
      case 'numbered': {
        const items = asArray(b.items)
          .map((i) => ({ title: str(i.title), body: str(i.body) }))
          .filter((i) => i.title || i.body)
        if (items.length) out.push({ type: 'numbered', title: str(b.title) || undefined, items })
        break
      }
      case 'cards': {
        const items = asArray(b.items)
          .map((i) => ({
            icon: str(i.icon, 'star') as IconName,
            title: str(i.title),
            body: str(i.body) || undefined,
          }))
          .filter((i) => i.title)
        if (items.length) out.push({ type: 'cards', title: str(b.title) || undefined, items })
        break
      }
      case 'cta': {
        const title = str(b.title)
        const buttonText = str(b.buttonText)
        const buttonUrl = str(b.buttonUrl)
        // a call to action with no button is just a paragraph — drop it rather
        // than render a dead band
        if (title && buttonText && buttonUrl) {
          out.push({
            type: 'cta',
            title,
            body: str(b.body) || undefined,
            buttonText,
            buttonUrl,
          })
        }
        break
      }
      default:
        break
    }
  }

  return out
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    : []
}

/**
 * A column count for a grid block, or nothing at all.
 *
 * Only 2, 3, 4 and 6 are offered, because those are the counts the renderer
 * has grid classes for — Tailwind cannot build a class from a variable, so an
 * arbitrary number would silently produce no columns.
 */
function cols(v: unknown): { columns?: number } {
  const n = num(v, 0)
  return n === 2 || n === 3 || n === 4 || n === 6 ? { columns: n } : {}
}

// ─── queries ───

const ARTICLE_SELECT = {
  id: true, slug: true, title: true, description: true, category: true,
  publishedAt: true, viewCount: true, meta: true,
  author: { select: { id: true, name: true, profilePhoto: true } },
} as const

export async function listArticles({
  category,
  search,
  sort = 'latest',
  take = 6,
  skip = 0,
  excludeSlug,
}: {
  category?: string
  search?: string
  sort?: 'latest' | 'popular'
  take?: number
  skip?: number
  excludeSlug?: string
} = {}) {
  return prisma.post.findMany({
    where: {
      type: 'BLOG',
      status: 'PUBLISHED',
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: ARTICLE_SELECT,
    orderBy: sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' },
    take,
    skip,
  })
}

export type ArticleRow = Awaited<ReturnType<typeof listArticles>>[number]

export async function countArticles(where: { category?: string; search?: string } = {}) {
  return prisma.post.count({
    where: {
      type: 'BLOG',
      status: 'PUBLISHED',
      deletedAt: null,
      ...(where.category ? { category: where.category } : {}),
      ...(where.search
        ? {
            OR: [
              { title: { contains: where.search, mode: 'insensitive' as const } },
              { description: { contains: where.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
  })
}

export async function getArticle(slug: string) {
  return prisma.post.findFirst({
    where: { slug, type: 'BLOG', status: 'PUBLISHED', deletedAt: null },
    select: {
      ...ARTICLE_SELECT,
      author: {
        select: {
          id: true, name: true, profilePhoto: true, city: true, state: true, createdAt: true,
          professionalProfile: {
            select: { firmName: true, bio: true, isVerified: true },
          },
          pacts: {
            where: { status: 'ACTIVE' },
            select: { pincode: true, city: true },
            take: 1,
          },
        },
      },
    },
  })
}

export type ArticleDetail = NonNullable<Awaited<ReturnType<typeof getArticle>>>

/** The previous and next article by publish date, for the footer navigation. */
export async function articleNeighbours(publishedAt: Date | null) {
  if (!publishedAt) return { previous: null, next: null }

  const [previous, next] = await Promise.all([
    prisma.post.findFirst({
      where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null, publishedAt: { lt: publishedAt } },
      select: { slug: true, title: true, meta: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.post.findFirst({
      where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null, publishedAt: { gt: publishedAt } },
      select: { slug: true, title: true, meta: true },
      orderBy: { publishedAt: 'asc' },
    }),
  ])

  return { previous, next }
}

/** Article counts per category slug, for the sidebar and the chip strip. */
export async function articleCounts(): Promise<Record<string, number>> {
  const rows = await prisma.post.groupBy({
    by: ['category'],
    where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
  })

  const out: Record<string, number> = {}
  for (const r of rows) out[r.category] = r._count._all
  return out
}

// ═══════════════════════════════════════════════════════════
//  Podcast
// ═══════════════════════════════════════════════════════════

export type EpisodeMeta = {
  episodeNumber: number
  duration: string
  topicLabel: string
  cardTitle: string
  thumbImage: string
}

export function episodeMeta(meta: unknown): EpisodeMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  return {
    episodeNumber: num(m.episodeNumber),
    duration: str(m.duration, '00:00'),
    topicLabel: str(m.topicLabel, 'Episode'),
    cardTitle: str(m.cardTitle),
    thumbImage: str(m.thumbImage, FALLBACK_IMAGE),
  }
}

const EPISODE_SELECT = {
  id: true, slug: true, title: true, description: true, category: true,
  publishedAt: true, viewCount: true, meta: true,
  media: { where: { type: 'VIDEO_LINK' as const }, take: 1 },
} as const

export async function listEpisodes({
  topic,
  sort = 'latest',
  take = 6,
  skip = 0,
}: { topic?: string; sort?: 'latest' | 'popular'; take?: number; skip?: number } = {}) {
  return prisma.post.findMany({
    where: {
      type: 'PODCAST', status: 'PUBLISHED', deletedAt: null,
      ...(topic ? { category: topic } : {}),
    },
    select: EPISODE_SELECT,
    orderBy: sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' },
    take,
    skip,
  })
}

export type EpisodeRow = Awaited<ReturnType<typeof listEpisodes>>[number]

export async function countEpisodes(topic?: string) {
  return prisma.post.count({
    where: { type: 'PODCAST', status: 'PUBLISHED', deletedAt: null, ...(topic ? { category: topic } : {}) },
  })
}

export async function getEpisode(slug: string) {
  return prisma.post.findFirst({
    where: { slug, type: 'PODCAST', status: 'PUBLISHED', deletedAt: null },
    select: EPISODE_SELECT,
  })
}

export async function listGuests(take = 12) {
  return prisma.podcastGuest.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    take,
  })
}

/** Episode counts per topic slug. */
export async function episodeCounts(): Promise<Record<string, number>> {
  const rows = await prisma.post.groupBy({
    by: ['category'],
    where: { type: 'PODCAST', status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
  })

  const out: Record<string, number> = {}
  for (const r of rows) out[r.category] = r._count._all
  return out
}

// ═══════════════════════════════════════════════════════════
//  Shared formatting
// ═══════════════════════════════════════════════════════════

/** "15 May 2026" */
export function postDate(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 1200 → "1.2K", 980 → "980" */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
