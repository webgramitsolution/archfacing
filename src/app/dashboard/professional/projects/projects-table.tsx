'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import { deletePostAction, duplicatePostAction, setPostStatusAction } from '../../post-actions'

export type ProjectRow = {
  id: string
  title: string
  description: string
  slug: string
  category: string | null
  /** Primary › Secondary › Tertiary, in display names. */
  categoryPath: string[]
  location: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
  views: number
  date: string
  image: string | null
}

const STATUS: Record<ProjectRow['status'], { label: string; cls: string }> = {
  PUBLISHED: { label: 'Published', cls: 'bg-ok-soft text-ok' },
  PENDING_REVIEW: { label: 'Under Review', cls: 'bg-warn-soft text-warn' },
  DRAFT: { label: 'Draft', cls: 'bg-paper-3 text-ink-3' },
  REJECTED: { label: 'Rejected', cls: 'bg-brand-soft text-brand' },
  ARCHIVED: { label: 'Archived', cls: 'bg-brand-soft text-brand' },
}

type Tab = 'all' | 'published' | 'drafts' | 'review' | 'archived'
const TAB_STATUS: Record<Tab, ProjectRow['status'] | null> = {
  all: null, published: 'PUBLISHED', drafts: 'DRAFT', review: 'PENDING_REVIEW', archived: 'ARCHIVED',
}

