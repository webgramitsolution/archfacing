import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { SnapRail } from '@/components/mobile/snap-rail'
import { PhoneNewsletterCard } from './content-phone-parts'

/**
 * `/membership` below `md` — the PWA layout from the client's phone reference.
 *
 * Server Component. Every figure comes from the page's own queries:
 *  · the Verified Member count and faces are the members who hold a tick
 *    under lib/verified.ts rules (active PACT, or the top paid plan);
 *  · the compare table is built from the SubscriptionPlan rows — listings are
 *    unlimited on every plan and only PACT territories differ;
 *  · success stories are real Review rows with text, and the block is gone
 *    when there are none.
 */

const HERO_BANNER =
  'https://ik.imagekit.io/archfacing/membership%20banner%20002.png?updatedAt=1784623300050'

export type PhoneCopyItem = { icon: IconName; title: string; body: string }
export type PhonePublishItem = { icon: IconName; title: string; body: string; photo: string; href: string }
export type PhoneSuitable = { icon: IconName; tint: string; title: string; href: string }

export type PhonePlan = {
  id: string
  name: string
  price: number
  months: number
  isPopular: boolean
  pactTerritories: number | null
  maxProjects: number | null
  maxProducts: number | null
  maxAroundUs: number | null
  maxArtistry: number | null
}

export type PhoneStory = {
  id: string
  quote: string
  rating: number
  name: string
  photo: string | null
  /** "Reviewed <post> by <member>" */
  about: string
  href: string
}

const WHY_TINT: string[] = ['text-info', 'text-info', 'text-info', 'text-brand', 'text-brand', 'text-brand']

