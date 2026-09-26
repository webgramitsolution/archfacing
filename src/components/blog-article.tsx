import Image from 'next/image'
import Link from 'next/link'
import { ArticleBlocks, Glyph, ShareRow, VerifiedTick, photoSrc } from './blog'
import type { ArticleMeta, Block } from '@/lib/content'
import { compactCount, postDate } from '@/lib/content'

/**
 * The article itself — category pill, title, byline, hero picture, body and
 * tags.
 *
 * Pulled out of the public page so that the dashboard's Preview renders
 * through exactly this component. "What the builder shows and what a reader
 * sees are the same thing" is then true because there is only one thing, not
 * because two copies were kept in step.
 *
 * The sidebar, the previous/next navigation and the trust strip stay on the
 * public page: they are about the site around the article, not the article.
 */
export function BlogArticle({
  title,
  meta,
  blocks,
  author,
  publishedAt,
  viewCount,
  categorySlug,
  shareUrl,
  fallbackText,
  draft = false,
}: {
  title: string
  meta: ArticleMeta
  blocks: Block[]
  author: { name: string | null; profilePhoto?: string | null; isVerified?: boolean; badgeTone?: 'gold' | 'blue' | null }
  publishedAt: Date | null
  viewCount: number
  categorySlug: string
  /** omitted in the dashboard preview, where there is nothing to share yet */
  shareUrl?: string
  /** shown when the author has written no sections at all */
  fallbackText?: string
  /** a preview of something not yet published — no live links out */
  draft?: boolean
}) {
  const photo = meta.authorPhoto || author.profilePhoto || ''

  return (
    <article className="min-w-0">
      {draft ? (
        <span className="inline-flex rounded-pill bg-brand-soft px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-brand">
          {meta.categoryLabel}
        </span>
      ) : (
        <Link
          href={`/blog?category=${categorySlug}`}
          className="inline-flex rounded-pill bg-brand-soft px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.09em] text-brand transition-colors hover:bg-brand hover:text-white"
        >
          {meta.categoryLabel}
        </Link>
      )}

      <h1 className="mt-4 font-display text-[27px] font-bold leading-[1.15] tracking-tight text-ink md:text-[34px]">
        {title}
      </h1>

      {/* ─── byline ─── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-paper-3">
            {photo && (
              <Image
                src={photoSrc(photo, { w: 96, h: 96 })}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-bold text-ink">
                By {author.name ?? 'ArchFacing'}
              </span>
              {author.isVerified && <VerifiedTick tone={author.badgeTone} />}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink-3">
              {/* an unpublished article has no date to show yet */}
              <span>{publishedAt ? postDate(publishedAt) : 'Not published yet'}</span>
              {!draft && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Glyph name="eye" className="h-3.5 w-3.5" />
                    {compactCount(viewCount)}
                  </span>
                </>
              )}
            </span>
          </span>
        </div>

        {shareUrl && <ShareRow url={shareUrl} title={title} />}
      </div>

      {/* ─── hero ─── */}
      <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-card bg-paper-3">
        <Image
          src={photoSrc(meta.heroImage, { w: 1200, h: 675 })}
          alt={title}
          fill
          priority
          sizes="(min-width:1024px) 800px, 100vw"
          className="object-cover"
        />
      </div>

      {/* ─── body ─── */}
      {blocks.length > 0 ? (
        <ArticleBlocks blocks={blocks} />
      ) : (
        <p className="mt-7 text-[14.5px] leading-[1.8] text-ink-2">
          {fallbackText || meta.excerpt}
        </p>
      )}

      {/* ─── tags ─── */}
      {meta.tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
          {meta.tags.map((t) => (
            <li key={t}>
              {draft ? (
                <span className="inline-flex rounded-pill bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink-2">
                  #{t}
                </span>
              ) : (
                <Link
                  href={`/blog?q=${encodeURIComponent(t)}`}
                  className="inline-flex rounded-pill bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                >
                  #{t}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
