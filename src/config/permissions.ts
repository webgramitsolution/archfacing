/**
 * ArchFacing permission matrix — PDF §7.4.1 through §7.4.6.
 *
 * The tables from the PDF live here as data, not as `if` conditions scattered
 * across the code. When the rules change, change only this file.
 *
 * ⚠️ This is also imported on the client (to hide UI), but the real enforcement
 *    always happens on the server — see `requirePermission()`.
 */

import type { Role } from '@prisma/client'

// ═══════════════════════════════════════════════════════════
//  §7.4.1 — Services vs Types of Registrants
// ═══════════════════════════════════════════════════════════

export const PERMISSIONS = {
  // ─── Posting ───
  'post:project': ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],
  'post:product': ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],
  'post:around_us': ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:artistry': ['CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:blog': ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:competition': ['CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],

  // ─── PACT (§7.4.2) ───
  'pact:buy': ['PROFESSIONAL', 'CONSULTANT', 'BMF'],

  // ─── §7.4.3 Club Membership ───
  'membership:buy': ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],

  // ─── §7.4.4 Sale of products ───
  'product:sell': ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],

  // ─── §7.4.5 Merchandise — open to everyone ───
  'merchandise:buy': [
    'CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE',
  ],

  // ─── §7.4.6 Advertisement — Corporate + External only ───
  'ad:create': ['CORPORATE', 'EXTERNAL_ADVERTISER'],

  // ─── Enquiry ───
  'enquiry:send': ['CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'enquiry:receive': ['PROFESSIONAL', 'CONSULTANT', 'BMF'],

  // ─── Portal space (§5.2.9) ───
  'portal_space:buy': ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],

  // ─── Design Associate (§3.1.7) ───
  'da:register': ['PROFESSIONAL'],

  // ─── Admin ───
  'admin:users': ['SUPER_ADMIN', 'ADMIN'],
  'admin:pact': ['SUPER_ADMIN', 'ADMIN'],
  'admin:moderate': ['SUPER_ADMIN', 'ADMIN'],
  'admin:categories': ['SUPER_ADMIN', 'ADMIN'],
  'admin:employees': ['SUPER_ADMIN'],
  'admin:payments': ['SUPER_ADMIN', 'ADMIN'],
  'admin:settings': ['SUPER_ADMIN'],
  'admin:audit': ['SUPER_ADMIN'],
  'admin:leads': ['SUPER_ADMIN', 'ADMIN'],
  'admin:reports': ['SUPER_ADMIN', 'ADMIN'],
  'admin:ads': ['SUPER_ADMIN', 'ADMIN'],
  'admin:support': ['SUPER_ADMIN', 'ADMIN'],
  'admin:plans': ['SUPER_ADMIN'],
  'admin:club': ['SUPER_ADMIN', 'ADMIN'],

  // ─── Admin-Seller — Merchandise + Podcast only ───
  'seller:merchandise': ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER'],
  'seller:podcast': ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER'],

  // ─── RM Employee ───
  'employee:leads': ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

/**
 * Admin modules a SUPER_ADMIN can grant to an individual staff account on top
 * of its role — the "Module Permissions" in the Add Employee wizard and the
 * access editor on /admin/users/[id]. Only these keys are ever honoured as
 * grants, and only for staff roles (see STAFF_ROLES), so a member account can
 * never be escalated by a stray value.
 */
export const GRANTABLE: { key: Permission; label: string; hint: string }[] = [
  { key: 'admin:users', label: 'Users & Accounts', hint: 'Professionals, corporates, students, buyers, verification' },
  { key: 'admin:leads', label: 'Leads & Enquiries', hint: 'Assign, reply, route and export leads' },
  { key: 'admin:pact', label: 'PACT Areas', hint: 'Allot, suspend and price territories' },
  { key: 'admin:moderate', label: 'Content & Moderation', hint: 'Approve projects, products, blogs and more' },
  { key: 'admin:ads', label: 'Advertisements', hint: 'Review, pause and price campaigns' },
  { key: 'admin:payments', label: 'Payments & Transactions', hint: 'Revenue, refunds and invoices' },
  { key: 'admin:reports', label: 'Reports & Activity', hint: 'Analytics, exports and the activity log' },
  { key: 'admin:support', label: 'Support Tickets', hint: 'Answer and close help requests' },
  { key: 'admin:club', label: 'Club & Events', hint: 'Events, registrations and club members' },
  { key: 'admin:categories', label: 'Categories', hint: 'Taxonomy for every post type' },
  { key: 'admin:plans', label: 'Plans & Pricing', hint: 'Membership plans and their PACT allowance' },
  { key: 'admin:employees', label: 'Employees', hint: 'Create staff and manage their access' },
  { key: 'admin:settings', label: 'Website Settings', hint: 'Contact details, commerce and platform switches' },
  { key: 'admin:audit', label: 'Security & Audit Log', hint: 'Complaints, trust and the full audit trail' },
  { key: 'seller:merchandise', label: 'Merchandise Store', hint: 'Products, orders and coupons' },
  { key: 'seller:podcast', label: 'Podcasts', hint: 'Publish podcast episodes' },
]
export const GRANTABLE_KEYS = new Set<string>(GRANTABLE.map((g) => g.key))

