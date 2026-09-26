'use server'

/**
 * Server actions for registration and login.
 *
 * ⚠️ Every action performs its own validation — the checks done on the
 *    client are for convenience only, never for trust.
 */

import { z } from 'zod'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Prisma, type Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { safeNext } from '@/lib/safe-next'
import {
  sendOtp,
  verifyOtp,
  checkVerifiedToken,
  normalizeEmail,
  mintLoginToken,
} from '@/lib/otp'
import { sendMail, welcomeEmail } from '@/lib/mailer'
import { signIn, dashboardPathFor } from '@/lib/auth'
import { BUSINESS_RULES } from '@/config/permissions'
import { getVerificationConfig, needsVerification } from '@/lib/verification-config'
import { CONSULTANT_SUBCATEGORY_SLUGS } from '@/config/taxonomy'

/**
 * Drops fields that were left empty.
 *
 * An HTML form submits every field — an unselected `<select>` still sends
 * `""`. To Zod, `""` is a valid string, so `z.enum().optional()` fails on
 * it. We therefore strip empty values before parsing so that optional
 * really means optional.
 */
function stripEmpty(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of fd.entries()) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed !== '') out[key] = trimmed
  }
  return out
}

/**
 * Values worth sending back to the form when an error occurs.
 * The token and other internal fields are excluded — they are hidden in
 * the form and need not be echoed back to the client.
 */
function echo(raw: Record<string, string>): Record<string, string> {
  const { token, ...rest } = raw
  void token // hidden field, no need to send it back
  return rest
}

async function clientIp() {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    undefined
  )
}

// ═══════════════════════════════════════════════════════════
//  Step 1 — Sending the OTP
// ═══════════════════════════════════════════════════════════

export type OtpState = {
  ok: boolean
  error?: string
  devCode?: string
  email?: string
}

export async function requestOtpAction(
  _prev: OtpState | null,
  formData: FormData
): Promise<OtpState> {
  const email = normalizeEmail(String(formData.get('email') ?? ''))
  const mode = String(formData.get('mode') ?? 'REGISTRATION')
  const purpose = mode === 'LOGIN' ? 'LOGIN' : 'REGISTRATION'

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  })

  // On registration, say so plainly if an account already exists
  if (purpose === 'REGISTRATION' && existing && !existing.deletedAt) {
    return {
      ok: false,
      email,
      error: 'An account already exists for this email address. Please sign in instead.',
    }
  }

  // On login with no matching account, keep the message uniform — guards
  // against email enumeration
  if (purpose === 'LOGIN' && (!existing || existing.deletedAt)) {
    return {
      ok: false,
      email,
      error: 'No account was found for this email address. Please register first.',
    }
  }

  const result = await sendOtp(email, purpose, await clientIp())
  if (!result.ok) return { ok: false, email, error: result.error }

  return { ok: true, email, devCode: result.devCode }
}

// ═══════════════════════════════════════════════════════════
//  Step 2 — Verifying the OTP
// ═══════════════════════════════════════════════════════════

export type VerifyState = {
  ok: boolean
  error?: string
  token?: string
  email?: string
}

export async function verifyOtpAction(
  _prev: VerifyState | null,
  formData: FormData
): Promise<VerifyState> {
  const email = normalizeEmail(String(formData.get('email') ?? ''))
  const code = String(formData.get('code') ?? '')
  const mode = String(formData.get('mode') ?? 'REGISTRATION')
  const purpose = mode === 'LOGIN' ? 'LOGIN' : 'REGISTRATION'

  const result = await verifyOtp(email, code, purpose)
  if (!result.ok) return { ok: false, email, error: result.error }

  return { ok: true, email, token: result.token }
}

/**
 * Login flow — once the OTP checks out, create a session and send the visitor on.
 *
 * The `next` argument is where they were headed before we asked them to sign
 * in. It comes
 * from the URL, so it is run through safeNext() first — see that file for why
 * redirecting to a raw query parameter is dangerous.
 */
export async function completeLoginAction(email: string, token: string, next?: string) {
  const clean = normalizeEmail(email)
  const user = await prisma.user.findUnique({
    where: { email: clean },
    select: { role: true },
  })
  if (!user) redirect('/login?error=notfound')

  await signIn('otp', {
    email: clean,
    token,
    redirectTo: safeNext(next, dashboardPathFor(user.role)),
  })
}

// ═══════════════════════════════════════════════════════════
//  Step 3 — Completing registration
// ═══════════════════════════════════════════════════════════

