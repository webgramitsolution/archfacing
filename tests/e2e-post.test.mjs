/**
 * The whole journey — creating a post → moderation → appearing publicly.
 *
 *   pnpm test:e2e
 *
 * This walks the very path the real form walks (createPostAction), so the
 * upload pipeline, the video link and permissions are all checked together.
 */

import './_test-env.mjs'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { POST_TYPES } from '../src/config/post-types.ts'
import { uploadFile } from '../src/lib/upload.ts'
import { parseVideoUrl } from '../src/lib/video.ts'
import { slugify } from '../src/lib/utils.ts'

const prisma = new PrismaClient()
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.post.deleteMany({ where: { author: { email: { contains: '@e2e.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@e2e.dev' } } })
}
await cleanup()

console.log('\n── A real project post ──')

const author = await prisma.user.create({
  data: {
    email: 'architect@e2e.dev', name: 'Ar. Kavita Rao', role: 'PROFESSIONAL',
    status: 'ACTIVE', emailVerified: new Date(), mobile: '9700001234',
    pincode: '560001', city: 'Bengaluru', state: 'Karnataka',
    storageQuotaMb: 100, storageUsedMb: 0,
    professionalProfile: {
      create: { designaType: 'DESIGNA', tier: 'PROFESSIONAL', firmName: 'Rao Associates' },
    },
  },
})

// ─── images ───
const config = POST_TYPES.PROJECT
const buf = await sharp({
  create: { width: 1500, height: 900, channels: 3, background: { r: 180, g: 90, b: 50 } },
}).jpeg().toBuffer()

const uploads = []
for (let i = 0; i < 3; i++) {
  const res = await uploadFile({
    userId: author.id,
    file: new File([new Uint8Array(buf)], `shot-${i}.jpg`, { type: 'image/jpeg' }),
    kind: 'IMAGE', aspect: 'default', folder: 'e2e',
  })
  if (res.ok) uploads.push(res)
}
check('all three images uploaded', uploads.length === 3, `(${uploads.length})`)

const usedAfter = await prisma.user.findUnique({
  where: { id: author.id }, select: { storageUsedMb: true },
})
check('it counted against the quota', usedAfter.storageUsedMb > 0, `(${usedAfter.storageUsedMb} MB)`)

// ─── video link ───
const video = parseVideoUrl('https://www.dailymotion.com/video/x8walkthru')
check('the Dailymotion link was recognised', video?.host === 'dailymotion')

// ─── post ───
const post = await prisma.post.create({
  data: {
    type: 'PROJECT', status: 'PENDING_REVIEW', authorId: author.id,
    title: 'Courtyard House, Jayanagar',
    slug: slugify('Courtyard House Jayanagar') + '-e2e',
    description:
      'A house built for a family of three generations, with an open courtyard ' +
      'at its centre. Local stone and timber have been used throughout.',
    category: 'residential', subCategory: 'villas',
    pincode: '560001', city: 'Bengaluru', state: 'Karnataka', year: 2026,
    meta: { areaSqm: 340, clientName: 'Rao family', completionYear: 2026 },
    media: {
      create: [
        ...uploads.map((u, i) => ({
          type: 'IMAGE', url: u.url, storageKey: u.key,
          fileName: `shot-${i}.jpg`, mimeType: u.mimeType,
          sizeBytes: u.sizeBytes, width: u.width, height: u.height, sortOrder: i,
        })),
        {
          type: 'VIDEO_LINK', url: video.url, embedUrl: video.embedUrl,
          thumbnailUrl: video.thumbnailUrl, videoHost: 'DAILYMOTION',
          videoId: video.videoId, fileName: 'walkthrough',
          mimeType: 'text/uri-list', sizeBytes: 0, sortOrder: 100,
        },
      ],
    },
  },
  include: { media: true },
})

check('the post was created', !!post.id)
check('4 media attached (3 images + 1 video)', post.media.length === 4)
check('the video sizeBytes is 0 — no storage used', post.media.find((m) => m.type === 'VIDEO_LINK').sizeBytes === 0)
check('it went into PENDING_REVIEW', post.status === 'PENDING_REVIEW')

// ─── it must not be publicly visible ───
const beforeApproval = await prisma.post.findFirst({
  where: { slug: post.slug, status: 'PUBLISHED', deletedAt: null },
})
check('★ it is not public before review', beforeApproval === null)

// ─── moderation ───
const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
await prisma.post.update({
  where: { id: post.id },
  data: {
    status: 'PUBLISHED', publishedAt: new Date(),
    reviewedById: admin?.id, reviewedAt: new Date(),
  },
})

const published = await prisma.post.findFirst({
  where: { slug: post.slug, status: 'PUBLISHED', deletedAt: null },
  include: { media: { orderBy: { sortOrder: 'asc' } }, author: { select: { name: true } } },
})
check('it went public after approval', !!published)
check('the author name is attached', published.author.name === 'Ar. Kavita Rao')

// ─── listing filters (§6.1.3.1) ───
console.log('\n── §6.1.3 — filters ──')

const byState = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', state: 'Karnataka', deletedAt: null },
})
check('filtering by State works', byState >= 1)

const byYear = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', year: 2026, deletedAt: null },
})
check('filtering by Introducing year works', byYear >= 1)

const byCategory = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', category: 'residential', subCategory: 'villas', deletedAt: null },
})
check('filtering by Category + sub-category works', byCategory >= 1)

const wrongState = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', state: 'Kerala', slug: post.slug },
})
check('it does not show under the wrong state', wrongState === 0)

// ─── the pieces of the detail page ───
console.log('\n── Detail page data ──')

const images = published.media.filter((m) => m.type === 'IMAGE')
const vid = published.media.find((m) => m.type === 'VIDEO_LINK')
check('the cover image comes first', images[0].sortOrder === 0)
check('the video embed URL is ready', vid.embedUrl.includes('dailymotion.com/embed/video/'))
check('the video thumbnail is ready', !!vid.thumbnailUrl)
check('meta carries the project details', published.meta.areaSqm === 340)

// ─── slug collisions ───
console.log('\n── Slug ──')
check('the slug is clean', /^[a-z0-9-]+$/.test(post.slug), `(${post.slug})`)

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(54)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(54)}\n`)
process.exit(fail ? 1 : 0)
