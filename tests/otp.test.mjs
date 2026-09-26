/**
 * Phase 1 security test — OTP lifecycle and rate limits.
 *   npx tsx test-phase1.mjs
 */
import { PrismaClient } from '@prisma/client'
import { sendOtp, verifyOtp, checkVerifiedToken } from '../src/lib/otp.ts'

const p = new PrismaClient()
const EMAIL = 'otp.test@example.com'
let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name} ${extra}`)
  }
}

async function reset() {
  await p.otpRequest.deleteMany({ where: { identifier: EMAIL } })
}

console.log('\n── OTP lifecycle ──')
await reset()

// 1. sending
const sent = await sendOtp(EMAIL, 'REGISTRATION')
check('the OTP was sent', sent.ok)
check('the code came back in dev mode (SMTP not configured)', !!sent.devCode)
const code = sent.devCode

// 2. the code must not be saved in plain text
const row = await p.otpRequest.findFirst({
  where: { identifier: EMAIL },
  orderBy: { createdAt: 'desc' },
})
check('the code is not plain text in the DB', row.codeHash !== code, `(${row.codeHash.slice(0, 12)}…)`)

// 3. a wrong code
const wrong = await verifyOtp(EMAIL, '000000', 'REGISTRATION')
check('a wrong code is rejected', !wrong.ok)
check('the remaining attempts are reported', wrong.attemptsLeft === 4, `(${wrong.attemptsLeft})`)

// 4. the correct code
const right = await verifyOtp(EMAIL, code, 'REGISTRATION')
check('the correct code is accepted', right.ok)
check('a token came back', !!right.token && right.token.length >= 32)

// 5. token check
const valid = await checkVerifiedToken(EMAIL, right.token, 'REGISTRATION')
check('the token is valid', valid)

// 6. a token must not work for a different purpose
const wrongPurpose = await checkVerifiedToken(EMAIL, right.token, 'LOGIN')
check('the token does not work for another purpose', !wrongPurpose)

// 7. it must not work again once consumed
await checkVerifiedToken(EMAIL, right.token, 'REGISTRATION', true)
const reused = await checkVerifiedToken(EMAIL, right.token, 'REGISTRATION')
check('the token does not work again after being consumed', !reused)

console.log('\n── Rate limiting ──')
await reset()

// 8. cooldown — no second OTP within 60 seconds
await sendOtp(EMAIL, 'REGISTRATION')
const tooSoon = await sendOtp(EMAIL, 'REGISTRATION')
check('a 60-second cooldown was applied', !tooSoon.ok && tooSoon.retryAfterSeconds > 0)

// 9. per-hour cap — checked by backdating createdAt
await reset()
const old = new Date(Date.now() - 5 * 60 * 1000)
for (let i = 0; i < 5; i++) {
  await p.otpRequest.create({
    data: {
      identifier: EMAIL,
      channel: 'EMAIL',
      codeHash: 'x'.repeat(64),
      purpose: 'REGISTRATION',
      expiresAt: new Date(Date.now() + 600000),
      createdAt: old,
    },
  })
}
const capped = await sendOtp(EMAIL, 'REGISTRATION')
check('no more than 5 OTPs in an hour', !capped.ok, `(${capped.error})`)

// 10. max attempts
await reset()
const s2 = await sendOtp(EMAIL, 'REGISTRATION')
for (let i = 0; i < 5; i++) await verifyOtp(EMAIL, '111111', 'REGISTRATION')
const afterMax = await verifyOtp(EMAIL, s2.devCode, 'REGISTRATION')
check('after 5 wrong attempts even the correct code fails', !afterMax.ok, `(${afterMax.error})`)

console.log('\n── Email validation ──')
for (const bad of ['notanemail', 'a@b', '@example.com', 'x y@example.com']) {
  const r = await sendOtp(bad, 'REGISTRATION')
  check(`"${bad}" rejected`, !r.ok)
}

await reset()
await p.$disconnect()

console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(50)}\n`)
process.exit(fail ? 1 : 0)
