import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { Icon } from '@/components/ui'
import { sellerProduct } from '../../actions'
import { VariationsManager } from './variations-manager'

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('seller:merchandise')
  const { id } = await params
  const p = await sellerProduct(id)
  if (!p) notFound()

  const variants = p.variants.map((v) => ({
    id: v.id, label: v.label, price: Number(v.price), mrp: v.mrp ? Number(v.mrp) : null,
    stock: v.stock, isActive: v.isActive, sku: v.sku,
  }))
  const defaultTax = p.variants[0] ? Number(p.variants[0].taxPercent) : 12

  return (
    <div className="space-y-5">
      <div className="rise">
        <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Link href="/admin/seller" className="hover:text-brand">Seller Studio</Link><span className="text-ink-4">›</span>
          <Link href="/admin/seller/products" className="hover:text-brand">Product Listing</Link><span className="text-ink-4">›</span>
          <span className="font-semibold text-ink">{p.title}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-[24px] font-bold text-ink">{p.title}</h1>
          <Link href={`/merchandise/${p.slug}`} className="shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">View live page →</Link>
        </div>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        {/* left — product info */}
        <div className="w-full shrink-0 space-y-4 lg:w-[320px]">
          <div className="rise rise-1 rounded-card border border-line bg-white p-4 shadow-card">
            <div className="grid grid-cols-3 gap-2">
              {p.media.slice(0, 6).map((m) => (
                <span key={m.id} className="relative aspect-square overflow-hidden rounded-lg bg-paper-2">
                  <Image src={m.thumbnailUrl ?? m.url} alt="" fill sizes="100px" className="object-cover" />
                </span>
              ))}
              {p.media.length === 0 && <span className="col-span-3 flex h-24 items-center justify-center rounded-lg bg-paper-2 text-ink-4"><Icon name="image" className="h-6 w-6" /></span>}
            </div>
            <dl className="mt-4 space-y-2 text-[12.5px]">
              <Row k="Category" v={<span className="capitalize">{p.category.replace(/-/g, ' ')}</span>} />
              <Row k="Status" v={p.status === 'PUBLISHED' ? 'Live' : p.status.toLowerCase()} />
              <Row k="Variations" v={`${p.variants.length}`} />
              <Row k="Total stock" v={`${p.variants.reduce((a, v) => a + v.stock, 0)}`} />
            </dl>
          </div>
          <div className="rise rise-2 rounded-card border border-line bg-white p-4 shadow-card">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Description</p>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{p.description}</p>
          </div>
        </div>

        {/* right — variations manager */}
        <div className="min-w-0 flex-1">
          <VariationsManager postId={p.id} initial={variants} defaultTax={defaultTax} />
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-3">{k}</dt>
      <dd className="font-semibold text-ink">{v}</dd>
    </div>
  )
}
