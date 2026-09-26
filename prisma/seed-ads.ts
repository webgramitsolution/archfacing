/**
 * Advertisement marketplace — demo data (§28).
 *
 * ⚠️ Everything this script writes is SEED/DEMO data. The four brands below
 *    are written as ordinary advertiser accounts with ordinary campaigns —
 *    exactly the rows an advertiser would produce by booking through the
 *    dashboard. Nothing about them is special-cased anywhere in the app, which
 *    is the point: remove an advertiser from its featured slot in the admin panel and
 *    the public page stops showing them, with no code change.
 *
 *   pnpm db:ads
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
//  Categories — §17
// ═══════════════════════════════════════════════════════════

const CATEGORIES = [
  { slug: 'building-materials', name: 'Building Materials', icon: 'box', sortOrder: 1 },
  { slug: 'interior-products', name: 'Interior Products', icon: 'sofa', sortOrder: 2 },
  { slug: 'architectural-services', name: 'Architectural Services', icon: 'building', sortOrder: 3 },
  { slug: 'construction', name: 'Construction', icon: 'home', sortOrder: 4 },
  { slug: 'home-decor', name: 'Home Decor', icon: 'lamp', sortOrder: 5 },
  { slug: 'furniture-fixtures', name: 'Furniture & Fixtures', icon: 'chair', sortOrder: 6 },
  { slug: 'sanitary-bath', name: 'Sanitary & Bath', icon: 'tap', sortOrder: 7 },
]

// ═══════════════════════════════════════════════════════════
//  Packages — §11 step 6
// ═══════════════════════════════════════════════════════════

const PACKAGES = [
  {
    slug: 'starter', name: 'Starter', durationLabel: '1 Day', durationDays: 1,
    price: 999, perLabel: '/day', sortOrder: 1,
    features: ['1 Ad Slot', '10,000 Impressions', 'Basic Analytics', 'Email Support'],
  },
  {
    slug: 'basic', name: 'Basic', durationLabel: '7 Days', durationDays: 7,
    price: 4999, perLabel: '/7 days', sortOrder: 2,
    features: ['1 Premium Slot', '50,000 Impressions', 'Lead Generation', 'Priority Support'],
  },
  {
    slug: 'standard', name: 'Standard', durationLabel: '30 Days', durationDays: 30,
    price: 15999, perLabel: '/30 days', sortOrder: 3, isPopular: true,
    features: [
      '3 Premium Slots', '250,000 Impressions', 'Lead Generation',
      'Detailed Analytics', 'Priority Support',
    ],
  },
  {
    slug: 'premium', name: 'Premium', durationLabel: '90 Days', durationDays: 90,
    price: 39999, perLabel: '/90 days', sortOrder: 4,
    features: [
      '5 Premium Slots', '750,000 Impressions', 'Lead Generation',
      'Detailed Analytics', 'Account Manager',
    ],
  },
  {
    /*
     * Retired — the plan table sells four rungs, not five.
     *
     * Kept in the seed with `isActive: false` rather than deleted: a booking
     * may already point at this row, and a delete would either fail on the
     * foreign key or take that campaign's package with it. Both queries that
     * build the plan table filter on `isActive`, so an inactive package
     * simply stops being offered — see `create/page.tsx` and
     * `lib/ad-marketplace.ts`. Re-running the seed retires it again.
     */
    slug: 'elite', name: 'Elite', durationLabel: '180 Days', durationDays: 180,
    price: 69999, perLabel: '/180 days', sortOrder: 5, isActive: false,
    features: [
      'All Premium Slots', '2,000,000 Impressions', 'Lead Generation',
      'Advanced Analytics', 'Dedicated Manager',
    ],
  },
]

// ═══════════════════════════════════════════════════════════
//  Placement icons — §3 keeps the nine shelves the design shows
// ═══════════════════════════════════════════════════════════

