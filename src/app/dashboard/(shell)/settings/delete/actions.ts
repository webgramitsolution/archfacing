'use server'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'

export type DelState = { ok: boolean; error?: string; done?: boolean }

/**
 * Request account deletion — deliberately NOT a hard delete.
 *
 * The account is never removed from the client. The request is recorded (audit
 * log) and acknowledged (a notification), and an admin carries out the actual
 * removal after the policy grace period. This keeps an irreversible, data-
 * destroying action off a self-serve button while still giving the user a real,
 * working way to start it.
 */
export async function requestAccountDeletionAction(_prev: DelState | null, formData: FormData): Promise<DelState> {
  const user = await requireAuth()
  const typed = String(formData.get('confirm') ?? '').trim().toLowerCase()
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500)

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } })
  if (!me) return { ok: false, error: 'Account not found.' }
  if (typed !== me.email.toLowerCase()) {
    return { ok: false, error: 'Please type your account email exactly to confirm.' }
  }

  await prisma.auditLog
    .create({
      data: {
        actorId: user.id,
        action: 'ACCOUNT_DELETION_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        before: (reason ? { reason } : {}) as Prisma.InputJsonValue,
      },
    })
    .catch(() => {})

  await prisma.notification
    .create({
      data: {
        userId: user.id,
        type: 'ACCOUNT_DELETION_REQUESTED',
        title: 'Account deletion requested',
        body: 'We have received your request to delete your account. Our team will process it within 7 days. You can keep using ArchFacing until then, and may cancel the request any time by contacting support.',
        link: '/legal/need-help',
      },
    })
    .catch(() => {})

  return { ok: true, done: true }
}
