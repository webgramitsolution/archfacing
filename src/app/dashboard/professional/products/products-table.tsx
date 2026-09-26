'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/utils'
import { deletePostAction, duplicatePostAction, setPostStatusAction, setFeaturedAction } from '../../post-actions'

export type ProductRow = {
  id: string
  title: string
  description: string
  slug: string
  sku: string
  category: string | null
  /** Primary › Secondary › Tertiary, in display names. */
  categoryPath: string[]
  price: number
  unit: string
  stock: 'IN' | 'LOW' | 'OUT'
  badge: string | null
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
  views: number
  enquiries: number
  featured: boolean
  image: string | null
}
export type ProductKpis = { total: number; published: number; drafts: number; outOfStock: number; views: number; enquiries: number }

const STATUS: Record<ProductRow['status'], { label: string; cls: string }> = {
  PUBLISHED: { label: 'Published', cls: 'bg-ok-soft text-ok' },
  PENDING_REVIEW: { label: 'Under Review', cls: 'bg-warn-soft text-warn' },
  DRAFT: { label: 'Draft', cls: 'bg-paper-3 text-ink-3' },
  REJECTED: { label: 'Rejected', cls: 'bg-brand-soft text-brand' },
  ARCHIVED: { label: 'Archived', cls: 'bg-brand-soft text-brand' },
}
const STOCK: Record<ProductRow['stock'], { label: string; cls: string }> = {
  IN: { label: 'In Stock', cls: 'text-ok' },
  LOW: { label: 'Low Stock', cls: 'text-warn' },
  OUT: { label: 'Out of Stock', cls: 'text-danger' },
}

type Tab = 'all' | 'published' | 'drafts' | 'out'