/**
 * Access templates — ready-made sets of admin modules for common staff jobs.
 * Used by the Add Employee wizard (?template=…), the access editor on
 * /admin/users/[id], and the Role Templates panel on /admin/role-permissions.
 */
export const ACCESS_TEMPLATES: { key: string; label: string; sub: string; keys: Permission[] }[] = [
  { key: 'rm', label: 'Relationship Manager', sub: 'Leads and PACT territories', keys: ['admin:leads', 'admin:pact'] },
  { key: 'editor', label: 'Content Editor', sub: 'Moderation and categories', keys: ['admin:moderate', 'admin:categories'] },
  { key: 'marketing', label: 'Marketing', sub: 'Ads, newsletter and reports', keys: ['admin:ads', 'admin:reports', 'admin:club'] },
  { key: 'support', label: 'Support', sub: 'Tickets and accounts', keys: ['admin:support', 'admin:users'] },
  { key: 'finance', label: 'Finance', sub: 'Payments, plans and reports', keys: ['admin:payments', 'admin:reports'] },
  { key: 'viewer', label: 'Viewer', sub: 'Reports and activity only', keys: ['admin:reports'] },
]
/** Roles whose grants are honoured. */
export const STAFF_ROLES: readonly Role[] = ['ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE']

/**
 * Can this role perform this action? `grants` are the account's extra
 * admin-module permissions (User.permissions) — additive, staff only.
 */
export function can(role: Role | undefined | null, permission: Permission, grants?: readonly string[] | null): boolean {
  if (!role) return false
  // SUPER_ADMIN has access to everything
  if (role === 'SUPER_ADMIN') return true
  if ((PERMISSIONS[permission] as readonly Role[]).includes(role)) return true
  return Boolean(grants && STAFF_ROLES.includes(role) && GRANTABLE_KEYS.has(permission) && grants.includes(permission))
}

/** Every permission granted to a given role */
export function permissionsFor(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p))
}

// ═══════════════════════════════════════════════════════════
//  PACT seat allocation — §7.4.2
//  This is the single most important business rule
// ═══════════════════════════════════════════════════════════

import { CONSULTANT_SUBCATEGORY_SLUGS } from './taxonomy'

export const PACT_SEATS_PER_PINCODE = {
  DESIGNA: 1,
  DESIGNI: 1,
  CONSULTANT: 24, // 1 for each sub-category
  BMF: 1,
  CORPORATE: 0, // PDF: "to be opened later"
} as const

/**
 * A PACT seat is uniquely identified by (pincode, serviceType, subCategory).
 * Designa/Designi/BMF have no subCategory — so we store '-' instead, which
 * keeps the database's unique constraint working correctly.
 */
export const NO_SUBCATEGORY = '-'

export function normalizeSubCategory(
  serviceType: keyof typeof PACT_SEATS_PER_PINCODE,
  subCategory?: string | null
): string {
  if (serviceType !== 'CONSULTANT') return NO_SUBCATEGORY
  if (!subCategory) {
    throw new Error('A sub-category is required for a Consultant PACT. Please select one and try again.')
  }
  if (!CONSULTANT_SUBCATEGORY_SLUGS.includes(subCategory)) {
    throw new Error(`Invalid consultant sub-category: ${subCategory}. Please choose a sub-category from the list.`)
  }
  return subCategory
}

