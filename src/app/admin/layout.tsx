import Link from 'next/link'
import Image from 'next/image'
import { requireAdminShell } from '@/lib/guard'
import { can, type Permission } from '@/config/permissions'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/logo'
import { SignOutButton } from '@/components/sign-out-button'
import { Icon } from '@/components/ui'
import { AdminSidebarNav, type NavGroup } from '@/components/admin/admin-sidebar'
import { AdminCanvasFit } from '@/components/admin/canvas-fit'
import { TopBarTitle } from '@/components/admin/top-bar-title'
import { unreadCount, sidebarBadges } from '@/lib/admin-metrics'

/**
 * The admin shell — a dark grouped sidebar and a light working area with a
 * persistent top bar, an exact replica of the Super-Admin reference.
 *
 * ★ ONE layout for every device. The whole thing is a fixed 1280-wide desktop
 *   canvas (`.admin-canvas`); a tablet or phone shows the SAME layout scaled
 *   down, never a reflowed one — see the `.admin-canvas` zoom steps in
 *   globals.css.
 *
 * The logo at the top of the sidebar is the ArchFacing brand logo, the same one
 * the public header carries.
 */

/**
 * The Admin sidebar — the full module map from the reference, grouped into
 * Platform / Content / Business / Membership / System / Support.
 *
 * The per-content-type items (Projects, Products, Around Us, Artistry, Blog,
 * Design Competitions) open the moderation queue filtered to that type — the
 * one place postings of a type are actually managed — rather than separate
 * CRUD pages. Every href resolves to a real, working route.
 */

/** The Seller Studio (e-commerce) sidebar — shown for /admin/seller/* instead
 *  of the super-admin nav. Its own compact commerce toolset. */
const SELLER_NAV: NavGroup[] = [
  {
    title: 'Seller Studio',
    items: [
      { label: 'Dashboard', icon: 'grid', href: '/admin/seller' },
      { label: 'Product Listing', icon: 'box', href: '/admin/seller/products' },
      { label: 'Product Categories', icon: 'tag', href: '/admin/seller/categories' },
      { label: 'Orders', icon: 'bag', href: '/admin/seller/orders' },
      { label: 'Coupon Codes', icon: 'star', href: '/admin/seller/coupons' },
      { label: 'Podcast', icon: 'monitor', href: '/admin/seller/podcasts' },
    ],
  },
  {
    title: 'Store',
    items: [{ label: 'Back to Admin Panel', icon: 'shield', href: '/admin' }],
  },
]

type NavItem = NavGroup['items'][number]
type PermItem = Omit<NavItem, 'children'> & { perm?: Permission; children?: (NavItem & { perm?: Permission })[] }
type PermGroup = { title: string; items: PermItem[] }

/**
 * The module map. Every item names the permission its page enforces, so the
 * sidebar shows a staff member exactly the modules they can open — and every
 * href is a real route (no more links that land on Settings or Reports).
 */
