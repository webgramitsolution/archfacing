import { prisma } from '@/lib/prisma'
import { CHANNELS, resolvePrefs, type Channel, type NotifPrefs } from '@/lib/notification-prefs'

/**
 * Server-only helpers for notification preferences — kept apart from
 * `notification-prefs.ts` (which the client grid imports) so Prisma never
 * leaks into the browser bundle.
 */

/** The reader's complete, resolved matrix for one user. */
export async function getUserNotifPrefs(userId: string): Promise<NotifPrefs> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  })
  return resolvePrefs(row?.notificationPrefs ?? null)
}

/**
 * Which channels a given notification should actually go out on for a user.
 * This is the hook every notification source can call before sending — e.g.
 * `const chans = await channelsFor(userId, 'new-lead')` → only create the
 * in-app row / send the email if the matching channel is true. Unknown keys
 * fall through to "all channels" so a not-yet-catalogued notification is never
 * silently swallowed.
 */
export async function channelsFor(userId: string, key: string): Promise<Record<Channel, boolean>> {
  const prefs = await getUserNotifPrefs(userId)
  const row = prefs[key]
  if (!row) return { email: true, sms: true, whatsapp: true, inApp: true }
  return { ...row }
}

/** Convenience: should an in-app Notification row be created for this event? */
export async function shouldNotifyInApp(userId: string, key: string): Promise<boolean> {
  const chans = await channelsFor(userId, key)
  return chans.inApp
}

export { CHANNELS }
