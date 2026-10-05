import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { EmptyState, Icon, SectionHead, type IconName } from '@/components/ui'
import { EpisodeCard, PopularRow, WaveBars } from '@/components/podcast'
import { HeroPlayer } from './hero-player'
import { PODCAST_TOPICS } from '@/config/content-media'
import {
  countEpisodes, episodeCounts, episodeMeta, listEpisodes,
} from '@/lib/content'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'
import { trendingAroundUs } from '@/lib/around-us'
import { PodcastPhone } from '@/components/mobile/pages/podcast-phone'
import { loadPhoneEvents } from '@/components/mobile/pages/content-phone-parts'

export const metadata: Metadata = {
  title: 'Podcast — Architecture Insights, Conversations that Inspire',
  description:
    'Conversations with architects, designers, consultants and industry experts on ' +
    'the ideas, challenges and innovations shaping the built environment in India.',
}

// ═══════════════════════════════════════════════════════════
//  Static copy from the design
// ═══════════════════════════════════════════════════════════

const HERO_FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'users',
    title: 'Expert Conversations',
    body: 'Insights from industry leaders and visionaries.',
  },
  {
    icon: 'star',
    title: 'Real Experiences',
    body: 'Stories, lessons and real world experiences.',
  },
  {
    icon: 'chart',
    title: 'Actionable Insights',
    body: 'Practical ideas you can apply in your work.',
  },
]

/** How many episodes a page shows, and how many more "Load More" adds. */
const PAGE = 6
/** The ceiling `?take=` is clamped to — also what "View All" jumps straight to. */
const ALL = 60

/** Builds a /podcast link, dropping any param that is empty or at its default. */
function podcastHref({ topic, take }: { topic?: string; take?: number }): string {
  const sp = new URLSearchParams()
  if (topic) sp.set('topic', topic)
  if (take && take !== PAGE) sp.set('take', String(take))
  const q = sp.toString()
  return q ? `/podcast?${q}` : '/podcast'
}

