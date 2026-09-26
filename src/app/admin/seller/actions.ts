'use server'

/**
 * Admin-Seller panel — §9.2 Merchandise and §9.12 Podcast.
 *
 * This is the panel that was requested: admin-seller in the dropdown,
 * from where Merchandise and Podcast entries are posted.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma, type OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { uploadFile } from '@/lib/upload'
import { validateVideoUrl } from '@/lib/video'
import { slugify } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════
//  Merchandise
// ═══════════════════════════════════════════════════════════

const variantSchema = z.object({
  label: z.string().trim().max(60).optional(),
  price: z.coerce.number().min(1, 'Enter a price'),
  mrp: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0),
})

const merchSchema = z.object({
  title: z.string().trim().min(3, 'Name must be at least 3 characters').max(180),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  category: z.string().trim().min(1, 'Select a category'),
  taxPercent: z.coerce.number().min(0).max(28).default(12),
})

export type SellerState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  createdSlug?: string
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 70) || 'item'
  let slug = base
  let n = 1
  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++n}`
  }
  return slug
}

export async function createMerchandiseAction(
  _prev: SellerState | null,
  formData: FormData
): Promise<SellerState> {
  const seller = await requirePermission('seller:merchandise')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }

  const parsed = merchSchema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form')
      fieldErrors[key] ??= i.message
    }
  }

  // ─── variants ─── (variant-0-label, variant-0-price …)
  const rows: { label?: string; price: number; mrp?: number; stock: number }[] = []
  for (let i = 0; i < 8; i++) {
    const price = raw[`variant-${i}-price`]
    if (!price) continue
    const v = variantSchema.safeParse({
      label: raw[`variant-${i}-label`],
      price,
      mrp: raw[`variant-${i}-mrp`],
      stock: raw[`variant-${i}-stock`] ?? '0',
    })
    if (!v.success) {
      fieldErrors[`variant-${i}-price`] = v.error.issues[0]?.message ?? 'Invalid'
      continue
    }
    rows.push(v.data)
  }

  if (rows.length === 0) {
    fieldErrors.variants = 'Enter at least one price and stock quantity'
  }

  const images = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (images.length === 0) fieldErrors.images = 'At least one image is required'

  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: 'Some fields need to be corrected.', fieldErrors, values: raw }
  }

  const d = parsed.data!

  // images — merchandise looks square, but §7.10.1 requires landscape,
  // so we keep the same 5:3 rule and crop it in the card
  const uploaded = []
  for (const [i, file] of images.entries()) {
    const res = await uploadFile({
      userId: seller.id,
      file,
      kind: 'IMAGE',
      aspect: 'default',
      folder: 'merchandise',
    })
    if (!res.ok) {
      return {
        ok: false,
        error: `Image ${i + 1}: ${res.error}`,
        fieldErrors: { images: res.error },
        values: raw,
      }
    }
    uploaded.push({ ...res, fileName: file.name })
  }

  const slug = await uniqueSlug(d.title)

  try {
    await prisma.post.create({
      data: {
        type: 'MERCHANDISE',
        // The seller is ArchFacing's own team, so publish directly
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: seller.id,
        title: d.title,
        slug,
        description: d.description,
        category: d.category,
        year: new Date().getFullYear(),
        media: {
          create: uploaded.map((u, i) => ({
            type: 'IMAGE' as const,
            url: u.url,
            storageKey: u.key,
            fileName: u.fileName,
            mimeType: u.mimeType,
            sizeBytes: u.sizeBytes,
            width: u.width,
            height: u.height,
            sortOrder: i,
          })),
        },
        variants: {
          create: rows.map((v, i) => ({
            sku: `AF-${slug.slice(0, 20).toUpperCase()}-${i + 1}`,
            label: v.label || null,
            price: new Prisma.Decimal(v.price),
            mrp: v.mrp ? new Prisma.Decimal(v.mrp) : null,
            taxPercent: new Prisma.Decimal(d.taxPercent),
            stock: v.stock,
            sortOrder: i,
          })),
        },
      },
    })

    revalidatePath('/merchandise')
    revalidatePath('/admin/seller')
    return { ok: true, createdSlug: slug }
  } catch (e) {
    console.error('Merchandise create fail:', e)
    return { ok: false, error: 'Could not save. Please try again.', values: raw }
  }
}

export async function updateStockAction(variantId: string, stock: number) {
  await requirePermission('seller:merchandise')
  if (stock < 0) return { ok: false, error: 'Stock cannot be negative.' }

  await prisma.merchandiseVariant.update({
    where: { id: variantId },
    data: { stock },
  })
  revalidatePath('/admin/seller')
  revalidatePath('/merchandise')
  return { ok: true }
}

export async function toggleProductAction(postId: string, publish: boolean) {
  await requirePermission('seller:merchandise')
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: publish ? 'PUBLISHED' : 'ARCHIVED',
      publishedAt: publish ? new Date() : undefined,
    },
  })
  revalidatePath('/admin/seller')
  revalidatePath('/merchandise')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Podcast — §9.12
// ═══════════════════════════════════════════════════════════

const podcastSchema = z.object({
  title: z.string().trim().min(3, 'Enter a title').max(180),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  category: z.string().trim().min(1, 'Select a category'),
  videoUrl: z.string().trim().min(1, 'Enter a YouTube or Dailymotion link'),
  guestName: z.string().trim().max(120).optional(),
  episodeNumber: z.coerce.number().int().min(1).optional(),
})

export async function createPodcastAction(
  _prev: SellerState | null,
  formData: FormData
): Promise<SellerState> {
  const seller = await requirePermission('seller:podcast')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }

  const parsed = podcastSchema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form')
      fieldErrors[key] ??= i.message
    }
  }

  const video = raw.videoUrl ? validateVideoUrl(raw.videoUrl) : null
  if (raw.videoUrl && video && !video.ok) {
    fieldErrors.videoUrl = video.error!
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: 'Some fields need to be corrected.', fieldErrors, values: raw }
  }

  const d = parsed.data!
  const v = video!.video!
  const slug = await uniqueSlug(d.title)

  try {
    await prisma.post.create({
      data: {
        type: 'PODCAST',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: seller.id,
        title: d.title,
        slug,
        description: d.description,
        category: d.category,
        year: new Date().getFullYear(),
        meta: {
          ...(d.guestName ? { guestName: d.guestName } : {}),
          ...(d.episodeNumber ? { episodeNumber: d.episodeNumber } : {}),
        },
        media: {
          create: [
            {
              type: 'VIDEO_LINK',
              url: v.url,
              embedUrl: v.embedUrl,
              thumbnailUrl: v.thumbnailUrl,
              videoHost: v.host === 'youtube' ? 'YOUTUBE' : 'DAILYMOTION',
              videoId: v.videoId,
              fileName: `${v.host}-${v.videoId}`,
              mimeType: 'text/uri-list',
              sizeBytes: 0,
              sortOrder: 0,
            },
          ],
        },
      },
    })

    revalidatePath('/podcast')
    revalidatePath('/admin/seller')
    return { ok: true, createdSlug: slug }
  } catch (e) {
    console.error('Podcast create fail:', e)
    return { ok: false, error: 'Could not save. Please try again.', values: raw }
  }
}

// ═══════════════════════════════════════════════════════════
//  Orders
// ═══════════════════════════════════════════════════════════

export async function listOrders() {
  await requirePermission('seller:merchandise')
  return prisma.order.findMany({
    include: {
      items: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

const FLOW: Record<string, OrderStatus[]> = {
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
}

export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string
) {
  const admin = await requirePermission('seller:merchandise')

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, userId: true, orderNumber: true,
      items: { select: { variantId: true, quantity: true } },
    },
  })
  if (!order) return { ok: false, error: 'Order not found.' }

  // ★ an order cannot move backwards — SHIPPED cannot return to PAID
  const allowed = FLOW[order.status] ?? []
  if (!allowed.includes(status)) {
    return {
      ok: false,
      error: `Cannot move from ${order.status} to ${status}.`,
    }
  }

  // Cancelling puts every line's stock back on the shelf (via its exact
  // variantId), so a cancelled order does not silently swallow inventory.
  const restock =
    status === 'CANCELLED'
      ? order.items.map((it) =>
          prisma.merchandiseVariant.updateMany({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          })
        )
      : []

  await prisma.$transaction([
    ...restock,
    prisma.order.update({
      where: { id: orderId },
      data: { status, ...(trackingNumber ? { trackingNumber } : {}) },
    }),
    prisma.notification.create({
      data: {
        userId: order.userId,
        type: `ORDER_${status}`,
        title:
          status === 'SHIPPED'
            ? 'Your order has been shipped'
            : status === 'DELIVERED'
              ? 'Your order has been delivered'
              : status === 'CANCELLED'
                ? 'Your order has been cancelled'
                : 'Your order is being prepared',
        body: `${order.orderNumber}${trackingNumber ? ` · tracking ${trackingNumber}` : ''}`,
        link: '/dashboard/orders',
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: `ORDER_${status}`,
        entityType: 'Order',
        entityId: orderId,
      },
    }),
  ])

  revalidatePath('/admin/seller/orders')
  return { ok: true }
}

export async function sellerCatalogue() {
  await requirePermission('seller:merchandise')
  return prisma.post.findMany({
    where: { type: 'MERCHANDISE', deletedAt: null },
    include: {
      variants: { orderBy: { sortOrder: 'asc' } },
      media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** One product with all its variants + images — for the detail page. */