function buildNav(badges: {
  moderation: number
  verification: number
  complaints: number
}): PermGroup[] {
  return [
    { title: '', items: [{ label: 'Dashboard', icon: 'grid', href: '/admin', perm: 'admin:reports' }] },
    {
      title: 'Platform Management',
      items: [
        {
          label: 'Users & Roles', icon: 'users', href: '/admin/users', perm: 'admin:users',
          children: [
            { label: 'All Users', icon: 'users', href: '/admin/users', perm: 'admin:users' },
            { label: 'Admins', icon: 'shield', href: '/admin/admins', perm: 'admin:users' },
            { label: 'Employees', icon: 'user', href: '/admin/employees', perm: 'admin:employees' },
            { label: 'Buyers / Clients', icon: 'heart', href: '/admin/visitors', perm: 'admin:users' },
            { label: 'Verification Queue', icon: 'shield', href: '/admin/visitors/verification', perm: 'admin:users' },
            { label: 'Verification Settings', icon: 'settings', href: '/admin/visitors/verification/settings', perm: 'admin:users' },
          ],
        },
        { label: 'Professionals (DESIGNA)', icon: 'user', href: '/admin/professionals', perm: 'admin:users', badge: badges.verification, badgeTone: 'warn' },
        { label: 'Corporates & BMFs', icon: 'building', href: '/admin/corporates', perm: 'admin:users' },
        { label: 'Students', icon: 'award', href: '/admin/students', perm: 'admin:users' },
        { label: 'Design Associates', icon: 'shield', href: '/admin/design-associates', perm: 'admin:users' },
        { label: 'Role Permissions', icon: 'shield', href: '/admin/role-permissions', perm: 'admin:users' },
      ],
    },
    {
      title: 'Content Management',
      items: [
        { label: 'Moderation Queue', icon: 'list', href: '/admin/moderation', perm: 'admin:moderate', badge: badges.moderation, badgeTone: 'danger' },
        { label: 'Projects', icon: 'building', href: '/admin/projects', perm: 'admin:moderate' },
        { label: 'Products', icon: 'box', href: '/admin/products', perm: 'admin:moderate' },
        { label: 'Around Us', icon: 'globe', href: '/admin/around-us', perm: 'admin:moderate' },
        { label: 'Artistry', icon: 'image', href: '/admin/artistry', perm: 'admin:moderate' },
        { label: 'Blog', icon: 'file', href: '/admin/blog', perm: 'admin:moderate' },
        { label: 'Design Competitions', icon: 'trophy', href: '/admin/competitions', perm: 'admin:moderate' },
        { label: 'Categories', icon: 'tag', href: '/admin/categories', perm: 'admin:categories' },
      ],
    },
    {
      title: 'Business & Marketing',
      items: [
        { label: 'Leads & Enquiries', icon: 'inbox', href: '/admin/leads', perm: 'admin:leads' },
        { label: 'Growth & Demand', icon: 'trending', href: '/admin/growth', perm: 'admin:leads' },
        { label: 'PACT Area Management', icon: 'map', href: '/admin/pact', perm: 'admin:pact' },
        { label: 'Advertisements', icon: 'star', href: '/admin/ads', perm: 'admin:ads' },
        { label: 'Newsletter', icon: 'mail', href: '/admin/newsletter', perm: 'admin:reports' },
        { label: 'Reports & Insights', icon: 'chart', href: '/admin/reports', perm: 'admin:reports' },
      ],
    },
    {
      title: 'Membership & Finance',
      items: [
        { label: 'Club & Events', icon: 'award', href: '/admin/club', perm: 'admin:club' },
        { label: 'Subscription & Plans', icon: 'tag', href: '/admin/plans', perm: 'admin:plans' },
        { label: 'Payment & Transactions', icon: 'rupee', href: '/admin/payments', perm: 'admin:payments' },
        { label: 'Merchandise Store', icon: 'bag', href: '/admin/seller', perm: 'seller:merchandise' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Website Settings', icon: 'settings', href: '/admin/settings', perm: 'admin:settings' },
        { label: 'Trusted Brands', icon: 'star', href: '/admin/settings/brands', perm: 'admin:settings' },
      ],
    },
    {
      title: 'Support & Security',
      items: [
        { label: 'Support Tickets', icon: 'help', href: '/admin/support', perm: 'admin:support' },
        { label: 'Activity & Audit Log', icon: 'list', href: '/admin/user-activity', perm: 'admin:reports' },
        { label: 'Trust & Complaints', icon: 'shield', href: '/admin/trust', perm: 'admin:audit', badge: badges.complaints, badgeTone: 'warn' },
      ],
    },
  ]
}

/** Keeps only what this account may open; a parent survives if any child does. */
function navFor(groups: PermGroup[], role: Parameters<typeof can>[0], grants: string[]): NavGroup[] {
  const ok = (p?: Permission) => !p || can(role, p, grants)
  return groups
    .map((g) => ({
      title: g.title,
      items: g.items
        .map((it) => {
          const children = it.children?.filter((c) => ok(c.perm))
          if (it.children) return children && children.length ? { ...it, href: children[0].href, children } : null
          return ok(it.perm) ? it : null
        })
        .filter(Boolean) as NavGroup['items'],
    }))
    .filter((g) => g.items.length > 0)
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  ADMIN_SELLER: 'Seller Admin',
  RM_EMPLOYEE: 'Employee',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminShell()

  const [me, unread, badges] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { profilePhoto: true } }),
    unreadCount(user.id),
    sidebarBadges(),
  ])


  const initial = user.name?.[0]?.toUpperCase() ?? 'A'
  const roleLabel = ROLE_LABEL[user.role] ?? 'Administrator'

  return (
    <div className="admin-viewport min-h-screen bg-paper">
      <AdminCanvasFit />
      <div className="admin-canvas flex h-screen">
        {/* ═══════════ dark sidebar (fixed) ═══════════ */}
        <aside className="flex h-full w-[232px] shrink-0 flex-col bg-[#0F172A]">
          <div className="flex h-[64px] shrink-0 items-center border-b border-white/10 px-4">
            <span className="rounded-md bg-white/95 px-2 py-1">
              <Logo size="sm" priority asLink={false} />
            </span>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
            <AdminSidebarNav groups={navFor(buildNav(badges), user.role, user.permissions)} sellerGroups={SELLER_NAV} />
          </div>

          <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 text-[12.5px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="grid" className="h-4 w-4" />
              Back to Website
            </Link>
          </div>
        </aside>

        {/* ═══════════ working area ═══════════ */}
        <div className="flex h-full min-w-0 flex-1 flex-col bg-paper">
          {/* top bar (fixed) */}
          <header className="shrink-0 border-b border-line bg-paper">
            <div className="flex items-center gap-4 px-6 py-3">
              {/* title (page-aware) */}
              <TopBarTitle />

              {/* search */}
              <form action="/admin/search" className="relative mx-auto w-full max-w-[420px]">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  name="q"
                  placeholder="Search anything (users, projects, products…)"
                  className="h-10 w-full rounded-lg border border-line bg-paper-2 pl-10 pr-14 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-4">
                  Enter
                </span>
              </form>

              {/* right cluster */}
              <div className="flex shrink-0 items-center gap-3">
                {/* reports shortcut */}
                {can(user.role, 'admin:reports', user.permissions) && (
                  <Link href="/admin/reports" aria-label="Reports" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:text-brand">
                    <Icon name="chart" className="h-[18px] w-[18px]" />
                  </Link>
                )}

                {/* bell */}
                <Link href="/admin/notifications" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:text-brand">
                  <Icon name="bell" className="h-[19px] w-[19px]" />
                  {unread > 0 && (
                    <span className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>

                {/* profile */}
                <span className="flex items-center gap-2.5 border-l border-line pl-3">
                  <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand text-[13px] font-bold text-white">
                    {me?.profilePhoto ? (
                      <Image src={me.profilePhoto} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block max-w-[130px] truncate text-[13px] font-semibold text-ink">
                      {user.name}
                    </span>
                    <span className="block text-[11px] text-ink-3">{roleLabel}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  <SignOutButton className="ml-1 text-ink-3 hover:text-brand" />
                </span>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
