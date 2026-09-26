'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { Role } from '@prisma/client'
import { Icon, type IconName } from './ui'
import { LinkPending } from './link-pending'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from './dashboard-shell'

const STORAGE_KEY = 'af.sidebar.collapsed'

/**
 * The dark sidebar, with a collapse toggle beside the logo.
 *
 * Collapsed it keeps only the icons, which buys back 153px for the page on a
 * narrow laptop. The choice is remembered per browser — every localStorage
 * touch is wrapped, because it throws in a private window and a sidebar that
 * cannot render is worse than one that forgets.
 *
 * ⚠️ Rendered collapsed=false on the server every time, then corrected in an
 *    effect. Reading localStorage during render would not match the server's
 *    HTML and React would throw a hydration error.
 */
export function DashboardSidebar({
  user,
  groups,
  roleLabel,
  widthClass,
  profileStrength,
  profileHref,
}: {
  user: { name?: string | null; role: Role; profilePhoto?: string | null }
  groups: NavGroup[]
  roleLabel: string
  widthClass: string
  /** 0-100, from the fields actually filled in */
  profileStrength: number
  profileHref: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // stays expanded — the default is the useful one
    }
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // it will not be remembered, but the toggle still works this session
      }
      return next
    })
  }

  // Coming-soon (`soon`) entries are placeholders with no page behind them, so
  // they are dropped from every dashboard's menu; a group left with nothing
  // real in it is dropped too.
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.soon) }))
    .filter((g) => g.items.length > 0)

  const pathname = usePathname()
  const activePath = activePathFor(pathname, visibleGroups)

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        // md, not lg: a tablet gets exactly the desktop layout. Below it the
        // phone gets the bottom bar, so no width is left without navigation.
        'hidden h-screen shrink-0 flex-col overflow-hidden bg-admin-bg transition-[width] duration-200 md:flex',
        collapsed ? 'w-[72px]' : widthClass
      )}
    >
      {/* ─── everything dark scrolls together; the collapse toggle rides in the
              profile row so it centres on the avatar with no gap above ─── */}
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Profile
          user={user}
          roleLabel={roleLabel}
          collapsed={collapsed}
          onToggle={toggle}
          profileStrength={profileStrength}
          profileHref={profileHref}
        />

        <nav aria-label="Dashboard" className={cn('flex flex-col gap-0.5 pb-6', collapsed ? 'px-2' : 'px-3')}>
          {visibleGroups.map((group, gi) => (
            <div key={group.title ?? `g${gi}`} className={gi > 0 ? 'mt-5' : ''}>
              {group.title &&
                (collapsed ? (
                  // a rule stands in for the heading, so the groups still read
                  // as groups without a label to read them by
                  <span className="mx-2 mb-2 mt-1 block border-t border-white/10" />
                ) : (
                  <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-admin-muted">
                    {group.title}
                  </p>
                ))}
              {group.items.map((item) =>
                item.children?.length ? (
                  <SidebarBranch
                    key={item.href + item.label}
                    item={item}
                    collapsed={collapsed}
                    activePath={activePath}
                  />
                ) : (
                  <SidebarLink
                    key={item.href + item.label}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href, activePath)}
                  />
                )
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function Profile({
  user,
  roleLabel,
  collapsed,
  onToggle,
  profileStrength,
  profileHref,
}: {
  user: { name?: string | null; role: Role; profilePhoto?: string | null }
  roleLabel: string
  collapsed: boolean
  onToggle: () => void
  profileStrength: number
  profileHref: string
}) {
  const initial = user.name?.[0]?.toUpperCase() ?? '?'

  const toggleBtn = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'}
      title={collapsed ? 'Expand the menu' : 'Collapse the menu'}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/60 transition-colors hover:border-white/40 hover:text-white"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d={collapsed ? 'M14 9l3 3-3 3' : 'M17 9l-3 3 3 3'} />
      </svg>
    </button>
  )

  return (
    <div
      className={cn(
        'border-b border-white/10 pb-4',
        collapsed ? 'flex flex-col items-center gap-2 px-2 pt-2' : 'px-4 pt-2.5'
      )}
    >
      {collapsed && toggleBtn}
      <div className={cn('flex items-center gap-3', collapsed && 'gap-0')}>
        <span className="relative shrink-0" title={collapsed ? user.name ?? '' : undefined}>
          <span
            className={cn(
              'flex items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-white',
              collapsed ? 'h-9 w-9 text-[13px]' : 'h-11 w-11 text-[15px]'
            )}
          >
            {user.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-admin-bg bg-ok" />
        </span>

        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-white">
              {user.name ?? 'Your account'}
            </span>
            <span className="block text-[11.5px] text-admin-muted">{roleLabel}</span>
          </span>
        )}

        {!collapsed && toggleBtn}
      </div>

      {/*
        No orange role pill here.

        It repeated, word for word, the line already sitting under the name.
        The reference carries a badge in this spot, but it says something the
        line above does not — the DESIGNA/DESIGNI tier — and until that is
        wired the pill is only the same word twice.
      */}

      {/* §5.2.1 — the nudge to finish the profile, from the blueprint.
          Platform staff have no public profile or leads, so they never see it. */}
      {!collapsed && !['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE'].includes(user.role) && (
        <div className="mt-4 rounded-lg bg-white/[0.06] p-3">
          <p className="flex items-center justify-between text-[11px] text-admin-muted">
            Profile Completion
            <span className="tabular font-bold text-white">{profileStrength}%</span>
          </p>
          <span
            role="progressbar"
            aria-valuenow={profileStrength}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15"
          >
            <span
              className="block h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${profileStrength}%` }}
            />
          </span>
          {profileStrength < 100 && (
            <>
              <p className="mt-2 text-[10.5px] leading-snug text-admin-muted">
                Complete your profile to get more leads.
              </p>
              <Link
                href={profileHref}
                className="mt-2.5 block rounded-md bg-white/10 py-1.5 text-center text-[11.5px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                Complete Now
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A row with sub-items — "My Projects" over "All projects" and "Add new".
 *
 * Open when the reader is already somewhere inside it, so the menu never
 * hides the page they are on. Collapsed the whole thing falls back to the
 * parent link; there is no room for a sub-list beside a 72px rail.
 */
function SidebarBranch({ item, collapsed, activePath }: { item: NavItem; collapsed: boolean; activePath: string | null }) {
  const pathname = usePathname()
  const kids = item.children ?? []

  const inside =
    pathname === item.href ||
    pathname.startsWith(item.href + '/') ||
    kids.some((k) => pathname === k.href.split('#')[0])

  const [open, setOpen] = useState(inside)
  useEffect(() => {
    if (inside) setOpen(true)
  }, [inside])

  // Collapsed, the parent stands for the whole branch.
  const branchActive =
    [item, ...kids].some((k) => isActive(k.href, activePath))
  if (collapsed) return <SidebarLink item={item} collapsed active={branchActive} />

  // The child that owns the current page — the plain link, not its `#anchor` twin.
  const activeKid =
    kids.find((k) => !k.href.includes('#') && isActive(k.href, activePath)) ??
    kids.find((k) => isActive(k.href, activePath))

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
          inside ? 'bg-admin-hover' : 'hover:bg-admin-hover'
        )}
      >
        <Link
          href={item.href}
          aria-current={!activeKid && isActive(item.href, activePath) ? 'page' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-[7px] text-[12.5px] text-admin-text group-hover:text-white"
        >
          {item.icon && <Icon name={item.icon} className="h-[15px] w-[15px] shrink-0 opacity-80" />}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? `Hide ${item.label} options` : `Show ${item.label} options`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-admin-muted transition-colors hover:text-white"
        >
          <svg
            viewBox="0 0 10 6"
            aria-hidden
            className={cn('h-[5px] w-[9px] transition-transform', open && 'rotate-180')}
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <ul className="mb-1 ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-2.5">
          {kids.map((k) => (
            <li key={k.href + k.label}>
              <Link
                href={k.soon ? '#' : k.href}
                aria-disabled={k.soon}
                aria-current={k === activeKid ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-[5px] text-[12px] transition-colors',
                  k.soon
                    ? 'cursor-default text-admin-muted/60'
                    : k === activeKid
                      ? 'bg-admin-hover text-white'
                      : 'text-admin-muted hover:bg-admin-hover hover:text-white'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{k.label}</span>
                <LinkPending />
                {k.soon && (
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-admin-muted/70">
                    Soon
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SidebarLink({ item, collapsed, active = false }: { item: NavItem; collapsed: boolean; active?: boolean }) {
  return (
    <Link
      href={item.soon ? '#' : item.href}
      aria-disabled={item.soon}
      aria-current={active ? 'page' : undefined}
      // collapsed, the native tooltip is the only label there is
      title={collapsed ? item.label : undefined}
      className={cn(
        'group flex items-center rounded-lg text-[12.5px] transition-colors',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-[7px]',
        item.soon
          ? 'cursor-default text-admin-muted/60'
          : active
            ? 'bg-admin-hover text-white'
            : 'text-admin-text hover:bg-admin-hover hover:text-white'
      )}
    >
      {item.icon && (
        <Icon
          name={item.icon as IconName}
          className={cn('shrink-0 opacity-80', collapsed ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]')}
        />
      )}

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {/* marks itself busy the moment this item is clicked */}
          <LinkPending />
          {item.badge ? (
            <span className="tabular shrink-0 rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.badge}
            </span>
          ) : item.soon ? (
            <span className="shrink-0 text-[9.5px] uppercase tracking-wide text-admin-muted/70">
              Soon
            </span>
          ) : null}
        </>
      )}
      {collapsed && <LinkPending className="absolute" />}

      {/* collapsed, a badge has no room beside the icon, so it rides on it */}
      {collapsed && item.badge ? (
        <span className="tabular absolute ml-6 -mt-4 rounded-pill bg-brand px-1 text-[9px] font-bold text-white">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      ) : null}
    </Link>
  )
}

/** An href's path, without its #anchor or ?query. */
function pathOf(href: string): string {
  return href.split(/[?#]/)[0]
}

/** Does this menu href own the current page? ?query hrefs never do (see below). */
function isActive(href: string, activePath: string | null): boolean {
  return activePath !== null && !href.includes('?') && pathOf(href) === activePath
}

/**
 * The page the reader is on, as the LONGEST menu path the URL falls under —
 * the same rule as the phone tab bar (dashboard-mobile-nav.tsx). A plain
 * prefix test would light "Dashboard" on every page beneath it. Items whose
 * href carries a ?query are skipped: the path alone cannot tell them apart
 * from the page they point into.
 */
function activePathFor(pathname: string, groups: NavGroup[]): string | null {
  const paths = groups
    .flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]))
    .filter((i) => !i.soon && !i.href.includes('?') && i.href.startsWith('/'))
    .map((i) => pathOf(i.href))
  const hit = paths
    .filter((p) => pathname === p || pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return hit ?? null
}
