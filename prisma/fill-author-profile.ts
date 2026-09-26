/**
 * Fill in the blog author's profile.
 *
 *   npx tsx prisma/fill-author-profile.ts
 *
 * The article sidebar reads straight off the row, so an empty profile renders
 * an empty grey circle and a column of em dashes. This fills the fields the
 * sidebar actually shows — photo, firm, city, bio, verification, membership —
 * for the seeded Professional preview account.
 *
 * The photo is a CC0 stock portrait of an unnamed model, pulled from Wikimedia
 * Commons and cropped square. Deliberately not a portrait of a named person:
 * Ar. Ritu Sharma is a demo persona, and attaching a recognisable individual's
 * face to her would misrepresent that individual. Replace it by uploading a
 * real photo through the dashboard whenever there is one to use.
 *
 * Idempotent — upserts, and rewrites the avatar to the same path.
 */

import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()

const EMAIL = 'preview.pro@archfacing.test'
const AVATAR = '/uploads/profile/ritu-sharma.jpg'

/** CC0, no named subject. https://commons.wikimedia.org/wiki/File:Smiling_woman_pink_shirt_(cropped).jpg */
const SOURCE =
  'https://commons.wikimedia.org/wiki/Special:FilePath/' +
  encodeURIComponent('Smiling woman pink shirt (cropped).jpg') +
  '?width=1200'

/**
 * Crop to the head and shoulders.
 *
 * The frame is a tall portrait and the face sits in its upper third, so a
 * centre crop would land on the collarbone. These fractions put the square on
 * the face, which is all an 80px avatar shows anyway.
 */
const FACE = { cx: 0.52, cy: 0.28, side: 0.78 }

async function fetchAvatar(to: string) {
  const res = await fetch(SOURCE, { headers: { 'User-Agent': 'ArchFacing-dev/1.0' } })
  if (!res.ok) throw new Error(`portrait download failed: ${res.status}`)

  const img = sharp(Buffer.from(await res.arrayBuffer()))
  const { width = 0, height = 0 } = await img.metadata()

  const side = Math.round(Math.min(width, height) * FACE.side)
  const left = Math.min(Math.max(Math.round(width * FACE.cx - side / 2), 0), width - side)
  const top = Math.min(Math.max(Math.round(height * FACE.cy - side / 2), 0), height - side)

  await mkdir(path.dirname(to), { recursive: true })
  await img
    .extract({ left, top, width: side, height: side })
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(to)
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { professionalProfile: true, pacts: true, memberships: true },
  })

  if (!user) {
    console.log(`\nNo user at ${EMAIL} — run the seed first.\n`)
    return
  }

  await fetchAvatar(path.join(process.cwd(), 'public', AVATAR))

  // The PACT is already seeded at New Delhi 110029 — the address has to agree
  // with it or the sidebar contradicts itself.
  const pact = user.pacts[0]

  await prisma.user.update({
    where: { id: user.id },
    data: {
      profilePhoto: AVATAR,
      gender: 'Female',
      addressLine: 'B-42, Green Park Extension',
      city: pact?.city ?? 'New Delhi',
      state: 'Delhi',
      pincode: pact?.pincode ?? '110029',
      linkedinUrl: 'https://www.linkedin.com/in/ritu-sharma-archfacing',
      instagramUrl: 'https://www.instagram.com/ritusharma.studio',
      facebookUrl: 'https://www.facebook.com/ritusharma.studio',
      twitterUrl: 'https://x.com/ritusharma_arch',
      youtubeUrl: 'https://www.youtube.com/@ritusharma.studio',
    },
  })

  await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      designaType: 'DESIGNA',
      tier: 'PROFESSIONAL',
      firmName: 'Green Creations Studio',
      experience: 12,
      bio:
        'Ar. Ritu Sharma has spent twelve years on low-energy buildings across Delhi NCR, ' +
        'from IGBC-rated offices to housing that works without mechanical cooling for most of ' +
        'the year. She writes about what actually changes a building’s energy bill, and what ' +
        'only changes its brochure.',
      categories: ['research-development', 'learning-reading', 'technical-papers'],
      isVerified: true,
      verifiedAt: new Date(),
    },
    update: {
      firmName: 'Green Creations Studio',
      experience: 12,
      bio:
        'Ar. Ritu Sharma has spent twelve years on low-energy buildings across Delhi NCR, ' +
        'from IGBC-rated offices to housing that works without mechanical cooling for most of ' +
        'the year. She writes about what actually changes a building’s energy bill, and what ' +
        'only changes its brochure.',
      categories: ['research-development', 'learning-reading', 'technical-papers'],
      isVerified: true,
      verifiedAt: new Date(),
    },
  })

  // "Membership" on the sidebar reads a live ClubMembership, so an expired one
  // is the same as none.
  if (user.memberships.every((m) => m.expiresAt < new Date())) {
    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await prisma.clubMembership.create({
      data: { userId: user.id, planName: 'Gold', price: 9999, startsAt, expiresAt },
    })
  }

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    include: { professionalProfile: true, memberships: true },
  })

  console.log(`
  name       ${after?.name}
  photo      ${after?.profilePhoto}
  city       ${[after?.city, after?.state].filter(Boolean).join(', ')}
  firm       ${after?.professionalProfile?.firmName}
  verified   ${after?.professionalProfile?.isVerified}
  membership ${after?.memberships.map((m) => m.planName).join(', ') || '—'}
`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
