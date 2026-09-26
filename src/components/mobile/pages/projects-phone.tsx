import Image from 'next/image'
import Link from 'next/link'
import { SaveToggle } from '@/components/save-button'
import {
  CATEGORY_ICON_IMAGES, CATEGORY_STRIP, Glyph, photoSrc, projectsHref, type ProjectParams,
} from '@/components/projects'
import {
  compactCount, placeLine, projectMeta, projectPhotos,
  type ProjectBadge, type ProjectRow,
} from '@/lib/projects'
import { statValue } from '@/lib/platform-stats'
import type { CategoryHero } from '@/lib/category-hero'
import { PROJECT_CATEGORIES } from '@/config/taxonomy'
import { cn } from '@/lib/utils'
import { PhoneSelect } from './listing-phone-client'

/**
 * /projects — the phone layout (below md).
 *
 * Every figure is live: the hero band and the category grid are the same
 * projectCounts()/projectFacets()/platformStats() the desktop reads; the card
 * footers are the post's real view count, SavedItem count and Review count;
 * the bookmark is a real save.
 */

const FORM_ID = 'project-filters-phone'

const HERO = 'https://ik.imagekit.io/archfacing/project%20banner%201.png?updatedAt=1784790445475'

const BADGES: Record<ProjectBadge, { label: string; className: string }> = {
  featured: { label: 'Featured', className: 'bg-brand text-white' },
  award: { label: 'Award Winner', className: 'bg-[#7C3AED] text-white' },
  new: { label: 'New', className: 'bg-ok text-white' },
}

export type ProjectsPhoneValues = {
  q: string
  pactArea: string
  category: string
  state: string
  sort: string
  view: 'grid' | 'list'
  /** Desktop-only filters, carried through a phone submission untouched. */
  hidden: Record<string, string>
}

function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | null)[] = [1]
  const from = Math.max(2, Math.min(page - 1, pages - 3))
  const to = Math.min(pages - 1, Math.max(page + 1, 4))
  if (from > 2) out.push(null)
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push(null)
  out.push(pages)
  return out
}

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

function ProjectTile({ post, saved, list }: { post: ProjectRow; saved: boolean; list: boolean }) {
  const m = projectMeta(post.meta)
  const badgeKey: ProjectBadge | null =
    m.badge ?? (m.featured ? 'featured' : m.awardWinning ? 'award' : null)
  const badge = badgeKey ? BADGES[badgeKey] : null
  const place = placeLine(post.city, post.state)
  const by = m.firmName || post.author.name

  return (
    <article
      className={cn(
        'flex min-w-0 overflow-hidden rounded-[10px] border border-line bg-white shadow-card',
        list ? 'flex-row' : 'flex-col'
      )}
    >
      <div className={cn('relative shrink-0 overflow-hidden bg-paper-3', list ? 'min-h-[132px] w-[42%]' : 'aspect-[3/2] w-full')}>
        <Link href={`/projects/${post.slug}`} className="absolute inset-0 block">
          <Image
            src={photoSrc(projectPhotos(post).cover, { w: 480, h: 320 })}
            alt=""
            fill
            sizes="(max-width:767px) 50vw, 1px"
            className="object-cover"
          />
          {badge && (
            <span className={cn('absolute left-2 top-2 rounded-[4px] px-1.5 py-[3px] text-[9.5px] font-semibold leading-none', badge.className)}>
              {badge.label}
            </span>
          )}
        </Link>
        <SaveToggle
          postId={post.id}
          initialSaved={saved}
          path="/projects"
          noun="project"
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-[6px] bg-black/25 text-white"
          savedClassName="!bg-brand [&_svg]:fill-current"
          icon={<BookmarkIcon />}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <Link href={`/projects/${post.slug}`} className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">
          {post.title}
        </Link>
        {place && <span className="mt-1 truncate text-[10.5px] text-ink-3">{place}</span>}
        {by && <span className="mt-0.5 truncate text-[10.5px] text-ink-3">{by}</span>}

        {m.tags.length > 0 && (
          <span className="mt-2 flex min-w-0 flex-wrap gap-1 overflow-hidden [max-height:22px]">
            {m.tags.slice(0, 2).map((t) => (
              <span key={t} className="truncate rounded-[4px] border border-line bg-paper-2 px-1.5 py-[3px] text-[9.5px] leading-none text-ink-2">
                {t}
              </span>
            ))}
          </span>
        )}

        <span className="mt-auto flex items-center gap-3 pt-2.5 text-[10.5px] text-ink-3">
          <span className="flex items-center gap-1" title="Views">
            <Glyph name="eye" className="h-3.5 w-3.5" />
            <span className="tabular">{compactCount(post.viewCount)}</span>
            <span className="sr-only">views</span>
          </span>
          <span className="flex items-center gap-1" title="Saves">
            <Glyph name="heart" className="h-3.5 w-3.5" />
            <span className="tabular">{compactCount(post._count.savedBy)}</span>
            <span className="sr-only">saves</span>
          </span>
          <span className="flex items-center gap-1" title="Reviews">
            <Glyph name="comment" className="h-3.5 w-3.5" />
            <span className="tabular">{compactCount(post._count.reviews)}</span>
            <span className="sr-only">reviews</span>
          </span>
        </span>
      </div>
    </article>
  )
}

