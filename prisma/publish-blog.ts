/**
 * Publish the blog that is sitting in review.
 *
 * The moderation queue at /admin/moderation does this properly — this is the
 * same state change, run from the command line so seeding a demo article does
 * not need a second sign-in.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const post = await prisma.post.findFirst({
    where: { type: 'BLOG', status: 'PENDING_REVIEW' },
    orderBy: { createdAt: 'desc' },
  })

  if (!post) {
    console.log('\nNothing waiting in review.\n')
    return
  }

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      reviewedById: admin?.id ?? null,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  })
  console.log(`\nPublished  ${post.title}\n           /blog/${post.slug}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
