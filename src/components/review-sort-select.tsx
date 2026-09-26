'use client'

import { useRouter } from 'next/navigation'
import type { ReviewFilter, ReviewSort } from '@/lib/professional-reviews'

/** The little "Sort by" control — navigates with the chosen order on change. */
export function ReviewSortSelect({
  basePath,
  filter,
  sort,
}: {
  basePath: string
  filter: ReviewFilter
  sort: ReviewSort
}) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-[12px] text-ink-3">
      Sort by
      <select
        value={sort}
        onChange={(e) => {
          const sp = new URLSearchParams()
          if (filter !== 'all') sp.set('source', filter)
          if (e.target.value !== 'recent') sp.set('sort', e.target.value)
          const q = sp.toString()
          router.push(q ? `${basePath}?${q}` : basePath)
        }}
        className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-medium text-ink"
      >
        <option value="recent">Most Recent</option>
        <option value="highest">Highest Rating</option>
        <option value="lowest">Lowest Rating</option>
      </select>
    </label>
  )
}
