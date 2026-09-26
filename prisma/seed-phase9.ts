/**
 * Seeds Club Membership plans and Advertisement placements.
 *
 *   pnpm db:phase9
 *
 * Both tables are upserted by slug, so running this again updates prices
 * instead of creating duplicates. Slugs are referenced from URLs and from
 * existing bookings — never rename one here.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
//  Club Membership — §5.2.10, §9.1
// ═══════════════════════════════════════════════════════════

const CLUB_PLANS = [
  {
    slug: 'club-individual',
    name: 'Individual',
    tagline: 'For professionals and individuals',
    months: 12,
    price: 1499,
    benefits: [
      'Access to all Club events',
      'Event updates and invitations',
      'Priority event registration',
      'Free access to webinars',
      'Newsletter and industry insights',
      'Member directory and networking',
    ],
    allowedRoles: [] as string[],
    isPopular: true,
    sortOrder: 1,
  },
  {
    slug: 'club-corporate',
    name: 'Corporate',
    tagline: 'For companies and brands',
    months: 12,
    price: 4999,
    benefits: [
      'All Individual benefits',
      'Featured company profile',
      'Free event passes (2 per year)',
      'Brand visibility at events',
      'Discounts on paid events',
      'Dedicated account manager',
    ],
    allowedRoles: [] as string[],
    sortOrder: 2,
  },
]

// ═══════════════════════════════════════════════════════════
//  Advertisement placements — §7.4.6
// ═══════════════════════════════════════════════════════════

const AD_PLACEMENTS = [
  {
    slug: 'home-hero',
    name: 'Homepage Hero Banner',
    description:
      'Directly below the homepage hero — the first banner every visitor sees.',
    size: '1200x300',
    weeklyPrice: 12000,
    maxSlots: 2,
    sortOrder: 1,
  },
  {
    slug: 'projects-listing',
    name: 'Projects Listing Banner',
    description:
      'Inside the Projects results, after the first row of cards. Reaches visitors who are actively browsing work.',
    size: '1200x250',
    weeklyPrice: 7500,
    maxSlots: 3,
    sortOrder: 2,
  },
  {
    slug: 'products-sidebar',
    name: 'Products Sidebar',
    description:
      'Sticky panel beside the Products catalogue. Well suited to building material brands.',
    size: '300x600',
    weeklyPrice: 5500,
    maxSlots: 4,
    sortOrder: 3,
  },
  {
    slug: 'consult-nearby',
    name: 'Consult Nearby Banner',
    description:
      'Shown while a visitor is searching for a professional in their PIN code — the highest intent page on the site.',
    size: '970x250',
    weeklyPrice: 9000,
    maxSlots: 2,
    sortOrder: 4,
  },
  {
    slug: 'blog-inline',
    name: 'Blog In-Article',
    description: 'Placed between article sections, where readers are already reading.',
    size: '728x90',
    weeklyPrice: 3500,
    maxSlots: 5,
    sortOrder: 5,
  },
  {
    slug: 'merchandise-strip',
    name: 'Merchandise Top Strip',
    description: 'Full-width strip above the Merchandise store grid.',
    size: '1200x180',
    weeklyPrice: 4500,
    maxSlots: 3,
    sortOrder: 6,
  },
]

async function main() {
  console.log('\n── Club Membership plans ──')
  for (const plan of CLUB_PLANS) {
    const { slug, price, ...rest } = plan
    await prisma.clubPlan.upsert({
      where: { slug },
      create: { slug, price: new Prisma.Decimal(price), ...rest },
      update: { price: new Prisma.Decimal(price), ...rest },
    })
    console.log(`  ✓ ${plan.name.padEnd(18)} ₹${price.toLocaleString('en-IN')} · ${plan.months} months`)
  }

  console.log('\n── Advertisement placements ──')
  for (const p of AD_PLACEMENTS) {
    const { slug, weeklyPrice, ...rest } = p
    await prisma.adPlacement.upsert({
      where: { slug },
      create: { slug, weeklyPrice: new Prisma.Decimal(weeklyPrice), ...rest },
      update: { weeklyPrice: new Prisma.Decimal(weeklyPrice), ...rest },
    })
    console.log(
      `  ✓ ${p.name.padEnd(28)} ${p.size.padEnd(9)} ₹${weeklyPrice.toLocaleString('en-IN')}/week · ${p.maxSlots} slots`
    )
  }

  console.log(
    `\n${CLUB_PLANS.length} plans and ${AD_PLACEMENTS.length} placements are ready.\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
