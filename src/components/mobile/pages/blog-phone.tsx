import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { Glyph, photoSrc } from '@/components/blog'
import { SaveToggle } from '@/components/save-button'
import { VerifiedTick } from '@/components/verified-badge'
import type { BadgeTone } from '@/lib/verified'
import { articleMeta, compactCount, postDate, type ArticleRow } from '@/lib/content'
import { BLOG_TOPICS } from '@/config/content-media'
import { BlogTopicGrid } from './blog-phone-client'
import { PhoneEventsCard, PhoneNewsletterCard, PhoneSectionHead, type PhoneEvent } from './content-phone-parts'

/**
 * `/blog` below `md` — the PWA layout from the client's phone reference.
 *
 * Server Component. Topics are the real BLOG_CATEGORIES (ordered by how many
 * articles each holds), every article, view count and read time is a Post
 * row, the bookmark is the real SaveToggle, and Upcoming Events is real
 * Around Us / Club data or nothing.
 */

function Bookmark({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  )
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] text-brand" fill="currentColor">
      <path d="M12 2c1 3.5 5 6 5 11a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6.5 1-9.5z" />
    </svg>
  )
}

export function BlogPhone({
  q,
  category,
  total,
  featured,
  articles,
  trending,
  popular,
  counts,
  events,
  savedIds,
  tones,
  loadMoreHref,
  topicHref,
}: {
  q?: string
  category?: string
  total: number
  featured: ArticleRow | null
  articles: ArticleRow[]
  trending: ArticleRow[]
  popular: ArticleRow[]
  counts: Record<string, number>
  events: PhoneEvent[]
  savedIds: Set<string>
  tones: Map<string, BadgeTone>
  loadMoreHref: string | null
  /** A /blog link for one category (toggling it off when it is active). */
  topicHref: (slug: string) => string
}) {
  // Most-written-about first, so the chips lead with what has content.
  const topics = [...BLOG_TOPICS].sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0))
  const chips = topics.slice(0, 5)
  const fm = featured ? articleMeta(featured.meta) : null
  const topicLabel = (slug: string) => BLOG_TOPICS.find((t) => t.slug === slug)?.label

  return (
    <main className="bg-paper pb-6">
      <div className="flex flex-col gap-5 px-4 pt-2">
        {/* ═════════ breadcrumb + title + search ═════════ */}
        <section>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/" className="py-1">Home</Link>
            <span aria-hidden>›</span>
            <span aria-current="page" className="text-ink-2">Blog</span>
          </nav>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-ink">
            Blog &amp; Insights
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            Explore the latest trends, ideas and inspiration from architecture, design and
            construction industry.
          </p>

          <form method="get" action="/blog" className="mt-3.5 flex overflow-hidden rounded-card border border-line bg-white">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="blog-phone-search" className="sr-only">Search articles</label>
            <span className="relative min-w-0 flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                id="blog-phone-search"
                name="q"
                type="search"
                defaultValue={q ?? ''}
                placeholder="Search articles, topics, authors..."
                className="h-11 w-full bg-transparent pl-9 pr-2 text-[13px] text-ink placeholder:text-ink-4 focus:outline-none"
              />
            </span>
            <button type="submit" className="shrink-0 bg-brand px-5 text-[13px] font-semibold text-white">
              Search
            </button>
          </form>
        </section>

        {/* ═════════ popular topics ═════════ */}
        <section>
          <PhoneSectionHead title="Popular Topics" href="#blog-topics" />
          <ul className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((t) => (
              <li key={t.slug} className="w-[84px] shrink-0">
                <Link
                  href={topicHref(t.slug)}
                  aria-current={t.slug === category ? 'true' : undefined}
                  className={`flex h-full min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-card border px-1 py-2 text-center shadow-card ${
                    t.slug === category ? 'border-brand bg-brand-soft' : 'border-line bg-white'
                  }`}
                >
                  <Icon name={t.icon as IconName} className="h-5 w-5 text-brand" />
                  <span lang="en" className="line-clamp-3 text-[10px] font-semibold leading-tight text-ink [hyphens:auto]">{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ featured article ═════════ */}
        {featured && fm && (
          <article className="relative isolate overflow-hidden rounded-card bg-admin-bg shadow-lift">
            <span aria-hidden className="absolute inset-0 -z-10">
              <Image src={photoSrc(fm.heroImage, { w: 900, h: 700 })} alt="" fill priority sizes="100vw" className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-r from-admin-bg via-admin-bg/80 to-admin-bg/20" />
            </span>
            <div className="px-4 pb-5 pt-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand">Featured Article</span>
              <h2 className="mt-2 max-w-[92%] font-display text-[21px] font-bold leading-[1.25] text-white">
                <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
              </h2>
              <p className="mt-2 line-clamp-3 max-w-[80%] text-[12px] leading-relaxed text-white/80">
                {fm.excerpt || featured.description}
              </p>
              <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] font-medium text-white/90">
                {featured.publishedAt && (
                  <li className="flex items-center gap-1.5">
                    <Glyph name="calendar" className="h-3.5 w-3.5" />
                    {postDate(featured.publishedAt)}
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {fm.readMinutes} min read
                </li>
                <li className="flex items-center gap-1.5">
                  <Glyph name="eye" className="h-3.5 w-3.5" />
                  {compactCount(featured.viewCount)} Views
                </li>
              </ul>
              <Link href={`/blog/${featured.slug}`} className="btn-primary mt-4 w-fit">
                Read Article
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </article>
        )}

        {/* ═════════ latest articles ═════════ */}
        <section className="rounded-card border border-line bg-white px-3 py-3.5 shadow-card">
          <PhoneSectionHead
            title={q || category ? `Articles (${total})` : 'Latest Articles'}
            href={q || category ? '/blog' : '/blog?sort=popular'}
            action={q || category ? 'Clear' : 'View All'}
            className="px-1"
          />
          {(q || category) && (
            <p className="px-1 text-[11.5px] text-ink-3">
              {category && `In ${topicLabel(category)}`}
              {category && q && ' · '}
              {q && `Matching “${q}”`}
            </p>
          )}

          {articles.length === 0 ? (
            <p className="px-1 py-6 text-center text-[12.5px] text-ink-3">
              No articles match that yet. Try another topic.
            </p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-2.5">
              {articles.map((a) => {
                const m = articleMeta(a.meta)
                const tone = tones.get(a.author.id)
                const face = m.authorPhoto || a.author.profilePhoto || ''
                return (
                  <li key={a.id} className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white">
                    <Link href={`/blog/${a.slug}`} className="flex min-w-0 flex-1 flex-col">
                      <span className="relative block aspect-[4/3] bg-paper-3">
                        <Image src={photoSrc(m.cardImage, { w: 400, h: 300 })} alt="" fill sizes="50vw" className="object-cover" />
                        <span className="absolute left-1.5 top-1.5 max-w-[90%] truncate rounded bg-white px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-brand">
                          {topicLabel(a.category) ?? m.categoryLabel}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col px-2 pt-2">
                        <span className="line-clamp-3 font-display text-[12.5px] font-bold leading-snug text-ink">{a.title}</span>
                        <span className="mt-1.5 text-[10.5px] text-ink-3">
                          {postDate(a.publishedAt)} · {m.readMinutes} min read
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-3">
                          <Glyph name="eye" className="h-3 w-3" />
                          {compactCount(a.viewCount)} Views
                        </span>
                      </span>
                    </Link>
                    <div className="mt-2 flex items-center gap-1.5 border-t border-line-soft px-2 py-1.5">
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-3 text-[11px] font-bold text-ink-3">
                        {face ? (
                          <Image src={photoSrc(face, { w: 80, h: 80 })} alt="" fill sizes="28px" className="object-cover" unoptimized={!face.includes('unsplash') && face.startsWith('http')} />
                        ) : (
                          (a.author.name ?? 'A').charAt(0)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-0.5">
                          <span className="truncate text-[10.5px] font-bold text-ink">{a.author.name}</span>
                          {tone && <VerifiedTick tone={tone} className="h-3 w-3" />}
                        </span>
                        {m.authorRole && <span className="block truncate text-[9.5px] text-ink-3">{m.authorRole}</span>}
                      </span>
                      <SaveToggle
                        postId={a.id}
                        initialSaved={savedIds.has(a.id)}
                        path="/blog"
                        noun="article"
                        icon={<Bookmark />}
                        savedIcon={<Bookmark filled />}
                        className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center text-ink-2"
                        savedClassName="text-brand"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {loadMoreHref && (
            <div className="mt-3 flex justify-center">
              <Link href={loadMoreHref} scroll={false} className="btn-outline border-brand-border text-[12.5px] text-brand">
                Load More Articles
              </Link>
            </div>
          )}
        </section>

        {/* ═════════ topic grid ═════════ */}
        <section id="blog-topics" className="scroll-mt-4">
          <BlogTopicGrid
            topics={topics.map((t) => ({
              slug: t.slug,
              label: t.label,
              icon: t.icon,
              href: topicHref(t.slug),
              active: t.slug === category,
            }))}
          />
        </section>

        {/* ═════════ trending topics ═════════ */}
        {trending.length > 0 && (
          <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
            <PhoneSectionHead title="Trending Topics" href="/blog?sort=popular" icon={<Flame />} />
            <ul className="mt-1.5 flex flex-col gap-3">
              {trending.map((a) => {
                const m = articleMeta(a.meta)
                return (
                  <li key={a.id}>
                    <Link href={`/blog/${a.slug}`} className="flex min-w-0 items-center gap-3">
                      <span className="relative h-[50px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
                        <Image src={photoSrc(m.thumbImage, { w: 160, h: 120 })} alt="" fill sizes="68px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">{a.title}</span>
                        <span className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-3">
                          <Glyph name="eye" className="h-3 w-3" />
                          {compactCount(a.viewCount)} Views
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link href="/blog?sort=popular" className="mt-3 flex items-center justify-center gap-1.5 py-1 text-[12.5px] font-semibold text-brand">
              View All Trending
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* ═════════ upcoming events (real only) ═════════ */}
        <PhoneEventsCard events={events} />

        {/* ═════════ newsletter ═════════ */}
        <PhoneNewsletterCard source="blog-phone" />

        {/* ═════════ popular posts ═════════ */}
        {popular.length > 0 && (
          <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
            <PhoneSectionHead title="Popular Posts" href="/blog?sort=popular" />
            <ol className="mt-1.5 flex flex-col gap-3">
              {popular.map((a, i) => {
                const m = articleMeta(a.meta)
                return (
                  <li key={a.id}>
                    <Link href={`/blog/${a.slug}`} className="flex min-w-0 items-center gap-2.5">
                      <span className="tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10.5px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="relative h-[50px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
                        <Image src={photoSrc(m.thumbImage, { w: 160, h: 120 })} alt="" fill sizes="68px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">{a.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-ink-3">
                          <span className="flex items-center gap-1">
                            <Glyph name="eye" className="h-3 w-3" />
                            {compactCount(a.viewCount)}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{postDate(a.publishedAt)}</span>
                          <span aria-hidden>·</span>
                          <span>{m.readMinutes} min read</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  )
}
