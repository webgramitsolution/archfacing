'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Icon } from './ui'

/**
 * The scrolling partner strip.
 *
 * This is a client component only because the arrows have to move the strip.
 * An arrow that does nothing is worse than no arrow, so each one disables
 * itself when there is nothing further to scroll in that direction.
 */
export function PartnerStrip({
  partners,
}: {
  partners: { name: string; logo?: string }[]
}) {
  const strip = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = strip.current
    if (!el) return
    setAtStart(el.scrollLeft <= 2)
    // 2px of slack — sub-pixel widths otherwise leave the end button live
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    sync()
    const el = strip.current
    if (!el) return
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync])

  function nudge(direction: -1 | 1) {
    const el = strip.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(200, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <div className="card relative px-11 py-7">
      <Arrow side="left" disabled={atStart} onClick={() => nudge(-1)} />
      <Arrow side="right" disabled={atEnd} onClick={() => nudge(1)} />

      <ul
        ref={strip}
        onScroll={sync}
        className="flex items-center gap-10 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {partners.map((p) => (
          <li key={p.name} className="shrink-0">
            {p.logo ? (
              <Image
                src={p.logo}
                alt={p.name}
                width={120}
                height={40}
                className="h-9 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ) : (
              <span className="whitespace-nowrap font-display text-[16px] font-bold uppercase tracking-[0.06em] text-ink-3 transition-colors hover:text-ink">
                {p.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Scroll partners left' : 'Scroll partners right'}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center
                  rounded-full border border-line bg-paper-2 text-ink-3 shadow-card
                  transition-colors hover:border-gold hover:text-gold
                  disabled:cursor-default disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-3
                  ${side === 'left' ? 'left-2' : 'right-2'}`}
    >
      <Icon name="arrow" className={`h-4 w-4 ${side === 'left' ? 'rotate-180' : ''}`} />
    </button>
  )
}
