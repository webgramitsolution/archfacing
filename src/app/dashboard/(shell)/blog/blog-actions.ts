'use server'

/**
 * Everything the Blog Builder does on the server.
 *
 * Kept apart from `post-actions.ts` on purpose. That file serves six posting
 * types through one config-driven form and is create-only; a blog is the one
 * type with a structured body, a draft state and an edit path, and bending
 * the shared action into that shape would complicate every other type for the
 * sake of this one.
 *
 * The content itself is written into `Post.meta`, which is already `Json?` —
 * no migration, and `articleBody()` in `src/lib/content.ts` already knows how
 * to read it back.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { PostStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { can } from '@/config/permissions'
import { uploadFile, deleteUploads } from '@/lib/upload'
import { slugify } from '@/lib/utils'
import {
  normaliseBlocks, readingMinutes, autoExcerpt, stripMarkdown,
} from '@/lib/blog-blocks'
import { BLOG_CATEGORIES } from '@/config/taxonomy'

export type BlogState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  postId?: string
  slug?: string
  /** which button was pressed, so the client knows where to go next */
  intent?: 'draft' | 'submit'
}

/** Blogs a member may still edit, plus the two the list page shows. */
const EDITABLE: PostStatus[] = ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED']

// ═══════════════════════════════════════════════════════════
//  Reads
// ═══════════════════════════════════════════════════════════

export async function myBlogs() {
  const user = await requireAuth()
  return prisma.post.findMany({
    where: { authorId: user.id, type: 'BLOG', deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, status: true, category: true,
      viewCount: true, createdAt: true, updatedAt: true, publishedAt: true,
      rejectionReason: true, meta: true,
    },
  })
}

/**
 * One blog, for the builder or the preview.
 *
 * Returns `null` rather than throwing when it is not this member's — the
 * caller turns that into `notFound()`, so a guessed id leaks nothing about
 * whether the row exists.
 */
export async function getBlogForEdit(postId: string) {
  const user = await requireAuth()
  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: user.id, type: 'BLOG', deletedAt: null },
    include: {
      author: {
        select: {
          id: true, name: true, profilePhoto: true, city: true, state: true, createdAt: true,
          professionalProfile: { select: { firmName: true, bio: true, isVerified: true } },
          pacts: { where: { status: 'ACTIVE' }, select: { pincode: true, city: true }, take: 1 },
        },
      },
    },
  })
  return post
}

// ═══════════════════════════════════════════════════════════
//  Per-section image upload
// ═══════════════════════════════════════════════════════════

/**
 * Uploads one picture and hands back its URL.
 *
 * The builder needs this because a section's image is chosen long before the
 * blog is saved — every other form in the app posts its files with the form
 * itself, which cannot work when the author is still adding sections.
 *
 * `aspect: 'free'`: an image-grid tile is frequently square or portrait, and
 * the 16:9 rule exists for cover images on a listing card.
 */
export async function uploadBlogImageAction(
  formData: FormData
): Promise<{ ok: true; url: string; key: string } | { ok: false; error: string }> {
  const user = await requireAuth()
  if (!can(user.role, 'post:blog')) {
    return { ok: false, error: 'Your account type cannot post a blog.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

  const cover = formData.get('cover') === '1'
  const result = await uploadFile({
    userId: user.id,
    file,
    kind: 'IMAGE',
    // the cover is the one that has to sit in a card grid, so it keeps 16:9
    aspect: cover ? 'wide' : 'free',
    folder: 'blog',
  })

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, url: result.url, key: result.key }
}

// ═══════════════════════════════════════════════════════════
//  Save
// ═══════════════════════════════════════════════════════════

const schema = z.object({
  title: z.string().trim().min(6, 'The title needs at least 6 characters').max(180),
  slug: z.string().trim().max(90).optional(),
  category: z.string().trim().min(1, 'Choose a category'),
  subCategory: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(400).optional(),
  // not required here — a draft is allowed to be unfinished. The check that
  // it is present moves to the submit branch below, where a reviewer is
  // about to be asked to look at it.
  heroImage: z.string().trim().optional(),
  tags: z.string().trim().max(300).optional(),
  readMinutes: z.string().trim().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
})

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  BLOG_CATEGORIES.map((c) => [c.slug, c.name])
)

/**
 * Creates or updates one blog.
 *
 * Status rules, which are the whole reason this is not `createPostAction`:
 *
 *   · Save draft            → DRAFT
 *   · Submit for review     → PENDING_REVIEW
 *   · Editing a PUBLISHED   → PENDING_REVIEW, always. A published article is
 *     never silently rewritten under the reader; the change goes back through
 *     moderation.
 *
 * `publishedAt` is left alone on an edit so a re-approved article keeps its
 * original date and does not jump back to the top of the listing.
 */
