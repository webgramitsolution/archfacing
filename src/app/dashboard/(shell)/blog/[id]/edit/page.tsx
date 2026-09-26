import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { articleMeta, articleBody } from '@/lib/content'
import { BLOG_CATEGORIES } from '@/config/taxonomy'
import { BlogBuilder } from '../../blog-builder'
import { getBlogForEdit } from '../../blog-actions'

export const metadata: Metadata = { title: 'Edit blog' }

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('post:blog')
  const { id } = await params

  const post = await getBlogForEdit(id)
  // `getBlogForEdit` already scopes to this author, so a guessed id 404s
  // rather than telling anyone the row exists
  if (!post) notFound()

  const m = articleMeta(post.meta)
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
          id: post.id,
          title: post.title,
          slug: post.slug,
          category: post.category,
          subCategory: post.subCategory ?? '',
          excerpt: m.excerpt,
          heroImage: m.heroImage.startsWith('/img/') ? '' : m.heroImage,
          tags: m.tags.join(', '),
          readMinutes: String(m.readMinutes),
          authorRole: m.authorRole,
          seoTitle: m.seoTitle,
          seoDescription: m.seoDescription,
          status: post.status,
          rejectionReason: post.rejectionReason,
          blocks: articleBody(post.meta),
        }}
      />
    </div>
  )
}
