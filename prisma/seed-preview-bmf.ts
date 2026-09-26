/**
 * A populated BMF account, so the BMF dashboard can be looked at with content
 * in it rather than a screen of zeroes.
 *
 *   pnpm db:preview-bmf
 *
 * ⚠️ Demo data. The business, the materials, the leads and the people who
 *    sent them are all invented. It exists to review the design against the
 *    blueprint, not to seed a real account. The email is on a `.test` domain,
 *    which can never be a real address.
 *
 * ⚠️ Every posting made here is slugged `preview-bmf-…`. `Post.slug` is
 *    globally unique, not unique per author, so a shared `preview-` prefix
 *    would collide with the Professional preview seed the moment both name a
 *    product the same thing.
 */

import { PrismaClient, type PostStatus, type EnquiryStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PRODUCT_PHOTOS, unsplash } from '../src/config/content-media'

const prisma = new PrismaClient()

const EMAIL = 'preview.bmf@archfacing.test'
const PASSWORD = 'Preview@123'
const PIN = '110024'
const CITY = 'New Delhi'
const STATE = 'Delhi'

type Product = {
  title: string
  category: string
  sub: string
  status: PostStatus
  views: number
  photo: string
}

/** A facilitator's stock list — materials and fittings, not design work. */
const PRODUCTS: Product[] = [
  { title: 'Italian Marble Slab — Statuario', category: 'buildings-products', sub: 'construction-materials', status: 'PUBLISHED', views: 612, photo: PRODUCT_PHOTOS.flooring },
  { title: 'Vitrified Floor Tile 800x800', category: 'buildings-products', sub: 'construction-materials', status: 'PUBLISHED', views: 488, photo: PRODUCT_PHOTOS.living },
  { title: 'Sanitaryware Set — Wall Hung', category: 'buildings-products', sub: 'interior-products', status: 'PUBLISHED', views: 377, photo: PRODUCT_PHOTOS.sanitaryware },
  { title: 'Modular Kitchen Shutters — Acrylic', category: 'buildings-products', sub: 'interior-products', status: 'PUBLISHED', views: 341, photo: PRODUCT_PHOTOS.kitchenWhite },
  { title: 'uPVC Casement Window System', category: 'buildings-products', sub: 'modern-materials', status: 'PUBLISHED', views: 295, photo: PRODUCT_PHOTOS.livingWide },
  { title: 'Engineered Oak Flooring', category: 'buildings-products', sub: 'construction-materials', status: 'PUBLISHED', views: 268, photo: PRODUCT_PHOTOS.storage },
  { title: 'Matte Black Basin & Mixer', category: 'buildings-products', sub: 'interior-products', status: 'PENDING_REVIEW', views: 154, photo: PRODUCT_PHOTOS.basin },
  { title: 'Ceiling Cove Lighting Profile', category: 'buildings-products', sub: 'interior-products', status: 'PENDING_REVIEW', views: 121, photo: PRODUCT_PHOTOS.livingPendants },
  { title: 'Fluted Wall Cladding — WPC', category: 'buildings-products', sub: 'modern-materials', status: 'DRAFT', views: 64, photo: PRODUCT_PHOTOS.shelving },
  { title: 'Toughened Glass Shower Enclosure', category: 'buildings-products', sub: 'interior-products', status: 'DRAFT', views: 41, photo: PRODUCT_PHOTOS.shower },
]

/**
 * The leads. `daysAgo` is spread across six months on purpose — the Leads
 * Performance chart buckets by month, and a seed clustered in one week would
 * draw a flat line with a single spike.
 */