export async function sellerProduct(id: string) {
  await requirePermission('seller:merchandise')
  return prisma.post.findFirst({
    where: { id, type: 'MERCHANDISE', deletedAt: null },
    include: {
      variants: { orderBy: { sortOrder: 'asc' } },
      media: { where: { type: 'IMAGE' }, orderBy: { sortOrder: 'asc' } },
    },
  })
}

// ─── Variation management (add / update / delete) ───────────

export async function addVariantAction(
  postId: string,
  data: { label?: string; price: number; mrp?: number; stock: number; taxPercent?: number }
) {
  await requirePermission('seller:merchandise')
  const post = await prisma.post.findFirst({ where: { id: postId, type: 'MERCHANDISE' }, select: { slug: true, _count: { select: { variants: true } } } })
  if (!post) return { ok: false, error: 'Product not found.' }
  if (!data.price || data.price < 1) return { ok: false, error: 'Enter a valid price.' }

  const n = post._count.variants + 1
  try {
    await prisma.merchandiseVariant.create({
      data: {
        postId,
        sku: `AF-${post.slug.slice(0, 20).toUpperCase()}-${n}-${randomSuffix()}`,
        label: data.label?.trim() || null,
        price: new Prisma.Decimal(data.price),
        mrp: data.mrp ? new Prisma.Decimal(data.mrp) : null,
        taxPercent: new Prisma.Decimal(data.taxPercent ?? 12),
        stock: Math.max(0, Math.floor(data.stock ?? 0)),
        sortOrder: n,
      },
    })
    revalidatePath(`/admin/seller/products/${postId}`)
    revalidatePath('/merchandise')
    return { ok: true }
  } catch (e) {
    console.error('Add variant fail:', e)
    return { ok: false, error: 'Could not add the variation.' }
  }
}

