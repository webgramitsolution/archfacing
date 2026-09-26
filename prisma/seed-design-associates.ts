/**
 * Registers eligible professionals as Design Associates — §3.1.7.
 *
 * Run with `pnpm db:design-associates`.
 *
 * This creates no content and invents no professional. It walks the DESIGNA /
 * DESIGNI professionals that already exist, and for the ones that qualify it
 * performs the registration the PDF describes:
 *
 *   §3.1.7.1  "Design Associates are those Professionals who get themselves
 *              registered for the Particular PACT by buying PACT Franchise and
 *              opted for DA in working with Archfacing."
 *   §3.1.7.2  "once registered with Archfacing and upload the projects than
 *              registrant will get themselves registered as DA of archfacing"
 *   §8.2       the DA email and reference code are "firstname + PACT".
 *
 * So the bar applied below is exactly the PDF's: a verified DESIGNA/DESIGNI
 * professional, holding a PACT for their territory, who has actually published
 * work. Nobody who fails that becomes an associate, which is why the directory
 * is shorter than the professional list — and should be.
 */

import { PrismaClient, type Prisma } from '@prisma/client'
import { daIdentity } from '../src/lib/design-associate'

const prisma = new PrismaClient()

/** A public URL fragment from the firm or personal name. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(ar|er|dr|mr|ms|mrs|shri|smt)\.?\s+/i, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function main() {
  console.log('\n── Design Associates (§3.1.7) ──\n')

  /*
   * The candidates: DESIGNA/DESIGNI professionals who are verified and have
   * published work. "upload the projects than registrant will get themselves
   * registered as DA" (§3.1.7.2) — so published work is a precondition, not a
   * nice-to-have.
   */
  const candidates = await prisma.user.findMany({
    where: {
      role: 'PROFESSIONAL',
      status: 'ACTIVE',
      deletedAt: null,
      professionalProfile: { is: { isVerified: true } },
      posts: { some: { status: 'PUBLISHED', deletedAt: null } },
    },
    include: {
      professionalProfile: true,
      designAssociate: true,
      pacts: { where: { status: 'ACTIVE' } },
      _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`  ${candidates.length} verified professionals with published work\n`)

  const taken = new Set(
    (await prisma.designAssociate.findMany({ select: { slug: true } }))
      .map((d) => d.slug)
      .filter((s): s is string => Boolean(s))
  )

  let made = 0
  let already = 0

  for (const u of candidates) {
    const p = u.professionalProfile!

    if (u.designAssociate) {
      already++
      continue
    }

    /*
     * §3.1.7.1 — the PACT comes first. An associate is registered *for a
     * territory*, so one is granted here at the professional's own PIN code
     * when they do not already hold one. `ACTIVE` with a ten-year term is the
     * §3.1.8 franchise period.
     */
    let pact = u.pacts[0]
    if (!pact) {
      if (!u.pincode) {
        console.log(`  ⊘ ${u.name.padEnd(30)} no PIN code — cannot hold a PACT`)
        continue
      }

      const serviceType = p.designaType // DESIGNA or DESIGNI
      const existing = await prisma.pact.findFirst({
        where: { pincode: u.pincode, serviceType, subCategory: '-' },
      })

      // Somebody else already holds this territory — a PACT is exclusive.
      if (existing && existing.holderId && existing.holderId !== u.id) {
        console.log(`  ⊘ ${u.name.padEnd(30)} PACT ${u.pincode} ${serviceType} is taken`)
        continue
      }

      const purchasedAt = new Date()
      const expiresAt = new Date(purchasedAt)
      expiresAt.setFullYear(expiresAt.getFullYear() + 10)

      const data: Prisma.PactUncheckedCreateInput = {
        pincode: u.pincode,
        state: u.state ?? 'Delhi',
        city: u.city,
        serviceType,
        subCategory: '-',
        holderId: u.id,
        status: 'ACTIVE',
        purchasedAt,
        expiresAt,
      }

      pact = existing
        ? await prisma.pact.update({ where: { id: existing.id }, data })
        : await prisma.pact.create({ data })
    }

    // §8.2 — the identity is derived from the name and the PACT PIN code.
    const { email, code } = daIdentity(u.name, pact.pincode)

    let slug = slugify(p.firmName || u.name)
    if (!slug || taken.has(slug)) slug = `${slug || 'associate'}-${pact.pincode}`
    taken.add(slug)

    await prisma.designAssociate.create({
      data: {
        userId: u.id,
        daEmail: email,
        daCode: code,
        slug,
        // Seeded associates are approved; a real application goes through
        // `applyForDa` and waits for an admin.
        kycVerified: true,
        approvedAt: new Date(),
      },
    })

    made++
    console.log(
      `  ✓ ${(p.firmName || u.name).padEnd(30)} ${p.designaType.padEnd(8)} ` +
        `PACT ${pact.pincode.padEnd(7)} ${String(u._count.posts).padStart(2)} posts  /${slug}`
    )
  }

  console.log(`\n  ${made} registered, ${already} already were\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
