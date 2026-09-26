import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { photoSrc } from '@/components/blog'
import { PlayGlyph, WaveBars } from '@/components/podcast'
import { SaveToggle } from '@/components/save-button'
import { HeroPlayer } from '@/app/(public)/podcast/hero-player'
import { compactCount, episodeMeta, postDate, type EpisodeRow } from '@/lib/content'
import { aroundUsMeta, type AroundUsRow } from '@/lib/around-us'
import { PhoneEventsCard, PhoneSectionHead, type PhoneEvent } from './content-phone-parts'

/**
 * `/podcast` below `md` — the PWA layout from the client's phone reference.
 *
 * Server Component. Topics are the ones the page's `?topic=` filter reads,
 * episodes are real PODCAST posts (duration, number, date and the real view
 * counter from `Post.viewCount`), the player is the desktop's HeroPlayer,
 * "Listen On" lists only YouTube — the one platform the episodes actually
 * live on — and Trending / Events are real rows or nothing.
 */

const MIC =
  'https://ik.imagekit.io/archfacing/mick.png?updatedAt=1784604523029'

/** A tint per topic chip, cycling the semantic tokens. */
const TOPIC_TONE = [
  'bg-brand-soft text-brand',
  'bg-ok-soft text-ok',
  'bg-info-soft text-info',
  'bg-warn-soft text-warn',
  'bg-pact-soft text-pact',
  'bg-danger-soft text-danger',
]

function Bookmark({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  )
}

const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'users', title: 'Expert Conversations', body: 'Insights from industry leaders and visionaries.' },
  { icon: 'building', title: 'Real Experiences', body: 'Stories, lessons and real world experiences.' },
  { icon: 'bolt', title: 'Actionable Insights', body: 'Practical ideas you can apply in your work.' },
]

