/**
 * Blog articles and podcast episodes.
 *
 *   pnpm db:content
 *
 * Both live in the shared `Post` table (types BLOG and PODCAST). Anything
 * specific to one of them goes in `Post.meta`, which is why that column
 * exists — see `src/lib/content.ts` for the shape and the parser.
 *
 * Dates keep the day and month from the design but sit in the current year,
 * so "Latest Articles" and "Latest Episodes" are never showing content that
 * is two years stale.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { ARTICLE_PHOTOS, PERSON_PHOTOS } from '../src/config/content-media'
import { unsplash } from '../src/config/club-media'
import { ARTICLE_BODIES } from './article-bodies'

const prisma = new PrismaClient()

const YEAR = new Date().getFullYear()
/**
 * A publish timestamp.
 *
 * ⚠️ The `hour` argument exists so no two articles share a timestamp. Previous/next
 *    navigation compares publishedAt with a strict < and >, so two articles
 *    published at the same instant make each other unreachable — the reader
 *    hits a dead end with no Next Post link.
 */
const on = (month: number, day: number, hour = 10) =>
  new Date(YEAR, month - 1, day, hour, 0, 0, 0)

// ═══════════════════════════════════════════════════════════
//  Authors — real User rows, so the article byline links somewhere
// ═══════════════════════════════════════════════════════════

const AUTHORS = [
  { key: 'ritu', name: 'Ar. Ritu Sharma', email: 'ritu.sharma@authors.archfacing.com', role: 'Environment Artist',
    firm: 'Green Creations Studio', city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
    photo: PERSON_PHOTOS.rituSharma },
  { key: 'anjali', name: 'Ar. Anjali Mehta', email: 'anjali.mehta@authors.archfacing.com', role: 'Interior Designer',
    firm: 'Mehta Interiors', city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
    photo: PERSON_PHOTOS.anjaliMehta },
  { key: 'vikram', name: 'Er. Vikram Patel', email: 'vikram.patel@authors.archfacing.com', role: 'Civil Engineer',
    firm: 'Patel Structures', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001',
    photo: PERSON_PHOTOS.vikramPatel },
  { key: 'neha', name: 'Ar. Neha Verma', email: 'neha.verma@authors.archfacing.com', role: 'Architect',
    firm: 'Verma & Partners', city: 'New Delhi', state: 'Delhi', pincode: '110001',
    photo: PERSON_PHOTOS.nehaVerma },
  { key: 'amit', name: 'Amit Singh', email: 'amit.singh@authors.archfacing.com', role: 'Automation Expert',
    firm: 'SmartSpace Systems', city: 'Pune', state: 'Maharashtra', pincode: '411001',
    photo: PERSON_PHOTOS.amitSingh },
  { key: 'pooja', name: 'Ar. Pooja Nair', email: 'pooja.nair@authors.archfacing.com', role: 'Landscape Architect',
    firm: 'Terra Landscape', city: 'Kochi', state: 'Kerala', pincode: '682001',
    photo: PERSON_PHOTOS.poojaNair },
]

// ═══════════════════════════════════════════════════════════
//  Blog
// ═══════════════════════════════════════════════════════════