const PLACEMENT_ICONS: Record<string, string> = {
  'home-hero': 'monitor',
  'projects-listing': 'building',
  'products-sidebar': 'box',
  'consult-nearby': 'map',
  'blog-inline': 'file',
  'merchandise-strip': 'cart',
  'around-us': 'globe',
  'artistry-gallery': 'image',
  'design-competition': 'trophy',
  'mobile-app': 'mobile',
}

/** The three shelves the design names that the original six placements lacked. */
const EXTRA_PLACEMENTS = [
  {
    slug: 'around-us', name: 'Around Us',
    description: 'Beside the Around Us feed, where the industry reads its own news.',
    size: '970x250', weeklyPrice: 5000, maxSlots: 3, sortOrder: 7,
  },
  {
    slug: 'artistry-gallery', name: 'Artistry Gallery',
    description: 'Inside the Artistry gallery, between rows of artwork.',
    size: '728x90', weeklyPrice: 3000, maxSlots: 4, sortOrder: 8,
  },
  {
    slug: 'design-competition', name: 'Design Competition',
    description: 'On the Design Competition pages while a brief is open for entries.',
    size: '1200x250', weeklyPrice: 6500, maxSlots: 2, sortOrder: 9,
  },
  {
    slug: 'mobile-app', name: 'Mobile App',
    description: 'In-app placement on the ArchFacing mobile application.',
    size: '640x200', weeklyPrice: 8000, maxSlots: 3, sortOrder: 10,
  },
]

// ═══════════════════════════════════════════════════════════
//  The four demo campaigns — §28
// ═══════════════════════════════════════════════════════════

const DEMO = [
  {
    email: 'demo.terracotta@archfacing.test',
    company: 'Terracotta Ceramics India',
    gst: '07AAACK1234A1Z1',
    pan: 'AAACK1234A',
    website: 'https://example.com',
    campaign: 'Terracotta Festive Campaign',
    tagline: 'Surfaces that last a generation',
    headline: 'Large-format tiles, made in India',
    description: 'Vitrified tiles, marble and sanitaryware.',
    image: '/img/ads/preview-desktop.jpg',
    category: 'building-materials',
    package: 'standard',
    placement: 'home-hero',
    impressions: 18_400,
    clicks: 842,
  },
  {
    email: 'demo.chromaline@archfacing.test',
    company: 'Chromaline Paints',
    gst: '27AAACA5678B1Z2',
    pan: 'AAACA5678B',
    website: 'https://example.com',
    campaign: 'Chromaline Colour Campaign',
    tagline: 'Colour, considered',
    headline: 'Finishes that hold their tone',
    description: 'Interior and exterior coatings.',
    image: '/img/ads/preview-desktop.jpg',
    category: 'home-decor',
    package: 'premium',
    placement: 'projects-listing',
    impressions: 15_900,
    clicks: 611,
  },
  {
    email: 'demo.fittwell@archfacing.test',
    company: 'Fittwell Hardware Systems',
    gst: '27AAACH9012C1Z3',
    pan: 'AAACH9012C',
    website: 'https://example.com',
    campaign: 'Fittwell Hardware Campaign',
    tagline: 'Hardware that earns its space',
    headline: 'Fittings for modular interiors',
    description: 'Architectural hardware and fittings.',
    image: '/img/ads/preview-desktop.jpg',
    category: 'furniture-fixtures',
    package: 'standard',
    placement: 'products-sidebar',
    impressions: 12_250,
    clicks: 498,
  },
  {
    email: 'demo.bedrock@archfacing.test',
    company: 'Bedrock Cement & Concrete',
    gst: '27AAACU3456D1Z4',
    pan: 'AAACU3456D',
    website: 'https://example.com',
    campaign: 'Bedrock Cement Campaign',
    tagline: 'Built to hold',
    headline: 'Grade-53 OPC and ready-mix',
    description: 'Cement and ready mix concrete.',
    image: '/img/ads/preview-desktop.jpg',
    category: 'construction',
    package: 'elite',
    placement: 'consult-nearby',
    impressions: 21_700,
    clicks: 930,
  },
]

