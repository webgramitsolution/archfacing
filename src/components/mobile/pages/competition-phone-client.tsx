'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * The phone's "Ending Soon ▾" control. Changing it navigates to the same
 * listing URL with a new `sort`, keeping every other filter and resetting the
 * Load More depth. Without JS it is still a GET form with a submit button.
 */
export function CompetitionSortSelect({
  value,
  options,
  keep,
}: {
  value: string
  options: readonly { value: string; label: string }[]
  /** The other query params to carry across (q, category, status, fee…). */
  keep: Record<string, string | undefined>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const go = (sort: string) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(keep)) if (v) sp.set(k, v)
    sp.set('sort', sort)
    start(() => router.push(`/competition?${sp.toString()}`, { scroll: false }))
  }

  return (
    <form method="get" action="/competition" className="relative shrink-0" onSubmit={(e) => e.preventDefault()}>
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="comp-sort-phone" className="sr-only">Sort competitions</label>
      <select
        id="comp-sort-phone"
        name="sort"
        defaultValue={value}
        onChange={(e) => go(e.target.value)}
        className={cn(
          'h-10 appearance-none rounded-card border border-line bg-white pl-3.5 pr-9 text-[12.5px] font-medium text-ink outline-none focus:border-brand',
          pending && 'opacity-60'
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <noscript>
        <button type="submit" className="ml-2 text-[12px] font-semibold text-brand">Sort</button>
      </noscript>
    </form>
  )
}