export function ProjectsTable({ projects, addHref }: { projects: ProjectRow[]; addHref: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [loc, setLoc] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const categories = useMemo(() => [...new Set(projects.map((p) => p.category).filter(Boolean))] as string[], [projects])
  const locations = useMemo(() => [...new Set(projects.map((p) => p.location).filter(Boolean))], [projects])

  const counts = useMemo(() => ({
    all: projects.length,
    published: projects.filter((p) => p.status === 'PUBLISHED').length,
    drafts: projects.filter((p) => p.status === 'DRAFT').length,
    review: projects.filter((p) => p.status === 'PENDING_REVIEW').length,
    archived: projects.filter((p) => p.status === 'ARCHIVED').length,
  }), [projects])

  const filtered = useMemo(() => {
    let list = projects
    const ts = TAB_STATUS[tab]
    if (ts) list = list.filter((p) => p.status === ts)
    if (status) list = list.filter((p) => p.status === status)
    if (cat) list = list.filter((p) => p.category === cat)
    if (loc) list = list.filter((p) => p.location === loc)
    const term = q.trim().toLowerCase()
    if (term) list = list.filter((p) => [p.title, p.location, p.category].some((v) => (v ?? '').toLowerCase().includes(term)))
    const sorted = [...list]
    if (sort === 'latest') sorted.sort((a, b) => +new Date(b.date) - +new Date(a.date))
    else if (sort === 'oldest') sorted.sort((a, b) => +new Date(a.date) - +new Date(b.date))
    else if (sort === 'views') sorted.sort((a, b) => b.views - a.views)
    else if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [projects, tab, status, cat, loc, q, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const from = filtered.length ? (safePage - 1) * pageSize + 1 : 0
  const to = Math.min(safePage * pageSize, filtered.length)

  const reset = () => { setQ(''); setCat(''); setStatus(''); setLoc(''); setSort('latest'); setTab('all'); setPage(1) }
  const act = (fn: () => Promise<{ ok: boolean }>) => start(async () => { await fn(); setMenuFor(null); router.refresh() })

  return (
    <div className="flex flex-col gap-4">
      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line">
        {([['all', 'All Projects'], ['published', 'Published'], ['drafts', 'Drafts'], ['review', 'Under Review'], ['archived', 'Archived']] as [Tab, string][]).map(([t, label]) => (
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
        <div className="relative min-w-[200px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search projects (title, location, category…)" className="input w-full pl-9" />
        </div>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }} className="input w-auto min-w-[140px]"><option value="">All Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input w-auto min-w-[120px]"><option value="">All Status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={loc} onChange={(e) => { setLoc(e.target.value); setPage(1) }} className="input w-auto min-w-[130px]"><option value="">All Locations</option>{locations.map((l) => <option key={l} value={l}>{l}</option>)}</select>
        <button type="button" onClick={reset} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Reset</button>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-3">Sort By
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto"><option value="latest">Latest First</option><option value="oldest">Oldest First</option><option value="views">Most Views</option><option value="az">A → Z</option></select>
        </label>
      </div>

      {/* table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-[11px] uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Location</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Views</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-ink-3">No projects match your filters.</td></tr>
              ) : rows.map((p) => {
                const st = STATUS[p.status]
                return (
                  <tr key={p.id} className="border-b border-line-soft last:border-0 hover:bg-paper-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                          {p.image ? <Image src={p.image} alt="" fill sizes="56px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-ink-4"><Icon name="file" className="h-4 w-4" /></span>}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{p.title}</p>
                          <p className="max-w-[260px] truncate text-[11.5px] text-ink-3">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{p.categoryPath.length > 0 && (<span title={p.categoryPath.join(' › ')} className="block max-w-[220px]"><span className="rounded-md bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info">{p.categoryPath[0]}</span>{p.categoryPath.length > 1 && <span className="mt-1 block truncate text-[11px] text-ink-3">{p.categoryPath.slice(1).join(' › ')}</span>}</span>)}</td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-[12px] text-ink-2"><Icon name="map" className="h-3.5 w-3.5 shrink-0 text-ink-4" />{p.location || '—'}</span></td>
                    <td className="px-3 py-3"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span></td>
                    <td className="px-3 py-3 text-[12px] text-ink-2">{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-[12px] tabular-nums text-ink-2"><Icon name="eye" className="h-3.5 w-3.5 text-ink-4" />{p.views.toLocaleString('en-IN')}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconBtn href={`/projects/${p.slug}`} icon="eye" title="View" />
                        <IconBtn href={`/dashboard/postings/${p.id}/edit`} icon="edit" title="Edit" />
                        <IconBtn onClick={() => act(() => duplicatePostAction(p.id))} icon="copy" title="Duplicate" disabled={pending} />
                        <IconBtn onClick={() => { if (confirm(`Delete “${p.title}”?`)) act(() => deletePostAction(p.id)) }} icon="trash" title="Delete" danger disabled={pending} />
                        <div className="relative">
                          <IconBtn onClick={() => setMenuFor(menuFor === p.id ? null : p.id)} icon="dots" title="More" />
                          {menuFor === p.id && (
                            <>
                              <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuFor(null)} aria-label="Close" />
                              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lift">
                                {p.status === 'ARCHIVED' ? (
                                  <MenuItem icon="recycle" label="Restore to Draft" onClick={() => act(() => setPostStatusAction(p.id, 'DRAFT'))} />
                                ) : (
                                  <MenuItem icon="inbox" label="Archive" onClick={() => act(() => setPostStatusAction(p.id, 'ARCHIVED'))} />
                                )}
                                <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-2 hover:bg-paper-2"><Icon name="arrow" className="h-3.5 w-3.5" /> Open public page</a>
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
        <span className="text-[12.5px] text-ink-3">Showing {from} to {to} of {filtered.length} projects</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>‹</PageBtn>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)} className={cn('flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium', n === safePage ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-2')}>{n}</button>
            ))}
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

function IconBtn({ href, onClick, icon, title, danger, disabled }: { href?: string; onClick?: () => void; icon: 'eye' | 'edit' | 'copy' | 'trash' | 'dots'; title: string; danger?: boolean; disabled?: boolean }) {
  const cls = cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', danger ? 'text-brand hover:bg-brand-soft' : 'text-ink-3 hover:bg-paper-2 hover:text-brand', disabled && 'pointer-events-none opacity-50')
  if (href) return <Link href={href} title={title} className={cls}><Icon name={icon} className="h-4 w-4" /></Link>
  return <button type="button" title={title} onClick={onClick} disabled={disabled} className={cls}><Icon name={icon} className="h-4 w-4" /></button>
}
function MenuItem({ icon, label, onClick }: { icon: 'inbox' | 'recycle'; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-ink-2 hover:bg-paper-2"><Icon name={icon} className="h-3.5 w-3.5" /> {label}</button>
}
function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded-md text-[13px] text-ink-2 hover:bg-paper-2 disabled:opacity-40">{children}</button>
}
