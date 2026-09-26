/**
 * The dashboard menu for every role — taken directly from PDF §5.
 * Items marked `soon: true` are not built yet; the roadmap records their phase.
 */

import type { Role } from '@prisma/client'
import type { NavItem, NavGroup, DashboardNav } from '@/components/dashboard-shell'
import type { IconName } from '@/components/ui'

/**
 * §5.1 — Client (Visitor) Dashboard.
 *
 * Grouped like the design: what the visitor explores, then their own activity,
 * then the account rows. "My Enquiry" points at the consultations page (the
 * enquiry threads ARE the messages on this platform), not at a separate
 * `/enquiries` that never existed.
 */
const CLIENT: NavGroup[] = [
  {
    items: [
      { label: 'Overview', href: '/dashboard/client', icon: 'grid', primary: true, short: 'Home' },
    ],
  },
  {
    title: 'Explore',
    items: [
      { label: 'Post Enquiry', href: '/consult-nearby', ref: '5.1.2', icon: 'inbox', primary: true, short: 'Enquiry' },
      { label: 'Post Artistry', href: '/dashboard/artistry', ref: '5.1.3', icon: 'image' },
      { label: 'My Competitions', href: '/dashboard/competitions', ref: '5.2.7', icon: 'trophy' },
      { label: 'My Orders', href: '/dashboard/orders', ref: '7.4.5', icon: 'bag' },
    ],
  },
  {
    title: 'My Activities',
    items: [
      { label: 'My Enquiry', href: '/dashboard/client/consultations', ref: '5.1.5', icon: 'mail', primary: true, short: 'Enquiries' },
      // Direct chats the visitor started from Artistry / Around Us posts.
      { label: 'Messages', href: '/dashboard/messages', icon: 'inbox' },
      { label: 'Saved Items', href: '/dashboard/client/saved', icon: 'heart' },
      { label: 'Recently Viewed', href: '/dashboard/client/recently-viewed', icon: 'eye' },
      { label: 'My Posts', href: '/dashboard/client/posts', ref: '5.1.6', icon: 'file' },
      { label: 'My Reviews', href: '/dashboard/client/reviews', icon: 'star' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile', href: '/dashboard/client/profile', ref: '5.1.1', icon: 'user', primary: true, short: 'Profile' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: 'bell' },
      { label: 'Help & Support', href: '/dashboard/help', icon: 'help' },
    ],
  },
]

/**
 * §5.2 — Professional / Consultant Dashboard.
 *
 * Grouped as the blueprint draws it. The headings are the blueprint's own —
 * My Business, Engagement, Content Management, Analytics & Growth, Account &
 * Settings — and every entry under them is a page that exists, except the few
 * marked `soon`, which are named in the PDF but not built.
 */
const PROFESSIONAL: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard/professional', icon: 'grid', primary: true, short: 'Home' }],
  },
  {
    title: 'My Business',
    items: [
      { label: 'Profile & Portfolio', href: '/dashboard/professional/profile', ref: '5.2.1', icon: 'user' },
      /*
       * Every posting type carries the same two children: what you have
       * already posted, and the form for the next one. `posting()` builds
       * that pair — see the bottom of this file.
       */
      posting('My Projects', '/dashboard/professional/projects', 'file', '5.2.2', {
        primary: true, short: 'Projects', one: 'project',
      }),
      posting('My Products', '/dashboard/professional/products', 'box', '5.2.3', { one: 'product' }),
      // Categories and expertise tags live in the profile editor's Business / Basic tabs.
      { label: 'Services Offered', href: '/dashboard/professional/profile/edit?tab=business', icon: 'tag' },
      { label: 'Qualifications', href: '/dashboard/professional/qualifications', ref: '4.3.3.2', icon: 'shield' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Leads / Enquiries', href: '/dashboard/professional/enquiries', ref: '5.2.12', icon: 'users', primary: true, short: 'Leads' },
      // Direct chats from Artistry / Around Us posts — separate from leads.
      { label: 'Messages', href: '/dashboard/messages', icon: 'mail' },
      { label: 'My Consultations (PACT)', href: '/dashboard/professional/consultations', ref: '5.2.11', icon: 'phone' },
      { label: 'Design Competitions', href: '/dashboard/competitions', ref: '5.2.7', icon: 'star', primary: true, short: 'Compete' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      posting('Around Us Posts', '/dashboard/professional/around-us', 'users', '5.2.4', { one: 'post' }),
      artistryNav('5.2.5', 'tag'),
      // the blog has real routes for both halves, so it names them itself
      {
        label: 'My Blogs', href: '/dashboard/blog', ref: '5.2.6', icon: 'file',
        children: [
          { label: 'All blogs', href: '/dashboard/blog' },
          { label: 'Write a blog', href: '/dashboard/blog/new' },
        ],
      },
      /*
       * "Post a Competition", not "Design Competitions" — the Engagement
       * group above already carries that name for /dashboard/competitions,
       * which is where you take part in one. This is where you run one.
       */
      posting('Competitions I Run', '/dashboard/professional/competition', 'plus', '5.2.7', {
        one: 'competition',
      }),
      { label: 'Edit the Postings', href: '/dashboard/postings', ref: '5.2.13', icon: 'settings' },
    ],
  },
  {
    // The blueprint's fourth group. Every entry here needs a page that does
    // not exist yet, so they carry `soon` and the sidebar renders them inert
    // rather than linking to a 404.
    title: 'Analytics & Growth',
    items: [
      { label: 'Analytics & Insights', href: '/dashboard/analytics', icon: 'chart' },
      { label: 'Profile Views', href: '/dashboard/profile-views', icon: 'users' },
      // The reviews page is built, so this is a live link, not a `soon` stub.
      { label: 'Reviews & Ratings', href: '/dashboard/professional/reviews', icon: 'star' },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      { label: 'Membership & Plans', href: '/dashboard/membership', ref: '5.2.10', icon: 'star' },
      { label: 'Portal Space', href: '/dashboard/portal-space', ref: '5.2.9', icon: 'grid' },
      // /dashboard/orders lists Merchandise this account bought — its own
      // orders, not money taken from clients
      { label: 'My Orders', href: '/dashboard/orders', icon: 'rupee' },
      { label: 'Notification Settings', href: '/dashboard/settings/notifications', icon: 'bell' },
      { label: 'Become a DA', href: '/dashboard/professional/design-associate', ref: '5.2.15', icon: 'shield' },
      { label: 'Help & Support', href: '/dashboard/help', icon: 'help' },
    ],
  },
]

/**
 * §5 — Consultant Dashboard, laid out exactly as the consultant reference
 * draws it: My Business, Leads & Enquiries, Engagement, Account & Settings.
 *
 * A consultant leads with services and consultations rather than a product
 * catalogue, so this is authored on its own instead of derived from the
 * professional menu. Rows whose page is not built yet carry `soon` and the
 * sidebar renders them inert. The badges mirror the reference's counts.
 */
const CONSULTANT: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard/consultant', icon: 'grid', primary: true, short: 'Home' }],
  },
  {
    title: 'My Business',
    items: [
      { label: 'Profile & Credentials', href: '/dashboard/consultant/profile', icon: 'user' },
      { label: 'Qualifications', href: '/dashboard/consultant/qualifications', ref: '4.3.3.2', icon: 'shield' },
      { label: 'My Consultations', href: '/dashboard/consultant/consultations', icon: 'phone' },
      { label: 'Service Areas (PACT)', href: '/dashboard/consultant/pact', icon: 'map' },
      { label: 'Portfolio / Projects', href: '/dashboard/consultant/projects', icon: 'image', primary: true, short: 'Projects' },
      { label: 'Documents & Certificates', href: '/dashboard/settings/documents', icon: 'file' },
    ],
  },
  {
    title: 'Leads & Enquiries',
    items: [
      { label: 'Enquiries Received', href: '/dashboard/consultant/enquiries', icon: 'inbox', primary: true, short: 'Leads' },
      { label: 'Renew PACT', href: '/dashboard/pact/renew', icon: 'clock' },
      { label: 'Messages', href: '/dashboard/messages', icon: 'mail', primary: true, short: 'Messages' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      // Client feedback is the review text itself; there is no appointment
      // model, so neither gets a page of its own.
      { label: 'Reviews & Ratings', href: '/dashboard/consultant/reviews', icon: 'star' },
      { label: 'Analytics & Insights', href: '/dashboard/analytics', icon: 'chart' },
      { label: 'Profile Views', href: '/dashboard/profile-views', icon: 'users' },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      { label: 'Membership & Plans', href: '/dashboard/membership', icon: 'award' },
      { label: 'Payment & Invoices', href: '/dashboard/orders', icon: 'rupee' },
      { label: 'Notification Settings', href: '/dashboard/settings/notifications', icon: 'bell' },
      { label: 'Help & Support', href: '/dashboard/help', icon: 'help' },
    ],
  },
]

