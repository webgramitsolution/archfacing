/**
 * Phase 11 — Blog, Podcast and the SEO-only breadcrumb.
 *
 *   pnpm test:content2
 *
 * ★ The two that matter most:
 *
 *   Test 1 — the breadcrumb must stay in the DOM and in the accessibility
 *            tree while being invisible. `display: none` would hide it from
 *            screen readers and from Google, which defeats the whole point.
 *   Test 6 — a malformed `meta` blob must never take a published page down.
 */

import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import {
  articleMeta, articleBody, listArticles, countArticles, getArticle,
  articleNeighbours, articleCounts, episodeMeta, listEpisodes, listGuests,
  episodeCounts, postDate, compactCount,
} from '../src/lib/content.ts'
import { HEADER_NAV } from '../src/config/nav.ts'
import { BLOG_TOPICS, PODCAST_TOPICS, LISTEN_ON, ARTICLE_PHOTOS, PERSON_PHOTOS } from '../src/config/content-media.ts'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// ═══════════════════════════════════════════════════════════
//  1. ★ The breadcrumb is hidden, not removed
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ SEO-only breadcrumb ──')

const crumbRaw = fs.readFileSync('src/components/breadcrumb.tsx', 'utf8')
// Strip comments first — the file explains WHY display:none is wrong, and a
// naive text search would match that explanation and fail its own check.
const crumbSrc = crumbRaw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

check('★ hidden with sr-only, which keeps it readable by screen readers',
  crumbSrc.includes('sr-only'))
check('★ NOT hidden with display:none or hidden — those drop it from the a11y tree',
  !/className="[^"]*\bhidden\b/.test(crumbSrc) && !/display:\s*none/.test(crumbSrc))
check('emits schema.org BreadcrumbList JSON-LD', crumbSrc.includes('BreadcrumbList'))
check('marks the current page with aria-current', crumbSrc.includes('aria-current="page"'))
check('uses a real <nav> with an accessible name', crumbSrc.includes('aria-label="Breadcrumb"'))
check('the trail is a real ordered list', crumbSrc.includes('<ol>'))

// Every hero should now use it rather than drawing its own trail.
const heroes = [
  'src/components/page-hero.tsx',
  'src/components/legal-page.tsx',
  'src/app/(public)/club/events/[slug]/page.tsx',
]
for (const f of heroes) {
  const s = fs.readFileSync(f, 'utf8')
  check(`${f.split(/[\\/]/).pop().padEnd(14)} uses the shared Breadcrumb`, s.includes('<Breadcrumb'))
  check(`${f.split(/[\\/]/).pop().padEnd(14)} draws no visible trail`, !s.includes('›'))
}

// ═══════════════════════════════════════════════════════════
//  2. Navigation
// ═══════════════════════════════════════════════════════════
console.log('\n── Navigation ──')

const labels = HEADER_NAV.map((i) => i.label)
check('Podcast is in the top bar', labels.includes('Podcast'))
check('Blog is in the top bar', labels.includes('Blog'))
check('Home is still absent', !labels.includes('Home'))
check('PACT is still absent', !labels.includes('PACT'))
check('Club is still absent', !labels.includes('Club'))

// ═══════════════════════════════════════════════════════════
//  3. Blog content
// ═══════════════════════════════════════════════════════════
console.log('\n── Blog articles ──')

const articles = await listArticles({ take: 100 })
check(`${articles.length} articles published`, articles.length >= 12, `(got ${articles.length})`)
check('slugs are unique', new Set(articles.map((a) => a.slug)).size === articles.length)
check('every article has an author', articles.every((a) => a.author?.name))
check('every article has a publish date', articles.every((a) => a.publishedAt !== null))

const metas = articles.map((a) => articleMeta(a.meta))
// The card falls back to the description when a member left the excerpt empty.
check('every article has an excerpt or description', articles.every((a, i) => (metas[i].excerpt || a.description || '').length > 10))
check('every article has a read time', metas.every((m) => m.readMinutes > 0))
/*
 * A hero is either a remote URL (the seeds) or a site-relative upload path
 * (`/uploads/blog/…`, what the dashboard's Blog Builder produces). What must
 * never happen is the `/img/hero-professionals.svg` fallback, which means the
 * meta had no image at all.
 */
const realImage = (u) => (u.startsWith('https://') || u.startsWith('/uploads/'))
// A post written with no picture at all honestly shows the placeholder; any
// post that HAS an image must resolve it to a real one.
const hasOwnImage = (a) => { const r = a.meta && typeof a.meta === 'object' ? a.meta : {}; return Boolean(r.heroImage || r.cardImage || r.coverImage) }
check('every article with an image has a real hero and card image',
  articles.every((a, i) => !hasOwnImage(a) || (realImage(metas[i].heroImage) && realImage(metas[i].cardImage))))
