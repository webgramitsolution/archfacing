import { prisma } from '@/lib/prisma'
import {
  AROUND_US_CATEGORIES,
  ARTISTRY_CATEGORIES,
  PRODUCT_CATEGORIES,
  PROJECT_CATEGORIES,
  type TaxonomyNode,
} from '@/config/taxonomy'
import { productMeta } from '@/lib/products'

/**
 * The hero copy and counts for a category page (a Projects or Products
 * mega-menu link: `?category=` and optionally `&sub=`). Same hero as the
 * listing, but the heading and description name the category, and every
 * figure is counted inside that category only. `null` = the plain listing.
 */
export type CategoryHero = {
  title: string
  /** The parent group, shown as a small eyebrow when a sub-category is open. */
  parent: string | null
  description: string
  stats: { value: number; label: string }[]
}

function find(tree: TaxonomyNode[], category?: string, sub?: string) {
  const primary = category ? tree.find((c) => c.slug === category) : undefined
  if (!primary) return null
  const secondary = sub ? primary.children?.find((c) => c.slug === sub) : undefined
  return { primary, secondary }
}

/** "A, B and C" from the first few child names. */
function sample(nodes: TaxonomyNode[] | undefined, n = 3): string {
  const names = (nodes ?? []).slice(0, n).map((c) => c.name.toLowerCase())
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export async function productCategoryHero(category?: string, sub?: string): Promise<CategoryHero | null> {
  const hit = find(PRODUCT_CATEGORIES, category, sub)
  if (!hit) return null
  const { primary, secondary } = hit
  const where = {
    type: 'PRODUCT' as const,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    category: primary.slug,
    ...(secondary ? { subCategory: secondary.slug } : {}),
  }
  const rows = await prisma.post.findMany({ where, select: { meta: true, subCategory: true }, take: 2000 })
  const brands = new Set<string>()
  const subs = new Set<string>()
  for (const r of rows) {
    const m = productMeta(r.meta)
    if (m.brandSlug) brands.add(m.brandSlug)
    if (r.subCategory) subs.add(r.subCategory)
  }

  const node = secondary ?? primary
  const kids = sample(node.children)
  const description = secondary
    ? `Discover ${secondary.name.toLowerCase()}${kids ? ` — ${kids} and more —` : ''} in ${primary.name.toLowerCase()}, from trusted brands across India.`
    : `Discover premium ${primary.name.toLowerCase()}${kids ? ` — ${kids} and more —` : ''} from trusted brands across India.`

  return {
    title: node.name,
    parent: secondary ? primary.name : null,
    description,
    stats: [
      { value: rows.length, label: 'Products' },
      { value: brands.size, label: 'Brands' },
      secondary
        ? { value: secondary.children?.length ?? 0, label: 'Types' }
        : { value: subs.size, label: 'Categories' },
    ],
  }
}

export async function projectCategoryHero(category?: string, sub?: string): Promise<CategoryHero | null> {
  const hit = find(PROJECT_CATEGORIES, category, sub)
  if (!hit) return null
  const { primary, secondary } = hit
  const rows = await prisma.post.findMany({
    where: {
      type: 'PROJECT',
      status: 'PUBLISHED',
      deletedAt: null,
      category: primary.slug,
      ...(secondary ? { subCategory: secondary.slug } : {}),
    },
    select: { authorId: true, city: true, state: true },
    take: 5000,
  })
  const node = secondary ?? primary
  const kids = sample(primary.children)
  const description = secondary
    ? `Explore ${secondary.name.toLowerCase()} projects in ${primary.name.toLowerCase()}, from architects and designers across India.`
    : `Explore ${primary.name.toLowerCase()} projects${kids ? ` — ${kids} and more —` : ''} from professionals across India.`

  return {
    title: secondary ? node.name : `${primary.name} Projects`,
    parent: secondary ? primary.name : null,
    description,
    stats: [
      { value: rows.length, label: 'Projects' },
      { value: new Set(rows.map((r) => r.authorId)).size, label: 'Professionals' },
      { value: new Set(rows.map((r) => r.city).filter(Boolean)).size, label: 'Cities Covered' },
      { value: new Set(rows.map((r) => r.state).filter(Boolean)).size, label: 'States' },
    ],
  }
}

// ─────────────────────────────────────────────────────────────
//  Around Us and Artistry — their heroes carry no figures, so a
//  category page swaps only the heading, the eyebrow and the copy.
// ─────────────────────────────────────────────────────────────

const AROUND_US_COPY: Record<string, string> = {
  'design-competition':
    'DESIGNA and DESIGNI competitions from across India — briefs, entries, juries and results from the architecture and design community.',
  'new-development':
    'News, government policies, e-tenders, designers awards and media coverage shaping architecture, design and construction in India.',
  'social-welfare':
    'Help asked for and help offered — medical, job, travel and community invitations from the ArchFacing community across India.',
  'reporting-publication':
    'New books and magazines, exhibitions, interviews, seminars and conferences reported from the architecture and design world.',
}

const ARTISTRY_COPY: Record<string, string> = {
  environments:
    'Land, rivers, air and a warming planet — artworks and visual stories about the environment we build in.',
  'design-integration':
    'Design in dialogue with the five elements — works that integrate earth, water, fire, air and space.',
  arts: 'Sculptures, murals, paintings, graphics, artefacts and apparel from artists and designers across India.',
  'indian-culture': 'The dresses, ceremonies and languages of India, captured in artworks and visual stories.',
  heritage:
    "Heritage buildings and sacred traditions — works that preserve and celebrate India's architectural legacy.",
}

export function aroundUsCategoryHero(category?: string, sub?: string): CategoryHero | null {
  const hit = find(AROUND_US_CATEGORIES, category, sub)
  if (!hit) return null
  const { primary, secondary } = hit
  return {
    title: (secondary ?? primary).name,
    parent: secondary ? primary.name : null,
    description: secondary
      ? `The latest ${secondary.name} updates in ${primary.name}, posted by the Architecture, Design and Construction community across India.`
      : AROUND_US_COPY[primary.slug] ?? `The latest ${primary.name} updates from the Architecture, Design and Construction community across India.`,
    stats: [],
  }
}

export function artistryCategoryHero(category?: string, sub?: string): CategoryHero | null {
  const hit = find(ARTISTRY_CATEGORIES, category, sub)
  if (!hit) return null
  const { primary, secondary } = hit
  return {
    title: (secondary ?? primary).name,
    parent: secondary ? primary.name : null,
    description: secondary
      ? `${secondary.name} in ${primary.name} — artworks and visual stories shared by artists and designers across India.`
      : ARTISTRY_COPY[primary.slug] ?? `${primary.name} — artworks and visual stories from across India.`,
    stats: [],
  }
}
