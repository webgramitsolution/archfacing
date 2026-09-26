import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sellerHrefFor } from '@/lib/seller'
import { auth } from '@/lib/auth'
import { PostChatButton } from '@/components/post-chat-button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { Icon, type IconName } from '@/components/ui'
import { ShareRow, VerifiedTick, photoSrc } from '@/components/blog'
import { AroundUsCard, CategoryBadge, shortDate, compact, poster } from '@/components/around-us'
import { aroundUsMeta, entryStatus, getAroundUs, listAroundUs } from '@/lib/around-us'

/**
 * §5.2.4 — a single Around Us posting.
 *
 * The design is an event page: a hero with the headline facts over the
 * photograph, a tab bar, then the sections an entrant reads in order — about,
 * theme, highlights, timeline, who can take part, the panel, and how to ask a
 * question.
 *
 * ⚠️ Every section below is conditional. A social-welfare post has no jury and
 *    no prize money; a company milestone has no timeline. Those blocks are
 *    dropped rather than drawn empty, so one template serves a competition and
 *    a news item without either looking unfinished.
 *
 * The tabs are anchors, not JavaScript. The page stays one scroll, every
 * section is linkable, and the row still works with scripting off.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

const STATUS_TONE: Record<string, string> = {
  open: 'bg-ok text-white',
  closed: 'bg-ink-3 text-white',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getAroundUs(slug)
  if (!post) return { title: 'Not found' }

  const m = aroundUsMeta(post.meta, post)
  const description = (m.seoDescription || post.description).slice(0, 155)

  return {
    title: m.seoTitle || post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      images: m.image ? [{ url: photoSrc(m.image, { w: 1200, h: 675 }) }] : undefined,
    },
  }
}

export default async function AroundUsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getAroundUs(slug)
  if (!post) notFound()

  const m = aroundUsMeta(post.meta, post)
  const by = poster(post)

  // The author's own storefront — `/<sellerSlug>` — when they trade under a
  // name. Null for an account with no brand, and the button then keeps its
  // old destination rather than pointing at a page that does not exist.
  const sellerHref = await sellerHrefFor(post.author.id)
  const session = await auth()
  const status = entryStatus(m)
  const cover = m.image || post.media[0]?.url || ''
  const url = `${SITE_URL.replace(/\/$/, '')}/around-us/${post.slug}`

  const related = await listAroundUs({
    category: post.category,
    take: 3,
    excludeSlug: slug,
  })

  /** The four cells over the photograph. Only the ones with a value show. */
  const heroFacts = [
    m.prizeMoney > 0 && {
      icon: 'award' as IconName,
      label: 'Prize Money',
      value: `₹ ${m.prizeMoney.toLocaleString('en-IN')}`,
    },
    m.registrationEnds && {
      icon: 'calendar' as IconName,
      label: 'Registration Ends',
      value: shortDate(m.registrationEnds),
    },
    m.submissionEnds && {
      icon: 'clock' as IconName,
      label: 'Submission Ends',
      value: shortDate(m.submissionEnds),
    },
    m.attendeeCount > 0 && {
      icon: 'users' as IconName,
      label: 'Participants',
      value: `${compact(m.attendeeCount)}+`,
    },
  ].filter(Boolean) as { icon: IconName; label: string; value: string }[]

  /** The strip under "About". */
  const meta4 = [
    m.categoryLabel && { icon: 'tag' as IconName, label: 'Category', value: m.categoryLabel },
    m.entryType && { icon: 'grid' as IconName, label: 'Type', value: m.entryType },
    m.eligibility && { icon: 'users' as IconName, label: 'Eligibility', value: m.eligibility },
    m.pactArea && { icon: 'map' as IconName, label: 'PACT Area', value: m.pactArea },
  ].filter(Boolean) as { icon: IconName; label: string; value: string }[]

  /** The tab row — only the sections this post actually has. */
  const tabs = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'details', label: 'Details', show: meta4.length > 0 || !!m.theme.title },
    { id: 'timeline', label: 'Timeline', show: m.timeline.length > 0 },
    { id: 'guidelines', label: 'Guidelines', show: m.participants.length > 0 },
    { id: 'prizes', label: 'Prizes', show: m.highlights.length > 0 },
    { id: 'contact', label: 'Contact', show: true },
  ].filter((t) => t.show)

  const importantDates = [
    m.eventDate && { label: 'Event Date', value: shortDate(m.eventDate) },
    m.registrationEnds && { label: 'Registration Ends', value: shortDate(m.registrationEnds) },
    m.submissionEnds && { label: 'Submission Ends', value: shortDate(m.submissionEnds) },
    m.resultsOn && { label: 'Results Announced', value: shortDate(m.resultsOn) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <>
      <SiteHeader />

      <Breadcrumb
        visible
        items={[
          homeCrumb(),
          { label: 'Around Us', href: '/around-us' },
          {
            // the specific filing, not the parent — "Designers Awards" tells a
            // reader more about where they are than "New Development" does
            label: m.subCategoryLabel || m.categoryLabel || post.category,
            href: '/around-us',
          },
          { label: post.title },
        ]}
      />

      <main className="bg-paper">
        <div className="container-af pb-0 pt-3">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            {/* ═══════════════════ the post ═══════════════════ */}
            <article className="min-w-0">
              {/* ─── hero ─── */}
              <section className="relative overflow-hidden rounded-card bg-navy">
                <span className="relative block aspect-[16/9] w-full">
                  {cover && (
                    <Image
                      src={photoSrc(cover, { w: 1200, h: 675 })}
                      alt=""
                      fill
                      priority
                      sizes="(min-width:1024px) 760px, 100vw"
                      className="object-cover"
                    />
                  )}
                  {/* bottom-up scrim, so the headline always reads */}
                  <span className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/10" />
                </span>

                <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-7">
                  <div className="flex items-start justify-between gap-3">
                    {status && (
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] ${STATUS_TONE[status]}`}
                      >
                        {status === 'open' ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                    <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-paper/90 text-ink-2">
                      <Icon name="file" className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight text-white md:text-[30px]">
                      {post.title}
                    </h1>

                    <span className="mt-3 flex min-w-0 items-center gap-2.5">
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/15">
                        {by.logo && (
                          <Image src={photoSrc(by.logo, { w: 96, h: 96 })} alt="" fill sizes="32px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10.5px] text-white/55">Organized by:</span>
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-[13px] font-bold text-white">
                            {m.organiser.name || by.name}
                          </span>
                          {by.verified && <VerifiedTick className="h-3.5 w-3.5" tone={by.tone} />}
                        </span>
                      </span>
                    </span>

                    {heroFacts.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-3.5">
                        {heroFacts.map((f) => (
                          <li key={f.label} className="flex min-w-0 items-start gap-2">
                            <Icon name={f.icon} className="mt-px h-4 w-4 shrink-0 text-white/45" />
                            <span className="min-w-0">
                              <span className="block text-[10.5px] leading-tight text-white/55">
                                {f.label}
                              </span>
                              <span className="tabular mt-px block whitespace-nowrap text-[13px] font-bold leading-tight text-white">
                                {f.value}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              {/* ─── tabs ─── */}
              <nav
                aria-label="Sections"
                className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-3"
              >
                {tabs.map((t, i) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    className={
                      i === 0
                        ? 'border-b-2 border-brand pb-2 text-[13px] font-bold text-brand'
                        : 'pb-2 text-[13px] font-medium text-ink-3 transition-colors hover:text-brand'
                    }
                  >
                    {t.label}
                  </a>
                ))}

                <span className="ml-auto flex items-center gap-2">
                  <a href="#share-this-update" className="btn-outline px-3.5 py-2 text-[12.5px]">
                    <Icon name="arrow" className="h-4 w-4" />
                    Share
                  </a>
                  {m.registerUrl ? (
                    <a
                      href={m.registerUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-primary px-4 py-2 text-[12.5px]"
                    >
                      Register Now
                    </a>
                  ) : (
                    <span className="inline-flex">
                      <PostChatButton
                        postId={post.id}
                        signedIn={!!session?.user?.id}
                        returnTo={`/around-us/${post.slug}`}
                        label="Enquire"
                        intent="enquiry"
                        variant="primary"
                        className="px-4 py-2 text-[12.5px]"
                      />
                    </span>
                  )}
                </span>
              </nav>

              {/* ─── about ─── */}
              <section id="overview" className="card mt-5 scroll-mt-28 bg-paper p-5 md:p-6">
                <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                  About this Update
                </h2>

                <div className="mt-3.5 flex flex-col gap-3.5">
                  {(m.about.length > 0 ? m.about : [post.description]).map((p, i) => (
                    <p key={i} className="text-[13.5px] leading-[1.8] text-ink-2">{p}</p>
                  ))}
                </div>

                {meta4.length > 0 && (
                  <ul
                    id="details"
                    className="mt-6 grid scroll-mt-28 gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {meta4.map((f) => (
                      <li key={f.label} className="flex min-w-0 items-start gap-2.5">
                        <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                        <span className="min-w-0">
                          <span className="block text-[11px] text-ink-3">{f.label}</span>
                          <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-ink">
                            {f.value}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ─── theme ─── */}
              {m.theme.title && (
                <section className="card mt-5 bg-paper p-5 md:p-6">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">Theme</h2>
                  <div className="mt-3.5 flex min-w-0 items-start gap-4">
                    <span className="chip-icon h-11 w-11 shrink-0 bg-brand-soft text-brand">
                      <Icon name="leaf" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-bold text-ink">
                        &ldquo;{m.theme.title}&rdquo;
                      </p>
                      {m.theme.note && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{m.theme.note}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ─── highlights ─── */}
              {m.highlights.length > 0 && (
                <section id="prizes" className="card mt-5 scroll-mt-28 bg-paper p-5 md:p-6">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                    Highlights
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {m.highlights.map((h) => (
                      <li
                        key={h.title}
                        className="flex min-w-0 items-start gap-2.5 rounded-card border border-brand-border bg-brand-soft p-3.5"
                      >
                        <span className="chip-icon h-9 w-9 shrink-0 border border-brand-border bg-paper text-brand">
                          <Icon name={(h.icon as IconName) ?? 'star'} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-bold leading-snug text-ink">
                            {h.title}
                          </span>
                          {h.note && (
                            <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                              {h.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ─── timeline ─── */}
              {m.timeline.length > 0 && (
                <section id="timeline" className="card mt-5 scroll-mt-28 bg-paper p-5 md:p-6">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                    Timeline
                  </h2>
                  <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {m.timeline.map((t, i) => (
                      <li key={`${t.date}-${i}`} className="relative min-w-0">
                        {/* the rail between the dots, drawn behind them */}
                        {i < m.timeline.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute left-[13px] top-[13px] hidden h-px w-full bg-line sm:block"
                          />
                        )}
                        <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ok text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="tabular mt-2.5 text-[12.5px] font-bold text-ink">{t.date}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{t.label}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* ─── who can participate ─── */}
              {m.participants.length > 0 && (
                <section id="guidelines" className="card mt-5 scroll-mt-28 bg-paper p-5 md:p-6">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                    Who Can Participate?
                  </h2>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {m.participants.map((p) => (
                      <li key={p} className="flex min-w-0 items-start gap-2 text-[12.5px] text-ink-2">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                        <span className="min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ─── jury ─── */}
              {m.jury.length > 0 && (
                <section className="card mt-5 bg-paper p-5 md:p-6">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                    Jury Panel
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {m.jury.map((p) => (
                      <li
                        key={p.name}
                        className="flex min-w-0 items-center gap-2.5 rounded-card border border-line p-3"
                      >
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-paper-3">
                          {p.photo && (
                            <Image src={photoSrc(p.photo, { w: 120, h: 120 })} alt="" fill sizes="40px" className="object-cover" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-bold text-ink">{p.name}</span>
                          <span className="block truncate text-[11px] text-ink-3">{p.role}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ─── questions ─── */}
              <section id="contact" className="card mt-5 scroll-mt-28 bg-paper p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div className="min-w-0">
                    <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                      Still Have Questions?
                    </h2>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      Our support team is here to help you with any queries.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {/* Opens a real conversation with whoever posted this;
                          it lands in both sides' Messages screen. */}
                      <span className="inline-flex">
                        <PostChatButton
                          postId={post.id}
                          signedIn={!!session?.user?.id}
                          returnTo={`/around-us/${post.slug}`}
                          label="Contact Organizer"
                          className="w-auto px-4 py-2 text-[12.5px]"
                        />
                      </span>
                      <Link href="/legal/need-help" className="btn-outline px-4 py-2 text-[12.5px]">
                        FAQ
                      </Link>
                    </div>
                  </div>
                  <span className="chip-icon h-16 w-16 shrink-0 bg-brand-soft text-brand">
                    <Icon name="help" className="h-7 w-7" />
                  </span>
                </div>
              </section>
            </article>

            {/* ═══════════════════ the rail ═══════════════════ */}
            <aside className="min-w-0">
              <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[116px]">
                {/* organiser */}
                <section className="card bg-paper p-5">
                  <h2 className="font-display text-[13px] font-bold text-ink">Organized By</h2>
                  <div className="mt-3.5 flex min-w-0 items-start gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-paper-3">
                      {(m.organiser.logo || by.logo) && (
                        <Image
                          src={photoSrc(m.organiser.logo || by.logo, { w: 120, h: 120 })}
                          alt="" fill sizes="44px" className="object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate text-[13px] font-bold text-ink">
                          {m.organiser.name || by.name}
                        </span>
                        {by.verified && <VerifiedTick className="h-3.5 w-3.5" tone={by.tone} />}
                      </span>
                      {(m.organiser.location || post.city) && (
                        <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                          {m.organiser.location || [post.city, post.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </span>
                  </div>
                  <Link
                    href={sellerHref ?? "/designers-associates"}
                    className="mt-3.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:gap-1.5"
                  >
                    View Organizer Profile
                    <Icon name="arrow" className="h-3 w-3 transition-all" />
                  </Link>
                </section>

                {/* dates */}
                {importantDates.length > 0 && (
                  <section className="card bg-paper p-5">
                    <h2 className="font-display text-[13px] font-bold text-ink">Important Dates</h2>
                    <ul className="mt-3 flex flex-col">
                      {importantDates.map((d) => (
                        <li
                          key={d.label}
                          className="flex min-w-0 items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-3">
                            <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{d.label}</span>
                          </span>
                          <span className="tabular shrink-0 text-[12px] font-semibold text-ink">
                            {d.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* key points */}
                {m.keyPoints.length > 0 && (
                  <section className="card bg-paper p-5">
                    <h2 className="font-display text-[13px] font-bold text-ink">Key Highlights</h2>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {m.keyPoints.map((k) => (
                        <li key={k} className="flex min-w-0 items-start gap-2 text-[12px] leading-snug text-ink-2">
                          <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          <span className="min-w-0">{k}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* downloads */}
                {m.documents.length > 0 && (
                  <section className="card bg-paper p-5">
                    <h2 className="font-display text-[13px] font-bold text-ink">Downloads</h2>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {m.documents.map((d) => (
                        <li key={d.url}>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex min-w-0 items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-brand"
                          >
                            <Icon name="file" className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                            <span className="min-w-0 flex-1 truncate">{d.label}</span>
                            <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 rotate-90" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* organise your own */}
                <section className="rounded-card border border-brand-border bg-brand-soft p-5">
                  <h2 className="font-display text-[14px] font-bold leading-snug text-ink">
                    Want to Organize a Design Competition?
                  </h2>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                    Reach thousands of designers and get the best ideas for your next big project.
                  </p>
                  <Link href="/legal/contact" className="btn-primary mt-3.5 w-full">
                    Contact Us
                  </Link>
                </section>

                {/* related */}
                {related.length > 0 && (
                  <section className="card bg-paper p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-[13px] font-bold text-ink">You May Also Like</h2>
                      <Link href="/around-us" className="text-[11.5px] font-semibold text-brand hover:underline">
                        View All
                      </Link>
                    </div>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {related.map((r) => {
                        const rm = aroundUsMeta(r.meta, r)
                        const rc = rm.image || r.media[0]?.url || ''
                        return (
                          <li key={r.slug}>
                            <Link href={`/around-us/${r.slug}`} className="group flex min-w-0 items-start gap-2.5">
                              <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                                {rc && (
                                  <Image src={photoSrc(rc, { w: 160, h: 120 })} alt="" fill sizes="64px" className="object-cover" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
                                  {r.title}
                                </span>
                                {rm.eventDate && (
                                  <span className="mt-1 block text-[10.5px] text-ink-4">
                                    {shortDate(rm.eventDate)}
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

                {/* share */}
                <section id="share-this-update" className="card scroll-mt-28 bg-paper p-5">
                  <h2 className="font-display text-[13px] font-bold text-ink">Share this Update</h2>
                  <div className="mt-3.5">
                    <ShareRow url={url} title={post.title} compact />
                  </div>
                </section>
              </div>
            </aside>
          </div>

          {/* ═══════════════════ more like this ═══════════════════ */}
          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">
                More from {m.categoryLabel || 'Around Us'}
              </h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <li key={`grid-${r.slug}`} className="min-w-0">
                    <AroundUsCard post={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
