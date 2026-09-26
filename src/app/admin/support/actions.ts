'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail } from '@/lib/mailer'

export type TicketOpState = { ok: boolean; message: string } | null

const ID = z.string().regex(/^[a-z0-9]{10,40}$/i)
const STATUS = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
const PRIORITY = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function refresh(id: string) {
  revalidatePath('/admin/support')
  revalidatePath(`/admin/support?view=${id}`)
  revalidatePath('/dashboard/help/tickets')
}

/**
 * Staff reply. Stored as a SupportReply, the member is notified in-app and by
 * email (when mail is configured), and an OPEN ticket moves to IN_PROGRESS.
 * Ticking "resolve" closes the loop in the same step.
 */
export async function replyTicketAction(_p: TicketOpState, fd: FormData): Promise<TicketOpState> {
  const admin = await requirePermission('admin:support')
  const id = ID.safeParse(fd.get('id'))
  const body = String(fd.get('body') ?? '').trim()
  const resolve = fd.get('resolve') === 'on'
  if (!id.success) return { ok: false, message: 'That ticket was not found.' }
  if (body.length < 2) return { ok: false, message: 'Write a reply first.' }
  if (body.length > 4000) return { ok: false, message: 'Keep the reply under 4,000 characters.' }

  const t = await prisma.supportTicket.findUnique({
    where: { id: id.data },
    select: { id: true, subject: true, status: true, assigneeId: true, user: { select: { id: true, name: true, email: true } } },
  })
  if (!t) return { ok: false, message: 'That ticket was not found.' }

  const next = resolve ? 'RESOLVED' : t.status === 'OPEN' ? 'IN_PROGRESS' : t.status
  await prisma.$transaction([
    prisma.supportReply.create({ data: { ticketId: t.id, authorId: admin.id, isStaff: true, body } }),
    prisma.supportTicket.update({
      where: { id: t.id },
      data: { status: next, assigneeId: t.assigneeId ?? admin.id },
    }),
    prisma.notification.create({
      data: {
        userId: t.user.id,
        type: 'SUPPORT_REPLY',
        title: resolve ? 'Your ticket was resolved' : 'ArchFacing replied to your ticket',
        body: t.subject,
        link: '/dashboard/help/tickets',
      },
    }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'TICKET_REPLIED', entityType: 'SupportTicket', entityId: t.id, after: { status: next } },
    }),
  ])

  await sendMail({
    to: t.user.email,
    subject: `Re: ${t.subject}`,
    text: `Hello ${t.user.name},\n\n${body}\n\nYou can reply from your dashboard: Help & Support → My Tickets.\n\n— ArchFacing Support`,
    html: `<p>Hello ${esc(t.user.name)},</p><p>${esc(body).replace(/\n/g, '<br>')}</p><p>You can reply from your dashboard: Help &amp; Support → My Tickets.</p><p>— ArchFacing Support</p>`,
  }).catch(() => null)

  refresh(t.id)
  return { ok: true, message: resolve ? 'Reply sent and ticket resolved.' : 'Reply sent.' }
}

/** Status, priority and owner — the triage controls. */
export async function updateTicketAction(_p: TicketOpState, fd: FormData): Promise<TicketOpState> {
  const admin = await requirePermission('admin:support')
  const id = ID.safeParse(fd.get('id'))
  const status = STATUS.safeParse(fd.get('status'))
  const priority = PRIORITY.safeParse(fd.get('priority'))
  const rawAssignee = String(fd.get('assigneeId') ?? '')
  if (!id.success || !status.success || !priority.success) return { ok: false, message: 'Some values are not valid.' }

  let assigneeId: string | null = null
  if (rawAssignee) {
    const staff = await prisma.user.findFirst({
      where: { id: rawAssignee, role: { in: ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE'] }, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    if (!staff) return { ok: false, message: 'Pick an active staff member.' }
    assigneeId = staff.id
  }

  const t = await prisma.supportTicket.findUnique({ where: { id: id.data }, select: { status: true, priority: true, assigneeId: true, userId: true, subject: true } })
  if (!t) return { ok: false, message: 'That ticket was not found.' }

  await prisma.$transaction([
    prisma.supportTicket.update({ where: { id: id.data }, data: { status: status.data, priority: priority.data, assigneeId } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'TICKET_UPDATED', entityType: 'SupportTicket', entityId: id.data,
        before: { status: t.status, priority: t.priority, assigneeId: t.assigneeId },
        after: { status: status.data, priority: priority.data, assigneeId },
      },
    }),
    // The member hears about the two changes that matter to them.
    ...(t.status !== status.data && (status.data === 'RESOLVED' || status.data === 'CLOSED')
      ? [prisma.notification.create({
          data: { userId: t.userId, type: 'SUPPORT_STATUS', title: `Your ticket was ${status.data.toLowerCase()}`, body: t.subject, link: '/dashboard/help/tickets' },
        })]
      : []),
    ...(assigneeId && assigneeId !== t.assigneeId && assigneeId !== admin.id
      ? [prisma.notification.create({
          data: { userId: assigneeId, type: 'SUPPORT_ASSIGNED', title: 'A support ticket was assigned to you', body: t.subject, link: `/admin/support?view=${id.data}` },
        })]
      : []),
  ])
  refresh(id.data)
  return { ok: true, message: 'Saved.' }
}
