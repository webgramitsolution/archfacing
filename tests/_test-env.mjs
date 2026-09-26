/**
 * DB test guard — import this FIRST in every test that touches the database.
 *
 *   import './_test-env.mjs'
 *
 * ESM evaluates imports in order, so this runs before @prisma/client or any
 * src/lib module is loaded. It refuses to run unless TEST_DATABASE_URL points
 * at a throwaway database whose name contains "test", then points
 * DATABASE_URL at it. Prisma never overrides an env var that is already set
 * with the value from .env, so src/lib/prisma.ts and every `new PrismaClient()`
 * end up on the test database — never the real one.
 */

function refuse(why) {
  console.error(`\n✋ ${why}`)
  console.error(
    "   DB tests need TEST_DATABASE_URL pointing at a throwaway database whose name contains 'test'; refusing to run against DATABASE_URL.\n",
  )
  process.exit(1)
}

if (process.env.NODE_ENV === 'production') {
  refuse('NODE_ENV is "production".')
}

const raw = process.env.TEST_DATABASE_URL
if (!raw) refuse('TEST_DATABASE_URL is not set.')

let dbName
try {
  // pathname never includes the query string, but strip defensively.
  dbName = decodeURIComponent(new URL(raw).pathname.replace(/^\//, '').split('?')[0])
} catch {
  refuse('TEST_DATABASE_URL is not a valid URL.')
}

if (!dbName || !/test/i.test(dbName)) {
  refuse(`TEST_DATABASE_URL database name "${dbName ?? ''}" does not contain "test".`)
}

process.env.DATABASE_URL = raw

export const TEST_DB = true
