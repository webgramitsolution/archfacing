import type { Metadata } from 'next'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AD_ROLES, bookingTotal } from '@/lib/ads'
import { INDIAN_STATES } from '@/config/states'
import { NotAnAdvertiser } from '../list-params'
import { CreateAdvertisementWizard } from './wizard'
import { EMPTY_DRAFT, type Draft, type WizardOptions } from './wizard-types'
import { spotOf } from './placement-preview'
import type { CreativePalette } from '@/lib/ad-creative'
import { platformReach } from '@/lib/platform-reach'

export const metadata: Metadata = { title: 'Create Advertisement' }
export const dynamic = 'force-dynamic'

/**
 * Step 6 of the wizard, §11 — the campaign creation flow.
 *
 * Everything the wizard offers is read here and handed down: the ad types, the
 * placements with their real prices, the packages, the category taxonomies.
 * The client component chooses among them; it never invents one.
 *
 * `?draft=<id>` resumes a campaign. The draft is loaded by id AND by
 * `advertiserId`, so a guessed id returns nothing rather than someone else's
 * campaign.
 */
export default async function CreateAdvertisementPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const { draft: draftId } = await searchParams

  const corporate = await prisma.corporateProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true, companyLogo: true },
  })

  const [types, placements, packages, productCats, projectCats, existing] = await Promise.all([
    prisma.adType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true, description: true, icon: true },
    }),
    prisma.adPlacement.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.adPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    }),
    prisma.category.findMany({
      where: { type: 'PRODUCT', isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true },
      take: 40,
    }),
    prisma.category.findMany({
      where: { type: 'PROJECT', isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true },
      take: 40,
    }),
    draftId
      ? prisma.adBooking.findFirst({
          where: { id: draftId, advertiserId: user.id },
          include: {
            adType: { select: { slug: true } },
            placement: { select: { slug: true } },
            package: { select: { slug: true } },
            targeting: true,
            extraPlacements: { select: { placement: { select: { slug: true } } } },
          },
        })
      : null,
  ])

  /**
   * The page a placement belongs to, for the tab strip on step 3.
   *
   * Derived from the slug rather than stored, because the slug is already the
   * thing that says where the placement lives — a second column would be one
   * more place for the two to disagree.
   */
  const pageOf = (slug: string): string => {
    if (slug.startsWith('home')) return 'Homepage'
    if (slug.startsWith('products') || slug.startsWith('merchandise')) return 'Products'
    if (slug.startsWith('projects')) return 'Projects'
    if (slug.startsWith('blog')) return 'Blog'
    if (slug.startsWith('around-us')) return 'Around Us'
    return 'Others'
  }

  /**
   * The one-line claim on a placement card.
   *
   * Derived from what the placement IS — its page and its weekly rate — rather
   * than stored, so a new placement gets a sensible line without anyone having
   * to write one, and a re-priced placement's claim moves with it.
   */
  const tagFor = (slug: string, weekly: number): string => {
    if (slug.includes('hero')) return 'Premium Placement'
    if (slug.includes('search')) return 'High Intent Users'
    if (slug.includes('consult')) return 'High Intent Users'
    if (slug.includes('sidebar')) return 'Category Targeted'
    if (slug.includes('blog') || slug.includes('artistry')) return 'Content Audience'
    if (slug.includes('around-us') || slug.includes('pact')) return 'Local Reach'
    if (slug.includes('mobile')) return 'In-App Audience'
    return weekly >= 7_000 ? 'High Visibility' : 'Brand Exposure'
  }

  const options: WizardOptions = {
    adTypes: types,
    placements: placements.map((p) => ({
      slug: p.slug,
      name: p.name,
      size: p.size.replace('x', ' × '),
      page: pageOf(p.slug),
      // The price shown is what one week actually costs, GST included — the
      // same figure `createBooking` charges, not a headline rate.
      price: Math.round(bookingTotal(p, 1).total),
      note: `${p.maxSlots} slot${p.maxSlots === 1 ? '' : 's'} · ${p.description?.split('.')[0] ?? 'Premium placement'}`,
      spot: spotOf(p.slug),
      tag: tagFor(p.slug, Number(p.weeklyPrice)),
      device: p.slug.includes('mobile') ? ('Mobile' as const) : ('Desktop' as const),
    })),
    packages: packages.map((p) => ({
      slug: p.slug,
      name: p.name,
      durationLabel: p.durationLabel,
      durationDays: p.durationDays,
      price: Number(p.price),
      taxPercent: Number(p.taxPercent),
      perLabel: p.perLabel,
      features: p.features,
      isPopular: p.isPopular,
    })),
    categories: {
      product: productCats,
      project: projectCats,
      // §4.1.3–4.1.5 — the professional groups, as the directory names them.
      professional: [
        { slug: 'designa', name: 'Architects (Designa)' },
        { slug: 'designi', name: 'Interior Designers (Designi)' },
        { slug: 'engineering', name: 'Engineering Consultants' },
        { slug: 'real-estate', name: 'Real Estate Consultants' },
        { slug: 'financial', name: 'Financial Consultants' },
        { slug: 'indian-traditional', name: 'Indian Traditional Consultants' },
        { slug: 'bmf', name: 'Building Material Facilitators' },
      ],
    },
    states: [...INDIAN_STATES],
    // The businesses this account may advertise for. A Corporate account has
    // its company; anyone else advertises under their own name.
    brands: [
      {
        name: corporate?.companyName ?? user.name,
        logo: corporate?.companyLogo ?? null,
      },
    ],
  }

  // ─── hydrate ───
  const initial: Draft = existing
    ? {
        id: existing.id,
        title: existing.title,
        brandName: existing.brandName ?? corporate?.companyName ?? user.name,
        description: existing.description ?? '',
        adTypeSlug: existing.adType?.slug ?? '',
        objective: existing.objective ?? 'Brand Awareness',
        imageUrl: existing.imageUrl ?? '',
        imageKey: existing.imageKey ?? '',
        // The stored measurements. `Json` comes back as `unknown`, and
        // `paletteOf` is the only thing that reads it — it validates every
        // field and falls back, so a hand-edited or older row cannot break a
        // preview.
        imageWidth: existing.imageWidth ?? null,
        imageHeight: existing.imageHeight ?? null,
        imagePalette: (existing.imagePalette as CreativePalette | null) ?? null,
        mobileImageUrl: existing.mobileImageUrl ?? '',
        mobileImageWidth: existing.mobileImageWidth ?? null,
        mobileImageHeight: existing.mobileImageHeight ?? null,
        mobileImagePalette: (existing.mobileImagePalette as CreativePalette | null) ?? null,
        logoUrl: existing.logoUrl ?? '',
        headline: existing.headline ?? '',
        tagline: existing.tagline ?? '',
        ctaText: existing.ctaText ?? '',
        targetUrl: existing.targetUrl ?? '',
        placementSlugs: [
          ...(existing.placement ? [existing.placement.slug] : []),
          ...existing.extraPlacements.map((e) => e.placement.slug),
        ],
        country: existing.targeting?.country ?? 'India',
        states: existing.targeting?.states ?? [],
        cities: existing.targeting?.cities ?? [],
        pincodes: existing.targeting?.pincodes ?? [],
        pactAreas: existing.targeting?.pactAreas ?? [],
        productCategories: existing.targeting?.productCategories ?? [],
        projectCategories: existing.targeting?.projectCategories ?? [],
        professionalCategories: existing.targeting?.professionalCategories ?? [],
        audienceRoles: existing.targeting?.audienceRoles ?? [],
        startsAt: existing.startsAt ? existing.startsAt.toISOString().slice(0, 10) : '',
        endsAt: existing.endsAt ? existing.endsAt.toISOString().slice(0, 10) : '',
        startTime: existing.startTime ?? '',
        endTime: existing.endTime ?? '',
        packageSlug: existing.package?.slug ?? '',
      }
    : { ...EMPTY_DRAFT, brandName: corporate?.companyName ?? user.name }

  // Open on the first unfinished step, so resuming a draft does not make the
  // reader click through five steps they already did.
  const startAt = existing
    ? !initial.adTypeSlug ? 1
      : !initial.imageUrl || !initial.headline ? 2
      : initial.placementSlugs.length === 0 ? 3
      : initial.audienceRoles.length === 0 ? 4
      : !initial.startsAt || !initial.endsAt ? 5
      : !initial.packageSlug ? 6
      : 7
    : 1

  const reach = await platformReach()

  return <CreateAdvertisementWizard initial={initial} options={options} startAt={startAt} reach={reach} />
}
