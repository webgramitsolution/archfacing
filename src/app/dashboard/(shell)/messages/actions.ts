'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { conversationThread, type ThreadMessage } from '@/lib/chat'

export type SendState = { ok: boolean; error?: string }

/** Load one thread for the reader (used when they pick a conversation). */
export async function loadThreadAction(conversationId: string): Promise<{
  ok: boolean
  messages?: ThreadMessage[]
  error?: string
}> {
  const me = await requireAuth()
  const t = await conversationThread(me.id, conversationId)
  if (!t) return { ok: false, error: 'Conversation not found.' }

  // Opening a thread marks the other side's messages read.
  await prisma.chatMessage.updateMany({
    where: { conversationId, NOT: { senderId: me.id }, readAt: null },
    data: { readAt: new Date() },
  })

  return { ok: true, messages: t.messages }
}

/** Post a reply into a conversation the reader is part of. */
export async function sendMessageAction(conversationId: string, body: string): Promise<SendState> {
  const me = await requireAuth()
  const text = body.trim().slice(0, 4000)
  if (!text) return { ok: false, error: 'Type a message first.' }

  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { starterId: true, ownerId: true, subject: true },
  })
  if (!c || (c.starterId !== me.id && c.ownerId !== me.id)) {
    return { ok: false, error: 'Conversation not found.' }
  }

  const otherId = c.starterId === me.id ? c.ownerId : c.starterId

  await prisma.$transaction([
    prisma.chatMessage.create({ data: { conversationId, senderId: me.id, body: text } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])

  await prisma.notification
    .create({
      data: {
        userId: otherId,
        type: 'NEW_MESSAGE',
        title: `New message from ${me.name ?? 'a member'}`,
        body: text.length > 120 ? `${text.slice(0, 120)}…` : text,
        link: '/dashboard/messages',
      },
    })
    .catch(() => {})

  revalidatePath('/dashboard/messages')
  return { ok: true }
}

/** Mark every message in a thread read (the "Mark All as Read" header button). */
export async function markAllReadAction(): Promise<SendState> {
  const me = await requireAuth()
  await prisma.chatMessage.updateMany({
    where: {
      NOT: { senderId: me.id },
      readAt: null,
      conversation: { OR: [{ starterId: me.id }, { ownerId: me.id }] },
    },
    data: { readAt: new Date() },
  })
  revalidatePath('/dashboard/messages')
  return { ok: true }
}

/** Archive / restore a conversation — per side, so the other person keeps theirs. */
export async function setArchivedAction(conversationId: string, archived: boolean): Promise<SendState> {
  const me = await requireAuth()
  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { starterId: true, ownerId: true },
  })
  if (!c || (c.starterId !== me.id && c.ownerId !== me.id)) {
    return { ok: false, error: 'Conversation not found.' }
  }
  await prisma.conversation.update({
    where: { id: conversationId },
    data: c.starterId === me.id ? { starterArchived: archived } : { ownerArchived: archived },
  })
  revalidatePath('/dashboard/messages')
  return { ok: true }
}

/**
 * Open (or re-open) the chat for a post — what the public "Chat Now" /
 * "Contact" buttons on Artistry and Around Us call.
 *
 * The unique key on (starter, owner, post) means clicking Chat twice lands in
 * the same thread instead of creating a second one.
 */
export async function startPostChatAction(postId: string): Promise<{ ok: boolean; error?: string; conversationId?: string }> {
  const me = await requireAuth()

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, title: true, type: true, authorId: true },
  })
  if (!post) return { ok: false, error: 'That post no longer exists.' }
  if (post.authorId === me.id) return { ok: false, error: 'This is your own post.' }

  const source = post.type === 'AROUND_US' ? 'AROUND_US' : 'ARTISTRY'

  const existing = await prisma.conversation.findFirst({
    where: { starterId: me.id, ownerId: post.authorId, postId: post.id },
    select: { id: true },
  })

  if (existing) {
    // Un-archive on the reader's side so re-opening brings it back.
    await prisma.conversation.update({
      where: { id: existing.id },
      data: { starterArchived: false },
    })
    revalidatePath('/dashboard/messages')
    return { ok: true, conversationId: existing.id }
  }

  const created = await prisma.conversation.create({
    data: {
      starterId: me.id,
      ownerId: post.authorId,
      postId: post.id,
      subject: post.title,
      source,
    },
    select: { id: true },
  })

  revalidatePath('/dashboard/messages')
  return { ok: true, conversationId: created.id }
}
