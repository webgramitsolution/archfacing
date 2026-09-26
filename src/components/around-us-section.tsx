import Image from 'next/image'
import Link from 'next/link'
import { Glyph } from '@/components/projects'
import { AROUND_US_TILES, HomeSectionHead } from '@/components/home'

/**
 * The "Around Us" section — the COLOURED version, saved out of the home page
 * for reuse (the plan is to add it to the About Us page). Drop `<AroundUs />`
 * wherever it belongs.
 *
 * Server Component, no client JavaScript.
 *
 * Six pastel gradient tiles (each with its own accent and a circular arrow)
 * beside a peach community card carrying the "Together — We Build Better
 * Spaces" tagline. The tile icons are ImageKit images (alt = label) loaded
 * unoptimized so they come straight from the CDN.
 */
export function AroundUsSection() {
  return (
    <section className="container-af py-5">
      <HomeSectionHead
        title={<>Around <span className="text-brand">Us</span></>}
        aside={
          <span className="hidden text-[13px] font-semibold text-ink-3 sm:inline">
            Connect. Collaborate. <span className="text-brand">Grow Together.</span>
          </span>
        }
      />

      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr] md:items-stretch">
        {/* ─── the six coloured tiles ─── */}
        <ul className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3">
          {AROUND_US_TILES.map((t) => (
            <li key={t.label} className="min-w-0">
              <Link
                href={t.href}
                className={`group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} p-5`}
              >
                {/* Decorative corner circle. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-white/25"
                />

                {/* Icon at the top, title + subtitle at the bottom. */}
                <span className="relative flex min-h-[112px] flex-1 flex-col justify-between">
                  <Image
                    src={t.image}
                    alt={t.label}
                    width={48}
                    height={48}
                    unoptimized
                    className="h-11 w-11 object-contain"
                  />
                  <span className="mt-4 block min-w-0">
                    <span className="block text-[14.5px] font-bold leading-tight text-ink md:text-[12px] lg:text-[14.5px]">
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-3 md:text-[10px] lg:text-[12px]">
                      {t.body}
                    </span>
                  </span>
                </span>

                {/* Circular arrow, in the tile's accent colour. */}
                <span
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-white/85 shadow-sm transition-transform group-hover:translate-x-0.5 ${t.accent}`}
                >
                  <Glyph name="right" className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* ─── Join Our Growing Community (peach card) ─── */}
        <div className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF1E7] to-[#FFE6D4] p-6">
          {/* Community illustration, top-right. */}
          <Image
            src="https://ik.imagekit.io/housekase/Archfacing%20Icon%20/community%20(1).png"
            alt="Community"
            width={180}
            height={180}
            unoptimized
            className="pointer-events-none absolute right-4 top-5 hidden h-32 w-32 object-contain sm:block"
          />

          <div className="relative max-w-[62%] sm:max-w-[58%]">
            <h3 className="font-display text-[20px] font-bold leading-tight tracking-tight text-ink">
              Join Our Growing <span className="text-brand">Community</span>
            </h3>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-3">
              Connect. Collaborate. Grow Together.
            </p>
          </div>

          <ul className="relative mt-4 flex flex-col gap-2">
            {[
              'Access exclusive leads & projects',
              'Showcase your products & services',
              'Build strong business relationships',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <Glyph name="check" className="h-3.5 w-3.5 shrink-0 text-brand" />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-auto flex items-end justify-between gap-3 pt-5">
            <Link
              href="/register"
              className="btn shrink-0 bg-navy px-7 text-white hover:bg-navy-2"
            >
              Join Now
              <Glyph name="right" className="h-4 w-4" />
            </Link>
            {/* Handwritten tagline. */}
            <span className="hidden text-right font-display text-[12px] font-semibold italic leading-tight text-ink-3 sm:block">
              <span className="text-[15px] text-brand">Together</span>
              <br />
              We Build Better Spaces
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