export function ProductsTable({ products, kpis, addHref }: { products: ProductRow[]; kpis: ProductKpis; addHref: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [stock, setStock] = useState('')
  const [vis, setVis] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>({})

  const isFeatured = (p: ProductRow) => featuredMap[p.id] ?? p.featured
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[], [products])

  const counts = useMemo(() => ({
    all: products.length,
    published: products.filter((p) => p.status === 'PUBLISHED').length,
    drafts: products.filter((p) => p.status === 'DRAFT').length,
    out: products.filter((p) => p.stock === 'OUT').length,
  }), [products])

  const filtered = useMemo(() => {
    let list = products
    if (tab === 'published') list = list.filter((p) => p.status === 'PUBLISHED')
    else if (tab === 'drafts') list = list.filter((p) => p.status === 'DRAFT')
    else if (tab === 'out') list = list.filter((p) => p.stock === 'OUT')
    if (cat) list = list.filter((p) => p.category === cat)
    if (stock) list = list.filter((p) => p.stock === stock)
    if (vis) list = list.filter((p) => (vis === 'featured' ? isFeatured(p) : !isFeatured(p)))
    const term = q.trim().toLowerCase()
    if (term) list = list.filter((p) => [p.title, p.sku, p.category].some((v) => (v ?? '').toLowerCase().includes(term)))
    const s = [...list]
    // 'latest' keeps the server's order, which is already newest first
    // (`createdAt desc` in page.tsx) — reversing it showed the oldest first.
    if (sort === 'price-hi') s.sort((a, b) => b.price - a.price)
    else if (sort === 'price-lo') s.sort((a, b) => a.price - b.price)
    else if (sort === 'views') s.sort((a, b) => b.views - a.views)
    else if (sort === 'az') s.sort((a, b) => a.title.localeCompare(b.title))
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, tab, cat, stock, vis, q, sort, featuredMap])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const from = filtered.length ? (safePage - 1) * pageSize + 1 : 0
  const to = Math.min(safePage * pageSize, filtered.length)

  const reset = () => { setQ(''); setCat(''); setStock(''); setVis(''); setSort('latest'); setTab('all'); setPage(1) }
  const act = (fn: () => Promise<{ ok: boolean }>) => start(async () => { await fn(); setMenuFor(null); router.refresh() })
  const toggleFeatured = (p: ProductRow) => { const next = !isFeatured(p); setFeaturedMap((m) => ({ ...m, [p.id]: next })); start(() => setFeaturedAction(p.id, next).then(() => router.refresh())) }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon="box" tint="bg-info-soft text-info" label="Total Products" value={kpis.total} />
        <Kpi icon="check" tint="bg-ok-soft text-ok" label="Published" value={kpis.published} />
        <Kpi icon="file" tint="bg-paper-3 text-ink-3" label="Drafts" value={kpis.drafts} />
        <Kpi icon="inbox" tint="bg-warn-soft text-warn" label="Out of Stock" value={kpis.outOfStock} />
        <Kpi icon="eye" tint="bg-info-soft text-info" label="Total Views" value={kpis.views} />
        <Kpi icon="mail" tint="bg-pact-soft text-pact" label="Total Enquiries" value={kpis.enquiries} />
      </div>

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line">
        {([['all', 'All Products'], ['published', 'Published'], ['drafts', 'Drafts'], ['out', 'Out of Stock']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} type="button" onClick={() => { setTab(t); setPage(1) }}
            className={cn('relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold transition-colors', tab === t ? 'text-brand' : 'text-ink-2 hover:text-brand')}>
            {label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums', tab === t ? 'bg-brand text-white' : 'bg-paper-3 text-ink-3')}>{counts[t]}</span>
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[190px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search products (name, SKU, category…)" className="input w-full pl-9" />
        </div>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }} className="input w-auto min-w-[135px]"><option value="">All Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={stock} onChange={(e) => { setStock(e.target.value); setPage(1) }} className="input w-auto min-w-[130px]"><option value="">All Stock Status</option><option value="IN">In Stock</option><option value="LOW">Low Stock</option><option value="OUT">Out of Stock</option></select>
        <select value={vis} onChange={(e) => { setVis(e.target.value); setPage(1) }} className="input w-auto min-w-[120px]"><option value="">All Visibility</option><option value="featured">Featured</option><option value="normal">Not Featured</option></select>
        <button type="button" onClick={reset} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Reset</button>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-3">Sort By
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto"><option value="latest">Latest First</option><option value="price-hi">Price: High → Low</option><option value="price-lo">Price: Low → High</option><option value="views">Most Views</option><option value="az">A → Z</option></select>
        </label>
      </div>

      {/* table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">SKU</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Price</th>
                <th className="px-3 py-3 font-semibold">Stock</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Views</th>
                <th className="px-3 py-3 font-semibold">Enquiries</th>
                <th className="px-3 py-3 font-semibold">Featured</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[13px] text-ink-3">No products match your filters.</td></tr>
              ) : rows.map((p) => {
                const st = STATUS[p.status], sk = STOCK[p.stock]
                return (
                  <tr key={p.id} className="border-b border-line-soft last:border-0 hover:bg-paper-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                          {p.image ? <Image src={p.image} alt="" fill sizes="44px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-ink-4"><Icon name="box" className="h-4 w-4" /></span>}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{p.title}</p>
                          <p className="max-w-[220px] truncate text-[11.5px] text-ink-3">{p.description}</p>
                          {p.badge && <span className="mt-0.5 inline-block rounded bg-brand-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-brand">{p.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11.5px] text-ink-2">{p.sku}</td>
                    <td className="px-3 py-3 text-[12px] text-ink-2">{p.categoryPath.length ? (<span title={p.categoryPath.join(' › ')} className="block max-w-[220px]"><span className="block truncate font-medium text-ink">{p.categoryPath[0]}</span>{p.categoryPath.length > 1 && <span className="block truncate text-[11px] text-ink-3">{p.categoryPath.slice(1).join(' › ')}</span>}</span>) : '—'}</td>
                    <td className="px-3 py-3"><span className="text-[13px] font-bold text-ink">{p.price > 0 ? formatINR(p.price) : 'Quote'}</span>{p.unit && <span className="text-[10.5px] text-ink-3"> {p.unit}</span>}</td>
                    <td className="px-3 py-3"><span className={cn('block text-[12px] font-semibold', sk.cls)}>{sk.label}</span></td>
                    <td className="px-3 py-3"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span></td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-[12px] tabular-nums text-ink-2"><Icon name="eye" className="h-3.5 w-3.5 text-ink-4" />{p.views.toLocaleString('en-IN')}</span></td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-[12px] tabular-nums text-ink-2"><Icon name="mail" className="h-3.5 w-3.5 text-ink-4" />{p.enquiries}</span></td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => toggleFeatured(p)} disabled={pending} aria-pressed={isFeatured(p)} aria-label={`Feature ${p.title}`} className="relative inline-flex items-center">
                        <span className={cn('relative h-6 w-11 rounded-full transition-colors', isFeatured(p) ? 'bg-brand' : 'bg-line')}>
                          <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', isFeatured(p) && 'translate-x-5')} />
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconBtn href={`/products/${p.slug}`} icon="eye" title="View" />
                        <IconBtn href={`/dashboard/postings/${p.id}/edit`} icon="edit" title="Edit" />
                        <IconBtn onClick={() => act(() => duplicatePostAction(p.id))} icon="copy" title="Duplicate" disabled={pending} />
                        <IconBtn onClick={() => { if (confirm(`Delete “${p.title}”?`)) act(() => deletePostAction(p.id)) }} icon="trash" title="Delete" danger disabled={pending} />
                        <div className="relative">
                          <IconBtn onClick={() => setMenuFor(menuFor === p.id ? null : p.id)} icon="dots" title="More" />
                          {menuFor === p.id && (
                            <>
                              <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuFor(null)} aria-label="Close" />
                              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lift">
                                {p.status === 'ARCHIVED'
                                  ? <MenuItem icon="recycle" label="Restore to Draft" onClick={() => act(() => setPostStatusAction(p.id, 'DRAFT'))} />
                                  : <MenuItem icon="inbox" label="Archive" onClick={() => act(() => setPostStatusAction(p.id, 'ARCHIVED'))} />}
                                <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-2 hover:bg-paper-2"><Icon name="arrow" className="h-3.5 w-3.5" /> Open public page</a>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* footer / pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-3">Showing {from} to {to} of {filtered.length} products</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>‹</PageBtn>
            {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)} className={cn('flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium', n === safePage ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-2')}>{n}</button>
            ))}
            {pages > 5 && <><span className="px-1 text-ink-4">…</span><button type="button" onClick={() => setPage(pages)} className={cn('flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium', pages === safePage ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-2')}>{pages}</button></>}
            <PageBtn onClick={() => setPage(safePage + 1)} disabled={safePage >= pages}>›</PageBtn>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-ink-3">Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="input w-auto py-1">{[8, 12, 24, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            per page
          </label>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, tint, label, value }: { icon: IconName; tint: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-white px-3.5 py-3 shadow-card">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tint)}><Icon name={icon} className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-ink-3">{label}</span>
        <span className="tabular block font-display text-[19px] font-bold leading-tight text-ink">{value.toLocaleString('en-IN')}</span>
      </span>
    </div>
  )
}
function IconBtn({ href, onClick, icon, title, danger, disabled }: { href?: string; onClick?: () => void; icon: IconName; title: string; danger?: boolean; disabled?: boolean }) {
  const cls = cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', danger ? 'text-brand hover:bg-brand-soft' : 'text-ink-3 hover:bg-paper-2 hover:text-brand', disabled && 'pointer-events-none opacity-50')
  if (href) return <Link href={href} title={title} className={cls}><Icon name={icon} className="h-4 w-4" /></Link>
  return <button type="button" title={title} onClick={onClick} disabled={disabled} className={cls}><Icon name={icon} className="h-4 w-4" /></button>
}
function MenuItem({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-ink-2 hover:bg-paper-2"><Icon name={icon} className="h-3.5 w-3.5" /> {label}</button>
}
function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded-md text-[13px] text-ink-2 hover:bg-paper-2 disabled:opacity-40">{children}</button>
}
