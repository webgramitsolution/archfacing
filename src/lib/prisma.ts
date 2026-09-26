import { PrismaClient } from '@prisma/client'
import { resolvePrefs } from '@/lib/notification-prefs'

/**
 * Notification.type → the Notification Settings row that governs it.
 *
 * Only types the member can opt out of are listed. Everything else —
 * payments, orders, refunds, support replies, PACT suspension, verification,
 * access changes — is transactional and is always delivered.
 */
export const NOTIF_TYPE_PREF: Record<string, string> = {
  NEW_ENQUIRY: 'new-lead',
  ENQUIRY_REPLY: 'new-lead',
  DIRECT: 'direct-messages',
  STOREFRONT_MESSAGE: 'direct-messages',
  POST_APPROVED: 'product-approval',
  POST_REJECTED: 'product-approval',
  PACT_EXPIRING: 'membership-updates',
  PORTAL_SPACE_ADDED: 'membership-updates',
  PORTAL_SPACE_EXPIRED: 'membership-updates',
  CLUB_ACTIVE: 'membership-updates',
  POST_COMMENT: 'reviews',
}

type NotifData = { userId?: string; user?: { connect?: { id?: string } }; type?: string }

/**
 * Creates a client whose `notification.create` / `createMany` honour each
 * member's in-app setting (User.notificationPrefs, edited at
 * /dashboard/settings/notifications). Every call site in the app goes through
 * here, so no source has to remember to check.
 */
function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  // Some client components reach this module through a shared import chain
  // (e.g. artistry-gallery → blog → settings). Prisma's browser stub throws on
  // any property access, `$extends` included — so in the browser hand back the
  // inert stub untouched, exactly as before the extension existed.
  if (typeof window !== 'undefined') return base as unknown as ReturnType<typeof extend>
  return extend(base)
}

function extend(base: PrismaClient) {
  /** true when this member switched off the in-app channel for this type. */
  async function muted(data: NotifData): Promise<boolean> {
    const key = data.type ? NOTIF_TYPE_PREF[data.type] : undefined
    const userId = data.userId ?? data.user?.connect?.id
    if (!key || !userId) return false
    try {
      const row = await base.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } })
      if (!row?.notificationPrefs) return false
      return resolvePrefs(row.notificationPrefs)[key]?.inApp === false
    } catch {
      return false // a prefs read failure never swallows a notification
    }
  }

  return base.$extends({
    query: {
      notification: {
        async create({ args, query }) {
          const data = args.data as NotifData & { title?: string; body?: string; link?: string | null }
          if (await muted(data)) {
            // Shaped like a row so callers that read the result keep working.
            return {
              id: 'muted',
              userId: data.userId ?? data.user?.connect?.id ?? '',
              type: data.type ?? '',
              title: data.title ?? '',
              body: data.body ?? '',
              link: data.link ?? null,
              isRead: true,
              createdAt: new Date(),
            } as Awaited<ReturnType<typeof query>>
          }
          return query(args)
        },
        async createMany({ args, query }) {
          const rows = (Array.isArray(args.data) ? args.data : [args.data]) as NotifData[]
          const flags = await Promise.all(rows.map(muted))
          const kept = rows.filter((_, i) => !flags[i])
          if (kept.length === 0) return { count: 0 }
          return query({ ...args, data: kept as typeof args.data })
        },
      },
    },
  })
}

/**
 * Typed as the plain client: the extension only filters notification writes,
 * so every existing signature (Prisma.TransactionClient etc.) stays valid.
 */
type Client = PrismaClient

/**
 * In development, Next.js hot-reload creates a new client on every reload and
 * exhausts the connection pool — so we cache it on the global object.
 */
const globalForPrisma = globalThis as unknown as { prismaX?: Client }

export const prisma: Client = globalForPrisma.prismaX ?? (createClient() as unknown as PrismaClient)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaX = prisma
