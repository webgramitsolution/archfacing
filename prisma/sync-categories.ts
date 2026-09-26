/**
 * Brings the Category table in line with src/config/taxonomy.ts — the PDF's
 * taxonomy plus every category the site's mega menus show (e.g. Photo and
 * Videography). Up to three levels: Primary → Secondary → Tertiary.
 *
 *   npm run db:sync-categories
 *
 * Adds what is missing and corrects name / parent / order of what exists.
 * It never deletes: a category that is in the database but not in the
 * taxonomy is listed at the end, sorted after the document's own, and — with
 * --hide-extras — switched off so posting forms offer only the PDF's list.
 */
import { PrismaClient, type PostType } from '@prisma/client'
import {
  PROJECT_CATEGORIES, PRODUCT_CATEGORIES, AROUND_US_CATEGORIES, ARTISTRY_CATEGORIES,
  BLOG_CATEGORIES, COMPETITION_CATEGORIES, MERCHANDISE_CATEGORIES, PODCAST_CATEGORIES,
  type TaxonomyNode,
} from '../src/config/taxonomy'

const prisma = new PrismaClient()

const TREES: [PostType, TaxonomyNode[]][] = [
  ['PROJECT', PROJECT_CATEGORIES], ['PRODUCT', PRODUCT_CATEGORIES], ['AROUND_US', AROUND_US_CATEGORIES],
  ['ARTISTRY', ARTISTRY_CATEGORIES], ['BLOG', BLOG_CATEGORIES], ['DESIGN_COMPETITION', COMPETITION_CATEGORIES],
  ['MERCHANDISE', MERCHANDISE_CATEGORIES], ['PODCAST', PODCAST_CATEGORIES],
]

/** `--hide-extras`: switch off categories that are not in the taxonomy. */
const HIDE_EXTRAS = process.argv.includes('--hide-extras')

let added = 0
let updated = 0

async function sync(type: PostType, nodes: TaxonomyNode[], parentId: string | null, seen: Set<string>) {
  for (const [order, node] of nodes.entries()) {
    seen.add(node.slug)
    const existing = await prisma.category.findUnique({ where: { type_slug: { type, slug: node.slug } } })
    let id: string
    if (!existing) {
      id = (await prisma.category.create({ data: { type, slug: node.slug, name: node.name, parentId, sortOrder: order } })).id
      added++
    } else {
      id = existing.id
      if (existing.name !== node.name || existing.parentId !== parentId || existing.sortOrder !== order) {
        await prisma.category.update({ where: { id }, data: { name: node.name, parentId, sortOrder: order } })
        updated++
      }
    }
    if (node.children?.length) await sync(type, node.children, id, seen)
  }
}

async function main() {
  const extras: string[] = []
  for (const [type, tree] of TREES) {
    const seen = new Set<string>()
    await sync(type, tree, null, seen)
    const outside = await prisma.category.findMany({ where: { type, slug: { notIn: [...seen] } }, select: { id: true, slug: true, name: true, sortOrder: true } })
    for (const o of outside) {
      extras.push(`${type}: ${o.name} (${o.slug})`)
      // Keep the document's categories first; extras sort after them.
      if (o.sortOrder < 100) await prisma.category.update({ where: { id: o.id }, data: { sortOrder: 100 + o.sortOrder } })
      // Posting forms offer only the document's categories; listings keep
      // their stored value, and an admin can switch a row back on.
      if (HIDE_EXTRAS) await prisma.category.update({ where: { id: o.id }, data: { isActive: false } })
    }
  }
  console.log(`  ${added} added, ${updated} corrected`)
  if (extras.length) console.log(`  ${extras.length} in the database but not in the taxonomy (left untouched):\n    ${extras.join('\n    ')}`)
}

main().finally(() => prisma.$disconnect())
