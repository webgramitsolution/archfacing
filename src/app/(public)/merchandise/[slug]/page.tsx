import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { prisma } from '@/lib/prisma'
import { formatINR } from '@/lib/utils'
import { Icon } from '@/components/ui'
import { BuyBox } from './buy-box'
import { Gallery } from './gallery'

async function getProduct(slug: string) {
  return prisma.post.findFirst({
    where: { slug, type: 'MERCHANDISE', status: 'PUBLISHED', deletedAt: null },
    include: {
      media: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProduct(slug)
  if (!p) return { title: 'Not Found' }
  const img = p.media.find((m) => m.type === 'IMAGE')
  return { title: p.title, description: p.description.slice(0, 155), openGraph: { title: p.title, images: img ? [{ url: img.url }] : undefined } }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const images = product.media.filter((m) => m.type === 'IMAGE').map((m) => m.url)

  const [reviews, agg, related, coupon] = await Promise.all([
    prisma.review.findMany({ where: { postId: product.id }, include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.review.aggregate({ where: { postId: product.id }, _avg: { rating: true }, _count: true }),
    prisma.post.findMany({ where: { type: 'MERCHANDISE', status: 'PUBLISHED', deletedAt: null, category: product.category, id: { not: product.id } }, include: { media: { where: { type: 'IMAGE' }, take: 1 }, variants: { where: { isActive: true }, take: 3 } }, take: 8 }),
    prisma.coupon.findFirst({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'desc' } }),
  ])

  const rating = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0
  const reviewCount = agg._count
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }))

  const couponProp = coupon
    ? { code: coupon.code, label: coupon.type === 'PERCENT' ? `${Number(coupon.value)}% OFF · use code` : `₹${Number(coupon.value)} OFF · use code` }
    : null

  const specs: [string, string][] = [
    ['Category', product.category.replace(/-/g, ' ')],
    ['Available Options', product.variants.map((v) => v.label ?? 'Standard').join(', ') || '—'],
    ['Variations', String(product.variants.length)],
    ['SKU', product.variants[0]?.sku ?? '—'],
    ['Availability', product.variants.some((v) => v.stock > 0) ? 'In Stock' : 'Out of Stock'],
    ['Ships From', 'New Delhi, India'],
  ]

  return (
    <>
      <SiteHeader />
      <main className="bg-paper">
        <div className="container-af py-6">
          {/* top — gallery (sticky) on the left; buy box + specifications on the right.
              items-start keeps the gallery at its own height so sticky can hold. */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start lg:gap-8">
            <Gallery images={images} title={product.title} />

            <div className="space-y-6">
              {product.variants.length > 0 ? (
                <BuyBox
                  title={product.title}
                  images={images}
                  rating={rating}
                  reviewCount={reviewCount}
                  coupon={couponProp}
                  variants={product.variants.map((v) => ({ id: v.id, label: v.label, price: Number(v.price), mrp: v.mrp ? Number(v.mrp) : null, stock: v.stock, lowStockAt: v.lowStockAt }))}
                />
              ) : (
                <p className="text-[14px] text-ink-3">This item is not on sale right now.</p>
              )}

              {/* specifications — sits directly under the buy box's Returns/Shipping row */}
              <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <h2 className="mb-3 font-display text-[16px] font-bold uppercase tracking-wide text-ink">Specifications</h2>
                <dl className="overflow-hidden rounded-xl">
                  {specs.map(([k, v], i) => (
                    <div key={k} className={`grid grid-cols-[130px_1fr] gap-4 px-4 py-2.5 text-[13px] ${i % 2 ? 'bg-paper-2' : 'bg-white'}`}>
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="font-medium capitalize text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* overview — directly under the specifications */}
              <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <h2 className="mb-2 font-display text-[16px] font-bold uppercase tracking-wide text-ink">Overview</h2>
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{product.description}</p>
              </section>
            </div>
          </div>

          {/* related — one auto-sliding row; the track holds two copies so the
              loop is seamless, and hovering the strip pauses it */}
          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-center font-display text-[20px] font-bold text-ink">Related Products</h2>
              <div className="af-marquee -mx-[15px] overflow-hidden px-[15px]">
                <div className="af-marquee-track flex w-max gap-4">
                  {[...related, ...related].map((r, i) => {
                    const prices = r.variants.map((v) => Number(v.price))
                    const mrps = r.variants.map((v) => (v.mrp ? Number(v.mrp) : 0))
                    const min = prices.length ? Math.min(...prices) : 0
                    const mrp = Math.max(...mrps, 0)
                    const off = mrp > min ? Math.round(((mrp - min) / mrp) * 100) : 0
                    return (
                      <Link key={`${r.id}-${i}`} aria-hidden={i >= related.length} href={`/merchandise/${r.slug}`} className="group/card w-[190px] shrink-0 overflow-hidden rounded-xl border border-line bg-white shadow-card transition-shadow hover:shadow-lift">
                        <span className="relative block aspect-square overflow-hidden bg-paper-2">
                          {r.media[0] ? <Image src={r.media[0].thumbnailUrl ?? r.media[0].url} alt="" fill sizes="190px" className="object-cover transition-transform group-hover/card:scale-105" /> : <span className="flex h-full items-center justify-center text-ink-4"><Icon name="bag" className="h-7 w-7" /></span>}
                          {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">Save {off}%</span>}
                        </span>
                        <span className="block p-2.5">
                          <span className="block h-9 text-[12.5px] font-semibold leading-tight text-ink line-clamp-2 group-hover/card:text-brand">{r.title}</span>
                          <span className="mt-1 flex items-baseline gap-1.5"><span className="text-[14px] font-bold text-brand">{formatINR(min)}</span>{off > 0 && <span className="text-[11px] text-ink-4 line-through">{formatINR(mrp)}</span>}</span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* reviews */}
          <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="shrink-0 text-center md:w-[180px]">
                {/*
                  No reviews means no score. Printing "4" over four filled
                  stars beside "0 reviews" invents a rating nobody gave.
                */}
                {reviewCount > 0 ? (
                  <>
                    <p className="font-display text-[40px] font-extrabold leading-none text-ink">{rating}</p>
                    <div className="mt-1 flex justify-center"><StarsBig value={rating} /></div>
                    <p className="mt-1 text-[12px] text-ink-3">out of 5 · {reviewCount} review{reviewCount === 1 ? '' : 's'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-[26px] font-extrabold leading-none text-ink-3">—</p>
                    <p className="mt-2 text-[12px] text-ink-3">No reviews yet</p>
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {dist.map(({ s, n }) => (
                  <div key={s} className="flex items-center gap-2 text-[11.5px] text-ink-3">
                    <span className="w-10 shrink-0">{s} Star</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-[#1E40AF]" style={{ width: `${reviewCount ? (n / reviewCount) * 100 : 0}%` }} /></span>
                    <span className="w-6 shrink-0 text-right">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="mt-5 space-y-4 border-t border-line pt-5">
                <p className="text-[13px] font-bold text-ink">Customer Reviews</p>
                {reviews.map((rv) => (
                  <div key={rv.id} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{rv.author.name[0]?.toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-ink">{rv.author.name}</span><StarsBig value={rv.rating} small /></div>
                      {rv.body && <p className="mt-0.5 text-[12.5px] text-ink-2">{rv.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function StarsBig({ value, small }: { value: number; small?: boolean }) {
  const c = small ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={c} fill={i <= Math.round(value) ? '#F59E0B' : '#E2E8F0'}><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9z" /></svg>
      ))}
    </span>
  )
}
