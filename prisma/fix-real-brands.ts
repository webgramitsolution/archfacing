/**
 * One-off repair for data seeded before the Sept 2026 de-branding pass.
 * Run: npx tsx prisma/fix-real-brands.ts  (safe to re-run)
 *
 *  1. Storefront slugs still carrying a real brand (`/asian-paints`,
 *     `/tata-steel`…) are re-derived from the account's fictional name.
 *  2. Corporate profiles whose companyName is still the real firm take the
 *     account's fictional name.
 *  3. Two studios named after real architecture practices are renamed.
 *  4. Seeded project pages lose the invented seller rating, review count,
 *     stock portrait and testimonials; the page now reads real Review rows.
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { slugify } from '../src/lib/utils'

const prisma = new PrismaClient()

const BRAND_TOKENS = [
  'kajaria', 'somany', 'asian-paints', 'nitco', 'elica', 'hindware', 'fenesta', 'saint-gobain', 'havells',
  'tata-steel', 'blue-star', 'godrej', 'greenply', 'wienerberger', 'birla', 'fixit', 'd-decor', 'johnson-lifts',
  'hafele', 'ultratech', 'jaquar', 'philips', 'greenlam', 'hettich', 'morphogenesis', 'd-design-forum',
]
const REAL_COMPANY = /kajaria|asian paints|hafele|häfele|ultratech|jaquar|somany|nitco|havells|godrej|greenply|philips|hettich|greenlam|saint-gobain|tata steel|fenesta|hindware|elica|blue star/i

const RENAME: Record<string, { name: string; email: string }> = {
  'ddesignforum@studios.archfacing.com': { name: 'Dhara Design Forum', email: 'dharadesignforum@studios.archfacing.com' },
  'morphogenesis@studios.archfacing.com': { name: 'Morphline Architects', email: 'morphline@studios.archfacing.com' },
}

async function main() {
  // 3 — renamed studios (first, so their new slugs come from the new names)
  for (const [oldEmail, to] of Object.entries(RENAME)) {
    const u = await prisma.user.findUnique({ where: { email: oldEmail }, select: { id: true, name: true } })
    if (!u) continue
    await prisma.user.update({ where: { id: u.id }, data: { name: to.name, email: to.email } })
    await prisma.professionalProfile.updateMany({ where: { userId: u.id }, data: { firmName: to.name } })
    const posts = await prisma.post.findMany({ where: { authorId: u.id }, select: { id: true, meta: true } })
    for (const p of posts) {
      const m = (p.meta ?? {}) as Record<string, unknown>
      const next = { ...m }
      if (m.firmName === u.name) next.firmName = to.name
      if (m.architect === u.name) next.architect = to.name
      if (m.seller && typeof m.seller === 'object') next.seller = { ...(m.seller as object), name: to.name }
      await prisma.post.update({ where: { id: p.id }, data: { meta: next as Prisma.InputJsonValue } })
    }
    console.log(`  renamed ${u.name} → ${to.name}`)
  }

  // 2 — company names
  const corps = await prisma.corporateProfile.findMany({ select: { id: true, companyName: true, user: { select: { name: true } } } })
  for (const c of corps) {
    if (REAL_COMPANY.test(c.companyName) && !REAL_COMPANY.test(c.user.name)) {
      await prisma.corporateProfile.update({ where: { id: c.id }, data: { companyName: c.user.name } })
      console.log(`  company ${c.companyName} → ${c.user.name}`)
    }
  }

  // 1 — storefront slugs
  const sellers = await prisma.user.findMany({ where: { sellerSlug: { not: null } }, select: { id: true, name: true, sellerSlug: true, city: true } })
  const taken = new Set(sellers.map((s) => s.sellerSlug!))
  for (const s of sellers) {
    if (!BRAND_TOKENS.some((t) => s.sellerSlug!.includes(t))) continue
    const base = slugify(s.name).slice(0, 60)
    let slug = base
    if (taken.has(slug)) slug = s.city ? `${base}-${slugify(s.city)}` : `${base}-2`
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    taken.delete(s.sellerSlug!)
    taken.add(slug)
    await prisma.user.update({ where: { id: s.id }, data: { sellerSlug: slug } })
    console.log(`  /${s.sellerSlug} → /${slug}`)
  }

  // 4 — invented seller stats + testimonials on seeded projects
  const projects = await prisma.post.findMany({ where: { type: 'PROJECT' }, select: { id: true, meta: true } })
  let cleaned = 0
  for (const p of projects) {
    const m = (p.meta ?? {}) as Record<string, unknown>
    const seller = m.seller && typeof m.seller === 'object' ? (m.seller as Record<string, unknown>) : null
    const dirty = (Array.isArray(m.testimonials) && m.testimonials.length > 0) || (seller && (seller.rating || seller.reviews || seller.photo))
    if (!dirty) continue
    await prisma.post.update({
      where: { id: p.id },
      data: { meta: { ...m, testimonials: [], ...(seller ? { seller: { ...seller, rating: 0, reviews: 0, photo: '' } } : {}) } as Prisma.InputJsonValue },
    })
    cleaned++
  }
  // stock portraits on the seeded studio accounts
  const photos = await prisma.user.updateMany({
    where: { email: { endsWith: '@studios.archfacing.com' }, profilePhoto: { contains: 'images.unsplash.com' } },
    data: { profilePhoto: null },
  })
  console.log(`  ${cleaned} project pages cleaned, ${photos.count} stock portraits removed`)
}

main().finally(() => prisma.$disconnect())
