'use client'

import { Children, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A horizontal, snap-scrolling card row for phones, with the pager dots
 * the reference draws under Featured Projects and Top Designers. The dots
 * follow the swipe and jump to a page when tapped.
 */
export function SnapRail({
  children,
  label,
  itemClassName,
  dots = true,
  className,
}: {
  children: React.ReactNode
  label: string
  /** Width of each card, e.g. "w-[29%]". */
  itemClassName: string
  dots?: boolean
  className?: string
}) {
  const ref = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      setPages(Math.max(1, Math.ceil((el.scrollWidth - 1) / el.clientWidth)))
      const max = el.scrollWidth - el.clientWidth
      setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (Math.ceil((el.scrollWidth - 1) / el.clientWidth) - 1)))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => { el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [])

  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    el.scrollTo({ left: pages <= 1 ? 0 : (max * i) / (pages - 1), behavior: 'smooth' })
  }

  return (
    <div className={className}>
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className={cn('shrink-0 snap-start', itemClassName)}>{child}</li>
        ))}
      </ul>
      {dots && pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Page ${i + 1} of ${pages}`}
              aria-current={i === page ? 'true' : undefined}
              className={cn('h-[5px] rounded-full transition-all', i === page ? 'w-6 bg-brand' : 'w-3 bg-ink-4/40')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
