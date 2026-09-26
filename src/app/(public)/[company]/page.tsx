import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { formatINR } from '@/lib/utils'
import { productMeta } from '@/lib/products'
import { storefrontBanners } from '@/lib/seller'
import { getAssociate, disciplineOf, tierLabel } from '@/lib/design-associates'
import { Icon, type IconName } from '@/components/ui'
import { StorefrontSlider } from './storefront-slider'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return {}
  const who = a.firmName || a.name
  return {
    title: `${who} — ${a.discipline ?? 'Verified Seller'} in ${a.location || 'India'}`,
    description:
      a.bio?.slice(0, 160) ??
      `${who} is a verified seller on ArchFacing. Browse their products, projects and published work.`,
  }
}

/** GST for the public: first three + last two, the middle starred out. */
function maskGst(gst: string): string {
  if (gst.length <= 5) return gst
  return `${gst.slice(0, 3)}${'•'.repeat(Math.max(0, gst.length - 5))}${gst.slice(-2)}`
}

/**
 * The storefront's Home tab, in the B2B-directory order:
 * banner slider → Our Products → About preview (six info cards + overview) →
 * gallery strip → recent reviews. The header, menu bar and dark footer come
 * from the layout.
 *
 * ★ Every figure is real: product ratings are averages of `Review` rows, the
 *   info cards read the seller's own registration, and an empty shelf says so
 *   instead of hiding.
 */
