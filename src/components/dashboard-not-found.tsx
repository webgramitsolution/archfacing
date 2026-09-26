import Link from 'next/link'
import { EmptyState } from './ui'

/**
 * "Page not found" INSIDE the dashboard and admin shells, rendered by each
 * role folder's `not-found.tsx`. Before, a `notFound()` in a dashboard page
 * fell through to the root not-found page, which carries the public site
 * header — so the reader dropped out of the dashboard entirely.
 */
export function DashboardNotFound({ home = '/dashboard' }: { home?: string }) {
  return (
    <div className="py-6">
      <EmptyState
        icon="search"
        title="Page not found"
        action={
          <Link href={home} className="btn-primary">
            Back to dashboard
          </Link>
        }
      >
        This item does not exist, has been removed, or is not available to your account.
      </EmptyState>
    </div>
  )
}
