/**
 * §7.11.1.9 — the settings an admin may change from the panel.
 *
 * The `SiteSetting` table is an open key/value store, so this file is the
 * contract: only the keys listed here are shown, validated and written.
 * Anything not listed here belongs in `.env` or in `src/config/`.
 */

export type SettingKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'textarea'

export type SettingGroup = 'Contact' | 'Commerce' | 'Content' | 'Platform' | 'Social Media' | 'Verification'

export type SettingDef = {
  /** Primary key of the SiteSetting row */
  key: string
  label: string
  /** One short line shown under the field */
  help: string
  group: SettingGroup
  kind: SettingKind
  /** Used when no row exists for this key yet */
  default: string | number | boolean
  /** Blank is rejected when true */
  required?: boolean
  /** Numbers only */
  min?: number
  max?: number
}

const DEFS = [
  // ─── Contact ───
  {
    key: 'contact.supportEmail',
    label: 'Support email',
    help: 'Shown in the footer and used as the reply-to on outgoing mail.',
    group: 'Contact',
    kind: 'email',
    default: 'support@archfacing.com',
    required: true,
  },
  {
    key: 'contact.supportPhone',
    label: 'Support phone',
    help: 'Displayed on the Contact page and in the site footer.',
    group: 'Contact',
    kind: 'text',
    default: '+91 96679 87129',
    required: true,
  },
  {
    key: 'contact.officeAddress',
    label: 'Office address',
    help: 'The registered address printed on invoices and the Contact page.',
    group: 'Contact',
    kind: 'textarea',
    default: 'ArchFacing, New Delhi, India',
  },

  // ─── Social Media — PDF §6.1.2.1 / §7.11.1.10 ───
  {
    key: 'social.facebook',
    label: 'Facebook page URL',
    help: 'Linked from the footer icon. Leave blank to hide the icon.',
    group: 'Social Media',
    kind: 'text',
    default: '',
  },
  {
    key: 'social.instagram',
    label: 'Instagram profile URL',
    help: 'Linked from the footer icon. Leave blank to hide the icon.',
    group: 'Social Media',
    kind: 'text',
    default: '',
  },
  {
    key: 'social.twitter',
    label: 'X (Twitter) profile URL',
    help: 'Linked from the footer icon. Leave blank to hide the icon.',
    group: 'Social Media',
    kind: 'text',
    default: '',
  },
  {
    key: 'social.linkedin',
    label: 'LinkedIn page URL',
    help: 'Linked from the footer icon. Leave blank to hide the icon.',
    group: 'Social Media',
    kind: 'text',
    default: '',
  },

  // ─── Commerce ───
  {
    key: 'commerce.freeShippingThreshold',
    label: 'Free shipping above (₹)',
    help: 'Merchandise orders at or above this value ship free. Set 0 to switch it off.',
    group: 'Commerce',
    kind: 'number',
    default: 1500,
    required: true,
    min: 0,
    max: 1000000,
  },
  {
    key: 'commerce.defaultGstPercent',
    label: 'Default GST (%)',
    help: 'Applied when a product or service does not carry its own GST rate.',
    group: 'Commerce',
    kind: 'number',
    default: 18,
    required: true,
    min: 0,
    max: 100,
  },

  // ─── Content ───
  {
    key: 'content.postsPerPage',
    label: 'Postings per page',
    help: 'How many listings appear on a public listing page before pagination.',
    group: 'Content',
    kind: 'number',
    default: 12,
    required: true,
    min: 4,
    max: 60,
  },
  {
    key: 'content.moderateNewPosts',
    label: 'New postings need moderation',
    help: 'When on, every new posting waits in Moderation before it goes live.',
    group: 'Content',
    kind: 'boolean',
    default: true,
  },

  // ─── Platform ───
  {
    key: 'platform.tagline',
    label: 'Site tagline',
    help: 'The one-line description used in page titles and social previews.',
    group: 'Platform',
    kind: 'text',
    default: "India's B2B marketplace for the architecture industry",
    required: true,
  },
  {
    key: 'platform.announcementBanner',
    label: 'Announcement banner',
    help: 'Shown at the top of every page. Leave blank to hide the banner.',
    group: 'Platform',
    kind: 'textarea',
    default: '',
  },
  {
    key: 'platform.announcementLink',
    label: 'Announcement link',
    help: 'Optional destination for the banner above. Must be a full URL.',
    group: 'Platform',
    kind: 'url',
    default: '',
  },
  {
    key: 'platform.maintenanceMode',
    label: 'Maintenance mode',
    help: 'When on, visitors see a maintenance notice. Admins can still sign in.',
    group: 'Platform',
    kind: 'boolean',
    default: false,
  },
  // ─── Verification (read by setBuyerVerificationAction) ───
  {
    key: 'verification.approved.subject',
    label: 'Approved — title',
    help: 'Notification title a buyer sees when their verification is marked approved.',
    group: 'Verification',
    kind: 'text',
    default: 'Your account is verified',
    required: true,
  },
  {
    key: 'verification.approved.body',
    label: 'Approved — message',
    help: 'The notification text sent with it. Read by the Verification Queue actions.',
    group: 'Verification',
    kind: 'textarea',
    default: 'Your business details have been checked and your account is now verified.',
    required: true,
  },
  {
    key: 'verification.review.subject',
    label: 'Under review — title',
    help: 'Notification title a buyer sees when their verification is marked under review.',
    group: 'Verification',
    kind: 'text',
    default: 'Your verification is under review',
    required: true,
  },
  {
    key: 'verification.review.body',
    label: 'Under review — message',
    help: 'The notification text sent with it. Read by the Verification Queue actions.',
    group: 'Verification',
    kind: 'textarea',
    default: 'Our team is reviewing your documents. We will let you know once it is done.',
    required: true,
  },
  {
    key: 'verification.rejected.subject',
    label: 'Rejected — title',
    help: 'Notification title a buyer sees when their verification is marked rejected.',
    group: 'Verification',
    kind: 'text',
    default: 'Your verification was not approved',
    required: true,
  },
  {
    key: 'verification.rejected.body',
    label: 'Rejected — message',
    help: 'The notification text sent with it. Read by the Verification Queue actions.',
    group: 'Verification',
    kind: 'textarea',
    default: 'We could not verify your account from the details provided. Please update your documents and resubmit.',
    required: true,
  },
] as const satisfies readonly SettingDef[]

/** Every setting the admin panel manages, in display order */
export const SITE_SETTINGS: readonly SettingDef[] = DEFS

export type SettingKey = (typeof DEFS)[number]['key']

/** The order the groups appear in on the settings page */
export const SETTING_GROUPS: readonly SettingGroup[] = [
  'Contact',
  'Social Media',
  'Commerce',
  'Content',
  'Platform',
  'Verification',
]

export const SETTING_KEYS: string[] = SITE_SETTINGS.map((s) => s.key)

export function settingsInGroup(group: SettingGroup): SettingDef[] {
  return SITE_SETTINGS.filter((s) => s.group === group)
}

/** What a form control shows for a value — booleans become 'true' / 'false' */
export function toFormValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}
