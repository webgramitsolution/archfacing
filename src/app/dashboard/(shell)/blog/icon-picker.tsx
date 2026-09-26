'use client'

import { useState } from 'react'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Choose one of the site's icons.
 *
 * Only the names in the `IconName` union are offered — `Icon` renders an empty
 * `<svg>` for anything outside it, so a free-text field would let an author
 * save a section whose icons silently do not appear.
 *
 * The subject marks lead, because a section about energy or water wants one of
 * those and not a cog. Six per row, matching the grid below.
 */
const ICONS: IconName[] = [
  'bolt', 'droplet', 'leaf', 'recycle', 'wind', 'sun',
  'home', 'trending', 'heart', 'coins', 'globe', 'award',
  'star', 'check', 'shield', 'chart', 'grid', 'box',
  'bag', 'tag', 'map', 'users', 'user', 'file',
  'inbox', 'mail', 'phone', 'calendar', 'clock', 'rupee',
  'search', 'settings', 'bell', 'help', 'alert', 'plus',
]

export function IconPicker({
  value,
  onChange,
}: {
  value: IconName
  onChange: (icon: IconName) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose an icon"
        title="Choose an icon"
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-brand transition-colors hover:border-brand"
      >
        <Icon name={value} className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close the icon list"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-[232px] rounded-card border border-line bg-paper-2 p-2 shadow-lift">
            <ul className="grid grid-cols-6 gap-1">
              {ICONS.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    title={n}
                    onClick={() => {
                      onChange(n)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                      n === value
                        ? 'bg-brand text-white'
                        : 'text-ink-2 hover:bg-brand-soft hover:text-brand'
                    )}
                  >
                    <Icon name={n} className="h-[17px] w-[17px]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
