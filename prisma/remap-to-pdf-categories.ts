/**
 * One-off: move posts off categories that are not in the PDF onto the
 * PDF's own (Sept 2026 taxonomy alignment). Idempotent. The previous value
 * is kept in meta.legacyCategory / meta.legacySubCategory so nothing is lost.
 *
 *   npx tsx prisma/remap-to-pdf-categories.ts
 *
 * Also recomputes Around Us "paid" per §5.2.4.1: Design Competition, New
 * Development and Social Welfare are free; Reporting & Publication is paid.
 */
import { Prisma, PrismaClient, type PostType } from '@prisma/client'
import { AROUND_US_FREE_PARENTS, BLOG_CATEGORIES, COMPETITION_CATEGORIES, AROUND_US_CATEGORIES } from '../src/config/taxonomy'

const LABEL: Record<string, string> = Object.fromEntries(
  [...BLOG_CATEGORIES, ...COMPETITION_CATEGORIES, ...AROUND_US_CATEGORIES].map((c) => [c.slug, c.name])
)

const prisma = new PrismaClient()

/** old category → [new category, new subCategory | null] */
export const REMAP: Partial<Record<PostType, Record<string, [string, string | null]>>> = {
  BLOG: {
    'design-trends': ['learning-reading', null],
    'construction-technology': ['technical-papers', null],
    sustainability: ['research-development', null],
    'vaastu-tradition': ['learning-reading', null],
    'materials-review': ['technical-papers', null],
    'career-education': ['learning-reading', null],
    'industry-news': ['learning-reading', null],
    'case-studies': ['research-development', null],
  },
  DESIGN_COMPETITION: {
    'architecture-competition': ['designa', null],
    'landscape-competition': ['designa', null],
    'concept-competition': ['designa', null],
    'student-competition': ['designa', null],
    'interior-competition': ['designi', null],
    'product-competition': ['designi', null],
  },
  AROUND_US: {
    'government-updates': ['new-development', 'government-policies'],
    'company-news': ['new-development', 'news'],
    'csr-sustainability': ['new-development', 'news'],
  },
}

async function main() {
  let moved = 0
  for (const [type, map] of Object.entries(REMAP) as [PostType, Record<string, [string, string | null]>][]) {
    const posts = await prisma.post.findMany({ where: { type, category: { in: Object.keys(map) } }, select: { id: true, category: true, subCategory: true, meta: true } })
    for (const p of posts) {
      const [cat, sub] = map[p.category]
      const m = (p.meta && typeof p.meta === 'object' && !Array.isArray(p.meta) ? p.meta : {}) as Record<string, unknown>
      await prisma.post.update({
        where: { id: p.id },
        data: {
          category: cat,
          subCategory: sub,
          meta: {
            ...m,
            legacyCategory: p.category,
            legacySubCategory: p.subCategory ?? null,
            legacyCategoryLabel: m.categoryLabel ?? null,
            ...(m.categoryLabel ? { categoryLabel: LABEL[cat] ?? m.categoryLabel } : {}),
          } as Prisma.InputJsonValue,
        },
      })
      moved++
    }
  }
  // Labels on posts already moved by an earlier run.
  const moved2 = await prisma.post.findMany({ where: { type: { in: ['BLOG', 'DESIGN_COMPETITION', 'AROUND_US'] }, meta: { path: ['legacyCategory'], not: Prisma.AnyNull } }, select: { id: true, category: true, meta: true } })
  for (const p of moved2) {
    const m = p.meta as Record<string, unknown>
    if (m.categoryLabel && LABEL[p.category] && m.categoryLabel !== LABEL[p.category]) {
      await prisma.post.update({ where: { id: p.id }, data: { meta: { ...m, legacyCategoryLabel: m.legacyCategoryLabel ?? m.categoryLabel, categoryLabel: LABEL[p.category] } as Prisma.InputJsonValue } })
    }
  }

  const free = await prisma.post.updateMany({ where: { type: 'AROUND_US', category: { in: [...AROUND_US_FREE_PARENTS] }, isPaidCategory: true }, data: { isPaidCategory: false } })
  const paid = await prisma.post.updateMany({ where: { type: 'AROUND_US', category: 'reporting-publication', isPaidCategory: false }, data: { isPaidCategory: true } })
  console.log(`  ${moved} posts moved to PDF categories · Around Us free/paid corrected on ${free.count + paid.count}`)
}

main().finally(() => prisma.$disconnect())
