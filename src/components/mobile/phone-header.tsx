import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LOGO_URL } from '@/components/logo'
import { LocationPicker } from '@/components/location-picker'
import { MobileNavDrawer, type DrawerNavItem, type DrawerUser } from './mobile-nav-drawer'

/** How a page wants its phone search bar drawn — see the phone references. */
export type PhoneSearch = {
  placeholder: string
  /** GET target of the form, e.g. "/projects". */
  action: string
  /** Query parameter the page reads, default "q". */
  param?: string
  /** orange = an orange search button; filter = a dark filter tile; camera = camera icon + orange button. */
  variant?: 'orange' | 'filter' | 'camera'
}

export type PhoneHeaderOptions = {
  /** false hides the search row (Membership). */
  search?: PhoneSearch | false
  /** Show the city pill beside the logo (PACT, Designers & Associates). */
  location?: boolean
  /** dark = navy header, for pages whose hero is dark (Products, Projects). */
  tone?: 'light' | 'dark'
}

/**
 * The phone header shared by every public page below `md` — hamburger (left
 * drawer), logo, optional city pill, notification bell, avatar, and the
 * page's own search row. Desktop keeps the two-bar header untouched.
 */
export function PhoneHeader({
  items,
  user,
  unread,
  options = {},
}: {
  items: DrawerNavItem[]
  user: DrawerUser
  unread: number
  options?: PhoneHeaderOptions
}) {
  const dark = options.tone === 'dark'
  const search = options.search === undefined
    ? { placeholder: 'Search projects, products, professionals…', action: '/projects', variant: 'filter' as const }
    : options.search

  return (
    <div className={cn('md:hidden', dark ? 'bg-navy text-white' : 'bg-white')}>
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2">
        <MobileNavDrawer items={items} user={user} tone={dark ? 'light' : 'dark'} className="-ml-1" />
        <Link href="/" aria-label="ArchFacing — home" className="shrink-0">
          {/* Logo only — no plate behind it on any tone (client request). */}
          <Image src={LOGO_URL} alt="ArchFacing" width={dark ? 58 : 66} height={dark ? 33 : 37} priority className="object-contain" />
        </Link>
        {options.location && (
          <div className="ml-1 min-w-0 [&_button]:!h-8 [&_button]:!px-2.5 [&_button]:!text-[12px]">
            <LocationPicker onPhone />
          </div>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <Link
            href={user ? '/dashboard/notifications' : '/login?next=%2Fdashboard%2Fnotifications'}
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            className={cn('relative flex h-10 w-10 items-center justify-center rounded-full', dark ? 'text-white' : 'text-ink')}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
            {unread > 0 && (
              <span className="tabular absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <Link
            href={user ? user.dashboardHref : '/login'}
            aria-label={user ? 'Your dashboard' : 'Sign in'}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[14px] font-bold',
              dark ? 'bg-white/15 text-white ring-2 ring-white/70' : 'bg-paper-3 text-ink-2 ring-1 ring-line'
            )}
          >
            {user?.photo ? (
              <Image src={user.photo} alt="" fill sizes="36px" unoptimized className="object-cover" />
            ) : user ? (
              user.name.trim().charAt(0).toUpperCase()
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
            )}
          </Link>
        </span>
      </div>

      {search && (
        <form action={search.action} method="get" role="search" className="flex items-center gap-2 px-3 pb-2.5">
          <label className={cn('flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3', dark ? 'border-white/15 bg-white/10' : 'border-line bg-white')}>
            <svg viewBox="0 0 24 24" aria-hidden className={cn('h-[18px] w-[18px] shrink-0', dark ? 'text-white/70' : 'text-ink-3')} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              name={search.param ?? 'q'}
              type="search"
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className={cn('min-w-0 flex-1 bg-transparent text-[13px] outline-none', dark ? 'text-white placeholder:text-white/60' : 'text-ink placeholder:text-ink-4')}
            />
            {search.variant === 'camera' && (
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            )}
          </label>
          {search.variant === 'filter' ? (
            <button type="submit" aria-label="Search" className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', dark ? 'border border-white/15 bg-white/10 text-white' : 'bg-navy text-white')}>
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
            </button>
          ) : (
            <button type="submit" aria-label="Search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            </button>
          )}
        </form>
      )}
    </div>
  )
}
