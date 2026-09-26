import Link from 'next/link'
import Image from 'next/image'
import { Icon, type IconName } from '@/components/ui'
import { VerifiedTick } from '@/components/verified-badge'
import { cn } from '@/lib/utils'
import { tierLabel, type Associate, type ContentCard } from '@/lib/design-associates'

/**
 * The pieces the two Designers Associates pages share.
 *
 * Nothing here holds data of its own. Every value is passed in from
 * `lib/design-associates.ts`, which reads the professional's existing profile
 * and their existing `Post` rows — so a component cannot show a figure the
 * database does not hold, and there is no second copy of anything to drift.
 */

// ═══════════════════════════════════════════════════════════
//  Badges
// ═══════════════════════════════════════════════════════════

/**
 * DESIGNA is architecture, DESIGNI is interior — the two words the PDF
 * invented (§2), so they are printed as the platform's own terms rather than
 * translated away.
 */
export function DisciplineBadge({ type }: { type: 'DESIGNA' | 'DESIGNI' }) {
  return (
    <span
      className={cn(
        'pill text-[10px] font-bold uppercase tracking-[0.06em]',
        type === 'DESIGNA'
          ? 'border border-brand-border bg-brand-soft text-brand'
          : 'border border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]'
      )}
    >
      {type}
    </span>
  )
}

/** Professional · Legend · Innovator · Student — §4.2.1. */
export function TierBadge({ tier }: { tier: string }) {
  const strong = tier === 'LEGEND' || tier === 'INNOVATOR'
  return (
    <span
      className={cn(
        'pill text-[10px] font-semibold',
        strong ? 'bg-warn-soft text-warn ring-1 ring-warn/25' : 'bg-paper-3 text-ink-2'
      )}
    >
      {tierLabel(tier)}
    </span>
  )
}

