'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { ALL_POST_TYPES } from '@/config/post-types'

/** §7.11.1.3 — lets an admin approve or reject a post */
export async function approvePostAction(postId: string) {
  const admin = await requirePermission('admin:moderate')

  // An edited post coming back through review keeps its first publish date,
  // so re-approving an old listing does not float it to the top as "new".
  const before = await prisma.post.findUnique({ where: { id: postId }, select: { publishedAt: true } })
  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: 'PUBLISHED',
      publishedAt: before?.publishedAt ?? new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  })

  await prisma.notification.create({
    data: {
      userId: post.authorId,
      type: 'POST_APPROVED',
      title: 'Your posting is now published',
      body: post.title,
      link: publicPathFor(post.type, post.slug),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'POST_APPROVED',
      entityType: 'Post',
      entityId: post.id,
    },
  })

  revalidatePath('/admin/moderation')
  revalidatePath(publicPathFor(post.type, post.slug))
  return { ok: true }
}

export async function rejectPostAction(postId: string, reason: string) {
  const admin = await requirePermission('admin:moderate')

  if (!reason.trim()) {
    return { ok: false, error: 'A reason is required — the user needs to know why.' }
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      status: 'REJECTED',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: reason.trim(),
    },
  })

  await prisma.notification.create({
    data: {
      userId: post.authorId,
      type: 'POST_REJECTED',
      title: 'Your posting was sent back',
      body: `${post.title} — ${reason.trim()}`,
      link: '/dashboard',
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'POST_REJECTED',
      entityType: 'Post',
      entityId: post.id,
      after: { reason: reason.trim() },
    },
  })

  revalidatePath('/admin/moderation')
  return { ok: true }
}

function publicPathFor(type: string, slug: string): string {
  const config = ALL_POST_TYPES.find((c) => c.type === type)
  return config ? `${config.publicPath}/${slug}` : '/'
}

/**
 * The Featured switch on every admin content list (Projects, Products,
 * Artistry, Around Us, Blog). It used to be a drawn toggle with no handler.
 * Only a PUBLISHED post can be featured — featuring something the public
 * cannot see would put an empty slot on the home page.
 */
export async function toggleFeaturedAction(formData: FormData): Promise<void> {
  const admin = await requirePermission('admin:moderate')
  const postId = String(formData.get('postId') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(postId)) return

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, featured: true, status: true, type: true, slug: true },
  })
  if (!post) return
  const next = !post.featured
  if (next && post.status !== 'PUBLISHED') return

  await prisma.$transaction([
    prisma.post.update({ where: { id: post.id }, data: { featured: next } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: next ? 'POST_FEATURED' : 'POST_UNFEATURED',
        entityType: 'Post',
        entityId: post.id,
      },
    }),
  ])
  revalidatePath('/admin', 'layout')
  revalidatePath(publicPathFor(post.type, post.slug))
  revalidatePath('/')
}
