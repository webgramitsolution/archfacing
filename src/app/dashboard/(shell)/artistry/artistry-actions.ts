'use server'

/**
 * Artistry — the dashboard's own server actions.
 *
 * Artistry has its own form rather than sharing the generic `PostForm`, for
 * the same reason Blog does: the design is a seven-section brief with a media
 * rail of its own, and bending the generic form into that shape would leave
 * every other posting type carrying fields it has no use for.
 *
 * ⚠️ Everything the form collects is written into `Post.meta` in the exact
 *    `ArtworkMeta` shape `src/lib/artistry.ts` already parses, so a piece
 *    posted here renders on `/artistry/[slug]` through the same code path as
 *    the seeded ones. There is no second renderer to keep in step.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { PostStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { can } from '@/config/permissions'
import { uploadFile } from '@/lib/upload'
import { slugify } from '@/lib/utils'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'

/** The statuses an author is still allowed to open and change. */
const EDITABLE: PostStatus[] = ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED']

const LABEL: Record<string, string> = Object.fromEntries(
  ARTISTRY_CATEGORIES.flatMap((g) => [
    [g.slug, g.name] as const,
    ...(g.children ?? []).map((c) => [c.slug, c.name] as const),
  ])
)

// ═══════════════════════════════════════════════════════════
//  Reads
// ═══════════════════════════════════════════════════════════

export async function myArtistry(status?: PostStatus) {
  const user = await requireAuth()

  return prisma.post.findMany({
    where: {
      type: 'ARTISTRY',
      authorId: user.id,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, category: true, subCategory: true,
      status: true, viewCount: true, updatedAt: true, publishedAt: true,
      rejectionReason: true, meta: true,
    },
  })
}

export async function getArtistryForEdit(postId: string) {
  const user = await requireAuth()

  const post = await prisma.post.findFirst({
    where: { id: postId, type: 'ARTISTRY', authorId: user.id, deletedAt: null },
  })

  return post && EDITABLE.includes(post.status) ? post : null
}

// ═══════════════════════════════════════════════════════════
//  Uploads
// ═══════════════════════════════════════════════════════════

/**
 * One file at a time, posted on its own.
 *
 * The rail lets an author add a cover, twenty gallery frames and a document
 * long before the piece is saved, so the files cannot ride along with the form
 * the way the generic `PostForm` sends them.
 *
 * `aspect: 'free'` on every slot, the feature image included. The 16:9 rule
 * exists so a cover sits cleanly in a listing card, but an artwork is a
 * painting, a sculpture or a building — it arrives at 3:2, 4:3 or portrait,
 * and almost never at 16:9. The Artistry card crops with `object-cover`, so
 * the rule bought nothing and rejected most of what an artist actually has.
 * Everything else about the upload still applies: the size cap, the
 * magic-byte type check, the quota, and the re-encode that strips EXIF.
 */
export async function uploadArtistryFileAction(
  formData: FormData
): Promise<{ ok: true; url: string; key: string } | { ok: false; error: string }> {
  const user = await requireAuth()
  if (!can(user.role, 'post:artistry')) {
    return { ok: false, error: 'Your account type cannot post artistry.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

  const slot = String(formData.get('slot') ?? 'gallery')

  const result = await uploadFile({
    userId: user.id,
    file,
    kind: slot === 'document' ? 'DOCUMENT' : 'IMAGE',
    aspect: 'free',
    folder: 'artistry',
  })

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, url: result.url, key: result.key }
}

// ═══════════════════════════════════════════════════════════
//  Save
// ═══════════════════════════════════════════════════════════

const schema = z.object({
  title: z.string().trim().min(4, 'The title needs at least 4 characters').max(200),
  category: z.string().trim().min(1, 'Choose a category'),
  subCategory: z.string().trim().min(1, 'Choose a sub-category'),
  location: z.string().trim().min(2, 'Add a location').max(160),
  shortDescription: z
    .string()
    .trim()
    .min(20, 'Write at least a sentence for the listings')
    .max(300),
  detail: z.string().trim().max(5000).optional(),
  yearPeriod: z.string().trim().max(60).optional(),
  material: z.string().trim().max(160).optional(),
  dimensions: z.string().trim().max(120).optional(),
  weight: z.string().trim().max(60).optional(),
  yearBuilt: z.string().trim().max(40).optional(),
  artType: z.string().trim().max(80).optional(),
  technique: z.string().trim().max(120).optional(),
  colourFinish: z.string().trim().max(120).optional(),
  condition: z.string().trim().max(80).optional(),
  projectTitle: z.string().trim().max(160).optional(),
  completionDate: z.string().trim().max(40).optional(),
  projectStatus: z.string().trim().max(60).optional(),
  projectDuration: z.string().trim().max(60).optional(),
  videoUrl: z.string().trim().max(300).optional(),
  externalUrl: z.string().trim().max(300).optional(),
  metaTitle: z.string().trim().max(60).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  keywords: z.string().trim().max(300).optional(),
})

export type ArtistryState =
  | { ok: true; id: string; slug: string; status: PostStatus }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | null

/** Splits a comma-separated field into a clean list. */
function list(v: string | undefined, max: number): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
}

