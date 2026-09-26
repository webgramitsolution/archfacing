/**
 * Designers Associates — the public read side.
 *
 * `design-associate.ts` (singular) owns becoming one: the PDF's §3.1.7 rules,
 * KYC, the 80/20 share, invoices. This file owns *showing* one, and it is
 * deliberately read-only.
 *
 * ★ What a Design Associate IS, in the PDF's own words (§3.1.7.1):
 *
 *   "Design Associates are those Professionals who get themselves registered
 *    for the Particular PACT by buying PACT Franchise and opted for DA in
 *    working with Archfacing. These professionals will belongs to DESIGNA AND
 *    DESIGNI only."
 *
 *   So a DA is not a new kind of account and has no profile of its own. It is
 *   a DESIGNA/DESIGNI professional who additionally registered (§3.1.3:
 *   "These professional will also serve the need of Design Associates if
 *   additionally registered as Design Associates").
 *
 * ★ Therefore there is no DA content anywhere. Every project, product,
 *   artistry piece, Around Us entry and blog on an associate's page is the
 *   SAME `Post` row their dashboard writes, found by `authorId`. Nothing here
 *   copies, caches or mirrors it — change a project in the dashboard and the
 *   public page changes, because they are one row.
 */

import { Prisma, type PostType } from '@prisma/client'
import { prisma } from './prisma'
import { badgeTones, type BadgeTone } from '@/lib/verified'

// ═══════════════════════════════════════════════════════════
//  Who appears
// ═══════════════════════════════════════════════════════════

/**
 * The one eligibility rule, written once.
 *
 * Every list, count and lookup in this file goes through it, so the directory
 * and the profile page can never disagree about who is a Design Associate.
 *
 *  · `designAssociate.approvedAt` — the registration itself (§3.1.7.1)
 *  · `role: PROFESSIONAL` + a professional profile — DESIGNA/DESIGNI only
 *  · an ACTIVE Pact — "registered for the Particular PACT" (§3.1.7.2)
 *  · not deleted, and the account is live
 */
/**
 * Who has a storefront.
 *
 * Wider than `associateWhere()` on purpose. A Design Associate is a specific
 * §3.1.7 registration; a *seller* is anyone trading under a name — a
 * Corporate, a BMF, a professional with a firm. Both get a shopfront, and the
 * page shows the DESIGNA / Design Associate badges only to those who have
 * actually earned them.
 */
export function storefrontWhere(): Prisma.UserWhereInput {
  return { sellerSlug: { not: null }, status: 'ACTIVE', deletedAt: null }
}

export function associateWhere(): Prisma.UserWhereInput {
  return {
    role: 'PROFESSIONAL',
    status: 'ACTIVE',
    deletedAt: null,
    professionalProfile: { isNot: null },
    designAssociate: { approvedAt: { not: null }, slug: { not: null } },
    pacts: { some: { status: 'ACTIVE' } },
  }
}

/** The columns every associate card and header needs. */
const ASSOCIATE_SELECT = {
  id: true,
  name: true,
  sellerSlug: true,
  city: true,
  state: true,
  pincode: true,
  profilePhoto: true,
  logo: true,
  createdAt: true,
  facebookUrl: true,
  instagramUrl: true,
  linkedinUrl: true,
  twitterUrl: true,
  youtubeUrl: true,
  professionalProfile: {
    select: {
      designaType: true,
      tier: true,
      firmName: true,
      experience: true,
      bio: true,
      categories: true,
      isVerified: true,
      coaNumber: true,
      coaVerified: true,
    },
  },
  designAssociate: {
    select: { slug: true, daCode: true, kycVerified: true, approvedAt: true },
  },
  /*
   * The company behind the storefront.
   *
   * A professional who only publishes projects needs nothing more than their
   * personal profile. One who wants to SELL products has to register the
   * business too — company name, GST, PAN — because that is who the invoice
   * comes from. That record already exists as `CorporateProfile`, with
   * exactly those fields, so a selling professional fills the same row a
   * Corporate does rather than a second, parallel one.
   *
   * (Not in the 2020 PDF — a later requirement from the client.)
   */
  corporateProfile: {
    select: {
      companyName: true,
      gstNumber: true,
      website: true,
      companyLogo: true,
      isVerified: true,
    },
  },
  /*
   * §3.1.7.10.1 — a Design Associate gets ten years of Club membership free,
   * and the storefront's top bar says so. Only the live one is read.
   */
  memberships: {
    where: { expiresAt: { gt: new Date() } },
    select: { planName: true, expiresAt: true, isFree: true },
    orderBy: { expiresAt: 'desc' as const },
    take: 1,
  },
  pacts: {
    where: { status: 'ACTIVE' as const },
    select: { pincode: true, city: true, state: true, serviceType: true, expiresAt: true },
    orderBy: { purchasedAt: 'asc' as const },
  },
} satisfies Prisma.UserSelect

