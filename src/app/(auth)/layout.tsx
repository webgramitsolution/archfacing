import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'

/**
 * The authentication shell — a two-column split, exactly as the reference draws
 * it: the form on the left (scrolls on its own on a computer), a full-height
 * building photograph on the right with a dark wash and the "Join ArchFacing"
 * caption sitting over its foot.
 *
 * Below `lg` the photograph is dropped and the form takes the full width, so a
 * tablet and a phone read a clean single column.
 */

/**
 * The right-hand photograph — a glass tower, shown clean. `unoptimized` serves
 * it straight from Unsplash (a CDN) and sidesteps the optimizer, which times
 * out on large external images.
 */
const AUTH_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=75'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The whole page is exactly one viewport tall and never scrolls — the
    // header sits at the top, the photograph is pinned, and only the form
    // column scrolls inside itself when a step is taller than the space.
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* The website's own header sits above the split. */}
      <SiteHeader />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ─── LEFT · the form (scrolls inside itself, not the page) ─── */}
        <div className="flex w-full flex-col overflow-y-auto md:w-[56%] lg:w-1/2">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10">
            {children}
          </div>
        </div>

        {/* ─── RIGHT · the building, pinned, hidden below md (phone) ─── */}
        <aside className="relative hidden md:block md:w-[44%] lg:w-1/2">
        <Image
          src={AUTH_IMAGE}
          alt=""
          fill
          priority
          unoptimized
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* A dark wash rising from the foot so the caption reads on any crop. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5"
        />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <h2 className="font-display text-[34px] font-bold leading-tight tracking-tight text-white xl:text-[40px]">
            Join ArchFacing
          </h2>
          <p className="mt-2 text-[16px] text-white/85 xl:text-[18px]">
            India&apos;s Architecture &amp; Design Platform
          </p>
        </div>
        </aside>
      </div>
    </div>
  )
}