export function ProjectsPhone({
  hero,
  rows,
  total,
  page,
  pages,
  first,
  last,
  counts,
  cities,
  states,
  professionals,
  carried,
  values,
  savedIds,
  sorts,
}: {
  /** Set on a mega-menu category page — that category's heading, copy and counts. */
  hero?: CategoryHero | null
  rows: ProjectRow[]
  total: number
  page: number
  pages: number
  first: number
  last: number
  counts: Record<string, number> & { all: number }
  cities: string[]
  states: string[]
  professionals: number
  carried: ProjectParams
  values: ProjectsPhoneValues
  savedIds: string[]
  sorts: { value: string; label: string }[]
}) {
  const saved = new Set(savedIds)
  const list = values.view === 'list'
  const named = CATEGORY_STRIP.filter((c) => c.slug)
  // "Others" — every published project outside the seven named categories.
  const others = Math.max(0, counts.all - named.reduce((n, c) => n + (counts[c.slug!] ?? 0), 0))

  const stats = hero
    ? [
        { icon: 'building' as const, value: statValue(hero.stats[0].value), label: 'Projects' },
        { icon: 'users' as const, value: statValue(hero.stats[1].value), label: 'Professionals' },
        { icon: 'pin' as const, value: statValue(hero.stats[2].value), label: 'Cities' },
        { icon: 'globe' as const, value: statValue(hero.stats[3].value), label: 'States' },
      ]
    : [
        { icon: 'building' as const, value: statValue(counts.all), label: 'Projects' },
        { icon: 'users' as const, value: statValue(professionals), label: 'Professionals' },
        { icon: 'pin' as const, value: statValue(cities.length), label: 'Cities' },
        { icon: 'globe' as const, value: statValue(states.length), label: 'States' },
      ]

  const tile = 'flex min-w-0 flex-col items-center px-1 py-3 text-center'

  return (
    <div className="bg-paper-2">
      {/* ═══ hero ═══ */}
      <section className="relative overflow-hidden bg-navy">
        <span aria-hidden className="absolute inset-0">
          <Image src={HERO} alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <span className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/70 to-navy/20" />
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy/90 to-transparent" />
        </span>
        <div className="relative px-4 pb-10 pt-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-brand">
            {hero?.parent ? `Projects · ${hero.parent}` : 'Projects'}
          </p>
          <h1 className="mt-1.5 max-w-[18ch] font-display text-[22px] font-semibold leading-[1.3] text-white">
            {hero ? hero.title : <>Explore Architecture &amp; Design Projects</>}
          </h1>
          <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-white/85">
            {hero ? hero.description : 'From professionals across India'}
          </p>

          <ul className="mt-6 flex items-center justify-between gap-2">
            {stats.map((s) => (
              <li key={s.label} className="flex shrink-0 items-center gap-1.5">
                <Glyph name={s.icon} className="h-5 w-5 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="tabular block font-display text-[14px] font-bold leading-none text-white">{s.value}</span>
                  <span className="mt-1 block truncate text-[10px] text-white/75">{s.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══ category grid ═══ */}
      <nav aria-label="Project categories" className="relative -mt-4 rounded-t-[20px] bg-paper-2 px-3 pt-3">
        <ul className="grid grid-cols-4 overflow-hidden rounded-[10px] border border-line bg-white">
          <li className="border-b border-r border-line-soft">
            <Link href={projectsHref({ view: carried.view })} aria-current={!values.category ? 'true' : undefined} className={tile}>
              <Glyph name="grid" className="h-8 w-8 text-brand" />
              <span className="mt-2 text-[12px] font-semibold leading-tight text-brand">All Projects</span>
              <span className="tabular mt-1 text-[10.5px] font-semibold text-brand">{counts.all.toLocaleString('en-IN')}</span>
            </Link>
          </li>
          {CATEGORY_STRIP.map((c, i) => {
            const on = Boolean(c.slug) && c.slug === values.category
            const art = CATEGORY_ICON_IMAGES[c.label]
            const n = c.slug ? (counts[c.slug] ?? 0) : others
            return (
              <li key={c.label} className={cn('border-line-soft', (i + 2) % 4 !== 0 && 'border-r', i < 7 && 'border-b')}>
                <Link
                  href={projectsHref({ category: c.slug, view: carried.view })}
                  aria-current={on ? 'true' : undefined}
                  className={tile}
                >
                  {art ? (
                    <Image src={art} alt="" width={64} height={64} unoptimized className="h-8 w-8 object-contain" />
                  ) : (
                    <Glyph name={c.icon} className="h-8 w-8 text-ink-2" />
                  )}
                  <span className={cn('mt-2 text-[12px] font-semibold leading-tight', on ? 'text-brand' : 'text-ink')}>{c.label}</span>
                  <span className={cn('tabular mt-1 text-[10.5px]', on ? 'text-brand' : 'text-ink-3')}>{n.toLocaleString('en-IN')}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 pb-6">
        {/* ═══ filters ═══ */}
        <form id={FORM_ID} method="get" action="/projects" className="mt-5">
          {values.q && <input type="hidden" name="q" value={values.q} />}
          {Object.entries(values.hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {list && <input type="hidden" name="view" value="list" />}

          <div className="flex items-center justify-between">
            <h2 className="font-display text-[16px] font-semibold text-ink">Filters</h2>
            <Link href={list ? '/projects?view=list' : '/projects'} className="text-[13px] font-semibold text-brand">
              Clear All
            </Link>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="min-w-0 text-[12px] text-ink-2">
              Showing <span className="tabular">{first} - {last}</span> of{' '}
              <span className="tabular">{total.toLocaleString('en-IN')}</span> project{total === 1 ? '' : 's'}
            </p>
            <PhoneSelect
              name="sort"
              label={sorts[0].label}
              srLabel="Sort by"
              value={values.sort === 'latest' ? '' : values.sort}
              options={sorts.slice(1)}
              className="w-[124px] shrink-0"
            />
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5">
            <PhoneSelect
              name="pactArea"
              label="PACT Area"
              value={values.pactArea}
              options={cities.map((c) => ({ value: c, label: c }))}
            />
            <PhoneSelect
              name="category"
              label="Category"
              value={values.category}
              options={PROJECT_CATEGORIES.map((c) => ({
                value: c.slug,
                label: `${c.name} (${counts[c.slug] ?? 0})`,
              }))}
            />
            <PhoneSelect
              name="state"
              label="Location"
              value={values.state}
              options={states.map((s) => ({ value: s, label: s }))}
            />
            <button
              type="submit"
              aria-label="Apply filters"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink-2"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z" /></svg>
            </button>
          </div>
        </form>

        {/* grid / list */}
        <div className="mt-3 flex gap-2">
          {(['grid', 'list'] as const).map((v) => {
            const on = values.view === v
            return (
              <Link
                key={v}
                href={projectsHref({ ...carried, view: v === 'grid' ? undefined : 'list', page: undefined })}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold',
                  on ? 'border-brand-border bg-brand-soft text-brand' : 'border-line bg-white text-ink-2'
                )}
              >
                <Glyph name={v} className="h-4 w-4" />
                {v === 'grid' ? 'Grid' : 'List'}
              </Link>
            )
          })}
        </div>

        {/* cards */}
        {rows.length === 0 ? (
          <div className="mt-4 rounded-[10px] border border-line bg-white px-4 py-8 text-center">
            <p className="font-display text-[15px] font-semibold text-ink">No projects found</p>
            <p className="mt-1 text-[12.5px] text-ink-3">Nothing matches those filters yet.</p>
            <Link href="/projects" className="mt-3 inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] font-semibold text-ink-2">
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className={cn('mt-3 grid gap-2.5', list ? 'grid-cols-1' : 'grid-cols-2')}>
            {rows.map((p) => (
              <ProjectTile key={p.id} post={p} saved={saved.has(p.id)} list={list} />
            ))}
          </div>
        )}

        {/* pagination */}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-5">
            <ul className="flex items-center justify-center gap-1.5">
              <li>
                {page > 1 ? (
                  <Link href={projectsHref({ ...carried, page: page - 1 === 1 ? undefined : page - 1 })} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-2">
                    <Glyph name="left" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-4">
                    <Glyph name="left" className="h-4 w-4" />
                  </span>
                )}
              </li>
              {pageWindow(page, pages).map((n, i) =>
                n === null ? (
                  <li key={`gap-${i}`} className="flex h-9 w-7 items-center justify-center text-[12px] text-ink-3">…</li>
                ) : (
                  <li key={n}>
                    <Link
                      href={projectsHref({ ...carried, page: n === 1 ? undefined : n })}
                      aria-current={n === page ? 'page' : undefined}
                      className={cn(
                        'tabular flex h-9 min-w-[36px] items-center justify-center rounded-[8px] border px-2 text-[12.5px] font-semibold',
                        n === page ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
                      )}
                    >
                      {n}
                    </Link>
                  </li>
                )
              )}
              <li>
                {page < pages ? (
                  <Link href={projectsHref({ ...carried, page: page + 1 })} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-2">
                    <Glyph name="right" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-4">
                    <Glyph name="right" className="h-4 w-4" />
                  </span>
                )}
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}
