'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'

export type TopicTile = { slug: string; label: string; icon: string; href: string; active: boolean }

/**
 * The 4-across topic grid on the phone blog. Seven categories show, the
 * eighth tile is "More Topics", which opens the rest in place.
 */
export function BlogTopicGrid({ topics }: { topics: TopicTile[] }) {
  const [open, setOpen] = useState(false)
  const cut = topics.length > 8 && !open
  const shown = cut ? topics.slice(0, 7) : topics

  return (
    <ul className="grid grid-cols-4 gap-2">
      {shown.map((t) => (
        <li key={t.slug} className="min-w-0">
          <Link
            href={t.href}
            aria-current={t.active ? 'true' : undefined}
            className={`flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border px-1 py-2.5 text-center shadow-card ${
              t.active ? 'border-brand bg-brand-soft' : 'border-line bg-white'
            }`}
          >
            <Icon name={t.icon as IconName} className="h-5 w-5 text-brand" />
            <span lang="en" className="line-clamp-3 text-[10px] font-semibold leading-tight text-ink [hyphens:auto]">{t.label}</span>
          </Link>
        </li>
      ))}
      {cut && (
        <li className="min-w-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="flex h-full min-h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-card border border-line bg-white px-1 py-2.5 text-center shadow-card"
          >
            <Icon name="dots" className="h-5 w-5 text-ink" />
            <span className="text-[10.5px] font-semibold leading-tight text-ink">More Topics</span>
          </button>
        </li>
      )}
    </ul>
  )
}