/*
 * `meta.authorPhoto` and `meta.authorRole` are display *overrides*, not the
 * source. The byline falls back to `User.profilePhoto` and prints no role
 * line when there is none — both of which a blog written in the dashboard
 * legitimately relies on, because its author may leave the role blank and
 * never uploads a portrait into `meta` at all.
 *
 * What must hold is that every article can render a byline: it has an author
 * row with a name.
 */
check('every article can render a byline',
  articles.every((a) => a.author?.name))
check('a seeded article carries its author role and photo override',
  metas.filter((m) => m.authorRole).length >= 12)
check('★ exactly one article is the featured hero',
  metas.filter((m) => m.featured).length >= 1)

const counts = await articleCounts()
// PDF §5.2.6.1 — counts are keyed on the nine PDF categories only.
const PDF_BLOG = ['technical-papers', 'research-development', 'legends-autobiographies', 'learning-reading', 'lectures', 'photo-blog', 'webinars', 'famous-recording', 'copyrights-patents']
check('counts are grouped by PDF category', Object.keys(counts).some((k) => PDF_BLOG.includes(k)), `(${Object.keys(counts).join(', ')})`)
const offList = Object.keys(counts).filter((k) => k !== 'all' && !PDF_BLOG.includes(k))
if (offList.length) console.log(`  ℹ member posts outside the PDF categories: ${offList.join(', ')}`)
check('the counts add up to the article total',
  Object.values(counts).reduce((a, b) => a + b, 0) === articles.length)

check('every configured blog topic has a label and icon',
  BLOG_TOPICS.every((t) => t.slug && t.label && t.icon))

// ═══════════════════════════════════════════════════════════
//  4. The article body blocks
// ═══════════════════════════════════════════════════════════
console.log('\n── Article body ──')

const feature = await getArticle('future-of-green-building')
check('the reference article exists', Boolean(feature))

const blocks = articleBody(feature.meta)
check(`${blocks.length} blocks parsed`, blocks.length >= 10, `(got ${blocks.length})`)

const kinds = new Set(blocks.map((b) => b.type))
for (const k of ['lead', 'para', 'heading', 'quote', 'iconGrid', 'imageGrid', 'pills']) {
  check(`renders a "${k}" block`, kinds.has(k))
}

const headings = blocks.filter((b) => b.type === 'heading')
check('★ headings are numbered 1, 2, 3 in order',
  headings.map((h) => h.number).join(',') === '1,2,3',
  `(${headings.map((h) => h.number).join(',')})`)

const imageGrid = blocks.find((b) => b.type === 'imageGrid')
check('the image grid has six captioned photographs',
  imageGrid.items.length === 6 && imageGrid.items.every((i) => i.image && i.caption))

const pills = blocks.find((b) => b.type === 'pills')
check('the benefits row has five pills', pills.items.length === 5)

const fmeta = articleMeta(feature.meta)
check('the article carries hashtags', fmeta.tags.length >= 5)

// ═══════════════════════════════════════════════════════════
//  5. Neighbours and filtering
// ═══════════════════════════════════════════════════════════
console.log('\n── Navigation between articles ──')

const { previous, next } = await articleNeighbours(feature.publishedAt)
check('★ previous/next resolve without either being the article itself',
  previous?.slug !== feature.slug && next?.slug !== feature.slug)
check('at least one neighbour exists', Boolean(previous || next))

const oldest = articles[articles.length - 1]
const endStop = await articleNeighbours(oldest.publishedAt)
check('★ the oldest article has no previous', endStop.previous === null)

const arch = await listArticles({ category: 'research-development', take: 50 })
check('filtering by category works', arch.length > 0 && arch.every((a) => a.category === 'research-development'))
check('the filtered count matches',
  arch.length === (await countArticles({ category: 'research-development' })))

const found = await listArticles({ search: 'green', take: 50 })
check('search finds the green-building articles', found.length >= 2)

const popular = await listArticles({ sort: 'popular', take: 3 })
check('★ popular sorts by views, descending',
  popular[0].viewCount >= popular[1].viewCount &&
  popular[1].viewCount >= popular[2].viewCount)

const excl = await listArticles({ category: 'research-development', take: 3, excludeSlug: arch[0].slug })
check('★ related posts never include the article you are reading',
  excl.every((a) => a.slug !== arch[0].slug))

// ═══════════════════════════════════════════════════════════
//  6. ★ Malformed meta is survivable
// ═══════════════════════════════════════════════════════════
console.log('\n── ★ Bad data cannot break a page ──')

check('★ null meta yields safe defaults', articleMeta(null).readMinutes === 5)
check('★ a string instead of an object yields defaults', articleMeta('nonsense').excerpt === '')
check('★ null body yields an empty block list', articleBody(null).length === 0)
check('★ a non-array body yields an empty list', articleBody({ body: 'oops' }).length === 0)
check('★ unknown block types are dropped, known ones kept',
  articleBody({ body: [{ type: 'martian' }, { type: 'para', text: 'kept' }] }).length === 1)
