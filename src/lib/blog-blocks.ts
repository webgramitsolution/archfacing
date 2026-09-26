/**
 * The section catalogue behind the dashboard's Blog Builder.
 *
 * Pure — no Prisma, no React, no server-only imports — so that
 * `tests/blog.test.mjs` can import it directly and assert on it without
 * rendering anything. `src/lib/competition-entry-status.ts` is the same
 * arrangement and exists for the same reason.
 *
 * The builder edits a `Block[]`; `saveBlogAction` runs the same array through
 * `normaliseBlocks()` before it is written, so what the author sees and what
 * the public page renders cannot diverge.
 */

import type { IconName } from '@/components/ui'
import type { Block, BlockType } from './content'

// ═══════════════════════════════════════════════════════════
//  The catalogue
// ═══════════════════════════════════════════════════════════

export type BlockSpec = {
  type: BlockType
  label: string
  /** one line in the "Add Section" picker */
  hint: string
  /** an IconName, kept as a plain string so this file imports no components */
  icon: string
  /** A brand-new section of this type, ready to edit. */
  empty: () => Block
}

/**
 * Order matters — this is the order of the picker, most-used first.
 */
export const BLOCK_SPECS: BlockSpec[] = [
  {
    type: 'heading',
    label: 'Heading',
    hint: 'A section title, optionally numbered — "1. What is Green Building?"',
    icon: 'file',
    empty: () => ({ type: 'heading', text: '', level: 2 }),
  },
  {
    type: 'para',
    label: 'Paragraph',
    hint: 'Body text, with bold, italic and links',
    icon: 'file',
    empty: () => ({ type: 'para', text: '' }),
  },
  {
    type: 'lead',
    label: 'Lead paragraph',
    hint: 'The larger opening paragraph, usually the first thing after the photo',
    icon: 'file',
    empty: () => ({ type: 'lead', text: '' }),
  },
  {
    type: 'bullets',
    label: 'Bullet points',
    hint: 'A simple list — one point per line',
    icon: 'check',
    empty: () => ({ type: 'bullets', items: [''] }),
  },
  {
    type: 'iconGrid',
    label: 'Icon + Text',
    hint: 'Small information blocks: icon, title and a line of description',
    icon: 'grid',
    empty: () => ({
      type: 'iconGrid',
      columns: 3,
      items: [{ icon: 'star', title: '', body: '' }],
    }),
  },
  {
    type: 'imageGrid',
    label: 'Image grid',
    hint: 'Two, three or four pictures across, each with a caption',
    icon: 'grid',
    empty: () => ({ type: 'imageGrid', columns: 3, items: [{ image: '', caption: '' }] }),
  },
  {
    type: 'image',
    label: 'Single image',
    hint: 'One picture with a caption',
    icon: 'box',
    empty: () => ({ type: 'image', image: '', width: 'full' }),
  },
  {
    type: 'cards',
    label: 'Feature cards',
    hint: 'A row of benefits — icon and a short title each',
    icon: 'star',
    empty: () => ({ type: 'cards', items: [{ icon: 'check', title: '' }] }),
  },
  {
    type: 'numbered',
    label: 'Numbered list',
    hint: 'Numbered points, each with its own heading and text',
    icon: 'settings',
    empty: () => ({ type: 'numbered', items: [{ title: '', body: '' }] }),
  },
  {
    type: 'quote',
    label: 'Quote / highlight',
    hint: 'A statement set apart from the text',
    icon: 'alert',
    empty: () => ({ type: 'quote', text: '' }),
  },
  {
    type: 'pills',
    label: 'Tag row',
    hint: 'A compact run of small icon + label chips',
    icon: 'tag',
    empty: () => ({ type: 'pills', items: [{ icon: 'check', text: '' }] }),
  },
  {
    type: 'cta',
    label: 'Call to action',
    hint: 'A heading, a line of text and a button',
    icon: 'arrow',
    empty: () => ({ type: 'cta', title: '', buttonText: '', buttonUrl: '' }),
  },
]

export const BLOCK_LABEL: Record<string, string> = Object.fromEntries(
  BLOCK_SPECS.map((s) => [s.type, s.label])
)

export function emptyBlock(type: BlockType): Block | null {
  return BLOCK_SPECS.find((s) => s.type === type)?.empty() ?? null
}

// ═══════════════════════════════════════════════════════════
//  Normalising
// ═══════════════════════════════════════════════════════════

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * Drops empty rows and empty sections, exactly as `articleBody()` would.
 *
 * Run on the way IN, so that what is stored is already what will be read
 * back. Without this an author could save a page full of half-filled sections,
 * see them vanish on the public page, and have no idea why.
 */
