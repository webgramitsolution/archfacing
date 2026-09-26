/**
 * Four demo blogs, one per role that may write one.
 *
 *   pnpm db:blog-demo
 *
 * They exist to show the Blog Builder's output end to end: between them they
 * use every one of the twelve section types, so the public renderer and the
 * dashboard preview can both be checked against something real.
 *
 * ⚠️ Demo data. The authors, the studios and the claims in these articles are
 *    invented. Each is written in exactly the shape `saveBlogAction` produces,
 *    so opening one in the builder and saving it again changes nothing.
 */

import { PrismaClient, Prisma, type Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ARTICLE_PHOTOS, PERSON_PHOTOS, unsplash } from '../src/config/content-media'

const prisma = new PrismaClient()

const PASSWORD = 'Preview@123'

// Prisma's own JSON object type — a plain Record does not satisfy the
// `InputJsonValue` index signature that `Post.meta` expects
type Block = Prisma.InputJsonObject

type Demo = {
  slug: string
  title: string
  category: string
  categoryLabel: string
  excerpt: string
  hero: string
  tags: string[]
  readMinutes: number
  daysAgo: number
  authorRole: string
  /** the account that writes it — created if it is not there already */
  author: { email: string; name: string; role: Role; photo: string; city: string; state: string }
  body: Block[]
}

const AUTHORS = {
  professional: {
    email: 'demo.blog.pro@archfacing.test',
    name: 'Ar. Ritu Sharma',
    role: 'PROFESSIONAL' as Role,
    photo: PERSON_PHOTOS.rituSharma,
    city: 'Bengaluru',
    state: 'Karnataka',
  },
  consultant: {
    email: 'demo.blog.consultant@archfacing.test',
    name: 'Er. Vikram Patel',
    role: 'CONSULTANT' as Role,
    photo: PERSON_PHOTOS.vikramPatel,
    city: 'Pune',
    state: 'Maharashtra',
  },
  bmf: {
    email: 'demo.blog.bmf@archfacing.test',
    name: 'Amit Kumar',
    role: 'BMF' as Role,
    photo: PERSON_PHOTOS.amitSingh,
    city: 'New Delhi',
    state: 'Delhi',
  },
  corporate: {
    email: 'demo.blog.corporate@archfacing.test',
    name: 'Neha Verma',
    role: 'CORPORATE' as Role,
    photo: PERSON_PHOTOS.nehaVerma,
    city: 'Ahmedabad',
    state: 'Gujarat',
  },
}

