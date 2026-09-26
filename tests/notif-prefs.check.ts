/**
 * Notification Settings are enforced for every notification the app writes.
 * Run: TEST_DATABASE_URL=... npx tsx tests/notif-prefs.check.ts
 *
 * Uses its own throwaway @notiftest.dev user; deleted (with its notifications) in finally.
 */
import './_test-env.mjs'
import { prisma } from '../src/lib/prisma'
import { DEFAULT_PREFS } from '../src/lib/notification-prefs'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  const stamp = Date.now()
  const user = await prisma.user.create({
    data: { email: `notif-${stamp}@notiftest.dev`, name: 'Notif Test', role: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: new Date() },
    select: { id: true },
  })
  const tag = `notif-check-${stamp}`
  const count = () => prisma.notification.count({ where: { userId: user.id, title: tag } })

  try {
    // new leads OFF in-app, direct messages left ON
    const prefs = structuredClone(DEFAULT_PREFS)
    prefs['new-lead'].inApp = false
    await prisma.user.update({ where: { id: user.id }, data: { notificationPrefs: prefs } })

    await prisma.notification.create({ data: { userId: user.id, type: 'NEW_ENQUIRY', title: tag, body: 'x' } })
    ok((await count()) === 0, 'muted type (NEW_ENQUIRY) is not written')

    await prisma.notification.create({ data: { userId: user.id, type: 'DIRECT', title: tag, body: 'x' } })
    ok((await count()) === 1, 'an enabled type (DIRECT) is written')

    await prisma.notification.create({ data: { userId: user.id, type: 'PAYMENT_REFUND', title: tag, body: 'x' } })
    ok((await count()) === 2, 'a transactional type is always written')

    await prisma.$transaction(async (tx) => {
      await tx.notification.create({ data: { userId: user.id, type: 'ENQUIRY_REPLY', title: tag, body: 'x' } })
    })
    ok((await count()) === 2, 'muted inside a $transaction too')

    const r = await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'NEW_ENQUIRY', title: tag, body: 'x' },
        { userId: user.id, type: 'POST_APPROVED', title: tag, body: 'x' },
      ],
    })
    ok(r.count === 1 && (await count()) === 3, 'createMany drops only the muted rows')

    await prisma.user.update({ where: { id: user.id }, data: { notificationPrefs: null as never } })
    await prisma.notification.create({ data: { userId: user.id, type: 'NEW_ENQUIRY', title: tag, body: 'x' } })
    ok((await count()) === 4, 'defaults (no saved prefs) deliver everything')
  } finally {
    await prisma.notification.deleteMany({ where: { userId: user.id } })
    await prisma.user.deleteMany({ where: { id: user.id, email: { endsWith: '@notiftest.dev' } } })
    await prisma.$disconnect()
  }
}

main().then(
  () => { console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0) },
  (e) => { console.error(e); process.exit(1) }
)
