import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { VideoEmbed } from '@/components/video-embed'
import { Icon } from '@/components/ui'
import { CalendarGlyph, EpisodeCard, PlayGlyph } from '@/components/podcast'
import {
  compactCount, episodeMeta, getEpisode, listEpisodes, listGuests, postDate,
} from '@/lib/content'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const episode = await getEpisode(slug)
  if (!episode) return { title: 'Episode not found' }

  const m = episodeMeta(episode.meta)
  const title = m.episodeNumber
    ? `${episode.title} — Episode ${m.episodeNumber}`
    : episode.title

  return {
    title,
    description: episode.description,
    openGraph: {
      title,
      description: episode.description,
      type: 'article',
      images: [{ url: m.thumbImage, alt: episode.title }],
    },
  }
}

export default async function EpisodePage({ params }: Params) {
  const { slug } = await params

  const episode = await getEpisode(slug)
  if (!episode) notFound()

  const m = episodeMeta(episode.meta)
  const video = episode.media[0]

  const [allGuests, more] = await Promise.all([
    // `PodcastGuest.episodes` is a String[] of Post slugs — the appearance list
    // is small enough that filtering here beats a second query.
    listGuests(50),
    listEpisodes({ take: 4 }),
  ])

  const guests = allGuests.filter((g) => g.episodes.includes(slug))
  const others = more.filter((e) => e.slug !== slug).slice(0, 3)

  return (
    <>
      <SiteHeader />

      {/* Read by search engines, invisible to the reader — see breadcrumb.tsx */}
      <Breadcrumb
        items={[homeCrumb(), { label: 'Podcast', href: '/podcast' }, { label: episode.title }]}
      />

      <main className="bg-paper">
        <div className="container-af py-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_310px]">
            {/* ───────────────── the episode ───────────────── */}
            <article className="min-w-0">
              {video?.embedUrl ? (
                <div className="card overflow-hidden p-3">
                  <div className="[&_figcaption]:hidden [&_figure]:my-0">
                    <VideoEmbed
                      embedUrl={video.embedUrl}
                      host={video.videoHost ?? 'YOUTUBE'}
                      title={episode.title}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-card bg-navy">
                  <Image
                    src={m.thumbImage}
                    alt=""
                    fill
                    priority
                    sizes="(max-width:1024px) 100vw, 70vw"
                    className="object-cover opacity-80"
                  />
                </div>
              )}

              <h1 className="mt-6 font-display text-[26px] font-bold leading-tight tracking-tight text-ink md:text-[30px]">
                {episode.title}
              </h1>

              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-3">
                <span className="pill-brand">{m.topicLabel}</span>
                {m.episodeNumber > 0 && <span>Episode {m.episodeNumber}</span>}
                <span className="flex items-center gap-1.5">
                  <CalendarGlyph />
                  {postDate(episode.publishedAt)}
                </span>
                <span className="tabular flex items-center gap-1.5">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {m.duration}
                </span>
                <span className="tabular flex items-center gap-1.5">
                  <PlayGlyph className="h-3 w-3" />
                  {compactCount(episode.viewCount)} Plays
                </span>
              </div>

              <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-ink-2">
                {episode.description}
              </p>

              {/* ─── guests on this episode ─── */}
              {guests.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-4 font-display text-[17px] font-bold tracking-tight text-ink">
                    {guests.length === 1 ? 'Guest on this Episode' : 'Guests on this Episode'}
                  </h2>

                  <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
                    {guests.map((g) => (
                      <li key={g.slug} className="card flex min-w-0 gap-3.5 p-4">
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-paper-3 ring-2 ring-brand-border">
                          <Image
                            src={g.photo}
                            alt={g.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-display text-[14px] font-bold text-ink">
                            {g.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-ink-2">
                            {g.role} · {g.company}
                          </span>
                          {g.bio && (
                            <span className="mt-1.5 line-clamp-2 block text-[12px] leading-relaxed text-ink-3">
                              {g.bio}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ─── more episodes ─── */}
              {others.length > 0 && (
                <section className="mt-10">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                      More Episodes
                    </h2>
                    <Link
                      href="/podcast"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                    >
                      All Episodes
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <ul className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {others.map((e) => (
                      <li key={e.id} className="min-w-0">
                        <EpisodeCard episode={e} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {/* ───────────────── sidebar ───────────────── */}
            <aside className="flex min-w-0 flex-col gap-6">
              <section className="card p-5">
                <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
                  About Our Podcast
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
                  Our podcast brings you meaningful conversations with architects,
                  designers, consultants and industry experts. We discuss ideas,
                  challenges, trends and innovations shaping the built environment.
                </p>
                <Link
                  href="/podcast"
                  className="btn-outline mt-4 w-full border-brand-border text-brand hover:border-brand hover:bg-brand-soft"
                >
                  Browse All Episodes
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </section>

              <section className="card relative overflow-hidden p-5">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft font-display text-[26px] font-bold text-brand/40"
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
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
