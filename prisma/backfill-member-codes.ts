/**
 * Give every existing account its public member ID (AFH + 5 digits).
 * Idempotent — accounts that already have one are left alone.
 * Run: npx tsx prisma/backfill-member-codes.ts
 */
import { prisma } from '../src/lib/prisma'
import { ensureMemberCode } from '../src/lib/member-code'

async function main() {
  const users = await prisma.user.findMany({ where: { memberCode: null }, select: { id: true } })
  for (const u of users) await ensureMemberCode(u.id)
  console.log(`assigned ${users.length} member IDs`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
