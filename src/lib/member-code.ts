import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * The member's public ID — "AFH" + 5 digits, e.g. AFH48213.
 *
 * One per account, never reused. It is shown read-only in Edit Profile →
 * Basic Information and printed as the "Artwork ID" on every Artistry post by
 * that member, so a buyer can quote the same code everywhere.
 */
const PREFIX = 'AFH'

function candidate(): string {
  return PREFIX + String(10000 + Math.floor(Math.random() * 90000))
}

/** The member's code, assigning one on first use. */
export async function ensureMemberCode(userId: string): Promise<string> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { memberCode: true } })
  if (row?.memberCode) return row.memberCode
  for (let i = 0; i < 12; i++) {
    const code = candidate()
    try {
      const done = await prisma.user.updateMany({ where: { id: userId, memberCode: null }, data: { memberCode: code } })
      if (done.count === 1) return code
      // someone else assigned one meanwhile — use theirs
      const again = await prisma.user.findUnique({ where: { id: userId }, select: { memberCode: true } })
      if (again?.memberCode) return again.memberCode
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue // taken, roll again
      throw e
    }
  }
  throw new Error('Could not assign a member ID')
}
