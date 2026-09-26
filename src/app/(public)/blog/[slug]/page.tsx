import type { Metadata } from 'next'
import { badgeTone } from '@/lib/verified'
import { getSellerCertificate } from '@/lib/membership'
import { MemberPlanStrip } from '@/components/membership/member-plan'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sellerHrefFor } from '@/lib/seller'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { NewsletterForm } from '@/components/newsletter-form'
import { Icon, type IconName } from '@/components/ui'
import {
  CategoriesCard, Glyph, MiniPost,
  VerifiedTick, photoSrc,
} from '@/components/blog'
import { BlogArticle } from '@/components/blog-article'
import { prisma } from '@/lib/prisma'
import {
  articleBody, articleCounts, articleMeta, articleNeighbours,
  compactCount, getArticle, listArticles,
} from '@/lib/content'

/**
 * §6.1 — a single blog article.
 *
 * Read-only: the page never writes to the database, so the view counter is
 * not touched here. Bumping it belongs in a route handler or a server action,
 * where it can be rate-limited and will not run again on every revalidation.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getArticle(slug)
  if (!post) return { title: 'Article not found' }

  const m = articleMeta(post.meta)
  const description = (m.excerpt || post.description).slice(0, 155)

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      images: [{ url: photoSrc(m.heroImage, { w: 1200, h: 675 }) }],
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getArticle(slug)
  if (!post) notFound()

  const m = articleMeta(post.meta)
  const blocks = articleBody(post.meta)
  const author = post.author
  const profile = author.professionalProfile
  // Blue tick = an active PACT holder (lib/verified.ts), not the profile flag.
  const [tone, authorCert] = await Promise.all([badgeTone(author.id), getSellerCertificate(author.id)])
  const pactVerified = tone !== null

  // The author's own storefront — `/<sellerSlug>` — when they trade under a
  // name. Null for an account with no brand, and the button then keeps its
  // old destination rather than pointing at a page that does not exist.
  const sellerHref = await sellerHrefFor(author.id)

  const pact = author.pacts[0]

  const authorWhere = {
    type: 'BLOG' as const,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    authorId: author.id,
  }

  const [
    neighbours, sameCategory, latest, counts,
    authorArticles, authorViews, authorTopics, tier, plan, enquiries,
  ] =
    await Promise.all([
      articleNeighbours(post.publishedAt),
      listArticles({ category: post.category, take: 3, excludeSlug: slug }),
      // A category can hold a single article, and the design always shows this
      // card — so the newest articles stand in when there is nothing related.
      listArticles({ take: 3, excludeSlug: slug }),
      articleCounts(),
      prisma.post.count({ where: authorWhere }),
      prisma.post.aggregate({ where: authorWhere, _sum: { viewCount: true } }),
      prisma.post.findMany({ where: authorWhere, distinct: ['category'], select: { category: true } }),
      prisma.professionalProfile.findUnique({
        where: { userId: author.id },
        select: { tier: true },
      }),
      // The live plan, if there is one — an expired row is the same as none.
      prisma.clubMembership.findFirst({
        where: { userId: author.id, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'desc' },
        select: { planName: true },
      }),
      // Enquiries answer both the rate and the speed: `respondedAt` is stamped
      // when the holder replies, so a null one is an enquiry still waiting.
      prisma.enquiry.findMany({
        where: { holderId: author.id },
        select: { createdAt: true, respondedAt: true },
      }),
    ])

  const related = sameCategory.length > 0 ? sameCategory : latest
  const relatedHref = sameCategory.length > 0 ? `/blog?category=${post.category}` : '/blog'

  const url = `${SITE_URL.replace(/\/$/, '')}/blog/${post.slug}`
  const authorPhoto = m.authorPhoto || author.profilePhoto || ''

  /**
   * The sidebar numbers — every one of them counted, none of them invented.
   *
   * Response rate and time come from this author's own enquiries. With no
   * enquiries there is nothing to average, so those two rows are dropped
   * rather than shown as a flattering default.
   */
  const answered = enquiries.filter((e) => e.respondedAt !== null)

  /** Median, not mean — one forgotten enquiry should not sink the figure. */
  const medianHours = (() => {
    if (answered.length === 0) return null
    const hours = answered
      .map((e) => (e.respondedAt!.getTime() - e.createdAt.getTime()) / 3_600_000)
      .sort((a, b) => a - b)
    const mid = Math.floor(hours.length / 2)
    return hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2
  })()

  function spokenTime(h: number): string {
    if (h < 1) return 'Within an hour'
    if (h < 24) return `Within ${Math.ceil(h)} hours`
    if (h < 48) return 'Within a day'
    return `Within ${Math.ceil(h / 24)} days`
  }

  const stats: { value: string; label: string }[] = [
    { value: String(authorArticles), label: 'Articles' },
    { value: compactCount(authorViews._sum.viewCount ?? 0), label: 'Total Views' },
    { value: String(authorTopics.length), label: 'Topics' },
  ]

  const facts: { icon: IconName; label: string; value: string }[] = [
    {
      icon: 'clock',
      label: 'Member Since',
      value: String(author.createdAt.getFullYear()),
    },
    {
      icon: 'award',
      label: 'Membership',
      // the plan they pay for, falling back to the tier they registered under
      value:
        plan?.planName ??
        (tier ? tier.tier.charAt(0) + tier.tier.slice(1).toLowerCase() : '—'),
    },
    {
      icon: 'map',
      label: 'PACT Area',
      value: pact ? [pact.city, pact.pincode].filter(Boolean).join(' · ') : '—',
    },
    ...(enquiries.length > 0
      ? [
          {
            icon: 'trending' as IconName,
            label: 'Response Rate',
            value: `${Math.round((answered.length / enquiries.length) * 100)}%`,
          },
        ]
      : []),
    ...(medianHours !== null
      ? [{ icon: 'clock' as IconName, label: 'Response Time', value: spokenTime(medianHours) }]
      : []),
  ]

  return (
    <>
      <SiteHeader />

      {/* Not visible on an article. The page opens straight into the
          category pill and the headline, and a trail above them pushed both
          down for something the reader can already see. It stays in the DOM
          for the BreadcrumbList JSON-LD that Google reads. */}
      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Blog', href: '/blog' },
          { label: m.categoryLabel, href: `/blog?category=${post.category}` },
          { label: post.title },
        ]}
      />

      <main className="bg-paper">
        {/* No bottom padding — the footer's own top margin is the whole gap
            under an article, so adding to it just pushes the footer away. */}
        <div className="container-af pb-0 pt-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/*
              One component, shared with the dashboard's Preview — see
              `src/components/blog-article.tsx`. Everything below it (prev/next,
              the sidebar) is about the site around the article rather than the
              article itself, so it stays here.
            */}
            <div className="min-w-0">
              <BlogArticle
                title={post.title}
                meta={m}
                blocks={blocks}
                author={{
                  name: author.name,
                  profilePhoto: author.profilePhoto,
                  isVerified: pactVerified,
                  badgeTone: tone,
                }}
                publishedAt={post.publishedAt}
                viewCount={post.viewCount}
                categorySlug={post.category}
                shareUrl={url}
                fallbackText={post.description}
              />
              {/* ─── previous / next ─── */}
              {(neighbours.previous || neighbours.next) && (
                <nav
                  aria-label="More articles"
                  className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2"
                >
                  {neighbours.previous && (
                    <Link
                      href={`/blog/${neighbours.previous.slug}`}
                      className="card-hover group flex min-w-0 items-center gap-3 bg-paper p-3.5"
                    >
                      <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                        <Image
                          src={photoSrc(articleMeta(neighbours.previous.meta).thumbImage, { w: 160, h: 120 })}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="eyebrow flex items-center gap-1">
                          <Glyph name="left" className="h-3 w-3" />
                          Previous Post
                        </span>
                        <span className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
                          {neighbours.previous.title}
                        </span>
                      </span>
                    </Link>
                  )}

                  {neighbours.next && (
                    <Link
                      href={`/blog/${neighbours.next.slug}`}
                      className="card-hover group flex min-w-0 items-center gap-3 bg-paper p-3.5 sm:col-start-2 sm:flex-row-reverse sm:text-right"
                    >
                      <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                        <Image
                          src={photoSrc(articleMeta(neighbours.next.meta).thumbImage, { w: 160, h: 120 })}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="eyebrow flex items-center gap-1 sm:justify-end">
                          Next Post
                          <Glyph name="right" className="h-3 w-3" />
                        </span>
                        <span className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
                          {neighbours.next.title}
                        </span>
                      </span>
                    </Link>
                  )}
                </nav>
              )}
            </div>

            {/* ═══════════════════ sidebar ═══════════════════ */}
            <aside className="min-w-0">
              {/* The column is pinned as one piece, so the author card holds
                  the top of the screen and everything under it stays in the
                  flow beneath it. The 116px clears the sticky site header,
                  which is about 100px tall — a smaller offset parks the
                  author's photo underneath it. */}
              <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-[116px] lg:gap-5">
                {/* ─── the author ─── */}
                {/* White rather than the panel grey — on a white page the
                    shadow is what separates a card, not a fill. */}
                <section className="card bg-paper p-5">
                  <h2 className="eyebrow mb-4 border-b border-line-soft pb-3">
                    Author / Professional
                  </h2>

                  <div className="flex flex-col items-center text-center">
                    <span className="relative h-20 w-20 overflow-hidden rounded-full bg-paper-3">
                      {authorPhoto && (
                        <Image
                          src={photoSrc(authorPhoto, { w: 200, h: 200 })}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </span>

                    <span className="mt-3 flex items-center gap-1.5">
                      <span className="font-display text-[15.5px] font-bold text-ink">
                        {author.name ?? 'ArchFacing'}
                      </span>
                      {pactVerified && <VerifiedTick tone={tone} />}
                    </span>

                    {m.authorRole && (
                      <span className="mt-0.5 text-[12.5px] text-ink-3">{m.authorRole}</span>
                    )}

                    {profile?.firmName && (
                      <span className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                        <Glyph name="building" className="h-4 w-4 shrink-0 text-ink-3" />
                        <span className="min-w-0 truncate">{profile.firmName}</span>
                      </span>
                    )}

                    {(author.city || author.state) && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        <Icon name="map" className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">
                          {[author.city, author.state].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Real figures, counted from this author's published posts. */}
                  {/* Hairlines between the three, not a gap — the reference
                      separates them, and three unruled numbers in a row read
                      as one number broken up. `divide-x` puts the rule on the
                      left edge of every column but the first, so it lands
                      exactly between them. */}
                  <ul className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3.5 text-center">
                    {stats.map((s) => (
                      <li key={s.label} className="min-w-0 px-0.5">
                        <span className="tabular block font-display text-[16px] font-bold text-ink">
                          {s.value}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                          {s.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-col gap-2">
                    {/* No public per-professional profile route exists yet, so
                        these point at the nearest real destinations. */}
                    <Link href={sellerHref ?? "/designers-associates"} className="btn-primary w-full">
                      <Icon name="user" className="h-4 w-4" />
                      View Seller Profile
                    </Link>
                    <Link href="/consult-nearby" className="btn-outline w-full text-[13px]">
                      <Icon name="mail" className="h-4 w-4" />
                      Send Enquiry
                    </Link>
                    <Link href="/legal/contact" className="btn-outline w-full text-[13px]">
                      <Icon name="phone" className="h-4 w-4" />
                      Chat Now
                    </Link>
                  </div>

                  <ul className="mt-4 flex flex-col border-t border-line pt-2">
                    {facts.map((f) => (
                      <li
                        key={f.label}
                        className="flex min-w-0 items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-3">
                          <Icon name={f.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{f.label}</span>
                        </span>
                        <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">
                          {f.value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {pactVerified && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#E8F5FE] py-2 text-[12px] font-semibold text-[#0077C8]">
                      <VerifiedTick className="h-4 w-4" tone={tone} />
                      Verified Professional
                    </p>
                  )}

                  {/* the plan this author bought + their certificate */}
                  <MemberPlanStrip cert={authorCert} tone={tone} />
                </section>

                {/* ─── related ─── */}
                {related.length > 0 && (
                  <section className="card bg-paper p-5">
                    <h2 className="font-display text-[13px] font-bold text-ink">Related Posts</h2>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {related.map((r) => (
                        <MiniPost key={r.slug} post={r} />
                      ))}
                    </ul>
                    {/* A full-width outline button, as the reference draws it —
                        a bare text link read as part of the last post above it */}
                    <Link
                      href={relatedHref}
                      className="btn-outline mt-4 w-full border-brand text-[13px] text-brand hover:bg-brand-soft"
                    >
                      View All Posts
                      <Glyph name="right" className="h-3.5 w-3.5" />
                    </Link>
                  </section>
                )}

                <CategoriesCard counts={counts} active={post.category} />

                {/* ─── newsletter ─── */}
                <section className="card bg-paper p-5">
                  <h2 className="font-display text-[13px] font-bold text-ink">Stay Updated</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                    Subscribe to our newsletter and get the latest updates and articles.
                  </p>
                  <div className="mt-4">
                    <NewsletterForm source="blog-article" variant="light" />
                  </div>
                </section>
              </div>
            </aside>
          </div>

        </div>
      </main>

      <SiteFooter />
    </>
  )
}
