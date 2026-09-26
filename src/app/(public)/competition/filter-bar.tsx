'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The mobile / tablet filter: a compact "Filters" button that sits in the sort
 * row and slides the filter form in from the LEFT. Desktop keeps its own
 * inline filter card; this whole component is hidden from `lg` up.
 */
export function MobileFilterDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const params = useSearchParams()

  // a submitted search changes the URL — close the drawer when it does
  useEffect(() => { setOpen(false) }, [path, params])

  // lock the page while the drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[13px]"
      >
        <Icon name="settings" className="h-4 w-4" /> Filters
      </button>

      {/* overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/45 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* left drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-[330px] max-w-[88vw] flex-col bg-paper shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-4 py-3">
          <span className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <Icon name="settings" className="h-4 w-4 text-brand" /> Filters
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-paper-3 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
