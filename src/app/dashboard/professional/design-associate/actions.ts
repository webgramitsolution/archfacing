'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/guard'
import { applyForDa, DaError } from '@/lib/design-associate'

export type DaApplyState = { ok: boolean; message: string } | null

/** §3.1.7 — a verified Designa/Designi with an active PACT applies; admins then check KYC. */
export async function applyForDaAction(_p: DaApplyState, fd: FormData): Promise<DaApplyState> {
  const me = await requireRole('PROFESSIONAL')
  if (fd.get('agree') !== 'on') return { ok: false, message: 'Please accept the Design Associate terms.' }
  const pan = String(fd.get('pan') ?? '').trim().toUpperCase()
  const gst = String(fd.get('gst') ?? '').trim().toUpperCase()
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return { ok: false, message: 'Enter a valid PAN (e.g. ABCDE1234F).' }
  if (gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gst)) return { ok: false, message: 'That GSTIN does not look right.' }

  try {
    const da = await applyForDa(me.id)
    await prisma.designAssociate.update({ where: { id: da.id }, data: { panNumber: pan, gstNumber: gst || null } })
    await prisma.auditLog.create({ data: { actorId: me.id, action: 'DA_APPLIED', entityType: 'DesignAssociate', entityId: da.id } })
    // Let the admins know there is a KYC to review.
    const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, deletedAt: null }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({ userId: a.id, type: 'DA_APPLIED', title: 'New Design Associate application', body: `${me.name} applied — KYC to review.`, link: '/admin/design-associates' })),
      })
    }
  } catch (e) {
    if (e instanceof DaError) return { ok: false, message: e.message }
    throw e
  }
  revalidatePath('/dashboard/professional/design-associate')
  return { ok: true, message: 'Application sent. ArchFacing will review your KYC and confirm.' }
}