const LEADS: {
  subject: string
  name: string
  status: EnquiryStatus
  daysAgo: number
  budget?: number
  /** hours from arrival to the first reply; omitted means never replied to */
  repliedAfter?: number
  /** false when an RM handed it over rather than the PACT routing it */
  viaPact?: boolean
}[] = [
  { subject: 'Marble flooring for a 4BHK in Lajpat Nagar', name: 'Gaurav Mehta', status: 'NEW', daysAgo: 0, budget: 850000 },
  { subject: 'Bulk vitrified tiles — 2400 sq ft', name: 'Neha Verma', status: 'NEW', daysAgo: 1, budget: 420000 },
  { subject: 'Sanitaryware for a boutique hotel', name: 'Sunrise Hospitality', status: 'IN_PROGRESS', daysAgo: 3, budget: 1250000, repliedAfter: 4 },
  { subject: 'Modular kitchen shutters — 2 flats', name: 'Rohit Sharma', status: 'RESPONDED', daysAgo: 6, budget: 310000, repliedAfter: 2 },
  { subject: 'uPVC windows for a farmhouse', name: 'Anjali Nair', status: 'CONVERTED', daysAgo: 12, budget: 680000, repliedAfter: 6 },
  { subject: 'Wall cladding for an office lobby', name: 'Design Build Corp.', status: 'RESPONDED', daysAgo: 21, budget: 245000, repliedAfter: 9, viaPact: false },
  { subject: 'Oak flooring for a duplex', name: 'Kabir Malhotra', status: 'CONVERTED', daysAgo: 34, budget: 540000, repliedAfter: 3 },
  { subject: 'Shower enclosures — 6 bathrooms', name: 'Meera Iyer', status: 'CLOSED', daysAgo: 47, budget: 190000, repliedAfter: 30 },
  { subject: 'Cove lighting profiles, whole floor', name: 'Studio Lumen', status: 'CONVERTED', daysAgo: 61, budget: 165000, repliedAfter: 5, viaPact: false },
  { subject: 'Granite countertops for a café', name: 'Bean & Brick', status: 'CLOSED', daysAgo: 78, budget: 98000, repliedAfter: 18 },
  { subject: 'Tile supply for a group housing block', name: 'Verma Builders', status: 'CONVERTED', daysAgo: 96, budget: 2100000, repliedAfter: 7 },
  { subject: 'Bathroom fittings — villa project', name: 'Aravali Estates', status: 'CLOSED', daysAgo: 119, budget: 760000, repliedAfter: 22 },
  { subject: 'Marble for a temple renovation', name: 'Trust Committee', status: 'CONVERTED', daysAgo: 142, budget: 1450000, repliedAfter: 11 },
  { subject: 'Cladding samples for a showroom', name: 'Nikhil Bose', status: 'CLOSED', daysAgo: 158, budget: 55000, repliedAfter: 26 },
]

const NOTES = [
  { type: 'NEW_ENQUIRY', title: 'New lead in 110024 — marble flooring, Lajpat Nagar.', body: 'Respond within 24 hours to keep your response rate up.', hoursAgo: 2 },
  { type: 'NEW_ENQUIRY', title: 'New lead in 110024 — bulk vitrified tiles.', body: '2400 sq ft, budget around ₹4.2 lakh.', hoursAgo: 27 },
  { type: 'POST_APPROVED', title: 'Your listing "Engineered Oak Flooring" is now published.', body: 'It is live on the Products listing.', hoursAgo: 52 },
  { type: 'PACT_ACTIVATED', title: 'Your PACT for 110024 is active.', body: 'Every materials enquiry from this PIN code now comes to you.', hoursAgo: 96 },
]

