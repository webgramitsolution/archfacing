import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@/components/ui'
import { Panel, ViewAll, Select, Pagination, fmtDate, ago } from '@/components/admin/parts'
import { contentOverview, listContent, type ContentCfg, type ContentRow } from '@/lib/admin-content'
import { toggleFeaturedAction } from '@/app/admin/moderation/actions'

/**
 * The shared super-admin content listing — one page for Projects, Products,
 * Around Us, Artistry and Blog. Everything type-specific comes from `cfg`; the
 * "Add New" button opens the SAME shared dashboard PostForm at /admin/<slug>/add.
 */

export type ContentSP = { tab?: string; category?: string; location?: string; status?: string; q?: string; page?: string; sort?: string }

const STATUS: Record<string, { cls: string; label: string }> = {
  PUBLISHED: { cls: 'bg-ok-soft text-ok', label: 'Published' },
  DRAFT: { cls: 'bg-warn-soft text-warn', label: 'Draft' },
  PENDING_REVIEW: { cls: 'bg-[#EAF2FF] text-[#2563EB]', label: 'Under Review' },
  ARCHIVED: { cls: 'bg-paper-3 text-ink-3', label: 'Archived' },
  REJECTED: { cls: 'bg-danger-soft text-danger', label: 'Rejected' },
}

