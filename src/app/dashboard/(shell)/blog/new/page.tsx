import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { BLOG_CATEGORIES } from '@/config/taxonomy'
import { starterBlocks } from '@/lib/blog-blocks'
import { BlogBuilder } from '../blog-builder'

export const metadata: Metadata = { title: 'Write a blog' }

export default async function NewBlogPage() {
  const user = await requirePermission('post:blog')

  /*
   * Categories come from the Category table, not straight from taxonomy.ts,
   * because an admin can add and retire them at runtime through
   * /admin/categories. The taxonomy file is only the seed.
   */
  const rows = await prisma.category.findMany({
    where: { type: 'BLOG', parentId: null, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      slug: true,
      name: true,
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true },
      },
    },
  })
  const categories = rows.length ? rows : BLOG_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, children: c.children ?? [] }))

  return (
    <div>
      <BlogBuilder
        categories={categories}
        initial={{
          title: '', slug: '', category: '', subCategory: '', excerpt: '', heroImage: '',
          tags: '', readMinutes: '', authorRole: '', seoTitle: '', seoDescription: '',
          status: 'DRAFT',
          // the house article shape, pre-arranged — see starterBlocks()
          blocks: starterBlocks(),
        }}
      />
    </div>
  )
}
