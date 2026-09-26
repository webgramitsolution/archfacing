import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { ClubNewsletter } from '@/components/club'
import { Icon } from '@/components/ui'
import { CLUB_GALLERY, CLUB_PHOTOS, unsplash } from '@/config/club-media'
import { listUpcomingEvents } from '@/lib/club-events'

export const metadata: Metadata = {
  title: 'Club Gallery',
  description:
    'Photographs from ArchFacing Club seminars, workshops, exhibitions and ' +
    'networking evenings across India.',
}

/**
 * The page behind "View Gallery" on the Club landing page.
 *
 * ⚠️ The photographs are the shared Club set, the same stock library the rest
 *    of the Club pages draw on. They stand in until photographs from real
 *    events are uploaded; the layout does not change when they are.
 */
export default async function ClubGalleryPage() {
  // Upcoming events, so the gallery has somewhere to send a reader who wants
  // to be in the next set of photographs rather than only look at the old ones.
  const upcoming = (await listUpcomingEvents().catch(() => [])).slice(0, 3)

  const shots = [
    ...CLUB_GALLERY,
    ...Object.values(CLUB_PHOTOS).filter((id) => !CLUB_GALLERY.includes(id)),
  ]

  return (
    <>
      <SiteHeader />

      <main className="bg-paper">
        <Breadcrumb
          items={[
            homeCrumb(),
            { label: 'Club', href: '/club' },
            { label: 'Gallery' },
          ]}
        />

        <section className="bg-navy">
          <div className="container-af py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold">
              ArchFacing Club
            </p>
            <h1 className="mt-2.5 font-display text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[40px]">
              Glimpses from our events
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/70">
              Seminars, site walks, workshops and the evenings in between.
              Members get first access to every one of them.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/club/events" className="btn-gold">
                See upcoming events
              </Link>
              <Link href="/club/join" className="btn-on-navy">
                Join the Club
              </Link>
            </div>
          </div>
        </section>

        <section className="container-af py-10">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shots.map((id, i) => (
              <li
                key={`${id}-${i}`}
                className={`relative overflow-hidden rounded-lg bg-paper-3 ${
                  // every fifth frame runs tall, so the grid is not a flat
                  // checkerboard of identical rectangles
                  i % 5 === 0 ? 'aspect-[3/4]' : 'aspect-[4/3]'
                }`}
              >
                <Image
                  src={unsplash(id, { w: 800, h: 600 })}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-4">
            <Icon name="alert" className="h-3.5 w-3.5" />
            Representative photography. Pictures from each event are added here
            after it takes place.
          </p>
        </section>

        {upcoming.length > 0 && (
          <section className="container-af pb-10">
            <h2 className="club-section-title mb-5">NEXT ON THE CALENDAR</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <li key={e.slug}>
                  <Link href={`/club/events/${e.slug}`} className="card-hover block overflow-hidden">
                    <span className="relative block aspect-[16/9]">
                      <Image
                        src={e.heroImage}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 360px"
                        className="object-cover"
                      />
                    </span>
                    <span className="block p-4">
                      <span className="block font-display text-[14.5px] font-bold leading-snug text-ink">
                        {e.title}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1 text-[12px] text-ink-3">
                        <Icon name="map" className="h-3.5 w-3.5 shrink-0" />
                        {e.venueName}, {e.city}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="container-af pb-12">
          <ClubNewsletter />
        </section>
      </main>

      <SiteFooter variant="club" />
    </>
  )
}