export async function saveBlogAction(
  _prev: BlogState | null,
  formData: FormData
): Promise<BlogState> {
  const user = await requireAuth()

  if (!can(user.role, 'post:blog')) {
    return { ok: false, error: 'Your account type cannot post a blog.' }
  }
  if (user.status !== 'ACTIVE') {
    return { ok: false, error: 'Your account is not active yet, so it cannot publish.' }
  }

  const intent: 'draft' | 'submit' =
    formData.get('intent') === 'submit' ? 'submit' : 'draft'
  const postId = String(formData.get('postId') ?? '').trim()

  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => [k, (v as string).trim()])
  )

  const parsed = schema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
  }

  // ─── the body ───
  let blocks: ReturnType<typeof normaliseBlocks> = []
  try {
    blocks = normaliseBlocks(JSON.parse(String(formData.get('body') ?? '[]')))
  } catch {
    return { ok: false, error: 'The article content could not be read. Please try again.' }
  }

  /*
   * A draft may be as empty as the author likes — that is what a draft is for.
   * Submitting for review is where the bar goes up, because a reviewer is
   * about to spend their time on it.
   */
  if (intent === 'submit') {
    if (blocks.length === 0) {
      fieldErrors.body = 'Add at least one section before sending it for review.'
    }
    if (!raw.heroImage) {
      fieldErrors.heroImage = 'A featured image is needed before it can be reviewed.'
    }
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
  // the guard above already covers this; it is here so TypeScript can narrow
  if (!parsed.success) return { ok: false, error: 'Please check the form and try again.' }
  const v = parsed.data

  const tags = (v.tags ?? '')
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 12)

  const typed = Number(v.readMinutes)
  const meta = {
    kind: 'blog',
    excerpt: v.excerpt || autoExcerpt(blocks),
    readMinutes: Number.isFinite(typed) && typed > 0 ? Math.round(typed) : readingMinutes(blocks),
    categoryLabel: CATEGORY_LABEL[v.category] ?? 'Article',
    heroImage: v.heroImage ?? '',
    // the listing card and the sidebar thumbnail read their own keys; without
    // mirroring the hero into both, every card falls back to the placeholder SVG
    cardImage: v.heroImage ?? '',
    thumbImage: v.heroImage ?? '',
    authorRole: String(raw.authorRole ?? '').trim(),
    tags,
    seoTitle: v.seoTitle || '',
    seoDescription: v.seoDescription || stripMarkdown(v.excerpt || autoExcerpt(blocks)).slice(0, 180),
    body: blocks,
  }

  const status: PostStatus = intent === 'submit' ? 'PENDING_REVIEW' : 'DRAFT'

  // ─── update ───
  if (postId) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, authorId: user.id, type: 'BLOG', deletedAt: null },
      select: { id: true, slug: true, status: true },
    })
    if (!existing) return { ok: false, error: 'That blog is not on your account.' }
    if (!EDITABLE.includes(existing.status)) {
      return { ok: false, error: 'This blog can no longer be edited.' }
    }

    // editing something already live sends it back through moderation
    const nextStatus: PostStatus =
      existing.status === 'PUBLISHED' ? 'PENDING_REVIEW' : status

    const slug =
      v.slug && slugify(v.slug) !== existing.slug
        ? await uniqueSlug(v.slug, existing.id)
        : existing.slug

    await prisma.post.update({
      where: { id: existing.id },
      data: {
        title: v.title,
        slug,
        description: meta.excerpt || v.title,
        category: v.category,
        subCategory: v.subCategory || null,
        writtenBy: user.name ?? null,
        meta,
        status: nextStatus,
        rejectionReason: null,
      },
    })

    revalidatePath('/dashboard/blog')
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)
    return { ok: true, postId: existing.id, slug, intent }
  }

  // ─── create ───
  const slug = await uniqueSlug(v.slug || v.title)
  const created = await prisma.post.create({
    data: {
      type: 'BLOG',
      status,
      authorId: user.id,
      title: v.title,
      slug,
      description: meta.excerpt || v.title,
      category: v.category,
      subCategory: v.subCategory || null,
      writtenBy: user.name ?? null,
      meta,
    },
    select: { id: true, slug: true },
  })

  revalidatePath('/dashboard/blog')
  revalidatePath('/blog')
  return { ok: true, postId: created.id, slug: created.slug, intent }
}

// ═══════════════════════════════════════════════════════════
//  Submit / delete
// ═══════════════════════════════════════════════════════════

/** Send a draft — or a blog that came back rejected — to the moderation queue. */
export async function submitBlogAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth()

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: user.id, type: 'BLOG', deletedAt: null },
    select: { id: true, status: true, meta: true },
  })
  if (!post) return { ok: false, error: 'That blog is not on your account.' }
  if (post.status === 'PENDING_REVIEW') {
    return { ok: false, error: 'It is already waiting to be reviewed.' }
  }

  const blocks = normaliseBlocks((post.meta as { body?: unknown } | null)?.body)
  if (!blocks.length) {
    return { ok: false, error: 'Add at least one section before sending it for review.' }
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { status: 'PENDING_REVIEW', rejectionReason: null },
  })

  revalidatePath('/dashboard/blog')
  revalidatePath('/admin/moderation')
  return { ok: true }
}

export async function deleteBlogAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth()

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: user.id, type: 'BLOG', deletedAt: null },
    include: { media: true },
  })
  if (!post) return { ok: false, error: 'That blog is not on your account.' }

  const files = post.media.filter((m) => m.storageKey)
  if (files.length) {
    await deleteUploads(
      user.id,
      files.map((m) => m.storageKey!),
      files.reduce((s, m) => s + m.sizeBytes, 0)
    )
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  })

  revalidatePath('/dashboard/blog')
  revalidatePath('/blog')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════

/**
 * `Post.slug` is unique across every posting type, not just blogs, so a
 * collision is resolved by appending a number — `my-title-2`, `-3`, and so on.
 * `ignoreId` lets a blog keep its own slug when it is being edited.
 */
async function uniqueSlug(source: string, ignoreId?: string): Promise<string> {
  const base = slugify(source).slice(0, 80) || 'blog'
  let slug = base
  let n = 1
  for (;;) {
    const clash = await prisma.post.findUnique({ where: { slug }, select: { id: true } })
    if (!clash || clash.id === ignoreId) return slug
    slug = `${base}-${++n}`
  }
}
