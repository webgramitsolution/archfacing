import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { NewsletterForm } from '@/components/newsletter-form'
import { Icon, EmptyState, type IconName } from '@/components/ui'
import {
  ArticleCard, CategoriesCard, FeatureStrip, FollowUsCard,
  Glyph, PopularPostsCard, photoSrc,
} from '@/components/blog'
import {
  articleCounts, articleMeta, compactCount, countArticles,
  listArticles, postDate,
} from '@/lib/content'
import {
  ARTICLE_PHOTOS, BLOG_TOPICS, POPULAR_BLOG_TOPICS, unsplash,
} from '@/config/content-media'
import { BlogPhone } from '@/components/mobile/pages/blog-phone'
import { loadPhoneEvents } from '@/components/mobile/pages/content-phone-parts'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'
import { badgeTones } from '@/lib/verified'

/**
 * §6.1 — Blog & Insights.
 *
 * Everything on this page is a Server Component. The filters, the sort and
 * "Load More" are all plain GET links and forms that change the search params,
 * so the page never needs client JavaScript to work; the one exception is
 * <NewsletterForm />, which already existed and posts to a server action.
 */

export const metadata: Metadata = {
  title: 'Blog & Insights',
  description:
    'Explore the latest trends, ideas and inspiration from the architecture, ' +
    'design and construction industry.',
}

/** How many cards a page shows before "Load More" is needed. */
const PER_PAGE = 6

const WHY_US: { icon: IconName; title: string; body: string }[] = [
  { icon: 'file', title: 'Quality Content', body: 'Expert insights & updates' },
  { icon: 'users', title: 'Industry Experts', body: 'Articles by professionals' },
  { icon: 'chart', title: 'Trending Topics', body: 'Stay ahead of the curve' },
  { icon: 'clock', title: 'Regular Updates', body: 'Fresh content every week' },
]

type Search = {
  q?: string
  category?: string
  sort?: string
  take?: string
}