/** The lead article, expanded into the full block body the single page renders. */
const FEATURE_BODY = [
  { type: 'lead', text: "Green building is no longer just a trend; it's a necessity. As the world faces climate change and environmental challenges, sustainable architecture is becoming the key to a better, healthier, and more resilient future." },
  { type: 'para', text: 'From energy-efficient designs to eco-friendly materials, green buildings reduce carbon footprints while improving the quality of life for occupants. In this article, we explore how sustainable architecture is shaping the cities of tomorrow.' },

  { type: 'heading', number: 1, text: 'What is Green Building?' },
  { type: 'para', text: 'Green building refers to the practice of creating structures that are environmentally responsible and resource-efficient throughout their life cycle — from planning and design to construction, operation, maintenance, and demolition.' },
  { type: 'para', text: 'It focuses on:' },
  {
    type: 'iconGrid',
    // six across, as the reference draws it
    columns: 6,
    items: [
      { icon: 'settings', title: 'Energy Efficiency', body: 'Using less energy for everyday operations.' },
      { icon: 'shield', title: 'Indoor Environmental Quality', body: 'Improving air quality, natural light, and occupant comfort.' },
      { icon: 'box', title: 'Water Conservation', body: 'Reducing water waste and using smart systems.' },
      { icon: 'chart', title: 'Waste Reduction', body: 'Minimising construction waste and promoting recycling.' },
      { icon: 'tag', title: 'Sustainable Materials', body: 'Using eco-friendly, recycled, and non-toxic materials.' },
      { icon: 'grid', title: 'Site Sensitivity', body: 'Building with the land rather than levelling it first.' },
    ],
  },

  {
    type: 'imageGrid',
    title: 'Key Elements of Sustainable Architecture',
    items: [
      { image: ARTICLE_PHOTOS.greenBuilding, caption: 'Green Roofs' },
      { image: ARTICLE_PHOTOS.naturalLighting, caption: 'Natural Lighting' },
      { image: ARTICLE_PHOTOS.modernVilla, caption: 'Solar Energy' },
      { image: ARTICLE_PHOTOS.lowCostHomes, caption: 'Rainwater Harvesting' },
      { image: ARTICLE_PHOTOS.biophilic, caption: 'Green Walls' },
      { image: ARTICLE_PHOTOS.loft, caption: 'Recycled & Eco-friendly Materials' },
    ],
  },

  { type: 'heading', number: 2, text: 'Benefits of Sustainable Architecture' },
  { type: 'para', text: 'Sustainable architecture offers numerous benefits for both the environment and the people who live and work in these spaces.' },
  {
    type: 'pills',
    items: [
      { icon: 'rupee', text: 'Lower energy bills' },
      { icon: 'shield', text: 'Healthier indoor environment' },
      { icon: 'chart', text: 'Increased property value' },
      { icon: 'grid', text: 'Reduced environmental impact' },
      { icon: 'clock', text: 'Long-term cost savings' },
    ],
  },

  { type: 'heading', number: 3, text: 'The Future is Green' },
  { type: 'para', text: 'As technology advances and awareness grows, green building will continue to evolve. Smart buildings, renewable energy, and innovative materials will play a major role in creating sustainable cities.' },
  { type: 'para', text: 'Architects, builders, and homeowners must collaborate to make sustainability a standard, not an option.' },
  { type: 'quote', text: 'The goal is not just to build structures, but to build a better future for generations to come.' },
]

