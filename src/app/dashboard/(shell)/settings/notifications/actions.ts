'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { ALL_ITEM_KEYS, CHANNELS, DEFAULT_PREFS, type NotifPrefs } from '@/lib/notification-prefs'

export type SaveState = { ok: boolean; error?: string; at?: number }

/**
 * Persist the whole notification matrix for the signed-in user.
 *
 * The incoming object is never trusted: only known item keys and the four
 * known channels survive, every value is coerced to a boolean, and anything
 * missing falls back to its catalogue default. So a tampered or stale payload
 * can only ever write a clean, complete matrix.
 */
export async function saveNotificationPrefsAction(incoming: unknown): Promise<SaveState> {
  const user = await requireAuth()

  const clean: NotifPrefs = {}
  const src = incoming && typeof incoming === 'object' ? (incoming as Record<string, unknown>) : {}

  for (const key of ALL_ITEM_KEYS) {
    const row = src[key]
    const def = DEFAULT_PREFS[key]
    clean[key] = { ...def }
    if (row && typeof row === 'object') {
      for (const ch of CHANNELS) {
        const v = (row as Record<string, unknown>)[ch]
        if (typeof v === 'boolean') clean[key][ch] = v
      }
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPrefs: clean as Prisma.InputJsonValue },
  })

  revalidatePath('/dashboard/settings/notifications')
  return { ok: true, at: Date.now() }
}

/** Put every item back to its catalogue default and save. */
export async function resetNotificationPrefsAction(): Promise<SaveState> {
  const user = await requireAuth()
  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPrefs: DEFAULT_PREFS as Prisma.InputJsonValue },
  })
  revalidatePath('/dashboard/settings/notifications')
  return { ok: true, at: Date.now() }
}
