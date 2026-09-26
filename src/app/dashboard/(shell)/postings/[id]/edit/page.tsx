import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { POST_TYPES } from '@/config/post-types'
import { PostForm, type PostEdit } from '../../../../post-form'
import { categoriesFor } from '../../../../post-actions'

export const metadata: Metadata = { title: 'Edit posting' }
export const dynamic = 'force-dynamic'

const pad = (n: number) => String(n).padStart(2, '0')
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dateTime = (d: Date) => `${dateOnly(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/** §5.2.13 — the author edits one of their postings in the same form that created it. */
export default async function EditPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAuth()
  const { id } = await params
  const post = await prisma.post.findFirst({
    where: { id, authorId: me.id, deletedAt: null },
    include: { media: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!post) notFound()
  // Blogs and artworks have their own editors.
  if (post.type === 'BLOG') redirect(`/dashboard/blog/${post.id}/edit`)
  if (post.type === 'ARTISTRY') redirect(`/dashboard/artistry/${post.id}/edit`)
  const config = POST_TYPES[post.type]
  if (!config) notFound()

  const meta = (post.meta && typeof post.meta === 'object' && !Array.isArray(post.meta) ? post.meta : {}) as Record<string, unknown>
  const columns = post as unknown as Record<string, unknown>
  const values: Record<string, string> = {
    title: post.title,
    description: post.description ?? '',
    category: post.category ?? '',
    subCategory: post.subCategory ?? '',
    tertiaryCategory: post.tertiaryCategory ?? '',
    pincode: post.pincode ?? '',
    city: post.city ?? '',
    state: post.state ?? '',
    year: post.year ? String(post.year) : '',
    videoUrl: post.media.find((m) => m.type === 'VIDEO_LINK')?.url ?? '',
  }
  const lists: Record<string, unknown[]> = {}
  const flags: Record<string, boolean> = {}
  for (const f of config.extraFields) {
    const v = meta[f.name] ?? columns[f.name]
    if (f.type === 'checkbox') { flags[f.name] = !!columns[f.name]; continue }
    if (f.type === 'list' || f.type === 'pairs') { if (Array.isArray(v)) lists[f.name] = v; continue }
    if (v == null || v === '') continue
    if (f.type === 'date' || f.type === 'datetime') {
      const d = new Date(String(v instanceof Date ? v.toISOString() : v))
      if (!Number.isNaN(d.getTime())) values[f.name] = f.type === 'date' ? dateOnly(d) : dateTime(d)
      continue
    }
    values[f.name] = String(v)
  }

  const edit: PostEdit = {
    postId: post.id,
    values,
    lists,
    flags,
    media: post.media.map((m) => ({ id: m.id, url: m.thumbnailUrl ?? m.url, type: m.type, label: m.label, fileName: m.fileName })),
    doneHref: '/dashboard/postings',
  }
  const categories = await categoriesFor(config)

  return (
    <div className="max-w-4xl">
      <PageHeading title={`Edit ${config.label.toLowerCase()}`} />
      {post.status === 'REJECTED' && post.rejectionReason && (
        <p className="mb-5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          Not accepted: {post.rejectionReason}. Fix it below and save to send it back for review.
        </p>
      )}
      <PostForm config={config} categories={categories} edit={edit} />
    </div>
  )
}
