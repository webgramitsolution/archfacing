/**
 * Advertiser dashboard — demo campaigns across every state.
 *
 * ⚠️ SEED/DEMO DATA. These are ordinary campaign rows belonging to the demo
 *    advertiser accounts created by `seed-ads.ts`; nothing about them is
 *    special-cased anywhere in the app. They exist so the eight advertisement
 *    screens can be seen with something in them.
 *
 *   pnpm db:ad-campaigns   (run pnpm db:ads first)
 */

import { PrismaClient, type AdStatus } from '@prisma/client'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
//  Advertisement types — §9
// ═══════════════════════════════════════════════════════════

const TYPES = [
  { slug: 'banner', name: 'Banner Advertisement', icon: 'image', sortOrder: 1, description: 'Promote your brand' },
  { slug: 'featured', name: 'Featured Advertisement', icon: 'star', sortOrder: 2, description: 'Get highlighted on platform' },
  { slug: 'sponsored-product', name: 'Sponsored Product', icon: 'box', sortOrder: 3, description: 'Showcase your products' },
  { slug: 'sponsored-project', name: 'Sponsored Project', icon: 'building', sortOrder: 4, description: 'Feature your projects' },
  { slug: 'sponsored-listing', name: 'Sponsored Listing', icon: 'list', sortOrder: 5, description: 'Increase your visibility' },
  { slug: 'brand-spotlight', name: 'Brand Spotlight', icon: 'bolt', sortOrder: 6, description: 'Build brand awareness' },
  { slug: 'category', name: 'Category Advertisement', icon: 'grid', sortOrder: 7, description: 'Target specific categories' },
  { slug: 'search', name: 'Search Advertisement', icon: 'search', sortOrder: 8, description: 'Appear in search results' },
  { slug: 'local', name: 'Local Advertisement', icon: 'map', sortOrder: 9, description: 'Target by location' },
  { slug: 'pact', name: 'PACT Advertisement', icon: 'target', sortOrder: 10, description: 'Target PACT territories' },
  { slug: 'event-sponsor', name: 'Event Sponsor', icon: 'trophy', sortOrder: 11, description: 'Sponsor competitions & events' },
  { slug: 'sponsored-content', name: 'Sponsored Content', icon: 'file', sortOrder: 12, description: 'Promote your content' },
]

// ═══════════════════════════════════════════════════════════
//  The campaigns
// ═══════════════════════════════════════════════════════════

const DAY = 24 * 60 * 60 * 1000
const at = (offsetDays: number) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d
}

type Demo = {
  advertiser: string
  title: string
  headline?: string
  description?: string
  image: string
  type: string
  placement: string
  category?: string
  package?: string
  status: AdStatus
  /** Days from today. */
  starts?: number
  ends?: number
  startTime?: string
  submitted?: number
  reviewed?: number
  impressions?: number
  clicks?: number
  leads?: number
  rejectionCode?: string
  rejectionReason?: string
  resubmitCount?: number
  audience?: string[]
  cities?: string[]
  pincodes?: string[]
  /** A draft that has only got as far as step N. */
  draftTo?: number
}

const TERRACOTTA = 'demo.terracotta@archfacing.test'
const CHROMALINE = 'demo.chromaline@archfacing.test'
const FITTWELL = 'demo.fittwell@archfacing.test'
const BEDROCK = 'demo.bedrock@archfacing.test'

const IMG = {
  terracotta: '/img/ads/preview-desktop.jpg',
  chromaline: '/img/ads/preview-desktop.jpg',
  fittwell: '/img/ads/preview-desktop.jpg',
  bedrock: '/img/ads/preview-desktop.jpg',
}

