import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { requirePermission } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { EmptyState, Icon } from '@/components/ui'
import { articleMeta, postDate } from '@/lib/content'
import { photoSrc } from '@/components/blog'
import { myBlogs } from './blog-actions'
import { BlogRowActions } from './blog-row-actions'

export const metadata: Metadata = { title: 'My Blogs' }

/**
 * Every blog on this account, whatever its state.
 *
 * One route for all four roles that hold `post:blog`. The four role folders
 * used to carry byte-identical copies of a page, and Corporate's was
 * unreachable because its menu had no blog entry at all.
 */

const STATUS: Record<string, { label: string; tone: string; note?: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-paper-3 text-ink-3', note: 'Only you can see this' },
  PENDING_REVIEW: { label: 'In review', tone: 'bg-warn-soft text-warn', note: 'With the ArchFacing team' },
  PUBLISHED: { label: 'Published', tone: 'bg-ok-soft text-ok' },
  REJECTED: { label: 'Sent back', tone: 'bg-danger-soft text-danger' },
  ARCHIVED: { label: 'Removed', tone: 'bg-paper-3 text-ink-3' },
}

export default async function MyBlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>
}) {
  await requirePermission('post:blog')
  const { sent } = await searchParams
  const blogs = await myBlogs()

  return (
    <div>
      <PageHeading
        title="My Blogs"
        pdfRef="5.2.6"
        action={
          <Link href="/dashboard/blog/new" className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            Write a blog
          </Link>
        }
      >
        Share your perspective — industry, technology, experience. Build the
        article from sections, then send it for review.
      </PageHeading>

      {sent && (
        <div className="mb-5 rounded-xl border border-ok/20 bg-ok-soft px-4 py-3 text-[13px] text-ink-2">
          <strong className="font-semibold text-ink">Sent for review.</strong> The
          ArchFacing team will read it and publish it — you will get a notification
          either way.
        </div>
      )}

      {blogs.length === 0 ? (
        <EmptyState
          icon="file"
          title="No blogs yet"
          action={
            <Link href="/dashboard/blog/new" className="btn-primary">
              Write your first blog
            </Link>
          }
        >
          An article is built from sections — headings, paragraphs, picture
          grids, quotes. Nothing is published until you send it for review.
        </EmptyState>
      ) : (
        /* Rows, not a card grid — a blog is a title and a state, and a tall
           card per article made four of them fill the screen. */
        <ul className="flex flex-col gap-3">
          {blogs.map((b) => {
            const m = articleMeta(b.meta)
            const s = STATUS[b.status] ?? STATUS.DRAFT

            return (
              <li
                key={b.id}
                className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-line bg-white p-3.5 shadow-card sm:flex-row sm:items-center"
              >
                <span className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden rounded-lg bg-paper-3 sm:aspect-auto sm:h-[76px] sm:w-[132px]">
                  {m.heroImage && (
                    <Image
                      src={photoSrc(m.heroImage, { w: 320, h: 180 })}
                      alt=""
                      fill
                      sizes="(min-width:640px) 132px, 100vw"
                      className="object-cover"
                    />
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.tone}`}
                    >
                      {s.label}
                    </span>
                    <h2 className="min-w-0 truncate font-display text-[14.5px] font-bold text-ink">
                      {b.title}
                    </h2>
                  </span>

                  <p className="text-[11.5px] text-ink-3">
                    {m.categoryLabel}
                    {' · '}
                    {b.publishedAt ? postDate(b.publishedAt) : `Edited ${postDate(b.updatedAt)}`}
                    {b.status === 'PUBLISHED' ? ` · ${b.viewCount} views` : ''}
                    {b.status !== 'REJECTED' && s.note ? ` · ${s.note}` : ''}
                  </p>

                  {b.status === 'REJECTED' && b.rejectionReason && (
                    <p className="mt-1 rounded-lg bg-danger-soft px-2.5 py-2 text-[11.5px] leading-snug text-ink-2">
                      <strong className="font-semibold text-danger">Sent back:</strong>{' '}
                      {b.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[12px] sm:shrink-0">
                  <Link
                    href={`/dashboard/blog/${b.id}/edit`}
                    className="font-semibold text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/blog/${b.id}/preview`}
                    className="text-ink-3 hover:text-brand"
                  >
                    Preview
                  </Link>
                  {b.status === 'PUBLISHED' && (
                    <Link href={`/blog/${b.slug}`} className="text-ink-3 hover:text-brand">
                      View live
                    </Link>
                  )}
                  <BlogRowActions id={b.id} title={b.title} status={b.status} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
