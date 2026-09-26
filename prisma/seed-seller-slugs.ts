/**
 * Gives every branded account a public storefront address.
 *
 * Run with `pnpm db:seller-slugs`.
 *
 * A storefront lives at `archfacing.com/<sellerSlug>`, so the slug has to be
 * unique, stable and never one of the reserved words. This assigns one to
 * each account that trades under a name and leaves the rest alone — a client
 * or an employee has no brand and therefore no shop.
 *
 * ★ It never changes a slug that is already set. A public URL that moves is a
 *   broken link on somebody's business card, so once assigned it stays until
 *   a person deliberately changes it.
 */

import { PrismaClient } from '@prisma/client'
import { brandNameOf, intendedSlug } from '../src/lib/seller'

const prisma = new PrismaClient()

async function main() {
  console.log('\n── Seller storefront addresses ──\n')

  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    include: {
      corporateProfile: { select: { companyName: true } },
      professionalProfile: { select: { firmName: true } },
      bmfProfile: { select: { businessName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const taken = new Set(
    users.map((u) => u.sellerSlug).filter((s): s is string => Boolean(s))
  )

  let made = 0
  let kept = 0
  let skipped = 0

  for (const u of users) {
    if (u.sellerSlug) {
      kept++
      continue
    }

    const brand = brandNameOf(u)
    let slug = intendedSlug(brand)

    if (!slug) {
      skipped++
      continue
    }

    // Two firms can share a name; the second gets their city appended rather
    // than a meaningless number.
    if (taken.has(slug)) {
      const suffix = u.city ? intendedSlug(u.city) : null
      const candidate = suffix ? `${slug}-${suffix}` : null
      if (candidate && !taken.has(candidate)) slug = candidate
      else {
        let n = 2
        while (taken.has(`${slug}-${n}`)) n++
        slug = `${slug}-${n}`
      }
    }

    taken.add(slug)
    await prisma.user.update({ where: { id: u.id }, data: { sellerSlug: slug } })
    made++
    console.log(`  ✓ ${(brand ?? u.name).slice(0, 34).padEnd(35)} ${u.role.padEnd(13)} /${slug}`)
  }

  console.log(`\n  ${made} addresses assigned, ${kept} already had one, ${skipped} have no brand\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
