import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { VerifiedTick, photoSrc } from '@/components/blog'
import { ArtGlyph } from '@/components/artistry-glyph'
import { SaveToggle } from '@/components/save-button'
import { NewsletterForm } from '@/components/newsletter-form'
import { CategoryBadge, badgeWord, compact, poster, shortDate } from '@/components/around-us'
import { aroundUsMeta, type AroundUsRow } from '@/lib/around-us'
import { AROUND_US_CHIPS } from '@/config/taxonomy'
import { cn } from '@/lib/utils'
import type { CategoryHero } from '@/lib/category-hero'

/**
 * `/around-us` below `md` — the PWA layout from the client's phone reference.
 * Server Component; every control is a GET link, the only client pieces are
 * the shared SaveToggle and NewsletterForm.
 */

const HERO_BANNER =
  'https://ik.imagekit.io/archfacing/around%20us%20banner%201.png?updatedAt=1784753557073'
const TROPHY =
  'https://ik.imagekit.io/archfacing/Icon/winner%20trophy.png?updatedAt=1784864786424'

/** One mark per top-level Around Us group (the four tiles under the title). */
/**
 * The reference's tile names, each wired to a filter the page really reads
 * (`category` = a taxonomy group, `chip` = an AROUND_US_CHIPS key).
 */
type Tile = { label: string; icon: IconName; params: { category?: string; chip?: string } }
const SECTION_TILES: Tile[] = [
  { label: 'Latest Updates', icon: 'bell', params: {} },
  { label: 'Events & Exhibitions', icon: 'calendar', params: { category: 'reporting-publication' } },
  { label: 'Company Updates', icon: 'building', params: { category: 'new-development' } },
  { label: 'Community Stories', icon: 'users', params: { category: 'social-welfare' } },
]
const BROWSE_TILES: Tile[] = [
  { label: 'All', icon: 'grid', params: {} },
  { label: 'Events', icon: 'calendar', params: { chip: 'events' } },
  { label: 'Exhibitions', icon: 'box', params: { chip: 'exhibitions' } },
  { label: 'Awards', icon: 'award', params: { chip: 'awards' } },
  { label: 'Company Updates', icon: 'building', params: { category: 'new-development' } },
  { label: 'CSR & Sustainability', icon: 'leaf', params: { chip: 'welfare' } },
  { label: 'Launches', icon: 'trophy', params: { chip: 'competition' } },
  { label: 'Industry News', icon: 'file', params: { chip: 'industry' } },
]
function isActive(t: Tile, state: { chip: string; category?: string }): boolean {
  if (t.params.category) return state.category === t.params.category
  if (t.params.chip) return state.chip === t.params.chip && !state.category
  return state.chip === 'all' && !state.category
}

export type AroundUsEvent = { slug: string; title: string; when: Date; city: string | null; state: string | null }

type State = { chip: string; category?: string; sub?: string; q?: string; sort?: string }

