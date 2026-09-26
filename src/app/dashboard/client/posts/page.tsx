import type { Metadata } from 'next'
import Link from 'next/link'

import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { MyPostings } from '@/app/dashboard/my-postings'
import { POST_TYPES } from '@/config/post-types'

export const metadata: Metadata = { title: 'My Posts' }

/**
 * Everything a visitor has published, in one place.
 *
 * A CLIENT may post Artistry and Design Competition entries (§5.1.3 / §7.4.1),
 * so those are the two lists here — each rendered by the same `MyPostings`
 * the posting dashboards already use, so edit/delete behave identically.
 */
export default async function MyPostsPage() {
  await requireRole('CLIENT')

  return (
    <>
      <PageHeading
        title="My Posts"
        action={
          <Link href="/dashboard/artistry/new" className="btn-primary px-4 py-2 text-[13px]">
            Upload Artistry
          </Link>
        }
      >
        Your artistry uploads and competition postings, with their review status.
      </PageHeading>

      <div className="flex flex-col gap-8">
        <section className="min-w-0">
          <h2 className="mb-3 font-display text-[15px] font-bold text-ink">Artistry</h2>
          <MyPostings config={POST_TYPES.ARTISTRY} />
        </section>

        <section className="min-w-0">
          <h2 className="mb-3 font-display text-[15px] font-bold text-ink">
            Design Competition
          </h2>
          <MyPostings config={POST_TYPES.DESIGN_COMPETITION} />
        </section>
      </div>
    </>
  )
}
