/**
 * A populated Professional account, so the dashboard can be looked at with
 * content in it rather than a screen of zeroes.
 *
 *   pnpm db:preview-pro
 *
 * ⚠️ Demo data. Everything here is invented — the studio, the projects, the
 *    enquiries and the people who sent them. It exists to review the design
 *    against the blueprint, not to seed a real account. The email is on a
 *    `.test` domain, which can never be a real address.
 */

import { PrismaClient, type PostStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PROJECT_PHOTOS, PRODUCT_PHOTOS, unsplash } from '../src/config/content-media'

const prisma = new PrismaClient()

const EMAIL = 'preview.pro@archfacing.test'
const PASSWORD = 'Preview@123'
const PIN = '110029'

type Seed = {
  title: string
  category: string
  sub: string
  status: PostStatus
  views: number
  photo: string
  city: string
  state: string
}

const PROJECTS: Seed[] = [
  { title: 'Villa in Aravali Hills', category: 'residential', sub: 'villas', status: 'PUBLISHED', views: 1256, photo: PROJECT_PHOTOS.villa, city: 'Gurugram', state: 'Haryana' },
  { title: 'Modern Farmhouse', category: 'residential', sub: 'high-end-projects', status: 'PENDING_REVIEW', views: 985, photo: PROJECT_PHOTOS.modernHouse, city: 'Alwar', state: 'Rajasthan' },
  { title: 'Commercial Complex', category: 'commercial-offices', sub: 'business-parks', status: 'DRAFT', views: 754, photo: PROJECT_PHOTOS.cityScale, city: 'Noida', state: 'Uttar Pradesh' },
  { title: 'Courtyard House, South Delhi', category: 'residential', sub: 'plotted-housing', status: 'PUBLISHED', views: 621, photo: PROJECT_PHOTOS.courtyardHouse, city: 'New Delhi', state: 'Delhi' },
  { title: 'Hillside Retreat', category: 'hospitality', sub: 'hotels', status: 'PUBLISHED', views: 512, photo: PROJECT_PHOTOS.retreat, city: 'Mussoorie', state: 'Uttarakhand' },
  { title: 'Lakeview Residences', category: 'residential', sub: 'group-housing', status: 'PUBLISHED', views: 431, photo: PROJECT_PHOTOS.poolVilla, city: 'Udaipur', state: 'Rajasthan' },
  { title: 'Riverfront Clubhouse', category: 'recreation', sub: 'clubs', status: 'REJECTED', views: 88, photo: PROJECT_PHOTOS.lobby, city: 'Pune', state: 'Maharashtra' },
]

const PRODUCTS: Seed[] = [
  { title: 'Brass Pendant Cluster', category: 'buildings-products', sub: 'interior-products', status: 'PUBLISHED', views: 402, photo: PRODUCT_PHOTOS.livingPendants, city: 'New Delhi', state: 'Delhi' },
  { title: 'Fluted Oak Wall Panel', category: 'buildings-products', sub: 'modern-materials', status: 'PUBLISHED', views: 361, photo: PRODUCT_PHOTOS.shelving, city: 'New Delhi', state: 'Delhi' },
  { title: 'Sculpted Dining Chair', category: 'buildings-products', sub: 'interior-products', status: 'PENDING_REVIEW', views: 244, photo: PRODUCT_PHOTOS.furniture, city: 'Jaipur', state: 'Rajasthan' },
  { title: 'Terrazzo Floor Tile', category: 'buildings-products', sub: 'construction-materials', status: 'PUBLISHED', views: 190, photo: PRODUCT_PHOTOS.flooring, city: 'Morbi', state: 'Gujarat' },
  { title: 'Matte Black Basin Set', category: 'buildings-products', sub: 'interior-products', status: 'DRAFT', views: 77, photo: PRODUCT_PHOTOS.basin, city: 'New Delhi', state: 'Delhi' },
]

const ENQUIRIES = [
  { subject: 'Luxury Villa Design in Gurugram', service: 'DESIGNA' as const, sub: 'residential', status: 'NEW' as const, name: 'Gaurav Mehta', hoursAgo: 2 },
  { subject: 'Interior Design for 3BHK Apartment', service: 'DESIGNI' as const, sub: 'interior', status: 'RESPONDED' as const, name: 'Neha Verma', hoursAgo: 26 },
  { subject: 'Landscape Design for Farmhouse', service: 'DESIGNA' as const, sub: 'landscaped', status: 'IN_PROGRESS' as const, name: 'Studio Earthscape', hoursAgo: 50 },
  { subject: 'Modern Office Building Design', service: 'DESIGNA' as const, sub: 'commercial-offices', status: 'NEW' as const, name: 'Design Build Corp.', hoursAgo: 74 },
  { subject: 'Vastu Consultation for Residence', service: 'DESIGNA' as const, sub: 'residential', status: 'CLOSED' as const, name: 'Rohit Sharma', hoursAgo: 122 },
]

