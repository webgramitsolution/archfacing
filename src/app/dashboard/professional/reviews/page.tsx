import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { ReviewsPanel } from '@/components/reviews-panel'
import {
  professionalReviewSummary,
  professionalReviews,
  type ReviewFilter,
  type ReviewSort,
} from '@/lib/professional-reviews'

export const metadata: Metadata = { title: 'Reviews & Ratings' }
export const dynamic = 'force-dynamic'

const FILTERS = ['all', 'PROJECT', 'PRODUCT', 'ARTISTRY', 'BLOG', 'AROUND_US']
const SORTS = ['recent', 'highest', 'lowest']

export default async function ProfessionalReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; sort?: string; page?: string }>
}) {
  const user = await requireRole('PROFESSIONAL')
  const sp = await searchParams

  const filter = (FILTERS.includes(sp.source ?? '') ? sp.source : 'all') as ReviewFilter
  const sort = (SORTS.includes(sp.sort ?? '') ? sp.sort : 'recent') as ReviewSort
  const page = Math.max(1, Number(sp.page) || 1)

  const [summary, reviewsPage] = await Promise.all([
    professionalReviewSummary(user.id),
    professionalReviews(user.id, { filter, sort, page }),
  ])

  return (
    <div>
      <PageHeading title="Reviews & Ratings" />
      <ReviewsPanel
        summary={summary}
        page={reviewsPage}
        filter={filter}
        sort={sort}
        basePath="/dashboard/professional/reviews"
      />
    </div>
  )
}
