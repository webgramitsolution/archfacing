import { HEADER_NAV } from '@/config/nav'
import { auth, dashboardPathFor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DrawerNavItem, DrawerUser } from '@/components/mobile/mobile-nav-drawer'

/**
 * The phone menu's contents, flattened from HEADER_NAV — the same source the
 * desktop mega-menu reads, so the two can never disagree. Links are built
 * exactly as the mega-menu builds them (`?category=` / `&sub=`).
 */
export function drawerItems(): DrawerNavItem[] {
  return HEADER_NAV.map((item) => {
    const param = item.megaParam ?? 'category'
    if (item.mega?.length) {
      return {
        label: item.label,
        href: item.href,
        groups: item.mega.map((col) => ({
          name: col.name,
          href: `${item.href}?${param}=${col.slug}`,
          children: col.children?.map((c) => ({ name: c.name, href: `${item.href}?${param}=${col.slug}&sub=${c.slug}` })),
        })),
      }
    }
    if (item.links?.length) {
      return { label: item.label, href: item.href, groups: item.links.map((l) => ({ name: l.title, href: l.href })) }
    }
    return { label: item.label, href: item.href }
  })
}

/** Where each role's leads / enquiries live — the phone tab bar's centre button. */
const LEADS_BY_ROLE: Record<string, string> = {
  PROFESSIONAL: '/dashboard/professional/enquiries',
  CONSULTANT: '/dashboard/consultant/enquiries',
  BMF: '/dashboard/bmf/enquiries',
  CORPORATE: '/dashboard/corporate/enquiries',
  EMPLOYEE: '/dashboard/employee/leads',
  ADMIN: '/admin/leads',
  SUPER_ADMIN: '/admin/leads',
}

/** Who is looking, for the phone header, drawer and tab bar. */
export async function mobileSession(): Promise<{ user: DrawerUser; unread: number; signedIn: boolean; dashboardHref: string; leadsHref: string }> {
  const session = await auth()
  const u = session?.user
  if (!u?.id) return { user: null, unread: 0, signedIn: false, dashboardHref: '/login', leadsHref: '/login' }
  const [row, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: u.id }, select: { profilePhoto: true, logo: true, name: true } }),
    prisma.notification.count({ where: { userId: u.id, isRead: false } }),
  ])
  const dashboardHref = dashboardPathFor(u.role)
  return {
    user: { name: row?.name ?? u.name ?? 'Account', dashboardHref, photo: row?.profilePhoto ?? row?.logo ?? null },
    unread,
    signedIn: true,
    dashboardHref,
    leadsHref: LEADS_BY_ROLE[u.role] ?? dashboardHref,
  }
}