export async function ContentListing({ cfg, sp }: { cfg: ContentCfg; sp: ContentSP }) {
  const base = `/admin/${cfg.slug}`
  const tab = sp.tab ?? 'all'
  const page = Math.max(1, Number(sp.page) || 1)

  const [overview, list] = await Promise.all([
    contentOverview(cfg),
    listContent(cfg, { tab, category: sp.category, location: sp.location, status: sp.status, q: sp.q, sort: sp.sort, page, perPage: 10 }),
  ])

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1
  const end = Math.min(list.total, list.page * list.perPage)

  const qs = (over: Partial<ContentSP>) => {
    const merged: ContentSP = { tab, category: sp.category, location: sp.location, status: sp.status, q: sp.q, sort: sp.sort, ...over }
    const p = new URLSearchParams()
    if (merged.tab && merged.tab !== 'all') p.set('tab', merged.tab)
    if (merged.category && merged.category !== 'all') p.set('category', merged.category)
    if (merged.location && merged.location !== 'all') p.set('location', merged.location)
    if (merged.status && merged.status !== 'all') p.set('status', merged.status)
    if (merged.q) p.set('q', merged.q)
    if (merged.sort && merged.sort !== 'newest') p.set('sort', merged.sort)
    if (merged.page && merged.page !== '1') p.set('page', String(merged.page))
    const s = p.toString()
    return s ? `${base}?${s}` : base
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <span className="text-ink-3">Content &amp; Platform</span><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">{cfg.titlePlural}</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">{cfg.titlePlural}</h1>
        </div>
        <Link href={`${base}/add`} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">
          <Icon name="plus" className="h-4 w-4" /> {cfg.addLabel}
        </Link>
      </div>

      {/* KPI cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {overview.stats.map((m) => (
          <div key={m.key} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: m.tint.bg, color: m.tint.fg }}><Icon name={m.icon} className="h-[18px] w-[18px]" /></span>
              <span className="text-[11.5px] leading-tight text-ink-3">{m.label}</span>
            </div>
            <p className="tabular mt-2.5 font-display text-[22px] font-bold leading-none text-ink">{m.value}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-3">{m.pct != null && m.pct !== 0 ? (m.pct > 0 ? <span className="font-semibold text-ok">↑ {m.pct}%</span> : <span className="font-semibold text-danger">↓ {Math.abs(m.pct)}%</span>) : null} {m.hint}</p>
          </div>
        ))}
      </section>

      <div className="flex gap-5">
        {/* main column */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* tabs */}
          <div className="rise rise-2 flex flex-wrap items-center gap-1 border-b border-line">
            {overview.tabs.map((t) => {
              const on = tab === t.key
              return (
                <Link key={t.key} href={qs({ tab: t.key, page: '1' })}
                  className={'border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ' + (on ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}>
                  {t.label} <span className="tabular text-ink-4">({t.count.toLocaleString('en-IN')})</span>
                </Link>
              )
            })}
          </div>

          <section className="rise rise-2 rounded-card border border-line bg-white p-4 shadow-card">
            {/* filters */}
            <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="tab" value={tab} />
              <label className="relative min-w-[200px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
                <input name="q" defaultValue={sp.q ?? ''} placeholder={`Search ${cfg.titlePlural.toLowerCase()} by title, location…`} className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
              </label>
              <Select name="category" value={sp.category} options={overview.categoryOptions} />
              <Select name="location" value={sp.location} options={overview.locationOptions} />
              <button type="submit" className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover"><Icon name="settings" className="h-3.5 w-3.5" /> Filter</button>
              {/* Part of the same GET form — "Filter" applies it with the rest. */}
              <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-3">Sort by
                <Select name="sort" value={sp.sort ?? 'newest'} options={[
                  { value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' },
                  { value: 'views', label: 'Most Viewed' }, { value: 'title', label: 'Title A–Z' },
                ]} />
              </label>
            </form>

            {list.rows.length === 0 ? (
              <div className="py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name={cfg.emptyIcon} className="h-6 w-6" /></span>
                <p className="mt-3 text-[13px] font-semibold text-ink">No {cfg.titlePlural.toLowerCase()} found</p>
                <p className="mt-1 text-[12px] text-ink-3">Create your first {cfg.titleSingular.toLowerCase()} to see it here.</p>
                <Link href={`${base}/add`} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[12px] font-semibold text-white"><Icon name="plus" className="h-3.5 w-3.5" /> {cfg.addLabel}</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                      <th className="px-1.5 py-2.5 font-semibold"><input type="checkbox" className="h-3.5 w-3.5 rounded border-line accent-brand" /></th>
                      <th className="px-1.5 py-2.5 font-semibold">#</th>
                      <th className="px-1.5 py-2.5 font-semibold">{cfg.itemHeader}</th>
                      <th className="px-1.5 py-2.5 font-semibold">Category</th>
                      <th className="px-1.5 py-2.5 font-semibold">Location</th>
                      <th className="px-1.5 py-2.5 font-semibold">{cfg.authorHeader}</th>
                      <th className="px-1.5 py-2.5 font-semibold">Status</th>
                      <th className="px-1.5 py-2.5 text-center font-semibold">Views</th>
                      {cfg.showEnquiries && <th className="px-1.5 py-2.5 text-center font-semibold">Enquiries</th>}
                      <th className="px-1.5 py-2.5 text-center font-semibold">Featured</th>
                      <th className="px-1.5 py-2.5 font-semibold">Date</th>
                      <th className="px-1.5 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.rows.map((p, i) => <ContentTr key={p.id} p={p} n={start + i} cfg={cfg} />)}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Showing {start} to {end} of {list.total.toLocaleString('en-IN')} {cfg.titlePlural.toLowerCase()}</p>
              <Pagination page={list.page} pages={list.pages} makeHref={(n) => qs({ page: String(n) })} />
            </div>
          </section>
        </div>

        {/* right sidebar */}
        <div className="w-[290px] shrink-0 space-y-5">
          <Panel title={cfg.categoriesTitle} action={<ViewAll />}>
            {overview.categories.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-ink-3">No categories yet.</p>
            ) : (
              <ul className="space-y-1">
                {overview.categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={qs({ category: c.slug, tab: 'all', page: '1' })} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-paper-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name={c.icon} className="h-3.5 w-3.5" /></span>
                      <span className="flex-1 truncate text-[12.5px] text-ink-2">{c.name}</span>
                      <span className="tabular text-[12.5px] font-semibold text-ink">{c.count.toLocaleString('en-IN')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={cfg.locationsTitle} action={<ViewAll />}>
            {overview.locations.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-ink-3">No locations yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.locations.map((l) => (
                  <li key={l.city} className="flex items-center gap-2.5">
                    <span className="w-[70px] shrink-0 truncate text-[12px] text-ink-2">{l.city}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${(l.count / l.max) * 100}%` }} /></span>
                    <span className="tabular w-8 shrink-0 text-right text-[12px] font-semibold text-ink">{l.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {cfg.showEnquiries ? (
            <Panel title="Recent Enquiries" action={<ViewAll href="/admin/leads" />}>
              {overview.recentEnquiries.length === 0 ? (
                <p className="py-3 text-center text-[12px] text-ink-3">No enquiries yet.</p>
              ) : (
                <ul className="space-y-3">
                  {overview.recentEnquiries.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-ink">{r.name}</span><span className="block truncate text-[11px] text-ink-3">{r.subject}</span></span>
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(r.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : (
            <Panel title={`Recent ${cfg.titlePlural}`} action={<ViewAll />}>
              {overview.recentItems.length === 0 ? (
                <p className="py-3 text-center text-[12px] text-ink-3">Nothing yet.</p>
              ) : (
                <ul className="space-y-3">
                  {overview.recentItems.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon name={cfg.emptyIcon} className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-ink">{r.title}</span><span className="block truncate text-[11px] text-ink-3">{r.sub}</span></span>
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-4">{ago(r.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function ContentTr({ p, n, cfg }: { p: ContentRow; n: number; cfg: ContentCfg }) {
  const cs = STATUS[p.status] ?? { cls: 'bg-paper-3 text-ink-3', label: p.status }
  return (
    <tr className="text-[12px] row-hover">
      <td className="px-1.5 py-2.5"><input type="checkbox" className="h-3.5 w-3.5 rounded border-line accent-brand" /></td>
      <td className="px-1.5 py-2.5 text-ink-4">{n}</td>
      <td className="px-1.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper-2 text-ink-4">
            {p.thumb ? <Image src={p.thumb} alt="" fill sizes="44px" className="object-cover" /> : <Icon name={cfg.emptyIcon} className="h-4 w-4" />}
          </span>
          <span className="min-w-0"><span className="block max-w-[150px] truncate font-semibold text-ink">{p.title}</span><span className="block max-w-[150px] truncate text-[10.5px] text-ink-4">{p.subtitle}</span></span>
        </div>
      </td>
      <td className="px-1.5 py-2.5"><span title={p.categoryLabel} className="inline-block max-w-[220px] truncate rounded-pill bg-[#EEF1FF] px-2 py-0.5 align-middle text-[11px] font-semibold text-[#6366F1]">{p.categoryLabel}</span></td>
      <td className="px-1.5 py-2.5"><span className="flex items-center gap-1 text-ink-2"><Icon name="map" className="h-3 w-3 shrink-0 text-ink-4" />{p.city ?? '—'}</span></td>
      <td className="px-1.5 py-2.5 max-w-[120px] truncate text-ink-2">{p.author}</td>
      <td className="px-1.5 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold ${cs.cls}`}>{cs.label}</span></td>
      <td className="px-1.5 py-2.5 text-center tabular text-ink-2">{p.views.toLocaleString('en-IN')}</td>
      {cfg.showEnquiries && <td className="px-1.5 py-2.5 text-center tabular text-ink-2">{p.enquiries}</td>}
      <td className="px-1.5 py-2.5">
        {/* A real switch: posts to toggleFeaturedAction. Only published
            work can be featured, so the switch is off-limits otherwise. */}
        <form action={toggleFeaturedAction} className="mx-auto flex w-9 justify-center">
          <input type="hidden" name="postId" value={p.id} />
          <button
            type="submit"
            role="switch"
            aria-checked={p.featured}
            aria-label={`${p.featured ? 'Unfeature' : 'Feature'} ${p.title}`}
            disabled={!p.featured && p.status !== 'PUBLISHED'}
            title={!p.featured && p.status !== 'PUBLISHED' ? 'Publish it first to feature it' : undefined}
            className={'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' + (p.featured ? 'bg-brand' : 'bg-[#CBD5E1]')}
          >
            <span className={'absolute h-4 w-4 rounded-full bg-white shadow transition-all ' + (p.featured ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </form>
      </td>
      <td className="whitespace-nowrap px-1.5 py-2.5 text-ink-2">{fmtDate(p.createdAt)}</td>
      <td className="px-1.5 py-2.5"><div className="flex items-center justify-end gap-1 text-ink-4"><Link href={`${cfg.viewPrefix}${p.slug}`} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="eye" className="h-3.5 w-3.5" /></Link></div></td>
    </tr>
  )
}
