'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Icon } from '@/components/ui'

/**
 * Search, type, placement and sort — the row above every campaign list.
 *
 * The state lives in the URL, not in React: a filtered list stays filtered
 * across a reload, can be linked to, and is read on the server so the database
 * does the filtering rather than the browser filtering a list it already
 * downloaded.
 *
 * The search box is debounced; the selects apply immediately, because a select
 * has no "still typing" state to wait through.
 */
export function FilterBar({
  types,
  placements,
  sortOptions,
  placeholder = 'Search campaigns…',
}: {
  types: { slug: string; name: string }[]
  placements: { slug: string; name: string }[]
  sortOptions: { value: string; label: string }[]
  placeholder?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const [q, setQ] = useState(params.get('q') ?? '')

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    // A changed filter always returns to the first page; staying on page 4 of
    // a list that now has one page shows an empty screen.
    next.delete('page')
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  // Debounced search. The 350ms is long enough that a normal typing speed
  // produces one request rather than one per keystroke.
  useEffect(() => {
    const current = params.get('q') ?? ''
    if (q === current) return

    const t = setTimeout(() => push({ q }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
      <label className="relative min-w-[13rem] flex-1">
        <span className="sr-only">Search campaigns</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="input h-10 py-0 pl-9 text-[13px]"
        />
      </label>

      <Select
        value={params.get('type') ?? ''}
        onChange={(v) => push({ type: v })}
        all="All Types"
        label="Filter by ad type"
        options={types.map((t) => ({ value: t.slug, label: t.name }))}
      />

      <Select
        value={params.get('placement') ?? ''}
        onChange={(v) => push({ placement: v })}
        all="All Placements"
        label="Filter by placement"
        options={placements.map((p) => ({ value: p.slug, label: p.name }))}
      />

      <Select
        value={params.get('sort') ?? ''}
        onChange={(v) => push({ sort: v })}
        all={sortOptions[0]?.label ?? 'Newest First'}
        label="Sort campaigns"
        options={sortOptions.slice(1)}
      />
    </div>
  )
}

function Select({
  value,
  onChange,
  all,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  all: string
  label: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input h-10 w-auto min-w-[9.5rem] py-0 text-[13px]"
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
