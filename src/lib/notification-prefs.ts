import type { IconName } from '@/components/ui'

/**
 * Notification preferences — the single source of truth for the Settings →
 * Notification Settings grid.
 *
 * Preferences are stored on `User.notificationPrefs` as
 * `{ [itemKey]: { email, sms, whatsapp, inApp } }`. A brand-new account has
 * `null` there and falls back to `DEFAULT_PREFS` below, so the grid always has
 * a sensible state to render and save. `resolvePrefs` merges whatever is stored
 * over the defaults, which means a NEW notification type added here later shows
 * its default immediately for everyone, without a data migration.
 */

export const CHANNELS = ['email', 'sms', 'whatsapp', 'inApp'] as const
export type Channel = (typeof CHANNELS)[number]

export type ItemPrefs = Record<Channel, boolean>
export type NotifPrefs = Record<string, ItemPrefs>

/** The four delivery channels, as the top cards and the column headers show them. */
export const CHANNEL_META: Record<
  Channel,
  { label: string; cardTitle: string; cardSub: string; icon: IconName; tint: string }
> = {
  email: { label: 'Email', cardTitle: 'Email Notifications', cardSub: 'Receive updates via email', icon: 'mail', tint: 'text-info' },
  sms: { label: 'SMS', cardTitle: 'SMS Notifications', cardSub: 'Get important alerts via SMS', icon: 'mobile', tint: 'text-ink-2' },
  whatsapp: { label: 'WhatsApp', cardTitle: 'WhatsApp Notifications', cardSub: 'Receive instant updates', icon: 'phone', tint: 'text-ok' },
  inApp: { label: 'In-App', cardTitle: 'In-App Notifications', cardSub: 'Get notified inside platform', icon: 'bell', tint: 'text-brand' },
}

export type NotifItem = {
  key: string
  title: string
  desc: string
  /** The default channel matrix for this item. */
  def: ItemPrefs
}

export type NotifGroup = {
  key: string
  title: string
  desc: string
  icon: IconName
  items: NotifItem[]
}

const on: ItemPrefs = { email: true, sms: true, whatsapp: true, inApp: true }
const p = (email: boolean, sms: boolean, whatsapp: boolean, inApp: boolean): ItemPrefs => ({ email, sms, whatsapp, inApp })

/**
 * The catalogue. Editing this — adding a group, an item, or changing a default
 * — is all it takes; the page, the defaults and the save validation all read
 * from here, so they can never disagree.
 */
export const NOTIF_GROUPS: NotifGroup[] = [
  {
    key: 'business',
    title: 'Business & Leads',
    desc: 'Get notified about new opportunities and business enquiries',
    icon: 'target',
    items: [
      { key: 'new-lead', title: 'New Lead / Enquiry', desc: 'When a new enquiry is received for your services or products', def: on },
      { key: 'project-invitations', title: 'Project Invitations', desc: 'When you are invited to a new project', def: p(true, false, true, true) },
      { key: 'pact-leads', title: 'Consultant PACT Leads', desc: 'When leads are shared based on your PACT plan', def: on },
      { key: 'direct-messages', title: 'Direct Messages', desc: 'When someone sends you a message', def: p(true, false, true, true) },
    ],
  },
  {
    key: 'listings',
    title: 'Projects & Products',
    desc: 'Stay updated about your listings and project activities',
    icon: 'grid',
    items: [
      { key: 'project-status', title: 'Project Status Updates', desc: 'When there is an update on your projects', def: p(true, false, true, true) },
      { key: 'product-views', title: 'Product Views & Enquiries', desc: 'When someone views or enquires about your products', def: p(true, false, false, true) },
      { key: 'reviews', title: 'Review & Ratings', desc: 'When you receive a new review or rating', def: p(true, false, true, true) },
      { key: 'product-approval', title: 'Product Approval', desc: 'When your product is approved or rejected', def: p(true, false, false, true) },
    ],
  },
  {
    key: 'marketing',
    title: 'Marketing & Updates',
    desc: 'Receive important platform updates and marketing information',
    icon: 'bell',
    items: [
      { key: 'membership-updates', title: 'Membership & Plan Updates', desc: 'Updates about your membership, renewal and plan benefits', def: p(true, false, false, true) },
      { key: 'promotions', title: 'Promotional Offers', desc: 'Special offers, discounts and marketing campaigns', def: p(true, false, false, true) },
      { key: 'announcements', title: 'Platform Announcements', desc: 'Important updates, new features and policy changes', def: p(true, false, false, true) },
    ],
  },
]

/** Every item key that exists, flattened — used to validate a save. */
export const ALL_ITEM_KEYS: string[] = NOTIF_GROUPS.flatMap((g) => g.items.map((i) => i.key))

/** The full default matrix, built from the catalogue. */
export const DEFAULT_PREFS: NotifPrefs = Object.fromEntries(
  NOTIF_GROUPS.flatMap((g) => g.items.map((i) => [i.key, { ...i.def }]))
)

/**
 * Merge whatever is stored (possibly null, partial, or stale) over the defaults
 * and hand back a complete, valid matrix. Unknown keys and non-boolean values
 * are dropped rather than trusted.
 */
export function resolvePrefs(stored: unknown): NotifPrefs {
  const out: NotifPrefs = Object.fromEntries(
    Object.entries(DEFAULT_PREFS).map(([k, v]) => [k, { ...v }])
  )
  if (stored && typeof stored === 'object') {
    for (const key of ALL_ITEM_KEYS) {
      const row = (stored as Record<string, unknown>)[key]
      if (row && typeof row === 'object') {
        for (const ch of CHANNELS) {
          const v = (row as Record<string, unknown>)[ch]
          if (typeof v === 'boolean') out[key][ch] = v
        }
      }
    }
  }
  return out
}
