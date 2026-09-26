'use server'

/**
 * What an advertiser may do to one campaign — §8, §9, §22.
 *
 * Two rules shape every function here:
 *
 *  · **The state decides.** Each action names the states it accepts and
 *    refuses anything else. A button the UI should not have shown is refused
 *    again on the server, so the rule lives in one place rather than in the
 *    markup of six screens.
 *  · **Every change is recorded.** The campaign's timeline is built from
 *    `AuditLog`, so an action that changed something and left no trace would
 *    make the history a lie.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AD_ROLES } from '@/lib/ads'
import { recordAdEvent } from '@/lib/ad-audit'
import { may } from './permissions'
import type { AdStatus } from '@prisma/client'

type Result = { ok: true; id?: string } | { ok: false; error: string }

async function load(id: string) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) {
    return { user: null, campaign: null, error: 'Advertising is not open on this account.' }
  }

  const campaign = await prisma.adBooking.findFirst({
    where: { id, advertiserId: user.id },
    include: { targeting: true, extraPlacements: true },
  })
  if (!campaign) {
    return { user, campaign: null, error: 'That campaign could not be found.' }
  }
  return { user, campaign, error: null }
}

function refresh() {
  for (const p of [
    '/dashboard/advertisements',
    '/dashboard/advertisements/drafts',
    '/dashboard/advertisements/pending',
    '/dashboard/advertisements/active',
    '/dashboard/advertisements/scheduled',
    '/dashboard/advertisements/completed',
    '/dashboard/advertisements/rejected',
    '/admin/ads',
  ]) {
    revalidatePath(p)
  }
}

// ═══════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════

/** Pulls a submitted campaign back out of the review queue. */
export async function withdrawCampaignAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  if (!may(campaign.status, 'withdraw')) {
    return { ok: false, error: 'This campaign can no longer be withdrawn.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.adBooking.update({
      where: { id },
      data: { status: 'DRAFT', submittedAt: null },
    })
    await recordAdEvent({
      actorId: user.id,
      campaignId: id,
      action: 'AD_WITHDRAWN',
      before: { status: campaign.status },
      after: { status: 'DRAFT' },
      tx,
    })
  })

  refresh()
  return { ok: true }
}

/** Stops a running campaign. Its slot is kept, so it can be resumed. */
export async function pauseCampaignAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  if (!may(campaign.status, 'pause')) {
    return { ok: false, error: 'Only a running campaign can be paused.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.adBooking.update({ where: { id }, data: { status: 'PAUSED' } })
    await recordAdEvent({
      actorId: user.id,
      campaignId: id,
      action: 'AD_PAUSED',
      before: { status: campaign.status },
      after: { status: 'PAUSED' },
      tx,
    })
  })

  revalidatePath('/advertisements')
  refresh()
  return { ok: true }
}

export async function resumeCampaignAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  if (!may(campaign.status, 'resume')) {
    return { ok: false, error: 'Only a paused campaign can be resumed.' }
  }

  const now = new Date()
  // A campaign whose window closed while it was paused does not come back to
  // life — it goes to its real end state instead.
  const next: AdStatus =
    campaign.endsAt && campaign.endsAt <= now ? 'ENDED'
    : campaign.startsAt && campaign.startsAt > now ? 'SCHEDULED'
    : 'RUNNING'

  await prisma.$transaction(async (tx) => {
    await tx.adBooking.update({ where: { id }, data: { status: next } })
    await recordAdEvent({
      actorId: user.id,
      campaignId: id,
      action: 'AD_RESUMED',
      before: { status: campaign.status },
      after: { status: next },
      tx,
    })
  })

  revalidatePath('/advertisements')
  refresh()
  return { ok: true }
}

/** Ends a campaign before it runs, or part-way through. */
export async function cancelCampaignAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  if (!may(campaign.status, 'cancel')) {
    return { ok: false, error: 'This campaign cannot be cancelled.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.adBooking.update({
      where: { id },
      data: { status: 'CANCELLED', isFeatured: false, featuredPriority: 0 },
    })
    // A cancelled campaign must not keep a featured slot warm.
    await tx.adFeaturedSlot.updateMany({ where: { bookingId: id }, data: { bookingId: null } })

    await recordAdEvent({
      actorId: user.id,
      campaignId: id,
      action: 'AD_CANCELLED',
      before: { status: campaign.status },
      after: { status: 'CANCELLED' },
      tx,
    })
  })

  revalidatePath('/advertisements')
  refresh()
  return { ok: true }
}

/**
 * §22 — a copy that starts fresh.
 *
 * The creative, targeting and preferences carry over; the id, payment,
 * analytics, approval history and status do not. The copy is a DRAFT.
 */
export async function duplicateCampaignAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  const copy = await prisma.$transaction(async (tx) => {
    const made = await tx.adBooking.create({
      data: {
        advertiserId: user.id,
        title: `${campaign.title} (copy)`,
        description: campaign.description,
        objective: campaign.objective,
        adTypeId: campaign.adTypeId,
        brandName: campaign.brandName,
        tagline: campaign.tagline,
        headline: campaign.headline,
        ctaText: campaign.ctaText,
        logoUrl: campaign.logoUrl,
        imageUrl: campaign.imageUrl,
        imageKey: campaign.imageKey,
        mobileImageUrl: campaign.mobileImageUrl,
        targetUrl: campaign.targetUrl,
        placementId: campaign.placementId,
        categoryId: campaign.categoryId,
        packageId: campaign.packageId,
        // Deliberately NOT copied: dates, payment, analytics, review verdict,
        // featured placement, submission time. A copy has no history.
        status: 'DRAFT',
      },
      select: { id: true },
    })

    if (campaign.extraPlacements.length) {
      await tx.adCampaignPlacement.createMany({
        data: campaign.extraPlacements.map((e) => ({
          bookingId: made.id,
          placementId: e.placementId,
          price: e.price,
          priority: e.priority,
          weight: e.weight,
        })),
      })
    }

    if (campaign.targeting) {
      const { id: _drop, bookingId: _also, ...rest } = campaign.targeting
      await tx.adTargeting.create({ data: { ...rest, bookingId: made.id } })
    }

    await recordAdEvent({
      actorId: user.id,
      campaignId: made.id,
      action: 'AD_DUPLICATED',
      after: { copiedFrom: campaign.id },
      tx,
    })

    return made
  })

  refresh()
  return { ok: true, id: copy.id }
}

/** Throws a draft away for good. */
export async function deleteDraftAction(id: string): Promise<Result> {
  const { user, campaign, error } = await load(id)
  if (!campaign || !user) return { ok: false, error: error! }

  if (!may(campaign.status, 'delete')) {
    return { ok: false, error: 'Only a draft can be deleted. Cancel the campaign instead.' }
  }

  // Recorded before the row goes, so the trail outlives the campaign.
  await recordAdEvent({
    actorId: user.id,
    campaignId: id,
    action: 'AD_DRAFT_DELETED',
    before: { title: campaign.title, status: campaign.status },
  })

  await prisma.adBooking.delete({ where: { id } })

  refresh()
  return { ok: true }
}
