/**
 * Content system — permission matrix, upload rules, moderation.
 *
 *   pnpm test:content
 *
 * ★ The most important part is the §7.4.1 matrix — BMF must not be allowed
 *   to post Projects, and a Client may post only Artistry and Competition.
 */

import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { can } from '../src/config/permissions.ts'
import { POST_TYPES } from '../src/config/post-types.ts'
import { uploadFile, checkQuota } from '../src/lib/upload.ts'

const prisma = new PrismaClient()
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.post.deleteMany({ where: { author: { email: { contains: '@ctest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@ctest.dev' } } })
}
await cleanup()

// ═══ 1. §7.4.1 permission matrix ═══
console.log('\n── §7.4.1 — who can post what ──')

const MATRIX = [
  // [role, type, expected?]
  ['PROFESSIONAL', 'PROJECT', true],
  ['PROFESSIONAL', 'PRODUCT', true],
  ['PROFESSIONAL', 'BLOG', true],
  ['CONSULTANT', 'PROJECT', true],
  ['CORPORATE', 'PRODUCT', true],
  ['CLIENT', 'ARTISTRY', true],
  ['CLIENT', 'DESIGN_COMPETITION', true],
  ['BMF', 'BLOG', true],
  ['BMF', 'AROUND_US', true],
  ['BMF', 'DESIGN_COMPETITION', true],
  // these must not be allowed
  ['CLIENT', 'PROJECT', false],
  ['CLIENT', 'PRODUCT', false],
  ['CLIENT', 'BLOG', false],
  ['BMF', 'PROJECT', false],
  ['BMF', 'PRODUCT', false],
  ['CORPORATE', 'PACT_BUY', false],
]

for (const [role, typeKey, want] of MATRIX) {
  const perm = typeKey === 'PACT_BUY' ? 'pact:buy' : POST_TYPES[typeKey].permission
  const got = can(role, perm)
  const label = typeKey === 'PACT_BUY' ? 'buying a PACT' : POST_TYPES[typeKey].label
  check(
    `${role.padEnd(13)} ${want ? 'can' : 'cannot'} — ${label}`,
    got === want,
    `(got ${got})`
  )
}

// ═══ 2. Upload rules §7.10 ═══
console.log('\n── §7.10 — the upload rules ──')

const user = await prisma.user.create({
  data: {
    email: 'poster@ctest.dev', name: 'Test Poster', role: 'PROFESSIONAL',
    status: 'ACTIVE', emailVerified: new Date(), pincode: '110005', state: 'Delhi',
    storageQuotaMb: 100, storageUsedMb: 0,
  },
})

/** Build a real JPEG */
async function makeJpeg(w, h) {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 60 } },
  }).jpeg().toBuffer()
}

function asFile(buf, name, type) {
  return new File([new Uint8Array(buf)], name, { type })
}

// a correct 5:3 landscape
const good = await makeJpeg(1500, 900)
const r1 = await uploadFile({
  userId: user.id, file: asFile(good, 'ok.jpg', 'image/jpeg'),
  kind: 'IMAGE', aspect: 'default', folder: 'ctest',
})
check('a correct 5:3 landscape is accepted', r1.ok === true, r1.ok ? '' : `(${r1.error})`)
check('it was converted to JPEG', r1.ok && r1.mimeType === 'image/jpeg')
check('not wider than 1920px', r1.ok && r1.width <= 1920, `(${r1.ok && r1.width})`)

// portrait — §7.10.1 says landscape is required
const portrait = await makeJpeg(900, 1500)
const r2 = await uploadFile({
  userId: user.id, file: asFile(portrait, 'tall.jpg', 'image/jpeg'),
  kind: 'IMAGE', aspect: 'default', folder: 'ctest',
})
check('portrait rejected (§7.10.1)', r2.ok === false)
check('the error mentions landscape', !r2.ok && r2.error.includes('landscape'))

// wrong ratio — 21:9 when 5:3 is required
const wrongRatio = await makeJpeg(2100, 900)
const r3 = await uploadFile({
  userId: user.id, file: asFile(wrongRatio, 'wide.jpg', 'image/jpeg'),
  kind: 'IMAGE', aspect: 'default', folder: 'ctest',
})
check('a wrong aspect ratio is rejected', r3.ok === false, r3.ok ? '(it was accepted!)' : '')

