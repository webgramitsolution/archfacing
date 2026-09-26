/**
 * Five more published articles, so the blog stops being a single page.
 *
 *   npx tsx prisma/seed-blog-neighbours.ts
 *
 * The detail page's Previous / Next pair reads `publishedAt` either side of the
 * article being viewed, and Related Posts reads the same category — with one
 * article in the database both come back empty and the design collapses. These
 * five put a neighbour on each side of the green-building article and three
 * more in its category.
 *
 * Idempotent: upserts by slug.
 */

import { PrismaClient } from '@prisma/client'
import type { Block } from '../src/lib/content'

const prisma = new PrismaClient()

const ANCHOR = 'the-future-of-green-building-sustainable-architecture-in-india'

type Draft = {
  slug: string
  title: string
  category: string
  subCategory: string
  hero: string
  excerpt: string
  tags: string[]
  /** days relative to the anchor — negative is older, positive is newer */
  offsetDays: number
  blocks: Block[]
}

const DRAFTS: Draft[] = [
  {
    slug: 'modern-home-design-trends-for-2024',
    title: 'Modern Home Design Trends for 2024',
    category: 'learning-reading',
    subCategory: 'residential',
    hero: '/uploads/blog/hero-trends.jpg',
    excerpt:
      'Exposed structure, warmer materials and rooms that earn their floor area — what Indian ' +
      'homeowners actually asked for this year, and what their architects quietly stopped drawing.',
    tags: ['Design Trends', 'Residential', 'Interiors', 'Materials'],
    offsetDays: -1,
    blocks: [
      {
        type: 'lead',
        text:
          'The brief that arrives at an Indian architecture practice in 2024 looks different from ' +
          'the one that arrived in 2019. The square footage has not grown. What has changed is ' +
          'what clients are willing to spend it on.',
      },
      {
        type: 'para',
        text:
          'Three things drive the shift: the cost of finishing a house has risen faster than the ' +
          'cost of building one, a generation that worked from home for two years now knows what ' +
          'it actually needs from a room, and material lead times have taught everyone to design ' +
          'around what is available locally.',
      },
      { type: 'heading', number: 1, level: 2, text: 'What clients are asking for' },
      {
        type: 'para',
        text:
          'The requests have become specific. Fewer rooms, better ones. Storage designed in rather ' +
          'than bought later. And a visible preference for surfaces that age well over surfaces ' +
          'that photograph well on day one.',
      },
      {
        type: 'iconGrid',
        title: 'Four shifts showing up in almost every brief',
        columns: 4,
        items: [
          {
            icon: 'home',
            title: 'Fewer, larger rooms',
            body: 'Plans consolidating instead of subdividing',
          },
          {
            icon: 'sun',
            title: 'Daylight as a spec',
            body: 'Window area and orientation argued at concept stage',
          },
          {
            icon: 'leaf',
            title: 'Honest materials',
            body: 'Exposed brick, lime plaster, local stone, real timber',
          },
          {
            icon: 'bolt',
            title: 'Running cost first',
            body: 'Clients asking for the electricity bill before the render',
          },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'What has quietly gone away' },
      {
        type: 'para',
        text:
          'False ceilings across every room, cove lighting for its own sake, and the all-white ' +
          'palette that needed repainting every eighteen months. None of them disappeared on ' +
          'principle — they disappeared because clients priced the maintenance.',
      },
      {
        type: 'quote',
        text:
          'The most durable trend in Indian housing is not a look. It is the slow return of ' +
          'materials that a local mason already knows how to repair.',
      },
    ],
  },

  {
    slug: 'how-biophilic-design-connects-people-with-nature',
    title: 'How Biophilic Design Connects People with Nature',
    category: 'research-development',
    subCategory: 'passive-design',
    hero: '/uploads/blog/hero-biophilic.jpg',
    excerpt:
      'Biophilic design is not a wall of plants. It is daylight, air movement, view and material ' +
      'texture — decided in plan, not bought at the end of the project.',
    tags: ['Biophilic Design', 'Wellbeing', 'Daylight', 'Sustainability'],
    offsetDays: 1,
    blocks: [
      {
        type: 'lead',
        text:
          'Ask most developers what biophilic design costs and they will quote you a vertical ' +
          'garden. Ask an architect who has delivered one and they will start with the window ' +
          'sizes, because that is where the effect actually comes from.',
      },
      {
        type: 'para',
        text:
          'The research behind the term is about contact with natural systems — light that changes ' +
          'through the day, air that moves, a view further than the next wall, and surfaces that ' +
          'feel like something. Planting is one of the levers, and the cheapest to fake.',
      },
      { type: 'heading', number: 1, level: 2, text: 'The levers that are free' },
      {
        type: 'para',
        text:
          'Orientation, plan depth, opening position and ceiling height are all settled in the ' +
          'first week of design and cost nothing to get right. They also cannot be retrofitted, ' +
          'which is why the projects that feel best are rarely the ones with the biggest planting ' +
          'budget.',
      },
      {
        type: 'iconGrid',
        title: 'What actually moves the needle',
        columns: 3,
        items: [
          {
            icon: 'sun',
            title: 'Daylight that changes',
            body: 'Two-sided light beats one big window every time',
          },
          {
            icon: 'wind',
            title: 'Air you can feel',
            body: 'Cross ventilation keeps a room alive without a fan',
          },
          {
            icon: 'globe',
            title: 'A view with depth',
            body: 'Something further than three metres to rest the eye on',
          },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'Where the money should go' },
      {
        type: 'para',
        text:
          'If there is a budget for planting, spend it where people stop — the entrance, the stair ' +
          'landing, the edge of the workspace. Planting on a facade nobody stands near is a ' +
          'maintenance contract, not a design move.',
      },
      {
        type: 'cards',
        title: 'What a biophilic brief buys',
        items: [
          { icon: 'heart', title: 'Better reported wellbeing' },
          { icon: 'bolt', title: 'Lower lighting load' },
          { icon: 'wind', title: 'Fewer hours of mechanical cooling' },
          { icon: 'trending', title: 'Space that lets faster' },
        ],
      },
      {
        type: 'quote',
        text:
          'A room with a window on two walls will do more for the people in it than any amount of ' +
          'greenery bolted to the outside.',
      },
    ],
  },

  {
    slug: 'top-10-sustainable-building-materials-in-2024',
    title: 'Top 10 Sustainable Building Materials in 2024',
    category: 'research-development',
    subCategory: 'green-building',
    hero: '/uploads/blog/hero-materials.jpg',
    excerpt:
      'Fly-ash block, bamboo, mass timber, lime, recycled steel — what is genuinely available to an ' +
      'Indian site today, and what is still a conference slide.',
    tags: ['Materials', 'Embodied Carbon', 'Supply Chain', 'Sustainability'],
    offsetDays: -5,
    blocks: [
      {
        type: 'lead',
        text:
          'Embodied carbon is roughly a quarter of a building’s lifetime emissions, and unlike ' +
          'operational energy you cannot fix it later. The material list is decided once.',
      },
      {
        type: 'para',
        text:
          'The useful question for an Indian project is not which material has the best ' +
          'environmental product declaration. It is which one a contractor within 200 kilometres ' +
          'can supply at a price that survives the tender. On that test the list gets short quickly.',
      },
      { type: 'heading', number: 1, level: 2, text: 'Available now, at scale' },
      {
        type: 'para',
        text:
          'Fly-ash and AAC blocks, lime and pozzolana-blended cements, recycled structural steel, ' +
          'and engineered bamboo are all shipping in commercial quantities today. Mass timber is ' +
          'real but still imported for most of the country, which eats into the saving.',
      },
      {
        type: 'iconGrid',
        title: 'How to read a material claim',
        columns: 3,
        items: [
          {
            icon: 'globe',
            title: 'Embodied carbon',
            body: 'Per kilogram, and per unit of the job it actually does',
          },
          {
            icon: 'recycle',
            title: 'Recycled content',
            body: 'Post-consumer counts; factory offcuts barely do',
          },
          {
            icon: 'award',
            title: 'Third-party verified',
            body: 'A declaration nobody audited is a brochure',
          },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'What to be careful with' },
      {
        type: 'para',
        text:
          'A low-carbon material trucked 1,400 kilometres stops being low-carbon. A recycled ' +
          'product that fails in eight years costs more than the one it replaced. Durability and ' +
          'distance belong in the same conversation as the carbon figure.',
      },
      {
        type: 'quote',
        text:
          'The lowest-carbon material on any Indian site is usually the one that came from the ' +
          'district next door and will still be standing in fifty years.',
      },
    ],
  },

  {
    slug: 'biophilic-design-bringing-nature-into-architecture',
    title: 'Biophilic Design: Bringing Nature into Architecture',
    category: 'research-development',
    subCategory: 'passive-design',
    hero: '/uploads/blog/hero-nature.jpg',
    excerpt:
      'Courtyards, verandahs and deep overhangs did this work in Indian building for centuries. ' +
      'A look at what the traditional plan already solved.',
    tags: ['Biophilic Design', 'Courtyards', 'Vernacular', 'Passive Design'],
    offsetDays: -8,
    blocks: [
      {
        type: 'lead',
        text:
          'Before biophilic design had a name, the Indian courtyard house had already settled the ' +
          'problem: put the outside in the middle, and every room gets light, air and a view ' +
          'without a single mechanical system.',
      },
      {
        type: 'para',
        text:
          'The courtyard, the verandah and the deep overhang are a matched set. The courtyard ' +
          'brings light and stack ventilation into the plan, the verandah gives a shaded edge that ' +
          'is neither in nor out, and the overhang keeps summer sun off the wall while letting ' +
          'winter sun reach it.',
      },
      { type: 'heading', number: 1, level: 2, text: 'Why the plan was shaped that way' },
      {
        type: 'para',
        text:
          'It was not aesthetics. A one-room-deep plan around a court means no room needs borrowed ' +
          'light, and hot air has somewhere to go. The same geometry appears from Kerala to ' +
          'Rajasthan with different materials and the same logic.',
      },
      {
        type: 'iconGrid',
        title: 'What the traditional plan delivered',
        columns: 3,
        items: [
          { icon: 'sun', title: 'Daylight to every room', body: 'A plan one room deep, all round' },
          { icon: 'wind', title: 'Stack ventilation', body: 'The court pulling warm air upward' },
          { icon: 'droplet', title: 'Water in the plan', body: 'Collection at the centre, not the edge' },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'Bringing it into a modern plot' },
      {
        type: 'para',
        text:
          'Plot sizes have shrunk and the full courtyard rarely fits. What survives the shrink is ' +
          'the light well, the double-height stair, and the shaded edge — all of which do a version ' +
          'of the same job on a fifteen-hundred-square-foot plot.',
      },
      {
        type: 'quote',
        text:
          'The courtyard house was not built to connect people with nature. It was built because ' +
          'it worked, and connection was what that felt like.',
      },
    ],
  },

  {
    slug: 'smart-homes-and-green-technology-the-perfect-match',
    title: 'Smart Homes and Green Technology: The Perfect Match',
    category: 'technical-papers',
    subCategory: 'building-systems',
    hero: '/uploads/blog/hero-smart.jpg',
    excerpt:
      'Automation only saves energy in a building that was designed to use less of it. What to ' +
      'specify, in what order, and what to leave out.',
    tags: ['Smart Homes', 'Automation', 'Energy', 'Building Systems'],
    offsetDays: -12,
    blocks: [
      {
        type: 'lead',
        text:
          'A smart thermostat on a badly insulated house is a very precise way of watching energy ' +
          'leave. Automation is a multiplier — it makes a good envelope better and a bad one ' +
          'measurable.',
      },
      {
        type: 'para',
        text:
          'That ordering matters commercially as well as technically. The envelope is the part of ' +
          'the building that cannot be upgraded once the plaster is on; the controls can be ' +
          'replaced twice a decade and usually are.',
      },
      { type: 'heading', number: 1, level: 2, text: 'The order to spend in' },
      {
        type: 'para',
        text:
          'Envelope first: orientation, shading, glazing, insulation. Then equipment that is sized ' +
          'correctly rather than oversized. Then generation, usually rooftop solar. Controls last, ' +
          'because their job is to run the first three well.',
      },
      {
        type: 'cards',
        title: 'What earns its place',
        items: [
          { icon: 'bolt', title: 'Circuit-level metering' },
          { icon: 'sun', title: 'Solar with a real export path' },
          { icon: 'wind', title: 'Demand-controlled ventilation' },
          { icon: 'coins', title: 'Time-of-use scheduling' },
          { icon: 'shield', title: 'Local control that survives the internet' },
        ],
      },
      { type: 'heading', number: 2, level: 2, text: 'What to leave out' },
      {
        type: 'para',
        text:
          'Anything that stops working when a vendor changes its business model. A house is a ' +
          'forty-year asset and most home-automation companies are not. Specify systems that ' +
          'degrade to a normal switch when the cloud goes away.',
      },
      {
        type: 'quote',
        text:
          'Automation should be the last thing you add to a green building, and the first thing ' +
          'you can take out without the building failing.',
      },
    ],
  },
]

async function main() {
  const anchor = await prisma.post.findUnique({
    where: { slug: ANCHOR },
    select: { id: true, publishedAt: true, authorId: true },
  })

  if (!anchor?.publishedAt) {
    console.log(`\nNo published article at "${ANCHOR}" — run the blog flow first.\n`)
    return
  }

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })

  for (const d of DRAFTS) {
    const publishedAt = new Date(anchor.publishedAt.getTime() + d.offsetDays * 86_400_000)

    const meta = {
      body: d.blocks,
      excerpt: d.excerpt,
      heroImage: d.hero,
      // The public page reads these strings, not post.media[0].url — an article
      // that skips them falls back to a placeholder SVG.
      cardImage: d.hero,
      thumbImage: d.hero,
      tags: d.tags,
      authorRole: 'Sustainability Consultant',
      subCategory: d.subCategory,
    }

    const common = {
      title: d.title,
      description: d.excerpt,
      category: d.category,
      meta: meta as never,
      status: 'PUBLISHED' as const,
      publishedAt,
      reviewedById: admin?.id ?? null,
      reviewedAt: publishedAt,
      rejectionReason: null,
      deletedAt: null,
    }

    await prisma.post.upsert({
      where: { slug: d.slug },
      create: { ...common, slug: d.slug, type: 'BLOG', authorId: anchor.authorId },
      update: common,
    })

    console.log(`  ${publishedAt.toISOString().slice(0, 10)}  ${d.title}`)
  }

  const total = await prisma.post.count({
    where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null },
  })
  console.log(`\n${total} published blogs.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
