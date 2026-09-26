/**
 * Put the feature image at the head of every Artistry gallery.
 *
 * The form used to store the cover and the gallery as two separate lists, so
 * frame 1 of the carousel was a photograph the reader had not seen and the
 * cover never appeared in the strip at all. `saveArtistryAction` now prepends
 * it; this brings the rows written before that fix into line.
 *
 * Idempotent — a gallery that already starts with the cover is left alone.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const posts = await prisma.post.findMany({
    where: { type: 'ARTISTRY', deletedAt: null },
    select: { id: true, title: true, meta: true },
  })

  let fixed = 0

  for (const p of posts) {
    const meta = (p.meta ?? {}) as Record<string, unknown>
    const image = typeof meta.image === 'string' ? meta.image : ''
    const gallery = Array.isArray(meta.gallery)
      ? meta.gallery.filter((g): g is string => typeof g === 'string')
      : []

    if (!image || gallery[0] === image) continue

    const next = [image, ...gallery.filter((g) => g !== image)]
    await prisma.post.update({
      where: { id: p.id },
      data: { meta: { ...meta, gallery: next } as never },
    })

    console.log(`  ${p.title} — ${gallery.length} → ${next.length} frames`)
    fixed++
  }

  console.log(`\n${fixed} gallery${fixed === 1 ? '' : 'ies'} corrected.\n`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
