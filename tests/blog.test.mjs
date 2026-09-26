/**
 * The blog block model.
 *
 * Two things must hold, and both are easy to break silently:
 *
 *   1. `normaliseBlocks` (what the builder saves) and `articleBody` (what the
 *      public page reads) must agree. If they drift, an author saves a section
 *      and it vanishes from the article with no error anywhere.
 *   2. Extending the union must not change any block type that already
 *      existed, because four seeded articles are written in the old shape.
 *
 * Pure — no database, no React. Run with `pnpm test:blog`.
 */

import {
  normaliseBlocks, BLOCK_SPECS, emptyBlock,
  parseInline, safeHref, stripMarkdown,
  readingMinutes, blockWords, autoExcerpt,
} from '../src/lib/blog-blocks.ts'
import { articleBody, articleMeta } from '../src/lib/content.ts'

let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name} ${extra}`)
  }
}

const body = (blocks) => articleBody({ body: blocks })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ═══════════════════════════════════════════════════════════
console.log('\n── Every section type survives a round trip ──')

const ONE_OF_EACH = [
  { type: 'lead', text: 'A lead paragraph.' },
  { type: 'para', text: 'A body paragraph.' },
  { type: 'heading', text: 'What is Green Building?', number: 1, level: 2 },
  { type: 'bullets', title: 'Focus', items: ['Energy', 'Water', 'Waste'] },
  { type: 'iconGrid', columns: 3, items: [{ icon: 'star', title: 'Energy', body: 'Less power.' }] },
  { type: 'imageGrid', columns: 3, items: [{ image: 'abc123', caption: 'Green Roofs' }] },
  { type: 'image', image: 'def456', caption: 'A house', alt: 'A house', width: 'full' },
  { type: 'numbered', items: [{ title: 'Plan', body: 'Start here.' }] },
  { type: 'cards', items: [{ icon: 'check', title: 'Lower bills' }] },
  { type: 'pills', items: [{ icon: 'check', text: 'Certified' }] },
  { type: 'quote', text: 'Build a better future.' },
  { type: 'cta', title: 'Talk to us', buttonText: 'Get in touch', buttonUrl: '/consult-nearby' },
]

check(
  `all ${ONE_OF_EACH.length} section types survive normaliseBlocks`,
  normaliseBlocks(ONE_OF_EACH).length === ONE_OF_EACH.length,
  `got ${normaliseBlocks(ONE_OF_EACH).length}`
)

check(
  `all ${ONE_OF_EACH.length} section types survive articleBody`,
  body(ONE_OF_EACH).length === ONE_OF_EACH.length,
  `got ${body(ONE_OF_EACH).length}`
)

check(
  '★ the two parsers agree, block for block',
  same(normaliseBlocks(ONE_OF_EACH), body(ONE_OF_EACH)),
  `\n     save: ${JSON.stringify(normaliseBlocks(ONE_OF_EACH))}\n     read: ${JSON.stringify(body(ONE_OF_EACH))}`
)

check(
  'normalising twice changes nothing',
  same(normaliseBlocks(ONE_OF_EACH), normaliseBlocks(normaliseBlocks(ONE_OF_EACH)))
)

// ═══════════════════════════════════════════════════════════
console.log('\n── The picker offers a working empty for each ──')

check('every spec type is in the union the parser accepts',
  BLOCK_SPECS.every((s) => {
    const e = emptyBlock(s.type)
    return e !== null && e.type === s.type
  }))

check('an untouched empty section is dropped, not saved half-made',
  normaliseBlocks(BLOCK_SPECS.map((s) => s.empty())).length === 0,
  `got ${normaliseBlocks(BLOCK_SPECS.map((s) => s.empty())).length}`)

check('emptyBlock refuses a type that does not exist',
  emptyBlock('nonsense') === null)

// ═══════════════════════════════════════════════════════════
console.log('\n── Rubbish is dropped, never thrown ──')

check('not an array → empty', normaliseBlocks('hello').length === 0)
check('null → empty', normaliseBlocks(null).length === 0)
check('nulls inside the array are skipped',
  normaliseBlocks([null, undefined, 5, { type: 'para', text: 'kept' }]).length === 1)
check('an unknown type is skipped',
  normaliseBlocks([{ type: 'video', src: 'x' }]).length === 0)
check('a paragraph with only whitespace is dropped',
  normaliseBlocks([{ type: 'para', text: '   ' }]).length === 0)
check('an icon grid with no titled items is dropped',
  normaliseBlocks([{ type: 'iconGrid', items: [{ icon: 'star', title: '', body: 'x' }] }]).length === 0)
check('an image grid row with no image is dropped',
  normaliseBlocks([{ type: 'imageGrid', items: [{ image: '', caption: 'c' }, { image: 'ok', caption: 'd' }] }])[0].items.length === 1)
check('★ a call to action with no button is dropped, not rendered dead',
  normaliseBlocks([{ type: 'cta', title: 'Hi', buttonText: '', buttonUrl: '' }]).length === 0)
check('a bullet list keeps only the non-empty lines',
  same(normaliseBlocks([{ type: 'bullets', items: ['a', '  ', '', 'b'] }])[0].items, ['a', 'b']))
check('articleBody survives the same rubbish',
  body([null, { type: 'nope' }, { type: 'para', text: '' }]).length === 0)

// ═══════════════════════════════════════════════════════════
console.log('\n── Column counts ──')

check('a column count the renderer has no class for is dropped',
  normaliseBlocks([{ type: 'imageGrid', columns: 5, items: [{ image: 'a', caption: '' }] }])[0].columns === undefined)
check('2, 3, 4 and 6 are kept',
  [2, 3, 4, 6].every((n) =>
    normaliseBlocks([{ type: 'imageGrid', columns: n, items: [{ image: 'a', caption: '' }] }])[0].columns === n))

// ═══════════════════════════════════════════════════════════
console.log('\n── Headings ──')

check('a heading level outside 2-4 falls back to 2',
  normaliseBlocks([{ type: 'heading', text: 'T', level: 9 }])[0].level === 2)
check('levels 3 and 4 are kept',
  normaliseBlocks([{ type: 'heading', text: 'T', level: 3 }])[0].level === 3 &&
  normaliseBlocks([{ type: 'heading', text: 'T', level: 4 }])[0].level === 4)
check('a zero number is left off entirely',
  normaliseBlocks([{ type: 'heading', text: 'T', number: 0 }])[0].number === undefined)

// ═══════════════════════════════════════════════════════════
console.log('\n── Articles written before the builder still parse ──')

// exactly the shape prisma/seed-content.ts writes — no columns, no level
const LEGACY = [
  { type: 'lead', text: 'Green building is no longer a trend.' },
  { type: 'heading', number: 1, text: 'What is Green Building?' },
  { type: 'iconGrid', items: [{ icon: 'star', title: 'Energy Efficiency', body: 'Less energy.' }] },
  { type: 'imageGrid', title: 'Key Elements', items: [{ image: 'x', caption: 'Green Roofs' }] },
  { type: 'pills', items: [{ icon: 'check', text: 'Lower energy bills' }] },
  { type: 'quote', text: 'Build a better future.' },
]

check('★ every legacy block still parses', body(LEGACY).length === LEGACY.length)
check('a legacy icon grid keeps no column count, so its layout is unchanged',
  body(LEGACY)[2].columns === undefined)
check('a legacy heading keeps its number', body(LEGACY)[1].number === 1)

// ═══════════════════════════════════════════════════════════
console.log('\n── Inline Markdown ──')

check('plain text is one token',
  same(parseInline('hello'), [{ kind: 'text', text: 'hello' }]))
check('**bold** is recognised',
  parseInline('a **b** c').some((t) => t.kind === 'bold' && t.text === 'b'))
check('*italic* is recognised',
  parseInline('a *b* c').some((t) => t.kind === 'italic' && t.text === 'b'))
check('[text](url) is recognised',
  parseInline('see [docs](/legal/terms)').some((t) => t.kind === 'link' && t.href === '/legal/terms'))
check('★ a javascript: link is defused',
  parseInline('[x](javascript:alert(1))').find((t) => t.kind === 'link').href === '#')
check('http, mailto and site paths are kept',
  safeHref('https://a.com') === 'https://a.com' &&
  safeHref('mailto:a@b.com') === 'mailto:a@b.com' &&
  safeHref('/blog') === '/blog')
check('data: urls are defused', safeHref('data:text/html,<script>') === '#')
check('stripMarkdown returns readable text',
  stripMarkdown('**Green** building is [great](/x)') === 'Green building is great')
check('markup is never treated as HTML — the angle brackets stay text',
  parseInline('<script>alert(1)</script>')[0].text === '<script>alert(1)</script>')

// ═══════════════════════════════════════════════════════════
console.log('\n── Reading time and excerpt ──')

check('words are counted across every section type', blockWords(ONE_OF_EACH) > 15)
check('reading time is never zero', readingMinutes([{ type: 'para', text: 'short' }]) === 1)
check('a long article reports more than a minute',
  readingMinutes([{ type: 'para', text: 'word '.repeat(900) }]) > 1)
check('the excerpt comes from the first prose block',
  autoExcerpt(ONE_OF_EACH) === 'A lead paragraph.')
check('an article with no prose has no excerpt',
  autoExcerpt([{ type: 'imageGrid', items: [{ image: 'a', caption: 'b' }] }]) === '')
check('a long excerpt is cut on a word boundary with an ellipsis',
  autoExcerpt([{ type: 'para', text: 'word '.repeat(80) }], 40).endsWith('…'))

// ═══════════════════════════════════════════════════════════
console.log('\n── Article meta ──')

check('missing meta gives usable fallbacks',
  articleMeta(null).readMinutes === 5 && articleMeta(null).categoryLabel === 'Article')
check('the card and thumb images fall back to the hero',
  articleMeta({ heroImage: 'hero.jpg' }).cardImage === 'hero.jpg')
check('SEO fields are read when present',
  articleMeta({ seoTitle: 'T', seoDescription: 'D' }).seoTitle === 'T')
check('tags that are not strings are dropped',
  same(articleMeta({ tags: ['a', 5, null, 'b'] }).tags, ['a', 'b']))

// ═══════════════════════════════════════════════════════════
console.log('\n────────────────────────────────────────────────────')
console.log(`  ${pass} passed · ${fail} failed`)
console.log('────────────────────────────────────────────────────\n')
process.exit(fail ? 1 : 0)
