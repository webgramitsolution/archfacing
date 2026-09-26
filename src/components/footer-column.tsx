'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from './ui'
import { cn } from '@/lib/utils'

/**
 * One footer column — an accordion on a phone, a plain list everywhere else.
 *
 * Four columns of six links each is most of a phone screen before the reader
 * has seen the copyright, so on a narrow screen each column collapses behind
 * its own heading. From `md` up the toggle stops responding and the list is
 * always open, which is why the open state is not read at that width: the
 * `md:flex` on the list wins over the `hidden` the closed state applies.
 */
export function FooterColumn({
  title,
  links,
  children,
  className,
}: {
  title: string
  /** Omitted when the column's body is passed as `children` instead. */
  links?: { label: string; href: string }[]
  children?: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('min-w-0 border-b border-white/10 last:border-b-0 md:border-b-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left md:pointer-events-none md:mb-3.5 md:py-0"
      >
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-white lg:text-[11px]">
          {title}
        </h3>
        <Icon
          name="arrow"
          className={cn(
            'h-4 w-4 shrink-0 rotate-90 text-white/45 transition-transform md:hidden',
            open && '-rotate-90'
          )}
        />
      </button>

      <div className={cn('pb-4 md:block md:pb-0', open ? 'block' : 'hidden')}>
        {links ? (
          <ul className="flex flex-col gap-2.5">
            {links.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-[12.5px] text-white/60 transition-colors hover:text-gold lg:text-[13px]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
