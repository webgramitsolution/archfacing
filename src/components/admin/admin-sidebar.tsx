'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The Admin sidebar — dark navy, grouped modules, with collapsible submenus,
 * exactly as the reference. A parent item (e.g. "Users & Roles") expands to
 * show its sub-pages; the current route lights up and its parent group opens.
 *
 * Matching is on the pathname alone (query strings ignored). Where several
 * items share a base only the first lights — fine, since every real sub-page
 * has its own path.
 */

export type NavItem = {
  label: string
  icon: IconName
  href: string
  badge?: number
  badgeTone?: 'danger' | 'warn'
  children?: NavItem[]
}
export type NavGroup = { title: string; items: NavItem[] }

const base = (href: string) => href.split('?')[0]

export function AdminSidebarNav({ groups, sellerGroups }: { groups: NavGroup[]; sellerGroups?: NavGroup[] }) {
  const path = usePathname()

  // The Seller Studio (e-commerce) area gets its own nav, not the super-admin one.
  const active = sellerGroups && path.startsWith('/admin/seller') ? sellerGroups : groups
  return <SidebarNavInner groups={active} path={path} />
}

function SidebarNavInner({ groups, path }: { groups: NavGroup[]; path: string }) {
  const all = groups.flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]))
  let activeBase: string | null = null
  let bestLen = -1
  for (const i of all) {
    const b = base(i.href)
    const match = b === '/admin' ? path === '/admin' : path === b || path.startsWith(`${b}/`)
    if (match && b.length > bestLen) { activeBase = b; bestLen = b.length }
  }

  // First item on the winning base wins the highlight.
  const exactHref = activeBase ? all.find((i) => base(i.href) === activeBase)?.href ?? null : null

  return (
    <nav className="flex flex-col gap-4">
      {groups.map((group, gi) => (
        <div key={group.title || `g${gi}`}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.11em] text-white/35">{group.title}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarItem key={item.label} item={item} exactHref={exactHref} activeBase={activeBase} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarItem({ item, exactHref, activeBase }: { item: NavItem; exactHref: string | null; activeBase: string | null }) {
  const hasChildren = !!item.children?.length
  const selfActive = item.href === exactHref
  const childActive = item.children?.some((c) => base(c.href) === activeBase) ?? false
  const [open, setOpen] = useState(selfActive || childActive)

  if (!hasChildren) {
    return <li><Row item={item} active={selfActive} /></li>
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[12.5px] transition-colors',
          selfActive || childActive ? 'bg-brand font-semibold text-white shadow-sm' : 'font-medium text-white/65 hover:bg-white/10 hover:text-white'
        )}
      >
        <Icon name={item.icon} className={cn('h-4 w-4 shrink-0', selfActive || childActive ? 'text-white' : 'text-white/45')} />
        <span className="min-w-0 flex-1 truncate text-left leading-snug">{item.label}</span>
        <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children!.map((c) => {
            const cActive = c.href === exactHref
            return (
              <li key={c.label}>
                <Link
                  href={c.href}
                  aria-current={cActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                    cActive ? 'bg-white/15 font-semibold text-white' : 'text-white/55 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cActive ? 'bg-brand' : 'bg-white/30')} />
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

function Row({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[12.5px] transition-colors',
        active ? 'bg-brand font-semibold text-white shadow-sm' : 'font-medium text-white/65 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon name={item.icon} className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/45 group-hover:text-white')} />
      <span className="min-w-0 flex-1 truncate leading-snug">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className={cn(
          'tabular flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full px-1.5 text-[9.5px] font-bold',
          active ? 'bg-white/25 text-white' : item.badgeTone === 'danger' ? 'bg-danger text-white' : 'bg-warn text-white'
        )}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}
