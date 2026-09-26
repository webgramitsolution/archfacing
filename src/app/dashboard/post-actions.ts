'use server'

/**
 * Server actions for content posting — §5.2, §7.4.1, §7.10.
 *
 * ⚠️ Every action performs three checks:
 *   1. Is the user signed in? (requireAuth)
 *   2. Is this role allowed to post this? (§7.4.1 matrix)
 *   3. Is the account verified?
 *
 * What is visible on the client is never trusted — anyone can call an
 * action directly.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma, type PostType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { can } from '@/config/permissions'
import { POST_TYPES, type PostTypeConfig } from '@/config/post-types'
import { uploadFile, deleteUploads } from '@/lib/upload'
import { validateVideoUrl } from '@/lib/video'
import { slugify } from '@/lib/utils'
import { AROUND_US_FREE_PARENTS } from '@/config/taxonomy'
import { findPhoneNumbers, maskPhone, NO_PHONE_MESSAGE } from '@/lib/phone-detect'
import { screenImagesForPhones } from '@/lib/contact-screen'

export type PostState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  postId?: string
}

const baseSchema = z.object({
  title: z.string().trim().min(4, 'Title must be at least 4 characters').max(180),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  category: z.string().trim().min(1, 'Select a category'),
  subCategory: z.string().trim().optional(),
  tertiaryCategory: z.string().trim().optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  state: z.string().trim().min(2, 'Select a state'),
  city: z.string().trim().max(80).optional(),
  year: z.coerce
    .number()
    .int()
    .min(1900, 'Enter a valid year')
    .max(new Date().getFullYear() + 5, 'Enter a valid year'),
  videoUrl: z.string().trim().optional(),
})

function stripEmpty(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (t) out[k] = t
  }
  return out
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** A unique slug from the title — on a collision a number is appended */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 80) || 'post'
  let slug = base
  let n = 1
  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++n}`
  }
  return slug
}

type Uploaded = {
  key: string
  url: string
  sizeBytes: number
  mimeType: string
  width?: number
  height?: number
  fileName: string
  /** §5.2.4.1.2.16 — set on plan drawings so they stay apart from the photos */
  label?: string
}

type Parsed = z.infer<typeof baseSchema>

/**
 * Field validation shared by create and update. `imagesAlready` is how many
 * photos the posting keeps from before (0 on create) — the §7.10.1 min/max
 * applies to what the posting ends up with.
 */
function validateSubmission(
  config: PostTypeConfig,
  raw: Record<string, string>,
  formData: FormData,
  imagesAlready: number
) {
  const parsed = baseSchema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
  }

  // ─── word limit (§5.2.4.1.1.2 and similar) ───
  if (raw.description && countWords(raw.description) > config.maxWords) {
    fieldErrors.description = `Please keep this within ${config.maxWords} words — it currently has ${countWords(raw.description)}.`
  }

  if (config.requiresSubCategory && !raw.subCategory) {
    fieldErrors.subCategory = 'Select a sub-category'
  }

  // ─── video link ───
  let video = null
  if (raw.videoUrl) {
    const v = validateVideoUrl(raw.videoUrl)
    if (!v.ok) fieldErrors.videoUrl = v.error!
    else video = v.video ?? null
  }

  // ─── images ───
  const imageFiles = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0)
  const total = imagesAlready + imageFiles.length
  if (total < config.images.min) {
    fieldErrors.images = `Add at least ${config.images.min} image(s)`
  }
  if (total > config.images.max) {
    fieldErrors.images = `A maximum of ${config.images.max} images is allowed`
  }

  return { fieldErrors, data: parsed.success ? parsed.data : null, video, imageFiles }
}

/** Fields that may legitimately hold digits and are never contact details. */
const PHONE_SAFE_FIELDS = new Set(['pincode', 'year', 'videoUrl', 'category', 'subCategory', 'tertiaryCategory', 'state'])

/**
 * The owner's rule: no phone number anywhere on a listing — not in the text,
 * not printed on an image. Buyers reach sellers through ArchFacing enquiries.
 *
 * The text check runs with the other field checks so every problem shows at
 * once; the (slower) image OCR runs only when the rest of the form is valid.
 */
function phoneTextErrors(raw: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (PHONE_SAFE_FIELDS.has(k)) continue
    const hit = findPhoneNumbers(v)[0]
    if (hit) errors[k] = `${NO_PHONE_MESSAGE} Remove ${maskPhone(hit)}.`
  }
  return errors
}

async function phoneImageErrors(config: PostTypeConfig, formData: FormData, images: File[]): Promise<Record<string, string> | null> {
  // Plan drawings count only on types that take them (uploadSubmission ignores
  // them otherwise). Over the allowed count, skip OCR — the upload step rejects
  // the whole submission right after, so nothing unscreened is stored.
  const plans = config.planImages
    ? formData.getAll('planImages').filter((f): f is File => f instanceof File && f.size > 0)
    : []
  if (config.planImages && plans.length > config.planImages.max) return null
  const bad = await screenImagesForPhones([
    ...images.map((file, i) => ({ file, label: `Image ${i + 1}` })),
    ...plans.map((file, i) => ({ file, label: `Plan drawing ${i + 1}` })),
  ])
  if (bad) {
    const msg = `${bad.label} shows a phone number (${maskPhone(bad.number)}). ${NO_PHONE_MESSAGE} Upload an image without it.`
    return { [bad.label.startsWith('Plan') ? 'planImages' : 'images']: msg }
  }
  return null
}

/** Upload photos, plan drawings and PDF/PPT. Rolls back its own files on failure. */
async function uploadSubmission(
  userId: string,
  config: PostTypeConfig,
  formData: FormData,
  imageFiles: File[],
  raw: Record<string, string>
): Promise<{ ok: true; uploaded: Uploaded[] } | { ok: false; state: PostState }> {
  const uploaded: Uploaded[] = []

  for (const [i, file] of imageFiles.entries()) {
    const res = await uploadFile({ userId, file, kind: 'IMAGE', aspect: config.images.aspect, folder: config.slug })
    if (!res.ok) {
      // Remove whatever was already uploaded and return the quota
      await rollback(userId, uploaded)
      return { ok: false, state: { ok: false, error: `Image ${i + 1}: ${res.error}`, fieldErrors: { images: res.error }, values: raw } }
    }
    uploaded.push({ ...res, fileName: file.name })
  }

  // ─── plan drawings, when the type asks for them ───
  if (config.planImages) {
    const planFiles = formData
      .getAll('planImages')
      .filter((f): f is File => f instanceof File && f.size > 0)

    if (planFiles.length > config.planImages.max) {
      await rollback(userId, uploaded)
      return {
        ok: false,
        state: {
          ok: false,
          error: `Please attach no more than ${config.planImages.max} plan drawings.`,
          fieldErrors: { planImages: `Maximum ${config.planImages.max}` },
          values: raw,
        },
      }
    }

    for (const [i, file] of planFiles.entries()) {
      const res = await uploadFile({ userId, file, kind: 'IMAGE', aspect: config.images.aspect, folder: config.slug })
      if (!res.ok) {
        await rollback(userId, uploaded)
        return { ok: false, state: { ok: false, error: `Plan drawing ${i + 1}: ${res.error}`, fieldErrors: { planImages: res.error }, values: raw } }
      }
      uploaded.push({ ...res, fileName: file.name, label: config.planImages.label })
    }
  }

  // PDF / PPT
  for (const [field, kind] of [
    ['pdf', 'PDF'],
    ['ppt', 'PPT'],
  ] as const) {
    const allowed = kind === 'PDF' ? config.allowPdf : config.allowPpt
    if (!allowed) continue
    const f = formData.get(field)
    if (!(f instanceof File) || f.size === 0) continue

    const res = await uploadFile({ userId, file: f, kind, folder: config.slug })
    if (!res.ok) {
      await rollback(userId, uploaded)
      return { ok: false, state: { ok: false, error: res.error, fieldErrors: { [field]: res.error }, values: raw } }
    }
    uploaded.push({ ...res, fileName: f.name })
  }

  return { ok: true, uploaded }
}

/**
 * Extra fields → meta.
 *
 * A checkbox is read straight from the FormData rather than from `raw`,
 * because an unticked box sends nothing at all and `stripEmpty` would leave no
 * trace of it either way. Its answer lands on a real Post column, not in meta.
 */
function metaFrom(config: PostTypeConfig, raw: Record<string, string>, formData: FormData) {
  const meta: Record<string, unknown> = {}
  const flags: Record<string, boolean> = {}

  for (const f of config.extraFields) {
    if (f.type === 'checkbox') {
      flags[f.name] = formData.get(f.name) !== null
      continue
    }

    /*
     * `list` and `pairs` arrive as a JSON string from their hidden input, so
     * they are parsed back into real arrays before being stored — the public
     * pages read them as arrays. Anything malformed is dropped rather than
     * written through.
     */
    if (f.type === 'list' || f.type === 'pairs') {
      const rawJson = String(formData.get(f.name) ?? '')
      if (!rawJson) continue
      try {
        const parsed: unknown = JSON.parse(rawJson)
        if (!Array.isArray(parsed) || parsed.length === 0) continue
        meta[f.name] =
          f.type === 'list'
            ? parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, f.max ?? 20)
            : parsed
                .filter(
                  (x): x is { label: string; value: string } =>
                    !!x && typeof x === 'object' &&
                    typeof (x as { label?: unknown }).label === 'string' &&
                    typeof (x as { value?: unknown }).value === 'string'
                )
                .slice(0, f.max ?? 20)
      } catch {
        // a tampered payload simply contributes nothing
      }
      continue
    }

    const v = raw[f.name]
    if (!v) continue
    meta[f.name] = f.type === 'number' ? Number(v) : v
  }
  return { meta, flags }
}

/** The Post columns a submission sets — identical for create and update. */
function columnsFrom(config: PostTypeConfig, data: Parsed, meta: Record<string, unknown>, flags: Record<string, boolean>) {
  return {
    title: data.title,
    description: data.description,
    category: data.category,
    subCategory: data.subCategory || null,
    tertiaryCategory: data.subCategory ? data.tertiaryCategory || null : null,
    pincode: data.pincode,
    city: data.city || null,
    state: data.state,
    year: data.year,
    // §5.2.4.1 — Social Welfare under Around Us is free; everything else is paid
    isPaidCategory: config.type === 'AROUND_US' && !AROUND_US_FREE_PARENTS.includes(data.category),

    // Some competition fields live directly on Post
    prizeMoney: meta.prizeMoney ? new Prisma.Decimal(Number(meta.prizeMoney)) : null,
    submissionDeadline: meta.submissionDeadline ? new Date(String(meta.submissionDeadline)) : null,
    juryRequired: meta.juryRequired ? Number(meta.juryRequired) : null,
    // §5.2.4.1.2.1 and .18 — visibility and the DA request are columns,
    // because the listing filters read them.
    ...(config.type === 'DESIGN_COMPETITION'
      ? {
          visibleToDesigna: flags.visibleToDesigna ?? true,
          visibleToDesigni: flags.visibleToDesigni ?? true,
          needsDesignAssociate: flags.needsDesignAssociate ?? false,
        }
      : {}),
    eventDate: meta.eventDate ? new Date(String(meta.eventDate)) : null,
    venue: meta.venue ? String(meta.venue) : null,
    entryFee: meta.entryFee ? new Prisma.Decimal(Number(meta.entryFee)) : null,
    attendeeCount: meta.attendeeCount ? Number(meta.attendeeCount) : null,
    reportedBy: meta.reportedBy ? String(meta.reportedBy) : null,
    writtenBy: meta.writtenBy ? String(meta.writtenBy) : null,
    referenceUrl: meta.referenceUrl ? String(meta.referenceUrl) : null,
  }
}

function mediaRows(uploaded: Uploaded[], startAt: number) {
  return uploaded.map((u, i) => ({
    type: (u.mimeType === 'application/pdf' ? 'PDF' : u.mimeType.startsWith('image/') ? 'IMAGE' : 'PPT') as 'IMAGE' | 'PDF' | 'PPT',
    url: u.url,
    storageKey: u.key,
    fileName: u.fileName,
    label: u.label ?? null,
    mimeType: u.mimeType,
    sizeBytes: u.sizeBytes,
    width: u.width,
    height: u.height,
    sortOrder: startAt + i,
  }))
}

function videoRow(video: NonNullable<ReturnType<typeof validateVideoUrl>['video']>) {
  return {
    type: 'VIDEO_LINK' as const,
    url: video.url,
    thumbnailUrl: video.thumbnailUrl,
    embedUrl: video.embedUrl,
    videoHost: (video.host === 'youtube' ? 'YOUTUBE' : 'DAILYMOTION') as 'YOUTUBE' | 'DAILYMOTION',
    videoId: video.videoId,
    fileName: `${video.host}-${video.videoId}`,
    mimeType: 'text/uri-list',
    sizeBytes: 0,
    sortOrder: 100,
  }
}

// ═══════════════════════════════════════════════════════════
//  Creating a new post
// ═══════════════════════════════════════════════════════════

export async function createPostAction(
  postTypeKey: string,
  _prev: PostState | null,
  formData: FormData
): Promise<PostState> {
  const config = POST_TYPES[postTypeKey]
  if (!config) return { ok: false, error: 'That posting type does not exist.' }

  const user = await requireAuth()

  // ─── §7.4.1 — is this role allowed? ───
  if (!can(user.role, config.permission)) {
    return { ok: false, error: `Your membership category cannot post ${config.label}.` }
  }
  if (user.status !== 'ACTIVE') {
    return { ok: false, error: 'Your account is still under verification. Posting opens once the review is complete.' }
  }

  const raw = stripEmpty(formData)
  const { fieldErrors, data, video, imageFiles } = validateSubmission(config, raw, formData, 0)
  Object.assign(fieldErrors, await categoryPathErrors(config, raw))
  const phoneText = phoneTextErrors(raw)
  Object.assign(fieldErrors, phoneText)
  if (Object.keys(fieldErrors).length || !data) {
    return {
      ok: false,
      error: Object.keys(phoneText).length ? 'This listing contains a phone number, so it cannot be submitted.' : 'Some fields need to be corrected.',
      fieldErrors, values: raw,
    }
  }

  const contact = await phoneImageErrors(config, formData, imageFiles)
  if (contact) {
    return { ok: false, error: 'This listing contains a phone number, so it cannot be submitted.', fieldErrors: contact, values: raw }
  }

  const up = await uploadSubmission(user.id, config, formData, imageFiles, raw)
  if (!up.ok) return up.state
  const { meta, flags } = metaFrom(config, raw, formData)

  try {
    const post = await prisma.post.create({
      data: {
        type: config.type,
        // Every posting goes through review first — the platform is legally
        // accountable for what it publishes
        status: 'PENDING_REVIEW',
        authorId: user.id,
        slug: await uniqueSlug(data.title),
        meta: Object.keys(meta).length ? (meta as Prisma.InputJsonValue) : undefined,
        ...columnsFrom(config, data, meta, flags),
        media: { create: [...mediaRows(up.uploaded, 0), ...(video ? [videoRow(video)] : [])] },
      },
    })

    revalidatePath('/dashboard')
    revalidatePath(config.publicPath)
    return { ok: true, postId: post.id }
  } catch (e) {
    await rollback(user.id, up.uploaded)
    console.error('Post create fail:', e)
    return { ok: false, error: 'Your post could not be saved. Please try again.', values: raw }
  }
}

// ═══════════════════════════════════════════════════════════
//  §5.2.13 — Editing a post
// ═══════════════════════════════════════════════════════════

/**
 * The author edits their own posting. It goes back to review, because what
 * the moderators approved is no longer what would be published. Photos the
 * author ticks for removal are deleted with their files; new photos are
 * appended; the slug never changes, so shared links keep working.
 */
export async function updatePostAction(
  postId: string,
  _prev: PostState | null,
  formData: FormData
): Promise<PostState> {
  const user = await requireAuth()
  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: user.id, deletedAt: null },
    include: { media: true },
  })
  if (!post) return { ok: false, error: 'This posting does not belong to your account.' }
  const config = POST_TYPES[post.type]
  if (!config) return { ok: false, error: 'This posting cannot be edited here.' }
  if (!can(user.role, config.permission)) {
    return { ok: false, error: `Your membership category cannot post ${config.label}.` }
  }

  const raw = stripEmpty(formData)
  const removeIds = new Set(formData.getAll('removeMedia').map(String))
  const removing = post.media.filter((m) => removeIds.has(m.id))
  const mediaPhotos = post.media.filter((m) => m.type === 'IMAGE' && !m.label).length
  const pm = (post.meta && typeof post.meta === 'object' && !Array.isArray(post.meta) ? post.meta : {}) as Record<string, unknown>
  const metaPhotos = mediaPhotos ? 0 : Array.isArray(pm.gallery) ? pm.gallery.length : pm.coverImage ? 1 : 0
  const keptPhotos = post.media.filter((m) => m.type === 'IMAGE' && !m.label && !removeIds.has(m.id)).length + metaPhotos

  const { fieldErrors, data, video, imageFiles } = validateSubmission(config, raw, formData, keptPhotos)
  Object.assign(fieldErrors, await categoryPathErrors(config, raw))
  const phoneText = phoneTextErrors(raw)
  Object.assign(fieldErrors, phoneText)
  if (Object.keys(fieldErrors).length || !data) {
    return {
      ok: false,
      error: Object.keys(phoneText).length ? 'This listing contains a phone number, so it cannot be submitted.' : 'Some fields need to be corrected.',
      fieldErrors, values: raw,
    }
  }

  const contact = await phoneImageErrors(config, formData, imageFiles)
  if (contact) {
    return { ok: false, error: 'This listing contains a phone number, so it cannot be submitted.', fieldErrors: contact, values: raw }
  }

  const up = await uploadSubmission(user.id, config, formData, imageFiles, raw)
  if (!up.ok) return up.state
  const { meta, flags } = metaFrom(config, raw, formData)
  // Keep meta keys the form does not own (e.g. counters written elsewhere).
  const owned = new Set(config.extraFields.map((f) => f.name))
  const oldMeta = (post.meta && typeof post.meta === 'object' && !Array.isArray(post.meta) ? post.meta : {}) as Record<string, unknown>
  const mergedMeta = { ...Object.fromEntries(Object.entries(oldMeta).filter(([k]) => !owned.has(k))), ...meta }

  const oldVideo = post.media.find((m) => m.type === 'VIDEO_LINK')
  const maxSort = post.media.filter((m) => m.type !== 'VIDEO_LINK').reduce((n, m) => Math.max(n, m.sortOrder), -1)

  try {
    await prisma.$transaction(async (tx) => {
      if (removing.length || oldVideo) {
        await tx.media.deleteMany({ where: { id: { in: [...removing.map((m) => m.id), ...(oldVideo ? [oldVideo.id] : [])] } } })
      }
      await tx.post.update({
        where: { id: post.id },
        data: {
          ...columnsFrom(config, data, meta, flags),
          meta: Object.keys(mergedMeta).length ? (mergedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
          status: 'PENDING_REVIEW',
          rejectionReason: null,
          media: { create: [...mediaRows(up.uploaded, maxSort + 1), ...(video ? [videoRow(video)] : [])] },
        },
      })
    })
  } catch (e) {
    await rollback(user.id, up.uploaded)
    console.error('Post update fail:', e)
    return { ok: false, error: 'Your changes could not be saved. Please try again.', values: raw }
  }

  const files = removing.filter((m) => m.storageKey)
  if (files.length) {
    await deleteUploads(user.id, files.map((m) => m.storageKey!), files.reduce((s, m) => s + m.sizeBytes, 0))
  }
  revalidatePath('/dashboard')
  revalidatePath(config.publicPath)
  revalidatePath(`${config.publicPath}/${post.slug}`)
  return { ok: true, postId: post.id }
}

async function rollback(
  userId: string,
  uploaded: { key: string; sizeBytes: number }[]
) {
  if (!uploaded.length) return
  await deleteUploads(
    userId,
    uploaded.map((u) => u.key),
    uploaded.reduce((s, u) => s + u.sizeBytes, 0)
  )
}

// ═══════════════════════════════════════════════════════════
//  My postings
// ═══════════════════════════════════════════════════════════

export async function myPosts(type?: PostType) {
  const user = await requireAuth()
  return prisma.post.findMany({
    where: { authorId: user.id, deletedAt: null, ...(type ? { type } : {}) },
    include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
}

/** §5.2.13 — remove your own posting (soft delete; the files go too) */
export async function deletePostAction(postId: string) {
  const user = await requireAuth()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: true },
  })
  if (!post || post.authorId !== user.id) {
    return { ok: false, error: 'This posting does not belong to your account.' }
  }

  const files = post.media.filter((m) => m.storageKey)
  await deleteUploads(
    user.id,
    files.map((m) => m.storageKey!),
    files.reduce((s, m) => s + m.sizeBytes, 0)
  )

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  })

  revalidatePath('/dashboard')
  return { ok: true }
}

/** Duplicate a posting as a fresh DRAFT the author can edit and re-submit. */
export async function duplicatePostAction(postId: string) {
  const user = await requireAuth()
  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: user.id, deletedAt: null },
  })
  if (!post) return { ok: false, error: 'This posting does not belong to your account.' }

  const baseSlug = `${post.slug}-copy`.slice(0, 80)
  let slug = baseSlug
  for (let i = 2; await prisma.post.findFirst({ where: { slug }, select: { id: true } }); i++) {
    slug = `${baseSlug}-${i}`
  }

  await prisma.post.create({
    data: {
      authorId: user.id,
      type: post.type,
      title: `${post.title} (Copy)`.slice(0, 180),
      slug,
      description: post.description,
      category: post.category,
      subCategory: post.subCategory,
      city: post.city,
      state: post.state,
      pincode: post.pincode,
      year: post.year,
      meta: post.meta ?? Prisma.JsonNull,
      status: 'DRAFT',
    },
  })

  revalidatePath('/dashboard')
  return { ok: true }
}

/** Move a posting to a new lifecycle status (archive / restore). */
export async function setPostStatusAction(postId: string, status: 'ARCHIVED' | 'DRAFT') {
  const user = await requireAuth()
  // The type above is not enforced at runtime — a client could send
  // 'PUBLISHED' and skip moderation. Only archive / restore-to-draft is allowed.
  if (status !== 'ARCHIVED' && status !== 'DRAFT') return { ok: false, error: 'That status change is not allowed.' }
  const post = await prisma.post.findFirst({ where: { id: postId, authorId: user.id, deletedAt: null }, select: { id: true } })
  if (!post) return { ok: false, error: 'This posting does not belong to your account.' }
  await prisma.post.update({ where: { id: postId }, data: { status } })
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Toggle a posting's "featured" flag from the listing table. */
export async function setFeaturedAction(postId: string, featured: boolean) {
  const user = await requireAuth()
  const post = await prisma.post.findFirst({ where: { id: postId, authorId: user.id, deletedAt: null }, select: { id: true } })
  if (!post) return { ok: false, error: 'This posting does not belong to your account.' }
  await prisma.post.update({ where: { id: postId }, data: { featured } })
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Categories for the form — Primary → Secondary → Tertiary, from the DB. */
export async function categoriesFor(config: PostTypeConfig) {
  const roots = await prisma.category.findMany({
    where: { type: config.categorySource, parentId: null, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  })
  return roots
}

/**
 * The picked slugs must be a real path in the tree: the secondary a child of
 * the primary, the tertiary a child of the secondary. A hand-edited form can
 * otherwise file a post under a branch that does not exist.
 */
async function categoryPathErrors(config: PostTypeConfig, raw: Record<string, string>) {
  const errors: Record<string, string> = {}
  if (!raw.category) return errors
  const root = await prisma.category.findFirst({
    where: { type: config.categorySource, parentId: null, slug: raw.category, isActive: true },
    select: { id: true },
  })
  if (!root) return { category: 'Select a category from the list' }
  if (!raw.subCategory) return errors
  const sub = await prisma.category.findFirst({
    where: { type: config.categorySource, parentId: root.id, slug: raw.subCategory, isActive: true },
    select: { id: true, _count: { select: { children: { where: { isActive: true } } } } },
  })
  if (!sub) return { subCategory: 'That secondary category is not under the chosen primary' }
  if (raw.tertiaryCategory) {
    const leaf = await prisma.category.findFirst({
      where: { type: config.categorySource, parentId: sub.id, slug: raw.tertiaryCategory, isActive: true },
      select: { id: true },
    })
    if (!leaf) errors.tertiaryCategory = 'That tertiary category is not under the chosen secondary'
  } else if (sub._count.children > 0) {
    errors.tertiaryCategory = 'Select a tertiary category'
  }
  return errors
}