export function normaliseBlocks(input: unknown): Block[] {
  if (!Array.isArray(input)) return []
  const out: Block[] = []

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const b = raw as Record<string, unknown>

    switch (s(b.type)) {
      case 'lead':
      case 'para':
      case 'quote': {
        const text = s(b.text)
        if (text) out.push({ type: s(b.type) as 'lead' | 'para' | 'quote', text })
        break
      }
      case 'heading': {
        const text = s(b.text)
        if (!text) break
        const n = Number(b.number)
        const lvl = Number(b.level)
        out.push({
          type: 'heading',
          text,
          ...(Number.isFinite(n) && n > 0 ? { number: n } : {}),
          level: lvl === 3 || lvl === 4 ? (lvl as 3 | 4) : 2,
        })
        break
      }
      case 'bullets': {
        const items = (Array.isArray(b.items) ? b.items : []).map(s).filter(Boolean)
        if (items.length) out.push({ type: 'bullets', title: s(b.title) || undefined, items })
        break
      }
      case 'iconGrid': {
        const items = rows(b.items)
          .map((i) => ({
            icon: (s(i.icon) || 'star') as IconName,
            title: s(i.title),
            body: s(i.body),
          }))
          .filter((i) => i.title)
        if (items.length) {
          out.push({
            type: 'iconGrid',
            title: s(b.title) || undefined,
            ...columns(b.columns),
            items,
          })
        }
        break
      }
      case 'imageGrid': {
        const items = rows(b.items)
          .map((i) => ({ image: s(i.image), caption: s(i.caption) }))
          .filter((i) => i.image)
        if (items.length) {
          out.push({
            type: 'imageGrid',
            title: s(b.title) || undefined,
            ...columns(b.columns),
            items,
          })
        }
        break
      }
      case 'image': {
        const image = s(b.image)
        if (image) {
          out.push({
            type: 'image',
            image,
            caption: s(b.caption) || undefined,
            alt: s(b.alt) || undefined,
            width: b.width === 'contained' ? 'contained' : 'full',
          })
        }
        break
      }
      case 'numbered': {
        const items = rows(b.items)
          .map((i) => ({ title: s(i.title), body: s(i.body) }))
          .filter((i) => i.title || i.body)
        if (items.length) out.push({ type: 'numbered', title: s(b.title) || undefined, items })
        break
      }
      case 'cards': {
        const items = rows(b.items)
          .map((i) => ({
            icon: (s(i.icon) || 'star') as IconName,
            title: s(i.title),
            body: s(i.body) || undefined,
          }))
          .filter((i) => i.title)
        if (items.length) out.push({ type: 'cards', title: s(b.title) || undefined, items })
        break
      }
      case 'pills': {
        const items = rows(b.items)
          .map((i) => ({ icon: (s(i.icon) || 'check') as IconName, text: s(i.text) }))
          .filter((i) => i.text)
        if (items.length) out.push({ type: 'pills', items })
        break
      }
      case 'cta': {
        const title = s(b.title)
        const buttonText = s(b.buttonText)
        const buttonUrl = s(b.buttonUrl)
        if (title && buttonText && buttonUrl) {
          out.push({ type: 'cta', title, body: s(b.body) || undefined, buttonText, buttonUrl })
        }
        break
      }
      default:
        break
    }
  }

  return out
}

function rows(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    : []
}

function columns(v: unknown): { columns?: number } {
  const n = Number(v)
  return n === 2 || n === 3 || n === 4 || n === 6 ? { columns: n } : {}
}

// ═══════════════════════════════════════════════════════════
//  Reading time and excerpt
// ═══════════════════════════════════════════════════════════

/** Every word a reader actually sees, across every section. */
export function blockWords(blocks: Block[]): number {
  let text = ''
  for (const b of blocks) {
    switch (b.type) {
      case 'lead':
      case 'para':
      case 'quote':
      case 'heading':
        text += ' ' + b.text
        break
      case 'bullets':
        text += ' ' + b.items.join(' ')
        break
      case 'iconGrid':
      case 'numbered':
        text += ' ' + b.items.map((i) => `${i.title} ${i.body ?? ''}`).join(' ')
        break
      case 'cards':
        text += ' ' + b.items.map((i) => `${i.title} ${i.body ?? ''}`).join(' ')
        break
      case 'imageGrid':
        text += ' ' + b.items.map((i) => i.caption).join(' ')
        break
      case 'pills':
        text += ' ' + b.items.map((i) => i.text).join(' ')
        break
      case 'image':
        text += ' ' + (b.caption ?? '')
        break
      case 'cta':
        text += ` ${b.title} ${b.body ?? ''}`
        break
    }
  }
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Reading time in whole minutes, at 200 words a minute — the figure most
 * publishers use. Never less than 1, so a short note does not claim "0 min".
 */
export function readingMinutes(blocks: Block[]): number {
  return Math.max(1, Math.round(blockWords(blocks) / 200))
}

/** The first real sentence of prose, for an excerpt the author left blank. */
export function autoExcerpt(blocks: Block[], limit = 180): string {
  const first = blocks.find((b) => b.type === 'lead' || b.type === 'para')
  if (!first || (first.type !== 'lead' && first.type !== 'para')) return ''
  const plain = stripMarkdown(first.text)
  return plain.length <= limit ? plain : plain.slice(0, limit).replace(/\s+\S*$/, '') + '…'
}

// ═══════════════════════════════════════════════════════════
//  Inline Markdown
// ═══════════════════════════════════════════════════════════

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; href: string }

