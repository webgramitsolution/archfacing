import Image from 'next/image'
import { Breadcrumb, homeCrumb } from './breadcrumb'

/**
 * The banner used at the top of full-width marketing pages.
 *
 * Same treatment as the legal pages: the illustration sits blurred behind
 * the whole strip and sharp in a card on the right, with the title on the
 * left. Below `lg` the right-hand card is dropped rather than stacked — at
 * phone width it would push the title a full screen down for no gain.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  breadcrumb,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle: string
  /** path under /public, e.g. "/img/hero-club.svg" */
  image: string
  breadcrumb?: string
  /** stats, buttons — anything that belongs under the subtitle */
  children?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <span aria-hidden className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-30 blur-[2px]"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-navy via-navy/92 to-navy/55" />
      </span>

      <div className="container-af relative py-12 lg:py-16">
        {/* Kept for SEO, hidden from sight — see components/breadcrumb.tsx */}
        <Breadcrumb items={[homeCrumb(), { label: breadcrumb ?? title }]} />

        <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr]">
          <div>
            {eyebrow && (
              <span className="pill mb-3 bg-white/10 text-white/75">{eyebrow}</span>
            )}

            <h1 className="font-display text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[42px]">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
              {subtitle}
            </p>

            {children && <div className="mt-6">{children}</div>}
          </div>

          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-card ring-1 ring-white/10 lg:block">
            <Image src={image} alt="" fill priority sizes="480px" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** A row of figures for the hero — kept small so it never competes with the title. */
export function HeroStats({
  items,
}: {
  items: { value: string; label: string }[]
}) {
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      {items.map((s) => (
        <div key={s.label}>
          <dt className="tabular font-display text-[22px] font-bold leading-none text-white">
            {s.value}
          </dt>
          <dd className="mt-1.5 text-[12.5px] text-white/55">{s.label}</dd>
        </div>
      ))}
    </dl>
  )
}