/** Can this role purchase a PACT of this service type? */
export function canBuyPactType(
  role: Role,
  serviceType: keyof typeof PACT_SEATS_PER_PINCODE
): boolean {
  if (PACT_SEATS_PER_PINCODE[serviceType] === 0) return false
  switch (serviceType) {
    case 'DESIGNA':
    case 'DESIGNI':
      return role === 'PROFESSIONAL'
    case 'CONSULTANT':
      return role === 'CONSULTANT'
    case 'BMF':
      return role === 'BMF'
    default:
      return false
  }
}

// ═══════════════════════════════════════════════════════════
//  Upload rules — §7.10
// ═══════════════════════════════════════════════════════════

export const UPLOAD_LIMITS = {
  IMAGE: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    mimeTypes: ['image/jpeg', 'image/jpg'],
    label: 'JPG, maximum 2 MB',
    maxCount: 8, // §5.2.4.1.1.14 — Min 1, Max 8
    minCount: 1,
  },
  VIDEO: {
    maxBytes: 20 * 1024 * 1024, // 20 MB
    mimeTypes: ['video/mp4'],
    label: 'MP4, maximum 20 MB',
    maxCount: 1,
    minCount: 0,
  },
  PDF: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ['application/pdf'],
    label: 'PDF, maximum 10 MB',
    maxCount: 1,
    minCount: 0,
  },
  PPT: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    label: 'PPT, maximum 10 MB',
    maxCount: 1,
    minCount: 0,
  },
  DOCUMENT: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    label: 'MS Office, maximum 2 MB',
    maxCount: 5,
    minCount: 0,
  },
} as const

/** §7.10.1 — images must be landscape */
export const IMAGE_ASPECT = {
  default: 5 / 3, // §7.10.1
  wide: 16 / 9, // certain forms (Around Us, Competition)
  toleranceRatio: 0.12,
} as const

// ═══════════════════════════════════════════════════════════
//  Business rules — §6.1.2.2.6
// ═══════════════════════════════════════════════════════════

export const BUSINESS_RULES = {
  /**
   * §3.1.8 — how long a PACT seat is held.
   *
   * This is the contractual term: `src/lib/pact.ts` stamps expiry from it and
   * every legal page reads it through `termYears()`. Change it here and the
   * public terms follow. (The comment used to say 10 while the value was 1,
   * which is how /legal/about came to promise ten years.)
   */
  PACT_VALIDITY_YEARS: 1,
  /** How long a seat stays reserved while payment is completed */
  PACT_RESERVATION_MINUTES: 15,
  /** Renewal opens this many days before expiry (matches the first reminder). */
  PACT_RENEWAL_WINDOW_DAYS: 90,
  /** After expiry the old holder may still renew for this long — if nobody else took the seat. */
  PACT_RENEWAL_GRACE_DAYS: 30,
  /** §3.1.8.5 — cessation once this many complaints are received */
  PACT_MAX_COMPLAINTS: 5,
  /** §3.1.8.5 — after this many days with no response */
  PACT_INACTIVITY_DAYS: 30,

  /** §6.1.2.2.6 III — no refund after this window */
  REFUND_WINDOW_DAYS: 15,
  /** §6.1.2.2.6 IV — the maximum refundable share */
  REFUND_MAX_PERCENT: 25,
  /** §6.1.2.2.6 V — minimum days before settlement */
  REFUND_SETTLEMENT_DAYS: 30,

  /** §6.1.2.2.6 IX — how many years a portal space stays valid */
  PORTAL_SPACE_VALIDITY_YEARS: 5,

  /** §3.1.7.7 — 80% to the Design Associate, 20% to ArchFacing */
  DA_REVENUE_SHARE_PERCENT: 80,
  /** §3.1.7.10.1 — years of free Club Membership for a Design Associate */
  DA_FREE_CLUB_YEARS: 10,

  /** Storage granted to a new registrant on sign-up */
  FREE_STORAGE_MB: 100,
} as const

/**
 * "1 year" / "10 years" — a term read out of BUSINESS_RULES, pluralised.
 *
 * The legal pages used to hardcode "10 years" for the PACT term while
 * `PACT_VALIDITY_YEARS` was 1 and `src/lib/pact.ts` really did stamp a
 * one-year expiry, so /legal/about promised one thing and /legal/terms
 * another. Every page now reads the constant through this, which also stops
 * the grammar bug that printed "1 years".
 */
export function termYears(n: number): string {
  return `${n} year${n === 1 ? '' : 's'}`
}
