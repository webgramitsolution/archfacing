import Image from 'next/image'
import type { CategoryHero } from '@/lib/category-hero'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { VerifiedTick, photoSrc } from '@/components/blog'
import { ArtGlyph } from '@/components/artistry-glyph'
import { SaveToggle } from '@/components/save-button'
import { NewsletterForm } from '@/components/newsletter-form'
import { artworkMeta, type ArtworkRow } from '@/lib/artistry'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { cn } from '@/lib/utils'
import { ArtistrySortSelect } from './artistry-phone-client'

/**
 * `/artistry` below `md` — the PWA layout from the client's phone reference.
 * Server Component; the listing, filters and "Load More" are GET links, the
 * client pieces are the sort select, SaveToggle, the hero fader and the
 * newsletter form.
 */

/** The client's artwork for "From Heritage to Innovation" (transparent PNG). */
const HERITAGE_ART = 'https://ik.imagekit.io/archfacing/Icon/icon%20right%20side.png?updatedAt=1784820226288'
const HERO =
  'https://ik.imagekit.io/archfacing/Untitled%20design%20(3).png?updatedAt=1784821350459'

/** Tag fill per Artistry group — the same mapping the desktop card uses. */
const GROUP_TONE: Record<string, string> = {
  heritage: 'bg-info',
  'indian-culture': 'bg-brand',
  environments: 'bg-ok',
  arts: 'bg-chart-6',
  'design-integration': 'bg-navy',
}

/** The five group tiles, in the reference's order. */
const GROUP_ORDER = ['heritage', 'indian-culture', 'arts', 'design-integration', 'environments']
const GROUP_ICON: Record<string, IconName> = {
  heritage: 'building',
  'indian-culture': 'users',
  arts: 'image',
  'design-integration': 'target',
  environments: 'leaf',
}

type State = { q?: string; category?: string; sub?: string; sort: 'latest' | 'popular'; view: 'grid' | 'list' }

