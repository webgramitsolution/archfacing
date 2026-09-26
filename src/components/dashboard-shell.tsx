import Link from 'next/link'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  PROFILE_STRENGTH_SELECT, CORPORATE_PROFILE_SELECT, strengthOf, corporateStrengthOf,
} from '@/lib/profile-strength'
import { Logo } from './logo'
import { SignOutButton } from './sign-out-button'
import { Icon, type IconName } from './ui'
import { DashboardMobileNav } from './dashboard-mobile-nav'
import { DashboardSidebar } from './dashboard-sidebar'

export type NavItem = {
  label: string
  href: string
  ref?: string
  soon?: boolean
  badge?: number
  icon?: IconName
  /** Shows in the phone tab bar. Up to four; the rest go in the More sheet. */
  primary?: boolean
  /** One word for the phone tab bar, where a full label will not fit. */
  short?: string
  /**
   * Sub-items, shown as a dropdown under this row.
   *
   * Every posting type has the same two: the list of what you have already
   * posted, and the form for the next one. Before this the menu offered one
   * row that did both, so "My Projects" opened a page that was mostly a blank
   * form and the seven projects were below the fold.
   *
   * A parent with children is still a link — clicking it opens the list.
   */
  children?: NavItem[]
}

/**
 * A titled run of nav items. The blueprint groups the sidebar under small
 * uppercase headings — My Business, Engagement, Content Management and so on.
 * A group with no title sits at the top, above the first heading.
 */
export type NavGroup = {
  title?: string
  items: NavItem[]
}

/** Accepts either shape, so roles that have not been grouped yet still work. */
export type DashboardNav = NavItem[] | NavGroup[]

function asGroups(nav: DashboardNav): NavGroup[] {
  if (nav.length === 0) return []
  return 'items' in nav[0] ? (nav as NavGroup[]) : [{ items: nav as NavItem[] }]
}

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

const SIDEBAR_W = 'w-[225px]'

export type ShellUser = {
  id: string
  name?: string | null
  role: Role
  status: string
  profilePhoto?: string | null
}

/**
 * How complete a profile is, as a percentage.
 *
 * Counted from fields that are genuinely filled in, so the bar moves when the
 * reader acts on it. A fixed number would be decoration; this is a to-do list
 * expressed as a percentage.
 *
 * ⚠️ Read here rather than taken from the guard. `requireAuth` selects only
 *    id, name, email, role and status — deliberately light, since it runs on
 *    every protected page — so these fields would all be undefined and the
 *    bar would read 25% on a fully filled profile.
 */
/**
 * How much of this account's profile is filled in.
 *
 * The number is per-account and moves as the reader fills the form in — an
 * account that has not been completed reads low, which is the point.
 *
 * The field list and the arithmetic live in `@/lib/profile-strength`, because
 * the dashboard home shows this same figure in its right rail and the two used
 * to compute it from different lists.
 */
async function profileStrength(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PROFILE_STRENGTH_SELECT,
      // A Corporate account's profile is the company's, so its own fields
      // count too — see `corporateStrengthOf`.
      corporateProfile: { select: CORPORATE_PROFILE_SELECT },
    },
  })
  if (!u) return 0
  return u.corporateProfile ? corporateStrengthOf(u, u.corporateProfile) : strengthOf(u)
}

/**
 * The dashboard frame, per the blueprint.
 *
 * Three fixed pieces and one that moves: a dark sidebar down the left, a white
 * bar across the top, and the page scrolling between them.
 *
 * The sidebar lives in its own client component because it holds the
 * collapsed/expanded choice; everything here stays on the server.
 */