const slug = (s: string) =>
  'preview-bmf-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000)
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash, status: 'ACTIVE', role: 'BMF',
      mobile: '9811100024', addressLine: '48 Ring Road, Lajpat Nagar III',
      city: CITY, state: STATE, pincode: PIN,
    },
    create: {
      email: EMAIL, name: 'Amit Kumar', role: 'BMF', status: 'ACTIVE',
      passwordHash, mobile: '9811100024',
      addressLine: '48 Ring Road, Lajpat Nagar III',
      city: CITY, state: STATE, pincode: PIN,
      // "Active Since N Days" on the banner counts from here
      createdAt: daysAgo(412),
    },
  })

  /*
   * A second account to be the client on every lead. An Enquiry needs a
   * `clientId`, and pointing it back at the BMF would make the dashboard's
   * own "enquiries I sent" page list the leads it received.
   */
  const client = await prisma.user.upsert({
    where: { email: 'preview.bmf.client@archfacing.test' },
    update: { status: 'ACTIVE', passwordHash },
    create: {
      email: 'preview.bmf.client@archfacing.test',
      name: 'Preview Client', role: 'CLIENT', status: 'ACTIVE',
      // given the same password as the other preview accounts, so the Client
      // side of the site can be walked through too — a Client sees a very
      // different dashboard and is blocked from several pages by design
      passwordHash,
      mobile: '9800000001',
      addressLine: '22 Ring Road, Lajpat Nagar',
      city: CITY, state: STATE, pincode: PIN,
    },
  })

  /*
   * A handful of neighbours in the same PIN code, so "Professionals in Area"
   * and the PACT card's three counts show something. They are the reason that
   * page exists — without them it is an honest but blank screen.
   */
  const NEIGHBOURS = [
    { email: 'preview.nb1@archfacing.test', name: 'Ar. Ritu Malhotra', role: 'PROFESSIONAL' as const, designaType: 'DESIGNA' as const, tier: 'LEGEND' as const },
    { email: 'preview.nb2@archfacing.test', name: 'Ar. Sameer Joshi', role: 'PROFESSIONAL' as const, designaType: 'DESIGNI' as const, tier: 'PROFESSIONAL' as const },
    { email: 'preview.nb3@archfacing.test', name: 'Er. Priya Raghavan', role: 'CONSULTANT' as const, group: 'ENGINEERING' as const, subCategory: 'civil-engineer' },
    { email: 'preview.nb4@archfacing.test', name: 'Vastu Sutra Advisory', role: 'CONSULTANT' as const, group: 'INDIAN_TRADITIONAL' as const, subCategory: 'vastu-consultant' },
  ]

  for (const n of NEIGHBOURS) {
    const nb = await prisma.user.upsert({
      where: { email: n.email },
      update: { status: 'ACTIVE', pincode: PIN },
      create: {
        email: n.email, name: n.name, role: n.role, status: 'ACTIVE',
        city: CITY, state: STATE, pincode: PIN,
      },
    })
    if (n.role === 'PROFESSIONAL') {
      await prisma.professionalProfile.upsert({
        where: { userId: nb.id },
        update: { isVerified: true },
        create: { userId: nb.id, designaType: n.designaType!, tier: n.tier!, isVerified: true },
      })
    } else {
      await prisma.consultantProfile.upsert({
        where: { userId: nb.id },
        update: { isVerified: true },
        create: { userId: nb.id, group: n.group!, subCategory: n.subCategory!, isVerified: true },
      })
    }
  }
  console.log(`  ${NEIGHBOURS.length} neighbours in ${PIN}`)

  // the BMF business record — `designaType` and `businessName` are required
  await prisma.bmfProfile.upsert({
    where: { userId: user.id },
    update: { businessName: 'Kumar Building Solutions', isVerified: true },
    create: {
      userId: user.id,
      businessName: 'Kumar Building Solutions',
      designaType: 'DESIGNI',
      isVerified: true,
      gstNumber: '07AAACK1234M1Z9',
    },
  })

  // start clean, so re-running does not stack duplicates up
  await prisma.post.deleteMany({ where: { authorId: user.id, slug: { startsWith: 'preview-bmf-' } } })
  await prisma.enquiry.deleteMany({ where: { holderId: user.id, subject: { in: LEADS.map((l) => l.subject) } } })
  await prisma.notification.deleteMany({ where: { userId: user.id, title: { in: NOTES.map((n) => n.title) } } })

  /*
   * The PACT, before the leads — each lead carries its `pactId`, which is
   * what separates a routed lead from one an RM assigned by hand.
   *
   * The guard matches the partial unique index written in migration
   * 20260826180000_pact_active_unique: (pincode, serviceType, subCategory)
   * where status is RESERVED or ACTIVE. Querying on holderId instead would
   * miss a seat held by somebody else and the create would throw P2002.
   */
  let pact = await prisma.pact.findFirst({
    where: {
      pincode: PIN, serviceType: 'BMF', subCategory: '-',
      status: { in: ['RESERVED', 'ACTIVE'] },
    },
  })
  if (!pact) {
    pact = await prisma.pact.create({
      data: {
        holderId: user.id, pincode: PIN, state: STATE, city: CITY,
        serviceType: 'BMF', status: 'ACTIVE',
        purchasedAt: daysAgo(400),
        expiresAt: new Date(Date.now() + 3650 * 86_400_000),
      },
    })
  } else if (pact.holderId !== user.id) {
    // somebody else already holds this seat — hand it over rather than
    // leaving the preview account with no leads at all
    pact = await prisma.pact.update({
      where: { id: pact.id },
      data: { holderId: user.id, status: 'ACTIVE' },
    })
  }

  for (const p of PRODUCTS) {
    await prisma.post.create({
      data: {
        type: 'PRODUCT', status: p.status, authorId: user.id,
        title: p.title, slug: slug(p.title),
        description: `${p.title} — supplied by Kumar Building Solutions. A preview listing used to review the dashboard design.`,
        category: p.category, subCategory: p.sub,
        city: CITY, state: STATE, pincode: PIN, year: 2025,
        viewCount: 0, // counts real visits only
        publishedAt: p.status === 'PUBLISHED' ? new Date() : null,
        media: {
          create: [{
            type: 'IMAGE',
            url: unsplash(p.photo, { w: 1600, h: 1200 }),
            fileName: `${slug(p.title)}.jpg`,
            mimeType: 'image/jpeg',
            sizeBytes: 0,
            sortOrder: 0,
          }],
        },
      },
    })
  }
  console.log(`  ${PRODUCTS.length} product listings`)

  for (const l of LEADS) {
    const createdAt = daysAgo(l.daysAgo)
    await prisma.enquiry.create({
      data: {
        clientId: client.id,
        holderId: user.id,
        // an RM-assigned lead carries no pactId — that is the difference the
        // "Total Leads (PACT)" tile counts
        pactId: l.viaPact === false ? null : pact.id,
        pincode: PIN, serviceType: 'BMF',
        subject: l.subject,
        message: `Preview lead: ${l.subject}. Please share rates and availability.`,
        contactName: l.name, contactPhone: '9800000000',
        budget: l.budget,
        status: l.status,
        createdAt,
        respondedAt:
          l.repliedAfter === undefined
            ? null
            : new Date(createdAt.getTime() + l.repliedAfter * 3_600_000),
        closedAt:
          l.status === 'CONVERTED' || l.status === 'CLOSED'
            ? new Date(createdAt.getTime() + 5 * 86_400_000)
            : null,
      },
    })
  }
  console.log(`  ${LEADS.length} leads`)

  for (const n of NOTES) {
    await prisma.notification.create({
      data: {
        userId: user.id, type: n.type, title: n.title, body: n.body,
        isRead: false, createdAt: hoursAgo(n.hoursAgo),
      },
    })
  }
  console.log(`  ${NOTES.length} notifications`)

  const plan = await prisma.clubMembership.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  })
  if (!plan) {
    await prisma.clubMembership.create({
      data: {
        userId: user.id, planName: 'Club Business',
        price: 7999, startsAt: daysAgo(120),
        expiresAt: new Date(Date.now() + 245 * 86_400_000),
      },
    })
  }

  console.log(`\nready: ${EMAIL} / ${PASSWORD}\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
