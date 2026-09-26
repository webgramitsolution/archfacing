'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { assignEnquiry } from '@/lib/enquiry'

/**
 * Enquiries that found no PACT holder land here.
 * An RM Employee assigns them to a registrant by hand.
 */
export async function unroutedLeads() {
  const employee = await requirePermission('employee:leads')

  const me = await prisma.user.findUnique({
    where: { id: employee.id },
    select: { assignedStates: true, assignedPincodes: true },
  })

  // '*' = every PACT area. Otherwise, if the employee has territories, show
  // only those; with none assigned, show all.
  const everywhere = me?.assignedPincodes.includes('*')
  const territory =
    !everywhere && (me?.assignedStates.length || me?.assignedPincodes.length)
      ? {
          OR: [
            ...(me.assignedPincodes.length
              ? [{ pincode: { in: me.assignedPincodes } }]
              : []),
            ...(me.assignedStates.length
              ? [{ pincode: { in: await pincodesInStates(me.assignedStates) } }]
              : []),
          ],
        }
      : {}

  return prisma.enquiry.findMany({
    where: { status: 'UNROUTED', ...territory },
    include: { client: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
}

async function pincodesInStates(states: string[]): Promise<string[]> {
  const rows = await prisma.pincode.findMany({
    where: { state: { in: states } },
    select: { code: true },
    take: 5000,
  })
  return rows.map((r) => r.code)
}

/** Who is a suitable match for this enquiry */
export async function candidatesFor(enquiryId: string) {
  await requirePermission('employee:leads')

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { pincode: true, serviceType: true, subCategory: true },
  })
  if (!enquiry) return []

  const place = await prisma.pincode.findUnique({
    where: { code: enquiry.pincode },
    select: { state: true, district: true },
  })
  if (!place) return []

  const roleFor: Record<string, string> = {
    DESIGNA: 'PROFESSIONAL',
    DESIGNI: 'PROFESSIONAL',
    CONSULTANT: 'CONSULTANT',
    BMF: 'BMF',
  }

  // Active registrants in the same state — nearest first
  return prisma.user.findMany({
    where: {
      role: roleFor[enquiry.serviceType] as never,
      status: 'ACTIVE',
      deletedAt: null,
      state: place.state,
    },
    select: {
      id: true,
      name: true,
      pincode: true,
      city: true,
      _count: { select: { pacts: true, enquiriesRecvd: true } },
    },
    orderBy: { name: 'asc' },
    take: 50,
  })
}

export async function assignLeadAction(enquiryId: string, holderId: string) {
  const employee = await requirePermission('employee:leads')

  try {
    await assignEnquiry({ enquiryId, holderId, employeeId: employee.id })
    await prisma.auditLog.create({
      data: {
        actorId: employee.id,
        action: 'ENQUIRY_ASSIGNED',
        entityType: 'Enquiry',
        entityId: enquiryId,
        after: { holderId },
      },
    })
    revalidatePath('/dashboard/employee/leads')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ═══════════════════════════════════════════════════════════
//  The employee's own leads and complaints
// ═══════════════════════════════════════════════════════════

export type EmployeeOpState = { ok: boolean; message: string } | null

/**
 * An RM moves a lead assigned to them along the pipeline and can leave a note
 * (stored as a LEAD_NOTE audit row, the same place admins' notes live). Only
 * leads whose employeeId is theirs can be touched.
 */
export async function updateMyLeadAction(_p: EmployeeOpState, fd: FormData): Promise<EmployeeOpState> {
  const me = await requirePermission('employee:leads')
  const id = String(fd.get('id') ?? '')
  const status = String(fd.get('status') ?? '')
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000)
  const allowed = ['ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED']
  if (!/^[a-z0-9]{10,40}$/i.test(id) || !allowed.includes(status)) return { ok: false, message: 'That update was not valid.' }
  const e = await prisma.enquiry.findFirst({ where: { id, employeeId: me.id }, select: { status: true, respondedAt: true, closedAt: true } })
  if (!e) return { ok: false, message: 'This lead is not assigned to you.' }
  const now = new Date()
  await prisma.$transaction([
    prisma.enquiry.update({
      where: { id },
      data: {
        status: status as never,
        respondedAt: status === 'RESPONDED' && !e.respondedAt ? now : undefined,
        closedAt: status === 'CONVERTED' || status === 'CLOSED' ? (e.closedAt ?? now) : null,
      },
    }),
    ...(e.status !== status
      ? [prisma.auditLog.create({ data: { actorId: me.id, action: 'LEAD_UPDATED', entityType: 'Enquiry', entityId: id, before: { status: e.status }, after: { status, detail: `status ${e.status} → ${status}` } } })]
      : []),
    ...(note ? [prisma.auditLog.create({ data: { actorId: me.id, action: 'LEAD_NOTE', entityType: 'Enquiry', entityId: id, after: { body: note } } })] : []),
  ])
  revalidatePath('/dashboard/employee/leads')
  revalidatePath('/dashboard/employee')
  revalidatePath('/admin/leads')
  return { ok: true, message: 'Saved.' }
}

/**
 * An RM takes a complaint in their territory under review and records what
 * they found. Resolving or dismissing stays with the admins on /admin/trust,
 * because complaints count towards PACT cessation.
 */
export async function reviewComplaintAction(_p: EmployeeOpState, fd: FormData): Promise<EmployeeOpState> {
  const me = await requirePermission('employee:leads')
  const id = String(fd.get('id') ?? '')
  const note = String(fd.get('note') ?? '').trim().slice(0, 2000)
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, message: 'Complaint not found.' }
  if (note.length < 5) return { ok: false, message: 'Write what you found.' }
  const { openComplaintsIn, territoryOf } = await import('@/lib/employee-panel')
  const mine = (await openComplaintsIn(await territoryOf(me.id))).some((c) => c.id === id)
  if (!mine) return { ok: false, message: 'This complaint is outside your territory.' }
  await prisma.$transaction([
    prisma.complaint.update({ where: { id }, data: { status: 'UNDER_REVIEW', reviewedById: me.id } }),
    prisma.auditLog.create({ data: { actorId: me.id, action: 'COMPLAINT_REVIEW_NOTE', entityType: 'Complaint', entityId: id, after: { note } } }),
  ])
  revalidatePath('/dashboard/employee/complaints')
  revalidatePath('/admin/trust')
  return { ok: true, message: 'Marked under review — the admins can see your note.' }
}