/**
 * The only formatting an author can write: `**bold**`, `*italic*` and
 * `[text](url)`.
 *
 * Returning tokens rather than an HTML string is the point — the renderer
 * builds real elements from them, so nothing ever reaches
 * `dangerouslySetInnerHTML` and a stray `<script>` in a blog body is just
 * text.
 */
export function parseInline(input: string): InlineToken[] {
  const out: InlineToken[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(input))) {
    if (m.index > last) out.push({ kind: 'text', text: input.slice(last, m.index) })

    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] })
    else if (m[2] !== undefined) out.push({ kind: 'italic', text: m[2] })
    else if (m[3] !== undefined && m[4] !== undefined) {
      out.push({ kind: 'link', text: m[3], href: safeHref(m[4]) })
    }
    last = re.lastIndex
  }

  if (last < input.length) out.push({ kind: 'text', text: input.slice(last) })
  return out
}

/**
 * Only http(s), mailto and same-site paths survive.
 *
 * `javascript:` in a link an author typed is the one genuinely dangerous
 * thing a Markdown body can carry; everything else is inert text.
 */
export function safeHref(href: string): string {
  const h = href.trim()
  if (/^https?:\/\//i.test(h) || /^mailto:/i.test(h) || h.startsWith('/')) return h
  return '#'
}

export function stripMarkdown(input: string): string {
  return parseInline(input)
    .map((t) => t.text)
    .join('')
    .trim()
}

// ═══════════════════════════════════════════════════════════
//  The starter
// ═══════════════════════════════════════════════════════════

/**
 * The sections a new blog opens with.
 *
 * Every published article on ArchFacing should read the same way — opening
 * paragraph, numbered sections, an icon row, a picture grid, benefit cards, a
 * closing quote. Leaving an author to assemble that from an empty page means
 * twelve authors invent twelve different articles.
 *
 * So a new blog starts as that skeleton, already in order, with each field
 * carrying a placeholder that says what belongs there. The author writes over
 * it, drags what they do not want out of the way, and deletes the rest —
 * which is far less work than building the shape from nothing.
 *
 * Nothing here reaches the database on its own: `normaliseBlocks` drops every
 * section that is still empty, so an untouched starter saves as no article at
 * all rather than as a page of placeholder text.
 */
export function starterBlocks(): Block[] {
  return [
    { type: 'lead', text: '' },
    { type: 'para', text: '' },
    { type: 'heading', number: 1, level: 2, text: '' },
    { type: 'para', text: '' },
    {
      // six across, matching the article this shape is taken from
      type: 'iconGrid',
      columns: 6,
      items: [
        { icon: 'bolt', title: '', body: '' },
        { icon: 'wind', title: '', body: '' },
        { icon: 'droplet', title: '', body: '' },
        { icon: 'recycle', title: '', body: '' },
        { icon: 'leaf', title: '', body: '' },
        { icon: 'home', title: '', body: '' },
      ],
    },
    {
      // three across, two rows — the reference's "Key Elements" block
      type: 'imageGrid',
      title: '',
      columns: 3,
      items: [
        { image: '', caption: '' },
        { image: '', caption: '' },
        { image: '', caption: '' },
        { image: '', caption: '' },
        { image: '', caption: '' },
        { image: '', caption: '' },
      ],
    },
    { type: 'heading', number: 2, level: 2, text: '' },
    { type: 'para', text: '' },
    {
      type: 'cards',
      items: [
        { icon: 'bolt', title: '' },
        { icon: 'heart', title: '' },
        { icon: 'trending', title: '' },
        { icon: 'leaf', title: '' },
        { icon: 'coins', title: '' },
      ],
    },
    { type: 'heading', number: 3, level: 2, text: '' },
    { type: 'para', text: '' },
    { type: 'quote', text: '' },
  ]
}
