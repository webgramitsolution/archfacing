import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { categoryPathLabeller } from '@/lib/category-path'
import { Icon } from '@/components/ui'
import { ProjectsTable, type ProjectRow } from './projects-table'

const ADD_HREF = '/dashboard/professional/projects/new'

export const metadata: Metadata = { title: 'My Projects' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await requireRole('PROFESSIONAL')

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, type: 'PROJECT', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, description: true, slug: true, category: true, subCategory: true, tertiaryCategory: true,
      city: true, state: true, status: true, viewCount: true, publishedAt: true, createdAt: true,
      media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true, thumbnailUrl: true } },
    },
  })

  const pathOf = await categoryPathLabeller('PROJECT')
  const projects: ProjectRow[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    slug: p.slug,
    category: pathOf(p.category)[0] ?? p.category,
    categoryPath: pathOf(p.category, p.subCategory, p.tertiaryCategory),
    location: [p.city, p.state].filter(Boolean).join(', '),
    status: p.status,
    views: p.viewCount,
    date: (p.publishedAt ?? p.createdAt).toISOString(),
    image: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
  }))

  return (
    <div>
      {/* header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="file" className="h-5 w-5" /></span>
          <h1 className="font-display text-[20px] font-bold tracking-tight text-ink">My Projects</h1>
        </div>
        <Link href={ADD_HREF} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90">
          <Icon name="plus" className="h-4 w-4" /> Add New Project
        </Link>
      </div>

      <ProjectsTable projects={projects} addHref={ADD_HREF} />
    </div>
  )
}
