'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The horizontal rail behind "Featured Advertisements".
 *
 * The cards themselves are rendered on the server and handed in as children —
 * this component knows nothing about advertisers, only about scrolling. That
 * keeps the one client component on the page free of campaign data.
 *
 * The arrows appear only when there is somewhere to scroll to, so a rail with
 * three cards on a wide screen shows none.
 */
export function FeaturedRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      // 2px of slack: sub-pixel widths mean scrollLeft rarely lands exactly on
      // the maximum, and without it the right arrow never switches off.
      setAtStart(el.scrollLeft <= 2)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
    }

    measure()
    el.addEventListener('scroll', measure, { passive: true })

    const ro = new ResizeObserver(measure)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [])

  const page = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ul
        ref={ref}
        className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1"
      >
        {children}
      </ul>

      {!atStart && <RailButton side="left" onClick={() => page(-1)} />}
      {!atEnd && <RailButton side="right" onClick={() => page(1)} />}
    </div>
  )
}

function RailButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous advertisements' : 'More advertisements'}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper text-ink-2 shadow-lift transition-colors hover:border-brand hover:text-brand ${
        side === 'left' ? '-left-2' : '-right-2'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={side === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}
