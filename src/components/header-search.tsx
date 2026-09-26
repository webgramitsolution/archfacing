'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * The search box in the top bar.
 *
 * A 6-digit PIN goes straight to Consult Nearby — that is what people
 * look for most. Anything else runs a Projects search.
 */
export function HeaderSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return

    if (/^[1-9]\d{5}$/.test(term)) {
      router.push(`/consult-nearby?pincode=${term}`)
    } else {
      router.push(`/projects?q=${encodeURIComponent(term)}`)
    }
  }

  return (
    <form onSubmit={onSubmit} className="header-control flex min-w-0 flex-1 items-stretch">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for products, categories, or companies..."
        aria-label="Search"
        className="min-w-0 flex-1 rounded-l-md border border-r-0 border-line bg-paper-2 px-3.5 text-[13.5px] placeholder:text-ink-3/70 focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="shrink-0 rounded-r-md bg-brand px-4 text-white transition-opacity hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </form>
  )
}
