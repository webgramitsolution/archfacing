'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail } from '@/lib/mailer'

/**
 * Admin-side work on one enquiry, from the lead drawer.
 *
 * Notes and the admin history live in AuditLog (entityType 'Enquiry') — a
 * note is a LEAD_NOTE row — so no extra table was needed and every change is
 * already on the platform's audit trail.
 */

export type LeadOpState = { ok: boolean; message: string } | null

const ID = z.string().regex(/^[a-z0-9]{10,40}$/i)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function done(id: string, message: string): LeadOpState {
  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads?lead=${id}`)
  return { ok: true, message }
}

/** Adds an internal note. Only staff see it. */
export async function addLeadNoteAction(_p: LeadOpState, fd: FormData): Promise<LeadOpState> {
  const admin = await requirePermission('admin:leads')
  const id = ID.safeParse(fd.get('id'))
  const body = String(fd.get('body') ?? '').trim()
  if (!id.success) return { ok: false, message: 'That enquiry was not found.' }
  if (body.length < 2) return { ok: false, message: 'Write a note first.' }
  if (body.length > 1000) return { ok: false, message: 'Keep notes under 1,000 characters.' }
  const exists = await prisma.enquiry.count({ where: { id: id.data } })
  if (!exists) return { ok: false, message: 'That enquiry was not found.' }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'LEAD_NOTE', entityType: 'Enquiry', entityId: id.data, after: { body } },
  })
  return done(id.data, 'Note added.')
}

const STATUS = z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED'])

/** Moves the enquiry through its pipeline and/or hands it to a staff member. */
export async function updateLeadAction(_p: LeadOpState, fd: FormData): Promise<LeadOpState> {
  const admin = await requirePermission('admin:leads')
  const id = ID.safeParse(fd.get('id'))
  if (!id.success) return { ok: false, message: 'That enquiry was not found.' }
  const status = STATUS.safeParse(fd.get('status'))
  const rawEmp = String(fd.get('employeeId') ?? '')

  const e = await prisma.enquiry.findUnique({
    where: { id: id.data },
    select: { status: true, employeeId: true, respondedAt: true, closedAt: true },
  })
  if (!e) return { ok: false, message: 'That enquiry was not found.' }

  let employeeId: string | null = e.employeeId
  if (rawEmp === '') employeeId = null
  else if (ID.safeParse(rawEmp).success) {
    const staff = await prisma.user.findFirst({
      where: { id: rawEmp, role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true },
    })
    if (!staff) return { ok: false, message: 'Pick an active staff member.' }
    employeeId = staff.id
  }

  const nextStatus = status.success ? status.data : e.status
  if (nextStatus === e.status && employeeId === e.employeeId) return { ok: true, message: 'Nothing changed.' }

  const now = new Date()
  const changes: string[] = []
  if (nextStatus !== e.status) changes.push(`status ${e.status} → ${nextStatus}`)
  if (employeeId !== e.employeeId) changes.push(employeeId ? 'assigned to staff' : 'unassigned')

  await prisma.$transaction([
    prisma.enquiry.update({
      where: { id: id.data },
      data: {
        status: nextStatus,
        employeeId,
        respondedAt: nextStatus === 'RESPONDED' && !e.respondedAt ? now : undefined,
        closedAt: nextStatus === 'CLOSED' || nextStatus === 'CONVERTED' ? (e.closedAt ?? now) : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'LEAD_UPDATED', entityType: 'Enquiry', entityId: id.data,
        before: { status: e.status, employeeId: e.employeeId },
        after: { status: nextStatus, employeeId, detail: changes.join(' · ') },
      },
    }),
    ...(employeeId && employeeId !== e.employeeId
      ? [prisma.notification.create({
          data: { userId: employeeId, type: 'LEAD_ASSIGNED', title: 'A lead was assigned to you', body: 'Open it from your leads list.', link: '/dashboard/employee/leads' },
        })]
      : []),
  ])
  return done(id.data, 'Saved.')
}

/**
 * Emails the enquirer from the platform and records it. A NEW / ASSIGNED
 * enquiry moves to RESPONDED so the pipeline reflects that someone answered.
 */
export async function replyToLeadAction(_p: LeadOpState, fd: FormData): Promise<LeadOpState> {
  const admin = await requirePermission('admin:leads')
  const id = ID.safeParse(fd.get('id'))
  const body = String(fd.get('body') ?? '').trim()
  if (!id.success) return { ok: false, message: 'That enquiry was not found.' }
  if (body.length < 5) return { ok: false, message: 'Write your reply first.' }
  if (body.length > 3000) return { ok: false, message: 'Keep the reply under 3,000 characters.' }

  const e = await prisma.enquiry.findUnique({
    where: { id: id.data },
    select: { subject: true, contactName: true, contactEmail: true, status: true, respondedAt: true },
  })
  if (!e) return { ok: false, message: 'That enquiry was not found.' }
  if (!e.contactEmail) return { ok: false, message: 'This enquirer left no email — use Call or WhatsApp.' }

  let sent = false
  try {
    const r = await sendMail({
      to: e.contactEmail,
      subject: `Re: ${e.subject}`,
      text: `Hello ${e.contactName},\n\n${body}\n\n— ArchFacing`,
      html: `<p>Hello ${esc(e.contactName)},</p><p>${esc(body).replace(/\n/g, '<br>')}</p><p>— ArchFacing</p>`,
    })
    sent = r.sent
  } catch {
    return { ok: false, message: 'The email could not be sent. Check the mail settings and try again.' }
  }

  // Without SMTP nothing leaves the server — say so, and do not mark it answered.
  if (!sent) return { ok: false, message: 'Email is not configured on this server, so the reply was not sent. Use Call or WhatsApp.' }

  const moveOn = e.status === 'NEW' || e.status === 'ASSIGNED' || e.status === 'UNROUTED'
  await prisma.$transaction([
    ...(moveOn
      ? [prisma.enquiry.update({ where: { id: id.data }, data: { status: 'RESPONDED', respondedAt: e.respondedAt ?? new Date() } })]
      : []),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'LEAD_REPLIED', entityType: 'Enquiry', entityId: id.data,
        after: { detail: `emailed ${e.contactEmail}`, body },
      },
    }),
  ])
  return done(id.data, `Reply sent to ${e.contactEmail}.`)
}

/**
 * Manual routing: sends the lead to one more member by email address —
 * the fix for an UNROUTED enquiry, or an extra recipient. It becomes a
 * DIRECT LeadRecipient with the admin's reason, the member is notified, and
 * the enquiry leaves UNROUTED. The (enquiryId, recipientId) unique key stops
 * a member being sent the same lead twice.
 */
export async function routeLeadAction(_p: LeadOpState, fd: FormData): Promise<LeadOpState> {
  const admin = await requirePermission('admin:leads')
  const id = ID.safeParse(fd.get('id'))
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  if (!id.success) return { ok: false, message: 'That enquiry was not found.' }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'Enter the member’s email address.' }

  const [e, member] = await Promise.all([
    prisma.enquiry.findUnique({ where: { id: id.data }, select: { status: true, pincode: true, category: true, subject: true } }),
    prisma.user.findFirst({
      where: { email, deletedAt: null, status: 'ACTIVE', role: { in: ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'] } },
      select: { id: true, name: true },
    }),
  ])
  if (!e) return { ok: false, message: 'That enquiry was not found.' }
  if (!member) return { ok: false, message: 'No active professional, consultant, BMF or corporate has that email.' }

  const already = await prisma.leadRecipient.count({ where: { enquiryId: id.data, recipientId: member.id } })
  if (already) return { ok: false, message: `${member.name} already has this lead.` }

  const now = new Date()
  await prisma.$transaction([
    prisma.leadRecipient.create({
      data: {
        enquiryId: id.data, recipientId: member.id, type: 'DIRECT',
        routingReason: 'Routed manually by ArchFacing', pincode: e.pincode, category: e.category,
        deliveryStatus: 'SENT', sentAt: now,
      },
    }),
    ...(e.status === 'UNROUTED' || e.status === 'NEW'
      ? [prisma.enquiry.update({ where: { id: id.data }, data: { status: 'ASSIGNED' } })]
      : []),
    prisma.notification.create({
      data: { userId: member.id, type: 'NEW_ENQUIRY', title: 'New enquiry for you', body: e.subject, link: '/dashboard' },
    }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'LEAD_ROUTED', entityType: 'Enquiry', entityId: id.data, after: { detail: `routed to ${member.name}` } },
    }),
  ])
  return done(id.data, `Lead sent to ${member.name}.`)
}
