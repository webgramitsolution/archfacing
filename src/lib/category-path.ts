import type { PostType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * "Primary › Secondary › Tertiary" for a post, in the names /admin/categories
 * holds — so every dashboard and admin table reads the same three levels the
 * posting form offered, instead of raw slugs.
 */
export async function categoryPathLabeller(type: PostType) {
  const rows = await prisma.category.findMany({
    where: { type },
    select: { id: true, slug: true, name: true, parentId: true },
  })
  const roots = new Map<string, { id: string; name: string }>()
  const byParent = new Map<string, Map<string, { id: string; name: string }>>()
  for (const r of rows) {
    if (!r.parentId) roots.set(r.slug, { id: r.id, name: r.name })
    else {
      let m = byParent.get(r.parentId)
      if (!m) byParent.set(r.parentId, (m = new Map()))
      m.set(r.slug, { id: r.id, name: r.name })
    }
  }
  const pretty = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (category?: string | null, sub?: string | null, tertiary?: string | null): string[] => {
    if (!category) return []
    const root = roots.get(category)
    const out = [root?.name ?? pretty(category)]
    if (!sub) return out
    const s = root ? byParent.get(root.id)?.get(sub) : undefined
    out.push(s?.name ?? pretty(sub))
    if (!tertiary) return out
    const t = s ? byParent.get(s.id)?.get(tertiary) : undefined
    out.push(t?.name ?? pretty(tertiary))
    return out
  }
}
