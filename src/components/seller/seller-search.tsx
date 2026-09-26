'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * The storefront's own search — this seller's products only.
 *
 * The published products are passed down from the server layout (there are at
 * most a few dozen), so typing filters in memory with no request at all. The
 * dropdown shows the first five matches; the button and "View all" both land
 * on the seller's Products tab carrying the query.
 */

export type SearchProduct = {
  id: string
  slug: string
  title: string
  image: string | null
  price: string | null
}

export function SellerSearch({ base, products }: { base: string; products: SearchProduct[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matches = q.trim()
    ? products.filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()))
    : []

  function goToProducts() {
    if (!q.trim()) return
    setOpen(false)
    router.push(`${base}/products?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div
      className="relative hidden min-w-0 flex-1 items-center gap-2 sm:flex sm:max-w-sm md:max-w-md lg:max-w-xl"
      onBlur={() => {
        // Delay so a click inside the dropdown still lands before it closes.
        blurTimer.current = setTimeout(() => setOpen(false), 150)
      }}
      onFocus={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current)
      }}
    >
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Search this seller&apos;s products</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(Boolean(e.target.value.trim()))
          }}
          onFocus={() => q.trim() && setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && goToProducts()}
          placeholder="Search products..."
          className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-3.5 pr-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none md:h-10"
        />
      </label>

      <button
        type="button"
        onClick={goToProducts}
        aria-label="Search"
        className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity hover:opacity-90 md:h-10"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-card border border-line bg-paper shadow-menu">
          {matches.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={`${base}/products/${p.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-paper-3"
            >
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-paper-3">
                {p.image ? (
                  <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink">{p.title}</span>
                <span className="block text-[11.5px] font-semibold text-brand">
                  {p.price ?? 'Get Best Price'}
                </span>
              </span>
            </Link>
          ))}

          {matches.length > 5 && (
            <button
              type="button"
              onClick={goToProducts}
              className="block w-full px-3 py-2 text-center text-[12px] font-semibold text-brand transition-colors hover:bg-paper-3"
            >
              View all {matches.length} results
            </button>
          )}
        </div>
      )}
    </div>
  )
}