export type AssociateRow = Prisma.UserGetPayload<{ select: typeof ASSOCIATE_SELECT }>

/** The public shape — flattened, so a component never reaches through three relations. */
export type Associate = {
  id: string
  slug: string
  name: string
  firmName: string | null
  /** "DESIGNA" | "DESIGNI" — the PDF's own classification (§3.1.3). */
  /** Null for a seller who is not a DESIGNA/DESIGNI professional. */
  designaType: 'DESIGNA' | 'DESIGNI' | null
  /** Professional · Legend · Innovator · Student (§4.2.1). */
  tier: string | null
  discipline: string | null
  bio: string | null
  categories: string[]
  experience: number | null
  location: string
  pincode: string | null
  photo: string | null
  logo: string | null
  isVerified: boolean
  badgeTone: BadgeTone | null
  /** True only for an approved Design Associate — §3.1.7. */
  isDesignAssociate: boolean
  kycVerified: boolean
  coaNumber: string | null
  memberSince: Date
  pacts: { pincode: string; city: string | null; state: string; serviceType: string }[]
  links: { facebook: string | null; instagram: string | null; linkedin: string | null }
  membership: { planName: string; expiresAt: Date; isFree: boolean } | null
  /**
   * Set once the business is registered. `null` means this associate can
   * publish work but is not set up to sell products — the storefront says so
   * rather than showing an empty shop.
   */
  company: {
    name: string
    gstNumber: string
    website: string | null
    isVerified: boolean
  } | null
  counts: Record<'projects' | 'products' | 'artistry' | 'aroundUs' | 'blogs', number>
}

/** DESIGNA is architecture, DESIGNI is interior — §2 of the PDF. */
export function disciplineOf(t: 'DESIGNA' | 'DESIGNI'): string {
  return t === 'DESIGNA' ? 'Architecture' : 'Interior Design'
}

/** "Professional" from PROFESSIONAL, "Legend" from LEGEND — §4.2.1. */
export function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase()
}

// ═══════════════════════════════════════════════════════════
//  Their content — one query shape, five kinds
// ═══════════════════════════════════════════════════════════

/** The post types an associate's public page can show, in tab order. */
export const ASSOCIATE_SECTIONS = [
  { key: 'projects', type: 'PROJECT', label: 'Projects', href: '/projects' },
  { key: 'products', type: 'PRODUCT', label: 'Products', href: '/products' },
  { key: 'artistry', type: 'ARTISTRY', label: 'Artistry', href: '/artistry' },
  { key: 'aroundUs', type: 'AROUND_US', label: 'Around Us', href: '/around-us' },
  { key: 'blogs', type: 'BLOG', label: 'Blogs', href: '/blog' },
] as const satisfies readonly {
  key: keyof Associate['counts']
  type: PostType
  label: string
  href: string
}[]