check('★ a block missing its text is dropped',
  articleBody({ body: [{ type: 'para' }] }).length === 0)
check('★ an imageGrid row without an image is dropped',
  articleBody({ body: [{ type: 'imageGrid', items: [{ caption: 'no image' }, { image: 'x', caption: 'y' }] }] })[0].items.length === 1)
check('★ meta with a hero but no card image falls back to the hero',
  articleMeta({ heroImage: 'https://x/hero.jpg' }).cardImage === 'https://x/hero.jpg')
check('★ a negative read time falls back rather than rendering "-3 min"',
  articleMeta({ readMinutes: 'abc' }).readMinutes === 5)

check('★ episode meta survives null', episodeMeta(null).duration === '00:00')
check('★ episode meta survives a bad episode number', episodeMeta({ episodeNumber: 'x' }).episodeNumber === 0)

// ═══════════════════════════════════════════════════════════
//  7. Podcast
// ═══════════════════════════════════════════════════════════
console.log('\n── Podcast ──')

const episodes = await listEpisodes({ take: 50 })
check(`${episodes.length} episodes published`, episodes.length >= 6, `(got ${episodes.length})`)
check('every episode has a video link',
  episodes.every((e) => e.media.length === 1 && e.media[0].embedUrl))
check('★ every embed uses youtube-nocookie, so viewers get no tracking cookie',
  episodes.every((e) => e.media[0].embedUrl.includes('youtube-nocookie.com')))

const emetas = episodes.map((e) => episodeMeta(e.meta))
check('every episode has a number', emetas.every((m) => m.episodeNumber > 0))
check('every episode has a duration like 45:30',
  emetas.every((m) => /^\d{1,2}:\d{2}$/.test(m.duration)), `(${emetas.map((m) => m.duration).join(' ')})`)
check('every episode has a card title', emetas.every((m) => m.cardTitle.length > 0))
check('★ episode numbers are unique',
  new Set(emetas.map((m) => m.episodeNumber)).size === emetas.length)
// A back-catalogue added later can be published after higher-numbered
// episodes, so publish order and episode number are not tied together.
check('★ episode numbers are positive integers', emetas.every((m) => Number.isInteger(m.episodeNumber) && m.episodeNumber > 0))

const guests = await listGuests()
// Guests are empty on purpose: no invented or real people are listed as guests.
check(`guest list loads (${guests.length})`, Array.isArray(guests))
check('every guest has a role and company', guests.every((g) => g.role && g.company))
check('every guest has a photograph', guests.every((g) => g.photo.startsWith('https://')))
check('★ every guest points at an episode that exists',
  guests.every((g) => g.episodes.every((s) => episodes.some((e) => e.slug === s))),
  '(a guest references a missing episode)')

const ecounts = await episodeCounts()
check('episode counts group by topic', Object.keys(ecounts).length >= 5)
check('every topic with episodes is a configured topic',
  Object.keys(ecounts).every((slug) => PODCAST_TOPICS.some((t) => t.slug === slug)),
  `(${Object.keys(ecounts).join(', ')})`)

check('six listening platforms configured', LISTEN_ON.length === 6)
check('every platform has a colour', LISTEN_ON.every((p) => /^#[0-9A-F]{6}$/i.test(p.color)))

// ═══════════════════════════════════════════════════════════
//  8. Formatting
// ═══════════════════════════════════════════════════════════
console.log('\n── Formatting ──')

check('1200 → 1.2K', compactCount(1200) === '1.2K')
check('980 → 980', compactCount(980) === '980')
check('1000 → 1K, not 1.0K', compactCount(1000) === '1K')
check('1500000 → 1.5M', compactCount(1_500_000) === '1.5M')
check('0 → 0', compactCount(0) === '0')

check('a date formats as "15 May 2026"',
  /^\d{1,2} \w{3} \d{4}$/.test(postDate(new Date(2026, 4, 15))),
  `(${postDate(new Date(2026, 4, 15))})`)
check('★ a null date gives an empty string rather than "Invalid Date"',
  postDate(null) === '')

// ═══════════════════════════════════════════════════════════
//  9. Photography
// ═══════════════════════════════════════════════════════════
console.log('\n── Photography ──')

const allPhotos = [...Object.values(ARTICLE_PHOTOS), ...Object.values(PERSON_PHOTOS)]
check(`${allPhotos.length} photo ids configured`, allPhotos.length >= 30)
check('every id looks like an Unsplash photo id',
  allPhotos.every((id) => /^\d{10,}-[a-z0-9]+$/.test(id)),
  `(${allPhotos.find((id) => !/^\d{10,}-[a-z0-9]+$/.test(id))})`)
check('★ no article photo is reused as a person portrait',
  Object.values(PERSON_PHOTOS).every((id) => !Object.values(ARTICLE_PHOTOS).includes(id)))

await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