async function main() {
  console.log('\n── Advertisement categories ──')
  for (const c of CATEGORIES) {
    await prisma.adCategory.upsert({ where: { slug: c.slug }, create: c, update: c })
    console.log(`  ✓ ${c.name}`)
  }

  console.log('\n── Advertisement packages ──')
  for (const p of PACKAGES) {
    const data = { ...p, price: new Prisma.Decimal(p.price) }
    await prisma.adPackage.upsert({ where: { slug: p.slug }, create: data, update: data })
    console.log(`  ✓ ${p.name.padEnd(9)} ${p.durationLabel.padEnd(9)} ₹${p.price.toLocaleString('en-IN')}`)
  }

  console.log('\n── Placements ──')
  for (const p of EXTRA_PLACEMENTS) {
    const { slug, weeklyPrice, ...rest } = p
    const data = { ...rest, weeklyPrice: new Prisma.Decimal(weeklyPrice) }
    await prisma.adPlacement.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    })
    console.log(`  ✓ ${p.name}`)
  }
  // Give every placement the mark its tile draws.
  for (const [slug, icon] of Object.entries(PLACEMENT_ICONS)) {
    await prisma.adPlacement.updateMany({ where: { slug }, data: { icon } })
  }

  console.log('\n── Demo advertisers and campaigns ──')

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 7) // already running for a week
  const end = new Date(start)
  end.setDate(end.getDate() + 90)

  const bookingIds: string[] = []

  for (const d of DEMO) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      create: {
        email: d.email,
        name: d.company,
        role: 'CORPORATE',
        status: 'ACTIVE',
        emailVerified: new Date(),
        city: 'New Delhi',
        state: 'Delhi',
      },
      update: { status: 'ACTIVE', name: d.company },
    })

    await prisma.corporateProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: d.company,
        gstNumber: d.gst,
        panNumber: d.pan,
        website: d.website,
        isVerified: true,
        productCategories: [d.category],
      },
      update: { companyName: d.company, website: d.website, isVerified: true },
    })

    const [placement, category, pkg] = await Promise.all([
      prisma.adPlacement.findUnique({ where: { slug: d.placement } }),
      prisma.adCategory.findUnique({ where: { slug: d.category } }),
      prisma.adPackage.findUnique({ where: { slug: d.package } }),
    ])
    if (!placement) throw new Error(`Placement ${d.placement} is missing — run seed-phase9 first.`)

    // Keyed on the campaign title so re-running does not pile up duplicates.
    const existing = await prisma.adBooking.findFirst({
      where: { advertiserId: user.id, title: d.campaign },
    })

    const data = {
      placementId: placement.id,
      advertiserId: user.id,
      title: d.campaign,
      imageUrl: d.image,
      targetUrl: d.website,
      brandName: d.company,
      tagline: d.tagline,
      headline: d.headline,
      description: d.description,
      ctaText: 'Know More',
      categoryId: category?.id ?? null,
      packageId: pkg?.id ?? null,
      startsAt: start,
      endsAt: end,
      weeks: 13,
      status: 'RUNNING' as const,
      reviewedAt: start,
      impressions: d.impressions,
      clicks: d.clicks,
    }

    const booking = existing
      ? await prisma.adBooking.update({ where: { id: existing.id }, data })
      : await prisma.adBooking.create({ data })

    bookingIds.push(booking.id)
    console.log(`  ✓ ${d.company.padEnd(20)} ${d.campaign}`)
  }

  console.log('\n── Featured slots ──')
  for (let position = 1; position <= 4; position++) {
    const bookingId = bookingIds[position - 1] ?? null

    await prisma.adFeaturedSlot.upsert({
      where: { position },
      create: { position, bookingId, isEnabled: true },
      update: { bookingId, isEnabled: true },
    })

    if (bookingId) {
      await prisma.adBooking.update({
        where: { id: bookingId },
        data: { isFeatured: true, featuredPriority: position },
      })
    }
    console.log(`  ✓ Slot ${position} → ${DEMO[position - 1]?.company ?? 'empty'}`)
  }

  console.log('\nDone. Change the slots at /admin/ads/featured and /advertisements follows.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
