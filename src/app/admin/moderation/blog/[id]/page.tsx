import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { BlogArticle } from '@/components/blog-article'
import { Icon } from '@/components/ui'
import { articleBody, articleMeta } from '@/lib/content'
import { ModerationActions } from '../../moderation-actions'

export const metadata: Metadata = { title: 'Review article' }

/**
 * One blog, read in full before it is approved.
 *
 * The queue shows three clamped lines of the description, which for a
 * section-built article says almost nothing — the body lives in
 * `meta.body` and is not in `description` at all. This renders it through
 * `<BlogArticle>`, the same component the public page and the author's own
 * preview use, so a reviewer sees exactly what will go live.
 */
export default async function ReviewBlogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('admin:moderate')
  const { id } = await params

  const post = await prisma.post.findFirst({
    where: { id, type: 'BLOG', deletedAt: null },
    include: {
      author: {
        select: {
          name: true, email: true, role: true, profilePhoto: true,
          professionalProfile: { select: { isVerified: true } },
        },
      },
    },
  })
  if (!post) notFound()

  const m = articleMeta(post.meta)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/moderation?type=BLOG"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:gap-2"
        >
          <Icon name="arrow" className="h-4 w-4 rotate-180 transition-all" />
          Back to the queue
        </Link>
        <p className="text-[12.5px] text-ink-3">
          {post.author.name} · {post.author.role} · {post.author.email}
        </p>
      </div>

      <div className="mx-auto max-w-[820px] rounded-card border border-line bg-paper-2 p-5 md:p-7">
        <BlogArticle
          title={post.title}
          meta={m}
          blocks={articleBody(post.meta)}
          author={{
            name: post.author.name,
            profilePhoto: post.author.profilePhoto,
            isVerified: post.author.professionalProfile?.isVerified,
          }}
          publishedAt={post.publishedAt}
          viewCount={post.viewCount}
          categorySlug={post.category}
          draft
          fallbackText={post.description}
        />
      </div>

      <div className="mx-auto mt-5 max-w-[820px] overflow-hidden rounded-card border border-line bg-paper-2">
        <ModerationActions postId={post.id} />
      </div>
    </div>
  )
}