const ARTICLES = [
  {
    slug: 'future-of-green-building',
    title: 'The Future of Green Building: Sustainable Architecture for a Better Tomorrow',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    author: 'ritu',
    image: ARTICLE_PHOTOS.villaDusk,
    publishedAt: on(5, 15, 14),
    readMinutes: 8,
    views: 1200,
    featured: true,
    excerpt: 'Discover how sustainable architecture is shaping the future of our cities and improving lives.',
    tags: ['SustainableArchitecture', 'GreenBuilding', 'EcoFriendly', 'Architecture', 'FutureLiving'],
    body: FEATURE_BODY,
  },
  {
    slug: 'rise-of-green-buildings',
    title: 'The Rise of Green Buildings and Why They Matter',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    author: 'ritu',
    image: ARTICLE_PHOTOS.greenBuilding,
    publishedAt: on(5, 15),
    readMinutes: 8,
    views: 1200,
    featured: true,
    excerpt: 'Green buildings are not just a trend, they are the future. Learn how they change what a building costs to run.',
    tags: ['GreenBuilding', 'Architecture', 'Sustainability'],
  },
  {
    slug: 'top-10-interior-design-trends',
    title: 'Top 10 Interior Design Trends for the Year',
    category: 'learning-reading',
    categoryLabel: 'Learning and Reading',
    author: 'anjali',
    image: ARTICLE_PHOTOS.interiorTrends,
    publishedAt: on(5, 12),
    readMinutes: 6,
    views: 980,
    excerpt: 'Stay ahead with the top interior design trends that define modern spaces.',
    tags: ['InteriorDesign', 'Trends'],
  },
  {
    slug: 'modern-construction-technologies',
    title: 'Modern Construction Technologies Transforming the Industry',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    author: 'vikram',
    image: ARTICLE_PHOTOS.construction,
    publishedAt: on(5, 10),
    readMinutes: 7,
    views: 1100,
    excerpt: 'From BIM to 3D printing, explore the technologies that are changing how buildings get built.',
    tags: ['Construction', 'Technology', 'BIM'],
  },
  {
    slug: 'innovative-building-materials',
    title: 'Innovative Building Materials for a Sustainable Future',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    author: 'neha',
    image: ARTICLE_PHOTOS.materials,
    publishedAt: on(5, 8),
    readMinutes: 5,
    views: 860,
    excerpt: 'Explore the most innovative and eco-friendly materials used in modern construction.',
    tags: ['Materials', 'Sustainability'],
  },
  {
    slug: 'smart-homes-future-of-living',
    title: 'Smart Homes: The Future of Comfortable Living',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    author: 'amit',
    image: ARTICLE_PHOTOS.smartHome,
    publishedAt: on(5, 5),
    readMinutes: 6,
    views: 750,
    excerpt: 'Smart homes are redefining convenience, efficiency and security. Here is how.',
    tags: ['SmartHomes', 'Automation'],
  },
  {
    slug: 'biophilic-design-nature-architecture',
    title: 'Biophilic Design: Bringing Nature Into Architecture',
    category: 'learning-reading',
    categoryLabel: 'Learning and Reading',
    author: 'pooja',
    image: ARTICLE_PHOTOS.biophilic,
    publishedAt: on(5, 3),
    readMinutes: 4,
    views: 680,
    excerpt: 'Biophilic design connects people with nature through thoughtful architectural choices.',
    tags: ['BiophilicDesign', 'Nature', 'Wellbeing'],
  },
  // ─── the Popular Posts column ───
  {
    slug: 'minimalist-architecture-less-is-more',
    title: 'Minimalist Architecture: Less is More',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    author: 'neha',
    image: ARTICLE_PHOTOS.minimalist,
    publishedAt: on(5, 11),
    readMinutes: 6,
    views: 1400,
    excerpt: 'Why stripping a building back to its essentials is harder than adding to it.',
    tags: ['Minimalism', 'Architecture'],
  },
  {
    slug: 'how-to-choose-the-right-architect',
    title: 'How to Choose the Right Architect for Your Project',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    author: 'vikram',
    image: ARTICLE_PHOTOS.collaboration,
    publishedAt: on(5, 9),
    readMinutes: 7,
    views: 1350,
    excerpt: 'The questions to ask before you sign, and the answers worth listening for.',
    tags: ['HiringAnArchitect', 'Advice'],
  },
  {
    slug: 'low-cost-construction-ideas',
    title: 'Low-Cost Construction Ideas for Indian Homes',
    category: 'technical-papers',
    categoryLabel: 'Technical Papers',
    author: 'vikram',
    image: ARTICLE_PHOTOS.lowCostHomes,
    publishedAt: on(5, 7),
    readMinutes: 5,
    views: 1290,
    excerpt: 'Practical ways to build well on a tight budget, without cutting the wrong corners.',
    tags: ['Budget', 'Construction'],
  },
  {
    slug: 'future-of-workspaces',
    title: 'Future of Workspaces: Designing for Productivity',
    category: 'learning-reading',
    categoryLabel: 'Learning and Reading',
    author: 'anjali',
    image: ARTICLE_PHOTOS.workspace,
    publishedAt: on(5, 4),
    readMinutes: 6,
    views: 1180,
    excerpt: 'What actually changes how well people work in a room — and what only looks like it does.',
    tags: ['Workspace', 'Productivity'],
  },
  {
    slug: 'vastu-in-modern-architecture',
    title: 'Understanding Vastu in Modern Architecture',
    category: 'research-development',
    categoryLabel: 'Research and Development',
    author: 'pooja',
    image: ARTICLE_PHOTOS.vastu,
    publishedAt: on(5, 1),
    readMinutes: 4,
    views: 1120,
    excerpt: 'Where traditional principles and contemporary planning genuinely agree.',
    tags: ['Vastu', 'Tradition'],
  },
]

