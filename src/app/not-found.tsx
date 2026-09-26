import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

/**
 * The 404 page. Without this file Next renders its own bare default, which
 * looks nothing like the rest of the site and offers no way onward.
 */
export default function NotFound() {
  const LINKS = [
    { href: '/projects', label: 'Projects' },
    { href: '/products', label: 'Products' },
    { href: '/artistry', label: 'Artistry' },
    { href: '/blog', label: 'Blog' },
    { href: '/competition', label: 'Design Competition' },
    { href: '/consult-nearby', label: 'Consult Nearby' },
  ]

  return (
    <>
      <SiteHeader />

      <main className="container-af flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="font-display text-[64px] font-bold leading-none text-brand">404</p>

        <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-ink">
          We could not find that page
        </h1>
        <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
          The link may be out of date, or the posting may have been removed.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/consult-nearby" className="btn-outline">
            Find a professional
          </Link>
        </div>

        <div className="mt-10 w-full max-w-2xl border-t border-line pt-7">
          <p className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
            Or try one of these
          </p>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-block rounded-pill border border-line bg-paper-2 px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:border-brand hover:text-brand"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
