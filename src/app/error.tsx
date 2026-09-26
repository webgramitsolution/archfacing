'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Route-level error boundary.
 *
 * ★ Without this file a server-render failure paints a BLANK PAGE — which is
 *   exactly what happened whenever the local Postgres was not running: every
 *   page is a Server Component that queries the database, the query threw, and
 *   Next had nothing to render. A blank screen gives no clue what went wrong.
 *
 * The database case is called out by name because in development it is the
 * cause the overwhelming majority of the time, and the fix is one command.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page failed to render:', error)
  }, [error])

  // Prisma's connection failures are P1001 (unreachable) and P1017 (dropped).
  const message = `${error.message} ${error.digest ?? ''}`
  // The local-database help (pnpm commands) is for developers only — never
  // shown in production, where it would expose internal tooling to visitors.
  const looksLikeDatabase =
    process.env.NODE_ENV !== 'production' &&
    /P1001|P1017|ECONNREFUSED|Can't reach database|database server/i.test(message)

  return (
    <main className="container-af flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>

      <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
        This page could not be loaded
      </h1>

      {looksLikeDatabase ? (
        <>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
            The site cannot reach its database. Every page here reads live data,
            so nothing can render until the database is back.
          </p>
          <div className="mt-5 w-full max-w-md rounded-card border border-line bg-paper-3 p-4 text-left">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
              If you are running this locally
            </p>
            <code className="block font-mono text-[13px] text-ink">pnpm pg:start</code>
            <p className="mt-2 text-[12.5px] text-ink-3">
              Check it first with <code className="font-mono">pnpm pg:status</code> — it
              prints the reason if the server is not up.
            </p>
          </div>
        </>
      ) : (
        <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
          Something went wrong while building this page. Trying again often
          clears it; if it keeps happening, the details are in the server log.
        </p>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Back to home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-[11.5px] text-ink-4">
          Reference: {error.digest}
        </p>
      )}
    </main>
  )
}
