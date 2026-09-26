import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { getAssociate } from '@/lib/design-associates'
import { EmptyState, Icon } from '@/components/ui'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return {}
  return { title: `Gallery — ${a.firmName || a.name}` }
}

/**
 * The storefront Gallery — every photograph and video the seller has published,
 * pulled straight off their `Post` media. There is no separate gallery store;
 * what they publish IS the gallery, which keeps it honest and always current.
 */
export default async function SellerGalleryPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company } = await params
  const a = await getAssociate(company)
  if (!a) notFound()

  const media = await prisma.media.findMany({
    where: {
      post: { authorId: a.id, status: 'PUBLISHED', deletedAt: null },
    },
    orderBy: [{ post: { publishedAt: 'desc' } }, { sortOrder: 'asc' }],
    take: 60,
    select: {
      id: true,
      type: true,
      url: true,
      post: { select: { title: true, slug: true, type: true } },
    },
  })

  const images = media.filter((m) => m.type === 'IMAGE')
  const videos = media.filter((m) => m.type === 'VIDEO_LINK')

  return (
    <div className="container-af flex flex-col gap-8 py-7">
      {/* ─── photographs ─── */}
      <section className="min-w-0">
        <h2 className="mb-4 font-display text-[17px] font-bold text-ink">
          Photo Gallery
          <span className="tabular ml-2 text-[12.5px] font-normal text-ink-4">{images.length}</span>
        </h2>

        {images.length === 0 ? (
          <EmptyState icon="image" title="No photographs yet">
            Photographs appear here as soon as {a.firmName || a.name} publishes work with
            images.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {images.map((m) => (
              <li key={m.id} className="min-w-0">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-lg border border-line bg-paper-3"
                >
                  <Image
                    src={m.url}
                    alt={m.post?.title ?? ''}
                    fill
                    sizes="(min-width:1024px) 16vw, (min-width:640px) 30vw, 46vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── videos ─── */}
      <section className="min-w-0">
        <h2 className="mb-4 font-display text-[17px] font-bold text-ink">
          Videos
          <span className="tabular ml-2 text-[12.5px] font-normal text-ink-4">{videos.length}</span>
        </h2>

        {videos.length === 0 ? (
          /* Four quiet placeholders, as the reference draws the empty state. */
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="flex aspect-video items-center justify-center rounded-lg border border-line bg-paper-3 text-[12px] text-ink-4"
              >
                No Video
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {videos.map((v) => (
              <li key={v.id} className="min-w-0">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-line bg-navy"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand shadow-md transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-navy/90 to-transparent px-2.5 pb-2 pt-6 text-[11px] text-white/85">
                    {v.post?.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 text-[11.5px] text-ink-4">
        <Icon name="image" className="h-3.5 w-3.5" />
        Everything here comes from {a.firmName || a.name}&apos;s published postings.
      </p>
    </div>
  )
}