export async function DashboardShell({
  user,
  nav,
  header,
  children,
}: {
  user: ShellUser
  nav: DashboardNav
  /** The top bar's controls — search, post buttons, notifications, account */
  header: React.ReactNode
  children: React.ReactNode
}) {
  const groups = asGroups(nav)
  const strength = await profileStrength(user.id)

  return (
    /*
     * An app shell from `md` up: the window itself never scrolls, and the two
     * regions that do own their own scrollbar.
     *
     * That is what keeps the header clean. With a document scroll the
     * browser's bar runs the whole window height and passes behind the sticky
     * header; here the bar belongs to <main>, so it starts under the header
     * and stops at the bottom of the content.
     *
     * Below `md` the shell is dropped and the page scrolls normally — a fixed
     * viewport height fights the address bar that phone browsers show and
     * hide as you scroll.
     */
    <div className="bg-admin-page md:flex md:h-screen md:overflow-hidden">
      <div className="flex md:contents">
        {/* ═══════════ sidebar ═══════════ */}
        <DashboardSidebar
          user={user}
          groups={groups}
          roleLabel={ROLE_LABEL[user.role]}
          widthClass={SIDEBAR_W}
          profileStrength={strength}
          profileHref={`/dashboard/${user.role.toLowerCase()}/profile`}
        />

        {/* ═══════════ everything to the right of it ═══════════ */}
        <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
          {/* Slimmer on a phone, the way an app bar is; the tablet and
              desktop keep the blueprint's 74px. */}
          <header className="sticky top-0 z-40 flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-paper-2 px-4 md:static md:h-[74px] md:px-5">
            {/* the logo repeats here only where the sidebar is hidden */}
            <span className="md:hidden">
              <Logo size="sm" />
            </span>

            {header}
          </header>

          {user.status === 'PENDING_VERIFICATION' && (
            <div className="border-b border-warn/25 bg-warn-soft">
              <div className="flex items-center gap-2.5 px-4 py-2.5 lg:px-5">
                <Icon name="clock" className="h-4 w-4 shrink-0 text-warn" />
                <p className="text-[13px] text-ink">
                  Your account is under verification. You can finish your profile
                  in the meantime — posting and buying a PACT unlock once the
                  check is done.
                </p>
              </div>
            </div>
          )}

          {/* From md up this is the scroll container, which is what puts the
              page's scrollbar under the header instead of behind it. On a
              phone the bottom bar is fixed, so the last card needs room. */}
          <main className="scroll-slim-light min-w-0 flex-1 px-4 pb-[84px] pt-4 md:min-h-0 md:overflow-y-auto md:px-5 md:pb-6 md:pt-5">
            {children}
          </main>
        </div>
      </div>

      <DashboardMobileNav groups={groups} />
    </div>
  )
}

/** Page heading inside the dashboard */
export function PageHeading({
  title,
  pdfRef,
  children,
  action,
}: {
  title: string
  /** The PDF section number — e.g. "5.2.8" */
  pdfRef?: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  /*
   * Quieter than the dashboard home on purpose. The home page is a place to
   * look around, so it carries a banner and a photograph; every other page is
   * a place to do one thing, and a heavy header is just something to scroll
   * past before starting. The PDF section number is a build-time aid, so it
   * is dropped to a footnote rather than sitting in a pill beside the title.
   */
  // Only the page heading is shown. The one-line description and the PDF
  // section footnote were removed from every dashboard page on request —
  // the props are kept so callers still compile, they simply do not render.
  void children
  void pdfRef
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line-soft pb-4">
      <div className="min-w-0">
        <h1 className="font-display text-[19px] font-bold tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Placeholder for features that are not built yet */
export function ComingSoon({
  items,
}: {
  items: { label: string; ref?: string; phase: string }[]
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-paper-3">
            <th className="eyebrow px-4 py-2.5 text-left">Feature</th>
            <th className="eyebrow px-4 py-2.5 text-right">When</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.label} className="border-b border-line-soft last:border-0">
              <td className="px-4 py-2.5 text-ink">{it.label}</td>
              <td className="px-4 py-2.5 text-right">
                <span className="pill-brand">{it.phase}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
