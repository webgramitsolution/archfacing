import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { messagesPathFor } from '@/lib/auth'
import { unreadMessageCount } from '@/lib/chat'
import { DashboardHeader } from './dashboard-header'

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  ADMIN_SELLER: 'Seller Panel',
  RM_EMPLOYEE: 'RM Employee',
  CLIENT: 'Client',
  PROFESSIONAL: 'Professional',
  CONSULTANT: 'Consultant',
  BMF: 'BMF',
  CORPORATE: 'Corporate',
  EXTERNAL_ADVERTISER: 'Advertiser',
}

/**
 * Reads the counts the header shows, then hands them to the client component.
 *
 * Kept apart from `DashboardHeader` so the badge numbers are fetched on the
 * server — a client component cannot touch Prisma, and passing a whole user
 * row through props would ship fields the header never renders.
 */
export async function DashboardHeaderSlot({
  user,
}: {
  user: { id: string; name?: string | null; email?: string | null; role: Role; profilePhoto?: string | null }
}) {
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    // Unread direct messages — the chats from Artistry / Around Us posts.
    // Leads are counted on their own screen, not here.
    unreadMessageCount(user.id),
  ])

  const base = `/dashboard/${user.role.toLowerCase()}`

  return (
    <DashboardHeader
      user={{ name: user.name, email: user.email, profilePhoto: user.profilePhoto ?? null }}
      roleLabel={ROLE_LABEL[user.role]}
      actions={actionsFor(user.role, base)}
      messagesHref={messagesPathFor(user.role)}
      unreadNotifications={unreadNotifications}
      unreadMessages={unreadMessages}
    />
  )
}

/**
 * The two shortcuts in the header, per role.
 *
 * Every pair below is checked against the permission matrix (§7.4.1) — a
 * button that opens a form the role may not submit is worse than no button.
 *
 * ⚠️ The BMF blueprint draws "Post Product" and "Post Deal" here. Neither is
 *    a BMF's to post: `post:product` is granted to Professional, Consultant
 *    and Corporate only, and deals/offers have no model on the platform at
 *    all. A BMF facilitates materials rather than listing them. So the two
 *    slots keep their place in the layout and carry what a BMF may actually
 *    do — post a Blog, and put up a Design Competition.
 */
function actionsFor(role: Role, base: string): { label: string; href: string }[] {
  switch (role) {
    case 'CONSULTANT':
      // The consultant leads with services, then projects — matching the
      // consultant dashboard reference.
      return [
        { label: 'Post Service', href: `${base}/services` },
        { label: 'Post Project', href: `${base}/projects` },
      ]
    case 'PROFESSIONAL':
    case 'CORPORATE':
      return [
        { label: 'Post Project', href: `${base}/projects` },
        { label: 'Post Product', href: `${base}/products` },
      ]
    case 'BMF':
      return [
        { label: 'Post Blog', href: `${base}/blog` },
        { label: 'Post Competition', href: `${base}/competition` },
      ]
    case 'CLIENT':
      return [
        { label: 'Post Requirement', href: `${base}/competition` },
        { label: 'Post Artistry', href: `${base}/artistry` },
      ]
    default:
      return []
  }
}
