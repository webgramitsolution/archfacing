import Link from 'next/link'
import { Icon } from '@/components/ui'
import { WorkCard } from '@/components/design-associate-parts'
import type { ContentCard } from '@/lib/design-associates'

/**
 * One shelf of the associate's shopfront — Projects, Products, Around Us,
 * Artistry or Blog.
 *
 * All five pages are the same page with a different post type, so the markup
 * lives here once. The five route files exist to name the type and nothing
 * else, which is what keeps the five in step: change the empty state here and
 * every shelf changes with it.
 */
export function StorefrontSection({
  title,
  blurb,
  items,
  who,
  browseAllHref,
  browseAllLabel,
  itemHrefBase,
}: {
  title: string
  blurb: string
  items: ContentCard[]
  who: string
  browseAllHref: string
  browseAllLabel: string
  /** When set, cards link inside the storefront (`{itemHrefBase}/{slug}`). */
  itemHrefBase?: string
}) {
  return (
    <div className="container-af py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] font-bold text-ink">
            {title}
            {items.length > 0 && (
              <span className="tabular ml-2 text-[14px] font-medium text-ink-3">
                {items.length}
              </span>
            )}
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">{blurb}</p>
        </div>

        <Link
          href={browseAllHref}
          className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
        >
          {browseAllLabel} →
        </Link>
      </div>

      {items.length === 0 ? (
        /*
          An empty shelf says it is empty rather than disappearing. On a
          storefront the menu item exists whatever is on the shelf, so the
          page has to account for itself when a client clicks it.
        */
        <div className="card px-6 py-14 text-center">
          <Icon name="image" className="mx-auto h-9 w-9 text-ink-4" />
          <p className="mt-3 font-display text-[15px] font-bold text-ink">
            Nothing here yet
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-balance text-[13px] leading-relaxed text-ink-3">
            {who} has not published any {title.toLowerCase()} on ArchFacing so far.
          </p>
          <Link href={browseAllHref} className="btn-primary mt-5 px-5">
            {browseAllLabel}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((c) => (
            <WorkCard key={c.id} c={c} hrefBase={itemHrefBase} />
          ))}
        </ul>
      )}
    </div>
  )
}
