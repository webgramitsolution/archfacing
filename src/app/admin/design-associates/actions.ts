'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { approveDa, DaError } from '@/lib/design-associate'

export type DaOpState = { ok: boolean; message: string } | null

function refresh() {
  revalidatePath('/admin/design-associates')
  revalidatePath('/designers-associates')
  revalidatePath('/dashboard/professional/design-associate')
}

/** §3.1.7.9 — KYC checked: approve (slug, club membership, notification) or turn down with a reason. */
export async function decideDaAction(_p: DaOpState, fd: FormData): Promise<DaOpState> {
  const admin = await requirePermission('admin:users')
  const id = String(fd.get('id') ?? '')
  const decision = String(fd.get('decision') ?? '')
  const note = String(fd.get('note') ?? '').trim().slice(0, 500)
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, message: 'Application not found.' }

  const da = await prisma.designAssociate.findUnique({ where: { id }, select: { id: true, userId: true, approvedAt: true, _count: { select: { invoices: true } } } })
  if (!da) return { ok: false, message: 'Application not found.' }
  if (da.approvedAt) return { ok: false, message: 'Already approved.' }

  if (decision === 'APPROVE') {
    try {
      await approveDa(da.id, admin.id)
    } catch (e) {
      if (e instanceof DaError) return { ok: false, message: e.message }
      throw e
    }
    await prisma.auditLog.create({ data: { actorId: admin.id, action: 'DA_APPROVED', entityType: 'DesignAssociate', entityId: da.id } })
    refresh()
    return { ok: true, message: 'Approved — the associate is now listed publicly.' }
  }

  if (decision === 'REJECT') {
    if (note.length < 5) return { ok: false, message: 'Tell the applicant what to fix.' }
    if (da._count.invoices > 0) return { ok: false, message: 'This associate already has invoices and cannot be removed.' }
    await prisma.$transaction([
      prisma.designAssociate.delete({ where: { id: da.id } }),
      prisma.auditLog.create({ data: { actorId: admin.id, action: 'DA_REJECTED', entityType: 'User', entityId: da.userId, after: { note } } }),
      prisma.notification.create({
        data: { userId: da.userId, type: 'DA_REJECTED', title: 'Design Associate application not approved', body: `${note} — you can apply again once this is fixed.`, link: '/dashboard/professional/design-associate' },
      }),
    ])
    refresh()
    return { ok: true, message: 'Turned down — the applicant was told why.' }
  }
  return { ok: false, message: 'Pick a decision.' }
}
