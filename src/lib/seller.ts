/**
 * Sellers — the accounts that have a public storefront.
 *
 * A storefront belongs to anyone who trades on ArchFacing under a name of
 * their own: a Corporate's company, a professional's firm, a BMF's business.
 * That is a wider set than the Design Associates, and deliberately so — a
 * Corporate that publishes products has a brand a client will want to look
 * up, whether or not it holds a PACT.
 *
 * `design-associates.ts` stays the authority on who is a Design Associate
 * (§3.1.7 — DESIGNA/DESIGNI, a PACT, an approved registration). This file
 * answers a different and simpler question: whose name is over the door.
 *
 * Nothing here duplicates content. A storefront reads the same `Post` rows,
 * found by `authorId`, that the account's dashboard writes.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { isUsableSellerSlug, toSellerSlug } from '@/config/reserved-slugs'

/** The brand a user trades under, or null when they have none. */
export function brandNameOf(u: {
  name: string
  corporateProfile?: { companyName: string } | null
  professionalProfile?: { firmName: string | null } | null
  bmfProfile?: { businessName?: string | null } | null
}): string | null {
  return (
    u.corporateProfile?.companyName?.trim() ||
    u.professionalProfile?.firmName?.trim() ||
    u.bmfProfile?.businessName?.trim() ||
    null
  )
}

/**
 * The slug an account should have, given its brand.
 *
 * Returns null when there is no brand to build one from, or when the obvious
 * slug is reserved — see `config/reserved-slugs.ts` for why a seller must
 * never be able to claim `products`.
 */
export function intendedSlug(brand: string | null): string | null {
  if (!brand) return null
  const slug = toSellerSlug(brand)
  return isUsableSellerSlug(slug) ? slug : null
}

/** Only accounts that can actually be visited. */
export function sellerWhere(): Prisma.UserWhereInput {
  return { sellerSlug: { not: null }, status: 'ACTIVE', deletedAt: null }
}

const SELLER_SELECT = {
  id: true,
  name: true,
  sellerSlug: true,
  city: true,
  state: true,
  role: true,
  profilePhoto: true,
  logo: true,
  createdAt: true,
  facebookUrl: true,
  instagramUrl: true,
  linkedinUrl: true,
  professionalProfile: {
    select: {
      designaType: true, tier: true, firmName: true, experience: true,
      bio: true, categories: true, isVerified: true, coaNumber: true, coaVerified: true,
    },
  },
  corporateProfile: {
    select: {
      companyName: true, gstNumber: true, website: true,
      companyLogo: true, isVerified: true,
    },
  },
  designAssociate: { select: { slug: true, kycVerified: true, approvedAt: true } },
  memberships: {
    where: { expiresAt: { gt: new Date() } },
    select: { planName: true, expiresAt: true, isFree: true },
    orderBy: { expiresAt: 'desc' as const },
    take: 1,
  },
  pacts: {
    where: { status: 'ACTIVE' as const },
    select: { pincode: true, city: true, state: true, serviceType: true },
    orderBy: { purchasedAt: 'asc' as const },
  },
} satisfies Prisma.UserSelect

export type SellerRow = Prisma.UserGetPayload<{ select: typeof SELLER_SELECT }>

/** One seller by their public address. `null` when the slug names nobody. */
export async function getSeller(slug: string): Promise<SellerRow | null> {
  if (!isUsableSellerSlug(slug)) return null
  return prisma.user.findFirst({
    where: { ...sellerWhere(), sellerSlug: slug },
    select: SELLER_SELECT,
  })
}

/**
 * The storefront address for a post's author, for the "View Seller Profile"
 * button on every detail page.
 *
 * Returns null when the author has no brand — an admin post, a client's
 * enquiry — and the caller then leaves the button pointing at the directory
 * rather than at a page that does not exist.
 */
export async function sellerHrefFor(userId: string): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: { id: userId, ...sellerWhere() },
    select: { sellerSlug: true },
  })
  return u?.sellerSlug ? `/${u.sellerSlug}` : null
}

/** Every storefront address, for `generateStaticParams` and the sitemap. */
export async function sellerSlugs(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: sellerWhere(),
    select: { sellerSlug: true },
  })
  return rows.map((r) => r.sellerSlug!).filter(Boolean)
}

// ═══════════════════════════════════════════════════════════
//  The storefront banner
// ═══════════════════════════════════════════════════════════

/**
 * The pictures in a seller's banner slider.
 *
 * ★ THIS IS THE ONE PLACE THE BANNER'S SOURCE IS DECIDED.
 *
 *   The client has asked for banner images that the seller uploads on their
 *   profile, and the shape of that profile field is still being specified.
 *   Rather than invent a column now and migrate it again when the real
 *   structure arrives, the resolver lives here on its own: when the field is
 *   defined, this function reads it and nothing else in the app changes —
 *   not the slider, not the page, not the layout.
 *
 *   Until then it falls back to the seller's own published photography, which
 *   is real and theirs, so the band is never empty or filled with stock.
 *
 * `take` is capped because a slider nobody will sit through is not a slider.
 */
export async function storefrontBanners(userId: string, take = 5): Promise<string[]> {
  // ── when the profile field lands, read it here and return early ──

  const posts = await prisma.post.findMany({
    where: { authorId: userId, status: 'PUBLISHED', deletedAt: null, media: { some: {} } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 12,
    select: { media: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 2 } },
  })

  // Deduplicated: the same photograph on two posts should not appear twice.
  return [...new Set(posts.flatMap((p) => p.media.map((m) => m.url)))].slice(0, take)
}
