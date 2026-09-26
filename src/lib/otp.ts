/**
 * ArchFacing — sending and verifying one-time passcodes
 *
 * Only the EMAIL channel is active right now (Hostinger SMTP).
 * If an SMS channel is added once the website is complete, it will only need
 * one more case in `deliver()` — everything else stays as it is.
 *
 * Security:
 *  · the code is never stored in plain text — we store a sha256 hash
 *  · it expires after 10 minutes
 *  · the OTP is invalidated after 5 incorrect attempts
 *  · at most 5 OTPs per email address per hour
 *  · at least 60 seconds between two OTPs
 */

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'
import { sendMail, otpEmail, isMailConfigured } from './mailer'

export type OtpPurpose = 'REGISTRATION' | 'LOGIN'

const CODE_LENGTH = 6
const TTL_MINUTES = 10
const MAX_ATTEMPTS = 5
const MAX_PER_HOUR = 5
const COOLDOWN_SECONDS = 60

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function generateCode(): string {
  // randomInt is cryptographically secure — never use Math.random() here
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

// ═══════════════════════════════════════════════════════════
//  Sending an OTP
// ═══════════════════════════════════════════════════════════

type SendResult =
  | { ok: true; devCode?: string; expiresAt: Date }
  | { ok: false; error: string; retryAfterSeconds?: number }

export async function sendOtp(
  rawEmail: string,
  purpose: OtpPurpose,
  ipAddress?: string
): Promise<SendResult> {
  const email = normalizeEmail(rawEmail)

  if (!isValidEmail(email)) {
    return { ok: false, error: 'That email address does not look valid. Please check it and try again.' }
  }

  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // ─── rate limit: per hour ───
  const recentCount = await prisma.otpRequest.count({
    where: { identifier: email, createdAt: { gt: hourAgo } },
  })
  if (recentCount >= MAX_PER_HOUR) {
    return {
      ok: false,
      error: 'Too many requests. Please try again in an hour.',
      retryAfterSeconds: 3600,
    }
  }

  // ─── rate limit: cooldown ───
  const last = await prisma.otpRequest.findFirst({
    where: { identifier: email },
    orderBy: { createdAt: 'desc' },
  })
  if (last) {
    const elapsed = (now.getTime() - last.createdAt.getTime()) / 1000
    if (elapsed < COOLDOWN_SECONDS) {
      return {
        ok: false,
        error: `Please wait ${Math.ceil(COOLDOWN_SECONDS - elapsed)} seconds before requesting another code.`,
        retryAfterSeconds: Math.ceil(COOLDOWN_SECONDS - elapsed),
      }
    }
  }

  // ─── Invalidate any older unused OTPs ───
  await prisma.otpRequest.updateMany({
    where: { identifier: email, purpose, usedAt: null },
    data: { usedAt: now },
  })

  const code = generateCode()
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60 * 1000)

  await prisma.otpRequest.create({
    data: {
      identifier: email,
      channel: 'EMAIL',
      codeHash: hash(code),
      purpose,
      expiresAt,
      ipAddress,
    },
  })

  const { subject, html, text } = otpEmail(code, purpose)
  try {
    await sendMail({ to: email, subject, html, text })
  } catch (e) {
    console.error('Failed to send OTP email:', e)
    return {
      ok: false,
      error: 'We could not send the email. Please try again in a few moments.',
    }
  }

  // When SMTP is not configured, surface the code to the UI in development
  return {
    ok: true,
    expiresAt,
    ...(isMailConfigured ? {} : { devCode: code }),
  }
}

// ═══════════════════════════════════════════════════════════
//  Verifying an OTP
// ═══════════════════════════════════════════════════════════

type VerifyResult =
  | { ok: true; token: string }
  | { ok: false; error: string; attemptsLeft?: number }

export async function verifyOtp(
  rawEmail: string,
  code: string,
  purpose: OtpPurpose
): Promise<VerifyResult> {
  const email = normalizeEmail(rawEmail)
  const cleaned = code.replace(/\D/g, '')

  if (cleaned.length !== CODE_LENGTH) {
    return { ok: false, error: `The code must be ${CODE_LENGTH} digits long.` }
  }

  const otp = await prisma.otpRequest.findFirst({
    where: { identifier: email, purpose, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    return { ok: false, error: 'No active code was found. Please request a new one.' }
  }

  if (otp.expiresAt < new Date()) {
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    })
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  // Timing-safe comparison — hashes are always of equal length
  const given = Buffer.from(hash(cleaned))
  const stored = Buffer.from(otp.codeHash)
  const matches = given.length === stored.length && timingSafeEqual(given, stored)

  if (!matches) {
    const updated = await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    })
    const left = MAX_ATTEMPTS - updated.attempts
    return {
      ok: false,
      error: left > 0 ? `That code is incorrect. ${left} attempts remaining.` : 'That code is incorrect.',
      attemptsLeft: Math.max(0, left),
    }
  }

  // ─── The code was correct — issue a short-lived token ───
  // This token is valid for 15 minutes, to complete registration or a session
  const token = randomBytes(32).toString('hex')
  await prisma.otpRequest.update({
    where: { id: otp.id },
    data: {
      verifiedToken: token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })

  return { ok: true, token }
}

/**
 * Mints a verified LOGIN token directly on the server.
 *
 * Use this only when the user's identity has already been established — for
 * example, auto-login immediately after registration completes. It bypasses the
 * OTP entirely, so never drive it from user-supplied input.
 */
export async function mintLoginToken(rawEmail: string): Promise<string> {
  const email = normalizeEmail(rawEmail)
  const token = randomBytes(32).toString('hex')

  await prisma.otpRequest.create({
    data: {
      identifier: email,
      channel: 'EMAIL',
      // No real code ever existed — so nobody can redeem this record
      codeHash: hash(randomBytes(32).toString('hex')),
      purpose: 'LOGIN',
      attempts: MAX_ATTEMPTS,
      verifiedToken: token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  return token
}

/**
 * Checks the token issued after verification — when completing registration or
 * login. Passing `consume: true` makes the token single-use.
 */
export async function checkVerifiedToken(
  rawEmail: string,
  token: string,
  purpose: OtpPurpose,
  consume = false
): Promise<boolean> {
  const email = normalizeEmail(rawEmail)
  if (!token) return false

  const otp = await prisma.otpRequest.findFirst({
    where: {
      identifier: email,
      purpose,
      verifiedToken: token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (!otp) return false

  if (consume) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    })
  }
  return true
}
