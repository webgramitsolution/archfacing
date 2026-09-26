/**
 * Remove every blog from the database.
 *
 *   pnpm db:wipe-blogs
 *
 * A hard delete, not the soft delete the dashboard does — the point is to
 * start the blog empty, and a soft-deleted row still holds its slug, which is
 * unique across every posting type and would block a new article from reusing
 * it.
 *
 * ⚠️ Blogs only. `type: 'BLOG'` scopes it; projects, products, competitions
 *    and everything else are untouched.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const blogs = await prisma.post.findMany({
    where: { type: 'BLOG' },
    select: { id: true, title: true },
  })

  if (blogs.length === 0) {
    console.log('\nNo blogs to remove.\n')
    await prisma.$disconnect()
    return
  }

  // Media rows cascade on Post delete (onDelete: Cascade), so the files'
  // database rows go with them. Anything on disk under public/uploads is left
  // alone — a blog seeded from a remote URL never wrote one.
  const { count } = await prisma.post.deleteMany({ where: { type: 'BLOG' } })

  for (const b of blogs) console.log(`  removed  ${b.title}`)
  console.log(`\n${count} blog${count === 1 ? '' : 's'} removed.\n`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
