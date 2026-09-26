import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from './ui'
import { getStringSetting } from '@/lib/settings'
import { unsplash } from '@/config/club-media'
import { BLOG_TOPICS } from '@/config/content-media'
import {
  articleMeta, postDate, compactCount,
  type ArticleRow, type Block,
} from '@/lib/content'
import { parseInline } from '@/lib/blog-blocks'
import { cn } from '@/lib/utils'

/**
 * The pieces the two Blog pages share.
 *
 * Both the index and the article page carry the same sidebar cards, the same
 * article-card shape and the same social buttons, so they live here once
 * rather than being written out twice and drifting apart.
 *
 * Everything in this file is a Server Component — the only client code the
 * Blog uses is <NewsletterForm />, which already existed.
 */

// ═══════════════════════════════════════════════════════════
//  Photography
// ═══════════════════════════════════════════════════════════

const FALLBACK_IMAGE = '/img/hero-professionals.svg'

/**
 * Article images are stored two different ways: `meta.heroImage` and friends
 * are already full Unsplash URLs, while the images inside an `imageGrid` block
 * are bare photo ids. This accepts either.
 */
export function photoSrc(value: string, size: { w: number; h?: number }): string {
  if (!value) return FALLBACK_IMAGE
  if (value.startsWith('http') || value.startsWith('/')) return value
  return unsplash(value, size)
}

// ═══════════════════════════════════════════════════════════
//  Small glyphs the shared Icon set does not carry
// ═══════════════════════════════════════════════════════════

export type GlyphName =
  | 'calendar' | 'eye' | 'bookmark' | 'building' | 'dots'
  | 'refresh' | 'quote' | 'left' | 'right' | 'pen'

const GLYPHS: Record<GlyphName, React.ReactNode> = {
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>),
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />,
  building: (<><path d="M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M15 21V11h4a2 2 0 012 2v8" /><path d="M8 7h3M8 11h3M8 15h3" /></>),
  dots: (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  refresh: (<><path d="M20.5 12a8.5 8.5 0 11-2.6-6.1" /><path d="M20.5 3.5v5h-5" /></>),
  quote: <path d="M9 7H5a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3M20 7h-4a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3" />,
  left: <path d="M19 12H5M11 6l-6 6 6 6" />,
  right: <path d="M5 12h14M13 6l6 6-6 6" />,
  pen: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>),
}

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('h-[18px] w-[18px]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </svg>
  )
}

/** The small blue tick beside a verified author's name. */
export { VerifiedTick } from './verified-badge'

// ═══════════════════════════════════════════════════════════
//  Social buttons
// ═══════════════════════════════════════════════════════════

/**
 * Brand marks drawn in the same single-stroke style as the rest of the site,
 * rather than the companies' own logo artwork.
 */
const MARKS = {
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
  instagram: 'M16 11.4A4 4 0 1112.6 8 4 4 0 0116 11.4zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z',
  linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM6 9H2v12h4zM4 2a2 2 0 100 4 2 2 0 000-4z',
  youtube: 'M22.5 6.4a2.8 2.8 0 00-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4a2.8 2.8 0 00-2 2A29 29 0 001 12a29 29 0 00.5 5.6 2.8 2.8 0 002 2C5.2 20 12 20 12 20s6.8 0 8.5-.4a2.8 2.8 0 002-2A29 29 0 0023 12a29 29 0 00-.5-5.6zM9.8 15.3V8.7l5.7 3.3z',
  pinterest: 'M12 21a9 9 0 10-9-9 9 9 0 009 9zM10.4 20.6l1.8-6.6M9.4 10.6a2.8 2.8 0 015.5.8c0 2.3-1.4 4-3.2 4a1.9 1.9 0 01-1.8-1.2',
  x: 'M4.6 4.6l14.8 14.8M19.4 4.6L4.6 19.4',
  whatsapp: 'M20.6 11.7a8.4 8.4 0 01-12.6 7.2L3.4 20.6l1.8-4.4A8.4 8.4 0 1120.6 11.7zM9.2 8.6a1.4 1.4 0 011.5.6l.6 1a.7.7 0 010 .8l-.5.6a7 7 0 002.9 2.9l.6-.5a.7.7 0 01.8 0l1 .6a1.4 1.4 0 01.6 1.5 2 2 0 01-2.3 1.3 9 9 0 01-6.5-6.5 2 2 0 011.3-2.3z',
} as const

