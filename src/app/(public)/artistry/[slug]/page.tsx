import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sellerHrefFor } from '@/lib/seller'
import { auth } from '@/lib/auth'
import { isSaved, recordView } from '@/lib/visitor'
import { SaveToggle } from '@/components/save-button'
import { CommentComposer, DeleteCommentButton } from '@/components/post-comments'
import { listComments } from '@/lib/post-comments'
import { getSellerCertificate } from '@/lib/membership'
import { ensureMemberCode } from '@/lib/member-code'
import { MemberPlanStrip } from '@/components/membership/member-plan'
import type { Role } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { Icon } from '@/components/ui'
import { ShareRow, VerifiedTick, photoSrc } from '@/components/blog'
import { PostChatButton } from '@/components/post-chat-button'
import {
  ArtGlyph, CommentItem, FilterChip, Gallery,
  RatingRow, SimilarRow, SpecColumn, StatStrip, type StatCell,
} from '@/components/artistry'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { artworkMeta, artworkRates, getArtwork, similarArtworks } from '@/lib/artistry'
import type { ArtGlyphName } from '@/components/artistry-glyph'
// `compactCount` turns 2800 into "2.8K". It is shared formatting, not blog
// formatting, so it is imported rather than written again.
import { compactCount } from '@/lib/content'

/**
 * §5.2.5 — a single Artistry posting.
 *
 * Read-only: nothing here writes to the database, so the view counter is not
 * touched. Bumping it belongs in a route handler where it can be rate-limited.
 *
 * ★ Every figure on this page — the stat strip, the sidebar tiles, the artist
 *   ratings, the comment like counts — is read from the seeded `Post.meta`, so
 *   all of it is real stored data rather than markup. Anything the parser
 *   cannot find renders as "—"; see `artworkMeta()`.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

/** How many comments the list shows before "View All Comments". */
const COMMENT_PAGE = 6

type Search = { sort?: string; show?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getArtwork(slug)
  if (!post) return { title: 'Artwork not found' }

  const m = artworkMeta(post.meta)
  const description = post.description.slice(0, 155)

  return {
    title: `${post.title} — ${m.subtitle || m.categoryLabel}`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      images: [{ url: photoSrc(m.image, { w: 1200, h: 900 }) }],
    },
  }
}

