'use client'

/**
 * The last-resort boundary — it catches failures in the root layout itself,
 * which `error.tsx` cannot. It has to render its own <html> and <body>,
 * because at this point the layout that normally provides them has failed.
 *
 * Styling here is deliberately inline: if the layout failed, the stylesheet
 * it loads may not have been applied either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          color: '#111827',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: '#F97316', textTransform: 'uppercase', margin: 0 }}>
            ArchFacing
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '12px 0 0' }}>
            The site could not start
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4B5563', margin: '12px 0 0' }}>
            Something failed before the page could be built. If you are running
            this locally, the usual cause is the database not being up — start
            it with <code style={{ fontFamily: 'ui-monospace, monospace' }}>pnpm pg:start</code>.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '10px 22px',
              border: 0,
              borderRadius: 8,
              background: '#F97316',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 20, fontSize: 12, color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