export function VerifiedMark({ label = 'Verified' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-info">
      <VerifiedTick className="h-3.5 w-3.5" label={label} />
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  The directory card
// ═══════════════════════════════════════════════════════════

/** The initials shown when an associate has uploaded no logo or photograph. */
function initials(name: string): string {
  return name
    .replace(/^(ar|er|dr)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * One Design Associate in the directory.
 *
 * The whole card is the link — clicking anywhere opens that associate's page,
 * which is the behaviour the reference design implies and the one a directory
 * needs.
 */
export function AssociateCard({ a, cover }: { a: Associate; cover: string | null }) {
  const work = a.counts.projects + a.counts.products + a.counts.artistry

  return (
    <li>
      <Link
        href={`/${a.slug}`}
        className="card-hover group flex h-full flex-col overflow-hidden"
      >
        {/* ─── their own work as the cover ─── */}
        <span className="relative block aspect-[4/3] overflow-hidden bg-paper-3">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width:640px) 100vw, 340px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            /*
              No cover, which is not the same as no work.
              Most published posts carry no image yet, and printing "No
              published work yet" over a card that also says "1 published"
              contradicted itself. This says only what is true: there is
              nothing to show a picture of.
            */
            <span className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-paper-2 to-paper-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-[13px] font-bold text-ink-3 shadow-card">
                {initials(a.firmName || a.name)}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-4">
                {a.designaType ?? 'ArchFacing'}
              </span>
            </span>
          )}

          <span className="absolute left-2 top-2 flex flex-wrap gap-1">
            {a.designaType && <DisciplineBadge type={a.designaType} />}
            {a.tier && a.tier !== 'PROFESSIONAL' && <TierBadge tier={a.tier} />}
          </span>

          {a.isVerified && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-info shadow-card">
              <Icon name="shield" className="h-3.5 w-3.5" />
            </span>
          )}

        </span>

        {/* ─── who they are ─── */}
        <span className="relative flex min-w-0 flex-1 flex-col px-3.5 pb-3.5 pt-7">
          {/* the logo, half over the image — sits in the details block (which is
              not clipped) so the bottom of the avatar is never cut off */}
          <span className="absolute -top-5 left-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-paper bg-paper shadow-card">
            {a.logo || a.photo ? (
              <Image
                src={(a.logo || a.photo)!}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-bold text-ink-2">{initials(a.name)}</span>
            )}
          </span>
          <span className="truncate font-display text-[14.5px] font-bold text-ink transition-colors group-hover:text-brand">
            {a.firmName || a.name}
          </span>

          {a.firmName && a.firmName !== a.name && (
            <span className="mt-0.5 truncate text-[12px] text-ink-3">{a.name}</span>
          )}

          <span className="mt-1.5 flex items-center gap-1 text-[12px] text-ink-3">
            <Icon name="map" className="h-3.5 w-3.5 shrink-0 text-ink-4" />
            <span className="truncate">{a.location || 'India'}</span>
          </span>

          {/* §3.1.7.2 — an associate is registered FOR a territory */}
          {a.pacts[0] && (
            <span className="tabular mt-1 flex items-center gap-1 text-[11.5px] text-ink-3">
              <Icon name="target" className="h-3.5 w-3.5 shrink-0 text-brand" />
              PACT {a.pacts.map((p) => p.pincode).slice(0, 2).join(', ')}
              {a.pacts.length > 2 && ` +${a.pacts.length - 2}`}
            </span>
          )}

          <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11.5px] text-ink-3">
            {work > 0 && (
              <span className="tabular inline-flex items-center gap-1">
                <Icon name="grid" className="h-3.5 w-3.5 text-ink-4" />
                {work} published
              </span>
            )}
            {a.experience != null && (
              <span className="tabular inline-flex items-center gap-1">
                <Icon name="award" className="h-3.5 w-3.5 text-ink-4" />
                {a.experience} yrs
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  A piece of their work
// ═══════════════════════════════════════════════════════════

/**
 * Where a post lives on the public site.
 *
 * The card links to the EXISTING detail page for that post — the associate's
 * page never renders a second copy of a project or product.
 */
const POST_HREF: Record<string, string> = {
  PROJECT: '/projects',
  PRODUCT: '/products',
  ARTISTRY: '/artistry',
  AROUND_US: '/around-us',
  BLOG: '/blog',
}

export function WorkCard({ c, hrefBase }: { c: ContentCard; hrefBase?: string }) {
  const cover = c.media[0]?.url ?? null
  const place = [c.city, c.state].filter(Boolean).join(', ')

  return (
    <li>
      <Link
        href={`${hrefBase ?? POST_HREF[c.type] ?? '/projects'}/${c.slug}`}
        className="card-hover group flex h-full flex-col overflow-hidden"
      >
        <span className="relative block aspect-[4/3] overflow-hidden bg-paper-3">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width:640px) 100vw, 320px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-[11px] text-ink-4" />
          )}
          {c.category && (
            <span className="pill absolute left-2 top-2 bg-ink/85 text-[9.5px] capitalize text-white">
              {c.category.replace(/-/g, ' ')}
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col px-3 py-3">
          <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {c.title}
          </span>
          <span className="mt-auto flex items-center gap-2 pt-2 text-[11.5px] text-ink-3">
            {place && <span className="truncate">{place}</span>}
            {c.year && <span className="tabular shrink-0">· {c.year}</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  A section of their page
// ═══════════════════════════════════════════════════════════

/**
 * A titled band of the associate's work.
 *
 * Renders nothing at all when the associate has none of that kind — an empty
 * "Products" heading over blank space tells the reader the page is broken
 * rather than that this associate does not sell products.
 */
export function WorkSection({
  id,
  title,
  count,
  items,
  viewAllHref,
}: {
  id: string
  title: string
  count: number
  items: ContentCard[]
  viewAllHref: string
}) {
  if (items.length === 0) return null

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-[17px] font-bold text-ink">
          {title}
          <span className="tabular ml-2 text-[13px] font-medium text-ink-3">{count}</span>
        </h2>
        {count > items.length && (
          <Link
            href={viewAllHref}
            className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
          >
            View all {count} →
          </Link>
        )}
      </div>

      <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((c) => (
          <WorkCard key={c.id} c={c} />
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Small shared bits
// ═══════════════════════════════════════════════════════════

/** One of the three fact tiles under the associate's name. */
export function FactTile({
  icon,
  label,
  value,
}: {
  icon: IconName
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-card border border-line bg-paper px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-brand-soft text-brand">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-ink-3">{label}</span>
        <span className="block truncate text-[13px] font-bold text-ink">{value}</span>
      </span>
    </div>
  )
}

/** The row of platform promises the reference design closes every page with. */
export function TrustStrip() {
  const items: { icon: IconName; title: string; sub: string }[] = [
    { icon: 'shield', title: 'Verified Professionals', sub: 'Credentials checked' },
    { icon: 'target', title: 'PACT Territory', sub: 'One associate per PIN code' },
    { icon: 'award', title: 'DESIGNA & DESIGNI', sub: 'Architecture and interior' },
    { icon: 'users', title: 'Direct Contact', sub: 'No middleman' },
  ]

  return (
    <section className="border-y border-line bg-paper-2">
      <div className="container-af grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon name={i.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-bold text-ink">{i.title}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{i.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
