'use server'

/**
 * §7.4.6 — the admin side of the advertisement queue.
 *
 * Approval and rejection live in `src/lib/ads.ts`; these actions only check
 * that the caller is allowed to moderate and pass `AdError.message` back.
 */

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { approveBooking, rejectBooking, AdError } from '@/lib/ads'

export async function approveAdAction(bookingId: string) {
  const admin = await requirePermission('admin:ads')

  try {
    const booking = await approveBooking(bookingId, admin.id)

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'AD_APPROVED',
        entityType: 'AdBooking',
        entityId: booking.id,
      },
    })
  } catch (e) {
    if (e instanceof AdError) return { ok: false as const, error: e.message }
    console.error('Ad approval failed:', e)
    return { ok: false as const, error: 'The advertisement could not be approved.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/dashboard/advertisements')
  return { ok: true as const }
}

export async function rejectAdAction(bookingId: string, reason: string) {
  const admin = await requirePermission('admin:ads')

  if (!reason.trim()) {
    return { ok: false as const, error: 'A reason is required — the advertiser needs to know what to fix.' }
  }

  try {
    const booking = await rejectBooking(bookingId, admin.id, reason)

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'AD_REJECTED',
        entityType: 'AdBooking',
        entityId: booking.id,
        after: { reason: reason.trim() },
      },
    })
  } catch (e) {
    if (e instanceof AdError) return { ok: false as const, error: e.message }
    console.error('Ad rejection failed:', e)
    return { ok: false as const, error: 'The advertisement could not be sent back.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/dashboard/advertisements')
  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════
//  Live campaign control — pause · resume · end
// ═══════════════════════════════════════════════════════════

export type AdOpState = { ok: boolean; message: string } | null

/**
 * PAUSE   RUNNING/SCHEDULED → PAUSED. Keeps its slot; stops showing.
 * RESUME  PAUSED → SCHEDULED / RUNNING / ENDED, decided by its own dates, so a
 *         resumed campaign can never run past the window the advertiser paid for.
 * END     RUNNING/SCHEDULED/PAUSED → ENDED now. Frees the slot.
 * The advertiser is notified each time.
 */
export async function adOpAction(_p: AdOpState, fd: FormData): Promise<AdOpState> {
  const admin = await requirePermission('admin:ads')
  const id = String(fd.get('id') ?? '')
  const op = String(fd.get('op') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(id) || !['PAUSE', 'RESUME', 'END'].includes(op)) {
    return { ok: false, message: 'That request was not valid.' }
  }
  const b = await prisma.adBooking.findUnique({
    where: { id },
    select: { id: true, status: true, startsAt: true, endsAt: true, advertiserId: true, title: true },
  })
  if (!b) return { ok: false, message: 'That campaign no longer exists.' }

  const now = new Date()
  let next: 'PAUSED' | 'SCHEDULED' | 'RUNNING' | 'ENDED'
  if (op === 'PAUSE') {
    if (b.status !== 'RUNNING' && b.status !== 'SCHEDULED') return { ok: false, message: 'Only a running or scheduled campaign can be paused.' }
    next = 'PAUSED'
  } else if (op === 'RESUME') {
    if (b.status !== 'PAUSED') return { ok: false, message: 'Only a paused campaign can be resumed.' }
    next = b.endsAt && b.endsAt <= now ? 'ENDED' : b.startsAt && b.startsAt > now ? 'SCHEDULED' : 'RUNNING'
  } else {
    if (!['RUNNING', 'SCHEDULED', 'PAUSED'].includes(b.status)) return { ok: false, message: 'This campaign is not live.' }
    next = 'ENDED'
  }

  const verb = { PAUSED: 'paused', SCHEDULED: 'resumed (scheduled)', RUNNING: 'resumed', ENDED: 'ended' }[next]
  await prisma.$transaction([
    prisma.adBooking.update({ where: { id }, data: { status: next, ...(op === 'END' ? { endsAt: now } : {}) } }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: `AD_${op}`, entityType: 'AdBooking', entityId: id, before: { status: b.status }, after: { status: next } },
    }),
    prisma.notification.create({
      data: { userId: b.advertiserId, type: `AD_${op}`, title: `Your campaign was ${verb}`, body: b.title, link: '/dashboard/advertisements' },
    }),
  ])
  revalidatePath('/admin/ads')
  revalidatePath('/dashboard/advertisements')
  return { ok: true, message: `Campaign ${verb}.` }
}

// ═══════════════════════════════════════════════════════════
//  Placements — price, slots, on/off
// ═══════════════════════════════════════════════════════════

/**
 * Edits one placement's weekly price, GST and slot count, and switches it
 * on or off. Slots cannot drop below the campaigns already live in it, so
 * nobody who has paid is pushed out.
 */
export async function savePlacementAction(_p: AdOpState, fd: FormData): Promise<AdOpState> {
  const admin = await requirePermission('admin:ads')
  const id = String(fd.get('id') ?? '')
  const weeklyPrice = Number(fd.get('weeklyPrice'))
  const taxPercent = Number(fd.get('taxPercent'))
  const maxSlots = Number(fd.get('maxSlots'))
  const isActive = fd.get('isActive') === 'on'
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, message: 'That placement was not found.' }
  if (!Number.isFinite(weeklyPrice) || weeklyPrice < 0 || weeklyPrice > 10_000_000) return { ok: false, message: 'Enter a weekly price of 0 or more.' }
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 40) return { ok: false, message: 'GST must be between 0 and 40%.' }
  if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 50) return { ok: false, message: 'Slots must be a whole number from 1 to 50.' }

  const [p, live] = await Promise.all([
    prisma.adPlacement.findUnique({ where: { id }, select: { id: true, name: true, weeklyPrice: true, taxPercent: true, maxSlots: true, isActive: true } }),
    prisma.adBooking.count({ where: { placementId: id, status: { in: ['RUNNING', 'SCHEDULED', 'PAUSED'] } } }),
  ])
  if (!p) return { ok: false, message: 'That placement was not found.' }
  if (maxSlots < live) return { ok: false, message: `${live} campaigns already hold slots here — keep at least ${live}.` }

  await prisma.$transaction([
    prisma.adPlacement.update({ where: { id }, data: { weeklyPrice, taxPercent, maxSlots, isActive } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'AD_PLACEMENT_UPDATED', entityType: 'AdPlacement', entityId: id,
        before: { weeklyPrice: Number(p.weeklyPrice), taxPercent: Number(p.taxPercent), maxSlots: p.maxSlots, isActive: p.isActive },
        after: { weeklyPrice, taxPercent, maxSlots, isActive },
      },
    }),
  ])
  revalidatePath('/admin/ads')
  revalidatePath('/advertisements')
  revalidatePath('/dashboard/advertisements/create')
  return { ok: true, message: `${p.name} saved.` }
}
