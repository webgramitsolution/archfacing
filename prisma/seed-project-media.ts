/**
 * Cover and gallery photographs for the seeded projects.
 *
 * Run with `pnpm db:project-media`.
 *
 * The projects themselves were seeded to match the reference design, but
 * without a single `Media` row between them — 13 of the 17 published projects
 * had no image at all, so every card on `/projects` drew a placeholder and the
 * detail page had no gallery. This attaches photography to the ones that are
 * missing it and leaves the rest alone.
 *
 * ★ It never replaces an existing image. A project that already has media —
 *   including anything a real professional uploaded — is skipped entirely, so
 *   this is safe to re-run.
 *
 * The pictures come from `PROJECT_PHOTOS`, chosen by the project's own
 * category, so a hotel gets a lobby and a factory does not get a bedroom.
 */

import { PrismaClient } from '@prisma/client'
import { PROJECT_PHOTOS, unsplash } from '../src/config/content-media'

const prisma = new PrismaClient()

type Key = keyof typeof PROJECT_PHOTOS

/**
 * Which photographs suit which kind of project.
 *
 * The first is the cover; the rest fill the detail page's gallery. Keyed by
 * the `category` slug the seed already writes, with a fallback for anything
 * added later.
 */
const BY_CATEGORY: Record<string, Key[]> = {
  residential: ['villa', 'modernHouse', 'courtyardHouse', 'poolVilla', 'gardenHouse', 'retreat'],
  interior: ['kitchen', 'gardenHouse', 'lobby', 'bedroom', 'kitchen', 'villa'],
  'commercial-offices': ['cityScale', 'lobby', 'modernHouse', 'courtyardHouse', 'retreat'],
  landscaped: ['resort', 'deck', 'beachResort', 'poolVilla', 'gardenHouse'],
  hospitality: ['lobby', 'resort', 'beachResort', 'rooftopPool', 'deck', 'bedroom'],
  'industrials-factories': ['cityScale', 'modernHouse', 'courtyardHouse', 'lobby'],
  'education-sports': ['cityScale', 'courtyardHouse', 'modernHouse', 'lobby', 'retreat'],
}

const FALLBACK: Key[] = ['modernHouse', 'villa', 'courtyardHouse', 'lobby', 'retreat']

/** 1600 × 1200 — a 4:3 source large enough for the detail page's lead image. */
const W = 1600
const H = 1200

async function main() {
  console.log('\n── Project photography ──\n')

  const projects = await prisma.post.findMany({
    where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null },
    select: { id: true, title: true, category: true, _count: { select: { media: true } } },
    orderBy: { createdAt: 'asc' },
  })

  let done = 0
  let skipped = 0

  for (const p of projects) {
    if (p._count.media > 0) {
      skipped++
      continue
    }

    const keys = BY_CATEGORY[p.category] ?? FALLBACK

    await prisma.media.createMany({
      data: keys.map((k, i) => ({
        postId: p.id,
        type: 'IMAGE' as const,
        url: unsplash(PROJECT_PHOTOS[k], { w: W, h: H }),
        // The record describes a remote photograph, not an upload: there is
        // no storage key to delete and no byte count to bill against a quota.
        fileName: `${k}.jpg`,
        mimeType: 'image/jpeg',
        width: W,
        height: H,
        sortOrder: i,
      })),
    })

    done++
    console.log(`  ✓ ${p.title.slice(0, 40).padEnd(41)} ${String(keys.length).padStart(2)} photos  (${p.category})`)
  }

  console.log(`\n  ${done} projects given photography, ${skipped} already had some\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