export async function updateVariantAction(
  variantId: string,
  data: { label?: string; price: number; mrp?: number; stock: number; isActive: boolean }
) {
  await requirePermission('seller:merchandise')
  if (!data.price || data.price < 1) return { ok: false, error: 'Enter a valid price.' }
  const v = await prisma.merchandiseVariant.update({
    where: { id: variantId },
    data: {
      label: data.label?.trim() || null,
      price: new Prisma.Decimal(data.price),
      mrp: data.mrp ? new Prisma.Decimal(data.mrp) : null,
      stock: Math.max(0, Math.floor(data.stock ?? 0)),
      isActive: data.isActive,
    },
    select: { postId: true },
  })
  revalidatePath(`/admin/seller/products/${v.postId}`)
  revalidatePath('/merchandise')
  return { ok: true }
}

export async function deleteVariantAction(variantId: string) {
  await requirePermission('seller:merchandise')
  const v = await prisma.merchandiseVariant.findUnique({ where: { id: variantId }, select: { postId: true } })
  if (!v) return { ok: false, error: 'Not found.' }
  const count = await prisma.merchandiseVariant.count({ where: { postId: v.postId } })
  if (count <= 1) return { ok: false, error: 'A product needs at least one variation.' }
  await prisma.merchandiseVariant.delete({ where: { id: variantId } })
  revalidatePath(`/admin/seller/products/${v.postId}`)
  revalidatePath('/merchandise')
  return { ok: true }
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

// ═══════════════════════════════════════════════════════════
//  Coupons — Seller Studio discount codes
// ═══════════════════════════════════════════════════════════

export async function listCoupons() {
  await requirePermission('seller:merchandise')
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createCouponAction(data: {
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minOrder?: number
  maxDiscount?: number
  usageLimit?: number
  expiresAt?: string
}) {
  const admin = await requirePermission('seller:merchandise')
  const code = data.code.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, error: 'Code must be 3–20 letters/numbers, no spaces.' }
  if (!data.value || data.value <= 0) return { ok: false, error: 'Enter a discount value.' }
  if (data.type === 'PERCENT' && data.value > 90) return { ok: false, error: 'Percentage cannot exceed 90%.' }

  try {
    await prisma.coupon.create({
      data: {
        code,
        type: data.type,
        value: new Prisma.Decimal(data.value),
        minOrder: data.minOrder ? new Prisma.Decimal(data.minOrder) : null,
        maxDiscount: data.type === 'PERCENT' && data.maxDiscount ? new Prisma.Decimal(data.maxDiscount) : null,
        usageLimit: data.usageLimit && data.usageLimit > 0 ? Math.floor(data.usageLimit) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdById: admin.id,
      },
    })
    revalidatePath('/admin/seller/coupons')
    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'A coupon with this code already exists.' }
    }
    console.error('Coupon create fail:', e)
    return { ok: false, error: 'Could not create the coupon.' }
  }
}

export async function toggleCouponAction(id: string, isActive: boolean) {
  await requirePermission('seller:merchandise')
  await prisma.coupon.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/seller/coupons')
  return { ok: true }
}

export async function deleteCouponAction(id: string) {
  await requirePermission('seller:merchandise')
  await prisma.coupon.delete({ where: { id } })
  revalidatePath('/admin/seller/coupons')
  return { ok: true }
}
