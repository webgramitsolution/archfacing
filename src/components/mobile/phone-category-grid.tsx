'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The phone category grid (Products / Projects).
 *
 * The top is a clean two rows — eight cells: the first tiles plus a
 * "More Categories" cell as the eighth. Tapping it expands every remaining
 * category inline (each with its icon) and the cell becomes "Show Less". When
 * there is nothing extra to show, all tiles render and there is no toggle.
 */
export type CatTile = {
  key: string
  href: string
  label: string
  active?: boolean
  icon: React.ReactNode
}

/** Cells shown collapsed, including the toggle — a tidy two rows of four. */
const COLLAPSED = 8

export function PhoneCategoryGrid({
  primary,
  more = [],
  ariaLabel,
}: {
  primary: CatTile[]
  more?: CatTile[]
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const all = [...primary, ...more]
  const toggle = all.length > COLLAPSED

  // Collapsed: first 7 tiles + the toggle (8 cells). Expanded: everything + toggle.
  const visible = toggle && !open ? all.slice(0, COLLAPSED - 1) : all

  return (
    <nav aria-label={ariaLabel} className="relative -mt-4 rounded-t-[20px] bg-paper-2 px-3 pt-3">
      {/* gap-px over an #f9f9f9 ground draws a hairline divider between tiles */}
      <ul className="grid grid-cols-4 gap-px overflow-hidden rounded-[10px] border border-line bg-[#f9f9f9]">
        {visible.map((t) => (
          <Cell key={t.key} tile={t} />
        ))}

        {toggle && (
          <li className="bg-white">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex w-full min-w-0 flex-col items-center px-1 py-3 text-center"
            >
              <span className="flex h-8 w-8 items-center justify-center text-brand">
                <svg viewBox="0 0 24 24" aria-hidden className={cn('h-7 w-7 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 14.5v6M14.5 17.5h6" />
                </svg>
              </span>
              <span className="mt-2 text-[12px] font-semibold leading-tight text-brand">
                {open ? 'Show Less' : 'More Categories'}
              </span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

function Cell({ tile }: { tile: CatTile }) {
  return (
    <li className="bg-white">
      <Link
        href={tile.href}
        aria-current={tile.active ? 'page' : undefined}
        className="flex min-w-0 flex-col items-center px-1 py-3 text-center"
      >
        <span className="flex h-8 w-8 items-center justify-center">{tile.icon}</span>
        <span className={cn('mt-2 line-clamp-2 text-[12px] font-semibold leading-tight', tile.active ? 'text-brand' : 'text-ink')}>{tile.label}</span>
      </Link>
    </li>
  )
}
