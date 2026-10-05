'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Icon, type IconName } from './ui'
import { SignOutButton } from './sign-out-button'

/**
 * The header account control. Hovering (or tapping) the avatar opens a premium
 * dropdown: the account header, then role-aware shortcuts. SUPER_ADMIN and
 * ADMIN see the full Admin Panel; anyone who can sell (incl. ADMIN_SELLER)
 * sees the Merchandise & Podcast studio. Pure-CSS entrance animation — no
 * extra dependency.
 */

export function AccountMenu({
  name,
  photo,
  messagesHref,
  role,
  dashboardHref,
  isAdmin,
  isSeller,
}: {
  name: string
  /** The member's own profile photo (or logo); the initial when unset. */
  photo: string | null
  messagesHref: string
  role: string
  dashboardHref: string
  isAdmin: boolean
  isSeller: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const initial = name?.[0]?.toUpperCase() ?? '?'
  const roleLabel = role.toLowerCase().replace(/_/g, ' ')

  const enter = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true) }
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <div
      ref={ref}
      className="relative border-l border-line pl-4"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-[#EA580C] text-[13px] font-bold text-white shadow-sm ring-2 ring-white">
          {photo ? <Image src={photo} alt="" fill sizes="36px" unoptimized className="object-cover" /> : initial}
        </span>
        <span className="hidden leading-tight lg:block">
          <span className="block text-[13px] font-semibold text-ink">{name}</span>
          <span className="block text-[11px] capitalize text-ink-3">{roleLabel}</span>
        </span>
        <Icon
          name="arrow"
          className={cn('hidden h-3.5 w-3.5 rotate-90 text-ink-4 transition-transform duration-200 lg:block', open && '-rotate-90')}
        />
      </button>

      {/* dropdown */}
      <div
        role="menu"
        className={cn(
          'absolute right-0 top-[calc(100%+12px)] z-50 w-[264px] origin-top-right rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_56px_-16px_rgba(15,23,42,0.28)] transition-all duration-200 ease-out',
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible -translate-y-1.5 scale-95 opacity-0'
        )}
      >
        {/* account header */}
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-paper-2 to-paper-3 p-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-[#EA580C] text-[15px] font-bold text-white shadow">
            {photo ? <Image src={photo} alt="" fill sizes="44px" unoptimized className="object-cover" /> : initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-bold text-ink">{name}</span>
            <span className="mt-0.5 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-brand ring-1 ring-brand/20">
              {roleLabel}
            </span>
          </span>
        </div>

        <div className="mt-1.5 space-y-0.5">
          <MenuItem href={dashboardHref} icon="grid" tint="#2563EB" bg="#EAF2FF">Dashboard</MenuItem>
          {isAdmin && (
            <MenuItem href="/admin" icon="shield" tint="#7C3AED" bg="#F3EAFE">Admin Panel</MenuItem>
          )}
          {isSeller && (
            <MenuItem href="/admin/seller" icon="bag" tint="#EA580C" bg="#FFF1E6" note="Merchandise & Podcast">
              Seller Studio
            </MenuItem>
          )}
          <MenuItem href={messagesHref} icon="mail" tint="#2563EB" bg="#EAF2FF">Messages</MenuItem>
          <MenuItem href="/dashboard/notifications" icon="bell" tint="#0D9488" bg="#E7F7F3">Notifications</MenuItem>
          <MenuItem href="/legal/need-help" icon="help" tint="#64748B" bg="#F1F5F9">Help &amp; Support</MenuItem>
        </div>

        <div className="my-1.5 h-px bg-line" />
        <SignOutButton className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium !text-ink-2 transition-colors hover:bg-danger-soft hover:!text-danger" />
      </div>
    </div>
  )
}

function MenuItem({
  href, icon, tint, bg, note, children,
}: {
  href: string; icon: IconName; tint: string; bg: string; note?: string; children: React.ReactNode
}) {
  return (
    <Link href={href} role="menuitem" className="group/mi flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-paper-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color: tint }}>
        <Icon name={icon} className="h-[17px] w-[17px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{children}</span>
        {note && <span className="block truncate text-[10.5px] text-ink-4">{note}</span>}
      </span>
      <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-ink-4 opacity-0 transition-all group-hover/mi:translate-x-0.5 group-hover/mi:opacity-100" />
    </Link>
  )
}
