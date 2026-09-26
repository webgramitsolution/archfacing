/**
 * Fill the artist block on Artistry postings that were saved without one.
 *
 * `saveArtistryAction` now writes it from the signed-in account; this brings
 * rows written before that fix into line, so their cards stop reading
 * "ArchFacing" instead of the person who posted them.
 *
 * Idempotent — a posting that already names an artist is left alone.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const posts = await prisma.post.findMany({
    where: { type: 'ARTISTRY', deletedAt: null },
    select: {
      id: true, title: true, meta: true,
      author: {
        select: {
          name: true, profilePhoto: true, city: true, state: true,
          professionalProfile: {
            select: { firmName: true, bio: true, isVerified: true, designaType: true },
          },
        },
      },
    },
  })

  let fixed = 0

  for (const p of posts) {
    const meta = (p.meta ?? {}) as Record<string, unknown>
    const current = (meta.artist ?? {}) as Record<string, unknown>
    if (typeof current.name === 'string' && current.name.trim()) continue

    const a = p.author
    const pp = a.professionalProfile

    await prisma.post.update({
      where: { id: p.id },
      data: {
        meta: {
          ...meta,
          artist: {
            name: a.name,
            shortName: a.name,
            role: pp?.firmName ?? 'Professional',
            cardLabel: pp?.designaType === 'DESIGNI' ? 'Interior Designer' : 'Professional',
            bio: pp?.bio ?? '',
            photo: a.profilePhoto ?? '',
            location: [a.city, a.state].filter(Boolean).join(', '),
            rating: 0, reviews: 0, recommend: 0,
            projects: '—', followers: '—', successRate: '—',
            verified: pp?.isVerified === true,
          },
        } as never,
      },
    })

    console.log(`  ${p.title} → ${a.name}`)
    fixed++
  }

  console.log(`\n${fixed} posting${fixed === 1 ? '' : 's'} given an artist.\n`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
