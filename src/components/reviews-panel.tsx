import Link from 'next/link'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  REVIEW_SOURCES,
  type ReviewSummary,
  type ReviewPage,
  type ReviewFilter,
  type ReviewSort,
} from '@/lib/professional-reviews'
import { ReviewSortSelect } from './review-sort-select'

const SOURCE_LABEL: Record<ReviewFilter, string> = {
  all: 'All',
  PROJECT: 'Projects',
  PRODUCT: 'Products',
  ARTISTRY: 'Artistry',
  BLOG: 'Blog',
  AROUND_US: 'Around Us',
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          className={cn('h-[15px] w-[15px]', i <= Math.round(rating) ? 'text-brand' : 'text-line')}
        />
      ))}
    </span>
  )
}

function buildHref(basePath: string, params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && !(k === 'source' && v === 'all') && !(k === 'page' && v === 1))
      sp.set(k, String(v))
  }
  const q = sp.toString()
  return q ? `${basePath}?${q}` : basePath
}

/**
 * The Reviews & Ratings panel — the SAME component renders the dashboard tab and
 * the public profile's Reviews section, driven by real `Review` data. Filter,
 * sort and pagination are URL-driven so it needs no client state of its own
 * beyond the tiny sort <select>.
 */
export function ReviewsPanel({
  summary,
  page,
  filter,
  sort,
  basePath,
  title = 'Reviews & Ratings',
  subtitle = 'What clients say about your work across your products, projects and content.',
}: {
  summary: ReviewSummary
  page: ReviewPage
  filter: ReviewFilter
  sort: ReviewSort
  basePath: string
  title?: string
  subtitle?: string
}) {
  const availableSources = REVIEW_SOURCES.filter((s) => summary.byType[s] > 0)

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon name="star" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-[18px] font-bold text-ink">{title}</h2>
          <p className="text-[12.5px] text-ink-3">{subtitle}</p>
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-ink-4">
            <Icon name="star" className="h-6 w-6" />
          </span>
          <p className="text-[14px] font-semibold text-ink">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-ink-3">
            When clients review your products, projects, artistry, blog or Around Us
            posts, those reviews collect here.
          </p>
        </div>
      ) : (
        <>
          {/* ── summary: score + distribution ── */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
            <div className="flex flex-col items-center justify-center rounded-card border border-line bg-white px-5 py-6 shadow-card">
              <span className="font-display text-[40px] font-bold leading-none text-ink">
                {summary.average.toFixed(1)}
                <span className="text-[18px] text-ink-3"> / 5</span>
              </span>
              <Stars rating={summary.average} className="mt-2.5" />
              <span className="mt-2 text-[12.5px] text-ink-3">
                Based on {summary.total.toLocaleString('en-IN')} review{summary.total === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-col justify-center gap-2 rounded-card border border-line bg-white px-5 py-4 shadow-card">
              {summary.distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-3 text-[12.5px]">
                  <span className="flex w-9 shrink-0 items-center gap-1 tabular-nums text-ink-2">
                    {d.star} <Icon name="star" className="h-3.5 w-3.5 text-brand" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${d.pct}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right tabular-nums text-ink-3">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── filters + sort ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', ...availableSources] as ReviewFilter[]).map((s) => (
                <Link
                  key={s}
                  href={buildHref(basePath, { source: s, sort })}
                  className={cn(
                    'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                    filter === s ? 'bg-brand text-white' : 'bg-paper-2 text-ink-2 hover:bg-paper-3'
                  )}
                >
                  {SOURCE_LABEL[s]}
                  {s !== 'all' && (
                    <span className={cn('ml-1', filter === s ? 'text-white/80' : 'text-ink-4')}>
                      {summary.byType[s]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <ReviewSortSelect basePath={basePath} filter={filter} sort={sort} />
          </div>

          {/* ── review cards ── */}
          <ul className="flex flex-col gap-3">
            {page.reviews.map((r) => (
              <li key={r.id} className="rounded-card border border-line bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  {r.reviewer.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reviewer.photo} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
                      {r.reviewer.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-ink">{r.reviewer.name}</p>
                        <p className="text-[11.5px] text-ink-3">{r.reviewer.role}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Stars rating={r.rating} />
                        <span className="shrink-0 text-[11.5px] text-ink-4">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    {r.body && (
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">“{r.body}”</p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
                      <span className="rounded bg-paper-2 px-1.5 py-0.5 font-medium text-ink-3">
                        {r.sourceLabel}
                      </span>
                      <span className="text-ink-4">Reviewed:</span>
                      {r.sourceHref ? (
                        <Link href={r.sourceHref} className="truncate font-medium text-brand hover:underline">
                          {r.sourceTitle}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-ink-2">{r.sourceTitle}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* ── pagination ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[12px] text-ink-3">
              Showing {page.from}–{page.to} of {page.total.toLocaleString('en-IN')} reviews
            </span>
            {page.pages > 1 && (
              <div className="flex items-center gap-1">
                <PageLink
                  basePath={basePath} filter={filter} sort={sort} to={page.page - 1}
                  disabled={page.page <= 1}
                >
                  ‹
                </PageLink>
                {pageNumbers(page.page, page.pages).map((n, i) =>
                  n === '…' ? (
                    <span key={`e${i}`} className="px-1.5 text-ink-4">…</span>
                  ) : (
                    <PageLink
                      key={n} basePath={basePath} filter={filter} sort={sort} to={n as number}
                      active={n === page.page}
                    >
                      {n}
                    </PageLink>
                  )
                )}
                <PageLink
                  basePath={basePath} filter={filter} sort={sort} to={page.page + 1}
                  disabled={page.page >= page.pages}
                >
                  ›
                </PageLink>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PageLink({
  basePath, filter, sort, to, active, disabled, children,
}: {
  basePath: string; filter: ReviewFilter; sort: ReviewSort; to: number
  active?: boolean; disabled?: boolean; children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] text-ink-4 opacity-40">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={buildHref(basePath, { source: filter, sort, page: to })}
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium transition-colors',
        active ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-2'
      )}
    >
      {children}
    </Link>
  )
}

/** 1 … around-current … last, capped so long lists stay tidy. */
function pageNumbers(current: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(pages - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < pages - 1) out.push('…')
  out.push(pages)
  return out
}
