/**
 * Put the right icons on the green-building article.
 *
 *   npx tsx prisma/fix-green-building-article.ts
 *
 * The article was written through the Blog Builder before the subject icons
 * existed, so its two icon sections fell back to interface glyphs — a cog for
 * Energy Efficiency, a rupee for lower bills. The blueprint uses a semantic
 * mark for each one. Only the icons, the two renamed titles and the order of
 * the icon row change; every paragraph, heading, image and the quote are left
 * exactly as they are.
 *
 * Idempotent — it rewrites the two blocks to a fixed shape, so running it
 * twice leaves the same result.
 */

import { PrismaClient } from '@prisma/client'
import type { Block } from '../src/lib/content'

const prisma = new PrismaClient()

const SLUG = 'the-future-of-green-building-sustainable-architecture-in-india'

/**
 * The six principles, in the blueprint's reading order.
 *
 * The blueprint's sixth tile repeats "Sustainable Materials" — plainly a slip
 * in the mock, since the row is meant to cover six distinct principles. Site
 * Planning stays as the sixth.
 */
const PRINCIPLES: { icon: string; title: string; body: string }[] = [
  {
    icon: 'bolt',
    title: 'Energy Efficiency',
    body: 'Envelope, orientation and equipment sized to cut load first',
  },
  {
    icon: 'wind',
    title: 'Indoor Environmental Quality',
    body: 'Ventilation rates, daylight and low-VOC finishes people can breathe',
  },
  {
    icon: 'droplet',
    title: 'Water Conservation',
    body: 'Low-flow fixtures, recycled greywater and harvested rain',
  },
  {
    icon: 'recycle',
    title: 'Waste Reduction',
    body: 'Site waste segregated, reused and kept out of landfill',
  },
  {
    icon: 'leaf',
    title: 'Sustainable Materials',
    body: 'Local, low-embodied-carbon and certified supply chains',
  },
  {
    icon: 'home',
    title: 'Site Planning',
    body: 'Density, shading, drainage and the trees already on the plot',
  },
]

/** The benefit row — six across, one mark per benefit. */
const BENEFITS: { icon: string; title: string }[] = [
  { icon: 'bolt', title: 'Lower energy bills' },
  { icon: 'droplet', title: 'Lower water bills' },
  { icon: 'heart', title: 'Healthier indoor environment' },
  { icon: 'trending', title: 'Increased property value' },
  { icon: 'leaf', title: 'Reduced environmental impact' },
  { icon: 'coins', title: 'Long-term cost savings' },
]

function show(label: string, block: Block | undefined) {
  if (!block) return console.log(`  ${label}: (missing)`)
  const items = 'items' in block ? block.items : []
  console.log(`  ${label}:`)
  for (const it of items as { icon?: string; title?: string }[]) {
    console.log(`     ${String(it.icon).padEnd(10)} ${it.title}`)
  }
}

async function main() {
  const post = await prisma.post.findUnique({
    where: { slug: SLUG },
    select: { id: true, title: true, meta: true },
  })

  if (!post) {
    console.log(`\nNo article at "${SLUG}" — nothing to do.\n`)
    return
  }

  const meta = (post.meta ?? {}) as Record<string, unknown>
  const blocks = Array.isArray(meta.body) ? ([...meta.body] as Block[]) : []

  const iconAt = blocks.findIndex((b) => b.type === 'iconGrid')
  const cardsAt = blocks.findIndex((b) => b.type === 'cards')

  console.log('\nBefore')
  show('icon row', blocks[iconAt])
  show('benefits', blocks[cardsAt])

  if (iconAt >= 0) {
    const before = blocks[iconAt] as Extract<Block, { type: 'iconGrid' }>
    blocks[iconAt] = { ...before, columns: 6, items: PRINCIPLES } as Block
  }

  if (cardsAt >= 0) {
    const before = blocks[cardsAt] as Extract<Block, { type: 'cards' }>
    blocks[cardsAt] = { ...before, items: BENEFITS } as Block
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { meta: { ...meta, body: blocks } as never },
  })

  console.log('\nAfter')
  show('icon row', blocks[iconAt])
  show('benefits', blocks[cardsAt])
  console.log(`\nUpdated  ${post.title}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