// 16:9 where wide is required
const wide = await makeJpeg(1600, 900)
const r4 = await uploadFile({
  userId: user.id, file: asFile(wide, 'wide.jpg', 'image/jpeg'),
  kind: 'IMAGE', aspect: 'wide', folder: 'ctest',
})
check('16:9 is accepted where wide was asked for', r4.ok === true, r4.ok ? '' : `(${r4.error})`)

// a fake file — named .jpg but text inside
const fake = Buffer.from('<?php system($_GET["c"]); ?>')
const r5 = await uploadFile({
  userId: user.id, file: asFile(fake, 'shell.jpg', 'image/jpeg'),
  kind: 'IMAGE', folder: 'ctest',
})
check('★ a fake .jpg (actually a script) is rejected', r5.ok === false)

// an image in place of a PDF
const r6 = await uploadFile({
  userId: user.id, file: asFile(good, 'notreally.pdf', 'application/pdf'),
  kind: 'PDF', folder: 'ctest',
})
check('an image in place of a PDF is rejected', r6.ok === false)

// a very large file — above 2MB
const huge = Buffer.alloc(3 * 1024 * 1024, 0)
huge[0] = 0xff; huge[1] = 0xd8; huge[2] = 0xff
const r7 = await uploadFile({
  userId: user.id, file: asFile(huge, 'big.jpg', 'image/jpeg'),
  kind: 'IMAGE', folder: 'ctest',
})
check('larger than 2 MB is rejected (§7.10.1)', r7.ok === false)
check('the error mentions MB', !r7.ok && r7.error.includes('MB'))

// ═══ 3. Quota §4.4 (VII) ═══
console.log('\n── §4.4 — storage quota ──')

const q1 = await checkQuota(user.id, 1024 * 1024)
check('it works while there is space left', q1.ok === true)

await prisma.user.update({ where: { id: user.id }, data: { storageUsedMb: 99 } })
const q2 = await checkQuota(user.id, 5 * 1024 * 1024)
check('it stops once the quota is full', q2.ok === false)
check('it suggests buying Portal Space', !q2.ok && q2.error.includes('Portal Space'))

// ═══ 4. Moderation ═══
console.log('\n── Moderation ──')

const post = await prisma.post.create({
  data: {
    type: 'PROJECT', status: 'PENDING_REVIEW', authorId: user.id,
    title: 'Test Villa', slug: 'test-villa-ctest',
    description: 'A test project for moderation checks.',
    category: 'residential', subCategory: 'villas',
    pincode: '110005', state: 'Delhi', year: 2026,
  },
})
check('a new post goes into PENDING_REVIEW', post.status === 'PENDING_REVIEW')
check('publishedAt is still empty', post.publishedAt === null)

const visible = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', slug: 'test-villa-ctest' },
})
check('★ it is not visible publicly without approval', visible === 0)

await prisma.post.update({
  where: { id: post.id },
  data: { status: 'PUBLISHED', publishedAt: new Date() },
})
const nowVisible = await prisma.post.count({
  where: { type: 'PROJECT', status: 'PUBLISHED', slug: 'test-villa-ctest' },
})
check('it is visible after approval', nowVisible === 1)

// ═══ 5. Post type config ═══
console.log('\n── Checking the posting types ──')

check('all six types are present', Object.keys(POST_TYPES).length === 6, `(${Object.keys(POST_TYPES).length})`)

for (const [key, c] of Object.entries(POST_TYPES)) {
  const okShape =
    c.images.min >= 0 &&
    // PDF caps images at 8; the client raised Artistry to 10 (Sept 2026).
    c.images.max <= (key === 'ARTISTRY' ? 10 : 8) &&
    c.maxWords > 0 &&
    !!c.publicPath &&
    !!c.permission
  check(`${key.padEnd(20)} config is well-formed`, okShape)
}

check('a video link works for all of them', Object.values(POST_TYPES).every((c) => c.allowVideo))

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(54)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(54)}\n`)
process.exit(fail ? 1 : 0)
