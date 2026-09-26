import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { PostTypeConfig } from '@/config/post-types'
import { VideoEmbed } from '@/components/video-embed'
import { formatINR } from '@/lib/utils'

export async function getPost(config: PostTypeConfig, slug: string) {
  return prisma.post.findFirst({
    where: { slug, type: config.type, status: 'PUBLISHED', deletedAt: null },
    include: {
      media: { orderBy: { sortOrder: 'asc' } },
      author: {
        select: {
          name: true,
          logo: true,
          profilePhoto: true,
          city: true,
          state: true,
          professionalProfile: { select: { designaType: true, firmName: true } },
          consultantProfile: { select: { subCategory: true, firmName: true } },
          corporateProfile: { select: { companyName: true } },
        },
      },
    },
  })
}

export async function PostDetail({
  config,
  slug,
}: {
  config: PostTypeConfig
  slug: string
}) {
  const post = await getPost(config, slug)
  if (!post) notFound()

  // view count — don't await, the page should not be held up
  void prisma.post
    .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  const images = post.media.filter((m) => m.type === 'IMAGE')
  const video = post.media.find((m) => m.type === 'VIDEO_LINK')
  const docs = post.media.filter((m) => m.type === 'PDF' || m.type === 'PPT')
  const meta = (post.meta ?? {}) as Record<string, string | number>

  const authorLine =
    post.author?.professionalProfile?.firmName ??
    post.author?.consultantProfile?.firmName ??
    post.author?.corporateProfile?.companyName ??
    null

  return (
    <article className="container-af py-10">
      <nav className="eyebrow mb-6">
        <Link href={config.publicPath} className="hover:text-brand">
          {config.label}
        </Link>
        {post.category && <span className="mx-2">/</span>}
        {post.category && <span>{post.category.replace(/-/g, ' ')}</span>}
      </nav>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance md:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
          {post.author?.name && <span>{post.author.name}</span>}
          {authorLine && <span>{authorLine}</span>}
          {post.year && <span>{post.year}</span>}
          {post.city && <span>{post.city}</span>}
          {post.state && <span>{post.state}</span>}
          {post.pincode && <span>PIN {post.pincode}</span>}
        </div>
      </header>

      {/* ── main image ── */}
      {images[0] && (
        <div className="relative mb-8 aspect-[5/3] overflow-hidden rounded-card border border-line bg-paper-2">
          <Image
            src={images[0].url}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div className="prose-af mb-8 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-2">
        {post.description}
      </div>

      {/* ── video ── */}
      {video?.embedUrl && video.videoHost && (
        <VideoEmbed
          embedUrl={video.embedUrl}
          host={video.videoHost}
          title={post.title}
        />
      )}

      {/* ── remaining images ── */}
      {images.length > 1 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">More Images</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {images.slice(1).map((m) => (
              <div
                key={m.id}
                className="relative aspect-[5/3] overflow-hidden rounded-card border border-line bg-paper-2"
              >
                <Image
                  src={m.url}
                  alt={post.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── details specific to this type ── */}
      {config.extraFields.some((f) => meta[f.name] != null) && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">Details</h2>
          <dl className="overflow-hidden rounded-card border border-line text-[13.5px]">
            {config.extraFields
              .filter((f) => meta[f.name] != null)
              .map((f) => (
                <div
                  key={f.name}
                  className="flex gap-4 border-b border-line-soft px-4 py-2.5 last:border-0"
                >
                  <dt className="w-44 shrink-0 text-ink-3">{f.label}</dt>
                  <dd className="text-ink">
                    {f.name.toLowerCase().includes('price') ||
                    f.name.toLowerCase().includes('money') ||
                    f.name === 'entryFee' ||
                    f.name === 'forSale'
                      ? formatINR(Number(meta[f.name]))
                      : String(meta[f.name])}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {/* ── documents ── */}
      {docs.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">Documents</h2>
          <ul className="flex flex-col gap-2">
            {docs.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper-2 px-4 py-2.5 text-[13.5px] transition-colors hover:border-ink"
                >
                  <span className="truncate">{d.fileName}</span>
                  <span className="tabular shrink-0 font-mono text-[11px] text-ink-3">
                    {d.type} · {(d.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── contact a PACT holder ── */}
      {post.pincode && (
        <aside className="rounded-card border border-line border-l-[3px] border-l-brand bg-brand-soft p-5">
          <p className="text-[14px] font-semibold">
            Planning similar work in this area?
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
            Talk directly to professionals and consultants in PIN{' '}
            <strong className="font-mono">{post.pincode}</strong>.
          </p>
          <Link
            href={`/consult-nearby?pincode=${post.pincode}`}
            className="mt-4 inline-block rounded-card bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-colors hover:bg-brand"
          >
            Consult Nearby →
          </Link>
        </aside>
      )}
    </article>
  )
}