/** A row for the specification columns — dropped when it has no value. */
function spec(label: string, value: string | undefined) {
  return value?.trim() ? [{ label, value: value.trim() }] : []
}

export async function saveArtistryAction(
  _prev: ArtistryState,
  formData: FormData
): Promise<ArtistryState> {
  const user = await requireAuth()

  if (!can(user.role, 'post:artistry')) {
    return { ok: false, error: 'Your account type cannot post artistry.' }
  }
  if (user.status !== 'ACTIVE') {
    return { ok: false, error: 'Your account is not active yet, so it cannot publish.' }
  }

  const intent: 'draft' | 'submit' = formData.get('intent') === 'submit' ? 'submit' : 'draft'
  const postId = String(formData.get('postId') ?? '').trim()

  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => [k, (v as string).trim()])
  ) as Record<string, string>

  const parsed = schema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
  }

  const cover = raw.coverImage ?? ''
  const gallery = list(raw.gallery, 20)

  /*
   * A draft may be as thin as the author likes. Submitting is where the bar
   * goes up, because a reviewer is about to spend their time on it.
   */
  if (intent === 'submit' && !cover) {
    fieldErrors.coverImage = 'A feature image is needed before it can be reviewed.'
  }

  // `!parsed.success` is redundant with the error count — it is here so the
  // compiler narrows `parsed.data` below.
  if (!parsed.success || Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors }
  }
  const v = parsed.data

  const applicable = list(raw.applicable, ARTISTRY_CATEGORIES.length)
  const tags = list(raw.tags, 10)

  /*
   * The artist block.
   *
   * Written from the signed-in account rather than from the form, because
   * every field in it already exists on the profile and asking an author to
   * retype their own name on each upload is how the two drift apart. Without
   * it `artworkMeta()` falls back to "ArchFacing", so a piece posted through
   * this form showed no artist at all on the card or the sidebar.
   *
   * Rating, reviews and recommend stay at zero: there is no review table, and
   * a made-up 4.9 would read as real.
   */
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true, profilePhoto: true, city: true, state: true,
      professionalProfile: {
        select: { firmName: true, bio: true, isVerified: true, designaType: true },
      },
    },
  })

  const pp = profile?.professionalProfile
  const artist = {
    name: profile?.name ?? user.name ?? 'ArchFacing',
    shortName: profile?.name ?? user.name ?? 'ArchFacing',
    // The line under the name is what this person does, not where they work —
    // the firm is a separate row on the sidebar card.
    role: pp?.designaType === 'DESIGNI' ? 'Interior Designer' : 'Architect',
    cardLabel: pp?.designaType === 'DESIGNI' ? 'Interior Designer' : 'Professional',
    bio: pp?.bio ?? '',
    photo: profile?.profilePhoto ?? '',
    location: [profile?.city, profile?.state].filter(Boolean).join(', '),
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '—',
    followers: '—',
    successRate: '—',
    verified: pp?.isVerified === true,
  }

  const meta = {
    subtitle: v.projectTitle ?? '',
    location: v.location,
    artworkId: `#AF${(postId || user.id).slice(-6).toUpperCase()}`,
    medium: v.material ?? '',
    projectStatus: v.projectStatus ?? '',
    lastUpdated: new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    addedOn: new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    categoryLabel: LABEL[v.category] ?? v.category,
    subCategoryLabel: LABEL[v.subCategory] ?? v.subCategory,
    // The taxonomy slugs the author ticked, which the detail page reads back
    // as "Applicable Categories", plus the marketing flags.
    badges: [
      ...applicable,
      ...(raw.featured === 'on' ? ['Featured'] : []),
    ],
    image: cover,
    // The feature image leads the gallery. It is the photograph the card and
    // the hero already show, so leaving it out of the carousel makes frame 1
    // something the reader has not seen and drops the cover from the strip
    // entirely. `filter` keeps it from appearing twice if it is also in the
    // gallery list.
    gallery: [cover, ...gallery.filter((g) => g !== cover)].filter(Boolean),
    about: (v.detail ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
    specsLeft: [
      ...spec('Material', v.material),
      ...spec('Dimensions (L × W × H)', v.dimensions),
      ...spec('Weight', v.weight),
      ...spec('Year / Built', v.yearBuilt ?? v.yearPeriod),
    ],
    specsRight: [
      ...spec('Type', v.artType),
      ...spec('Technique', v.technique),
      ...spec('Color / Finish', v.colourFinish),
      ...spec('Condition', v.condition),
    ],
    tags,
    projectInfo: [
      ...(v.yearPeriod ? [{ icon: 'calendar', label: 'Construction Period', value: v.yearPeriod }] : []),
      ...(v.completionDate ? [{ icon: 'check', label: 'Completion Date', value: v.completionDate }] : []),
      ...(v.projectDuration ? [{ icon: 'clock', label: 'Project Duration', value: v.projectDuration }] : []),
      ...(v.projectStatus ? [{ icon: 'chart', label: 'Project Status', value: v.projectStatus }] : []),
    ],
    artist,
    videoUrl: v.videoUrl ?? '',
    externalUrl: v.externalUrl ?? '',
    documents: list(raw.documents, 5),
    allowEnquiries: raw.allowEnquiries === 'on',
    allowComments: raw.allowComments === 'on',
    showInProfile: raw.showInProfile === 'on',
    seoTitle: v.metaTitle ?? '',
    seoDescription: v.metaDescription ?? '',
    keywords: list(raw.keywords, 20),
  }

  const status: PostStatus = intent === 'submit' ? 'PENDING_REVIEW' : 'DRAFT'

  const common = {
    title: v.title,
    description: v.shortDescription,
    category: v.category,
    subCategory: v.subCategory,
    city: v.location.split(',')[0]?.trim() || null,
    meta: meta as never,
    status,
    rejectionReason: null,
  }

  // ─── update ───
  if (postId) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, type: 'ARTISTRY', authorId: user.id, deletedAt: null },
      select: { id: true, slug: true, status: true },
    })
    if (!existing || !EDITABLE.includes(existing.status)) {
      return { ok: false, error: 'That artwork can no longer be edited.' }
    }

    await prisma.post.update({ where: { id: existing.id }, data: common })

    revalidatePath('/dashboard/artistry')
    revalidatePath('/artistry')
    revalidatePath(`/artistry/${existing.slug}`)

    return { ok: true, id: existing.id, slug: existing.slug, status }
  }

  // ─── create ───
  const slug = await freeSlug(v.title)

  const created = await prisma.post.create({
    data: { ...common, slug, type: 'ARTISTRY', authorId: user.id },
    select: { id: true, slug: true },
  })

  revalidatePath('/dashboard/artistry')
  revalidatePath('/artistry')

  return { ok: true, id: created.id, slug: created.slug, status }
}

export async function deleteArtistryAction(postId: string) {
  const user = await requireAuth()

  const post = await prisma.post.findFirst({
    where: { id: postId, type: 'ARTISTRY', authorId: user.id, deletedAt: null },
    select: { id: true, slug: true },
  })
  if (!post) return { ok: false as const, error: 'That artwork no longer exists.' }

  // Soft delete: the slug stays taken, which is what keeps an old link from
  // silently landing on somebody else's piece later.
  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } })

  revalidatePath('/dashboard/artistry')
  revalidatePath('/artistry')
  return { ok: true as const }
}

/** A slug nobody else holds — `Post.slug` is unique across every type. */
async function freeSlug(source: string): Promise<string> {
  const base = slugify(source).slice(0, 80) || 'artwork'

  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`
    const taken = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!taken) return candidate
  }

  return `${base}-${Date.now().toString(36)}`
}