type Mark = keyof typeof MARKS

/** Where ArchFacing is on social — the URLs admins set under Website Settings → Social Media. */
const FOLLOW: { key: 'social.facebook' | 'social.instagram' | 'social.linkedin' | 'social.twitter'; label: string; color: string; mark: Mark }[] = [
  { key: 'social.facebook', label: 'Facebook', color: '#1877F2', mark: 'facebook' },
  { key: 'social.instagram', label: 'Instagram', color: '#E4405F', mark: 'instagram' },
  { key: 'social.linkedin', label: 'LinkedIn', color: '#0A66C2', mark: 'linkedin' },
  { key: 'social.twitter', label: 'X', color: '#111111', mark: 'x' },
]

function SocialButton({
  label,
  href,
  color,
  mark,
  external,
  compact,
}: {
  label: string
  href: string
  color: string
  mark: Mark
  external?: boolean
  /** The sidebar size — five buttons have to fit a 320px column. */
  compact?: boolean
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      style={{ backgroundColor: color }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-85',
        compact ? 'h-7 w-7' : 'h-9 w-9'
      )}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={compact ? 'h-[13px] w-[13px]' : 'h-[17px] w-[17px]'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MARKS[mark]} />
      </svg>
    </a>
  )
}

export async function FollowUsCard() {
  const links = (await Promise.all(FOLLOW.map(async (s) => ({ ...s, href: (await getStringSetting(s.key)).trim() }))))
    .filter((s) => /^https?:\/\//.test(s.href))
  // No profiles configured yet — show nothing rather than dead icons.
  if (links.length === 0) return null
  return (
    <section className="card p-5">
      <h2 className="font-display text-[15px] font-bold text-ink">Follow Us</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
        Stay connected with us on social platforms.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {links.map((s) => (
          <SocialButton key={s.label} label={s.label} href={s.href} color={s.color} mark={s.mark} external />
        ))}
      </div>
    </section>
  )
}

/**
 * The share row on an article — these are real share endpoints, with the
 * article URL and title encoded into each one.
 */
export function ShareRow({
  url,
  title,
  compact,
}: {
  url: string
  title: string
  /** Smaller buttons that wrap, for the narrow sidebar card. */
  compact?: boolean
}) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)

  const links: { label: string; href: string; color: string; mark: Mark }[] = [
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: '#1877F2', mark: 'facebook' },
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, color: '#111111', mark: 'x' },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, color: '#0A66C2', mark: 'linkedin' },
    { label: 'Share on Pinterest', href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`, color: '#E60023', mark: 'pinterest' },
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, color: '#25D366', mark: 'whatsapp' },
  ]

  return (
    // Wraps rather than scrolls — a scrollbar under five buttons is more
    // furniture than the buttons themselves.
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] font-semibold text-ink-3">Share:</span>
      {links.map((s) => (
        <SocialButton key={s.label} {...s} external compact={compact} />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Sidebar cards
// ═══════════════════════════════════════════════════════════

/** Every blog category with its live article count; the open one in orange. */
export function CategoriesCard({
  counts,
  active,
}: {
  counts: Record<string, number>
  active?: string
}) {
  return (
    <section className="card bg-paper p-5">
      <h2 className="font-display text-[13px] font-bold text-ink">Categories</h2>

      <ul className="mt-3.5 flex flex-col">
        {BLOG_TOPICS.map((t) => {
          const on = t.slug === active
          return (
            <li
              key={t.slug}
              className={cn(!on && 'border-b border-line-soft last:border-b-0')}
            >
              <Link
                href={`/blog?category=${t.slug}`}
                className={cn(
                  'flex items-center justify-between gap-3 text-[13px] transition-colors',
                  // the selected row is a filled band across the card, as the
                  // reference draws it — the border is dropped so the fill
                  // reads as one shape rather than a boxed-in row
                  on
                    ? '-mx-2 rounded-lg bg-brand-soft px-2 py-2.5 font-semibold text-brand'
                    : 'py-2.5 text-ink-2 hover:text-brand'
                )}
              >
                <span className="min-w-0 truncate">{t.label}</span>
                <span
                  className={cn(
                    'tabular shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold',
                    on ? 'bg-brand-soft text-brand' : 'bg-paper-3 text-ink-3'
                  )}
                >
                  {counts[t.slug] ?? 0}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <Link
        href="/blog"
        className="btn-outline mt-4 w-full border-brand text-[13px] text-brand hover:bg-brand-soft"
      >
        View All Categories
        <Glyph name="right" className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

/** A thumbnail + title + meta row, used by Popular Posts and Related Posts. */
export function MiniPost({ post }: { post: ArticleRow }) {
  const m = articleMeta(post.meta)

  return (
    <li className="border-b border-line-soft pb-3.5 last:border-b-0 last:pb-0">
      <Link href={`/blog/${post.slug}`} className="group flex min-w-0 gap-3">
        <span className="relative h-[54px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
          <Image
            src={photoSrc(m.thumbImage, { w: 160, h: 120 })}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>
          <span className="mt-1 block text-[11.5px] text-ink-3">
            {postDate(post.publishedAt)}
          </span>
        </span>
      </Link>
    </li>
  )
}

export function PopularPostsCard({ posts }: { posts: ArticleRow[] }) {
  if (posts.length === 0) return null

  return (
    <section className="card p-5">
      <h2 className="font-display text-[15px] font-bold text-ink">Popular Posts</h2>
      <ul className="mt-3.5 flex flex-col gap-3.5">
        {posts.map((p) => (
          <MiniPost key={p.slug} post={p} />
        ))}
      </ul>
      {/* centred under the list, as the reference draws it */}
      <Link
        href="/blog?sort=popular"
        className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
      >
        View All Popular Posts
        <Glyph name="right" className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Article card — the 3-up grid on the index
// ═══════════════════════════════════════════════════════════

/**
 * The eyebrow colour on a card, per category.
 *
 * The reference runs most of them orange and a couple blue, which reads as a
 * quiet way of telling one subject from another down a grid of similar cards.
 * Kept to three of the theme's own colours rather than a new palette — the
 * guide reserves orange for action and highlight, and eight competing hues
 * would be exactly the drift it warns about.
 */
const CATEGORY_TONE: Record<string, string> = {
  'technical-papers': 'text-info',
  'research-development': 'text-ok',
  'legends-autobiographies': 'text-brand',
  'learning-reading': 'text-info',
  lectures: 'text-ink-2',
  'photo-blog': 'text-brand',
  webinars: 'text-info',
  'famous-recording': 'text-ink-2',
  'copyrights-patents': 'text-ok',
}

export function ArticleCard({ post }: { post: ArticleRow }) {
  const m = articleMeta(post.meta)

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="flex min-w-0 flex-1 flex-col">
        <span className="relative block aspect-[3/2] w-full overflow-hidden bg-paper-3">
          <Image
            src={photoSrc(m.cardImage, { w: 600, h: 400 })}
            alt=""
            fill
            sizes="(min-width:1280px) 300px, (min-width:640px) 45vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {m.featured && (
            <span className="absolute left-3 top-3 rounded-pill bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              Featured
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col p-4">
          <span
            className={cn(
              'text-[11px] font-bold uppercase tracking-[0.08em]',
              CATEGORY_TONE[post.category] ?? 'text-brand'
            )}
          >
            {m.categoryLabel}
          </span>

          <span className="mt-1.5 line-clamp-2 font-display text-[15.5px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>

          <span className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
            {m.excerpt || post.description}
          </span>

          <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
            <span>{postDate(post.publishedAt)}</span>
            <span aria-hidden>·</span>
            <span>{compactCount(post.viewCount)} views</span>
          </span>
        </span>
      </Link>

      <div className="mt-auto flex items-center gap-2.5 border-t border-line-soft px-4 py-3">
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-paper-3">
          {(m.authorPhoto || post.author.profilePhoto) && (
            <Image
              src={photoSrc(m.authorPhoto || post.author.profilePhoto || '', { w: 96, h: 96 })}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold text-ink">
            {post.author.name ?? 'ArchFacing'}
          </span>
          {m.authorRole && (
            <span className="block truncate text-[11px] text-ink-3">{m.authorRole}</span>
          )}
        </span>
        {/* Decorative in the design — saving an article is not built yet. */}
        <Glyph name="bookmark" className="h-4 w-4 shrink-0 text-ink-4" />
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  Feature strips
// ═══════════════════════════════════════════════════════════

export function FeatureStrip({
  items,
  columns = 4,
}: {
  items: { icon: IconName; title: string; body: string }[]
  /** 4 on the index, 5 for the trust strip under an article. */
  columns?: 4 | 5
}) {
  return (
    <ul
      className={cn(
        'grid gap-4 sm:grid-cols-2',
        columns === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
      )}
    >
      {items.map((f) => (
        <li key={f.title} className="card flex min-w-0 items-center gap-3.5 p-4">
          <span className="chip-icon shrink-0 border border-brand-border bg-brand-soft text-brand">
            <Icon name={f.icon} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-bold text-ink">{f.title}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{f.body}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════
//  The article body
// ═══════════════════════════════════════════════════════════

/**
 * The light Markdown an author can write inside any text block.
 *
 * Real elements, built from tokens — nothing here goes near
 * `dangerouslySetInnerHTML`, so a `<script>` typed into a blog body is just
 * the characters `<script>` on the page. `safeHref` has already reduced any
 * link to http(s), mailto or a same-site path.
 */
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((t, i) => {
        if (t.kind === 'bold') {
          return (
            <strong key={i} className="font-semibold text-ink">
              {t.text}
            </strong>
          )
        }
        if (t.kind === 'italic') return <em key={i}>{t.text}</em>
        if (t.kind === 'link') {
          const external = t.href.startsWith('http')
          return (
            <a
              key={i}
              href={t.href}
              className="font-semibold text-brand underline underline-offset-2 hover:text-brand-hover"
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {t.text}
            </a>
          )
        }
        return t.text
      })}
    </>
  )
}

/**
 * Column counts a grid block may choose.
 *
 * Written out in full because Tailwind builds its stylesheet by scanning the
 * source for literal class names — `grid-cols-${n}` produces no CSS at all.
 * `content.ts` only ever parses a column count that appears as a key here.
 */
const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

/** Renders every block variant `articleBody()` can produce, in order. */
/** md+ column count for a benefit-card row, keyed by how many cards it has. */
const CARD_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}

export function ArticleBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-7 flex flex-col gap-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'lead':
            return (
              <p key={i} className="text-[16px] font-semibold leading-[1.7] text-ink">
                <Inline text={b.text} />
              </p>
            )

          case 'para':
            return (
              <p key={i} className="text-[14.5px] leading-[1.8] text-ink-2">
                <Inline text={b.text} />
              </p>
            )

          case 'heading': {
            // H2/H3/H4 as the author chose; the size steps down with the level
            const Tag = (b.level === 4 ? 'h4' : b.level === 3 ? 'h3' : 'h2') as 'h2' | 'h3' | 'h4'
            return (
              <Tag
                key={i}
                className={cn(
                  'mt-3 font-display font-bold leading-snug tracking-tight text-ink',
                  b.level === 4 ? 'text-[15.5px]' : b.level === 3 ? 'text-[17.5px]' : 'text-[20px]'
                )}
              >
                {b.number ? `${b.number}. ` : ''}
                {b.text}
              </Tag>
            )
          }

          case 'quote':
            return (
              <blockquote
                key={i}
                className="relative rounded-card border-l-[3px] border-brand bg-brand-soft px-5 py-4"
              >
                <Glyph name="quote" className="mb-2 h-5 w-5 text-brand" />
                <p className="text-[14.5px] font-medium italic leading-relaxed text-ink-2">
                  <Inline text={b.text} />
                </p>
              </blockquote>
            )

          case 'bullets':
            return (
              <section key={i} className="min-w-0">
                {b.title && (
                  <h3 className="mb-3 font-display text-[17px] font-bold text-ink">{b.title}</h3>
                )}
                <ul className="flex flex-col gap-2">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-2.5 text-[14.5px] leading-[1.7] text-ink-2">
                      {/* a brand dot rather than a browser bullet, to match
                          `.prose-legal` elsewhere on the site */}
                      <span
                        aria-hidden
                        className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-brand"
                      />
                      <span className="min-w-0">
                        <Inline text={it} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )

          case 'numbered':
            return (
              <section key={i} className="min-w-0">
                {b.title && (
                  <h3 className="mb-3 font-display text-[17px] font-bold text-ink">{b.title}</h3>
                )}
                <ol className="flex flex-col gap-4">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3.5">
                      <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-[13px] font-bold text-brand">
                        {j + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        {it.title && (
                          <span className="block font-display text-[15px] font-bold text-ink">
                            {it.title}
                          </span>
                        )}
                        {it.body && (
                          <span className="mt-1 block text-[14px] leading-[1.75] text-ink-2">
                            <Inline text={it.body} />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )

          case 'image':
            return (
              <figure key={i} className={cn('min-w-0', b.width === 'contained' && 'mx-auto max-w-[560px]')}>
                <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-card bg-paper-3">
                  <Image
                    src={photoSrc(b.image, { w: 1200, h: 675 })}
                    alt={b.alt ?? b.caption ?? ''}
                    fill
                    sizes="(min-width:1024px) 760px, 100vw"
                    className="object-cover"
                  />
                </span>
                {b.caption && (
                  <figcaption className="mt-2 text-center text-[12.5px] text-ink-3">
                    {b.caption}
                  </figcaption>
                )}
              </figure>
            )

          case 'cards':
            return (
              <section key={i} className="min-w-0">
                {b.title && (
                  <h3 className="mb-4 font-display text-[17px] font-bold text-ink">{b.title}</h3>
                )}
                {/* One row on tablet and up — the columns follow the number of
                    cards (up to six), so four cards sit four across at 768. */}
                <ul className={cn('grid grid-cols-2 gap-3', CARD_COLS[Math.min(b.items.length, 6)] ?? 'md:grid-cols-6')}>
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      className="flex min-w-0 flex-col items-center gap-2.5 rounded-card border border-brand-border bg-brand-soft px-3 py-4 text-center"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-paper-2 text-brand">
                        <Icon name={it.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="text-[12.5px] font-bold leading-snug text-ink">
                        {it.title}
                      </span>
                      {it.body && (
                        <span className="text-[11.5px] leading-snug text-ink-3">{it.body}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )

          case 'cta':
            return (
              <section
                key={i}
                className="rounded-card border border-brand-border bg-brand-soft px-5 py-5 text-center sm:px-7 sm:py-6"
              >
                <h3 className="font-display text-[18px] font-bold text-ink">{b.title}</h3>
                {b.body && (
                  <p className="mx-auto mt-1.5 max-w-[520px] text-[13.5px] leading-relaxed text-ink-2">
                    <Inline text={b.body} />
                  </p>
                )}
                <Link href={b.buttonUrl} className="btn-primary mt-4">
                  {b.buttonText}
                </Link>
              </section>
            )

          case 'iconGrid':
            return (
              <section key={i} className="min-w-0">
                {b.title && (
                  <h3 className="mb-4 font-display text-[17px] font-bold text-ink">{b.title}</h3>
                )}
                <ul
                  className={cn(
                    'grid gap-5',
                    // no explicit count keeps the original 1/2/3 ramp, so every
                    // article written before the builder existed is unchanged
                    b.columns ? GRID_COLS[b.columns] : 'sm:grid-cols-2 lg:grid-cols-3'
                  )}
                >
                  {b.items.map((it) => (
                    <li key={it.title} className="flex min-w-0 flex-col items-center text-center">
                      {/* the blueprint centres each item under a round,
                          thin-outlined badge — the column is what ties the
                          icon to its own title in a six-across row */}
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-border bg-paper-2 text-brand">
                        <Icon name={it.icon} className="h-5 w-5" />
                      </span>
                      <span className="mt-2.5 text-[13.5px] font-bold text-ink">{it.title}</span>
                      <span className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                        {it.body}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )

          case 'imageGrid':
            return (
              <section key={i} className="min-w-0">
                {b.title && (
                  <h3 className="mb-4 font-display text-[17px] font-bold text-ink">{b.title}</h3>
                )}
                <ul className={cn('grid gap-4', GRID_COLS[b.columns ?? 3])}>
                  {b.items.map((it, j) => (
                    <li key={`${it.image}-${j}`} className="min-w-0">
                      <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-card bg-paper-3">
                        <Image
                          src={photoSrc(it.image, { w: 500, h: 375 })}
                          alt={it.caption}
                          fill
                          sizes="(min-width:640px) 240px, 45vw"
                          className="object-cover"
                        />
                      </span>
                      {it.caption && (
                        <span className="mt-2 block text-center text-[12.5px] font-semibold text-ink-2">
                          {it.caption}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )

          case 'pills':
            return (
              <ul key={i} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {b.items.map((it) => (
                  <li
                    key={it.text}
                    className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-brand-border bg-brand-soft px-3 py-4 text-center"
                  >
                    <Icon name={it.icon} className="h-5 w-5 shrink-0 text-brand" />
                    <span className="text-[12px] font-semibold leading-snug text-ink-2">
                      {it.text}
                    </span>
                  </li>
                ))}
              </ul>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
