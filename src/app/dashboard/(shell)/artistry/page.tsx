import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import type { PostStatus } from '@prisma/client'
import { requirePermission } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { EmptyState, Icon } from '@/components/ui'
import { artworkMeta } from '@/lib/artistry'
import { photoSrc } from '@/components/blog'
import { myArtistry } from './artistry-actions'

export const metadata: Metadata = { title: 'My Artistry Uploads' }

/**
 * Every artwork on this account, whatever its state.
 *
 * One route for all five roles that hold `post:artistry` — the role folders
 * that used to carry byte-identical copies now redirect here.
 */

const STATUS: Record<string, { label: string; tone: string; note?: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-paper-3 text-ink-3', note: 'Only you can see this' },
  PENDING_REVIEW: { label: 'In review', tone: 'bg-warn-soft text-warn', note: 'With the ArchFacing team' },
  PUBLISHED: { label: 'Published', tone: 'bg-ok-soft text-ok' },
  REJECTED: { label: 'Sent back', tone: 'bg-danger-soft text-danger' },
  ARCHIVED: { label: 'Removed', tone: 'bg-paper-3 text-ink-3' },
}

/** The filter rows the dashboard menu links at. */
const FILTERS: { key: string; label: string; status?: PostStatus }[] = [
  { key: 'all', label: 'All Artistry' },
  { key: 'draft', label: 'Drafts', status: 'DRAFT' },
  { key: 'review', label: 'Pending Review', status: 'PENDING_REVIEW' },
  { key: 'published', label: 'Published', status: 'PUBLISHED' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
]

export default async function MyArtistryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requirePermission('post:artistry')
  const sp = await searchParams

  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0]
  const rows = await myArtistry(filter.status)

  return (
    <div>
      <PageHeading title="My Artistry Uploads" pdfRef="5.2.5">
        Heritage, art, design and architectural expression — post your work, and the ArchFacing
        team reviews it before it appears on the public gallery.
      </PageHeading>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by state" className="flex min-w-0 flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/dashboard/artistry' : `/dashboard/artistry?status=${f.key}`}
              aria-current={f.key === filter.key ? 'page' : undefined}
              className={
                f.key === filter.key
                  ? 'inline-flex rounded-pill bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-white'
                  : 'inline-flex rounded-pill border border-line bg-paper-2 px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand'
              }
            >
              {f.label}
            </Link>
          ))}
        </nav>

        <Link href="/dashboard/artistry/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Create New Artistry
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Nothing here yet"
          action={
            <Link href="/dashboard/artistry/new" className="btn-primary">
              Create New Artistry
            </Link>
          }
        >
          {filter.key === 'all'
            ? 'Post your first piece — heritage, art, design or an architectural expression.'
            : `No artwork is ${filter.label.toLowerCase()} right now.`}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const m = artworkMeta(row.meta)
            const s = STATUS[row.status] ?? STATUS.DRAFT

            return (
              <li key={row.id}>
                <article className="card flex min-w-0 items-center gap-4 bg-paper p-3.5">
                  <span className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-paper-3 sm:block">
                    {m.image && (
                      <Image
                        src={photoSrc(m.image, { w: 240, h: 160 })}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`rounded-pill px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.07em] ${s.tone}`}>
                        {s.label}
                      </span>
                      {row.status === 'PUBLISHED' && (
                        <span className="tabular text-[11.5px] text-ink-3">
                          {row.viewCount} views
                        </span>
                      )}
                    </span>

                    <span className="mt-1.5 block truncate font-display text-[14.5px] font-bold text-ink">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                      {m.categoryLabel}
                      {m.subCategoryLabel ? ` · ${m.subCategoryLabel}` : ''}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>

                    {row.status === 'REJECTED' && row.rejectionReason && (
                      <span className="mt-1.5 block text-[11.5px] text-danger">
                        {row.rejectionReason}
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/dashboard/artistry/${row.id}/edit`}
                      className="btn-outline px-3 py-1.5 text-[12.5px]"
                    >
                      Edit
                    </Link>
                    {row.status === 'PUBLISHED' && (
                      <Link
                        href={`/artistry/${row.slug}`}
                        className="btn-outline px-3 py-1.5 text-[12.5px]"
                      >
                        View
                      </Link>
                    )}
                  </span>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
