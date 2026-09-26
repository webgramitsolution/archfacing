/**
 * Photography for the seeded products.
 *
 * Run with `pnpm db:product-media`.
 *
 * 40 of the 49 published products had no `Media` row at all, so every product
 * card and every product detail page drew the placeholder. This attaches
 * photographs to the ones that are missing them, chosen by the product's own
 * category so a door does not get a bathtub.
 *
 * ★ It never replaces existing media. Anything a seller uploaded is left
 *   exactly as it is, which makes the script safe to re-run.
 *
 * ⚠️ These are interior and fixture photographs, not studio product shots —
 *    the same caveat `PRODUCT_PHOTOS` already carries. A generic architecture
 *    library has no picture of a cement bag. Swap in real catalogue imagery
 *    from the brands as it arrives; nothing here needs to change when you do,
 *    because a seller's upload always wins.
 */

import { PrismaClient } from '@prisma/client'
import { PRODUCT_PHOTOS, unsplash } from '../src/config/content-media'

const prisma = new PrismaClient()

type Key = keyof typeof PRODUCT_PHOTOS

/** The first entry becomes the cover; the rest fill the detail gallery. */
const BY_CATEGORY: Record<string, Key[]> = {
  'interior-products': ['living', 'livingPendants', 'decor', 'furnishing', 'livingWide'],
  'buildings-products': ['flooring', 'kitchenWhite', 'storage', 'shelving'],
  'services-products': ['livingWide', 'kitchenIsland', 'dining', 'living'],
  'exterior-products': ['flooring', 'livingWide', 'storage', 'decor'],
  'furniture-furnishing': ['furniture', 'furnishing', 'dining', 'storage', 'shelving'],
  'structural-products': ['flooring', 'storage', 'shelving', 'kitchenWhite'],
  'doors-windows': ['storage', 'shelving', 'living', 'flooring'],
}

const FALLBACK: Key[] = ['living', 'flooring', 'storage', 'decor']

/** 1600 × 1200 — large enough for the detail page's square lead image. */
const W = 1600
const H = 1200

async function main() {
  console.log('\n── Product photography ──\n')

  const products = await prisma.post.findMany({
    where: { type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null },
    select: { id: true, title: true, category: true, _count: { select: { media: true } } },
    orderBy: { createdAt: 'asc' },
  })

  let done = 0
  let skipped = 0

  for (const p of products) {
    if (p._count.media > 0) {
      skipped++
      continue
    }

    const keys = BY_CATEGORY[p.category] ?? FALLBACK

    await prisma.media.createMany({
      data: keys.map((k, i) => ({
        postId: p.id,
        type: 'IMAGE' as const,
        url: unsplash(PRODUCT_PHOTOS[k], { w: W, h: H }),
        // A remote photograph, not an upload: no storage key to delete and no
        // bytes to bill against anyone's quota.
        fileName: `${k}.jpg`,
        mimeType: 'image/jpeg',
        width: W,
        height: H,
        sortOrder: i,
      })),
    })

    done++
    console.log(
      `  ✓ ${p.title.slice(0, 38).padEnd(39)} ${String(keys.length).padStart(2)} photos  (${p.category})`
    )
  }

  console.log(`\n  ${done} products given photography, ${skipped} already had some\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
