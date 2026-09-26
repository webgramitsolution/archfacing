'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * The seller's own menu bar — the solid brand band under the identity row,
 * per the B2B-directory reference: white text, the active tab underlined in
 * white on a white-tinted patch, GST and "Since {year}" on the right.
 *
 * A client component only because it has to know which of its own links is
 * the current page. Every count beside a label is the real number of
 * published rows.
 *
 * A section with nothing in it still gets a link — a shop does not hide its
 * "Products" sign because the shelf is empty today; the page itself says so.
 */

export type MenuCounts = {
  projects: number
  products: number
  artistry: number
  aroundUs: number
  blogs: number
}

export function StorefrontMenu({
  base,
  counts,
  gst,
  since,
}: {
  base: string
  counts: MenuCounts
  /** Already masked by the layout — never the raw number. */
  gst: string | null
  since: number
}) {
  const path = usePathname()

  const items: { href: string; label: string; count?: number }[] = [
    { href: base, label: 'Home' },
    { href: `${base}/projects`, label: 'Projects', count: counts.projects },
    { href: `${base}/products`, label: 'Products', count: counts.products },
    { href: `${base}/artistry`, label: 'Artistry', count: counts.artistry },
    { href: `${base}/around-us`, label: 'Around Us', count: counts.aroundUs },
    { href: `${base}/blog`, label: 'Blog', count: counts.blogs },
    { href: `${base}/contact`, label: 'Contact Us' },
  ]

  return (
    <nav aria-label="Seller menu" className="sticky top-0 z-20 bg-brand text-white">
      <div className="container-af flex items-center justify-between gap-3">
        <ul className="no-scrollbar flex flex-1 overflow-x-auto">
          {items.map((i) => {
            // `Home` is the base path, so it must match exactly or every
            // sub-page would light it up as well.
            const on = i.href === base ? path === base : path.startsWith(i.href)

            return (
              <li key={i.href} className="shrink-0">
                <Link
                  href={i.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors',
                    on
                      ? 'border-white bg-white/10 text-white'
                      : 'border-transparent text-white/85 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {i.label}
                  {i.count != null && i.count > 0 && (
                    <span className="tabular text-[10.5px] font-medium text-white/60">
                      {i.count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* GST + member-since, per the reference's right edge */}
        <div className="hidden shrink-0 items-center gap-4 text-[12px] font-medium text-white/85 md:flex">
          {gst && (
            <span className="tabular flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              GST: {gst}
            </span>
          )}
          <span className="hidden items-center gap-1.5 lg:flex">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Since {since}
          </span>
        </div>
      </div>
    </nav>
  )
}
