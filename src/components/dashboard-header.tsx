'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Icon, type IconName } from './ui'
import { LocationPicker } from './location-picker'
import { cn } from '@/lib/utils'

/**
 * The dashboard's top bar, per the blueprint.
 *
 * Search · location · the two "post" shortcuts · notifications · account.
 * It is a client component because the search field and the account menu both
 * hold state; the counts are passed in from the server.
 */

const SCOPES = [
  { value: '', label: 'All' },
  { value: 'projects', label: 'Projects' },
  { value: 'products', label: 'Products' },
  { value: 'designers-associates', label: 'Professionals' },
  { value: 'merchandise', label: 'Merchandise' },
] as const

export function DashboardHeader({
  user,
  roleLabel,
  actions,
  messagesHref,
  unreadNotifications,
  unreadMessages,
}: {
  user: { name?: string | null; email?: string | null; profilePhoto?: string | null }
  roleLabel: string
  /**
   * The two "post" shortcuts. Which two they are depends on the role — a
   * Professional gets Post Project / Post Product, a BMF gets what a BMF is
   * actually permitted to post — so the caller decides rather than this
   * component hard-coding one role's pair for everyone.
   */
  actions: { label: string; href: string }[]
  messagesHref: string
  unreadNotifications: number
  unreadMessages: number
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<string>('')
  const [menu, setMenu] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  function logout() {
    // Instant feedback — the sign-out round-trip + redirect take a beat, so the
    // label flips the moment it is clicked instead of looking frozen.
    setSigningOut(true)
    signOut({ callbackUrl: '/' })
  }

  function search(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    router.push(`/${scope || 'projects'}?q=${encodeURIComponent(term)}`)
  }

  return (
    <>
      <div className="hidden shrink-0 md:block">
        <LocationPicker />
      </div>

      {/* ─── search ─── */}
      <form
        onSubmit={search}
        className="header-control hidden min-w-0 flex-1 items-stretch border border-line bg-paper-2 md:flex"
      >
        <label htmlFor="dash-search" className="sr-only">
          Search ArchFacing
        </label>
        <input
          id="dash-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, products, professionals, services…"
          className="min-w-0 flex-1 rounded-l-md bg-transparent px-3.5 text-[13px] placeholder:text-ink-3/70 focus:outline-none"
        />
        <label htmlFor="dash-scope" className="sr-only">
          Where to search
        </label>
        {/*
          Hidden below `lg`.

          A native select sizes itself to its widest option, so "Professionals"
          made this 116px wide. On a 768 tablet that left the search field 42px
          — enough to show "Se" and nothing else. Above `lg` there is room for
          both. Hidden, `scope` stays "" and the search goes where All goes.
        */}
        <select
          id="dash-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="hidden shrink-0 border-l border-line bg-transparent px-2 text-[12.5px] text-ink-2 focus:outline-none lg:block"
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Search"
          className="shrink-0 rounded-r-md bg-brand px-4 text-white transition-opacity hover:opacity-90"
        >
          <Icon name="search" className="h-[17px] w-[17px]" />
        </button>
      </form>

      {/* ─── post shortcuts ─── */}
      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        {actions.map((a) => (
          <PostButton key={a.href + a.label} href={a.href} label={a.label} />
        ))}
      </div>

      {/* ─── alerts + account ─── */}
      <div className="ml-auto flex shrink-0 items-center gap-2.5 md:gap-3.5">
        {/*
          One alert bell only. Enquiries raise a Notification, so a new lead
          shows on the bell — a separate envelope beside it was a second, rival
          unread counter for the same events. `messagesHref`/`unreadMessages`
          stay wired for the account menu and mobile, just not a top-bar icon.
        */}
        <AlertLink
          href="/dashboard/notifications"
          icon="bell"
          label="Notifications"
          count={unreadNotifications}
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-paper-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-[13px] font-bold text-white">
              {user.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() ?? '?'
              )}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block max-w-[140px] truncate text-[13px] font-semibold text-ink">
                {user.name ?? 'Your account'}
              </span>
              <span className="block text-[11px] text-ink-3">{roleLabel}</span>
            </span>
            <svg viewBox="0 0 10 6" aria-hidden className="hidden h-[5px] w-[9px] text-ink-3 lg:block">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {menu && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenu(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-card border border-line bg-paper-2 shadow-lift">
                <div className="border-b border-line-soft px-4 py-3">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {user.name ?? 'Your account'}
                  </p>
                  {user.email && (
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{user.email}</p>
                  )}
                </div>
                <MenuLink href="/" label="View site" icon="arrow" onGo={() => setMenu(false)} />
                <MenuLink href="/dashboard/notifications" label="Notifications" icon="bell" onGo={() => setMenu(false)} />
                <MenuLink
                  href={messagesHref}
                  label={unreadMessages ? `Messages (${unreadMessages})` : 'Messages'}
                  icon="mail"
                  onGo={() => setMenu(false)}
                />
                <button
                  type="button"
                  onClick={logout}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2.5 border-t border-line-soft px-4 py-2.5 text-left text-[13px] text-brand transition-colors hover:bg-brand-soft disabled:opacity-60"
                >
                  <Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function PostButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="header-control inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-line bg-paper-2 px-3.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
    >
      <Icon name="plus" className="h-4 w-4" />
      {label}
    </Link>
  )
}

function AlertLink({
  href,
  icon,
  label,
  count,
}: {
  href: string
  icon: IconName
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      aria-label={count ? `${label} — ${count} unread` : label}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-paper-3 hover:text-brand"
    >
      <Icon name={icon} className="h-[19px] w-[19px]" />
      {count > 0 && (
        <span className={cn(
          'tabular absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white',
          icon === 'bell' ? 'bg-brand' : 'bg-danger'
        )}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function MenuLink({
  href,
  label,
  icon,
  onGo,
}: {
  href: string
  label: string
  icon: IconName
  onGo: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onGo}
      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-paper-3 hover:text-brand"
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}
