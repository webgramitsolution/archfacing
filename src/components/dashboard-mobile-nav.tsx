'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from './ui'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from './dashboard-shell'

/**
 * Phone navigation for the dashboard — the app pattern rather than the
 * desktop one.
 *
 * A bar pinned to the bottom with the handful of destinations someone
 * actually taps, and a "More" sheet holding the rest. It sits at the bottom
 * because that is where a thumb is, and it is `fixed` rather than `sticky`
 * so it stays put while the page scrolls underneath.
 *
 * Only rendered below `md` — from a tablet up, the dark sidebar is shown
 * instead and the two viewports look identical.
 */
export function DashboardMobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const all = groups.flatMap((g) => g.items)

  // The tabs are the ones marked primary; failing that, the first four that
  // lead somewhere real.
  const marked = all.filter((i) => i.primary && !i.soon)
  const tabs = (marked.length ? marked : all.filter((i) => !i.soon)).slice(0, 4)

  /*
   * The active item is the LONGEST href the path matches, not simply the
   * first. Every professional page sits under /dashboard/professional, so a
   * plain prefix test lights up "Dashboard" while the reader is on Profile.
   */
  const best = all
    .filter((i) => !i.soon)
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]

  const isActive = (href: string) => best?.href === href

  return (
    <>
      {/* ═══════════ the bar ═══════════ */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((item) => (
            <li key={item.href + item.label}>
              <Tab
                href={item.href}
                icon={item.icon ?? 'grid'}
                label={item.short ?? item.label}
                active={isActive(item.href)}
                badge={item.badge}
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="flex w-full flex-col items-center gap-1 py-2 text-ink-3 transition-colors active:text-brand"
            >
              <Icon name="grid" className="h-[19px] w-[19px]" />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ═══════════ the sheet ═══════════ */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-admin-bg pb-[env(safe-area-inset-bottom)]">
            {/* the grab handle a sheet is expected to have */}
            <div className="sticky top-0 flex flex-col items-center bg-admin-bg pb-2 pt-2.5">
              <span className="h-1 w-9 rounded-full bg-white/25" />
              <div className="mt-2.5 flex w-full items-center justify-between px-5">
                <p className="font-display text-[15px] font-bold text-white">Menu</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[12.5px] font-semibold text-admin-muted"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-3 pb-5 pt-1">
              {groups.map((group, gi) => (
                <div key={group.title ?? `g${gi}`} className={gi > 0 ? 'mt-4' : ''}>
                  {group.title && (
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.09em] text-admin-muted">
                      {group.title}
                    </p>
                  )}
                  {group.items.map((item) => (
                    <SheetLink
                      key={item.href + item.label}
                      item={item}
                      active={isActive(item.href)}
                      onGo={() => setOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Tab({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string
  icon: IconName
  label: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center gap-1 py-2 transition-colors',
        active ? 'text-brand' : 'text-ink-3 active:text-brand'
      )}
    >
      <span className="relative">
        <Icon name={icon} className="h-[19px] w-[19px]" />
        {badge ? (
          <span className="tabular absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      {/* five tabs on a 360px screen leaves about 60px each, so the config
          gives these a one-word `short` rather than the sidebar's full label */}
      <span className="max-w-full truncate px-1 text-[10px] font-medium leading-none">
        {label}
      </span>
    </Link>
  )
}

function SheetLink({
  item,
  active,
  onGo,
}: {
  item: NavItem
  active: boolean
  onGo: () => void
}) {
  return (
    <Link
      href={item.soon ? '#' : item.href}
      onClick={item.soon ? undefined : onGo}
      aria-disabled={item.soon}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px]',
        item.soon
          ? 'cursor-default text-admin-muted/60'
          : active
            ? 'bg-admin-hover font-semibold text-brand'
            : 'text-admin-text active:bg-admin-hover'
      )}
    >
      {item.icon && <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0 opacity-80" />}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="tabular shrink-0 rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      ) : item.soon ? (
        <span className="shrink-0 text-[9.5px] uppercase tracking-wide text-admin-muted/70">
          Soon
        </span>
      ) : null}
    </Link>
  )
}