const CAMPAIGNS: Demo[] = [
  // ─── Pending approval ───
  {
    advertiser: TERRACOTTA, title: 'Terracotta Festive Campaign',
    headline: 'Stylish Spaces, Stronger Together',
    description: 'Premium tile collection for modern homes. Designed for a better tomorrow.',
    image: IMG.terracotta, type: 'banner', placement: 'home-hero', category: 'building-materials',
    package: 'standard', status: 'PENDING_REVIEW',
    starts: 19, ends: 49, submitted: -2,
    audience: ['PROFESSIONAL', 'CONSULTANT'], cities: ['Delhi', 'Gurugram'],
  },
  {
    advertiser: CHROMALINE, title: 'Chromaline Colour Stories',
    headline: 'Colours That Inspire Better Spaces',
    description: 'Bring life to your spaces with our latest colour collection.',
    image: IMG.chromaline, type: 'featured', placement: 'projects-listing', category: 'home-decor',
    package: 'premium', status: 'PENDING_REVIEW',
    starts: 3, ends: 33, submitted: -3,
    audience: ['PROFESSIONAL', 'CLIENT'], cities: ['Mumbai'],
  },
  {
    advertiser: FITTWELL, title: 'Fittwell Kitchen Solutions',
    headline: 'Functional Beauty for Modern Living',
    description: 'Smart kitchen hardware solutions for modern living.',
    image: IMG.fittwell, type: 'sponsored-product', placement: 'products-sidebar',
    category: 'furniture-fixtures', package: 'standard', status: 'PENDING_REVIEW',
    starts: 8, ends: 38, submitted: -4,
    audience: ['PROFESSIONAL'], cities: ['Bengaluru'],
  },
  {
    advertiser: BEDROCK, title: 'Bedrock Build Better',
    headline: 'Build a Stronger Tomorrow',
    description: 'Cement and building solutions for a stronger, smarter India.',
    image: IMG.bedrock, type: 'local', placement: 'consult-nearby', category: 'construction',
    package: 'elite', status: 'PENDING_REVIEW',
    starts: -11, ends: 18, submitted: -2,
    audience: ['BMF'], pincodes: ['121001'],
  },

  // ─── Scheduled ───
  {
    advertiser: TERRACOTTA, title: 'Terracotta Diwali Campaign',
    headline: 'Tiles for a Better Tomorrow', description: 'Premium tiles for modern homes',
    image: IMG.terracotta, type: 'banner', placement: 'home-hero', category: 'building-materials',
    package: 'standard', status: 'SCHEDULED',
    starts: 19, ends: 49, startTime: '10:00', reviewed: -5,
    audience: ['PROFESSIONAL', 'CLIENT'], cities: ['Delhi'],
  },
  {
    advertiser: CHROMALINE, title: 'Chromaline Festive Offer',
    headline: 'Colours That Inspire Better Spaces', description: 'Bring life to your spaces',
    image: IMG.chromaline, type: 'category', placement: 'products-sidebar', category: 'home-decor',
    package: 'basic', status: 'SCHEDULED',
    starts: 23, ends: 38, startTime: '09:00', reviewed: -4,
    audience: ['CLIENT'], cities: ['Mumbai', 'Pune'],
  },
  {
    advertiser: FITTWELL, title: 'Fittwell Brand Showcase',
    headline: 'Smart Living Solutions', description: 'German innovation for modern living',
    image: IMG.fittwell, type: 'sponsored-product', placement: 'products-sidebar',
    category: 'furniture-fixtures', package: 'premium', status: 'SCHEDULED',
    starts: 28, ends: 48, startTime: '08:00', reviewed: -3,
    audience: ['PROFESSIONAL'], cities: ['Bengaluru', 'Hyderabad'],
  },

  // ─── Completed ───
  {
    advertiser: TERRACOTTA, title: 'Terracotta Winter Collection',
    headline: 'Tiles for a Better Tomorrow', description: 'Premium tiles for modern spaces',
    image: IMG.terracotta, type: 'banner', placement: 'home-hero', category: 'building-materials',
    package: 'standard', status: 'ENDED',
    starts: -72, ends: -41, reviewed: -75,
    impressions: 125_400, clicks: 4_320, leads: 286,
    audience: ['PROFESSIONAL'], cities: ['Delhi'],
  },
  {
    advertiser: CHROMALINE, title: 'Chromaline Colour Stories 2026',
    headline: 'Colours That Inspire', description: 'Bring life to your spaces',
    image: IMG.chromaline, type: 'featured', placement: 'projects-listing', category: 'home-decor',
    package: 'premium', status: 'ENDED',
    starts: -110, ends: -79, reviewed: -113,
    impressions: 289_600, clicks: 8_950, leads: 512,
    audience: ['CLIENT', 'PROFESSIONAL'], cities: ['Mumbai'],
  },
  {
    advertiser: FITTWELL, title: 'Fittwell Kitchen Showcase',
    headline: 'Smart Living Solutions', description: 'German innovation for modern living',
    image: IMG.fittwell, type: 'sponsored-product', placement: 'products-sidebar',
    category: 'furniture-fixtures', package: 'standard', status: 'ENDED',
    starts: -145, ends: -125, reviewed: -148,
    impressions: 198_200, clicks: 6_430, leads: 318,
    audience: ['PROFESSIONAL'], cities: ['Bengaluru'],
  },
  {
    advertiser: BEDROCK, title: 'Bedrock Regional Reach',
    headline: 'Build a Stronger Tomorrow', description: 'Cement for a stronger India',
    image: IMG.bedrock, type: 'local', placement: 'around-us', category: 'construction',
    package: 'elite', status: 'ENDED',
    starts: -175, ends: -145, reviewed: -178,
    impressions: 162_400, clicks: 5_210, leads: 244,
    audience: ['BMF'], pincodes: ['121001'],
  },

  // ─── Rejected / changes requested ───
  {
    advertiser: TERRACOTTA, title: 'Terracotta Spring Sale',
    headline: 'Tiles for a Better Tomorrow', description: 'Premium tiles for modern homes',
    image: IMG.terracotta, type: 'banner', placement: 'home-hero', category: 'building-materials',
    package: 'basic', status: 'REJECTED',
    starts: 5, ends: 20, submitted: -31, reviewed: -29,
    rejectionCode: 'Inappropriate Content',
    rejectionReason: 'Image contains unapproved text and claims.',
    audience: ['PROFESSIONAL'], cities: ['Delhi'],
  },
  {
    advertiser: CHROMALINE, title: 'Chromaline Festive Offer 2026',
    headline: 'Colours That Inspire', description: 'Bring life to your spaces',
    image: IMG.chromaline, type: 'featured', placement: 'products-sidebar', category: 'home-decor',
    package: 'standard', status: 'REJECTED',
    starts: 5, ends: 35, submitted: -35, reviewed: -33,
    rejectionCode: 'Misleading Information',
    rejectionReason: 'Offer details could not be verified.',
    resubmitCount: 1,
    audience: ['CLIENT'], cities: ['Mumbai'],
  },
  {
    advertiser: FITTWELL, title: 'Fittwell Product Showcase',
    headline: 'Smart Living Solutions', description: 'German innovation for modern living',
    image: IMG.fittwell, type: 'sponsored-product', placement: 'products-sidebar',
    category: 'furniture-fixtures', package: 'standard', status: 'CHANGES_REQUESTED',
    starts: 6, ends: 26, submitted: -38, reviewed: -36,
    rejectionCode: 'Trademark/Brand Issue',
    rejectionReason: 'Use of restricted brand elements — supply written permission.',
    audience: ['PROFESSIONAL'], cities: ['Bengaluru'],
  },
  {
    advertiser: BEDROCK, title: 'Bedrock Dealer Network',
    headline: 'Build a Stronger Tomorrow', description: 'Cement for a stronger India',
    image: IMG.bedrock, type: 'local', placement: 'around-us', category: 'construction',
    package: 'basic', status: 'REJECTED',
    starts: 4, ends: 19, submitted: -41, reviewed: -39,
    rejectionCode: 'Insufficient Information',
    rejectionReason: 'Missing required business documents.',
    audience: ['BMF'], pincodes: ['121001'],
  },

  // ─── Drafts, each stopped at a different step ───
  {
    advertiser: FITTWELL, title: 'Fittwell Kitchen Solutions 2027',
    description: 'Premium kitchen and hardware solutions for modern homes.',
    image: IMG.fittwell, type: 'banner', placement: '', status: 'DRAFT', draftTo: 2,
    headline: 'Functional Beauty for Modern Spaces',
  },
  {
    advertiser: CHROMALINE, title: 'Chromaline Colour Collection',
    description: 'Showcasing the latest colour collection for residential and commercial spaces.',
    image: IMG.chromaline, type: 'banner', placement: 'home-hero', status: 'DRAFT', draftTo: 4,
    headline: 'Colours That Bring Spaces to Life',
    audience: ['PROFESSIONAL', 'CLIENT'], cities: ['Mumbai'],
  },
  {
    advertiser: TERRACOTTA, title: 'Terracotta New Tile Collection',
    description: 'New range of premium tiles for modern spaces.',
    image: '', type: 'sponsored-product', placement: '', status: 'DRAFT', draftTo: 1,
  },
  {
    advertiser: BEDROCK, title: 'Bedrock Construction Solutions',
    description: 'Cement and building solutions for a stronger, smarter India.',
    image: IMG.bedrock, type: 'local', placement: '', status: 'DRAFT', draftTo: 2,
    headline: 'Build a Stronger Tomorrow',
  },
  {
    advertiser: FITTWELL, title: 'Fittwell Interior Surfaces',
    description: 'Premium laminates and interior surfaces for inspired living.',
    image: IMG.fittwell, type: 'sponsored-content', placement: 'blog-inline', status: 'DRAFT',
    draftTo: 5, headline: 'Designing Thoughtful Spaces',
    audience: ['PROFESSIONAL'], cities: ['Delhi'], starts: 10, ends: 40,
  },
]