export function PodcastPhone({
  topics,
  topic,
  q,
  hero,
  episodes,
  total,
  loadMoreHref,
  allHref,
  topicHref,
  savedIds,
  youtubeHref,
  trending,
  events,
  signedIn,
  joinHref,
}: {
  topics: { slug: string; label: string; icon: string }[]
  topic?: string
  q?: string
  hero: { embedUrl: string; poster: string; title: string; duration: string; slug: string } | null
  episodes: EpisodeRow[]
  total: number
  loadMoreHref: string | null
  allHref: string
  topicHref: (slug?: string) => string
  savedIds: Set<string>
  youtubeHref: string | null
  trending: AroundUsRow[]
  events: PhoneEvent[]
  signedIn: boolean
  joinHref: string
}) {
  const toneFor = (slug: string) => TOPIC_TONE[Math.max(0, topics.findIndex((t) => t.slug === slug)) % TOPIC_TONE.length]

  return (
    <main className="bg-paper pb-6">
      <div className="flex flex-col gap-5 px-4 pt-2">
        {/* ═════════ hero: title + video card ═════════ */}
        <section>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/" className="py-1">Home</Link>
            <span aria-hidden>›</span>
            <span aria-current="page" className="text-ink-2">Podcast</span>
          </nav>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_38%] items-start gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-[21px] font-bold leading-[1.2] tracking-tight text-ink">
                Architecture Insights. Conversations that <span className="text-brand">Inspire.</span>
              </h1>
              <p className="mt-2.5 text-[11.5px] leading-[1.6] text-ink-2">
                Join our founder &amp; industry experts as they share knowledge, experiences and ideas
                shaping the future of architecture, design and construction.
              </p>
            </div>
            {hero && (
              <a
                href="#podcast-player"
                aria-label={`Watch — ${hero.title}`}
                className="relative block aspect-[4/5] overflow-hidden rounded-card bg-admin-bg shadow-lift"
              >
                <Image src={photoSrc(hero.poster, { w: 400, h: 500 })} alt="" fill priority sizes="40vw" className="object-cover" />
                <span className="absolute inset-0 bg-black/15" />
                <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/20">
                  <PlayGlyph className="ml-0.5 h-5 w-5 text-white" />
                </span>
              </a>
            )}
          </div>

          <ul className="mt-5 grid grid-cols-3">
            {BENEFITS.map((b, i) => (
              <li key={b.title} className={`flex min-w-0 flex-col items-center px-1.5 text-center ${i > 0 ? 'border-l border-line' : ''}`}>
                <Icon name={b.icon} className="h-7 w-7 text-brand" />
                <p className="mt-2 text-[12px] font-bold leading-tight text-ink">{b.title}</p>
                <p className="mt-1 text-[10.5px] leading-snug text-ink-3">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ explore podcast topics ═════════ */}
        <section className="rounded-card border border-line bg-white px-3 py-3.5 shadow-card">
          <PhoneSectionHead title="Explore Podcast Topics" href={allHref} className="px-1" />
          <ul className="mt-1.5 grid grid-cols-3 gap-2">
            {topics.map((t) => {
              const on = t.slug === topic
              return (
                <li key={t.slug} className="min-w-0">
                  <Link
                    href={topicHref(on ? undefined : t.slug)}
                    aria-current={on ? 'true' : undefined}
                    className={`flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border px-1.5 py-2.5 text-center ${
                      on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink'
                    }`}
                  >
                    <Icon name={t.icon as IconName} className={`h-6 w-6 ${on ? 'text-brand' : 'text-ink-2'}`} />
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{t.label}</span>
                  </Link>
                </li>
              )
            })}
            <li className="min-w-0">
              <Link
                href={topicHref(undefined)}
                aria-current={!topic ? 'true' : undefined}
                className={`flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border px-1.5 py-2.5 text-center ${
                  !topic ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink'
                }`}
              >
                <Icon name="grid" className={`h-6 w-6 ${!topic ? 'text-brand' : 'text-ink-2'}`} />
                <span className="text-[11px] font-semibold leading-tight">All Topics</span>
              </Link>
            </li>
          </ul>
        </section>

        {/* ═════════ latest episodes ═════════ */}
        <section>
          <PhoneSectionHead
            title={q ? `Episodes matching “${q}”` : 'Latest Episodes'}
            href={q ? '/podcast' : allHref}
            action={q ? 'Clear' : 'View All Episodes'}
          />
          {episodes.length === 0 ? (
            <p className="rounded-card border border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
              No episodes {q ? 'match that search' : 'in this topic'} yet.
            </p>
          ) : (
            <ul className="mt-1 flex flex-col gap-2.5">
              {episodes.map((e) => {
                const m = episodeMeta(e.meta)
                return (
                  <li key={e.id} className="flex min-w-0 items-stretch gap-3 rounded-card border border-line bg-white p-2 shadow-card">
                    <Link href={`/podcast/${e.slug}`} className="relative block aspect-[4/3] w-[36%] shrink-0 overflow-hidden rounded-lg bg-admin-bg">
                      <Image src={photoSrc(e.media[0]?.thumbnailUrl || m.thumbImage, { w: 300, h: 225 })} alt="" fill sizes="36vw" className="object-cover" />
                      <span className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink">
                        <PlayGlyph className="ml-0.5 h-3 w-3" />
                      </span>
                      <span className="tabular absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                        {m.duration}
                      </span>
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col py-0.5">
                      <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-ink-3">
                        <span className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${toneFor(e.category)}`}>
                          {m.topicLabel}
                        </span>
                        {m.episodeNumber > 0 && <span className="shrink-0">· Ep. {m.episodeNumber}</span>}
                      </div>
                      <Link href={`/podcast/${e.slug}`} className="mt-1 line-clamp-2 font-display text-[13px] font-bold leading-snug text-ink">
                        {e.title}
                      </Link>
                      <div className="mt-auto flex items-center gap-1.5 pt-1 text-[10.5px] text-ink-3">
                        <Icon name="clock" className="h-3 w-3 shrink-0" />
                        <span className="truncate">{postDate(e.publishedAt)}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular shrink-0">{compactCount(e.viewCount)} Views</span>
                        <SaveToggle
                          postId={e.id}
                          initialSaved={savedIds.has(e.id)}
                          path="/podcast"
                          noun="episode"
                          icon={<Bookmark />}
                          savedIcon={<Bookmark filled />}
                          className="-my-2 -mr-1 ml-auto flex h-9 w-9 shrink-0 items-center justify-center text-ink-2"
                          savedClassName="text-brand"
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {loadMoreHref && (
            <div className="mt-3.5 flex justify-center">
              <Link href={loadMoreHref} scroll={false} className="btn-outline border-brand-border text-[12.5px] text-brand">
                Load More Episodes
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-3.2-6.9M21 3v5h-5" />
                </svg>
              </Link>
            </div>
          )}
          {total > 0 && !loadMoreHref && episodes.length > 0 && (
            <p className="mt-2 text-center text-[11px] text-ink-4">
              {total} episode{total === 1 ? '' : 's'}
            </p>
          )}
        </section>

        {/* ═════════ player ═════════ */}
        {hero && (
          <section id="podcast-player" className="scroll-mt-4 [&>div]:rounded-card">
            <HeroPlayer embedUrl={hero.embedUrl} poster={hero.poster} title={hero.title} duration={hero.duration} />
          </section>
        )}

        {/* ═════════ about ═════════ */}
        <section className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">About Our Podcast</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            Our podcast brings meaningful conversations with architects, designers, consultants and
            industry experts. We discuss ideas, challenges, trends and innovations shaping the built
            environment.
          </p>
          <Link href="/legal/about" className="btn-outline mt-3.5 w-fit border-brand-border text-[12.5px] text-brand">
            Know More About Podcast
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* ═════════ listen on — only where the episodes really are ═════════ */}
        {youtubeHref && (
          <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Listen On</h2>
            <div className="mt-2.5 flex items-center gap-2.5">
              <a
                href={youtubeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[40px] flex-1 items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-ink"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-danger text-white">
                  <PlayGlyph className="ml-px h-3 w-3" />
                </span>
                YouTube
              </a>
              <Link href={allHref} className="btn-outline min-h-[40px] shrink-0 border-brand-border text-[12px] text-brand">
                All Episodes
              </Link>
            </div>
          </section>
        )}

        {/* ═════════ trending updates (real Around Us) ═════════ */}
        {trending.length > 0 && (
          <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
            <PhoneSectionHead
              title="Trending Updates"
              href="/around-us?sort=popular"
              icon={
                <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] text-brand" fill="currentColor">
                  <path d="M12 2c1 3.5 5 6 5 11a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6.5 1-9.5z" />
                </svg>
              }
            />
            <ul className="mt-1.5 flex flex-col gap-3">
              {trending.map((p) => {
                const m = aroundUsMeta(p.meta, p)
                const cover = m.image || p.media[0]?.url || ''
                return (
                  <li key={p.id}>
                    <Link href={`/around-us/${p.slug}`} className="flex min-w-0 items-center gap-3">
                      <span className="relative h-[50px] w-[64px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
                        {cover && <Image src={photoSrc(cover, { w: 160, h: 120 })} alt="" fill sizes="64px" className="object-cover" unoptimized={cover.includes('imagekit')} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">{p.title}</span>
                        <span className="mt-1 block text-[10.5px] text-ink-3">{compactCount(p.viewCount)} Views</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link href="/around-us" className="mt-3 flex items-center justify-center gap-1.5 py-1 text-[12.5px] font-semibold text-brand">
              View All Updates
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* ═════════ upcoming events (real only) ═════════ */}
        <PhoneEventsCard events={events} />

        {/* ═════════ community + questions ═════════ */}
        <div className="grid grid-cols-2 gap-2.5">
          <section className="flex flex-col items-center rounded-card border border-brand-border bg-brand-soft px-3 py-4 text-center">
            <Icon name="users" className="h-8 w-8 text-brand" />
            <h2 className="mt-2 text-[13px] font-bold text-ink">Join the Community</h2>
            <p className="mt-1 text-[11px] leading-snug text-ink-2">
              Be a part of India’s architecture and design community.
            </p>
            <Link href={joinHref} className="btn-primary mt-3 w-full justify-center px-2 text-[12px]">
              {signedIn ? 'Go to Dashboard' : 'Create Account'}
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </section>
          <section className="flex flex-col rounded-card border border-line bg-paper-2 px-3 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-info-soft font-display text-[17px] font-bold text-info">
              ?
            </span>
            <h2 className="mt-2 text-[13px] font-bold text-ink">Submit Your Questions</h2>
            <p className="mt-1 text-[11px] leading-snug text-ink-2">
              Have a question for our next episode? We would love to hear from you.
            </p>
            <Link href="/legal/contact" className="btn-outline mt-auto w-full justify-center bg-white px-2 text-[12px]">
              Ask Your Question
            </Link>
          </section>
        </div>

        {/* ═════════ be our next guest ═════════ */}
        <section className="relative overflow-hidden rounded-card bg-admin-bg px-4 py-4">
          <WaveBars className="absolute right-3 top-3 text-white/10" />
          <div className="relative flex items-center gap-3">
            <Image src={MIC} alt="" aria-hidden width={80} height={80} className="h-24 w-20 shrink-0 scale-125 object-contain" />
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-bold leading-tight text-white">
                Do you want to be our next guest?
              </h2>
              <p className="mt-1 text-[11px] leading-snug text-white/75">
                Share your expertise and inspire architects, designers and industry professionals.
              </p>
              <Link href="/legal/contact" className="btn-primary mt-2.5 px-3 py-1.5 text-[12px]">
                Become a Guest
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
