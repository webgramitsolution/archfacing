import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat } from '@/components/admin/parts'
import { ModerationActions } from './moderation-actions'
import { ALL_POST_TYPES } from '@/config/post-types'

export const metadata: Metadata = { title: 'Moderation Queue' }
export const dynamic = 'force-dynamic'

/**
 * THE content page of the Super Admin. Every posting — Project, Product,
 * Around Us, Artistry, Blog, Competition — waits in this one queue with a type
 * filter; there are deliberately no per-type management pages. The admin's job
 * is approve / reject, not CRUD.
 */
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  await requirePermission('admin:moderate')
  const { type } = await searchParams

  const valid = ALL_POST_TYPES.some((c) => c.type === type)
  const filter = valid ? type : undefined

  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const [posts, byType, oldest, approved7, rejected7] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: 'PENDING_REVIEW',
        deletedAt: null,
        ...(filter ? { type: filter as never } : {}),
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        author: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // tab counts are always the unfiltered totals
    prisma.post.groupBy({
      by: ['type'],
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      _count: { _all: true },
    }),
    prisma.post.findFirst({
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED', reviewedAt: { gte: since7 }, deletedAt: null } }),
    prisma.post.count({ where: { status: 'REJECTED', reviewedAt: { gte: since7 } } }),
  ])

  const countOf = (t: string) => byType.find((r) => r.type === t)?._count._all ?? 0
  const total = byType.reduce((s, r) => s + r._count._all, 0)
  const oldestDays = oldest
    ? Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / 86_400_000)
    : 0

  return (
    <div className="space-y-5">
      <AdminPageHead title="Moderation Queue">
        Every posting lands here before it publishes — one queue for all content
        types. Oldest first, so nothing waits forever.
      </AdminPageHead>

      {/* stats */}
      <section className="grid grid-cols-4 gap-4">
        <MiniStat
          icon="shield"
          label="Waiting now"
          value={total}
          tint={total > 0 ? { bg: '#FFE9EC', fg: '#E11D48' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint={total > 0 ? 'across all content types' : 'queue is clear'}
        />
        <MiniStat
          icon="clock"
          label="Oldest waiting"
          value={total > 0 ? `${oldestDays}d` : '—'}
          tint={{ bg: '#FEF2E2', fg: '#EA9412' }}
          hint={total > 0 ? 'review oldest first' : 'nothing pending'}
        />
        <MiniStat icon="check" label="Approved (7 days)" value={approved7} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="published after review" />
        <MiniStat icon="alert" label="Rejected (7 days)" value={rejected7} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="sent back to the author" />
      </section>

      {/* type filter */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/moderation"
          className={
            'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
            (!filter ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
          }
        >
          All <span className={'tabular ' + (!filter ? 'text-white/70' : 'text-ink-4')}>{total}</span>
        </Link>
        {ALL_POST_TYPES.map((c) => {
          const on = filter === c.type
          return (
            <Link
              key={c.type}
              href={`/admin/moderation?type=${c.type}`}
              className={
                'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
                (on ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
              }
            >
              {c.label}
              <span className={'tabular ' + (on ? 'text-white/70' : 'text-ink-4')}>{countOf(c.type)}</span>
            </Link>
          )
        })}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-card border border-line bg-white px-6 py-16 text-center shadow-card">
          <p className="font-display text-[15px] font-bold text-ink">Queue is clear</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Every {filter ? ALL_POST_TYPES.find((c) => c.type === filter)?.label.toLowerCase() : 'posting'} has been reviewed.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((p) => {
            const config = ALL_POST_TYPES.find((c) => c.type === p.type)
            const cover = p.media.find((m) => m.type === 'IMAGE')
            const video = p.media.find((m) => m.type === 'VIDEO_LINK')

            return (
              <li key={p.id} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                <div className="flex gap-4 p-5">
                  {cover && (
                    <div className="relative aspect-[5/3] w-52 shrink-0 overflow-hidden rounded-lg border border-line">
                      <Image src={cover.url} alt={p.title} fill sizes="208px" className="object-cover" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="pill-info">{config?.label ?? p.type}</span>
                      <span className="text-[10.5px] font-medium uppercase tracking-wider text-ink-4">
                        {p.author.role}
                      </span>
                      {p.isPaidCategory && <span className="pill-warn">Paid category</span>}
                    </div>

                    <h2 className="font-display text-[15.5px] font-bold text-ink">{p.title}</h2>

                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
                      {p.description}
                    </p>

                    <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
                      <span className="font-medium text-ink-2">{p.author.name}</span>
                      <span>{p.category}</span>
                      {p.subCategory && <span>{p.subCategory}</span>}
                      {p.year && <span>{p.year}</span>}
                      {p.pincode && <span>PIN {p.pincode}</span>}
                      <span>{p.media.filter((m) => m.type === 'IMAGE').length} images</span>
                      {video && (
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand hover:underline"
                        >
                          {video.videoHost} video ↗
                        </a>
                      )}
                    </dl>

                    {/* a blog is sections, not a paragraph — open it as a reader would see it */}
                    {p.type === 'BLOG' && (
                      <Link
                        href={`/admin/moderation/blog/${p.id}`}
                        className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:gap-1.5"
                      >
                        Read the full article →
                      </Link>
                    )}
                  </div>
                </div>

                <ModerationActions postId={p.id} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
