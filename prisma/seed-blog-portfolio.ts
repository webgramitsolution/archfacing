/**
 * One more published article — the portfolio piece.
 *
 *   npx tsx prisma/seed-blog-portfolio.ts
 *
 * Published a day after the newest existing blog, so it becomes the "Next Post"
 * at the end of the chain. Its image grid is the eight project types a
 * Professional's Portfolio Gallery is built from, which is what the section is
 * actually about.
 *
 * Idempotent — upserts by slug.
 */

import { PrismaClient } from '@prisma/client'
import type { Block } from '../src/lib/content'

const prisma = new PrismaClient()

const SLUG = 'building-a-portfolio-that-wins-enquiries'

const GALLERY: { image: string; caption: string }[] = [
  { image: '/uploads/blog/pf-villa.jpg', caption: 'Modern Villa Exterior' },
  { image: '/uploads/blog/pf-living.jpg', caption: 'Luxury Living Room' },
  { image: '/uploads/blog/pf-landscape.jpg', caption: 'Landscape Design' },
  { image: '/uploads/blog/pf-bioffice.jpg', caption: 'Biophilic Office Space' },
  { image: '/uploads/blog/pf-susoffice.jpg', caption: 'Sustainable Office Building' },
  { image: '/uploads/blog/pf-kitchen.jpg', caption: 'Modern Kitchen Design' },
  { image: '/uploads/blog/pf-facade.jpg', caption: 'Residential Facade' },
  { image: '/uploads/blog/pf-greenwall.jpg', caption: 'Green Walls Installation' },
]

const BLOCKS: Block[] = [
  {
    type: 'lead',
    text:
      'A client on ArchFacing decides whether to send you an enquiry in about twenty seconds, and ' +
      'almost all of that time is spent looking at your portfolio. Not reading it — looking at it.',
  },
  {
    type: 'para',
    text:
      'That is not a complaint about clients. It is how anyone shortlists. The written profile ' +
      'settles a decision that the images have already made, which means the gallery is doing the ' +
      'selling and the text is doing the confirming.',
  },
  { type: 'heading', number: 1, level: 2, text: 'Show range, then show depth' },
  {
    type: 'para',
    text:
      'The first screen of a portfolio has one job: prove you can do more than one kind of work. A ' +
      'client with a house to build wants to see a house, but a client with an office fit-out ' +
      'wants to see that you have handled one. Eight tiles covering the categories you actually ' +
      'take work in beats twenty tiles of the same villa from different angles.',
  },
  {
    type: 'imageGrid',
    title: 'A portfolio that covers its ground',
    columns: 4,
    items: GALLERY,
  },
  { type: 'heading', number: 2, level: 2, text: 'What makes a tile work' },
  {
    type: 'para',
    text:
      'Every image should answer one question without a caption: what is this, and did you do it? ' +
      'Wide shots that show the whole building, one interior per project rather than six, and ' +
      'daylight wherever possible. A render is fine when it is labelled as one; a render passed ' +
      'off as a photograph costs you the enquiry the moment a client visits the site.',
  },
  {
    type: 'iconGrid',
    title: 'Six things the strongest galleries have in common',
    columns: 6,
    items: [
      { icon: 'grid', title: 'Range first', body: 'One tile per category you take work in' },
      { icon: 'sun', title: 'Daylight', body: 'Shot in real light, not lit for the camera' },
      { icon: 'home', title: 'The whole thing', body: 'A wide shot before any detail shot' },
      { icon: 'tag', title: 'Honest labels', body: 'Render, built work and concept marked apart' },
      { icon: 'award', title: 'Credited work', body: 'Your role named when it was a team project' },
      { icon: 'trending', title: 'Kept current', body: 'The newest project inside twelve months' },
    ],
  },
  { type: 'heading', number: 3, level: 2, text: 'What loses enquiries' },
  {
    type: 'para',
    text:
      'Portfolios go cold in predictable ways: nothing added for two years, photographs taken on a ' +
      'handset in bad light, and the same project appearing four times because it was the one that ' +
      'got photographed properly. All three read as a practice that is not busy, whether or not ' +
      'that is true.',
  },
  {
    type: 'cards',
    title: 'What an updated gallery returns',
    items: [
      { icon: 'inbox', title: 'More enquiries per visit' },
      { icon: 'users', title: 'Better matched clients' },
      { icon: 'trending', title: 'Higher position in search' },
      { icon: 'shield', title: 'Fewer scope surprises' },
      { icon: 'coins', title: 'Less time on unpaid pitching' },
      { icon: 'heart', title: 'Work you want more of' },
    ],
  },
  {
    type: 'quote',
    text:
      'Nobody has ever read their way to hiring an architect. They looked, decided, and then read ' +
      'to check they were right.',
  },
]

async function main() {
  const newest = await prisma.post.findFirst({
    where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null, slug: { not: SLUG } },
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true, authorId: true },
  })

  if (!newest?.publishedAt) {
    console.log('\nNo published blog to follow — run the blog seeds first.\n')
    return
  }

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })
  const publishedAt = new Date(newest.publishedAt.getTime() + 86_400_000)

  const excerpt =
    'A client decides in about twenty seconds, and spends almost all of it looking at your ' +
    'gallery. What the strongest portfolios on ArchFacing have in common — and what quietly ' +
    'costs practices the enquiry.'

  const meta = {
    body: BLOCKS,
    excerpt,
    heroImage: '/uploads/blog/hero-portfolio.jpg',
    cardImage: '/uploads/blog/hero-portfolio.jpg',
    thumbImage: '/uploads/blog/hero-portfolio.jpg',
    tags: ['Portfolio', 'Practice', 'Enquiries', 'Photography', 'Profile'],
    authorRole: 'Sustainability Consultant',
    subCategory: 'practice-business',
  }

  const common = {
    title: 'Building a Portfolio That Wins Enquiries',
    description: excerpt,
    category: 'learning-reading',
    meta: meta as never,
    status: 'PUBLISHED' as const,
    publishedAt,
    reviewedById: admin?.id ?? null,
    reviewedAt: publishedAt,
    rejectionReason: null,
    deletedAt: null,
  }

  await prisma.post.upsert({
    where: { slug: SLUG },
    create: { ...common, slug: SLUG, type: 'BLOG', authorId: newest.authorId },
    update: common,
  })

  const total = await prisma.post.count({
    where: { type: 'BLOG', status: 'PUBLISHED', deletedAt: null },
  })
  console.log(`\n  ${publishedAt.toISOString().slice(0, 10)}  ${common.title}`)
  console.log(`  /blog/${SLUG}`)
  console.log(`\n${total} published blogs.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