export type SectionKey = (typeof ASSOCIATE_SECTIONS)[number]['key']

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  city: true,
  state: true,
  year: true,

  publishedAt: true,
  type: true,
  // Every image, not just the cover: the associate page's gallery band shows
  // all of them, and the cards simply take `media[0]`.
  media: { select: { url: true }, orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.PostSelect

export type ContentCard = Prisma.PostGetPayload<{ select: typeof CARD_SELECT }>

/**
 * Only what this author published.
 *
 * `authorId` is the whole relationship — the same column the dashboard writes
 * and `@@index([authorId, type])` already covers. There is no join table and
 * no DA-side copy, which is what makes it impossible for one associate's page
 * to show another's work.
 */
export async function associateContent(
  userId: string,
  type: PostType,
  take = 8
): Promise<ContentCard[]> {
  return prisma.post.findMany({
    where: { authorId: userId, type, status: 'PUBLISHED', deletedAt: null },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take,
    select: CARD_SELECT,
  })
}

/** How much of each kind they have — drives the tabs and the stat row. */
async function contentCounts(userId: string): Promise<Associate['counts']> {
  const rows = await prisma.post.groupBy({
    by: ['type'],
    where: { authorId: userId, status: 'PUBLISHED', deletedAt: null },
    _count: true,
  })

  const byType = new Map(rows.map((r) => [r.type, r._count]))
  return {
    projects: byType.get('PROJECT') ?? 0,
    products: byType.get('PRODUCT') ?? 0,
    artistry: byType.get('ARTISTRY') ?? 0,
    aroundUs: byType.get('AROUND_US') ?? 0,
    blogs: byType.get('BLOG') ?? 0,
  }
}

// ═══════════════════════════════════════════════════════════
//  Reading them
// ═══════════════════════════════════════════════════════════

function toAssociate(u: AssociateRow, counts: Associate['counts'], tone: BadgeTone | null): Associate {
  /*
   * Both may be absent: a Corporate seller has no professional profile and no
   * DA registration, and its storefront is none the worse for it — the
   * DESIGNA badge and the PACT panel simply do not appear.
   */
  const p = u.professionalProfile
  const da = u.designAssociate

  return {
    id: u.id,
    // The public address. `sellerSlug` is the canonical one; the DA slug is
    // kept as a fallback for rows assigned before sellers were generalised.
    slug: u.sellerSlug ?? da?.slug ?? '',
    name: u.name,
    firmName: p?.firmName ?? u.corporateProfile?.companyName ?? null,
    designaType: (p?.designaType as 'DESIGNA' | 'DESIGNI') ?? null,
    tier: p?.tier ?? null,
    discipline: p ? disciplineOf(p.designaType as 'DESIGNA' | 'DESIGNI') : null,
    bio: p?.bio ?? null,
    categories: p?.categories ?? [],
    experience: p?.experience ?? null,
    location: [u.city, u.state].filter(Boolean).join(', '),
    pincode: u.pincode,
    photo: u.profilePhoto,
    logo: u.logo,
    // Blue tick = an active PACT holder (lib/verified.ts).
    isVerified: tone !== null,
    badgeTone: tone,
    isDesignAssociate: Boolean(da?.approvedAt),
    kycVerified: da?.kycVerified ?? false,
    coaNumber: p?.coaVerified ? p.coaNumber : null,
    memberSince: u.createdAt,
    pacts: u.pacts.map((x) => ({
      pincode: x.pincode,
      city: x.city,
      state: x.state,
      serviceType: x.serviceType,
    })),
    links: {
      facebook: u.facebookUrl,
      instagram: u.instagramUrl,
      linkedin: u.linkedinUrl,
    },
    membership: u.memberships[0] ?? null,
    company: u.corporateProfile
      ? {
          name: u.corporateProfile.companyName,
          gstNumber: u.corporateProfile.gstNumber,
          website: u.corporateProfile.website,
          isVerified: u.corporateProfile.isVerified,
        }
      : null,
    counts,
  }
}

export type AssociateFilters = {
  q?: string
  /** "DESIGNA" | "DESIGNI" */
  designaType?: string
  tier?: string
  state?: string
  /** A PACT PIN code — §3.1.7.2, an associate is registered for a territory. */
  pincode?: string
  take?: number
  skip?: number
}

/** The directory. */
export async function listAssociates(
  f: AssociateFilters = {}
): Promise<{ rows: Associate[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    ...associateWhere(),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: 'insensitive' } },
            { city: { contains: f.q, mode: 'insensitive' } },
            { professionalProfile: { firmName: { contains: f.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(f.designaType
      ? { professionalProfile: { is: { designaType: f.designaType as 'DESIGNA' } } }
      : {}),
    ...(f.tier ? { professionalProfile: { is: { tier: f.tier as 'PROFESSIONAL' } } } : {}),
    ...(f.state ? { state: f.state } : {}),
    // A PIN filter asks "who holds the PACT here", which is the question the
    // locator on the directory is for.
    ...(f.pincode ? { pacts: { some: { status: 'ACTIVE', pincode: f.pincode } } } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ professionalProfile: { tier: 'asc' } }, { name: 'asc' }],
      take: f.take ?? 24,
      skip: f.skip ?? 0,
      select: ASSOCIATE_SELECT,
    }),
    prisma.user.count({ where }),
  ])

  const tones = await badgeTones(users.map((u) => u.id))
  const rows = await Promise.all(
    users.map(async (u) => toAssociate(u, await contentCounts(u.id), tones.get(u.id) ?? null))
  )

  return { rows, total }
}

/** One associate, by their public slug. `null` when the slug names nobody eligible. */
export async function getAssociate(slug: string): Promise<Associate | null> {
  const u = await prisma.user.findFirst({
    where: {
      ...storefrontWhere(),
      // Either address resolves, so links shared before sellers were
      // generalised keep working.
      OR: [{ sellerSlug: slug }, { designAssociate: { slug } }],
    },
    select: ASSOCIATE_SELECT,
  })
  if (!u) return null
  return toAssociate(u, await contentCounts(u.id), (await badgeTones([u.id])).get(u.id) ?? null)
}

/** Every slug, for `generateStaticParams` and the sitemap. */
export async function associateSlugs(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: associateWhere(),
    select: { designAssociate: { select: { slug: true } } },
  })
  return rows.map((r) => r.designAssociate!.slug!).filter(Boolean)
}

/** The facets the directory filters by, built from who is actually listed. */
export async function associateFacets() {
  const rows = await prisma.user.findMany({
    where: associateWhere(),
    select: {
      state: true,
      professionalProfile: { select: { designaType: true, tier: true } },
    },
  })

  const count = <T extends string>(values: (T | null)[]) => {
    const m = new Map<T, number>()
    for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }

  return {
    total: rows.length,
    designaTypes: count(rows.map((r) => r.professionalProfile?.designaType ?? null)),
    tiers: count(rows.map((r) => r.professionalProfile?.tier ?? null)),
    states: count(rows.map((r) => r.state)),
  }
}
