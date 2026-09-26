import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { requirePermission } from '@/lib/guard'
import { AdminPageHead } from '@/components/admin/parts'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { sellerCatalogue } from '../actions'

export const metadata: Metadata = { title: 'Product Listing' }
export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  PUBLISHED: 'bg-ok-soft text-ok',
  DRAFT: 'bg-warn-soft text-warn',
  ARCHIVED: 'bg-paper-3 text-ink-3',
  PENDING_REVIEW: 'bg-[#EAF2FF] text-[#2563EB]',
}

export default async function ProductListingPage() {
  await requirePermission('seller:merchandise')
  const products = await sellerCatalogue()

  const rows = products.map((p) => {
    const prices = p.variants.map((v) => Number(v.price))
    const stock = p.variants.reduce((a, v) => a + v.stock, 0)
    const min = prices.length ? Math.min(...prices) : 0
    const max = prices.length ? Math.max(...prices) : 0
    return { p, min, max, stock }
  })

  const totalStock = rows.reduce((a, r) => a + r.stock, 0)
  const live = products.filter((p) => p.status === 'PUBLISHED').length

  return (
    <div className="space-y-5">
      <div className="rise flex items-start justify-between gap-4">
        <AdminPageHead title="Product Listing">
          Your merchandise catalogue — every product and its variations. Click a product to manage its variations, stock and price.
        </AdminPageHead>
        <Link href="/admin/seller/new-merchandise" className="btn-primary shrink-0">
          <Icon name="plus" className="h-4 w-4" /> Add Product
        </Link>
      </div>

      <section className="rise rise-1 grid grid-cols-4 gap-3">
        <Stat label="Total Products" value={products.length} icon="box" bg="#EEF1FF" fg="#6366F1" />
        <Stat label="Published" value={live} icon="check" bg="#E7F7EE" fg="#16A34A" />
        <Stat label="Total Variations" value={rows.reduce((a, r) => a + r.p.variants.length, 0)} icon="list" bg="#FFF1E6" fg="#EA580C" />
        <Stat label="Units in Stock" value={totalStock} icon="tag" bg="#F3EAFE" fg="#8B5CF6" />
      </section>

      <section className="rise rise-2 rounded-card border border-line bg-white p-4 shadow-card">
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name="box" className="h-6 w-6" /></span>
            <p className="mt-3 text-[13px] font-semibold text-ink">No products yet</p>
            <p className="mt-1 text-[12px] text-ink-3">Add your first merchandise product with its variations.</p>
            <Link href="/admin/seller/new-merchandise" className="btn-primary mt-4 inline-flex"><Icon name="plus" className="h-4 w-4" /> Add Product</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                  <th className="px-2 py-2.5 font-semibold">#</th>
                  <th className="px-2 py-2.5 font-semibold">Product</th>
                  <th className="px-2 py-2.5 font-semibold">Category</th>
                  <th className="px-2 py-2.5 font-semibold">Variations</th>
                  <th className="px-2 py-2.5 font-semibold">Price</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Stock</th>
                  <th className="px-2 py-2.5 font-semibold">Status</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map(({ p, min, max, stock }, i) => (
                  <tr key={p.id} className="text-[12.5px] row-hover">
                    <td className="px-2 py-3 text-ink-4">{i + 1}</td>
                    <td className="px-2 py-3">
                      <Link href={`/admin/seller/products/${p.id}`} className="flex items-center gap-2.5">
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper-2 text-ink-4">
                          {p.media[0] ? <Image src={p.media[0].thumbnailUrl ?? p.media[0].url} alt="" fill sizes="44px" className="object-cover" /> : <Icon name="box" className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0"><span className="block max-w-[220px] truncate font-semibold text-ink hover:text-brand">{p.title}</span><span className="block text-[10.5px] text-ink-4">SKU {p.variants[0]?.sku ?? '—'}</span></span>
                      </Link>
                    </td>
                    <td className="px-2 py-3 capitalize text-ink-2">{p.category.replace(/-/g, ' ')}</td>
                    <td className="px-2 py-3"><span className="inline-flex items-center rounded-pill bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{p.variants.length} variation{p.variants.length === 1 ? '' : 's'}</span></td>
                    <td className="px-2 py-3 font-semibold text-ink">{min === max ? formatINR(min) : `${formatINR(min)} – ${formatINR(max)}`}</td>
                    <td className={`px-2 py-3 text-center font-semibold ${stock === 0 ? 'text-danger' : stock <= 5 ? 'text-warn' : 'text-ink-2'}`}>{stock}</td>
                    <td className="px-2 py-3"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${STATUS[p.status] ?? 'bg-paper-3 text-ink-3'}`}>{p.status === 'PUBLISHED' ? 'Live' : p.status.charAt(0) + p.status.slice(1).toLowerCase().replace('_', ' ')}</span></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1 text-ink-4">
                        <Link href={`/admin/seller/products/${p.id}`} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold hover:bg-paper-3 hover:text-brand"><Icon name="settings" className="h-3.5 w-3.5" /> Manage</Link>
                        <Link href={`/merchandise/${p.slug}`} aria-label={`View ${p.title} on the store`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3.5 w-3.5" /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, icon, bg, fg }: { label: string; value: number; icon: 'box' | 'check' | 'list' | 'tag'; bg: string; fg: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color: fg }}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        <span className="text-[11.5px] text-ink-3">{label}</span>
      </div>
      <p className="tabular mt-2 font-display text-[22px] font-bold text-ink">{value.toLocaleString('en-IN')}</p>
    </div>
  )
}