// ═══════════════════════════════════════════════════════════
//  Podcast
// ═══════════════════════════════════════════════════════════

const EPISODES = [
  { slug: 'future-of-architecture-in-india', number: 45, title: 'The Future of Architecture in India',
    topic: 'architecture', topicLabel: 'Architecture', duration: '45:30', publishedAt: on(5, 20),
    cardTitle: 'FUTURE OF ARCHITECTURE IN INDIA',
    description: 'Exploring upcoming trends, technologies and the future of design in Indian cities.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { slug: 'sustainable-design-and-the-future', number: 44, title: 'Sustainable Design & The Future',
    topic: 'sustainability', topicLabel: 'Sustainability', duration: '38:20', publishedAt: on(5, 15),
    cardTitle: 'SUSTAINABLE DESIGN & THE FUTURE',
    description: 'How sustainable architecture can create a better future for generations to come.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { slug: 'how-to-build-a-successful-design-firm', number: 43, title: 'How to Build a Successful Design Firm',
    topic: 'business', topicLabel: 'Business', duration: '52:10', publishedAt: on(5, 6),
    cardTitle: 'HOW TO BUILD A SUCCESSFUL DESIGN FIRM',
    description: 'Tips, strategies and lessons from our journey of building ArchFacing.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { slug: 'materials-that-shape-our-world', number: 42, title: 'Materials that Shape Our World',
    topic: 'materials', topicLabel: 'Materials', duration: '31:45', publishedAt: on(4, 29),
    cardTitle: 'MATERIALS THAT SHAPE OUR WORLD',
    description: 'A deep dive into innovative materials changing the construction industry.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { slug: 'career-tips-for-young-architects', number: 41, title: 'Career Tips for Young Architects',
    topic: 'career', topicLabel: 'Career', duration: '27:30', publishedAt: on(4, 22),
    cardTitle: 'CAREER TIPS FOR YOUNG ARCHITECTS',
    description: 'Career guidance, skills and mindset for aspiring architects & designers.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { slug: 'urban-design-for-better-cities', number: 40, title: 'Urban Design for Better Cities',
    topic: 'urban-design', topicLabel: 'Urban Design', duration: '41:15', publishedAt: on(4, 15),
    cardTitle: 'URBAN DESIGN FOR BETTER CITIES',
    description: 'How thoughtful urban design can improve quality of life and communities.',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
]

/*
 * No seeded guests.
 *
 * These were five invented architects and engineers with stock portraits of
 * real strangers, two of them attributed to REAL practices (Studio Lotus,
 * Design Matrix) that never appeared on the podcast. The episode pages
 * already drop the guest block when there is none. Add real guests only with
 * their consent, their own photograph and their own words.
 */
const GUESTS: { slug: string; name: string; role: string; company: string; photo: string; episodes: string[]; bio: string }[] = []

// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('\n── Authors ──')

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!admin) throw new Error('No SUPER_ADMIN found — run `pnpm db:seed` first.')

  const authorIds: Record<string, string> = {}

  for (const a of AUTHORS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      create: {
        email: a.email, name: a.name, role: 'PROFESSIONAL', status: 'ACTIVE',
        emailVerified: new Date(), profilePhoto: unsplash(a.photo, { w: 200, h: 200 }),
        city: a.city, state: a.state, pincode: a.pincode,
      },
      update: { name: a.name, profilePhoto: unsplash(a.photo, { w: 200, h: 200 }) },
    })

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, designaType: 'DESIGNA', tier: 'PROFESSIONAL',
        firmName: a.firm, bio: `${a.role} at ${a.firm}.`, isVerified: true,
        verifiedAt: new Date(), categories: [],
      },
      update: { firmName: a.firm, isVerified: true },
    })

    authorIds[a.key] = user.id
    console.log(`  ✓ ${a.name.padEnd(20)} ${a.role}`)
  }

  console.log('\n── Blog articles ──')

  for (const art of ARTICLES) {
    const author = AUTHORS.find((a) => a.key === art.author)!
    const meta = {
      kind: 'blog',
      excerpt: art.excerpt,
      readMinutes: art.readMinutes,
      featured: art.featured ?? false,
      categoryLabel: art.categoryLabel,
      heroImage: unsplash(art.image, { w: 1200, h: 675 }),
      cardImage: unsplash(art.image, { w: 600, h: 400 }),
      thumbImage: unsplash(art.image, { w: 160, h: 120 }),
      authorRole: author.role,
      authorPhoto: unsplash(author.photo, { w: 96, h: 96 }),
      tags: art.tags,
      /*
       * Every article gets a block body — its own if the list above defines
       * one, otherwise the one keyed by slug in `article-bodies.ts`. Eleven
       * of the twelve had none and rendered as a single line of excerpt.
       */
      body: art.body ?? ARTICLE_BODIES[art.slug] ?? [],
    }

    const data = {
      type: 'PODCAST' as const, // overwritten below — kept for the shared shape
      status: 'PUBLISHED' as const,
      authorId: authorIds[art.author],
      title: art.title,
      description: art.excerpt,
      category: art.category,
      year: YEAR,
      publishedAt: art.publishedAt,
      viewCount: 0, // counts real visits only
      meta: meta as Prisma.InputJsonValue,
    }

    await prisma.post.upsert({
      where: { slug: art.slug },
      create: { ...data, type: 'BLOG', slug: art.slug },
      update: { ...data, type: 'BLOG' },
    })

    console.log(
      `  ✓ ${art.categoryLabel.padEnd(24)} ${art.title.slice(0, 46).padEnd(48)} ${art.readMinutes} min`
    )
  }

  console.log('\n── Podcast episodes ──')

  for (const ep of EPISODES) {
    const meta = {
      kind: 'podcast',
      episodeNumber: ep.number,
      duration: ep.duration,
      topicLabel: ep.topicLabel,
      cardTitle: ep.cardTitle,
      thumbImage: unsplash(PERSON_PHOTOS.host, { w: 600, h: 400 }),
    }

    const post = await prisma.post.upsert({
      where: { slug: ep.slug },
      create: {
        type: 'PODCAST', status: 'PUBLISHED', slug: ep.slug,
        authorId: admin.id, title: ep.title, description: ep.description,
        category: ep.topic, year: YEAR, publishedAt: ep.publishedAt,
        viewCount: 0, meta: meta as Prisma.InputJsonValue,
      },
      update: {
        title: ep.title, description: ep.description, category: ep.topic,
        publishedAt: ep.publishedAt, viewCount: 0, meta: meta as Prisma.InputJsonValue,
      },
    })

    // one video link per episode
    await prisma.media.deleteMany({ where: { postId: post.id } })
    await prisma.media.create({
      data: {
        postId: post.id, type: 'VIDEO_LINK', url: ep.video,
        fileName: `${ep.slug}.link`, mimeType: 'text/uri-list',
        videoHost: 'YOUTUBE', videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: unsplash(PERSON_PHOTOS.host, { w: 600, h: 400 }),
      },
    })

    console.log(`  ✓ Episode ${String(ep.number).padEnd(3)} ${ep.duration}  ${ep.title}`)
  }

  console.log('\n── Podcast guests ──')

  for (const [i, g] of GUESTS.entries()) {
    await prisma.podcastGuest.upsert({
      where: { slug: g.slug },
      create: { ...g, photo: unsplash(g.photo, { w: 200, h: 200 }), sortOrder: i },
      update: { ...g, photo: unsplash(g.photo, { w: 200, h: 200 }), sortOrder: i },
    })
    console.log(`  ✓ ${g.name.padEnd(20)} ${g.role} · ${g.company}`)
  }

  console.log(
    `\n${ARTICLES.length} articles · ${EPISODES.length} episodes · ${GUESTS.length} guests\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
