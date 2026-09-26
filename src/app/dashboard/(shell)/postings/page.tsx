import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { POST_TYPES } from '@/config/post-types'
import { DeletePostingButton } from '../../delete-posting-button'

export const metadata: Metadata = { title: 'Edit the Postings' }
export const dynamic = 'force-dynamic'

const STATUS: Record<string, [string, string]> = {
  PUBLISHED: ['bg-ok-soft text-ok', 'Published'],
  PENDING_REVIEW: ['bg-warn-soft text-warn', 'In review'],
  DRAFT: ['bg-info-soft text-info', 'Draft'],
  REJECTED: ['bg-danger-soft text-danger', 'Not accepted'],
  ARCHIVED: ['bg-paper-3 text-ink-3', 'Archived'],
}

const editHref = (type: string, id: string) =>
  type === 'BLOG' ? `/dashboard/blog/${id}/edit` : type === 'ARTISTRY' ? `/dashboard/artistry/${id}/edit` : `/dashboard/postings/${id}/edit`

/** §5.2.13 — every posting this account has made, of every type, in one place. */
export default async function PostingsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const me = await requireAuth()
  const sp = await searchParams

  const [counts, posts] = await Promise.all([
    prisma.post.groupBy({ by: ['type'], where: { authorId: me.id, deletedAt: null }, _count: { _all: true } }),
    prisma.post.findMany({
      where: { authorId: me.id, deletedAt: null, ...(sp.type && POST_TYPES[sp.type] ? { type: POST_TYPES[sp.type].type } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true, type: true, title: true, slug: true, status: true, viewCount: true, updatedAt: true, rejectionReason: true, city: true, state: true,
        media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true, thumbnailUrl: true } },
      },
    }),
  ])
  const total = counts.reduce((n, c) => n + c._count._all, 0)
  const tabs = counts.filter((c) => POST_TYPES[c.type]).map((c) => ({ key: c.type, label: POST_TYPES[c.type].label, count: c._count._all }))

  return (
    <div className="space-y-5">
      <PageHeading title="Edit the Postings" />

      <nav className="flex flex-wrap gap-1.5" aria-label="Posting type">
        <Link href="/dashboard/postings" className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium ' + (!sp.type ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:text-ink')}>
          All <span className="tabular opacity-70">{total}</span>
        </Link>
        {tabs.map((t) => (
          <Link key={t.key} href={`/dashboard/postings?type=${t.key}`} className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium ' + (sp.type === t.key ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:text-ink')}>
            {t.label} <span className="tabular opacity-70">{t.count}</span>
          </Link>
        ))}
      </nav>

      <section className="card overflow-x-auto">
        {posts.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-ink-3">You have not posted anything yet.</p>
        ) : (
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">Posting</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Views</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const cfg = POST_TYPES[p.type]
                const [cls, label] = STATUS[p.status] ?? ['bg-paper-3 text-ink-3', p.status]
                const img = p.media[0]?.thumbnailUrl ?? p.media[0]?.url
                return (
                  <tr key={p.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="block h-10 w-14 shrink-0 overflow-hidden rounded-md bg-paper-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[320px] truncate font-semibold text-ink">{p.title}</span>
                          <span className="block text-[11.5px] text-ink-3">{[p.city, p.state].filter(Boolean).join(', ') || '—'}</span>
                          {p.status === 'REJECTED' && p.rejectionReason && <span className="block max-w-[320px] truncate text-[11px] text-danger">{p.rejectionReason}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{cfg?.label ?? p.type}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span></td>
                    <td className="tabular px-4 py-3 text-ink-2">{p.viewCount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-[12px] text-ink-3">{p.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-end gap-3 text-[12px]">
                        {p.status === 'PUBLISHED' && cfg && <Link href={`${cfg.publicPath}/${p.slug}`} className="font-semibold text-ink-2 hover:text-brand">View</Link>}
                        <Link href={editHref(p.type, p.id)} className="font-semibold text-brand hover:underline">Edit</Link>
                        <DeletePostingButton id={p.id} title={p.title} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
