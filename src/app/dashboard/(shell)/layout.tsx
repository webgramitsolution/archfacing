import { requireAuth } from '@/lib/guard'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardHeaderSlot } from '@/components/dashboard-header-slot'
import { DASHBOARD_NAV } from '@/config/dashboard-nav'

/**
 * The shell for the pages every role shares — Club Membership, Orders,
 * Notifications, Advertisements, Portal Space and Design Competitions.
 *
 * These live at `/dashboard/<name>` rather than under a role folder, because
 * one copy serves every role. Until now that also meant they had no layout of
 * their own: only the role folders carry one, so these six fell through to the
 * root layout and each rendered the public site's header and footer. Clicking
 * "Membership & Plans" in the sidebar dropped the reader out of their
 * dashboard and onto what looked like the marketing site.
 *
 * `(shell)` is a route group — the parentheses keep it out of the URL, so
 * every path above is unchanged. It exists only to hang this layout on the
 * six, without wrapping `/dashboard` itself, which is a bare redirect, or the
 * role folders, which already have a shell and would end up with two.
 *
 * The menu is the reader's own role's menu, so the sidebar does not change
 * under them when they step into a shared page.
 */
export default async function SharedDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <DashboardShell
      user={user}
      nav={DASHBOARD_NAV[user.role]}
      header={<DashboardHeaderSlot user={user} />}
    >
      {children}
    </DashboardShell>
  )
}
