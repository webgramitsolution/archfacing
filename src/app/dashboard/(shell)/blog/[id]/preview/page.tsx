import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { BlogArticle } from '@/components/blog-article'
import { Icon } from '@/components/ui'
import { articleBody, articleMeta } from '@/lib/content'
import { getBlogForEdit } from '../../blog-actions'

export const metadata: Metadata = { title: 'Preview blog' }

/**
 * The article exactly as a reader will see it.
 *
 * Renders through `<BlogArticle>` — the same component the public page at
 * /blog/[slug] uses. There is no second renderer to drift out of step: if the
 * preview looks right, the published page looks right, because they are the
 * same code reading the same `meta.body`.
 *
 * The public sidebar is not repeated here. It is about the site around the
 * article — related posts, the newsletter — and none of it changes with what
 * the author writes.
 */
export default async function PreviewBlogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('post:blog')
  const { id } = await params

  const post = await getBlogForEdit(id)
  if (!post) notFound()

  const m = articleMeta(post.meta)
  const blocks = articleBody(post.meta)
  const live = post.status === 'PUBLISHED'

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/20 bg-info-soft px-4 py-3">
        <p className="text-[12.5px] text-ink-2">
          <strong className="font-semibold text-ink">Preview.</strong> This is the
          article as a reader will see it.
          {!live && ' It is not published yet.'}
        </p>
        <span className="flex items-center gap-3">
          <Link
            href={`/dashboard/blog/${post.id}/edit`}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:gap-1.5"
          >
            <Icon name="arrow" className="h-3.5 w-3.5 rotate-180 transition-all" />
            Back to editing
          </Link>
          {live && (
            <Link
              href={`/blog/${post.slug}`}
              className="text-[12.5px] font-semibold text-ink-3 hover:text-brand"
            >
              View live
            </Link>
          )}
        </span>
      </div>

      {/* the same width the public article column gets, so line lengths match */}
      <div className="mx-auto max-w-[820px] rounded-xl border border-line bg-paper-2 p-5 md:p-7">
        <BlogArticle
          title={post.title}
          meta={m}
          blocks={blocks}
          author={{
            name: post.author.name,
            profilePhoto: post.author.profilePhoto,
            isVerified: post.author.professionalProfile?.isVerified,
          }}
          publishedAt={post.publishedAt}
          viewCount={post.viewCount}
          categorySlug={post.category}
          draft={!live}
          fallbackText="No sections yet — go back and add the first one."
        />
      </div>
    </div>
  )
}
