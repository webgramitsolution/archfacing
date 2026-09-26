'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { BUSINESS_RULES } from '@/config/permissions'

export type TrustOpState = { ok: boolean; message: string } | null

const ID = z.string().regex(/^[a-z0-9]{10,40}$/i)
const MAX = BUSINESS_RULES.PACT_MAX_COMPLAINTS

function refresh() {
  revalidatePath('/admin/trust')
  revalidatePath('/admin/pact')
  revalidatePath('/dashboard/employee/complaints')
}

/**
 * §3.1.8.5 — complaints reach the Design Cell through support. Staff log them
 * here (often straight from a ticket). A PACT pincode ties the complaint to
 * one territory; without it an upheld complaint counts against every active
 * PACT the person holds.
 */
export async function fileComplaintAction(_p: TrustOpState, fd: FormData): Promise<TrustOpState> {
  const admin = await requirePermission('admin:audit')
  const byEmail = String(fd.get('byEmail') ?? '').trim().toLowerCase()
  const againstEmail = String(fd.get('againstEmail') ?? '').trim().toLowerCase()
  const pincode = String(fd.get('pincode') ?? '').trim()
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 150)
  const details = String(fd.get('details') ?? '').trim().slice(0, 4000)
  const ticketId = String(fd.get('ticketId') ?? '')

  if (!againstEmail) return { ok: false, message: 'Enter the email of the person the complaint is about.' }
  if (reason.length < 4) return { ok: false, message: 'Give the complaint a short reason.' }
  if (details.length < 10) return { ok: false, message: 'Describe what happened (at least 10 characters).' }
  if (pincode && !/^\d{6}$/.test(pincode)) return { ok: false, message: 'A PACT pincode has 6 digits.' }

  const [against, by] = await Promise.all([
    prisma.user.findFirst({ where: { email: againstEmail, deletedAt: null }, select: { id: true, name: true } }),
    byEmail ? prisma.user.findFirst({ where: { email: byEmail, deletedAt: null }, select: { id: true } }) : null,
  ])
  if (!against) return { ok: false, message: `No account uses ${againstEmail}.` }
  if (byEmail && !by) return { ok: false, message: `No account uses ${byEmail}. Leave it empty to file it in your own name.` }
  if (by?.id === against.id) return { ok: false, message: 'Someone cannot complain about themselves.' }

  let pactId: string | null = null
  if (pincode) {
    const pact = await prisma.pact.findFirst({
      where: { holderId: against.id, pincode, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      select: { id: true },
    })
    if (!pact) return { ok: false, message: `${against.name} holds no PACT at ${pincode}.` }
    pactId = pact.id
  }

  const complaint = await prisma.complaint.create({
    data: { againstId: against.id, byId: by?.id ?? admin.id, pactId, reason, details },
  })
  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'COMPLAINT_FILED', entityType: 'Complaint', entityId: complaint.id,
        after: { reason, pincode: pincode || null, ticketId: ID.safeParse(ticketId).success ? ticketId : null },
      },
    }),
    prisma.notification.create({
      data: {
        userId: against.id, type: 'COMPLAINT_FILED', title: 'A complaint was filed about your account',
        body: `"${reason}" — the ArchFacing Design Cell will review it and contact you.`, link: '/dashboard/help',
      },
    }),
  ])
  refresh()
  return { ok: true, message: `Complaint logged against ${against.name}.` }
}

/**
 * Review → Uphold / Dismiss. Only an upheld complaint counts toward the
 * 5-complaint cessation rule, and a PACT that reaches the limit is suspended
 * on the spot rather than waiting for the nightly check.
 */
export async function decideComplaintAction(_p: TrustOpState, fd: FormData): Promise<TrustOpState> {
  const admin = await requirePermission('admin:audit')
  const id = ID.safeParse(fd.get('id'))
  const decision = z.enum(['REVIEW', 'UPHOLD', 'DISMISS']).safeParse(fd.get('decision'))
  const note = String(fd.get('note') ?? '').trim().slice(0, 2000)
  if (!id.success || !decision.success) return { ok: false, message: 'Pick a decision.' }
  if (note.length < 5) return { ok: false, message: 'Write a short note on what you found.' }

  const c = await prisma.complaint.findUnique({ where: { id: id.data }, select: { id: true, status: true, reason: true, againstId: true, byId: true, pactId: true } })
  if (!c) return { ok: false, message: 'Complaint not found.' }
  if (c.status === 'RESOLVED' || c.status === 'DISMISSED') return { ok: false, message: 'This complaint is already closed.' }

  if (decision.data === 'REVIEW') {
    await prisma.$transaction([
      prisma.complaint.update({ where: { id: c.id }, data: { status: 'UNDER_REVIEW', reviewedById: admin.id } }),
      prisma.auditLog.create({ data: { actorId: admin.id, action: 'COMPLAINT_REVIEW_NOTE', entityType: 'Complaint', entityId: c.id, after: { note } } }),
    ])
    refresh()
    return { ok: true, message: 'Marked under review.' }
  }

  const upheld = decision.data === 'UPHOLD'
  let suspendedPins: string[] = []
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: c.id },
      data: { status: upheld ? 'RESOLVED' : 'DISMISSED', reviewedById: admin.id, resolution: note, resolvedAt: new Date() },
    })
    if (upheld) {
      const where = c.pactId ? { id: c.pactId } : { holderId: c.againstId, status: 'ACTIVE' as const }
      await tx.pact.updateMany({ where, data: { complaintCount: { increment: 1 } } })
      const over = await tx.pact.findMany({
        where: { ...where, status: 'ACTIVE', complaintCount: { gte: MAX } },
        select: { id: true, pincode: true },
      })
      if (over.length) {
        await tx.pact.updateMany({
          where: { id: { in: over.map((p) => p.id) } },
          data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: `${MAX} upheld complaints` },
        })
        suspendedPins = over.map((p) => p.pincode)
      }
    }
    await tx.auditLog.create({
      data: { actorId: admin.id, action: upheld ? 'COMPLAINT_UPHELD' : 'COMPLAINT_DISMISSED', entityType: 'Complaint', entityId: c.id, after: { note, suspended: suspendedPins } },
    })
    await tx.notification.createMany({
      data: [
        {
          userId: c.againstId, type: upheld ? 'COMPLAINT_UPHELD' : 'COMPLAINT_DISMISSED',
          title: upheld ? 'A complaint against you was upheld' : 'A complaint against you was dismissed',
          body: suspendedPins.length ? `"${c.reason}" — PACT ${suspendedPins.join(', ')} is now suspended.` : `"${c.reason}" — ${note}`,
          link: '/dashboard/help',
        },
        ...(c.byId !== admin.id ? [{
          userId: c.byId, type: 'COMPLAINT_CLOSED', title: 'Your complaint has been decided',
          body: `"${c.reason}" was ${upheld ? 'upheld' : 'dismissed'}: ${note}`, link: '/dashboard/help',
        }] : []),
      ],
    })
  })
  refresh()
  return {
    ok: true,
    message: upheld
      ? suspendedPins.length ? `Upheld — PACT ${suspendedPins.join(', ')} reached ${MAX} and is suspended.` : 'Upheld — counted toward the PACT limit.'
      : 'Dismissed — it does not count toward the limit.',
  }
}