function artHref(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/artistry?${s}` : '/artistry'
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function ArtistryPhone({
  hero,
  artworks,
  total,
  take,
  perPage,
  state,
  savedIds,
  heroImages,
  reach,
  uploadHref,
  heading,
}: {
  artworks: ArtworkRow[]
  total: number
  take: number
  perPage: number
  state: State
  savedIds: Set<string>
  /** photographs for "From Heritage to Innovation" — real heritage artworks */
  heroImages: string[]
  reach: { works: number; creators: number; categories: number; states: number }
  /** where "Share Your Work" / "Upload Your Work" go — the form, or login */
  uploadHref: string
  heading: string
  /** Set on a mega-menu category page — that category's heading and copy. */
  hero?: CategoryHero | null
}) {
  const sortParam = state.sort === 'popular' ? 'popular' : undefined
  const viewParam = state.view === 'list' ? 'list' : undefined
  const base = { q: state.q, category: state.category, sub: state.sub, sort: sortParam }
  const groups = GROUP_ORDER.map((s) => ARTISTRY_CATEGORIES.find((g) => g.slug === s)).filter(
    (g): g is (typeof ARTISTRY_CATEGORIES)[number] => Boolean(g)
  )

  return (
    <main className="bg-paper pb-6">
      {/* ═════════ hero ═════════ */}
      <section className="relative isolate mx-2 overflow-hidden rounded-t-card bg-navy text-white">
        <span aria-hidden className="absolute inset-0 -z-10">
          <Image src={HERO} alt="" fill priority sizes="100vw" className="object-cover object-[72%_center]" />
          <span className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/10" />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy/80 to-transparent" />
        </span>
        <div className="px-4 pb-6 pt-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-white/85">
            <Link href="/" className="hover:text-white">Home</Link>
            <ArtGlyph name="right" className="h-3 w-3" />
            {hero ? (
              <>
                <Link href="/artistry" className="hover:text-white">Artistry</Link>
                <ArtGlyph name="right" className="h-3 w-3" />
                <span className="truncate">{hero.parent ? `${hero.parent} · ${hero.title}` : hero.title}</span>
              </>
            ) : (
              <span>Artistry</span>
            )}
          </nav>
          <h1 className="mt-4 font-serif text-[36px] font-bold leading-[1.05] text-white">{hero?.title ?? 'Artistry'}</h1>
          <p className="mt-3 text-[13px] font-semibold text-brand">
            {hero ? (hero.parent ? `Artistry · ${hero.parent}` : 'Artistry') : <>Celebrating Art, Architecture &amp; Culture</>}
          </p>
          <p className="mt-3 max-w-[17rem] text-[12px] leading-[1.65] text-white/85">
            {hero?.description ??
              'A platform to showcase the timeless beauty of heritage, the richness of Indian culture and the creativity of design through inspiring works and visual stories.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Link
              href="#artistry-phone-listing"
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/80 text-[13px] font-semibold text-white"
            >
              Explore Artistry
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link
              href={uploadHref}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-[13px] font-semibold text-navy"
            >
              Share Your Work
              <UploadGlyph className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════ listing ═════════ */}
      <section
        id="artistry-phone-listing"
        className="relative -mt-3 scroll-mt-24 rounded-t-card bg-white px-4 pt-5"
      >
        <h2 className="flex items-center gap-3 font-serif text-[21px] font-bold text-ink">
          {heading}
          <span aria-hidden className="h-0.5 w-7 rounded-pill bg-brand" />
        </h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 text-[11px] leading-snug text-ink-2">
            Showing {total} Inspiring Work{total === 1 ? '' : 's'}
            {state.q && <span> · &ldquo;{state.q}&rdquo;</span>}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <ArtistrySortSelect sort={state.sort} hidden={{ q: state.q, category: state.category, sub: state.sub, view: viewParam }} />
            <Link
              href={artHref({ ...base })}
              aria-label="Grid view"
              aria-current={state.view === 'grid' ? 'true' : undefined}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                state.view === 'grid' ? 'bg-admin-bg text-white' : 'text-ink-2'
              )}
            >
              <Icon name="grid" className="h-4 w-4" />
            </Link>
            <Link
              href={artHref({ ...base, view: 'list' })}
              aria-label="List view"
              aria-current={state.view === 'list' ? 'true' : undefined}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                state.view === 'list' ? 'bg-admin-bg text-white' : 'text-ink-2'
              )}
            >
              <Icon name="list" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {artworks.length > 0 ? (
          <ul className={cn('mt-3.5', state.view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-2.5')}>
            {artworks.map((a) => (
              <li key={a.slug} className="min-w-0">
                <PhoneArtCard post={a} saved={savedIds.has(a.id)} list={state.view === 'list'} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-card border border-line bg-paper-2 px-4 py-6 text-center text-[12.5px] text-ink-3">
            No artistry matches this filter.{' '}
            <Link href="/artistry" className="font-semibold text-brand">Clear filters</Link>
          </p>
        )}

        {artworks.length < total && (
          <Link
            href={artHref({ ...base, view: viewParam, take: take + perPage })}
            scroll={false}
            className="mx-auto mt-2 flex h-11 w-fit items-center justify-center gap-1.5 px-4 text-[13px] font-semibold text-ink"
          >
            Load More Works
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-2.64-6.36L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </Link>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-5 px-4">
        {/* ═════════ from heritage to innovation ═════════ */}
        {/* Navy panel, copy on the left, the client's carved-temple artwork on
            the right (supplied image). */}
        <section className="relative isolate overflow-hidden rounded-card bg-admin-bg text-white">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[52%]">
            <Image
              src={HERITAGE_ART}
              alt=""
              fill
              sizes="52vw"
              unoptimized
              className="object-contain object-right-bottom"
            />
          </span>
          <div className="relative max-w-[66%] px-5 pb-7 pt-6">
            <h2 className="whitespace-nowrap font-serif text-[21px] font-bold leading-[1.2] text-white">
              From Heritage to
              <br />
              Innovation
            </h2>
            <p className="mt-3 text-[12px] leading-[1.65] text-white/85">
              Explore the beauty of timeless architecture and the richness of Indian culture.
            </p>
            <Link
              href={artHref({ category: 'heritage' })}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-navy"
            >
              Explore Now
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ═════════ five group tiles ═════════ */}
        <nav aria-label="Artistry categories" className="grid grid-cols-5 gap-1.5">
          {groups.map((g) => {
            const active = state.category === g.slug
            return (
              <Link
                key={g.slug}
                href={artHref({ category: g.slug })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[86px] min-w-0 flex-col items-center justify-center gap-2 rounded-card border bg-white px-0.5 py-2 text-center shadow-card',
                  active ? 'border-brand' : 'border-line'
                )}
              >
                <Icon name={GROUP_ICON[g.slug] ?? 'grid'} className="h-[22px] w-[22px] text-ink-2" />
                <span className="text-[10.5px] font-semibold leading-tight text-ink-2">{g.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* ═════════ what you'll find ═════════ */}
        <section className="rounded-card border border-line bg-white px-4 pb-1 pt-4 shadow-card">
          <h2 className="font-display text-[16px] font-bold text-ink">What You&rsquo;ll Find Here</h2>
          <ul className="mt-2 divide-y divide-line">
            {groups.map((g) => (
              <li key={g.slug}>
                <Link href={artHref({ category: g.slug })} className="flex min-w-0 items-center gap-3.5 py-3">
                  <Icon name={GROUP_ICON[g.slug] ?? 'grid'} className="h-[22px] w-[22px] shrink-0 text-ink-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{g.name}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                      {(g.children ?? []).map((c) => c.name).join(', ')}
                    </span>
                  </span>
                  <ArtGlyph name="right" className="h-4 w-4 shrink-0 text-ink-2" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ reach ═════════ */}
        <section className="rounded-card bg-admin-bg px-4 py-2">
          <ul className="grid grid-cols-2 divide-x divide-white/15">
            {[
              [
                { icon: 'image' as IconName, value: reach.works, label: 'Artistry Works' },
                { icon: 'tag' as IconName, value: reach.categories, label: 'Categories' },
              ],
              [
                { icon: 'users' as IconName, value: reach.creators, label: 'Creative Minds' },
                { icon: 'map' as IconName, value: reach.states, label: 'States Covered' },
              ],
            ].map((col, ci) => (
              <li key={ci} className={cn('divide-y divide-white/15', ci === 1 && 'pl-4')}>
                {col.map((s) => (
                  <div key={s.label} className="flex min-w-0 items-center gap-3 py-3.5">
                    <Icon name={s.icon} className="h-7 w-7 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="tabular block font-display text-[20px] font-bold leading-none text-brand">
                        {s.value.toLocaleString('en-IN')}
                      </span>
                      <span className="mt-1 block truncate text-[11.5px] text-white/85">{s.label}</span>
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ showcase ═════════ */}
        <section className="relative overflow-hidden rounded-card bg-brand-soft px-5 py-5">
          <div className="relative z-10 max-w-[62%]">
            <h2 className="font-display text-[16px] font-bold text-ink">Showcase Your Creativity</h2>
            <p className="mt-2 text-[12px] leading-[1.65] text-ink-2">
              Share your creative work and get featured on ArchFacing.
            </p>
            <Link
              href={uploadHref}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-admin-bg px-4 text-[13px] font-semibold text-white"
            >
              <UploadGlyph className="h-4 w-4" />
              Upload Your Work
            </Link>
          </div>
          {/* line drawing of a brush pot, in the brand orange */}
          <svg
            viewBox="0 0 120 150"
            aria-hidden
            className="absolute bottom-2 right-3 h-[120px] w-[96px] text-brand/60"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M28 82h64l-6 62H34z" />
            <path d="M28 82c8 5 56 5 64 0" />
            <path d="M44 82L30 22l6-6 4 8 10 58" />
            <path d="M58 82V14l4-8 4 8v68" />
            <path d="M74 82l12-58 5-6 3 9-10 55" />
            <path d="M50 82L46 36c0-6 8-6 8 0l-2 46" />
            <path d="M68 82l4-40c1-6 9-5 8 1l-6 39" />
          </svg>
        </section>

        {/* ═════════ newsletter ═════════ */}
        <section className="rounded-card bg-paper-3 px-5 py-5">
          <h2 className="font-display text-[17px] font-bold text-ink">Stay Inspired</h2>
          <p className="mt-2 max-w-[16rem] text-[12px] leading-[1.65] text-ink-2">
            Subscribe to get the latest updates and featured artistry straight to your inbox.
          </p>
          <div className="mt-4 [&_button]:bg-admin-bg [&_button:hover]:bg-navy-2 [&_form]:border [&_form]:border-line [&_input]:py-3">
            <NewsletterForm source="artistry-phone" />
          </div>
          <p className="mt-3 text-[11.5px] text-ink-2">We respect your privacy.</p>
        </section>
      </div>
    </main>
  )
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
    </svg>
  )
}

/** One artwork — a 2-up card, or a row in list view. */
function PhoneArtCard({ post, saved, list }: { post: ArtworkRow; saved: boolean; list: boolean }) {
  const m = artworkMeta(post.meta)
  const place = m.location || [post.city, post.state].filter(Boolean).join(', ')
  const face = m.artist.photo || post.author.profilePhoto || ''

  return (
    <article
      className={cn(
        'flex min-w-0 overflow-hidden rounded-card border border-line bg-white shadow-card',
        list ? 'flex-row' : 'h-full flex-col'
      )}
    >
      <Link
        href={`/artistry/${post.slug}`}
        className={cn('relative block shrink-0 overflow-hidden bg-paper-3', list ? 'w-[40%]' : 'aspect-[4/3] w-full')}
      >
        <Image
          src={photoSrc(m.image, { w: 400, h: 300 })}
          alt=""
          fill
          sizes={list ? '40vw' : '50vw'}
          className="object-cover"
        />
        <span
          className={cn(
            'absolute left-2 top-2 rounded px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.06em] text-white',
            GROUP_TONE[post.category] ?? 'bg-navy'
          )}
        >
          {m.categoryLabel || post.category}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-1 pt-2.5">
        <Link href={`/artistry/${post.slug}`} className="line-clamp-2 font-display text-[12.5px] font-semibold leading-snug text-ink">
          {post.title}
        </Link>
        {place && (
          <span className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] text-ink-3">
            <Icon name="map" className="h-3 w-3 shrink-0" />
            <span className="truncate">{place}</span>
          </span>
        )}
        <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-paper-3">
            {face && (
              <Image
                src={photoSrc(face, { w: 48, h: 48 })}
                alt=""
                fill
                sizes="20px"
                unoptimized={face.startsWith('http')}
                className="object-cover"
              />
            )}
          </span>
          <span className="truncate text-[11px] text-ink-2">{m.artist.name}</span>
          {m.artist.badgeTone && <VerifiedTick className="h-3 w-3" tone={m.artist.badgeTone} />}
        </span>
        <span className="mt-auto flex items-center gap-2.5 pt-1">
          <span className="tabular flex items-center gap-1 text-[11px] text-ink-2" aria-label={`${m.stats.views} views`}>
            <ArtGlyph name="eye" className="h-3.5 w-3.5" />
            {compact(m.stats.views)}
          </span>
          <span className="tabular flex items-center gap-1 text-[11px] text-ink-2" aria-label={`${m.stats.favourites} saves`}>
            <ArtGlyph name="heart" className="h-3.5 w-3.5" />
            {compact(m.stats.favourites)}
          </span>
          <SaveToggle
            postId={post.id}
            initialSaved={saved}
            path="/artistry"
            noun="artwork"
            className="-mr-1.5 ml-auto flex h-9 w-9 items-center justify-center text-ink-2 transition-colors hover:text-brand"
            savedClassName="!text-brand [&_svg]:fill-current"
            icon={<ArtGlyph name="bookmark" className="h-4 w-4" />}
          />
        </span>
      </div>
    </article>
  )
}
