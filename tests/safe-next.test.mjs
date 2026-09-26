/**
 * ★ The open-redirect guard on `?next=`.
 *
 *   pnpm test:safenext
 *
 * Six pages send a signed-out visitor to `/login?next=<where they were>`, and
 * after login we redirect there. `next` comes from the URL, so it is attacker
 * controlled: without this guard, `/login?next=https://evil.example/login`
 * would sign a victim in on the real domain and then hand them to a
 * convincing fake asking them to sign in "again", with the address bar having
 * looked correct the whole way.
 */

import { safeNext } from '../src/lib/safe-next.ts'

let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

console.log('\n── Legitimate destinations survive ──')

const keeps = [
  ['/club/join', 'a normal path'],
  ['/blog?category=architecture', 'a path with a query'],
  ['/blog/slug#section', 'a path with a hash'],
  ['/club/events/future-of-sustainable-architecture', 'a deep path'],
  ['/dashboard/club', 'a dashboard path'],
]
for (const [input, name] of keeps) {
  check(`${name} passes through`, safeNext(input) === input, `(got ${safeNext(input)})`)
}

console.log('\n── ★ Off-site redirects are refused ──')

const blocks = [
  ['https://evil.example', '★ an absolute https URL'],
  ['http://evil.example/x', '★ an absolute http URL'],
  ['//evil.example', '★ a protocol-relative URL — the browser treats this as absolute'],
  ['/\\evil.example', '★ the backslash form, which some browsers normalise to //'],
  ['javascript:alert(1)', '★ a javascript: URL'],
  ['data:text/html,<script>', '★ a data: URL'],
  ['mailto:someone@example.com', '★ a mailto: URL'],
]
for (const [input, name] of blocks) {
  check(`${name} is refused`, safeNext(input) === '/dashboard', `(got ${safeNext(input)})`)
}

console.log('\n── ★ Loops and nonsense fall back ──')

check('★ /login would loop, so it falls back', safeNext('/login') === '/dashboard')
check('★ a nested /login?next= also falls back', safeNext('/login?next=/a') === '/dashboard')
check('★ /register falls back', safeNext('/register') === '/dashboard')
check('★ an /api path falls back', safeNext('/api/auth/session') === '/dashboard')
check('★ a newline is refused', safeNext('/path\nwith-newline') === '/dashboard')
check('★ a tab is refused', safeNext('/path\twith-tab') === '/dashboard')
check('undefined falls back', safeNext(undefined) === '/dashboard')
check('an empty string falls back', safeNext('') === '/dashboard')
check('a non-string falls back', safeNext(42) === '/dashboard')
check('a relative path without a slash falls back', safeNext('club/join') === '/dashboard')

console.log('\n── The fallback is configurable ──')
check('a caller can choose its own fallback',
  safeNext('https://evil.example', '/club') === '/club')

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
