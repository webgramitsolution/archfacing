'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminShell } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

/** Marks every notification of the signed-in staff member as read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireAdminShell()
  await prisma.notification.updateMany({ where: { userId: me.id, isRead: false }, data: { isRead: true } })
  revalidatePath('/admin', 'layout')
}