/** Builds a /blog link, dropping any param that is empty. */
function blogHref(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/blog?${s}` : '/blog'
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams

  const q = (sp.q ?? '').trim() || undefined
  const category = BLOG_TOPICS.some((t) => t.slug === sp.category) ? sp.category : undefined
  const sort: 'latest' | 'popular' = sp.sort === 'popular' ? 'popular' : 'latest'
  // Only carried into links when it is not the default, so /blog stays clean.
  const sortParam = sort === 'popular' ? 'popular' : undefined

  // "Load More" simply raises `take` — no client state, no pagination cursor.
  const requested = Number(sp.take)
  const take = Number.isFinite(requested)
    ? Math.min(Math.max(requested, PER_PAGE), 60)
    : PER_PAGE

  const [counts, recent, articles, total, popular, events, session] = await Promise.all([
    articleCounts(),
    // The featured card is fixed — it ignores whatever is filtered below it.
    listArticles({ sort: 'latest', take: 12 }),
    listArticles({ category, search: q, sort, take }),
    countArticles({ category, search: q }),
    listArticles({ sort: 'popular', take: 5 }),
    // Phone only: real upcoming Around Us / Club events, or none.
    loadPhoneEvents(4),
    auth(),
  ])

  // Phone only: the reader's own saves (bookmark state) and the authors' ticks.
  const [savedIds, tones] = await Promise.all([
    session?.user?.id
      ? savedIdsAmong(session.user.id, articles.map((a) => a.id))
      : Promise.resolve(new Set<string>()),
    badgeTones(articles.map((a) => a.author.id)),
  ])
  // Phone "Trending Topics": the most-read of the twelve newest articles, so
  // it differs from the all-time "Popular Posts" list.
  const trending = [...recent].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)

  // The most recent article whose meta carries `featured: true`.
  const featured = recent.find((a) => articleMeta(a.meta).featured) ?? recent[0]
  const featuredMeta = featured ? articleMeta(featured.meta) : null

  const shown = articles.length
  const hasMore = shown < total

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Enter product / service to search', action: '/blog', param: 'q', variant: 'filter' },
          location: false,
          tone: 'light',
        }}
      />

      <div className="hidden md:block">
        <Breadcrumb items={[homeCrumb(), { label: 'Blog' }]} />
      </div>

      {/* ─── phones ─── */}
      <div className="md:hidden">
        <BlogPhone
          q={q}
          category={category}
          total={total}
          featured={featured ?? null}
          articles={articles}
          trending={trending}
          popular={popular.slice(0, 4)}
          counts={counts}
          events={events}
          savedIds={savedIds}
          tones={tones}
          loadMoreHref={hasMore ? blogHref({ q, category, sort: sortParam, take: take + PER_PAGE }) : null}
          topicHref={(slug) => (slug === category ? blogHref({ q, sort: sortParam }) : blogHref({ category: slug, q, sort: sortParam }))}
        />
      </div>

      <main className="hidden bg-paper md:block">
        <div className="container-af py-10">
          {/* ═══════════════════ top band ═══════════════════ */}
          <section className="grid gap-8 md:grid-cols-[1fr_1.05fr]">
            {/* Vertically centred against the featured card beside it — the
                text is shorter than the picture, so aligning both to the top
                left a band of empty page under the topic chips. */}
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink md:text-[38px]">
                Blog &amp; Insights
              </h1>
              <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
                Explore the latest trends, ideas and inspiration from architecture,
                design and construction industry.
              </p>

              <form method="get" action="/blog" className="mt-6 flex min-w-0 flex-wrap gap-2.5">
                <label htmlFor="blog-search" className="sr-only">
                  Search articles
                </label>
                <span className="relative min-w-0 flex-1 basis-[220px]">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
                  />
                  <input
                    id="blog-search"
                    name="q"
                    type="search"
                    defaultValue={q ?? ''}
                    placeholder="Search articles, topics, authors..."
                    className="input pl-10"
                  />
                </span>
                <button type="submit" className="btn-primary shrink-0">
                  Search
                </button>
              </form>

              {/* One running line beside the label, not a wrapping block —
                  it scrolls sideways inside itself when the chips outrun the
                  column, so the row never becomes two. */}
              <div className="mt-5 flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[12.5px] font-semibold text-ink-2">
                  Popular Topics:
                </span>
                <span className="scroll-slim-light flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                {POPULAR_BLOG_TOPICS.map((t) => (
                  <Link
                    key={t}
                    href={blogHref({ q: t })}
                    className="shrink-0 whitespace-nowrap rounded-pill bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                  >
                    {t}
                  </Link>
                ))}
                </span>
              </div>
            </div>

            {/* ─── the featured article ─── */}
            {featured && featuredMeta && (
              <article className="relative min-w-0 overflow-hidden rounded-card bg-navy shadow-lift">
                <span aria-hidden className="absolute inset-0">
                  <Image
                    src={photoSrc(featuredMeta.heroImage, { w: 1200, h: 675 })}
                    alt=""
                    fill
                    priority
                    sizes="(min-width:1024px) 620px, 100vw"
                    className="object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/25" />
                </span>

                <div className="relative flex min-w-0 flex-col p-6 md:p-8">
                  <span className="w-fit rounded-pill bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                    Featured Article
                  </span>

                  <h2 className="mt-4 min-w-0">
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="font-display text-[22px] font-bold leading-[1.2] tracking-tight text-white hover:underline md:text-[27px]"
                    >
                      {featured.title}
                    </Link>
                  </h2>

                  <p className="mt-3 line-clamp-2 max-w-lg text-[13.5px] leading-relaxed text-white/75">
                    {featuredMeta.excerpt || featured.description}
                  </p>

                  <Link href={`/blog/${featured.slug}`} className="btn-primary mt-6 w-fit">
                    Read Article
                    <Glyph name="right" className="h-4 w-4" />
                  </Link>

                  <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-[12px] text-white/70">
                    <li className="flex items-center gap-1.5">
                      <Glyph name="calendar" className="h-4 w-4" />
                      {postDate(featured.publishedAt)}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Glyph name="eye" className="h-4 w-4" />
                      {compactCount(featured.viewCount)} Views
                    </li>
                  </ul>
                </div>
              </article>
            )}
          </section>

          {/* ═══════════════════ articles + sidebar ═══════════════════ */}
          <div className="mt-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ─── the article grid ─── */}
            <div className="min-w-0">
              {/*
                ─── category strip ───

                Inside the left column, level with the newsletter card beside
                it, as the reference draws it — full width across the page put
                it above the sidebar and left the row and the rail out of step.

                All eight, always, and no counts: hiding an empty category made
                the row change length as articles were published, and a count
                on a chip is a number nobody acts on. This is the only place
                the blog's categories are listed now; the site header no longer
                carries a Blog dropdown.
              */}
              <section className="card mb-6 p-2">
                {/* A grid, never a fixed-width flex row — eight equal tracks
                    fill the card exactly, so there is no gap left at the end. */}
                <ul className="grid grid-cols-4 gap-1 lg:grid-cols-8">
                  {BLOG_TOPICS.map((t) => {
                    const on = t.slug === category
                    return (
                      <li key={t.slug} className="min-w-0">
                        <Link
                          href={on ? blogHref({ q, sort: sortParam }) : blogHref({ category: t.slug, q, sort: sortParam })}
                          aria-current={on ? 'true' : undefined}
                          title={t.label}
                          className={[
                            'flex h-full w-full flex-col items-center gap-2 rounded-lg border px-1.5 py-3 text-center transition-colors',
                            on
                              ? 'border-brand bg-brand-soft'
                              : 'border-transparent hover:border-brand-border hover:bg-brand-soft',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                              on ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
                            ].join(' ')}
                          >
                            <Icon name={t.icon as IconName} className="h-[18px] w-[18px]" />
                          </span>
                          <span
                            className={[
                              'line-clamp-2 text-[11px] font-semibold leading-tight',
                              on ? 'text-brand' : 'text-ink-2',
                            ].join(' ')}
                          >
                            {t.label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">
                    Latest Articles
                  </h2>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {total} article{total === 1 ? '' : 's'}
                    {category && ` in ${BLOG_TOPICS.find((t) => t.slug === category)?.label}`}
                    {q && ` matching “${q}”`}
                  </p>
                </div>

                {/* Sort — a GET form, so no client JS is needed. The other
                    filters ride along as hidden fields. */}
                <form method="get" action="/blog" className="flex shrink-0 items-center gap-2">
                  {q && <input type="hidden" name="q" value={q} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  <label htmlFor="blog-sort" className="text-[12.5px] text-ink-3">
                    Sort by:
                  </label>
                  <select
                    id="blog-sort"
                    name="sort"
                    defaultValue={sort}
                    className="input w-auto py-2 text-[12.5px]"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                  </select>
                  <button type="submit" className="btn-outline px-3.5 py-2 text-[12.5px]">
                    Go
                  </button>
                </form>
              </div>

              {articles.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No articles found"
                  action={
                    <Link href="/blog" className="btn-outline">
                      Clear filters
                    </Link>
                  }
                >
                  Nothing matches that search just yet. Try a different topic, or
                  browse everything we have published.
                </EmptyState>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {articles.map((a) => (
                    <ArticleCard key={a.slug} post={a} />
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Link
                    href={blogHref({ q, category, sort: sortParam, take: take + PER_PAGE })}
                    className="btn-outline border-brand text-brand hover:border-brand-hover hover:bg-brand-soft"
                  >
                    Load More Articles
                    <Glyph name="refresh" className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* ─── sidebar ─── */}
            {/* sticky like the article page's rail — the cards are short and
                the grid beside them is long, so a static sidebar leaves a
                column of empty page once you scroll past it */}
            <aside className="flex min-w-0 flex-col gap-4 md:sticky md:top-6 md:self-start lg:gap-5">
              <section className="card p-5">
                <h2 className="font-display text-[15px] font-bold text-ink">
                  Subscribe to Newsletter
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                  Get the latest articles, insights and updates straight to your inbox.
                </p>
                <div className="mt-4">
                  <NewsletterForm source="blog" variant="light" />
                </div>
                <p className="mt-3 text-[11.5px] text-ink-4">
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </section>

              <PopularPostsCard posts={popular} />

              <CategoriesCard counts={counts} active={category} />

              <FollowUsCard />
            </aside>
          </div>

          {/* ═══════════════════ write for us ═══════════════════ */}
          <section className="relative mt-10 overflow-hidden rounded-card bg-navy">
            <span aria-hidden className="absolute inset-0">
              <Image
                src={unsplash(ARTICLE_PHOTOS.collaboration, { w: 1600, h: 600 })}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-35"
              />
              <span className="absolute inset-0 bg-navy/70" />
            </span>

            <div className="relative flex min-w-0 flex-col items-center px-6 py-12 text-center">
              <h2 className="font-display text-[24px] font-bold leading-tight tracking-tight text-white md:text-[30px]">
                Share Your Expertise
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/75">
                Write for ArchFacing and reach thousands of professionals across
                Architecture &amp; Design community.
              </p>
              <Link href="/legal/contact" className="btn-primary mt-6">
                Submit Your Article
                <Glyph name="right" className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* ═══════════════════ why read us ═══════════════════ */}
          <section className="mt-8">
            <FeatureStrip items={WHY_US} />
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
