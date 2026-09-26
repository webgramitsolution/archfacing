'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LOGO_URL } from '@/components/logo'
import { Icon, type IconName } from '@/components/ui'

/** One menu entry, flattened from HEADER_NAV on the server (plain data only). */
export type DrawerNavItem = {
  label: string
  href: string
  groups?: { name: string; href: string; children?: { name: string; href: string }[] }[]
}

export type DrawerUser = { name: string; dashboardHref: string; photo: string | null } | null

/**
 * The phone menu — a hamburger that slides a panel in from the LEFT.
 *
 * Every header menu is here, each expandable to its categories (and those to
 * their sub-categories), so a phone reaches everything the desktop mega-menu
 * does. Closes on the backdrop, Escape, the ✕, or any navigation.
 */
export function MobileNavDrawer({
  items,
  user,
  tone = 'dark',
  className,
}: {
  items: DrawerNavItem[]
  user: DrawerUser
  /** 'light' draws the hamburger white, for use over a photograph. */
  tone?: 'dark' | 'light'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const pathname = usePathname()
  const closeRef = useRef<HTMLButtonElement>(null)
  // The panel is portalled to <body>: a trigger inside the home hero sits in
  // that hero's stacking context, which would trap a fixed panel under the
  // white sheet that follows it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Any navigation closes the panel.
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
          tone === 'light' ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-paper-3',
          className
        )}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
        </svg>
      </button>

      {mounted && createPortal(
      <div
        className={cn('fixed inset-0 z-[80] md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!open}
      >
        {/* backdrop */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn('absolute inset-0 bg-navy/60 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        />

        {/* panel */}
        <nav
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            'absolute inset-y-0 left-0 flex w-[84%] max-w-[330px] flex-col bg-white shadow-lift transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* head */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Link href="/" aria-label="ArchFacing — home" onClick={() => setOpen(false)}>
              <Image src={LOGO_URL} alt="ArchFacing" width={67} height={38} className="object-contain" />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-3"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* account */}
          <div className="border-b border-line px-4 py-3.5">
            {user ? (
              <Link href={user.dashboardHref} onClick={() => setOpen(false)} className="flex items-center gap-3">
                <Avatar name={user.name} photo={user.photo} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{user.name}</span>
                  <span className="block text-[12px] font-medium text-brand">Go to dashboard →</span>
                </span>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-primary flex-1 py-2 text-[13px]">Sign In</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-outline flex-1 py-2 text-[13px]">Join Free</Link>
              </div>
            )}
          </div>

          {/* the menus */}
          <ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
            {items.map((item) => {
              const expanded = openItem === item.label
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.label} className="border-b border-line-soft last:border-0">
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn('flex-1 rounded-lg px-2.5 py-3 text-[14.5px] font-semibold', active ? 'text-brand' : 'text-ink')}
                    >
                      {item.label}
                    </Link>
                    {item.groups?.length ? (
                      <button
                        type="button"
                        onClick={() => { setOpenItem(expanded ? null : item.label); setOpenGroup(null) }}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${item.label} categories`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-3 hover:bg-paper-3"
                      >
                        <Chevron open={expanded} />
                      </button>
                    ) : null}
                  </div>

                  {expanded && item.groups && (
                    <ul className="mb-2 ml-2.5 border-l-2 border-brand-border pl-2">
                      {item.groups.map((g) => {
                        const key = item.label + '/' + g.name
                        const gOpen = openGroup === key
                        return (
                          <li key={key}>
                            <div className="flex items-center">
                              <Link href={g.href} onClick={() => setOpen(false)} className="flex-1 px-2 py-2 text-[13px] font-medium text-ink-2">
                                {g.name}
                              </Link>
                              {g.children?.length ? (
                                <button
                                  type="button"
                                  onClick={() => setOpenGroup(gOpen ? null : key)}
                                  aria-expanded={gOpen}
                                  aria-label={`${gOpen ? 'Hide' : 'Show'} ${g.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-4 hover:bg-paper-3"
                                >
                                  <Chevron open={gOpen} small />
                                </button>
                              ) : null}
                            </div>
                            {gOpen && g.children && (
                              <ul className="mb-1.5 ml-2 flex flex-col">
                                {g.children.map((c) => (
                                  <li key={c.href}>
                                    <Link href={c.href} onClick={() => setOpen(false)} className="block px-2 py-1.5 text-[12.5px] text-ink-3 hover:text-brand">
                                      {c.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>

          {/* quick links */}
          <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
            {QUICK.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-paper-3 px-3 py-2.5 text-[12.5px] font-medium text-ink-2"
              >
                <Icon name={q.icon} className="h-4 w-4 text-brand" />
                {q.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>,
        document.body
      )}
    </>
  )
}

const QUICK: { label: string; href: string; icon: IconName }[] = [
  { label: 'Consult Nearby', href: '/consult-nearby', icon: 'map' },
  { label: 'PACT', href: '/pact', icon: 'shield' },
  { label: 'Help Center', href: '/legal/need-help', icon: 'help' },
  { label: 'Contact Us', href: '/legal/contact', icon: 'mail' },
]

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  return (
    <svg viewBox="0 0 10 6" aria-hidden className={cn(small ? 'h-[5px] w-[9px]' : 'h-[6px] w-[11px]', 'transition-transform', open && 'rotate-180')}>
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'A'
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-[16px] font-bold text-white">
      {photo ? <Image src={photo} alt="" fill sizes="44px" unoptimized className="object-cover" /> : initial}
    </span>
  )
}
