/**
 * The three membership plans — Bronze / Silver / Gold.
 *
 * The model, decided with the founder: EVERY listing is unlimited on every
 * plan (projects, products, artistry, blog, Around Us) and leads are unlimited
 * too. The ONE thing a plan buys is **PACT reach** — how many PIN-code
 * territories the member holds, i.e. where their exclusive leads come from.
 * That location boundary is the whole point of the tiers, so it is the only
 * quota that differs.
 *
 * (Per-territory PACT registration prices by service type — DESIGNA ₹25k,
 * DESIGNI ₹25k, Consultant ₹15k, BMF ₹20k, §3.1.8.4 — live separately in
 * `seed-pricing.ts` as `PactPrice`; these subscription plans are a different,
 * bundled offer.)
 *
 * Idempotent: upserts by slug, so running it again just refreshes the three
 * rows. Re-run with `pnpm db:plans`.
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const UNLIMITED_LISTINGS = {
  maxProjects: null,
  maxProducts: null,
  maxAroundUs: null,
  maxArtistry: null,
}

const PLANS = [
  {
    // The free tier (PDF: registration is free) — a profile and listings, no PACT.
    slug: 'free',
    name: 'Free',
    tagline: 'Create your profile and start posting',
    price: 0,
    pactTerritories: 0,
    isPopular: false,
    sortOrder: 0,
    benefits: [
      'Your professional profile',
      'Post projects, products, artistry & blog',
      'Receive direct enquiries on your own posts',
      'Messages with buyers',
      'No PACT territory',
    ],
  },
  {
    slug: 'bronze',
    name: 'Bronze',
    tagline: 'Get verified and start selling',
    price: 999,
    pactTerritories: 2,
    isPopular: false,
    sortOrder: 1,
    benefits: [
      'Unlimited projects & products',
      'Unlimited artistry, blog & Around Us posts',
      'Unlimited leads & enquiries',
      '2 PACT territories (PIN codes)',
      'Verified Membership Certificate',
      'Your own storefront page',
      'Standard support',
    ],
  },
  {
    slug: 'silver',
    name: 'Silver',
    tagline: 'For growing sellers',
    price: 2999,
    pactTerritories: 5,
    isPopular: true,
    sortOrder: 2,
    benefits: [
      'Unlimited projects & products',
      'Unlimited artistry, blog & Around Us posts',
      'Unlimited leads & enquiries',
      '5 PACT territories (PIN codes)',
      'Verified Membership Certificate',
      'Featured placement',
      'Priority enquiry routing',
      'Priority support',
    ],
  },
  {
    slug: 'gold',
    name: 'Gold',
    tagline: 'Unlimited reach across India',
    price: 5999,
    pactTerritories: null, // unlimited — the top tier's whole draw
    isPopular: false,
    sortOrder: 3,
    benefits: [
      'Unlimited projects & products',
      'Unlimited artistry, blog & Around Us posts',
      'Unlimited leads & enquiries',
      'Unlimited PACT territories (all India)',
      'Gold Membership Certificate',
      'Priority featured placement',
      'Highest enquiry priority',
      'Dedicated support',
    ],
  },
]

async function main() {
  console.log('\n🏷️  Seeding membership plans (listings unlimited · PACT is the differentiator)…\n')

  for (const p of PLANS) {
    const data = {
      name: p.name,
      tagline: p.tagline,
      months: 12,
      price: new Prisma.Decimal(p.price),
      taxPercent: new Prisma.Decimal(18),
      benefits: p.benefits,
      ...UNLIMITED_LISTINGS,
      pactTerritories: p.pactTerritories,
      isPopular: p.isPopular,
      isActive: true,
      sortOrder: p.sortOrder,
    }

    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    })

    const pact = p.pactTerritories == null ? 'Unlimited' : String(p.pactTerritories)
    console.log(`   ${p.name.padEnd(8)} ₹${p.price.toLocaleString('en-IN')}/yr   listings: Unlimited   PACT: ${pact}`)
  }

  console.log('\n   ✓ Plans updated. Listings unlimited across all tiers; PACT reach is the only cap.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
