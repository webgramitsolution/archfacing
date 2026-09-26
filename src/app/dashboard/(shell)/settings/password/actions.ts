'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'

export type PwState = { ok: boolean; error?: string; done?: boolean }

export async function changePasswordAction(_prev: PwState | null, formData: FormData): Promise<PwState> {
  const user = await requireAuth()
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!row?.passwordHash) {
    return { ok: false, error: 'Your account signs in with a one-time code (OTP), so there is no password to change.' }
  }
  if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' }
  if (next !== confirm) return { ok: false, error: 'New password and confirmation do not match.' }

  const good = await bcrypt.compare(current, row.passwordHash)
  if (!good) return { ok: false, error: 'Your current password is incorrect.' }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
  })
  return { ok: true, done: true }
}