const BLOGS: Demo[] = [
  // ─── 1. Professional — headings, lead, icon grid, image grid, cards, quote ───
  {
    slug: 'daylight-first-planning-indian-homes',
    title: 'Daylight-First Planning for Indian Homes',
    category: 'learning-reading',
    categoryLabel: 'Learning and Reading',
    excerpt:
      'Orientation, openings and shade do more for comfort than any fitting you can buy afterwards.',
    hero: ARTICLE_PHOTOS.naturalLighting,
    tags: ['Daylight', 'Passive Design', 'Residential'],
    readMinutes: 7,
    daysAgo: 3,
    authorRole: 'Environment Artist',
    author: AUTHORS.professional,
    body: [
      {
        type: 'lead',
        text: 'A house that is planned around the sun costs **nothing extra to build** and everything less to run. Orientation, opening size and shade are decided on the first sheet of drawings — and cannot be bought back later.',
      },
      { type: 'heading', number: 1, level: 2, text: 'Start with the sun, not the plot boundary' },
      {
        type: 'para',
        text: 'The instinct is to fill the plot and then cut windows where the rooms happen to land. Turning the plan a few degrees first, so the long face reads north, changes the light in every room for the life of the building.',
      },
      {
        type: 'iconGrid',
        columns: 3,
        items: [
          { icon: 'map', title: 'Orientation', body: 'The long face north, the short face west.' },
          { icon: 'grid', title: 'Opening size', body: 'Sized by room depth, not by elevation.' },
          { icon: 'shield', title: 'Shade', body: 'Overhangs cut by latitude, not by habit.' },
          { icon: 'box', title: 'Cross ventilation', body: 'Two openings per room, on different walls.' },
          { icon: 'chart', title: 'Glare control', body: 'Light bounced off a surface, never direct.' },
          { icon: 'clock', title: 'Thermal lag', body: 'Mass where the afternoon sun lands.' },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'What it looks like built' },
      {
        type: 'imageGrid',
        title: 'Three houses, three answers',
        columns: 3,
        items: [
          { image: ARTICLE_PHOTOS.glassLiving, caption: 'North glazing, Bengaluru' },
          { image: ARTICLE_PHOTOS.loft, caption: 'Stair-well light shaft' },
          { image: ARTICLE_PHOTOS.livingRoom, caption: 'Deep verandah, Chennai' },
        ],
      },
      { type: 'heading', number: 3, level: 2, text: 'What the client actually gets' },
      {
        type: 'cards',
        items: [
          { icon: 'rupee', title: 'Lower running cost' },
          { icon: 'star', title: 'Even, glare-free light' },
          { icon: 'shield', title: 'Cooler afternoons' },
          { icon: 'check', title: 'Fewer fittings' },
          { icon: 'chart', title: 'Better resale' },
        ],
      },
      {
        type: 'quote',
        text: 'A window put in the right wall is worth more than three put in the wrong one.',
      },
      {
        type: 'cta',
        title: 'Planning a home this year?',
        body: 'Talk to an architect who holds the PACT for your PIN code.',
        buttonText: 'Consult Nearby',
        buttonUrl: '/consult-nearby',
      },
    ],
  },

  // ─── 2. Consultant — bullets, numbered, single image ───
  {
    slug: 'structural-checks-before-you-pour',
    title: 'Five Structural Checks to Make Before You Pour',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    excerpt:
      'Once the concrete is in, everything below it is a demolition job. These are the checks worth an extra day.',
    hero: ARTICLE_PHOTOS.construction,
    tags: ['Structure', 'Site Supervision', 'Concrete'],
    readMinutes: 6,
    daysAgo: 9,
    authorRole: 'Civil Engineer',
    author: AUTHORS.consultant,
    body: [
      {
        type: 'lead',
        text: 'Concrete is unforgiving. Every mistake under a slab becomes a *demolition* job rather than a correction, so the hour before the pour is the cheapest hour on the whole site.',
      },
      { type: 'heading', level: 2, text: 'The short list' },
      {
        type: 'bullets',
        items: [
          'Cover blocks under every bar, not only the ones you can see',
          'Lap lengths measured, not eyeballed',
          'Conduits and sleeves in place and capped',
          'Formwork props on a firm base, not on loose fill',
          'A tested cube from the same batch, not from a different truck',
        ],
      },
      { type: 'heading', number: 1, level: 2, text: 'Working through them' },
      {
        type: 'numbered',
        items: [
          {
            title: 'Cover',
            body: 'Insufficient cover is the single commonest cause of early corrosion in Indian coastal work. Blocks every 600mm, both directions.',
          },
          {
            title: 'Laps',
            body: 'A lap that is short by 100mm is invisible once poured and halves the joint. Mark and measure — do not trust a bundle count.',
          },
          {
            title: 'Services',
            body: 'A conduit chased in afterwards cuts the very bars the designer sized. Anything that has to pass through the slab goes in first.',
          },
        ],
      },
      {
        type: 'image',
        image: ARTICLE_PHOTOS.materials,
        caption: 'Cover blocks laid out before the pour — twenty minutes, ten years of life',
        alt: 'A worker placing cover blocks under reinforcement bars',
        width: 'full',
      },
      {
        type: 'quote',
        text: 'The cheapest hour on any site is the hour before the concrete truck arrives.',
      },
    ],
  },

  // ─── 3. BMF — icon grid, pills, image grid, CTA ───
  {
    slug: 'choosing-vitrified-tiles-that-last',
    title: 'Choosing Vitrified Tiles That Actually Last',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    excerpt:
      'Water absorption, PEI rating and rectification tell you more about a tile than any showroom sample board.',
    hero: ARTICLE_PHOTOS.materials,
    tags: ['Tiles', 'Materials', 'Specification'],
    readMinutes: 5,
    daysAgo: 16,
    authorRole: 'Building Materials Facilitator',
    author: AUTHORS.bmf,
    body: [
      {
        type: 'lead',
        text: 'Two tiles at the same price can differ by a decade in service life. The numbers that matter are printed on the box and almost never discussed in the showroom.',
      },
      { type: 'heading', number: 1, level: 2, text: 'The three numbers on the box' },
      {
        type: 'iconGrid',
        columns: 3,
        items: [
          {
            icon: 'box',
            title: 'Water absorption',
            body: 'Under 0.5% is fully vitrified. Anything above is not.',
          },
          {
            icon: 'shield',
            title: 'PEI rating',
            body: 'PEI 4 for a hallway, PEI 3 for a bedroom.',
          },
          {
            icon: 'grid',
            title: 'Rectified edge',
            body: 'A machine-cut edge lets you lay a 2mm joint.',
          },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'Where each one belongs' },
      {
        type: 'imageGrid',
        columns: 2,
        items: [
          { image: ARTICLE_PHOTOS.interiorTrends, caption: 'Matt, PEI 4 — living areas' },
          { image: ARTICLE_PHOTOS.comfortLiving, caption: 'Polished, PEI 3 — bedrooms' },
        ],
      },
      {
        type: 'pills',
        items: [
          { icon: 'check', text: 'Ask for the batch number' },
          { icon: 'check', text: 'Order 8% extra' },
          { icon: 'check', text: 'Check the shade code' },
          { icon: 'check', text: 'See a laid sample' },
        ],
      },
      {
        type: 'cta',
        title: 'Need rates for your PIN code?',
        body: 'Materials enquiries go to the facilitator who holds your area.',
        buttonText: 'Send an enquiry',
        buttonUrl: '/consult-nearby',
      },
    ],
  },

  // ─── 4. Corporate — headings, paragraphs, cards, numbered ───
  {
    slug: 'specifying-for-a-fifty-year-building',
    title: 'Specifying for a Fifty-Year Building',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    excerpt:
      'Whole-life cost changes almost every specification decision — and almost nobody calculates it.',
    hero: ARTICLE_PHOTOS.greenBuilding,
    tags: ['Whole-life Cost', 'Specification', 'Sustainability'],
    readMinutes: 8,
    daysAgo: 24,
    authorRole: 'Head of Specification',
    author: AUTHORS.corporate,
    body: [
      {
        type: 'lead',
        text: 'A building is bought once and paid for every month for fifty years. Specification decisions made on first cost alone almost always lose that arithmetic.',
      },
      { type: 'heading', number: 1, level: 2, text: 'First cost is the smallest number' },
      {
        type: 'para',
        text: 'Across a fifty-year life, construction is typically a fifth of what the building costs its owner. Operation, maintenance and replacement carry the rest — and every one of them is fixed at specification stage.',
      },
      {
        type: 'cards',
        title: 'Where the money actually goes',
        items: [
          { icon: 'rupee', title: 'Energy', body: 'Largest single line' },
          { icon: 'settings', title: 'Maintenance', body: 'Rises with complexity' },
          { icon: 'clock', title: 'Replacement', body: 'Driven by the weakest part' },
          { icon: 'shield', title: 'Repair', body: 'Concentrated in the envelope' },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'Three questions to ask of every line' },
      {
        type: 'numbered',
        items: [
          { title: 'How long does it last?', body: 'A component replaced twice costs three times.' },
          { title: 'Who maintains it?', body: 'If it needs a specialist, the owner will skip it.' },
          { title: 'What happens when it fails?', body: 'A failure behind cladding is not a repair.' },
        ],
      },
      {
        type: 'quote',
        text: 'Nobody has ever regretted over-specifying the parts of a building they cannot reach.',
      },
      { type: 'heading', level: 3, text: 'A note on procurement' },
      {
        type: 'para',
        text: 'Lowest-tender procurement rewards the first number and ignores the other four. Where whole-life cost is written into the brief, the specification survives value engineering — see the [ArchFacing membership plans](/membership) for how corporate accounts publish their standards.',
      },
    ],
  },
]

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000)

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  for (const b of BLOGS) {
    const a = b.author

    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { status: 'ACTIVE', role: a.role },
      create: {
        email: a.email,
        name: a.name,
        role: a.role,
        status: 'ACTIVE',
        passwordHash,
        city: a.city,
        state: a.state,
        pincode: '110029',
        createdAt: daysAgo(700),
      },
    })

    /*
     * A Professional needs its profile row for the article's author card to
     * show a verified tick and a firm name. The other roles have their own
     * profile tables and the card falls back gracefully without them.
     */
    if (a.role === 'PROFESSIONAL' || a.role === 'CONSULTANT') {
      if (a.role === 'PROFESSIONAL') {
        await prisma.professionalProfile.upsert({
          where: { userId: user.id },
          update: { isVerified: true },
          create: {
            userId: user.id,
            designaType: 'DESIGNA',
            tier: 'PROFESSIONAL',
            firmName: 'Green Creations Studio',
            isVerified: true,
          },
        })
      } else {
        await prisma.consultantProfile.upsert({
          where: { userId: user.id },
          update: { isVerified: true },
          create: {
            userId: user.id,
            group: 'ENGINEERING',
            subCategory: 'structural-engineer',
            firmName: 'Patel Structural Consultants',
            isVerified: true,
          },
        })
      }
    }

    const published = daysAgo(b.daysAgo)

    /*
     * Exactly the shape `saveBlogAction` writes — including mirroring the hero
     * into `cardImage` and `thumbImage`, which is what the listing card and the
     * sidebar thumbnail read. Miss those and every card shows the fallback SVG.
     */
    const meta = {
      kind: 'blog',
      excerpt: b.excerpt,
      readMinutes: b.readMinutes,
      categoryLabel: b.categoryLabel,
      heroImage: unsplash(b.hero, { w: 1200, h: 675 }),
      cardImage: unsplash(b.hero, { w: 600, h: 400 }),
      thumbImage: unsplash(b.hero, { w: 160, h: 120 }),
      authorRole: b.authorRole,
      authorPhoto: unsplash(a.photo, { w: 96, h: 96 }),
      tags: b.tags,
      seoTitle: b.title,
      seoDescription: b.excerpt.slice(0, 180),
      body: b.body,
    }

    await prisma.post.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        description: b.excerpt,
        category: b.category,
        status: 'PUBLISHED',
        publishedAt: published,
        writtenBy: a.name,
        meta,
      },
      create: {
        type: 'BLOG',
        status: 'PUBLISHED',
        authorId: user.id,
        title: b.title,
        slug: b.slug,
        description: b.excerpt,
        category: b.category,
        writtenBy: a.name,
        viewCount: 0, // counts real visits only
        publishedAt: published,
        createdAt: published,
        meta,
      },
    })

    console.log(`  ${a.role.padEnd(12)} ${b.title}`)
  }

  console.log(`\n${BLOGS.length} demo blogs ready — /blog\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
