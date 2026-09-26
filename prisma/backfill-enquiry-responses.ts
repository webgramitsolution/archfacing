/**
 * Stamp `respondedAt` on enquiries whose status already says they were answered.
 *
 *   npx tsx prisma/backfill-enquiry-responses.ts
 *
 * The seed sets an enquiry to RESPONDED, CONVERTED or CLOSED without writing the
 * timestamp, so anything that reads reply timings — the response rate and
 * response time on a professional's card — sees a row that was answered as one
 * that was ignored. This makes the two agree.
 *
 * `updatedAt` is when the status last moved, which for a seeded row is the
 * moment it was set to answered. That is the best evidence available; a row that
 * somehow has no later `updatedAt` than `createdAt` is left alone rather than
 * given an invented duration.
 *
 * Idempotent — it only touches rows where `respondedAt` is null.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Statuses that can only have been reached by replying to the client. */
const ANSWERED = ['RESPONDED', 'CONVERTED', 'CLOSED'] as const

async function main() {
  const rows = await prisma.enquiry.findMany({
    where: { status: { in: [...ANSWERED] }, respondedAt: null },
    select: { id: true, status: true, createdAt: true, updatedAt: true },
  })

  if (rows.length === 0) {
    console.log('\nEvery answered enquiry already carries a response time.\n')
    return
  }

  let stamped = 0
  let skipped = 0

  for (const r of rows) {
    if (r.updatedAt <= r.createdAt) {
      skipped++
      continue
    }
    await prisma.enquiry.update({
      where: { id: r.id },
      data: { respondedAt: r.updatedAt },
    })
    stamped++
  }

  console.log(`\n${stamped} stamped, ${skipped} left alone (no later update to read).\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
