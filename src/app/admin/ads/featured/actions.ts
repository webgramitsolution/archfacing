'use server'

/**
 * §15 — the admin's control over the Featured Advertisements rail.
 *
 * Every one of these is behind `admin:moderate`. Nothing here can be reached
 * by an advertiser, which is the whole point: featuring is a platform decision,
 * not something a campaign can ask for (§26).
 */

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdError } from '@/lib/ads'
import {
  assignFeaturedSlot,
  setFeaturedSlotEnabled,
  swapFeaturedSlots,
  FEATURED_SLOT_COUNT,
} from '@/lib/ad-marketplace'

type Result = { ok: true } | { ok: false; error: string }

/** Both public and admin views have to move — the page is uncached, the panel is not. */
function refresh() {
  revalidatePath('/advertisements')
  revalidatePath('/admin/ads/featured')
  revalidatePath('/admin/ads')
}

async function run(
  action: string,
  entityId: string,
  fn: () => Promise<unknown>,
  after?: Prisma.InputJsonValue
): Promise<Result> {
  const admin = await requirePermission('admin:ads')

  try {
    await fn()
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action,
        entityType: 'AdFeaturedSlot',
        entityId,
        ...(after ? { after } : {}),
      },
    })
  } catch (e) {
    if (e instanceof AdError) return { ok: false, error: e.message }
    console.error(`${action} failed:`, e)
    return { ok: false, error: 'That change could not be saved.' }
  }

  refresh()
  return { ok: true }
}

export async function assignFeaturedAction(position: number, bookingId: string | null) {
  return run(
    bookingId ? 'AD_FEATURED_ASSIGNED' : 'AD_FEATURED_CLEARED',
    String(position),
    () => assignFeaturedSlot(position, bookingId),
    { position, bookingId }
  )
}

export async function toggleFeaturedSlotAction(position: number, isEnabled: boolean) {
  return run(
    isEnabled ? 'AD_FEATURED_ENABLED' : 'AD_FEATURED_DISABLED',
    String(position),
    () => setFeaturedSlotEnabled(position, isEnabled),
    { position, isEnabled }
  )
}

export async function moveFeaturedSlotAction(position: number, direction: -1 | 1) {
  const target = position + direction
  if (target < 1 || target > FEATURED_SLOT_COUNT) {
    return { ok: false as const, error: 'That slot is already at the end of the rail.' }
  }

  return run('AD_FEATURED_REORDERED', String(position), () => swapFeaturedSlots(position, target), {
    from: position,
    to: target,
  })
}
