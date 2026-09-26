import Link from 'next/link'

/**
 * Breadcrumbs that search engines read but visitors do not see.
 *
 * The trail is deliberately hidden from sight — it sits above every hero and
 * added nothing for a reader who can already see where they are. It is NOT
 * removed, because Google uses it to render the trail in search results and
 * to understand how the site nests.
 *
 * ⚠️ Hidden here means `sr-only`, never `display: none`. A `display: none`
 *    trail is skipped by screen readers too, and Google discounts it. This
 *    keeps the markup in the accessibility tree and in the DOM — it is simply
 *    clipped to a single pixel visually.
 *
 * Emits both:
 *   · a real <nav><ol> trail, reachable by keyboard and screen reader
 *   · schema.org BreadcrumbList JSON-LD, which is what actually shows up in
 *     the search result
 */

export type Crumb = {
  label: string
  /** omit on the final crumb — the page you are already on */
  href?: string
}

export function Breadcrumb({
  items,
  /** absolute site URL, for the JSON-LD. Falls back to the configured app URL. */
  baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com',
  visible = false,
}: {
  items: Crumb[]
  baseUrl?: string
  /**
   * Draw the trail on the page as well.
   *
   * Off by default, because on a page that opens with a full-bleed hero the
   * trail sits above it and adds nothing. An article has no hero band — it
   * opens straight into the headline — and there the trail is the only thing
   * telling a reader which category they arrived through, so the blog turns
   * it on.
   */
  visible?: boolean
}) {
  if (items.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      // The last crumb has no href — schema.org allows the item to be omitted
      ...(c.href ? { item: `${baseUrl.replace(/\/$/, '')}${c.href}` } : {}),
    })),
  }

  return (
    <>
      {visible ? (
        <nav aria-label="Breadcrumb" className="border-b border-line-soft">
          <ol className="container-af flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-[12px]">
            {items.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-ink-4">
                    /
                  </span>
                )}
                {c.href ? (
                  <Link href={c.href} className="text-ink-3 transition-colors hover:text-brand">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className="min-w-0 max-w-[320px] truncate font-medium text-ink-2"
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : (
        <nav aria-label="Breadcrumb" className="sr-only">
          <ol>
            {items.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <script
        type="application/ld+json"
        // The content is built from our own props, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}

/** The trail every page starts with. */
export function homeCrumb(): Crumb {
  return { label: 'Home', href: '/' }
}
