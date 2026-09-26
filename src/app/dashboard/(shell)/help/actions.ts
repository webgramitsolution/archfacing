'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'

export type TicketState = { ok: boolean; error?: string; ref?: string }

/**
 * Raise a support ticket. Writes the ticket and drops the member a
 * notification acknowledging it — the same record the "My Tickets" page lists
 * and the support team works from.
 */
export async function createSupportTicketAction(_prev: TicketState | null, formData: FormData): Promise<TicketState> {
  const user = await requireAuth()
  const subject = String(formData.get('subject') ?? '').trim().slice(0, 150)
  const category = String(formData.get('category') ?? 'general').trim().slice(0, 40)
  const message = String(formData.get('message') ?? '').trim().slice(0, 4000)

  if (subject.length < 4) return { ok: false, error: 'Please enter a subject (at least 4 characters).' }
  if (message.length < 10) return { ok: false, error: 'Please describe your issue (at least 10 characters).' }

  const t = await prisma.supportTicket.create({
    data: { userId: user.id, subject, category, message },
  })

  await prisma.notification
    .create({
      data: {
        userId: user.id,
        type: 'SUPPORT_TICKET',
        title: 'Support ticket raised',
        body: `We've received your ticket "${subject}". Our team typically replies within a few hours.`,
        link: '/dashboard/help/tickets',
      },
    })
    .catch(() => {})

  revalidatePath('/dashboard/help/tickets')
  revalidatePath('/dashboard/help')
  // A short human-friendly reference from the ticket id.
  return { ok: true, ref: t.id.slice(-6).toUpperCase() }
}

export type TicketReplyState = { ok: boolean; error?: string } | null

/**
 * The member's side of a support conversation. Only the ticket's owner can
 * write to it; a RESOLVED ticket reopens (to IN_PROGRESS) when they reply, a
 * CLOSED one cannot be written to. The assigned staff member is notified.
 */
export async function memberTicketReplyAction(_p: TicketReplyState, fd: FormData): Promise<TicketReplyState> {
  const user = await requireAuth()
  const id = String(fd.get('id') ?? '')
  const body = String(fd.get('body') ?? '').trim()
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, error: 'That ticket was not found.' }
  if (body.length < 2) return { ok: false, error: 'Write a message first.' }
  if (body.length > 4000) return { ok: false, error: 'Keep it under 4,000 characters.' }

  const t = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true, subject: true, assigneeId: true },
  })
  if (!t) return { ok: false, error: 'That ticket was not found.' }
  if (t.status === 'CLOSED') return { ok: false, error: 'This ticket is closed — raise a new one if you still need help.' }

  await prisma.$transaction([
    prisma.supportReply.create({ data: { ticketId: t.id, authorId: user.id, isStaff: false, body } }),
    prisma.supportTicket.update({ where: { id: t.id }, data: { status: t.status === 'RESOLVED' ? 'IN_PROGRESS' : t.status } }),
    ...(t.assigneeId
      ? [prisma.notification.create({
          data: { userId: t.assigneeId, type: 'SUPPORT_MEMBER_REPLY', title: 'A member replied to a ticket', body: t.subject, link: `/admin/support?view=${t.id}` },
        })]
      : []),
  ])
  revalidatePath('/dashboard/help/tickets')
  revalidatePath('/admin/support')
  return { ok: true }
}
