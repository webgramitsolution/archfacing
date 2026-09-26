'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * The phone app bar — Home · Discover · Post · Updates · Profile — floating
 * over the bottom of every public page below `md`. Post is the raised orange
 * button. Signed out, the account tabs go to sign-in and come back.
 */
export function MobileTabBar({
  signedIn,
  dashboardHref,
  unread,
}: {
  signedIn: boolean
  dashboardHref: string
  unread: number
}) {
  const pathname = usePathname()
  const gate = (href: string) => (signedIn ? href : `/login?next=${encodeURIComponent(href)}`)

  // On a section page the second tab IS that section, and the fourth is
  // Messages (the section references); the home page keeps Discover/Updates.
  const section = SECTIONS.find((x) => pathname === x.href || pathname.startsWith(x.href + '/'))
  const tabs = [
    { key: 'home', label: 'Home', href: '/', active: pathname === '/', icon: HomeIcon },
    section
      ? { key: 'section', label: section.label, href: section.href, active: true, icon: section.icon }
      : { key: 'discover', label: 'Discover', href: '/projects', active: false, icon: DiscoverIcon },
    section
      ? { key: 'messages', label: 'Messages', href: gate('/dashboard/messages'), active: false, icon: ChatIcon }
      : { key: 'updates', label: 'Updates', href: gate('/dashboard/notifications'), active: pathname.startsWith('/dashboard/notifications'), icon: BellIcon, dot: unread > 0 },
    { key: 'profile', label: 'Profile', href: signedIn ? dashboardHref : '/login', active: pathname === '/login', icon: UserIcon },
  ]

  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-[60] px-2.5 md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="relative grid grid-cols-5 items-end rounded-[22px] border border-line bg-white px-1 pb-2 pt-2 shadow-lift">
        {tabs.slice(0, 2).map(({ key, ...t }) => <Tab key={key} {...t} />)}

        {/* Post — the raised orange button */}
        <Link href={gate('/dashboard/postings')} className="flex flex-col items-center" aria-label="Post">
          <span className="-mt-7 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_18px_-4px_rgba(249,115,22,.55)] ring-4 ring-white">
            <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="mt-1 text-[11px] font-medium text-ink">Post</span>
        </Link>

        {tabs.slice(2).map(({ key, ...t }) => <Tab key={key} {...t} />)}
      </div>
    </nav>
  )
}

function Tab({ label, href, active, icon: Glyph, dot }: { label: string; href: string; active: boolean; icon: () => React.ReactElement; dot?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('flex flex-col items-center gap-1', active ? 'text-brand' : 'text-ink')}
    >
      <span className="relative">
        <Glyph />
        {dot && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6">
      <path d="M3.5 10.5L12 3.5l8.5 7V20a1 1 0 01-1 1H15v-6H9v6H4.5a1 1 0 01-1-1z" fill="currentColor" />
    </svg>
  )
}
function DiscoverIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}>
      <circle cx="11" cy="11" r="7.5" /><path d="M20.5 20.5L16.5 16.5" /><path d="M8 12.5l1.5-3.5 3.5-1.5" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}>
      <path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
    </svg>
  )
}
function PactIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18.5 14c1.9.7 3 2.9 3 6" /></svg>
}
function MegaphoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>
}
function TrophyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4" /></svg>
}
function BadgeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v3h6V3M9 12l2 2 4-4" /></svg>
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h7M9 8h3" /></svg>
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
}
function GridIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>
}
function PaletteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" {...stroke}><rect x="3.5" y="5" width="12" height="14" rx="2" /><path d="M15.5 9l4.5-1.5 1 12-9.5 1" /><circle cx="9.5" cy="11" r="2" /></svg>
}

const SECTIONS: { href: string; label: string; icon: () => React.ReactElement }[] = [
  { href: '/pact', label: 'PACT', icon: PactIcon },
  { href: '/designers-associates', label: 'Professionals', icon: UsersIcon },
  { href: '/advertisements', label: 'Advertisements', icon: MegaphoneIcon },
  { href: '/competition', label: 'Competitions', icon: TrophyIcon },
  { href: '/membership', label: 'Membership', icon: BadgeIcon },
  { href: '/blog', label: 'Blog', icon: DocIcon },
  { href: '/podcast', label: 'Podcast', icon: MicIcon },
  { href: '/around-us', label: 'Around Us', icon: GridIcon },
  { href: '/artistry', label: 'Artistry', icon: PaletteIcon },
  { href: '/products', label: 'Products', icon: GridIcon },
  { href: '/projects', label: 'Projects', icon: DiscoverIcon },
]
