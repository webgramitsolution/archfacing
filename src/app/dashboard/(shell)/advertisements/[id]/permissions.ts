import type { AdStatus } from '@prisma/client'

/**
 * What an advertiser may do to a campaign, by the state it is in — §8.
 *
 * ONE table, read in three places: the detail page draws the buttons from it,
 * the client action bar disables what is missing, and every server action
 * re-checks it before doing anything. A button the UI should not have shown is
 * therefore refused again on the server rather than merely being hidden.
 *
 * It lives in its own module because a `'use server'` file may export only
 * async functions — a shared constant cannot sit beside the actions.
 */

export type CampaignAction =
  | 'edit'
  | 'withdraw'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'duplicate'
  | 'delete'
  | 'analytics'

export const ALLOWED: Record<AdStatus, readonly CampaignAction[]> = {
  DRAFT: ['edit', 'duplicate', 'delete'],
  PENDING_PAYMENT: ['edit', 'withdraw', 'duplicate'],
  PENDING_REVIEW: ['withdraw', 'duplicate'],
  CHANGES_REQUESTED: ['edit', 'duplicate'],
  REJECTED: ['edit', 'duplicate'],
  SCHEDULED: ['edit', 'cancel', 'duplicate'],
  RUNNING: ['pause', 'analytics', 'duplicate'],
  PAUSED: ['resume', 'cancel', 'analytics', 'duplicate'],
  ENDED: ['analytics', 'duplicate'],
  CANCELLED: ['duplicate'],
}

export function may(status: AdStatus, action: CampaignAction): boolean {
  return ALLOWED[status].includes(action)
}
