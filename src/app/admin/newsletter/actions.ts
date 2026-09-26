'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'

/** Unsubscribe or resubscribe one address on the member's behalf. */
export async function toggleSubscriberAction(fd: FormData): Promise<void> {
  const admin = await requirePermission('admin:reports')
  const id = String(fd.get('id') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return
  const s = await prisma.newsletterSubscriber.findUnique({ where: { id }, select: { unsubscribedAt: true } })
  if (!s) return
  const unsubscribedAt = s.unsubscribedAt ? null : new Date()
  await prisma.$transaction([
    prisma.newsletterSubscriber.update({ where: { id }, data: { unsubscribedAt } }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: unsubscribedAt ? 'NEWSLETTER_UNSUBSCRIBED' : 'NEWSLETTER_RESUBSCRIBED', entityType: 'NewsletterSubscriber', entityId: id },
    }),
  ])
  revalidatePath('/admin/newsletter')
}