const NOTES = [
  { type: 'POST_APPROVED', title: 'Your project "Villa in Aravali Hills" is now published.', body: 'It is live on the Projects listing.', hoursAgo: 1 },
  { type: 'NEW_ENQUIRY', title: 'New enquiry received for "Modern Office Building".', body: 'Respond within 24 hours to keep your response rate up.', hoursAgo: 3 },
  { type: 'PAYMENT_SUCCESS', title: 'Payment received for your Club Membership.', body: 'Your plan is active.', hoursAgo: 26 },
]

const slug = (s: string) =>
  'preview-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000)

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash, status: 'ACTIVE', role: 'PROFESSIONAL',
      mobile: '9811100029', addressLine: '12 Aurobindo Marg, Safdarjung Enclave',
      city: 'New Delhi', state: 'Delhi', pincode: PIN,
      // also on the update branch: without it a row created by anything else
      // keeps that date, and the banner reads "Member Since" yesterday
      createdAt: new Date('2024-01-12'),
    },
    create: {
      email: EMAIL, name: 'Ar. Ritu Sharma', role: 'PROFESSIONAL', status: 'ACTIVE',
      passwordHash, mobile: '9811100029',
      addressLine: '12 Aurobindo Marg, Safdarjung Enclave',
      city: 'New Delhi', state: 'Delhi', pincode: PIN,
      createdAt: new Date('2024-01-12'),
    },
  })

  /*
   * A separate account to be the client on every enquiry.
   *
   * `clientId` used to point back at the professional, so their own name
   * showed as the contact on every lead they received, and the same five rows
   * appeared under both "My Enquiry" (received) and "My Consultation" (sent).
   */
  const client = await prisma.user.upsert({
    where: { email: 'preview.pro.client@archfacing.test' },
    update: { status: 'ACTIVE' },
    create: {
      email: 'preview.pro.client@archfacing.test',
      name: 'Preview Client', role: 'CLIENT', status: 'ACTIVE',
      city: 'New Delhi', state: 'Delhi', pincode: PIN,
    },
  })

  // start clean, so re-running does not stack duplicates up
  await prisma.post.deleteMany({ where: { authorId: user.id, slug: { startsWith: 'preview-' } } })
  await prisma.enquiry.deleteMany({ where: { holderId: user.id, subject: { in: ENQUIRIES.map((e) => e.subject) } } })
  await prisma.notification.deleteMany({ where: { userId: user.id, title: { in: NOTES.map((n) => n.title) } } })

  async function post(rows: Seed[], type: 'PROJECT' | 'PRODUCT', photos: 'project' | 'product') {
    for (const r of rows) {
      await prisma.post.create({
        data: {
          type, status: r.status, authorId: user.id,
          title: r.title, slug: slug(r.title),
          description: `${r.title} — a preview posting used to review the dashboard design.`,
          category: r.category, subCategory: r.sub,
          city: r.city, state: r.state, pincode: PIN, year: 2025,
          viewCount: 0, // counts real visits only
          publishedAt: r.status === 'PUBLISHED' ? new Date() : null,
          media: {
            create: [{
              type: 'IMAGE',
              url: unsplash(r.photo, { w: 1600, h: 1200 }),
              fileName: `${slug(r.title)}.jpg`,
              mimeType: 'image/jpeg',
              sizeBytes: 0,
              sortOrder: 0,
            }],
          },
        },
      })
    }
    console.log(`  ${rows.length} ${photos} postings`)
  }

  await post(PROJECTS, 'PROJECT', 'project')
  await post(PRODUCTS, 'PRODUCT', 'product')

  for (const e of ENQUIRIES) {
    await prisma.enquiry.create({
      data: {
        clientId: client.id, holderId: user.id,
        pincode: PIN, serviceType: e.service, subCategory: e.sub,
        subject: e.subject,
        message: `Preview enquiry for ${e.subject}.`,
        contactName: e.name, contactPhone: '9800000000',
        status: e.status, createdAt: hoursAgo(e.hoursAgo),
      },
    })
  }
  console.log(`  ${ENQUIRIES.length} enquiries`)

  for (const n of NOTES) {
    await prisma.notification.create({
      data: {
        userId: user.id, type: n.type, title: n.title, body: n.body,
        isRead: false, createdAt: hoursAgo(n.hoursAgo),
      },
    })
  }
  console.log(`  ${NOTES.length} notifications`)

  // a PACT and a Club plan, so the rail cards have something to show
  const existingPact = await prisma.pact.findFirst({
    where: { holderId: user.id, pincode: PIN },
  })
  if (!existingPact) {
    await prisma.pact.create({
      data: {
        holderId: user.id, pincode: PIN, state: 'Delhi', city: 'New Delhi',
        serviceType: 'DESIGNA', subCategory: 'architects', status: 'ACTIVE',
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 3650 * 86_400_000),
      },
    })
  }

  const plan = await prisma.clubMembership.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  })
  if (!plan) {
    await prisma.clubMembership.create({
      data: {
        userId: user.id, planName: 'Club Professional',
        price: 4999, startsAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
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
