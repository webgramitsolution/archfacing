/**
 * Daily PACT maintenance.
 *
 *   GET /api/cron/pact
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * It performs seven jobs:
 *   1. Release held seats when payment does not arrive within 15 minutes
 *   2. Mark PACTs whose term has ended as EXPIRED
 *   3. §3.1.8.5 — cessation (30 days of inactivity or 5 complaints)
 *   4. Send reminders before a term expires (90/30/7 days)
 *   5. §7.4.6 — end advertisements whose last day has passed
 *   6. §7.4.6 — free the slots of advertisements that were never paid for
 *   7. §5.2.9 — reclaim Portal Space that has completed its 5-year term
 *   8. Verification — escalate overdue checks, lapse and remind (Verification Settings)
 *
 * Schedule the cron on Hostinger like this (daily at 2 AM):
 *   0 2 * * *  curl -H "Authorization: Bearer $CRON_SECRET" https://archfacing.com/api/cron/pact
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import {
  releaseExpiredReservations,
  expireOldPacts,
  runCessationChecks,
  sendExpiryReminders,
} from '@/lib/pact'
import { endFinishedAds, startScheduledAds, releaseUnpaidBookings } from '@/lib/ads'
import { expirePortalSpace } from '@/lib/portal-space'
import { runVerificationMaintenance } from '@/lib/verification-config'

export const dynamic = 'force-dynamic'

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  // If no secret is set, keep the endpoint closed — leaving it open is dangerous
  if (!secret) return false

  const header = req.headers.get('authorization') ?? ''
  const given = header.replace(/^Bearer\s+/i, '')
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()

  const [released, expired, cessation, reminders, adsEnded, adsStarted, adsReleased, spaceReclaimed, verification] =
    await Promise.all([
      releaseExpiredReservations(),
      expireOldPacts(),
      runCessationChecks(),
      sendExpiryReminders(),
      // §7.4.6 — a finished run has to be closed before its slot can be sold
      // again, and an unpaid booking must not keep holding one.
      endFinishedAds(),
      // §24 — and an approved campaign goes live on the morning it starts.
      startScheduledAds(),
      releaseUnpaidBookings(),
      // §5.2.9 — lower the quota once a 5-year pack ends. Published files are
      // never deleted; only the allowance to upload more comes down.
      expirePortalSpace(),
      runVerificationMaintenance(),
    ])

  const result = {
    ranAt: startedAt.toISOString(),
    tookMs: Date.now() - startedAt.getTime(),
    releasedReservations: released,
    expiredPacts: expired,
    suspendedByComplaints: cessation.byComplaints,
    suspendedByInactivity: cessation.byInactivity,
    expiryRemindersSent: reminders,
    adsEnded: adsEnded.ended,
    adsStarted: adsStarted.started,
    adBookingsReleased: adsReleased.released,
    portalSpaceReclaimed: spaceReclaimed.reclaimed,
    verificationEscalated: verification.escalated,
    verificationReminders: verification.reminded,
    verificationLapsed: verification.lapsed,
  }

  console.log('🕑 PACT cron:', result)
  return NextResponse.json(result)
}