/**
 * §5.3 — BMF Dashboard, grouped as the blueprint draws it.
 *
 * A Building Materials Facilitator is a lead business, not a posting one:
 * they list stock, take enquiries from their PACT area and turn them into
 * orders. The groups follow that — Business, Leads & Enquiries, PACT
 * Management, Engagement, Account.
 *
 * Entries marked `soon` have no page yet; the sidebar renders those inert
 * rather than linking to a 404.
 */
const BMF: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard/bmf', icon: 'grid', primary: true, short: 'Home' }],
  },
  {
    title: 'Business',
    items: [
      { label: 'My Profile', href: '/dashboard/bmf/profile', ref: '5.3.1', icon: 'user' },
      /*
       * §7.4.1 does not give a BMF `post:product`, so there is no product
       * catalogue, deal or bulk upload to manage here; a BMF's materials are
       * the product categories on their profile.
       */
    ],
  },
  {
    title: 'Leads & Enquiries',
    items: [
      /*
       * The blueprint lists four rows here. Two of them cannot stand:
       * "Messages" resolves to the same page as Leads (PACT) — an enquiry
       * thread is the messaging on this platform — and "Order Requests"
       * has no page and nothing to fill one with, because no model records
       * an order against a BMF's listing.
       *
       * ⚠️ /enquiries is `holderId` (leads sent TO this BMF) and
       *    /consultations is `clientId` (enquiries this BMF sent out). The
       *    labels used to be the other way round.
       */
      { label: 'Leads (PACT)', href: '/dashboard/bmf/enquiries', ref: '5.3.7', icon: 'inbox', primary: true, short: 'Leads' },
      { label: 'Enquiries I Sent', href: '/dashboard/bmf/consultations', ref: '5.3.6', icon: 'mail' },
      // Direct chats from Artistry / Around Us posts — separate from leads.
      { label: 'Messages', href: '/dashboard/messages', icon: 'inbox' },

    ],
  },
  {
    title: 'PACT Management',
    items: [
      /*
       * The phone tab bar drops anything marked `soon`, and My Products —
       * the blueprint's second tab — has no page yet. My PACT Area takes
       * that slot so the bar still carries five, and it is the page a BMF
       * reaches for most after their leads.
       */
      { label: 'My PACT Area', href: '/dashboard/bmf/pact', ref: '5.3.4', icon: 'map', primary: true, short: 'PACT' },
      { label: 'Area Analytics', href: '/dashboard/bmf/area-analytics', icon: 'chart' },
      { label: 'Profile Views', href: '/dashboard/profile-views', icon: 'users' },
      { label: 'Renew PACT', href: '/dashboard/pact/renew', icon: 'clock' },
      // Not /designers-associates — that is the public directory, which drops
      // the reader out of the dashboard and lists the whole country rather
      // than the PIN code they hold
      { label: 'Professionals in Area', href: '/dashboard/bmf/professionals', icon: 'users' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      {
        label: 'My Blogs', href: '/dashboard/blog', ref: '5.3.2', icon: 'file',
        children: [
          { label: 'All blogs', href: '/dashboard/blog' },
          { label: 'Write a blog', href: '/dashboard/blog/new' },
        ],
      },
      // §7.4.1 grants a BMF `post:around_us` and `post:artistry`, and both
      // pages exist — they were simply missing from this menu
      posting('Around Us Posts', '/dashboard/bmf/around-us', 'users', '5.3.2', { one: 'post' }),
      artistryNav('5.3.2', 'star'),
      { label: 'Design Competitions', href: '/dashboard/competitions', ref: '5.3.3', icon: 'star', primary: true, short: 'Compete' },
      posting('Competitions I Run', '/dashboard/bmf/competition', 'plus', '5.3.3', { one: 'competition' }),
      advertisementsNav('tag'),
      { label: 'Reviews & Ratings', href: '/dashboard/bmf/reviews', icon: 'star' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Membership & Plans', href: '/dashboard/membership', ref: '5.3.5', icon: 'star' },
      { label: 'Portal Space', href: '/dashboard/portal-space', ref: '4.4', icon: 'grid' },
      // /dashboard/orders lists Merchandise this account bought — its own
      // orders, not orders placed with it
      { label: 'My Orders', href: '/dashboard/orders', icon: 'rupee' },
      { label: 'Notification Settings', href: '/dashboard/settings/notifications', icon: 'bell' },
      { label: 'Help & Support', href: '/dashboard/help', icon: 'help' },
    ],
  },
]

/** §5.4 — Corporate Dashboard */
/**
 * Corporate, grouped the way the reference draws it: the business itself,
 * then what it publishes, then marketing, then the account.
 *
 * A Corporate account holds `post:product`, `post:project`, `post:blog`,
 * `post:around_us` and `post:artistry` (§7.4.1), so every content row here is
 * a page it can actually reach.
 */
const CORPORATE: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard/corporate', icon: 'grid', primary: true, short: 'Home' }],
  },
  {
    title: 'My Business',
    items: [
      { label: 'Company Profile', href: '/dashboard/corporate/profile', ref: '5.4.1', icon: 'user' },
      posting('Products', '/dashboard/corporate/products', 'box', '5.4.2', { one: 'product', primary: true, short: 'Products' }),
      posting('Projects', '/dashboard/corporate/projects', 'file', '5.4.2', { one: 'project', primary: true, short: 'Projects' }),
      { label: 'Portal Space', href: '/dashboard/portal-space', ref: '5.4.4', icon: 'grid' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Leads / Enquiries', href: '/dashboard/corporate/enquiries', ref: '5.4.3', icon: 'inbox', primary: true, short: 'Leads' },
      { label: 'Messages', href: '/dashboard/messages', icon: 'mail' },
      { label: 'My PACT', href: '/dashboard/corporate/pact', ref: '5.4.3', icon: 'map' },
      { label: 'Analytics & Insights', href: '/dashboard/analytics', icon: 'chart' },
      { label: 'Profile Views', href: '/dashboard/profile-views', icon: 'users' },
      { label: 'My Competitions', href: '/dashboard/competitions', ref: '5.4.2', icon: 'award' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      posting('Around Us Posts', '/dashboard/corporate/around-us', 'users', '5.2.4', { one: 'post' }),
      artistryNav('5.2.5', 'tag'),
      {
        label: 'My Blogs', href: '/dashboard/blog', ref: '5.2.6', icon: 'file',
        children: [
          { label: 'All blogs', href: '/dashboard/blog' },
          { label: 'Write a blog', href: '/dashboard/blog/new' },
        ],
      },
    ],
  },
  {
    title: 'Marketing',
    items: [
      advertisementsNav('chart'),
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      { label: 'Club Membership', href: '/dashboard/club', ref: '5.4.5', icon: 'star' },
      { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
    ],
  },
]

/** RM Employee — not in the PDF; added per requirement */
const EMPLOYEE: NavItem[] = [
  { label: 'Overview', href: '/dashboard/employee' },
  { label: 'Leads', href: '/dashboard/employee/leads' },
  { label: 'PACT Holders', href: '/dashboard/employee/pact-holders' },
  { label: 'Complaints', href: '/dashboard/employee/complaints' },
  { label: 'My Profile', href: '/dashboard/settings' },
]

const ADVERTISER: NavItem[] = [
  { label: 'Overview', href: '/dashboard/advertiser' },
  { label: 'My Ads', href: '/dashboard/advertisements' },
  { label: 'My Profile', href: '/dashboard/settings' },
]

export const DASHBOARD_NAV: Record<Role, DashboardNav> = {
  CLIENT,
  PROFESSIONAL,
  CONSULTANT,
  BMF,
  CORPORATE,
  RM_EMPLOYEE: EMPLOYEE,
  EXTERNAL_ADVERTISER: ADVERTISER,
  // Admin roles have their own menus defined in the admin layout
  SUPER_ADMIN: [],
  ADMIN: [],
  ADMIN_SELLER: [],
}

// ═══════════════════════════════════════════════════════════

/**
 * A posting-type menu row with its two children.
 *
 * Each of these pages lists what the account has already posted and carries
 * the form for the next one, in that order. The menu used to offer a single
 * row for both, so "My Projects" opened on a blank form with the seven
 * projects below the fold — the reason for the split.
 *
 * `#add-new` is the heading `PostForm` renders above its first field, so the
 * second child lands the reader on the form without needing a second route.
 */
function posting(
  label: string,
  href: string,
  icon: NavItem['icon'],
  ref: string,
  opts: { one: string; primary?: boolean; short?: string }
): NavItem {
  return {
    label,
    href,
    ref,
    icon,
    ...(opts.primary ? { primary: true } : {}),
    ...(opts.short ? { short: opts.short } : {}),
    children: [
      { label: `All ${label.replace(/^My /, '').toLowerCase()}`, href },
      { label: `Add a ${opts.one}`, href: `${href}#add-new` },
    ],
  }
}

/**
 * Artistry's own row.
 *
 * It does not use `posting()` because Artistry has a real workflow behind it —
 * a piece moves draft → review → published or rejected — and the design lists
 * every one of those as its own filter rather than the generic
 * "All …" / "Add a …" pair.
 */
function artistryNav(ref: string, icon: NavItem['icon']): NavItem {
  return {
    label: 'Artistry Uploads',
    href: '/dashboard/artistry',
    ref,
    icon,
    children: [
      { label: 'Create New Artistry', href: '/dashboard/artistry/new' },
      { label: 'All Artistry', href: '/dashboard/artistry' },
      { label: 'Drafts', href: '/dashboard/artistry?status=draft' },
      { label: 'Pending Review', href: '/dashboard/artistry?status=review' },
      { label: 'Published', href: '/dashboard/artistry?status=published' },
      { label: 'Rejected', href: '/dashboard/artistry?status=rejected' },
    ],
  }
}

/**
 * The Advertisements menu — one parent with the eight screens under it.
 *
 * Written once and used by every role that may advertise, so the BMF and
 * Corporate menus cannot drift apart. The parent is still a link: clicking it
 * opens My Advertisements.
 */
export function advertisementsNav(icon: IconName = 'chart'): NavItem {
  return {
    label: 'Advertisements',
    href: '/dashboard/advertisements',
    ref: '7.4.6',
    icon,
    children: [
      { label: 'My Advertisements', href: '/dashboard/advertisements' },
      { label: 'Create Advertisement', href: '/dashboard/advertisements/create' },
      { label: 'Drafts', href: '/dashboard/advertisements/drafts' },
      { label: 'Pending Approval', href: '/dashboard/advertisements/pending' },
      { label: 'Active', href: '/dashboard/advertisements/active' },
      { label: 'Scheduled', href: '/dashboard/advertisements/scheduled' },
      { label: 'Completed', href: '/dashboard/advertisements/completed' },
      { label: 'Rejected', href: '/dashboard/advertisements/rejected' },
    ],
  }
}
