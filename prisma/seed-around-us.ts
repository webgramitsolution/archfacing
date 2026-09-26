/**
 * One published Around Us post per chip on the public strip.
 *
 *   npx tsx prisma/seed-around-us.ts
 *
 * The chips filter on the taxonomy, so every one of them needs something
 * filed under it or the tab reads as broken rather than as empty. These eight
 * cover all of them, and the Design Competition carries the full set of
 * sections the detail page can draw — theme, highlights, timeline, jury,
 * documents — so that template is exercised end to end.
 *
 * Photographs are the ones already uploaded to `public/uploads`, cropped from
 * openly licensed sources. Image generation is unavailable on this account,
 * so nothing here is generated.
 *
 * Idempotent — upserts by slug.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IMG = (n: string) => `/uploads/blog/${n}`
const ART = (n: string) => `/uploads/artistry/${n}`

type Draft = {
  slug: string
  title: string
  description: string
  category: string
  subCategory: string
  city: string
  state: string
  image: string
  /** days from today — negative is past, positive is upcoming */
  publishedDaysAgo: number
  meta: Record<string, unknown>
}

const DRAFTS: Draft[] = [
  // ─────────── Events (reporting-publication / seminars) ───────────
  {
    slug: 'archfacing-materials-expo-2026-delhi',
    title: 'ArchFacing Materials Expo 2026 — Delhi',
    description:
      'Three days of building materials, surfaces and design technology, with a seminar track running alongside.',
    category: 'reporting-publication',
    subCategory: 'seminars',
    city: 'New Delhi',
    state: 'Delhi',
    image: IMG('hero-portfolio.jpg'),
    publishedDaysAgo: 4,
    meta: {
      about: [
        'The expo brings together manufacturers, architects and specifiers across eleven halls. The 2026 floor plan gives surfaces and facade systems a hall of their own for the first time.',
        'The seminar track runs in parallel across all three days, with sessions on low-carbon concrete, facade fire compliance after the revised NBC clause, and what the GRIHA v2026 update changes for a specifier.',
      ],
      eventDate: daysFromNow(38).toISOString(),
      registrationEnds: daysFromNow(30).toISOString(),
      venue: 'To be announced, New Delhi',
      entryFee: 0,
      attendeeCount: 0,
      entryType: 'Open to trade visitors',
      eligibility: 'Architects, designers, contractors and specifiers',
      pactArea: 'Delhi NCR',
      keyPoints: [
        'Free entry for registered trade visitors',
        '1,100+ exhibitors across eleven halls',
        'Seminar track included with entry',
      ],
      highlights: [
        { icon: 'box', title: '1,100+ Exhibitors', note: 'Across eleven halls' },
        { icon: 'users', title: '42,000 Visitors', note: 'Expected over three days' },
        { icon: 'file', title: 'Seminar Track', note: 'Included with entry' },
        { icon: 'award', title: 'Design Awards', note: 'Announced on day three' },
      ],
      registerUrl: '',
    },
  },

  // ─────────── Exhibitions ───────────
  {
    slug: 'archfacing-interiors-week-2026-announced',
    title: 'ArchFacing Interiors Week 2026 Announced',
    description:
      'Asia’s leading design fair returns to NSIC Grounds with a larger pavilion for Indian studios and a new materials library.',
    category: 'reporting-publication',
    subCategory: 'exhibition',
    city: 'New Delhi',
    state: 'Delhi',
    image: IMG('hero-trends.jpg'),
    publishedDaysAgo: 11,
    meta: {
      about: [
        'The organisers have confirmed dates for the 2026 edition and added a dedicated pavilion for independent Indian studios, which had been sharing floor with larger exhibitors.',
        'A permanent materials library opens alongside the fair, holding samples from participating manufacturers that specifiers can handle rather than read about.',
      ],
      eventDate: daysFromNow(96).toISOString(),
      registrationEnds: daysFromNow(80).toISOString(),
      venue: 'To be announced, New Delhi',
      attendeeCount: 0,
      entryType: 'Trade and public days',
      pactArea: 'Delhi NCR',
      keyPoints: ['New pavilion for Indian studios', 'Permanent materials library', 'Trade and public days'],
    },
  },

  // ─────────── Awards ───────────
  {
    slug: 'archfacing-architect-of-the-year-2026',
    title: 'ArchFacing Architect of the Year 2026 Announced',
    description:
      'Entries open across eleven categories, with a new award for adaptive reuse and a separate student track judged on drawings alone.',
    category: 'new-development',
    subCategory: 'designers-awards',
    city: 'Mumbai',
    state: 'Maharashtra',
    image: ART('6a4b4f25e5d89dddf027fac3.jpg'),
    publishedDaysAgo: 6,
    meta: {
      about: [
        'The 2026 cycle opens with eleven categories, one of them new: Adaptive Reuse, for work that keeps an existing structure rather than replacing it. The organisers say the category was added after three years of entries that did not fit anywhere else.',
        'The student track is judged on drawings and a written statement only — no renders, no photographs — which levels the field between schools with visualisation labs and those without.',
      ],
      eventDate: daysFromNow(140).toISOString(),
      registrationEnds: daysFromNow(70).toISOString(),
      submissionEnds: daysFromNow(95).toISOString(),
      resultsOn: daysFromNow(140).toISOString(),
      entryFee: 3500,
      prizeMoney: 1500000,
      attendeeCount: 900,
      entryType: 'Open Competition',
      eligibility: 'Practising architects and students',
      pactArea: 'All India',
      timeline: [
        { date: 'Entries Open', label: 'Registration begins' },
        { date: 'Registration Ends', label: 'Last day to enter' },
        { date: 'Submission Ends', label: 'Drawings due' },
        { date: 'Results', label: 'Winners announced' },
      ],
      participants: [
        'Practising architects',
        'Interior designers',
        'Landscape architects',
        'Architecture students',
        'Young practices under five years',
        'Urban designers',
      ],
      highlights: [
        { icon: 'coins', title: '₹15,00,000', note: 'Total prize money' },
        { icon: 'award', title: 'Eleven Categories', note: 'Including Adaptive Reuse' },
        { icon: 'file', title: 'Publication', note: 'Shortlist published' },
        { icon: 'users', title: 'Student Track', note: 'Judged on drawings alone' },
      ],
      keyPoints: [
        'Open to students and professionals',
        'New Adaptive Reuse category',
        'Shortlisted entries are published',
        'Certificates for all entrants',
      ],
    },
  },

  // ─────────── Company Updates ───────────
  {
    slug: 'laminova-opens-delhi-experience-centre',
    title: 'New Flagship Experience Centre Launched in Delhi NCR',
    description:
      'A 12,000 sq ft centre showing laminate, veneer and surface systems at full panel size rather than as swatches.',
    category: 'new-development',
    subCategory: 'news',
    city: 'Gurugram',
    state: 'Haryana',
    image: IMG('hero-biophilic.jpg'),
    publishedDaysAgo: 9,
    meta: {
      about: [
        'The centre is built around full-size panels rather than sample books. A specifier can see a 2,440 mm sheet under the lighting it will actually sit in, which is the one thing a 100 mm swatch cannot show.',
        'A materials lab on the first floor runs scratch, stain and heat tests on request while a client waits.',
      ],
      venue: 'Sector 44, Gurugram',
      entryType: 'Open to specifiers by appointment',
      pactArea: 'Delhi NCR',
      keyPoints: ['12,000 sq ft', 'Full-size panel displays', 'On-site materials lab'],
    },
  },

  // ─────────── CSR & Sustainability ───────────
  {
    slug: 'tree-plantation-drive-bhiwadi',
    title: 'Tree Plantation Drive Across Four Plant Sites',
    description:
      'Eleven thousand native saplings planted across four manufacturing sites, with a three-year maintenance contract rather than a one-day photograph.',
    category: 'new-development',
    subCategory: 'news',
    city: 'Bhiwadi',
    state: 'Rajasthan',
    image: IMG('hero-nature.jpg'),
    publishedDaysAgo: 16,
    meta: {
      about: [
        'Eleven thousand saplings went in across four sites this monsoon — all native species selected with the state forest department, and none of the fast-growing ornamentals that usually fill these drives.',
        'A three-year maintenance contract runs alongside, because the number that matters is survival at year three, not saplings on day one. Last year’s planting is at 81 per cent.',
      ],
      eventDate: daysAgo(16).toISOString(),
      venue: 'Bhiwadi, Alwar, Chittorgarh and Rewari plants',
      attendeeCount: 420,
      entryType: 'Employee volunteering',
      pactArea: 'Rajasthan',
      keyPoints: [
        '11,000 native saplings',
        'Three-year maintenance contract',
        '81% survival on last year’s planting',
      ],
    },
  },

  // ─────────── Launches ───────────
  {
    slug: 'low-carbon-cement-range-launched',
    title: 'Low-Carbon Cement Range Launched for NCR Projects',
    description:
      'A blended range at 38 per cent lower embodied carbon than OPC, with mix designs published for common structural grades.',
    category: 'new-development',
    subCategory: 'news',
    city: 'New Delhi',
    state: 'Delhi',
    image: IMG('hero-materials.jpg'),
    publishedDaysAgo: 2,
    meta: {
      about: [
        'The range is a ground granulated blast-furnace slag blend, tested to IS 455, with an independently verified environmental product declaration showing 38 per cent lower embodied carbon than the OPC it replaces.',
        'Mix designs for M25, M30 and M40 are published rather than held as application support, so a structural consultant can specify without a sales call.',
      ],
      entryType: 'Available across Delhi NCR',
      pactArea: 'Delhi NCR',
      keyPoints: [
        '38% lower embodied carbon',
        'Verified EPD published',
        'Mix designs for M25, M30 and M40',
      ],
      highlights: [
        { icon: 'leaf', title: '38% Lower', note: 'Embodied carbon vs OPC' },
        { icon: 'award', title: 'Verified EPD', note: 'Third-party audited' },
        { icon: 'file', title: 'Published Mixes', note: 'M25, M30 and M40' },
        { icon: 'map', title: 'NCR Wide', note: 'From four depots' },
      ],
    },
  },

  // ─────────── Industry News ───────────
  {
    slug: 'real-estate-sector-outlook-2030',
    title: 'Real Estate Sector Outlook to 2030',
    description:
      'Sector projections point past a trillion dollars by 2030 — and name construction skills, not capital, as the binding constraint. Figures are indicative; consult the original published source.',
    category: 'new-development',
    subCategory: 'news',
    city: 'New Delhi',
    state: 'Delhi',
    image: IMG('hero-smart.jpg'),
    publishedDaysAgo: 21,
    meta: {
      about: [
        'The projection is not new; what is new is the constraint the report names. Capital is not the limit — the report puts the shortfall at roughly 4.5 million trained site workers by 2030, against a training pipeline sized for about a third of that.',
        'For architects and specifiers the practical read is buildability. A detail that needs a skill the site does not have gets substituted on site, and the substitution is rarely drawn.',
      ],
      entryType: 'Industry report',
      pactArea: 'All India',
      keyPoints: [
        '$1 trillion projection by 2030',
        '4.5 million worker shortfall',
        'Buildability named as the practical constraint',
      ],
      referenceUrl: 'https://www.niti.gov.in',
    },
  },

  // ─────────── The Design Competition — the full detail template ───────────
  {
    slug: 'national-architecture-design-competition-2026',
    title: 'National Architecture Design Competition 2026',
    description:
      'An open competition for sustainable and inclusive public spaces, with a prize pool announced at launch.',
    category: 'new-development',
    subCategory: 'designers-awards',
    city: 'New Delhi',
    state: 'Delhi',
    image: ART('9daf4793ebf2d641e234d19f.jpg'),
    publishedDaysAgo: 1,
    meta: {
      about: [
        'The National Architecture Design Competition 2026 invites innovative ideas for sustainable and inclusive public spaces that enhance community living. The competition aims to encourage creativity, promote ecological responsibility, and support the vision of a better built environment.',
        'Entries are judged on the idea and its resolution rather than on presentation quality. The jury has asked specifically for drawings that explain how a proposal is built and maintained, not only how it looks on the day it opens.',
        'Shortlisted entries are published in the Council’s annual review and exhibited at the results event in New Delhi.',
      ],
      eventDate: daysFromNow(120).toISOString(),
      registrationEnds: daysFromNow(45).toISOString(),
      submissionEnds: daysFromNow(75).toISOString(),
      resultsOn: daysFromNow(120).toISOString(),
      venue: 'To be announced, New Delhi',
      entryFee: 2500,
      prizeMoney: 2500000,
      attendeeCount: 0,
      entryType: 'Open Competition',
      eligibility: 'Students & Professionals',
      pactArea: 'All India',
      organiser: {
        name: 'ArchFacing Design Council',
        location: 'New Delhi, India',
        logo: '',
        verified: false,
      },
      theme: {
        title: 'Reimagining Public Spaces for a Sustainable Tomorrow',
        note: 'Design concepts that create inclusive, green, resilient and community-centric public spaces.',
      },
      highlights: [
        { icon: 'coins', title: '₹25,00,000+', note: 'Prize Money' },
        { icon: 'award', title: 'Certificate', note: 'For All Participants' },
        { icon: 'file', title: 'Publication', note: 'Top Projects' },
        { icon: 'users', title: 'Networking', note: 'Industry Exposure' },
      ],
      timeline: [
        { date: 'Registration Starts', label: 'Entries open' },
        { date: 'Registration Ends', label: 'Last day to register' },
        { date: 'Submission Ends', label: 'Drawings due' },
        { date: 'Winners Announced', label: 'Results and exhibition' },
      ],
      participants: [
        'Architecture Students',
        'Landscape Architecture Students',
        'Urban Designers',
        'Interior Design Students',
        'Young Professionals & Architects',
        'Design Enthusiasts',
      ],
      keyPoints: [
        'Open to students & professionals across India',
        'Certificate of participation for every entrant',
        'Certificate for all participants',
        'Top projects will be published',
        'Great exposure and networking opportunities',
      ],
      // No documents. The three entries here were labelled "(PDF)" and every
      // one of them linked to /legal/need-help — a download that downloads
      // nothing. They return when real files exist.
      documents: [],
      registerUrl: '',
    },
  },
]

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function daysAgo(n: number): Date {
  return daysFromNow(-n)
}

