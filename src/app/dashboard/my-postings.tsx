import Link from 'next/link'
import Image from 'next/image'
import type { PostType } from '@prisma/client'
import { myPosts } from './post-actions'
import type { PostTypeConfig } from '@/config/post-types'
import { DeletePostingButton } from './delete-posting-button'

/**
 * What this account has already posted of one type, above the form that adds
 * the next one.
 *
 * The sidebar calls these pages "My Projects" and "My Products", but every one
 * of them opened a blank create form and nothing else — a professional with
 * seven projects could not see a single one of them from their own dashboard,
 * and the form's own success message pointed at a "My postings" page that did
 * not exist. `myPosts()` and `deletePostAction()` were already written and had
 * no call site anywhere; this is that call site.
 *
 * Edit opens the same form, loaded, at /dashboard/postings/[id]/edit (§5.2.13).
 */

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-ok-soft text-ok',
  PENDING_REVIEW: 'bg-warn-soft text-warn',
  DRAFT: 'bg-info-soft text-info',
  REJECTED: 'bg-danger-soft text-danger',
  ARCHIVED: 'bg-paper-3 text-ink-3',
}

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Published',
  PENDING_REVIEW: 'In review',
  DRAFT: 'Draft',
  REJECTED: 'Not accepted',
  ARCHIVED: 'Removed',
}

export async function MyPostings({ config }: { config: PostTypeConfig }) {
  const posts = await myPosts(config.type as PostType)

  if (posts.length === 0) {
    // Nothing yet — the form below is the whole page, and a "you have none"
    // panel above it would only push it further down.
    return null
  }

  const live = posts.filter((p) => p.status === 'PUBLISHED').length

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold text-ink">
          Your {config.label.toLowerCase()}
          {posts.length === 1 ? '' : 's'}
          <span className="tabular ml-2 text-[13px] font-medium text-ink-3">
            {posts.length}
          </span>
        </h2>
        <p className="text-[12px] text-ink-3">
          {live} live on{' '}
          <Link href={config.publicPath} className="font-semibold text-brand hover:underline">
            {config.publicPath}
          </Link>
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 wide:grid-cols-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="flex min-w-0 gap-3 rounded-xl border border-line bg-paper-2 p-3"
          >
            <span className="relative block h-[62px] w-[82px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
              {p.media[0] && (
                <Image
                  src={p.media[0].url}
                  alt=""
                  fill
                  sizes="82px"
                  className="object-cover"
                />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-ink">
                  {p.title}
                </span>
                <span
                  className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    STATUS_STYLE[p.status] ?? 'bg-paper-3 text-ink-3'
                  }`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </span>

              <span className="mt-0.5 truncate text-[11.5px] text-ink-3">
                {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                {' · '}
                {p.createdAt.toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>

              <span className="mt-auto flex items-center gap-3 pt-2 text-[11.5px]">
                {p.status === 'PUBLISHED' ? (
                  <Link
                    href={`${config.publicPath}/${p.slug}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    View
                  </Link>
                ) : (
                  <span className="text-ink-4">Not live yet</span>
                )}
                <Link href={`/dashboard/postings/${p.id}/edit`} className="font-semibold text-ink-2 hover:text-brand">Edit</Link>
                <span className="tabular text-ink-4">{p.viewCount} views</span>
                <DeletePostingButton id={p.id} title={p.title} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
