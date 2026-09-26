'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The profile output page lives inside the dashboard's own scroll container, so
 * plain `#anchor` links (which move the window, not that container) do nothing.
 * These tabs scroll the target section into view directly and keep the clicked
 * one marked active — so Reviews, About, Contact and the rest all work.
 */
export function ProfileTabs({ tabs }: { tabs: { label: string; id: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id)

  function go(id: string) {
    setActive(id)
    if (typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className="border-b border-line">
      <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:gap-3">
        {tabs.map((t) => (
          <li key={t.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(t.id)}
              aria-current={active === t.id ? 'true' : undefined}
              className={cn(
                'relative block whitespace-nowrap px-3 py-3 text-[13px] font-semibold transition-colors',
                active === t.id ? 'text-brand' : 'text-ink-2 hover:text-brand'
              )}
            >
              {t.label}
              {active === t.id && <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-brand" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