async function main() {
  const author = await prisma.user.findFirst({
    where: { email: 'bedrock@brands.archfacing.com' },
    select: { id: true },
  })
  const fallback = await prisma.user.findFirst({
    where: { role: 'PROFESSIONAL', deletedAt: null },
    select: { id: true },
  })
  const authorId = author?.id ?? fallback?.id
  if (!authorId) {
    console.log('\nNo account to post as — run the main seed first.\n')
    return
  }

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })

  for (const d of DRAFTS) {
    const publishedAt = daysAgo(d.publishedDaysAgo)

    const meta = {
      ...d.meta,
      image: d.image,
      cardImage: d.image,
      thumbImage: d.image,
    }

    const common = {
      title: d.title,
      description: d.description,
      category: d.category,
      subCategory: d.subCategory,
      city: d.city,
      state: d.state,
      meta: meta as never,
      status: 'PUBLISHED' as const,
      publishedAt,
      reviewedById: admin?.id ?? null,
      reviewedAt: publishedAt,
      rejectionReason: null,
      deletedAt: null,
      // A real figure would come from the view route; these are seeded content,
      // so they start where a post of this age plausibly sits and grow from there.
      viewCount: 0, // counts real visits only
    }

    await prisma.post.upsert({
      where: { slug: d.slug },
      create: { ...common, slug: d.slug, type: 'AROUND_US', authorId },
      update: common,
    })

    console.log(`  ${d.category.padEnd(22)} ${d.title.slice(0, 52)}`)
  }

  const total = await prisma.post.count({
    where: { type: 'AROUND_US', status: 'PUBLISHED', deletedAt: null },
  })
  console.log(`\n${total} published Around Us posts.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
