import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { requireRole } from '@/lib/guard'
import { listMyReviews } from '@/lib/visitor'
import { PageHeading } from '@/components/dashboard-shell'
import { EmptyState, Icon } from '@/components/ui'
import { ago } from '@/components/dashboard/overview-parts'
import { DeleteReviewButton } from './delete-review-button'

export const metadata: Metadata = { title: 'My Reviews' }

export default async function MyReviewsPage() {
  const user = await requireRole('CLIENT')
  const reviews = await listMyReviews(user.id, 48)

  return (
    <>
      <PageHeading title="My Reviews">
        The ratings you have left on projects, products and artworks.
      </PageHeading>

      {reviews.length === 0 ? (
        <EmptyState
          icon="star"
          title="No reviews yet"
          action={
            <Link href="/projects" className="btn-primary">
              Find something to rate
            </Link>
          }
        >
          Open any published item and leave a rating — your reviews collect here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="card flex min-w-0 items-start gap-4 p-4">
              <Link
                href={r.item.href}
                className="relative block h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-paper-3"
              >
                {r.item.image ? (
                  <Image src={r.item.image} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-4">
                    <Icon name="image" className="h-5 w-5" />
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <Link
                    href={r.item.href}
                    className="min-w-0 truncate text-[13.5px] font-semibold text-ink hover:text-brand"
                  >
                    {r.item.title}
                  </Link>
                  <span className="shrink-0 text-[11px] text-ink-4">{ago(r.createdAt)}</span>
                </div>

                <span className="mt-1 flex items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      aria-hidden
                      className={`h-3.5 w-3.5 ${i < r.rating ? 'text-brand' : 'text-line'}`}
                    />
                  ))}
                </span>

                {r.body && (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
                    {r.body}
                  </p>
                )}

                <div className="mt-2">
                  <DeleteReviewButton postId={r.item.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
