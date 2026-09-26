'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

/**
 * Marks every unread notification for the signed-in user as read.
 *
 * ⚠️ Scoped to `userId` deliberately. Without that clause this would clear
 *    every notification on the platform.
 */
export async function markAllReadAction() {
  const user = await requireAuth()

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  revalidatePath('/dashboard/notifications')
}
