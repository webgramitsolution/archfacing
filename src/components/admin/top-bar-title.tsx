'use client'

import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui'

/**
 * The top-bar heading — page-aware. On the dashboard it reads "Super Admin
 * Dashboard / Complete platform control & overview"; on a section page it reads
 * "Super Admin / {Section} › {Page}", matching the reference. A tiny client
 * component so the shared server layout can still show the right breadcrumb.
 */

const SUBTITLE = "India's Leading B2B Marketplace for Architecture, Building Materials & Design"

const MAP: Record<string, { title: string; crumb: string }> = {
  '/admin': { title: 'Admin Panel', crumb: SUBTITLE },
  '/admin/users': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles' },
  '/admin/admins': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles › Admins' },
  '/admin/employees': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles › Employees' },
  '/admin/professionals': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles › Professionals' },
  '/admin/corporates': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles › Corporates & BMFs' },
  '/admin/students': { title: 'Admin Panel', crumb: 'Platform Management › Users & Roles › Students' },
  '/admin/visitors': { title: 'Admin Panel', crumb: 'Platform Management › Buyers / Clients' },
  '/admin/visitors/add': { title: 'Admin Panel', crumb: 'Users & Roles › Buyers / Clients › Add Buyer / Client' },
  '/admin/visitors/verification': { title: 'Admin Panel', crumb: 'Buyers / Clients › Verification Queue' },
  '/admin/visitors/verification/settings': { title: 'Admin Panel', crumb: 'Users & Roles › Verification Settings' },
  '/admin/user-activity': { title: 'Admin Panel', crumb: 'Users & Roles › User Activity' },
  '/admin/role-permissions': { title: 'Admin Panel', crumb: 'Platform Management › Role Permissions' },
  '/admin/moderation': { title: 'Admin Panel', crumb: 'Content Management › Moderation' },
  '/admin/pact': { title: 'Admin Panel', crumb: 'Business & Marketing › PACT Areas' },
  '/admin/payments': { title: 'Admin Panel', crumb: 'Membership & Finance › Payments' },
  '/admin/trust': { title: 'Admin Panel', crumb: 'Support & Security › Trust & Safety' },
  '/admin/growth': { title: 'Admin Panel', crumb: 'Business & Marketing › Leads & Enquiries' },
  '/admin/ads': { title: 'Admin Panel', crumb: 'Business & Marketing › Advertisements' },
  '/admin/seller': { title: 'Admin Panel', crumb: 'Content Management › Merchandise & Podcast' },
  '/admin/reports': { title: 'Admin Panel', crumb: 'Home › Reports' },
  '/admin/settings': { title: 'Admin Panel', crumb: 'System Management › Settings' },
  '/admin/categories': { title: 'Admin Panel', crumb: 'Content Management › Categories' },
}

export function TopBarTitle() {
  const path = usePathname()

  // Longest matching prefix wins, so /admin/ads/featured still resolves to Ads.
  let best = MAP['/admin']
  let bestLen = -1
  for (const [href, val] of Object.entries(MAP)) {
    const match = href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`)
    if (match && href.length > bestLen) {
      best = val
      bestLen = href.length
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon name="shield" className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 max-w-[320px]">
        <h1 className="font-display text-[18px] font-bold leading-tight text-ink">{best.title}</h1>
        <p className="truncate text-[11px] text-ink-3">{best.crumb}</p>
      </div>
    </div>
  )
}