const REGISTRABLE_ROLES = [
  'CLIENT',
  'PROFESSIONAL',
  'CONSULTANT',
  'BMF',
  'CORPORATE',
] as const satisfies readonly Role[]

const baseSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  token: z.string().min(16, 'Email verification is incomplete'),
  role: z.enum(REGISTRABLE_ROLES, { message: 'Select a category' }),

  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),

  addressLine: z.string().trim().max(240).optional(),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().min(2, 'Select a state').max(80),

  termsAccepted: z.literal('on', { message: 'You must accept the Terms to continue' }),
})

/** Additional fields, by role */
const professionalSchema = z.object({
  designaType: z.enum(['DESIGNA', 'DESIGNI'], { message: 'Select either Designa or Designi' }),
  tier: z.enum(['PROFESSIONAL', 'LEGEND', 'INNOVATOR', 'STUDENT']),
  coaNumber: z.string().trim().max(40).optional(),
  firmName: z.string().trim().max(160).optional(),
  experience: z.coerce.number().int().min(0).max(80).optional(),
})

const consultantSchema = z.object({
  consultantGroup: z.enum([
    'ENGINEERING',
    'REAL_ESTATE',
    'FINANCIAL',
    'INDIAN_TRADITIONAL',
  ]),
  subCategory: z
    .string()
    .refine((s) => CONSULTANT_SUBCATEGORY_SLUGS.includes(s), 'Select a sub-category'),
  firmName: z.string().trim().max(160).optional(),
  experience: z.coerce.number().int().min(0).max(80).optional(),
})

const bmfSchema = z.object({
  designaType: z.enum(['DESIGNA', 'DESIGNI'], { message: 'Select either Designa or Designi' }),
  businessName: z.string().trim().min(2, 'Enter your business name').max(160),
  gstNumber: z.string().trim().max(20).optional(),
})

const corporateSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name').max(160),
  gstNumber: z.string().trim().min(15, 'A GST number is exactly 15 characters').max(15),
  panNumber: z.string().trim().length(10, 'A PAN is exactly 10 characters'),
  website: z.string().trim().url('Enter a valid website URL').optional().or(z.literal('')),
})

export type RegisterState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  /**
   * We send back everything the user had filled in, so that while they fix
   * one mistake the rest is still there. Without this a 12-field form would
   * empty itself on every error — and registration would be abandoned
   * halfway through.
   */
  values?: Record<string, string>
}

