import { DashboardSkeleton } from '@/components/dashboard-skeleton'

/**
 * The loading boundary for the shared `(shell)` pages — Orders, Notifications,
 * Blog, Club, Artistry, Advertisements, Portal Space and the rest.
 *
 * Without one here the nearest boundary was `dashboard/loading.tsx`, which
 * sits ABOVE this group's layout: navigating to any of these pages blanked the
 * sidebar and the top bar as well, which reads as the whole app reloading.
 * This keeps the shell on screen and paints the skeleton only where the page
 * itself goes.
 */
export default function Loading() {
  return <DashboardSkeleton />
}