function auHref(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/around-us?${s}` : '/around-us'
}

function cover(post: AroundUsRow): string {
  const m = aroundUsMeta(post.meta, post)
  return m.image || post.media[0]?.url || ''
}

export function AroundUsPhone({
  posts,
  total,
  take,
  perPage,
  state,
  savedIds,
  trending,
  events,
  shareHref,
  hero,
}: {
  /** Set on a mega-menu category page — that category's heading and copy. */
  hero?: CategoryHero | null
  posts: AroundUsRow[]
  total: number
  take: number
  perPage: number
  state: State
  savedIds: Set<string>
  trending: AroundUsRow[]
  events: AroundUsEvent[]
  /** where "Post Around Us" goes — the member's posting page, or login */
  shareHref: string
}) {
  const chipParam = state.chip === 'all' ? undefined : state.chip
  const primaryChips = AROUND_US_CHIPS.slice(0, 4)
  const moreChips = AROUND_US_CHIPS.slice(4)
  const moreActive = moreChips.some((c) => c.key === state.chip)

  return (
    <main className="bg-paper pb-6">
      {/* ═════════ title + building ═════════ */}
      <section className="relative isolate overflow-hidden bg-white px-4 pb-4 pt-3">
        <span aria-hidden className="absolute inset-0 -z-10">
          <span className="absolute inset-y-0 right-0 w-[62%]">
            <Image src={HERO_BANNER} alt="" fill priority sizes="62vw" className="object-cover object-right" />
          </span>
          {/* full-width ramp: solid white until past the photo's left edge, so no seam */}
          <span className="absolute inset-0 bg-gradient-to-r from-white from-[42%] via-white/60 via-[62%] to-white/0" />
          <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </span>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-ink-3">
          <Link href="/" className="hover:text-brand">Home</Link>
          <ArtGlyph name="right" className="h-3 w-3" />
          {hero ? (
            <>
              <Link href="/around-us" className="hover:text-brand">Around Us</Link>
              <ArtGlyph name="right" className="h-3 w-3" />
              <span className="truncate text-ink-2">{hero.parent ? `${hero.parent} · ${hero.title}` : hero.title}</span>
            </>
          ) : (
            <span className="text-ink-2">Around Us</span>
          )}
        </nav>
        <h1 className="mt-2.5 max-w-[14ch] font-display text-[30px] font-bold leading-[1.05] tracking-tight text-ink">
          {hero ? <BrandTail text={hero.title} /> : <>Around <span className="text-brand">Us</span></>}
        </h1>
        <p className="mt-3 max-w-[16.5rem] text-[11.5px] leading-[1.6] text-ink-2">
          {hero?.description ??
            'Stay updated with the latest news, events, achievements and activities from the Architecture, Design and Construction community across India.'}
        </p>
      </section>

      <div className="flex flex-col gap-5 px-4">
        {/* ═════════ four group tiles ═════════ */}
        <nav aria-label="Around Us sections" className="grid grid-cols-4 gap-2">
          {SECTION_TILES.map((t) => {
            const active = isActive(t, state)
            return (
              <Link
                key={t.label}
                href={auHref(t.params)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[84px] min-w-0 flex-col items-center justify-center gap-2 rounded-card border bg-white px-1 py-2.5 text-center shadow-card',
                  active ? 'border-brand' : 'border-line'
                )}
              >
                <Icon name={t.icon} className="h-[22px] w-[22px] text-brand" />
                <span className="text-[11px] font-semibold leading-tight text-ink">{t.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ═════════ filter chips ═════════ */}
        <nav aria-label="Filter updates" className="grid grid-cols-5 gap-2">
          {primaryChips.map((c) => {
            const active = c.key === state.chip && !state.category
            return (
              <Link
                key={c.key}
                href={auHref({ chip: c.key === 'all' ? undefined : c.key, q: state.q, sort: state.sort })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-card border px-1 text-center',
                  active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-2 shadow-card'
                )}
              >
                <Icon name={c.icon as IconName} className="h-[18px] w-[18px]" />
                <span className="w-full truncate text-[10.5px] font-semibold leading-tight">{c.name}</span>
              </Link>
            )
          })}
          <details className="group relative min-w-0">
            <summary
              className={cn(
                'flex h-[58px] cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-card border px-1 text-center [&::-webkit-details-marker]:hidden',
                moreActive ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-2 shadow-card'
              )}
            >
              <Icon name="dots" className="h-[18px] w-[18px]" />
              <span className="text-[10.5px] font-semibold leading-tight">More</span>
            </summary>
            <ul className="absolute right-0 top-[64px] z-20 w-48 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lift">
              {moreChips.map((c) => (
                <li key={c.key}>
                  <Link
                    href={auHref({ chip: c.key, q: state.q, sort: state.sort })}
                    className={cn(
                      'flex min-h-[40px] items-center gap-2.5 px-3 text-[12.5px] font-medium',
                      c.key === state.chip ? 'text-brand' : 'text-ink-2'
                    )}
                  >
                    <Icon name={c.icon as IconName} className="h-4 w-4 shrink-0" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </nav>

        {/* ═════════ latest ═════════ */}
        <section id="around-us-phone-listing" className="scroll-mt-24">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[17px] font-bold text-ink">Latest Around Us</h2>
            {total > posts.length && (
              <Link
                href={auHref({ chip: chipParam, category: state.category, sub: state.sub, q: state.q, sort: state.sort, take: 60 })}
                className="inline-flex min-h-[36px] items-center gap-1 text-[12px] font-semibold text-brand"
              >
                View All
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {posts.length > 0 ? (
            <ul className="mt-2 divide-y divide-line">
              {posts.map((p) => (
                <li key={p.slug}>
                  <PhoneRow post={p} saved={savedIds.has(p.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-card border border-line bg-paper-2 px-4 py-6 text-center text-[12.5px] text-ink-3">
              No updates in this category yet.{' '}
              <Link href="/around-us" className="font-semibold text-brand">Show everything</Link>
            </p>
          )}

          {posts.length < total && (
            <Link
              href={auHref({ chip: chipParam, category: state.category, sub: state.sub, q: state.q, sort: state.sort, take: take + perPage })}
              scroll={false}
              className="mt-3 flex h-11 items-center justify-center gap-2 rounded-card border border-brand-border bg-white text-[13px] font-semibold text-brand"
            >
              Load More
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-2.64-6.36L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </Link>
          )}
        </section>

        {/* ═════════ share your updates ═════════ */}
        <section className="relative overflow-hidden rounded-card bg-admin-bg px-4 py-5">
          <div className="max-w-[68%]">
            <h2 className="font-display text-[17px] font-bold text-white">Share Your Updates</h2>
            <p className="mt-1.5 text-[11.5px] leading-[1.6] text-white/75">
              Keep the community informed about your events, achievements and activities.
            </p>
            <Link href={shareHref} className="btn-primary mt-3.5 h-10 px-5 text-[13px]">
              Post Around Us
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <Image
            src={TROPHY}
            alt=""
            width={96}
            height={96}
            className="absolute bottom-3 right-3 h-24 w-24 object-contain"
          />
        </section>

        {/* ═════════ all sections grid ═════════ */}
        <nav aria-label="Browse Around Us" className="grid grid-cols-4 gap-2">
          {BROWSE_TILES.map((t) => {
            const active = isActive(t, state)
            return (
              <Link
                key={t.label}
                href={auHref(t.params)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[80px] min-w-0 flex-col items-center justify-center gap-2 rounded-card border bg-white px-1 py-2.5 text-center shadow-card',
                  active ? 'border-brand' : 'border-line'
                )}
              >
                <Icon name={t.icon} className="h-[22px] w-[22px] text-brand" />
                <span className="text-[10.5px] font-semibold leading-tight text-ink">{t.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ═════════ trending ═════════ */}
        {trending.length > 0 && (
          <section className="rounded-card bg-admin-bg px-4 py-4">
            <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-brand" fill="currentColor">
                <path d="M12 2c1 3.5-1.5 5.5-1.5 8 0 1.4 1 2.5 2.3 2.5 1.4 0 2.2-1.1 2.2-2.6 2 1.6 3 3.9 3 6.1A6 6 0 0112 22a6 6 0 01-6-6c0-4.6 4.6-7.2 6-14z" />
              </svg>
              Trending Updates
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {trending.map((t) => {
                const src = cover(t)
                return (
                  <li key={t.slug}>
                    <Link href={`/around-us/${t.slug}`} className="flex min-w-0 items-center gap-3">
                      <span className="relative h-[60px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-white/10">
                        {src && (
                          <Image
                            src={photoSrc(src, { w: 200, h: 140 })}
                            alt=""
                            fill
                            sizes="84px"
                            unoptimized={src.startsWith('http')}
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">{t.title}</span>
                        <span className="tabular mt-1 flex items-center gap-1 text-[11px] text-white/70">
                          <ArtGlyph name="eye" className="h-3.5 w-3.5" />
                          {compact(t.viewCount)} Views
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link
              href={auHref({ sort: 'popular' })}
              className="mx-auto mt-3 flex min-h-[36px] w-fit items-center gap-1.5 text-[12.5px] font-semibold text-brand"
            >
              View All
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* ═════════ upcoming events ═════════ */}
        {events.length > 0 && (
          <section className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[16px] font-bold text-ink">Upcoming Events</h2>
              <Link href={auHref({ chip: 'events' })} className="inline-flex min-h-[36px] items-center gap-1 text-[12px] font-semibold text-brand">
                View All
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="mt-1 divide-y divide-line">
              {events.map((e) => {
                const place = [e.city, e.state].filter(Boolean).join(', ')
                return (
                  <li key={e.slug}>
                    <Link href={`/around-us/${e.slug}`} className="flex min-w-0 items-center gap-3.5 py-2.5">
                      <span className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-lg border border-line leading-none">
                        <span className="tabular font-display text-[19px] font-bold text-ink">
                          {e.when.toLocaleDateString('en-IN', { day: '2-digit' })}
                        </span>
                        <span className="mt-1 text-[10px] font-bold uppercase text-ink-2">
                          {e.when.toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[13px] font-semibold text-ink">{e.title}</span>
                        {place && (
                          <span className="mt-1 flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3">
                            <Icon name="map" className="h-3.5 w-3.5 shrink-0 text-brand" />
                            <span className="truncate">{place}</span>
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* ═════════ join ═════════ */}
        <section className="rounded-card bg-brand-soft px-5 py-6 text-center">
          <svg viewBox="0 0 48 48" aria-hidden className="mx-auto h-11 w-11 text-brand" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="15" r="6.5" />
            <path d="M12.5 38v-2.5A11.5 11.5 0 0124 24a11.5 11.5 0 0111.5 11.5V38" />
            <circle cx="8.5" cy="20" r="4.5" />
            <path d="M2 34v-1.8A8.2 8.2 0 018.5 24" />
            <circle cx="39.5" cy="20" r="4.5" />
            <path d="M46 34v-1.8A8.2 8.2 0 0039.5 24" />
          </svg>
          <h2 className="mt-3 font-display text-[17px] font-bold text-ink">Join the Community</h2>
          <p className="mx-auto mt-1.5 max-w-[17rem] text-[12px] leading-[1.6] text-ink-2">
            Be a part of India&rsquo;s most trusted architecture and design community.
          </p>
          <Link href="/register" className="btn-primary mt-4 h-11 w-full max-w-[15rem] text-[13.5px]">
            Create Account
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* ═════════ newsletter ═════════ */}
        <section className="rounded-card bg-paper-3 px-4 py-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-admin-bg text-white">
              <Icon name="mail" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[17px] font-bold text-ink">Stay in the Loop</h2>
              <p className="mt-1 text-[12px] leading-[1.6] text-ink-2">
                Subscribe to get latest updates, events and insights from the architecture &amp;
                design world.
              </p>
            </div>
          </div>
          <div className="mt-4 [&_button]:bg-admin-bg [&_button:hover]:bg-navy-2 [&_form]:border [&_form]:border-line [&_input]:py-3">
            <NewsletterForm source="around-us-phone" />
          </div>
        </section>
      </div>
    </main>
  )
}

/** One "Latest Around Us" row — picture left, copy right, byline under both. */
function PhoneRow({ post, saved }: { post: AroundUsRow; saved: boolean }) {
  const m = aroundUsMeta(post.meta, post)
  const by = poster(post)
  const src = cover(post)
  const when = m.eventDate ?? post.publishedAt

  return (
    <article className="py-3">
      <Link href={`/around-us/${post.slug}`} className="flex min-w-0 gap-3">
        <span className="relative h-[118px] w-[46%] shrink-0 overflow-hidden rounded-card bg-paper-3">
          {src && (
            <Image
              src={photoSrc(src, { w: 400, h: 260 })}
              alt=""
              fill
              sizes="46vw"
              unoptimized={src.startsWith('http')}
              className="object-cover"
            />
          )}
          <CategoryBadge
            category={post.category}
            label={badgeWord(post.subCategory, m.categoryLabel || post.category)}
            className="absolute bottom-2 left-2 text-[10.5px]"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-3 font-display text-[13.5px] font-bold leading-snug text-ink">{post.title}</span>
          {when && <span className="tabular mt-1 block text-[11px] text-ink-3">{shortDate(when)}</span>}
          {post.description && (
            <span className="mt-1 line-clamp-3 text-[11px] leading-[1.5] text-ink-2">{post.description}</span>
          )}
        </span>
      </Link>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex w-[46%] min-w-0 shrink-0 items-center gap-1.5">
          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-line bg-paper-3">
            {by.logo && (
              <Image
                src={photoSrc(by.logo, { w: 48, h: 48 })}
                alt=""
                fill
                sizes="20px"
                unoptimized={by.logo.startsWith('http')}
                className="object-cover"
              />
            )}
          </span>
          <span className="truncate text-[11px] font-semibold text-ink">By {by.name}</span>
          {by.tone && <VerifiedTick className="h-3.5 w-3.5 shrink-0" tone={by.tone} />}
        </span>
        <span className="tabular min-w-0 flex-1 pl-1 text-[11px] text-ink-3">{compact(post.viewCount)} Views</span>
        <SaveToggle
          postId={post.id}
          initialSaved={saved}
          path="/around-us"
          noun="update"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:text-brand"
          savedClassName="!text-brand [&_svg]:fill-current"
          icon={<ArtGlyph name="bookmark" className="h-[18px] w-[18px]" />}
        />
      </div>
    </article>
  )
}

/** "Around **Us**" styling for a category title: the last word in brand orange. */
function BrandTail({ text }: { text: string }) {
  const i = text.lastIndexOf(' ')
  if (i < 0) return <span className="text-brand">{text}</span>
  return (
    <>
      {text.slice(0, i)} <span className="text-brand">{text.slice(i + 1)}</span>
    </>
  )
}
