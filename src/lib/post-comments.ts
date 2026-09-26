import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { findPhoneNumbers } from '@/lib/phone-detect'

/**
 * Public comments on a post — the Artistry page today.
 *
 * Anyone signed in may comment. The author of a comment, the owner of the
 * post, and staff may remove it (soft delete). Text passes the same
 * no-phone-number rule as listings, so contact details cannot leak here.
 */

export const COMMENT_MIN = 2
export const COMMENT_MAX = 1000

const STAFF: Role[] = ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE']

const ROLE_WORD: Partial<Record<Role, string>> = {
  PROFESSIONAL: 'Professional',
  CONSULTANT: 'Consultant',
  BMF: 'BMF',
  CORPORATE: 'Corporate',
  CLIENT: 'Member',
  SUPER_ADMIN: 'ArchFacing',
  ADMIN: 'ArchFacing',
  RM_EMPLOYEE: 'ArchFacing',
  ADMIN_SELLER: 'ArchFacing',
  EXTERNAL_ADVERTISER: 'Advertiser',
}

export type CommentView = {
  id: string
  name: string
  role: string
  photo: string | null
  /** ISO — formatted by the page. */
  createdAt: string
  body: string
  canDelete: boolean
}

export class CommentError extends Error {}

export async function listComments(
  postId: string,
  viewer: { id?: string; role?: Role } = {},
  { oldestFirst = false }: { oldestFirst?: boolean } = {}
): Promise<CommentView[]> {
  const [rows, post] = await Promise.all([
    prisma.postComment.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: oldestFirst ? 'asc' : 'desc' },
      take: 200,
      select: {
        id: true, body: true, createdAt: true, userId: true,
        user: { select: { name: true, role: true, profilePhoto: true } },
      },
    }),
    prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
  ])
  const staff = viewer.role ? STAFF.includes(viewer.role) : false
  return rows.map((c) => ({
    id: c.id,
    name: c.user.name ?? 'Member',
    role: ROLE_WORD[c.user.role] ?? '',
    photo: c.user.profilePhoto,
    createdAt: c.createdAt.toISOString(),
    body: c.body,
    canDelete: Boolean(viewer.id) && (viewer.id === c.userId || viewer.id === post?.authorId || staff),
  }))
}

export async function addComment(userId: string, postId: string, raw: string): Promise<void> {
  const body = raw.replace(/\s+\n/g, '\n').trim()
  if (body.length < COMMENT_MIN) throw new CommentError('Write a little more before posting.')
  if (body.length > COMMENT_MAX) throw new CommentError(`Keep it under ${COMMENT_MAX} characters.`)
  if (findPhoneNumbers(body).length) {
    throw new CommentError('Phone numbers are not allowed in comments — members reach each other through ArchFacing.')
  }

  const post = await prisma.post.findFirst({
    where: { id: postId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, authorId: true, title: true, slug: true, type: true },
  })
  if (!post) throw new CommentError('This post is not open for comments.')

  // A light flood guard: ten comments per member per post per hour.
  const recent = await prisma.postComment.count({
    where: { userId, postId, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  })
  if (recent >= 10) throw new CommentError('You have posted a lot here — try again in a while.')

  await prisma.postComment.create({ data: { userId, postId, body } })

  if (post.authorId !== userId) {
    const who = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: 'POST_COMMENT',
        title: 'New comment on your post',
        body: `${who?.name ?? 'A member'} commented on “${post.title}”.`,
        link: post.type === 'ARTISTRY' ? `/artistry/${post.slug}#comments` : null,
      },
    })
  }
}

export async function deleteComment(
  viewer: { id: string; role?: Role },
  commentId: string
): Promise<{ postId: string }> {
  const c = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, postId: true, deletedAt: true, post: { select: { authorId: true } } },
  })
  if (!c || c.deletedAt) throw new CommentError('That comment is already gone.')
  const staff = viewer.role ? STAFF.includes(viewer.role) : false
  if (c.userId !== viewer.id && c.post.authorId !== viewer.id && !staff) {
    throw new CommentError('You cannot remove this comment.')
  }
  await prisma.postComment.update({ where: { id: c.id }, data: { deletedAt: new Date() } })
  return { postId: c.postId }
}
