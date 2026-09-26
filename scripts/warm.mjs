/**
 * Pre-compiles the dev server's routes.
 *
 * In `next dev` every route is compiled the first time it is requested, which
 * on this project costs 15–25 seconds — that is the delay felt when clicking
 * a page for the first time in a session. Compiled once, the same route
 * answers in well under a second.
 *
 * This walks the app's real routes and requests each one, so the compile
 * happens in the background instead of under the cursor. Signed-out requests
 * still trigger the compile (the redirect happens after the route is built),
 * so no login is needed.
 *
 *   pnpm warm            → warms http://localhost:3000
 *   pnpm warm 3001       → warms another port
 */

const port = process.argv[2] || process.env.PORT || '3000'
const base = `http://localhost:${port}`

const ROUTES = [
  // public
  '/', '/projects', '/products', '/designers-associates', '/artistry', '/around-us',
  '/blog', '/membership', '/merchandise', '/competition', '/podcast', '/pact',
  '/consult-nearby', '/login', '/register', '/cart',
  // dashboard — shared
  '/dashboard', '/dashboard/messages', '/dashboard/membership', '/dashboard/help',
  '/dashboard/help/tickets', '/dashboard/notifications', '/dashboard/orders',
  '/dashboard/portal-space', '/dashboard/competitions', '/dashboard/blog',
  '/dashboard/artistry', '/dashboard/club', '/dashboard/advertisements',
  // dashboard — settings
  '/dashboard/settings', '/dashboard/settings/notifications', '/dashboard/settings/personal',
  '/dashboard/settings/business', '/dashboard/settings/password', '/dashboard/settings/privacy',
  '/dashboard/settings/connected', '/dashboard/settings/email', '/dashboard/settings/language',
  '/dashboard/settings/delete',
  // dashboard — professional
  '/dashboard/professional', '/dashboard/professional/profile',
  '/dashboard/professional/profile/edit', '/dashboard/professional/projects',
  '/dashboard/professional/projects/new', '/dashboard/professional/products',
  '/dashboard/professional/products/new', '/dashboard/professional/enquiries',
  '/dashboard/professional/consultations', '/dashboard/professional/pact',
  '/dashboard/professional/around-us', '/dashboard/professional/artistry',
  '/dashboard/professional/blog', '/dashboard/professional/competition',
  '/dashboard/professional/reviews',
]

async function waitForServer() {
  process.stdout.write('  waiting for the dev server')
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${base}/login`, { signal: AbortSignal.timeout(4000) })
      process.stdout.write(' — up\n')
      return true
    } catch {
      process.stdout.write('.')
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  process.stdout.write('\n')
  return false
}

async function main() {
  console.log(`\n🔥 Warming ${base}\n`)

  if (!(await waitForServer())) {
    console.log('  Could not reach the dev server. Start it with `pnpm dev` first.\n')
    process.exit(1)
  }

  const started = Date.now()
  let slow = 0

  // One at a time: the dev compiler is single-threaded, so firing them in
  // parallel only queues them up and makes each look slower.
  for (const [i, route] of ROUTES.entries()) {
    const t = Date.now()
    try {
      await fetch(base + route, { signal: AbortSignal.timeout(120_000) })
    } catch {
      // a route that redirects or errors is still compiled — keep going
    }
    const ms = Date.now() - t
    if (ms > 3000) slow++
    const n = String(i + 1).padStart(2, ' ')
    console.log(`  ${n}/${ROUTES.length}  ${String(ms).padStart(6, ' ')}ms  ${route}`)
  }

  const total = Math.round((Date.now() - started) / 1000)
  console.log(`\n  ✓ ${ROUTES.length} routes compiled in ${total}s (${slow} needed a full build).`)
  console.log('    Clicking around should be quick now — until the dev server restarts.\n')
}

main()
