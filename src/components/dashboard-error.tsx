'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EmptyState } from './ui'

/**
 * The error screen shown INSIDE the dashboard and admin shells.
 *
 * Each role folder's `error.tsx` renders this. An error boundary does not wrap
 * the layout in its own folder, so placing it inside each role folder (and the
 * shared `(shell)` group) keeps that role's sidebar and top bar on screen —
 * before, any page error fell through to the root boundary and took the whole
 * shell with it.
 *
 * Developer hints (local database commands) are shown only in development;
 * production shows the generic message and the reference digest.
 */
export function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const home = pathname?.startsWith('/admin') ? '/admin' : '/dashboard'

  useEffect(() => {
    console.error('Dashboard page failed to render:', error)
  }, [error])

  const isDev = process.env.NODE_ENV !== 'production'
  const looksLikeDatabase =
    isDev && /P1001|P1017|ECONNREFUSED|Can't reach database|database server/i.test(`${error.message} ${error.digest ?? ''}`)

  return (
    <div className="py-6">
      <EmptyState
        icon="alert"
        title="This page could not be loaded"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className="btn-primary">
              Try again
            </button>
            <Link href={home} className="btn-outline">
              Back to dashboard
            </Link>
          </div>
        }
      >
        {looksLikeDatabase
          ? 'The database is not reachable. Locally, start it with pnpm pg:start (check with pnpm pg:status).'
          : 'Something went wrong while building this page. Trying again often clears it.'}
      </EmptyState>
      {error.digest && (
        <p className="mt-4 text-center font-mono text-[11.5px] text-ink-4">Reference: {error.digest}</p>
      )}
    </div>
  )
}