export default async function ArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Search>
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams])

  const post = await getArtwork(slug)
  if (!post) notFound()

  // Stamp this visit into the reader's history — fire-and-forget.
  const session = await auth()
  if (session?.user?.id) void recordView(session.user.id, post.id).catch(() => {})
  const saved = session?.user?.id ? await isSaved(session.user.id, post.id) : false

  // The artist's own storefront when they trade under a name; the directory
  // otherwise, because a storefront that does not exist is a worse answer.
  const sellerHref = await sellerHrefFor(post.author.id)

  const m = artworkMeta(post.meta)

  /*
   * Only figures that exist. There is no Follow table and no reply-timing
   * measure behind "Followers" or "Success Rate", so an artist who has not
   * supplied them drops the tile instead of printing an em dash where a
   * number should be — and if none survive, the whole rule drops too.
   */
  const artistStats = [
    { value: m.artist.projects, label: 'Projects' },
    { value: m.artist.followers, label: 'Followers' },
    { value: m.artist.successRate, label: 'Success Rate' },
  ].filter((s) => s.value && s.value !== '—')
  const similar = await similarArtworks(slug, { category: post.category, sub: post.subCategory })

  const url = `${SITE_URL.replace(/\/$/, '')}/artistry/${post.slug}`

  /* ─── the comment list, ordered and paged entirely on the server ─── */
  const oldestFirst = search.sort === 'oldest'
  const showAll = search.show === 'all'
  const ordered = await listComments(
    post.id,
    { id: session?.user?.id, role: session?.user?.role as Role | undefined },
    { oldestFirst }
  )
  const commentDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const visible = showAll ? ordered : ordered.slice(0, COMMENT_PAGE)
  const commentQuery = (next: Search) => {
    const q = new URLSearchParams()
    if (next.sort === 'oldest') q.set('sort', 'oldest')
    if (next.show === 'all') q.set('show', 'all')
    const s = q.toString()
    return `/artistry/${post.slug}${s ? `?${s}` : ''}#comments`
  }

  /* ─── the four-cell strip under the title ─── */
  const [artistCert, artistCode] = await Promise.all([getSellerCertificate(post.author.id), ensureMemberCode(post.author.id)])
  const rates = await artworkRates(post.id, post.author.id, m.stats.inquiries, m.stats.views)
  /** The sidebar "Artwork Stats" card — all six counted, none typed in. */
  const statTiles: { icon: ArtGlyphName; label: string; value: string }[] = [
    { icon: 'eye', label: 'Views', value: compactCount(m.stats.views) },
    { icon: 'chat', label: 'Inquiries', value: compactCount(m.stats.inquiries) },
    { icon: 'heart', label: 'Favourites', value: compactCount(m.stats.favourites) },
    { icon: 'bookmark', label: 'Shortlisted', value: compactCount(m.stats.shortlisted) },
    { icon: 'percent', label: 'Enquiries Rate', value: rates.enquiryRate },
    { icon: 'calendar', label: 'Response Time', value: rates.responseTime },
  ]

  const strip: StatCell[] = [
    { icon: 'eye', value: compactCount(m.stats.views), label: 'Views' },
    { icon: 'mail', value: compactCount(m.stats.inquiries), label: 'Inquiries' },
    { icon: 'bookmark', value: compactCount(m.stats.shortlisted), label: 'Shortlisted' },
    { icon: 'calendar', value: m.addedOn, label: 'Added On' },
  ]

  /**
   * "Applicable Categories" — the groups this piece belongs to.
   *
   * The form lets an author tick several, stored on `meta.badges` alongside
   * the marketing badges, so only the values that are real taxonomy slugs are
   * shown; the piece's own category is always one of them.
   */
  const applicable = ARTISTRY_CATEGORIES.filter(
    (g) => g.slug === post.category || m.badges.includes(g.slug)
  )

  /* ─── the sidebar fact rows ─── */
  const facts: { label: string; value: string; href?: string }[] = [
    // The artist's own member ID — the same one shown in their Edit Profile.
    { label: 'Artwork ID', value: '#' + artistCode },
    { label: 'Category', value: m.categoryLabel, href: `/artistry?category=${post.category}` },
    ...(m.subCategoryLabel
      ? [{
          label: 'Sub Category',
          value: m.subCategoryLabel,
          href: `/artistry?category=${post.category}&sub=${post.subCategory}`,
        }]
      : []),
    { label: 'Medium', value: m.medium },
    { label: 'Project Status', value: m.projectStatus },
    { label: 'Last Updated', value: m.lastUpdated },
  ]

  return (
    <>
      <SiteHeader />

      {/* Not drawn. The page opens straight into the photograph, and a trail
          above it pushed the whole gallery down for something the category
          badge already says. It stays in the DOM for the BreadcrumbList
          JSON-LD that Google reads. */}
      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Artistry', href: '/artistry' },
          { label: m.categoryLabel, href: `/artistry?category=${post.category}` },
          ...(m.subCategoryLabel
            ? [{
                label: m.subCategoryLabel,
                href: `/artistry?category=${post.category}&sub=${post.subCategory}`,
              }]
            : []),
          { label: post.title },
        ]}
      />

      <main className="bg-paper">
        {/* 20px above, and no padding below — the footer's own top margin is
            the whole gap under an artwork. */}
        <div className="container-af pb-0 pt-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ═══════════════════ the artwork ═══════════════════ */}
            <article className="min-w-0">
              <Gallery images={m.gallery} title={post.title} />

              {/* ─── badges ─── */}
              {m.badges.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {m.badges.map((b) => (
                    <li key={b}>
                      <span className="pill-brand px-3 py-1 text-[10.5px] uppercase tracking-[0.09em]">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* ─── title row ─── */}
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                  <h1 className="font-display text-[27px] font-bold leading-[1.15] tracking-tight text-ink md:text-[33px]">
                    {post.title}
                  </h1>

                  {m.subtitle && (
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{m.subtitle}</p>
                  )}

                  {m.location && (
                    <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-3">
                      <Icon name="map" className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{m.location}</span>
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* A real save (SavedItem) — signed out, it bounces to sign-in. */}
                  <SaveToggle
                    postId={post.id}
                    initialSaved={saved}
                    path={`/artistry/${post.slug}`}
                    noun="artwork"
                    withText
                    className="btn-outline px-3.5 py-2 text-[13px]"
                    savedClassName="!border-brand !bg-brand-soft !text-brand [&_svg]:fill-current"
                    icon={<ArtGlyph name="bookmark" className="h-4 w-4" />}
                  />

                  <a href="#share-this-artwork" className="btn-outline px-3.5 py-2 text-[13px]">
                    <ArtGlyph name="share" className="h-4 w-4" />
                    Share
                  </a>
                </div>
              </div>

              <StatStrip items={strip} />

              {/* ─── about ─── */}
              <section className="card mt-7 p-5 md:p-6">
                <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">
                  About this Artwork
                </h2>

                <div className="mt-3.5 flex flex-col gap-3.5">
                  {m.about.length > 0 ? (
                    m.about.map((p, i) => (
                      <p key={i} className="text-[14px] leading-[1.8] text-ink-2">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-[14px] leading-[1.8] text-ink-2">{post.description}</p>
                  )}
                </div>

                {/* ─── the two specification columns ─── */}
                {(m.specsLeft.length > 0 || m.specsRight.length > 0) && (
                  <div className="mt-6 grid gap-x-8 gap-y-0 border-t border-line pt-5 md:grid-cols-2">
                    <SpecColumn rows={m.specsLeft} />
                    <SpecColumn rows={m.specsRight} />
                  </div>
                )}

                {/* ─── tags — inside About, as the blueprint draws them ─── */}
                {m.tags.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                    {m.tags.map((t) => (
                      <li key={t}>
                        <Link
                          href={`/artistry?q=${encodeURIComponent(t)}`}
                          className="inline-flex rounded-lg bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                        >
                          #{t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ─── applicable categories ─── */}
                {/* The five taxonomy groups this piece was filed under. The
                    tags moved to the sidebar; these are the catalogue, not
                    free text, so they stay with the specifications. */}
                {applicable.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                    <span className="mr-1 text-[13.5px] font-bold text-ink">
                      Applicable Categories
                    </span>
                    {applicable.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/artistry?category=${c.slug}`}
                        className="inline-flex rounded-lg bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* ─── project information ─── */}
              {m.projectInfo.length > 0 && (
                <section className="card mt-6 p-5 md:p-6">
                  <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">
                    Project Information
                  </h2>

                  <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {m.projectInfo.map((f) => (
                      <li key={f.label} className="flex min-w-0 items-center gap-3">
                        <span className="chip-icon border border-brand-border bg-brand-soft text-brand">
                          <Icon name={f.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] text-ink-3">{f.label}</span>
                          <span className="mt-0.5 block truncate text-[13.5px] font-bold text-ink">
                            {f.value}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ─── about the artist ─── */}
              {/*
                One row, four parts: the label, the portrait, the person, and
                the three figures pushed to the right behind a hairline. It
                folds to a stack under `lg`, where a single row would squeeze
                the bio into a column two words wide.
              */}
              <section className="card mt-6 p-5 md:p-6">
                <div className="flex min-w-0 flex-col gap-5 md:flex-row lg:items-start lg:gap-7">
                  {/* Label above the portrait, both in the same narrow column —
                      the heading sits on the name's line, the photograph under
                      it. */}
                  <div className="flex shrink-0 flex-col items-start gap-3.5 lg:w-[132px]">
                    <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
                      About the Artist
                    </h2>

                    <span className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full bg-paper-3">
                      {m.artist.photo && (
                        <Image
                          src={photoSrc(m.artist.photo, { w: 220, h: 220 })}
                          alt=""
                          fill
                          sizes="88px"
                          className="object-cover"
                        />
                      )}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="font-display text-[18px] font-bold leading-tight text-ink">
                          {m.artist.name}
                        </span>
                        {m.artist.verified && <VerifiedTick tone={m.artist.badgeTone} />}
                      </span>

                      {m.artist.role && (
                        <p className="mt-1 text-[13px] text-ink-3">{m.artist.role}</p>
                      )}

                      {m.artist.bio && (
                        <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-ink-2">
                          {m.artist.bio}
                        </p>
                      )}

                      {/* No public per-professional route exists yet — the
                          directory is the nearest real destination. */}
                      <Link
                        href={sellerHref ?? "/designers-associates"}
                        className="btn-primary mt-3.5 px-5 py-2 text-[13px]"
                      >
                        View Artist Profile
                      </Link>
                    </div>
                  </div>

                  {/* Hairlines between the three as well as before them —
                      three unruled figures in a row read as one number broken
                      up. */}
                  {artistStats.length > 0 && (
                  <ul className="flex shrink-0 divide-x divide-line border-t border-line pt-4 text-center lg:self-center lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                    {artistStats.map((s) => (
                      <li key={s.label} className="min-w-0 flex-1 px-4 lg:min-w-[84px] lg:flex-none">
                        <span className="tabular block font-display text-[20px] font-bold leading-none text-ink">
                          {s.value}
                        </span>
                        <span className="mt-1.5 block truncate text-[12px] text-ink-3">
                          {s.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  )}
                </div>
              </section>

              {/* ═══════════════════ comments ═══════════════════ */}
              <section id="comments" className="card mt-6 scroll-mt-24 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">
                    Comments ({ordered.length})
                  </h2>

                  {/*
                    A real control, not a decorative one: both options are links
                    the server reads back out of the query string, so ordering
                    works with no client JavaScript.
                  */}
                  <div className="flex min-w-0 items-center gap-2 text-[12px] text-ink-3">
                    <ArtGlyph name="sort" className="h-4 w-4 shrink-0" />
                    <span className="shrink-0">Sort by:</span>
                    <span className="flex items-center gap-1 overflow-x-auto">
                      {([
                        { key: 'recent', label: 'Recent' },
                        { key: 'oldest', label: 'Oldest' },
                      ] as const).map((o) => {
                        const on = (o.key === 'oldest') === oldestFirst
                        return (
                          <Link
                            key={o.key}
                            href={commentQuery({
                              sort: o.key === 'oldest' ? 'oldest' : undefined,
                              show: showAll ? 'all' : undefined,
                            })}
                            aria-current={on ? 'true' : undefined}
                            className={
                              on
                                ? 'shrink-0 rounded-pill bg-brand-soft px-2.5 py-1 font-semibold text-brand'
                                : 'shrink-0 rounded-pill px-2.5 py-1 font-medium hover:text-brand'
                            }
                          >
                            {o.label}
                          </Link>
                        )
                      })}
                    </span>
                  </div>
                </div>

                <CommentComposer
                  postId={post.id}
                  path={`/artistry/${post.slug}`}
                  signedIn={Boolean(session?.user?.id)}
                  viewerName={session?.user?.name}
                />

                {visible.length > 0 ? (
                  <>
                    <ul className="mt-6 flex flex-col gap-4">
                      {visible.map((c) => (
                        <CommentItem
                          key={c.id}
                          comment={c}
                          date={commentDate(c.createdAt)}
                          action={c.canDelete ? <DeleteCommentButton commentId={c.id} path={`/artistry/${post.slug}`} /> : undefined}
                        />
                      ))}
                    </ul>

                    {!showAll && ordered.length > visible.length && (
                      <Link
                        href={commentQuery({
                          sort: oldestFirst ? 'oldest' : undefined,
                          show: 'all',
                        })}
                        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                      >
                        View All Comments ({ordered.length})
                        <ArtGlyph name="right" className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="mt-6 text-[13px] text-ink-3">
                    No comments yet — be the first to say something about this work.
                  </p>
                )}
              </section>
            </article>

            {/* ═══════════════════ sidebar ═══════════════════ */}
            <aside className="min-w-0">
              {/* Pinned as one piece, exactly like the Blog detail sidebar — 116px
                  clears the sticky site header. */}
              <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-[116px] lg:gap-5">
                {/* ─── the artist ─── */}
                <section className="card p-5">
                  <h2 className="eyebrow mb-4 border-b border-line-soft pb-3">
                    Artist / {m.artist.cardLabel}
                  </h2>

                  <div className="flex flex-col items-center text-center">
                    <span className="relative h-20 w-20 overflow-hidden rounded-full bg-paper-3">
                      {m.artist.photo && (
                        <Image
                          src={photoSrc(m.artist.photo, { w: 200, h: 200 })}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </span>

                    <span className="mt-3 flex items-center gap-1.5">
                      <span className="font-display text-[15.5px] font-bold text-ink">
                        {m.artist.name}
                      </span>
                      {m.artist.verified && <VerifiedTick tone={m.artist.badgeTone} />}
                    </span>

                    {m.artist.role && (
                      <span className="mt-0.5 text-[12.5px] text-ink-3">{m.artist.role}</span>
                    )}

                    {m.artist.location && (
                      <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
                        <Icon name="map" className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{m.artist.location}</span>
                      </span>
                    )}

                    <span className="mt-3 w-full border-y border-line py-2.5">
                      <RatingRow
                        rating={m.artist.rating}
                        reviews={m.artist.reviews}
                        recommend={m.artist.recommend}
                      />
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Link href={sellerHref ?? "/designers-associates"} className="btn-primary w-full">
                      View Artist Profile
                    </Link>
                    <div className="flex flex-col gap-2">
                      {/* Both open the real conversation with the artist in
                          Messages; Enquiry types an opener for them. */}
                      <PostChatButton
                        postId={post.id}
                        signedIn={!!session?.user?.id}
                        returnTo={`/artistry/${post.slug}`}
                        label="Send Enquiry"
                        intent="enquiry"
                        icon="file"
                      />
                      <PostChatButton
                        postId={post.id}
                        signedIn={!!session?.user?.id}
                        returnTo={`/artistry/${post.slug}`}
                      />
                    </div>
                  </div>

                  <ul className="mt-4 flex flex-col border-t border-line pt-2">
                    {facts.map((f) => (
                      <li
                        key={f.label}
                        className="flex min-w-0 items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                      >
                        <span className="shrink-0 text-[12.5px] text-ink-3">{f.label}</span>
                        {f.href ? (
                          <Link
                            href={f.href}
                            className="min-w-0 truncate text-[12.5px] font-semibold text-brand hover:underline"
                          >
                            {f.value}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">
                            {f.value}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* the plan this artist bought + their certificate */}
                  <MemberPlanStrip cert={artistCert} tone={m.artist.badgeTone} />

                  <Link
                    href="/legal/need-help"
                    className="mt-3.5 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    <ArtGlyph name="flag" className="h-4 w-4" />
                    Report this Artwork
                  </Link>
                </section>

                {/* ─── artwork stats ─── */}
                <section className="card bg-paper p-5">
                  <h2 className="font-display text-[15px] font-bold text-ink">Artwork Stats</h2>
                  <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
                    {statTiles.map((t) => (
                      <li key={t.label} className="flex min-w-0 flex-col items-center text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <ArtGlyph name={t.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="mt-2 block w-full text-[11.5px] leading-tight text-ink-3">{t.label}</span>
                        <span className="tabular mt-0.5 block w-full truncate font-display text-[14px] font-bold text-ink">{t.value}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ─── similar ─── */}
                {similar.length > 0 && (
                  <section className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-[15px] font-bold text-ink">
                        Similar Artworks
                      </h2>
                      <Link
                        href={`/artistry?category=${post.category}`}
                        className="shrink-0 text-[12px] font-semibold text-brand hover:underline"
                      >
                        View All
                      </Link>
                    </div>

                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {similar.map((s) => (
                        <SimilarRow key={s.slug} post={s} />
                      ))}
                    </ul>
                  </section>
                )}

                {/* ─── share ─── */}
                <section id="share-this-artwork" className="card scroll-mt-24 p-5">
                  <h2 className="font-display text-[15px] font-bold text-ink">
                    Share this Artwork
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                    Every button opens the platform&rsquo;s own share dialog with this page&rsquo;s
                    address already filled in.
                  </p>
                  <div className="mt-4">
                    <ShareRow url={url} title={post.title} compact />
                  </div>
                </section>
              </div>
            </aside>
          </div>

          {/* ─── a way back into the listing, for readers who arrived cold ─── */}
          <nav aria-label="More artistry" className="mt-10 flex flex-wrap gap-2">
            <FilterChip href="/artistry" label="All Artistry" active={false} />
            <FilterChip
              href={`/artistry?category=${post.category}`}
              label={`More in ${m.categoryLabel}`}
              active={false}
            />
          </nav>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