export default async function AssociateHomePage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company } = await params
  const a = await getAssociate(company)
  if (!a) notFound()

  const who = a.firmName || a.name
  const base = `/${a.slug}`

  const [banners, products, galleryMedia, reviews] = await Promise.all([
    storefrontBanners(a.id),

    prisma.post.findMany({
      where: { authorId: a.id, type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        slug: true,
        title: true,
        meta: true,
        media: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    }),

    prisma.media.findMany({
      where: { type: 'IMAGE', post: { authorId: a.id, status: 'PUBLISHED', deletedAt: null } },
      orderBy: [{ post: { publishedAt: 'desc' } }, { sortOrder: 'asc' }],
      take: 10,
      select: { id: true, url: true },
    }),

    prisma.review.findMany({
      where: { post: { authorId: a.id, deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
        post: { select: { title: true } },
      },
    }),
  ])

  // One grouped query gives every product card its real average.
  const perProduct = products.length
    ? await prisma.review.groupBy({
        by: ['postId'],
        where: { postId: { in: products.map((p) => p.id) } },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : []
  const ratingByPost = new Map(perProduct.map((r) => [r.postId, r._avg.rating ?? 0]))

  const infoCards: { icon: IconName; label: string; value: string }[] = [
    {
      icon: 'building',
      label: 'Nature of Business',
      value: a.discipline ?? (a.company ? 'Registered Business' : 'Professional Practice'),
    },
    {
      icon: 'award',
      label: 'Category',
      value: a.tier ? tierLabel(a.tier) : a.designaType ? disciplineOf(a.designaType) : 'Seller',
    },
    {
      icon: 'clock',
      label: 'Experience',
      value: a.experience != null ? `${a.experience} years` : '—',
    },
    {
      icon: 'shield',
      label: 'GST Registration',
      value: a.company ? 'Registered' : 'Not registered',
    },
    {
      icon: 'file',
      label: 'GST Number',
      value: a.company ? maskGst(a.company.gstNumber) : '—',
    },
    {
      icon: 'star',
      label: 'Membership',
      value: a.membership?.planName ?? 'Starter',
    },
  ]

  return (
    <div className="pb-10">
      {/* ═══════════ banner slider ═══════════ */}
      <StorefrontSlider images={banners} alt={who} />

      <div className="container-af flex flex-col gap-9 pt-7">
        {/* ═══════════ our products ═══════════ */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-ink">Our Products</h2>
            <Link
              href={`${base}/products`}
              className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
            >
              View All →
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="card p-6 text-center text-[13px] text-ink-2">
              {who} has not published any products yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-[7px] sm:grid-cols-3 sm:gap-[10px] md:grid-cols-5 lg:grid-cols-6 lg:gap-[15px]">
              {products.map((p) => {
                const m = productMeta(p.meta)
                const avg = ratingByPost.get(p.id)
                return (
                  <li key={p.id} className="min-w-0">
                    <Link
                      href={`${base}/products/${p.slug}`}
                      className="card-hover group flex h-full min-w-0 flex-col overflow-hidden"
                    >
                      <span className="relative block aspect-square overflow-hidden bg-paper-3">
                        {p.media[0]?.url ? (
                          <Image
                            src={p.media[0].url}
                            alt=""
                            fill
                            sizes="(min-width:1024px) 16vw, (min-width:640px) 30vw, 46vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-ink-4">
                            <Icon name="box" className="h-6 w-6" />
                          </span>
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col p-2 sm:p-2.5">
                        <span className="line-clamp-2 text-[12px] font-medium leading-snug text-ink sm:text-[12.5px]">
                          {p.title}
                        </span>

                        <span className="mt-1.5 flex items-center justify-between gap-1">
                          <span className="truncate text-[12px] font-bold text-brand">
                            {m.price > 0 ? formatINR(m.price) : 'Get Quote'}
                          </span>
                          {avg ? (
                            <span className="flex shrink-0 items-center gap-0.5 text-[10.5px] text-ink-3">
                              <Icon name="star" className="h-3 w-3 text-warn" />
                              <span className="tabular">{Math.round(avg * 10) / 10}</span>
                            </span>
                          ) : null}
                        </span>

                        <span className="mt-2 block rounded-lg border border-brand py-1 text-center text-[11px] font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                          View Details
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ═══════════ about preview ═══════════ */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-ink">About Us</h2>
            <Link
              href={`${base}/about`}
              className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
            >
              Read More →
            </Link>
          </div>

          {/* six info cards */}
          <ul className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
            {infoCards.map((c) => (
              <li
                key={c.label}
                className="min-w-0 rounded-card border border-line-soft bg-paper-2 p-3 text-center"
              >
                <Icon name={c.icon} className="mx-auto h-5 w-5 text-brand" />
                <span className="mt-1.5 block text-[10px] leading-tight text-ink-4">{c.label}</span>
                <span className="mt-0.5 block truncate text-[11.5px] font-bold text-ink">
                  {c.value}
                </span>
              </li>
            ))}
          </ul>

          {/* company overview — first 300 characters */}
          <div className="card mt-4 p-5">
            <h3 className="font-display text-[14px] font-bold text-ink">Company Overview</h3>
            {a.bio ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                {a.bio.length > 300 ? `${a.bio.slice(0, 300)}…` : a.bio}
                {a.bio.length > 300 && (
                  <Link
                    href={`${base}/about`}
                    className="ml-1.5 font-semibold text-brand hover:underline"
                  >
                    Read More
                  </Link>
                )}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-ink-3">
                {who} has not written a company overview yet.
              </p>
            )}
          </div>
        </section>

        {/* ═══════════ gallery strip ═══════════ */}
        {galleryMedia.length > 0 && (
          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-[18px] font-bold text-ink">Gallery</h2>
              <Link
                href={`${base}/gallery`}
                className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
              >
                View All →
              </Link>
            </div>

            <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
              {galleryMedia.map((g) => (
                <li
                  key={g.id}
                  className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[calc((100%-3rem)/5)]"
                >
                  <Link
                    href={`${base}/gallery`}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-line bg-paper-3"
                  >
                    <Image
                      src={g.url}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 19vw, 44vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ═══════════ recent reviews ═══════════ */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-ink">Customer Reviews</h2>
            <Link
              href={`${base}/reviews`}
              className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
            >
              View All →
            </Link>
          </div>

          {reviews.length === 0 ? (
            <p className="card p-6 text-center text-[13px] text-ink-2">
              No reviews yet — be the first to rate {who}&apos;s work.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id} className="card flex min-w-0 flex-col p-4">
                  <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="star"
                        aria-hidden
                        className={`h-3.5 w-3.5 ${i < r.rating ? 'text-warn' : 'text-line'}`}
                      />
                    ))}
                  </span>

                  {r.body && (
                    <blockquote className="mt-2 line-clamp-3 flex-1 text-[12.5px] leading-relaxed text-ink-2">
                      {r.body}
                    </blockquote>
                  )}

                  <p className="mt-3 border-t border-line-soft pt-2.5 text-[11.5px] text-ink-3">
                    <span className="font-semibold text-ink">{r.author.name}</span>
                    {r.post?.title && <span className="block truncate">on {r.post.title}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