function rupees(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

function quota(n: number | null): string {
  return n === null ? 'Unlimited' : n === 0 ? '—' : `Up to ${n}`
}

type Cell = { text: string; ok?: boolean; no?: boolean }

export function MembershipPhone({
  heroFeatures,
  why,
  publish,
  steps,
  suitable,
  faq,
  plans,
  verifiedCount,
  faces,
  stories,
  ctaHref,
  isVerified,
}: {
  heroFeatures: PhoneCopyItem[]
  why: PhoneCopyItem[]
  publish: PhonePublishItem[]
  steps: PhoneCopyItem[]
  suitable: PhoneSuitable[]
  faq: { q: string; a: string }[]
  plans: PhonePlan[]
  verifiedCount: number
  faces: string[]
  stories: PhoneStory[]
  ctaHref: string
  isVerified: boolean
}) {
  // The highest-priced paid plan is the one whose members get the GOLD tick.
  const paid = plans.filter((p) => p.price > 0)
  const topPrice = paid.length ? Math.max(...paid.map((p) => p.price)) : -1
  const recommended = plans.find((p) => p.isPopular)?.id

  const rows: { feature: string; cells: (p: PhonePlan) => Cell }[] = [
    {
      feature: 'Price',
      cells: (p) => ({ text: p.price === 0 ? 'Free' : `${rupees(p.price)}/${p.months === 12 ? 'yr' : `${p.months} mo`}` }),
    },
    { feature: 'Profile', cells: () => ({ text: 'Included', ok: true }) },
    { feature: 'Projects Upload', cells: (p) => ({ text: quota(p.maxProjects), ok: p.maxProjects === null }) },
    { feature: 'Products Upload', cells: (p) => ({ text: quota(p.maxProducts), ok: p.maxProducts === null }) },
    { feature: 'Artistry Upload', cells: (p) => ({ text: quota(p.maxArtistry), ok: p.maxArtistry === null }) },
    { feature: 'Around Us Posts', cells: (p) => ({ text: quota(p.maxAroundUs), ok: p.maxAroundUs === null }) },
    // Blog has no per-plan quota field — it is unlimited for everyone.
    { feature: 'Blog Posts', cells: () => ({ text: 'Unlimited', ok: true }) },
    {
      feature: 'PACT Territories',
      cells: (p) =>
        p.pactTerritories === 0
          ? { text: 'None', no: true }
          : { text: p.pactTerritories === null ? 'Unlimited' : `${p.pactTerritories} PIN codes`, ok: true },
    },
    {
      feature: 'Verified Badge',
      cells: (p) =>
        p.price === 0
          ? { text: 'None', no: true }
          : p.price === topPrice
            ? { text: 'Gold tick', ok: true }
            : { text: 'Blue with PACT', ok: true },
    },
    {
      feature: 'Certificate',
      cells: (p) => (p.price === 0 ? { text: 'None', no: true } : { text: 'Included', ok: true }),
    },
  ]

  return (
    <main className="bg-paper pb-6">
      {/* ═════════ dark hero ═════════ */}
      <section className="relative isolate overflow-hidden bg-admin-bg px-4 pb-5 pt-5">
        <span aria-hidden className="absolute inset-0 -z-10">
          <Image src={HERO_BANNER} alt="" fill priority unoptimized sizes="100vw" className="object-cover object-[70%_center]" />
          <span className="absolute inset-0 bg-gradient-to-r from-admin-bg via-admin-bg/85 to-admin-bg/40" />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-admin-bg to-transparent" />
        </span>

        <h1 className="font-display text-[26px] font-bold leading-[1.18] tracking-tight text-white">
          Become a Verified
          <br />
          <span className="text-brand">ArchFacing</span>
          <br />
          Member
        </h1>
        <p className="mt-3 max-w-[30ch] text-[12px] leading-[1.6] text-white/80">
          India’s architecture and design platform. Showcase your work, share ideas and grow your
          business with unlimited opportunities.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3.5">
          {heroFeatures.map((f) => (
            <li key={f.title} className="flex min-w-0 items-start gap-2">
              <Icon name={f.icon} className="mt-px h-[18px] w-[18px] shrink-0 text-brand" />
              <span className="min-w-0">
                <span className="block text-[12px] font-bold leading-tight text-white">{f.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-white/70">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Verified Member card */}
        <div className="mx-auto mt-5 max-w-[300px] rounded-card border border-white/25 bg-admin-bg/70 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Icon name="shield" className="h-8 w-8 shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-white">
                {isVerified ? 'You’re Verified' : 'Verified Member'}
              </p>
              <p className="text-[11.5px] text-white/80">Trusted. Recognized. Preferred.</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5 pl-1">
            {faces.length > 0 && (
              <span className="flex -space-x-2">
                {faces.map((src) => (
                  <span key={src} className="relative h-8 w-8 overflow-hidden rounded-full bg-paper-3 ring-2 ring-admin-bg">
                    <Image src={src} alt="" fill unoptimized sizes="32px" className="object-cover" />
                  </span>
                ))}
              </span>
            )}
            <span className="min-w-0">
              <span className="tabular block font-display text-[16px] font-bold leading-none text-white">
                {verifiedCount.toLocaleString('en-IN')}
              </span>
              <span className="mt-0.5 block text-[11px] text-white/75">
                Verified Member{verifiedCount === 1 ? '' : 's'}
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 px-4 pt-5">
        {/* ═════════ why join ═════════ */}
        <section>
          <h2 className="text-center font-display text-[16px] font-bold tracking-tight text-ink">
            Why Join ArchFacing Membership?
          </h2>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {why.map((b, i) => (
              <li
                key={b.title}
                className="flex min-w-0 flex-col items-center rounded-card border border-line bg-white px-1.5 py-3 text-center shadow-card"
              >
                <Icon name={b.icon} className={`h-6 w-6 ${WHY_TINT[i] ?? 'text-brand'}`} />
                <p className="mt-2 text-[11.5px] font-bold leading-tight text-ink">{b.title}</p>
                <p className="mt-1 text-[10.5px] leading-snug text-ink-3">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ what you can publish ═════════ */}
        <section>
          <h2 className="text-center font-display text-[16px] font-bold tracking-tight text-ink">
            What You Can Publish as a Member?
          </h2>
          <SnapRail label="What you can publish" itemClassName="w-[31.5%]" className="mt-3">
            {publish.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card"
              >
                <span className="relative block aspect-[4/3] bg-paper-3">
                  <Image src={p.photo} alt="" fill unoptimized sizes="33vw" className="object-cover" />
                  <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                    <Icon name={p.icon} className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="block px-2 pb-2.5 pt-2">
                  <span className="block text-[12px] font-bold text-ink">{p.title}</span>
                  <span className="mt-1 line-clamp-4 block text-[10.5px] leading-snug text-ink-3">{p.body}</span>
                </span>
              </Link>
            ))}
          </SnapRail>
        </section>

        {/* ═════════ compare — from the real plans ═════════ */}
        {plans.length > 0 && (
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <h2 id="phone-compare" className="px-3 py-2.5 text-center font-display text-[14px] font-bold text-ink">
              Membership Features Compare
            </h2>
            <div role="region" aria-labelledby="phone-compare" tabIndex={0} className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-t border-line bg-paper-2">
                    <th scope="col" className="w-[25%] px-2 py-2 text-[11px] font-bold text-ink">
                      Features
                    </th>
                    {plans.map((p) => {
                      const hi = p.id === recommended
                      return (
                        <th
                          key={p.id}
                          scope="col"
                          className={`px-1 py-2 text-center text-[11px] font-bold ${hi ? 'bg-admin-bg text-white' : 'text-ink'}`}
                        >
                          {p.name}
                          {hi && (
                            <span className="mx-auto mt-0.5 block w-fit rounded bg-brand px-1 py-px text-[8.5px] font-bold uppercase tracking-wide text-white">
                              Popular
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.feature} className="border-t border-line-soft">
                      <th scope="row" className="px-2 py-2 text-[10.5px] font-medium leading-tight text-ink-2">
                        {r.feature}
                      </th>
                      {plans.map((p) => {
                        const c = r.cells(p)
                        const hi = p.id === recommended
                        return (
                          <td
                            key={p.id}
                            className={`px-0.5 py-2 text-center text-[10px] leading-tight ${hi ? 'bg-brand-soft/60 font-medium text-ink' : 'text-ink-2'}`}
                          >
                            {c.no ? (
                              <>
                                <span aria-hidden className="text-[12px] font-bold text-danger">✕</span>
                                <span className="sr-only">{c.text}</span>
                              </>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-0.5">
                                {c.ok && <Icon name="check" className="h-3 w-3 shrink-0 text-ok" />}
                                {c.text}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ═════════ how membership works ═════════ */}
        <section className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">How Membership Works?</h2>
          <ol className="mt-3.5 flex flex-col">
            {steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[44px_28px_minmax(0,1fr)] gap-x-2">
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-admin-bg text-white">
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  {i < steps.length - 1 && (
                    <svg viewBox="0 0 8 22" aria-hidden className="my-1 h-5 w-2 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M4 0v16" />
                      <path d="M1 13l3 4 3-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="tabular mt-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[10.5px] font-bold text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={i < steps.length - 1 ? 'pb-2' : ''}>
                  <p className="font-display text-[13px] font-bold leading-tight text-ink">{s.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ═════════ suitable for ═════════ */}
        <section className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Membership Suitable For</h2>
          <ul className="mt-2 grid grid-cols-3">
            {suitable.map((s, i) => (
              <li key={s.title} className={`min-w-0 ${i % 3 !== 2 ? 'border-r border-line-soft' : ''} ${i < 3 ? 'border-b border-line-soft' : ''}`}>
                <Link href={s.href} className="flex h-full flex-col items-center px-1 py-3.5 text-center">
                  <Icon name={s.icon} className={`h-7 w-7 ${s.tint}`} />
                  <span className="mt-2 text-[11.5px] font-semibold leading-tight text-ink">{s.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ═════════ success stories — real reviews only ═════════ */}
        {stories.length > 0 && (
          <section className="rounded-card border border-line bg-white px-4 py-4 shadow-card">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Success Stories</h2>
            <SnapRail label="Success stories" itemClassName="w-full" className="mt-3">
              {stories.map((s) => (
                <figure key={s.id} className="flex h-full min-w-0 items-start gap-3 rounded-card border border-line bg-white p-3">
                  <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-3 font-display text-[20px] font-bold text-ink-3">
                    {s.photo ? (
                      <Image src={s.photo} alt="" fill unoptimized sizes="64px" className="object-cover" />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </span>
                  <div className="min-w-0">
                    <span aria-hidden className="font-display text-[20px] font-bold leading-none text-brand">“</span>
                    <blockquote className="line-clamp-5 text-[12px] leading-relaxed text-ink-2">{s.quote}</blockquote>
                    <figcaption className="mt-2">
                      <span className="block text-[12.5px] font-bold text-ink">{s.name}</span>
                      <Link href={s.href} className="block text-[11px] text-ink-3 underline-offset-2 hover:underline">
                        {s.about}
                      </Link>
                      <span className="mt-1 flex gap-0.5" aria-label={`${s.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, n) => (
                          <Icon key={n} name="star" className={`h-3.5 w-3.5 ${n < s.rating ? 'fill-current text-brand' : 'text-ink-4/40'}`} />
                        ))}
                      </span>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </SnapRail>
          </section>
        )}

        {/* ═════════ FAQ ═════════ */}
        <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Frequently Asked Questions</h2>
            <Link href="/legal/need-help" className="shrink-0 py-2 text-[11.5px] font-semibold text-brand">
              View All FAQs →
            </Link>
          </div>
          <div className="mt-1 flex flex-col">
            {faq.map((f) => (
              <details key={f.q} className="group border-t border-line-soft">
                <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="shrink-0 text-[16px] font-bold leading-none text-ink-2 transition-transform group-open:rotate-45 group-open:text-brand">
                    +
                  </span>
                </summary>
                <p className="pb-3 pr-6 text-[11.5px] leading-relaxed text-ink-3">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ═════════ upgrade CTA ═════════ */}
        <section className="rounded-card bg-admin-bg px-5 py-5 text-center">
          <Icon name="award" className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-2 font-display text-[18px] font-bold leading-tight text-white">
            Ready to Build Your Identity
            <br />
            &amp; Grow Your Business?
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/75">
            Join the professionals already growing with ArchFacing.
          </p>
          <Link href={ctaHref} className="btn-primary mt-4 w-full justify-center">
            Upgrade to Verified Membership
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* ═════════ newsletter ═════════ */}
        <PhoneNewsletterCard source="membership-phone" />
      </div>
    </main>
  )
}