async function main() {
  console.log('\n── Advertisement types ──')
  for (const t of TYPES) {
    await prisma.adType.upsert({ where: { slug: t.slug }, create: t, update: t })
  }
  console.log(`  ✓ ${TYPES.length} types`)

  console.log('\n── Demo campaigns ──')

  for (const d of CAMPAIGNS) {
    const user = await prisma.user.findUnique({ where: { email: d.advertiser } })
    if (!user) {
      console.log(`  ⚠ ${d.advertiser} not found — run "pnpm db:ads" first`)
      continue
    }

    const [type, placement, category, pkg] = await Promise.all([
      prisma.adType.findUnique({ where: { slug: d.type } }),
      d.placement ? prisma.adPlacement.findUnique({ where: { slug: d.placement } }) : null,
      d.category ? prisma.adCategory.findUnique({ where: { slug: d.category } }) : null,
      d.package ? prisma.adPackage.findUnique({ where: { slug: d.package } }) : null,
    ])

    const starts = d.starts !== undefined ? at(d.starts) : null
    const ends = d.ends !== undefined ? at(d.ends) : null

    const data = {
      advertiserId: user.id,
      title: d.title,
      description: d.description ?? null,
      headline: d.headline ?? null,
      brandName: user.name,
      imageUrl: d.image || null,
      targetUrl: d.image ? 'https://www.archfacing.com' : null,
      ctaText: 'Know More',
      adTypeId: type?.id ?? null,
      placementId: placement?.id ?? null,
      categoryId: category?.id ?? null,
      packageId: pkg?.id ?? null,
      objective: 'Brand Awareness',
      status: d.status,
      startsAt: starts,
      endsAt: ends,
      startTime: d.startTime ?? null,
      weeks: starts && ends ? Math.max(1, Math.round((+ends - +starts) / (7 * DAY))) : null,
      submittedAt: d.submitted !== undefined ? at(d.submitted) : null,
      reviewedAt: d.reviewed !== undefined ? at(d.reviewed) : null,
      rejectionCode: d.rejectionCode ?? null,
      rejectionReason: d.rejectionReason ?? null,
      resubmitCount: d.resubmitCount ?? 0,
      impressions: d.impressions ?? 0,
      clicks: d.clicks ?? 0,
      leads: d.leads ?? 0,
    }

    const existing = await prisma.adBooking.findFirst({
      where: { advertiserId: user.id, title: d.title },
    })

    const booking = existing
      ? await prisma.adBooking.update({ where: { id: existing.id }, data })
      : await prisma.adBooking.create({ data })

    // Targeting — only when the demo campaign got that far.
    if (d.audience || d.cities || d.pincodes) {
      const t = {
        bookingId: booking.id,
        country: 'India',
        states: [],
        cities: d.cities ?? [],
        pincodes: d.pincodes ?? [],
        pactAreas: d.pincodes ?? [],
        productCategories: d.category ? [d.category] : [],
        projectCategories: [],
        professionalCategories: [],
        audienceRoles: d.audience ?? [],
      }
      await prisma.adTargeting.upsert({
        where: { bookingId: booking.id },
        create: t,
        update: t,
      })
    } else {
      await prisma.adTargeting.deleteMany({ where: { bookingId: booking.id } })
    }

    console.log(`  ✓ ${d.status.padEnd(18)} ${d.title}`)
  }

  const counts = await prisma.adBooking.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  console.log('\n── Totals ──')
  for (const c of counts) {
    console.log(`  ${c.status.padEnd(20)} ${c._count._all}`)
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