export default async function PodcastPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; take?: string; q?: string }>
}) {
  const { topic: rawTopic, take: rawTake, q: rawQ } = await searchParams
  // Phone header search — only the phone episode list reads it.
  const q = (rawQ ?? '').trim().slice(0, 80) || undefined

  // ─── the topic filter and pagination both live in the URL ───
  // Only a topic that actually has episodes is honoured, so a hand-typed or
  // stale ?topic= falls back to "All Topics" instead of showing nothing.
  const counts = await episodeCounts()
  // Every topic tile always shows — the row is part of the page's identity, so
  // it stays complete even for a topic that has no episodes yet.
  const topics = PODCAST_TOPICS
  const topic = rawTopic && counts[rawTopic] ? rawTopic : undefined

  const parsed = Number(rawTake)
  const take = Number.isFinite(parsed) ? Math.min(Math.max(parsed, PAGE), ALL) : PAGE

  const [latest, episodes, total, popular] = await Promise.all([
    listEpisodes({ take: 1 }),
    listEpisodes({ topic, take }),
    countEpisodes(topic),
    listEpisodes({ sort: 'popular', take: 5 }),
  ])

  const hero = latest[0]
  const heroMeta = hero ? episodeMeta(hero.meta) : null
  const heroVideo = hero?.media[0]

  // ─── phone-only data ───
  const searchWhere = q
    ? {
        type: 'PODCAST' as const, status: 'PUBLISHED' as const, deletedAt: null,
        ...(topic ? { category: topic } : {}),
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : null
  const [phoneEpisodes, phoneTotal, trending, events, session] = await Promise.all([
    searchWhere
      ? prisma.post.findMany({
          where: searchWhere,
          select: {
            id: true, slug: true, title: true, description: true, category: true,
            publishedAt: true, viewCount: true, meta: true,
            media: { where: { type: 'VIDEO_LINK' as const }, take: 1 },
          },
          orderBy: { publishedAt: 'desc' },
          take,
        })
      : Promise.resolve(episodes),
    searchWhere ? prisma.post.count({ where: searchWhere }) : Promise.resolve(total),
    trendingAroundUs(5).catch(() => []),
    loadPhoneEvents(4),
    auth(),
  ])
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, phoneEpisodes.map((e) => e.id))
    : new Set<string>()

  const phoneHref = (p: { topic?: string; take?: number; q?: string }) => {
    const base = podcastHref({ topic: p.topic, take: p.take })
    if (!p.q) return base
    return `${base}${base.includes('?') ? '&' : '?'}q=${encodeURIComponent(p.q)}`
  }

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search podcasts, topics, guest or keywords…', action: '/podcast', param: 'q', variant: 'filter' },
          location: false,
          tone: 'light',
        }}
      />

      {/* Read by search engines, invisible to the reader — see breadcrumb.tsx */}
      <Breadcrumb items={[homeCrumb(), { label: 'Podcast' }]} />

      {/* ─── phones ─── */}
      <div className="md:hidden">
        <PodcastPhone
          topics={topics}
          topic={topic}
          q={q}
          hero={
            heroVideo?.embedUrl && hero
              ? {
                  embedUrl: heroVideo.embedUrl,
                  poster: heroVideo.thumbnailUrl || heroMeta?.thumbImage || '',
                  title: hero.title,
                  duration: heroMeta?.duration ?? '00:00',
                  slug: hero.slug,
                }
              : null
          }
          episodes={phoneEpisodes}
          total={phoneTotal}
          loadMoreHref={phoneEpisodes.length < phoneTotal ? phoneHref({ topic, q, take: take + PAGE }) : null}
          allHref={podcastHref({ take: ALL })}
          topicHref={(slug) => phoneHref({ topic: slug, q })}
          savedIds={savedIds}
          youtubeHref={heroVideo?.videoHost === 'YOUTUBE' ? heroVideo.url : null}
          trending={trending}
          events={events}
          signedIn={Boolean(session?.user?.id)}
          joinHref={session?.user?.id ? '/dashboard' : '/register'}
        />
      </div>

      <main className="hidden bg-paper md:block">
        {/* ═══════════════════ hero ═══════════════════ */}
        <section className="border-b border-line bg-paper-2">
          <div className="container-af py-5 lg:py-7">
            <div className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] lg:gap-10">
              {/* ─── left: headline, subtitle, three features ─── */}
              {/* The trail is kept for SEO only — emitted sr-only + JSON-LD by
                  <Breadcrumb> above; it is never drawn on the page. */}
              <div className="min-w-0">
                <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-tight text-ink lg:text-[34px] xl:text-[42px]">
                  Architecture Insights.
                  <br />
                  Conversations that <span className="text-brand">Inspire.</span>
                </h1>

                <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-ink-2 lg:mt-5 lg:text-[15px]">
                  Join our founder &amp; industry experts as they share knowledge,
                  experiences and ideas shaping the future of architecture, design
                  and construction.
                </p>

                <ul className="mt-7 grid gap-4 sm:grid-cols-3 sm:gap-0">
                  {HERO_FEATURES.map((f, i) => (
                    <li
                      key={f.title}
                      // The thin rules between the three items are desktop only.
                      className={`min-w-0 sm:px-3 ${
                        i === 0 ? 'sm:pl-0' : 'sm:border-l sm:border-line'
                      } ${i === HERO_FEATURES.length - 1 ? 'sm:pr-0' : ''}`}
                    >
                      <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-brand/50 text-brand">
                        <Icon name={f.icon} className="h-[17px] w-[17px]" />
                      </span>
                      <p className="text-[13.5px] font-bold text-ink">{f.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                        {f.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ─── right: the latest episode player, exactly as the design draws it ─── */}
              <div className="min-w-0">
                {heroVideo?.embedUrl && hero ? (
                  <HeroPlayer
                    embedUrl={heroVideo.embedUrl}
                    poster={heroVideo.thumbnailUrl || heroMeta?.thumbImage || ''}
                    title={hero.title}
                    duration={heroMeta?.duration ?? '00:00'}
                  />
                ) : (
                  <div className="card flex aspect-video items-center justify-center p-6 text-[13.5px] text-ink-3">
                    The latest episode will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ content + sidebar ═══════════════════ */}
        <div className="container-af pt-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
            {/* ───────────────────────────────────────────────────
                LEFT — topics, episodes, guests
                ─────────────────────────────────────────────────── */}
            <div className="min-w-0">
              {/* ─── explore podcast topics ─── */}
              <section>
                <SectionHead title="Explore Podcast Topics" />

                <div className="card p-4">
                  {/* A wrapping grid so every topic is visible at once — a
                      fixed-width scroll strip cut the last tiles off the right
                      of this column. */}
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {topics.map((t) => {
                      const on = topic === t.slug
                      return (
                        <li key={t.slug}>
                          <Link
                            href={podcastHref({ topic: on ? undefined : t.slug })}
                            aria-current={on ? 'true' : undefined}
                            className={`flex h-[92px] w-full flex-col items-center justify-center gap-2 rounded-card border px-2 text-center transition-colors ${
                              on
                                ? 'border-brand bg-brand-soft text-brand'
                                : 'border-line bg-paper-2 text-ink-2 hover:border-brand-border hover:text-brand'
                            }`}
                          >
                            <Icon name={t.icon as IconName} className="h-5 w-5" />
                            <span className="text-[11.5px] font-semibold leading-tight">
                              {t.label}
                            </span>
                          </Link>
                        </li>
                      )
                    })}

                    {/* clears the filter */}
                    <li>
                      <Link
                        href={podcastHref({})}
                        aria-current={!topic ? 'true' : undefined}
                        className={`flex h-[92px] w-full flex-col items-center justify-center gap-2 rounded-card border px-2 text-center transition-colors ${
                          !topic
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-line bg-paper-2 text-ink-2 hover:border-brand-border hover:text-brand'
                        }`}
                      >
                        <Icon name="grid" className="h-5 w-5" />
                        <span className="text-[11.5px] font-semibold leading-tight">
                          All Topics
                        </span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </section>

              {/* ─── latest episodes ─── */}
              <section className="mt-9">
                <SectionHead
                  title="Latest Episodes"
                  action={
                    <Link
                      href={podcastHref({ topic, take: ALL })}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                    >
                      View All Episodes
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  }
                />

                {episodes.length === 0 ? (
                  <EmptyState icon="inbox" title="No episodes in this topic yet">
                    Try another topic — new conversations are published every month.
                  </EmptyState>
                ) : (
                  <ul className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {episodes.map((e) => (
                      <li key={e.id} className="min-w-0">
                        <EpisodeCard episode={e} />
                      </li>
                    ))}
                  </ul>
                )}

                {/*
                  "Load More" without a line of client JavaScript: it is a link
                  that raises `?take=`, the server reads it back at the top of
                  this component and asks for that many rows. Once everything
                  the current topic holds is on screen, the link is gone.
                */}
                {episodes.length < total && (
                  <div className="mt-7 flex justify-center">
                    <Link
                      href={podcastHref({ topic, take: take + PAGE })}
                      className="btn-outline border-brand-border text-brand hover:border-brand hover:bg-brand-soft"
                    >
                      Load More Episodes
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 11-3.2-6.9M21 3v5h-5" />
                      </svg>
                    </Link>
                  </div>
                )}
              </section>
            </div>

            {/* ───────────────────────────────────────────────────
                RIGHT — sidebar. Stacks below the content on mobile.
                ─────────────────────────────────────────────────── */}
            <aside className="flex min-w-0 flex-col gap-6">
              {/* ─── about our podcast ─── */}
              <section className="card p-5" id="about-podcast">
                <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
                  About Our Podcast
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
                  Our podcast brings you meaningful conversations with architects,
                  designers, consultants and industry experts. We discuss ideas,
                  challenges, trends and innovations shaping the built environment.
                </p>
                <Link
                  href="/legal/about"
                  className="btn-outline mt-4 w-full border-brand-border text-brand hover:border-brand hover:bg-brand-soft"
                >
                  Know More About Podcast
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </section>

              {/* ─── popular episodes ─── */}
              <section className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
                    Popular Episodes
                  </h2>
                  <Link
                    href={podcastHref({ take: ALL })}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                  >
                    View All
                    <Icon name="arrow" className="h-3 w-3" />
                  </Link>
                </div>

                <ol className="flex min-w-0 flex-col gap-4">
                  {popular.map((e, i) => (
                    <PopularRow key={e.id} episode={e} rank={i + 1} />
                  ))}
                </ol>
              </section>

              {/* ─── submit your questions ─── */}
              <section className="card relative overflow-hidden p-5">
                {/* two soft question-mark bubbles, purely decorative */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft font-display text-[26px] font-bold text-brand/40"
                >
                  ?
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-3 right-6 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-display text-[15px] font-bold text-brand/35"
                >
                  ?
                </span>

                <h2 className="relative font-display text-[15px] font-bold tracking-tight text-ink">
                  Submit Your Questions
                </h2>
                <p className="relative mt-2.5 max-w-[85%] text-[13px] leading-relaxed text-ink-2">
                  Have a question for our next episode? We would love to hear from you.
                </p>
                <Link href="/legal/contact" className="btn-primary relative mt-4">
                  Ask Your Question
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </section>
            </aside>
          </div>

          {/* ═══════════════════ dark CTA band ═══════════════════ */}
          {/* -20px against the footer's global 40px top margin → a 20px gap. */}
          <section className="mt-10 -mb-5">
            <div className="flex min-w-0 flex-wrap items-center gap-6 rounded-card bg-navy px-6 py-4">
              <Image
                src="https://ik.imagekit.io/archfacing/mick.png?updatedAt=1784604523029"
                alt=""
                aria-hidden
                width={120}
                height={120}
                className="h-[76px] w-[76px] shrink-0 object-contain"
              />

              <WaveBars className="hidden shrink-0 text-white/25 sm:flex" />

              <div className="min-w-0 flex-1">
                <p className="font-display text-[19px] font-bold leading-tight text-white">
                  Do you want to be our next guest?
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/65 [text-wrap:balance]">
                  Share your expertise and inspire thousands of architects, designers
                  and industry professionals.
                </p>
              </div>

              <Link href="/legal/contact" className="btn-primary shrink-0">
                Become a Guest
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
