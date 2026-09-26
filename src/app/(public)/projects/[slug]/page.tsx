import type { Metadata } from 'next'
import { badgeTone } from '@/lib/verified'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sellerHrefFor } from '@/lib/seller'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isSaved, recordView } from '@/lib/visitor'
import { getSellerCertificate } from '@/lib/membership'
import { CertificateDialog } from '@/components/membership/certificate-dialog'
import { SaveButton } from '@/components/save-button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import {
  BrandStrip, Glyph, photoSrc, ProjectCard, SectionTitle, SellerMark,
  Stars, TrustStrip, VerifiedTick,
} from '@/components/projects'
import {
  compactCount, getProject, placeLine, projectMeta, projectPhotos, relatedProjects,
} from '@/lib/projects'

/**
 * §5.2.2 — a single project.
 *
 * A Server Component with no client JavaScript. The two things that would
 * normally reach for a carousel library are handled without one:
 *
 *   · The hero picture is chosen by `?photo=N`. The thumbnail rail and the
 *     next arrow are links that change that number, so the page re-renders
 *     server-side with a different lead image.
 *   · The gallery and the related-projects row are scroll-snap rails. Their
 *     arrows are in-page anchors pointing at a card inside the rail, which is
 *     what moves it — no script involved.
 */

type Params = { slug: string }
type Search = { photo?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return { title: 'Project Not Found' }

  const m = projectMeta(project.meta)
  const photos = projectPhotos(project)
  const summary = project.description.slice(0, 155)

  return {
    title: project.title,
    description: summary,
    openGraph: {
      title: project.title,
      description: summary,
      type: 'article',
      images: photos.cover ? [{ url: photoSrc(photos.cover, { w: 1200, h: 630 }) }] : undefined,
    },
  }
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])

  const project = await getProject(slug)
  if (!project) notFound()

  /*
   * The signed-in reader's own state: stamp this visit into their history
   * (fire-and-forget — a failure must never break the page) and learn whether
   * they had already saved it, so the Save button renders correctly.
   */
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (viewerId) void recordView(viewerId, project.id).catch(() => {})
  const viewerSaved = viewerId ? await isSaved(viewerId, project.id) : false

  const m = projectMeta(project.meta)
  const photos = projectPhotos(project)
  // The author's own storefront — `/<sellerSlug>` — when they trade under
  // a name. Null for an account with no brand, and the button then keeps its
  // old destination rather than pointing at a page that does not exist.
  const sellerHref = await sellerHrefFor(project.author.id)
  const related = await relatedProjects(project.slug, project.category, 5)
  const cert = await getSellerCertificate(project.author.id)

  /*
   * The seller's rating and "What Clients Say" come from real Review rows —
   * the seeded meta.seller.rating / meta.testimonials were invented and are
   * no longer read. The seller photo is the account's own, never a stock one.
   */
  const [ratingAgg, clientReviews] = await Promise.all([
    prisma.review.aggregate({ where: { post: { authorId: project.author.id, deletedAt: null } }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.findMany({
      where: { postId: project.id, body: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, rating: true, body: true, author: { select: { name: true, city: true } } },
    }),
  ])
  m.seller.rating = ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0
  m.seller.reviews = ratingAgg._count._all
  m.seller.photo = project.author.profilePhoto ?? ''
  // Blue tick = an active PACT holder (lib/verified.ts), never meta.seller.verified.
  const sellerTone = await badgeTone(project.author.id)
  m.seller.verified = sellerTone !== null
  const testimonials = clientReviews
    .filter((r) => r.body && r.body.trim())
    .map((r) => ({ key: r.id, stars: r.rating, quote: r.body!.trim(), name: r.author.name, city: r.author.city ?? '' }))

  // Which gallery image leads the page. Out-of-range values fall back to the
  // first rather than producing an empty hero.
  const requested = Number(sp.photo)
  const heroIndex =
    Number.isInteger(requested) && requested >= 0 && requested < photos.gallery.length ? requested : 0
  const heroImage = photos.gallery[heroIndex] ?? photos.cover
  const nextIndex = (heroIndex + 1) % photos.gallery.length

  /** The four thumbnails under the hero, starting from the one on screen. */
  const rail = Array.from({ length: Math.min(4, photos.gallery.length) }, (_, i) => {
    const index = (heroIndex + i) % photos.gallery.length
    return { index, src: photos.gallery[index] }
  })

  const detailRows: { label: string; value: string }[] = [
    { label: 'Location', value: placeLine(project.city, project.state) || '—' },
    { label: 'Project Area', value: m.area },
    { label: 'Year Completed', value: m.yearLabel },
    { label: 'Project Type', value: m.projectType },
    { label: 'Style', value: m.style },
    { label: 'Scope of Work', value: m.scopeOfWork },
    { label: 'Client', value: m.client },
    { label: 'Architect', value: m.architect },
  ]

  const strip: { icon: 'area' | 'calendar' | 'tag'; label: string; value: string }[] = [
    { icon: 'area', label: 'Project Area', value: m.area },
    { icon: 'calendar', label: 'Year', value: m.yearLabel },
    { icon: 'tag', label: 'Project Type', value: m.projectType },
  ]

  // A real share destination. Without client JavaScript there is no Web Share
  // API to call, so this hands the reader to WhatsApp with the link already
  // written — which is where a project link actually gets sent in India.
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${project.title} — https://archfacing.com/projects/${project.slug}`)}`

  return (
    <>
      <SiteHeader />

      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Projects', href: '/projects' },
          { label: m.categoryLabel, href: `/projects?category=${project.category}` },
          { label: project.title },
        ]}
      />

      <main className="bg-paper">
        <div className="container-af py-10">
          {/* ═══════════════════ hero ═══════════════════ */}
          <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* ─── pictures ─── */}
            <div className="min-w-0">
              <div className="relative aspect-video w-full overflow-hidden rounded-card bg-paper-3">
                <Image
                  src={photoSrc(heroImage, { w: 1200, h: 675 })}
                  alt={project.title}
                  fill
                  priority
                  sizes="(min-width:1024px) 700px, 100vw"
                  className="object-cover"
                />
                {/* Opens the full-size photograph in its own tab — the honest
                    equivalent of a lightbox without any script. */}
                <a
                  href={photoSrc(heroImage, { w: 2000 })}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="View this photograph full size"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-ink-2 shadow-card transition-colors hover:text-brand"
                >
                  <Glyph name="expand" className="h-4 w-4" />
                </a>
              </div>

              {/* ─── thumbnail rail ─── */}
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <ul className="flex min-w-0 flex-1 gap-3 overflow-x-auto">
                  {rail.map((t) => (
                    <li key={t.index} className="min-w-0 flex-1 basis-0">
                      <Link
                        href={t.index === 0 ? `/projects/${project.slug}` : `/projects/${project.slug}?photo=${t.index}`}
                        aria-label={`Show photograph ${t.index + 1}`}
                        aria-current={t.index === heroIndex ? 'true' : undefined}
                        className={[
                          'relative block aspect-video w-full min-w-[92px] overflow-hidden rounded-lg bg-paper-3 ring-2 transition-colors',
                          t.index === heroIndex ? 'ring-brand' : 'ring-transparent hover:ring-line',
                        ].join(' ')}
                      >
                        <Image
                          src={photoSrc(t.src, { w: 300, h: 170 })}
                          alt=""
                          fill
                          sizes="(min-width:1024px) 165px, 25vw"
                          className="object-cover"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/projects/${project.slug}?photo=${nextIndex}`}
                  aria-label="Next photograph"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-brand hover:text-brand"
                >
                  <Glyph name="chevronRight" className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* ─── the facts ─── */}
            <div className="flex min-w-0 flex-col">
              <span className="w-fit rounded-pill bg-brand px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white">
                {m.projectType}
              </span>

              <h1 className="mt-3.5 font-display text-[26px] font-bold leading-[1.15] tracking-tight text-ink md:text-[32px]">
                {project.title}
              </h1>

              <p className="mt-2.5 flex items-center gap-1.5 text-[13.5px] text-ink-3">
                <Glyph name="pin" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{placeLine(project.city, project.state)}</span>
              </p>

              <p className="mt-3.5 text-[14px] leading-relaxed text-ink-2">
                {project.description}
              </p>

              {/* ─── area / year / type ─── */}
              <ul className="mt-6 grid grid-cols-3 gap-3 rounded-card border border-line bg-paper-2 p-4">
                {strip.map((s) => (
                  <li key={s.label} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <Glyph name={s.icon} className="h-5 w-5 shrink-0 text-brand" />
                    <span className="text-[13px] font-bold leading-tight text-ink">{s.value}</span>
                    <span className="text-[11px] leading-tight text-ink-3">{s.label}</span>
                  </li>
                ))}
              </ul>

              {/* ─── project by ─── */}
              <section className="mt-5 rounded-card border border-line p-4">
                <p className="eyebrow mb-3">Project by</p>
                <div className="flex min-w-0 items-start gap-3.5">
                  <SellerMark initials={m.seller.initials} />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-display text-[15px] font-bold text-ink">
                        {m.seller.name}
                      </span>
                      {m.seller.verified && <VerifiedTick tone={sellerTone} />}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{m.seller.tagline}</p>
                    {m.seller.reviews > 0 ? (
                      <p className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Stars value={m.seller.rating} />
                        <span className="tabular text-[12px] font-semibold text-ink">
                          {m.seller.rating.toFixed(1)}
                        </span>
                        <span className="tabular text-[12px] text-ink-3">
                          ({m.seller.reviews} Review{m.seller.reviews === 1 ? '' : 's'})
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12px] text-ink-3">New seller · No reviews yet</p>
                    )}

                    {cert && (
                      <div className="mt-1.5">
                        <CertificateDialog data={cert} />
                      </div>
                    )}
                  </div>
                </div>

                {/*
                  There is no public per-professional profile page yet, so this
                  lands on the Designers & Associates directory. Point it at
                  the profile route the moment one exists.
                */}
                <Link href={sellerHref ?? "/designers-associates"} className="btn-outline mt-4 w-full py-2.5 text-[13px]">
                  View Seller Profile
                  <Glyph name="right" className="h-4 w-4" />
                </Link>
              </section>

              <div className="mt-5 flex min-w-0 flex-wrap gap-3">
                <Link
                  href={`/consult-nearby?pincode=${project.pincode ?? ''}`}
                  className="btn-dark min-w-0 flex-1 basis-[180px]"
                >
                  Get Best Price
                </Link>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-outline min-w-0 flex-1 basis-[140px]"
                >
                  <Glyph name="share" className="h-4 w-4" />
                  Share Project
                </a>
                <SaveButton
                  postId={project.id}
                  initialSaved={viewerSaved}
                  path={`/projects/${project.slug}`}
                  className="min-w-0 flex-1 basis-[120px] justify-center"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════ details + features ═══════════════════ */}
          <div className="mt-12 grid min-w-0 gap-8 lg:grid-cols-2">
            <section className="min-w-0">
              <SectionTitle>Project Details</SectionTitle>
              {m.detailBody && (
                <p className="text-[14px] leading-[1.8] text-ink-2">{m.detailBody}</p>
              )}

              <dl className="mt-5 overflow-hidden rounded-card border border-line">
                {detailRows.map((r, i) => (
                  <div
                    key={r.label}
                    className={[
                      'flex min-w-0 flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-[13px]',
                      i % 2 === 1 ? 'bg-paper-3' : 'bg-paper-2',
                    ].join(' ')}
                  >
                    <dt className="w-[130px] shrink-0 font-semibold text-ink-3">{r.label}</dt>
                    <dd className="min-w-0 flex-1 font-semibold text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="min-w-0">
              <SectionTitle>Key Features</SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2">
                {m.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex min-w-0 items-center gap-3 rounded-card border border-line bg-paper-2 px-3.5 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-soft text-brand">
                      <Glyph name={f.icon} />
                    </span>
                    <span className="min-w-0 text-[12.5px] font-semibold leading-snug text-ink-2">
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ═══════════════════ gallery ═══════════════════ */}
          <section className="mt-12 min-w-0">
            <SectionTitle
              action={
                // Anchors at the sixth picture — the start of the second half —
                // which is what scrolls the rail. No script.
                <a
                  href="#gallery-second-half"
                  aria-label="Show more gallery photographs"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-brand hover:text-brand"
                >
                  <Glyph name="chevronRight" className="h-4 w-4" />
                </a>
              }
            >
              Project Gallery
            </SectionTitle>

            {/* Two rows on every size. On a phone the rows scroll sideways
                inside this container rather than widening the page. */}
            <div className="-mx-[15px] overflow-x-auto px-[15px] pb-2">
              <ul className="grid grid-flow-col grid-rows-2 gap-4" style={{ gridAutoColumns: 'minmax(150px, 1fr)' }}>
                {photos.gallery.slice(0, 10).map((g, i) => (
                  <li key={`${g}-${i}`} id={i === 5 ? 'gallery-second-half' : undefined} className="min-w-0 scroll-mx-4">
                    <Link
                      href={i === 0 ? `/projects/${project.slug}` : `/projects/${project.slug}?photo=${i}`}
                      aria-label={`Show photograph ${i + 1} at the top of the page`}
                      className="relative block aspect-[4/3] w-full overflow-hidden rounded-card bg-paper-3 ring-2 ring-transparent transition-colors hover:ring-brand"
                    >
                      <Image
                        src={photoSrc(g, { w: 500, h: 375 })}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 230px, 45vw"
                        className="object-cover"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ═══════════════════ related ═══════════════════ */}
          {related.length > 0 && (
            <section className="mt-12 min-w-0">
              <SectionTitle
                action={
                  <span className="flex items-center gap-2">
                    <a
                      href="#related-first"
                      aria-label="Back to the first related project"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-brand hover:text-brand"
                    >
                      <Glyph name="chevronLeft" className="h-4 w-4" />
                    </a>
                    <a
                      href="#related-last"
                      aria-label="On to the last related project"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-brand hover:text-brand"
                    >
                      <Glyph name="chevronRight" className="h-4 w-4" />
                    </a>
                  </span>
                }
              >
                Related Projects
              </SectionTitle>

              <div className="-mx-[15px] overflow-x-auto px-[15px] pb-2">
                <ul className="grid grid-flow-col gap-4" style={{ gridAutoColumns: 'minmax(230px, 1fr)' }}>
                  {related.map((r, i) => (
                    <li
                      key={r.slug}
                      id={i === 0 ? 'related-first' : i === related.length - 1 ? 'related-last' : undefined}
                      className="min-w-0 scroll-mx-4"
                    >
                      <ProjectCard post={r} sizes="(min-width:1024px) 240px, 70vw" />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ═══════════════════ testimonials + seller ═══════════════════ */}
          <div className="mt-12 grid min-w-0 gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="min-w-0">
              <SectionTitle>What Clients Say</SectionTitle>
              {testimonials.length === 0 && (
                <p className="card p-5 text-[13px] text-ink-3">No client reviews on this project yet.</p>
              )}
              <ul className="grid gap-4 sm:grid-cols-3">
                {testimonials.map((t) => (
                  <li key={t.key} className="card flex min-w-0 flex-col p-5">
                    <Stars value={t.stars} />
                    <Glyph name="quote" className="mt-3 h-5 w-5 shrink-0 text-brand-border" />
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">
                      “{t.quote}”
                    </p>
                    <p className="mt-4 border-t border-line-soft pt-3">
                      <span className="block truncate text-[13px] font-bold text-ink">{t.name}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{t.city}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="min-w-0">
              <SectionTitle>About the Seller</SectionTitle>
              <div className="card min-w-0 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card bg-paper-3">
                    {m.seller.photo ? (
                      <Image
                        src={photoSrc(m.seller.photo, { w: 160, h: 160 })}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <SellerMark initials={m.seller.initials} className="h-16 w-16 rounded-card" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-display text-[15.5px] font-bold text-ink">
                        {m.seller.name}
                      </span>
                      {m.seller.verified && <VerifiedTick tone={sellerTone} />}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{m.seller.tagline}</p>
                    {m.seller.reviews > 0 ? (
                      <p className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Stars value={m.seller.rating} />
                        <span className="tabular text-[12px] text-ink-3">
                          {m.seller.rating.toFixed(1)} ({m.seller.reviews} Review{m.seller.reviews === 1 ? '' : 's'})
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12px] text-ink-3">New seller · No reviews yet</p>
                    )}
                  </div>
                </div>

                {project.author.professionalProfile?.bio && (
                  <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
                    {project.author.professionalProfile.bio}
                  </p>
                )}

                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line-soft pt-3.5 text-[12px] text-ink-3">
                  <li className="flex items-center gap-1.5">
                    <Glyph name="pin" className="h-3.5 w-3.5" />
                    {placeLine(project.author.city, project.author.state) || placeLine(project.city, project.state)}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Glyph name="eye" className="h-3.5 w-3.5" />
                    {compactCount(project.viewCount)} views
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Glyph name="heart" className="h-3.5 w-3.5" />
                    {compactCount(project._count.savedBy)} saves
                  </li>
                </ul>

                <Link href={sellerHref ?? "/designers-associates"} className="btn-outline mt-4 w-full py-2.5 text-[13px]">
                  View Seller Profile
                  <Glyph name="right" className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>

          {/* ═══════════════════ brands ═══════════════════ */}
          <section className="mt-12 min-w-0">
            <SectionTitle>Trusted by Leading Brands</SectionTitle>
            <BrandStrip />
          </section>

          {/* ═══════════════════ trust strip ═══════════════════ */}
          <section className="mt-8 min-w-0">
            <TrustStrip />
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
