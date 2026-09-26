/**
 * The campaign trail — §20.
 *
 * Every meaningful thing that happens to a campaign is written to the
 * platform's existing `AuditLog`, not to a table of its own: the admin side
 * already writes `AD_APPROVED` and `AD_REJECTED` there, and a second trail
 * would mean the campaign's history depended on which side you asked.
 *
 * `before` and `after` carry the field values that changed, so the timeline
 * can say what a status moved *from*, not only what it moved to.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export type AdAction =
  | 'AD_CAMPAIGN_CREATED'
  | 'AD_DRAFT_UPDATED'
  | 'AD_CREATIVE_UPLOADED'
  | 'AD_PLACEMENT_SELECTED'
  | 'AD_SUBMITTED'
  | 'AD_RESUBMITTED'
  | 'AD_WITHDRAWN'
  | 'AD_PAUSED'
  | 'AD_RESUMED'
  | 'AD_CANCELLED'
  | 'AD_DUPLICATED'
  | 'AD_DRAFT_DELETED'
  | 'AD_PAYMENT_CREATED'
  | 'AD_APPROVED'
  | 'AD_REJECTED'
  | 'AD_CHANGES_REQUESTED'
  | 'AD_FEATURED_ASSIGNED'
  | 'AD_FEATURED_CLEARED'
  | 'AD_FEATURED_ENABLED'
  | 'AD_FEATURED_DISABLED'
  | 'AD_FEATURED_REORDERED'

/** Records one campaign event. Never throws into the caller's path. */
export async function recordAdEvent(params: {
  actorId: string
  campaignId: string
  action: AdAction
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
  /** Run inside an open transaction when the event must land with the change. */
  tx?: Prisma.TransactionClient
}) {
  const db = params.tx ?? prisma

  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: 'AdBooking',
        entityId: params.campaignId,
        ...(params.before !== undefined ? { before: params.before } : {}),
        ...(params.after !== undefined ? { after: params.after } : {}),
      },
    })
  } catch (e) {
    // An audit write must never be the reason a campaign action fails. It is
    // logged so a missing trail is visible in the server output.
    console.error('Audit write failed:', params.action, params.campaignId, e)
  }
}

/** Plain English for the timeline, keyed by the action. */
const SAID: Record<string, string> = {
  AD_CAMPAIGN_CREATED: 'Campaign created',
  AD_DRAFT_UPDATED: 'Draft updated',
  AD_CREATIVE_UPLOADED: 'Creative uploaded',
  AD_PLACEMENT_SELECTED: 'Placement selected',
  AD_SUBMITTED: 'Submitted for review',
  AD_RESUBMITTED: 'Resubmitted for review',
  AD_WITHDRAWN: 'Withdrawn from review',
  AD_PAUSED: 'Campaign paused',
  AD_RESUMED: 'Campaign resumed',
  AD_CANCELLED: 'Campaign cancelled',
  AD_DUPLICATED: 'Duplicated into a new draft',
  AD_DRAFT_DELETED: 'Draft deleted',
  AD_PAYMENT_CREATED: 'Payment created',
  AD_APPROVED: 'Approved by ArchFacing',
  AD_REJECTED: 'Rejected by ArchFacing',
  AD_CHANGES_REQUESTED: 'Changes requested by ArchFacing',
  AD_FEATURED_ASSIGNED: 'Added to the featured rail',
  AD_FEATURED_CLEARED: 'Removed from the featured rail',
}

export function describeAdEvent(action: string): string {
  return SAID[action] ?? action.replace(/^AD_/, '').toLowerCase().replace(/_/g, ' ')
}

/** The campaign's history, newest first. */
export async function campaignTimeline(campaignId: string, take = 30) {
  const rows = await prisma.auditLog.findMany({
    where: { entityType: 'AdBooking', entityId: campaignId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      action: true,
      before: true,
      after: true,
      createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    what: describeAdEvent(r.action),
    at: r.createdAt,
    by: r.actor?.name ?? 'System',
    /** An admin action is shown differently from the advertiser's own. */
    byPlatform: Boolean(
      r.actor?.role && ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE'].includes(r.actor.role)
    ),
    before: r.before,
    after: r.after,
  }))
}