export async function registerAction(
  _prev: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const raw = stripEmpty(formData)

  const base = baseSchema.safeParse(raw)
  if (!base.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of base.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
    return { ok: false, error: 'Some fields need to be corrected.', fieldErrors, values: echo(raw) }
  }

  const data = base.data
  const email = normalizeEmail(data.email)

  // ★ The most important check — was the OTP actually verified?
  //
  // We do not consume the token here (consume = false). If some field
  // further down turns out to be wrong, the user can fix that same form and
  // submit again. The token is consumed only when the account is really
  // created — inside the transaction below.
  const verified = await checkVerifiedToken(email, data.token, 'REGISTRATION')
  if (!verified) {
    return {
      ok: false,
      error: 'Your email verification has expired. Please start again.',
    }
  }

  // ─── role-specific validation ───
  let profileData: Record<string, unknown> = {}
  const fieldErrors: Record<string, string> = {}

  const collect = (result: z.SafeParseReturnType<unknown, unknown>) => {
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        fieldErrors[key] ??= issue.message
      }
      return null
    }
    return result.data as Record<string, unknown>
  }

  switch (data.role) {
    case 'PROFESSIONAL': {
      const parsed = collect(professionalSchema.safeParse(raw))
      if (!parsed) break
      // §3.1.8.1.1 — a COA number is mandatory for architects (students exempt)
      if (
        parsed.designaType === 'DESIGNA' &&
        parsed.tier !== 'STUDENT' &&
        !parsed.coaNumber
      ) {
        fieldErrors.coaNumber = 'A COA number is required for architects'
      }
      profileData = parsed
      break
    }
    case 'CONSULTANT':
      profileData = collect(consultantSchema.safeParse(raw)) ?? {}
      break
    case 'BMF':
      profileData = collect(bmfSchema.safeParse(raw)) ?? {}
      break
    case 'CORPORATE':
      profileData = collect(corporateSchema.safeParse(raw)) ?? {}
      break
    case 'CLIENT':
      break
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: 'Some fields need to be corrected.', fieldErrors, values: echo(raw) }
  }

  // ─── create the user and profile together ───
  let role: Role = data.role
  // Whether this kind of account waits for a check is an admin setting
  // (/admin/visitors/verification/settings), read here at the moment it matters.
  const verification = await getVerificationConfig()
  const pending = needsVerification(verification, data.role, (profileData.tier as string | undefined) ?? null)
  let newUserId: string | null = null
  try {
    await prisma.$transaction(async (tx) => {
      // Consume the token now — from here on the account is being created.
      // updateMany plus the `usedAt: null` condition makes this atomic: if
      // two requests arrive at once, only one of them gets a count of 1.
      const consumed = await tx.otpRequest.updateMany({
        where: {
          identifier: email,
          purpose: 'REGISTRATION',
          verifiedToken: data.token,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      })
      if (consumed.count !== 1) {
        throw new Error('TOKEN_ALREADY_USED')
      }

      const user = await tx.user.create({
        data: {
          email,
          emailVerified: new Date(),
          mobile: data.mobile,
          role,
          // Per-role rule from Verification Settings; clients never wait.
          status: pending ? 'PENDING_VERIFICATION' : 'ACTIVE',
          name: data.name,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          addressLine: data.addressLine || null,
          pincode: data.pincode,
          city: data.city || null,
          state: data.state,
          termsAcceptedAt: new Date(),
          storageQuotaMb: BUSINESS_RULES.FREE_STORAGE_MB,
        },
      })

      switch (data.role) {
        case 'PROFESSIONAL':
          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              designaType: profileData.designaType as 'DESIGNA' | 'DESIGNI',
              tier: profileData.tier as never,
              coaNumber: (profileData.coaNumber as string) || null,
              firmName: (profileData.firmName as string) || null,
              experience: (profileData.experience as number) ?? null,
            },
          })
          break
        case 'CONSULTANT':
          await tx.consultantProfile.create({
            data: {
              userId: user.id,
              group: profileData.consultantGroup as never,
              subCategory: profileData.subCategory as string,
              firmName: (profileData.firmName as string) || null,
              experience: (profileData.experience as number) ?? null,
            },
          })
          break
        case 'BMF':
          await tx.bmfProfile.create({
            data: {
              userId: user.id,
              designaType: profileData.designaType as 'DESIGNA' | 'DESIGNI',
              businessName: profileData.businessName as string,
              gstNumber: (profileData.gstNumber as string) || null,
            },
          })
          break
        case 'CORPORATE':
          await tx.corporateProfile.create({
            data: {
              userId: user.id,
              companyName: profileData.companyName as string,
              gstNumber: profileData.gstNumber as string,
              panNumber: profileData.panNumber as string,
              website: (profileData.website as string) || null,
            },
          })
          break
        case 'CLIENT':
          break
      }

      role = user.role
      newUserId = user.id
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'TOKEN_ALREADY_USED') {
      return {
        ok: false,
        error: 'This verification code has already been used. Please start again.',
        values: echo(raw),
      }
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      const onMobile = target.includes('mobile')
      return {
        ok: false,
        error: onMobile
          ? 'This mobile number is already registered to another account.'
          : 'An account already exists for this email address.',
        fieldErrors: onMobile ? { mobile: 'This number is already in use' } : {},
        values: echo(raw),
      }
    }
    console.error('Registration fail:', e)
    return {
      ok: false,
      error: 'We could not create your account. Please try again.',
      values: echo(raw),
    }
  }

  // The default reviewer hears about every account that is waiting on them.
  if (pending && newUserId && verification.defaultReviewerId) {
    await prisma.notification
      .create({
        data: {
          userId: verification.defaultReviewerId,
          type: 'VERIFICATION_NEEDED',
          title: 'New account to verify',
          body: `${data.name} registered as ${String(data.role).toLowerCase()} and is waiting for verification.`,
          link: '/admin/users?status=pending',
        },
      })
      .catch(() => {})
  }

  // Welcome email — if sending fails, do not block the registration
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const mail = welcomeEmail(data.name, `${appUrl}${dashboardPathFor(role)}`)
    await sendMail({ to: email, ...mail })
  } catch (e) {
    console.error('Welcome email could not be sent:', e)
  }

  // Registration is complete and the email is already verified, so we
  // create the session straight away and send the user to the dashboard —
  // there is no need to make them sign in a second time.
  //
  // signIn() throws a redirect() internally, so this point is never
  // returned from. TypeScript cannot infer that, hence the `never` to make
  // clear that nothing runs after it.
  const loginToken = await mintLoginToken(email)
  await signIn('otp', {
    email,
    token: loginToken,
    redirectTo: dashboardPathFor(role),
  })

  return { ok: true }
}
