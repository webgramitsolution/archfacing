'use client'

import { useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  requestOtpAction,
  verifyOtpAction,
  registerAction,
  type OtpState,
  type VerifyState,
  type RegisterState,
} from '../actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { INDIAN_STATES } from '@/config/states'
import { CONSULTANT_GROUPS } from '@/config/taxonomy'
import { cn } from '@/lib/utils'

/**
 * Four steps, matching the reference: the visitor first picks WHO they are,
 * then verifies an email, then enters the code, then fills in their details.
 */
const STEPS = ['Type', 'Email', 'Verify', 'Details'] as const

/** §4.1 — who is allowed to register */
const ROLES: readonly {
  value: 'CLIENT' | 'PROFESSIONAL' | 'CONSULTANT' | 'BMF' | 'CORPORATE'
  label: string
  hint: string
  free?: boolean
}[] = [
  {
    value: 'CLIENT',
    label: 'Visitor / Client',
    hint: 'Looking for design and architecture services',
    free: true,
  },
  {
    value: 'PROFESSIONAL',
    label: 'Professional (Designa / Designi)',
    hint: 'Architect, Interior Designer, Legend, Innovator, Student',
  },
  {
    value: 'CONSULTANT',
    label: 'Consultant',
    hint: 'Engineering, Real Estate, Financial, Indian Traditional Sciences',
  },
  {
    value: 'BMF',
    label: 'Building Materials Facilitator (BMF)',
    hint: 'Building materials supplier or facilitator',
  },
  {
    value: 'CORPORATE',
    label: 'Corporate / Company',
    hint: 'Corporate entity or product company',
  },
]

type RoleValue = (typeof ROLES)[number]['value']

export function RegisterForm() {
  const params = useSearchParams()
  const preselect = params.get('type')?.toUpperCase()
  const preselected = ROLES.some((r) => r.value === preselect)

  // A `?type=` from the marketing site pre-picks the role and skips step 1.
  const [step, setStep] = useState(preselected ? 1 : 0)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [role, setRole] = useState<RoleValue>(
    preselected ? (preselect as RoleValue) : 'CLIENT'
  )

  const [otpState, requestOtp, otpPending] = useActionState<OtpState | null, FormData>(
    requestOtpAction,
    null
  )
  const [verifyState, doVerify, verifyPending] = useActionState<
    VerifyState | null,
    FormData
  >(verifyOtpAction, null)
  const [regState, doRegister, regPending] = useActionState<
    RegisterState | null,
    FormData
  >(registerAction, null)

  // OTP sent → Verify (step 2)
  useEffect(() => {
    if (otpState?.ok && otpState.email) {
      setEmail(otpState.email)
      setStep(2)
    }
  }, [otpState])

  // OTP accepted → Details (step 3)
  useEffect(() => {
    if (verifyState?.ok && verifyState.token) {
      setToken(verifyState.token)
      setStep(3)
    }
  }, [verifyState])

  const fieldError = (k: string) => regState?.fieldErrors?.[k]
  // The form re-renders after an error; put the entered values back in
  const prev = (k: string) => regState?.values?.[k] ?? ''

  /**
   * Remount the form under a new key after every submit.
   *
   * Without this, `<select>` elements and checkboxes lose their value —
   * React reuses the same DOM nodes and `defaultValue` only applies on
   * mount. Text inputs keep their value, but a select loses its selection
   * the moment its options are rebuilt.
   */
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (regState) setFormKey((k) => k + 1)
  }, [regState])

  const roleLabel = ROLES.find((r) => r.value === role)?.label

  return (
    <div>
      {/* ─── header · title, "Step n of 4" and the segmented bar ─── */}
      <div className="mb-8">
        <h1 className="font-display text-[19px] font-bold leading-tight tracking-tight text-ink">
          Register on ArchFacing
        </h1>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          Step {step + 1} of {STEPS.length}
        </p>

        <div className="mt-5 flex gap-2" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-pill transition-colors',
                i <= step ? 'bg-brand' : 'bg-line'
              )}
            />
          ))}
        </div>
      </div>

      {/* ─── STEP 1 — Choose Registration Type ─── */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-[26px] font-bold tracking-tight text-ink">
            Choose Registration Type
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-3">
            Select the type that best describes you
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setRole(r.value)
                  // Already verified? Go straight back to Details. Otherwise
                  // continue to the email step.
                  setStep(token ? 3 : 1)
                }}
                className={cn(
                  'group flex flex-col rounded-[10px] border bg-white px-5 py-4 text-left transition-all hover:border-brand hover:shadow-card',
                  role === r.value && preselected
                    ? 'border-brand ring-1 ring-brand/30'
                    : 'border-line'
                )}
              >
                <span className="text-[15px] font-bold text-ink transition-colors group-hover:text-brand">
                  {r.label}
                </span>
                <span className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
                  {r.hint}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-[13px] text-ink-3">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}

      {/* ─── STEP 2 — Email ─── */}
      {step === 1 && (
        <form action={requestOtp} className="flex flex-col gap-5">
          <input type="hidden" name="mode" value="REGISTRATION" />

          <SelectedType role={role} label={roleLabel} onChange={() => setStep(0)} />

          <div>
            <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">
              Verify your email
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-3">
              We&apos;ll send a 6-digit code to confirm it&apos;s you.
            </p>
          </div>

          <Field
            label="Email address"
            name="email"
            required
            hint="We will send a 6-digit verification code to this address"
            error={otpState?.ok === false ? otpState.error : undefined}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="aap@example.com"
              required
              autoFocus
              defaultValue={otpState?.email ?? ''}
              error={otpState?.ok === false}
            />
          </Field>

          <Button type="submit" disabled={otpPending}>
            {otpPending ? 'Sending code…' : 'Send verification code'}
          </Button>
        </form>
      )}

      {/* ─── STEP 3 — OTP ─── */}
      {step === 2 && (
        <form action={doVerify} className="flex flex-col gap-5">
          <input type="hidden" name="mode" value="REGISTRATION" />
          <input type="hidden" name="email" value={email} />

          <Alert tone="info">
            We have sent a code to <strong>{email}</strong>. It is valid for 10 minutes.
          </Alert>

          {otpState?.devCode && (
            <Alert tone="success">
              <strong>Dev mode</strong> — SMTP is not configured, so the code is shown here:{' '}
              <code className="font-mono text-base font-semibold tracking-widest">
                {otpState.devCode}
              </code>
            </Alert>
          )}

          <Field
            label="6-digit code"
            name="code"
            required
            error={verifyState?.ok === false ? verifyState.error : undefined}
          >
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              required
              autoFocus
              error={verifyState?.ok === false}
              className="text-center font-mono text-2xl tracking-[0.4em]"
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={verifyPending}>
              {verifyPending ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Change email
            </Button>
          </div>
        </form>
      )}

      {/* ─── STEP 4 — Details ─── */}
      {step === 3 && (
        <form key={formKey} action={doRegister} className="flex flex-col gap-6">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />
          {/* Role was chosen in step 1 and is carried through, not re-asked. */}
          <input type="hidden" name="role" value={role} />

          {regState?.error && <Alert tone="error">{regState.error}</Alert>}

          <Alert tone="success">
            <strong>{email}</strong> verified ✓
          </Alert>

          <SelectedType role={role} label={roleLabel} onChange={() => setStep(0)} />
          {fieldError('role') && (
            <p className="-mt-3 text-[12px] text-brand">{fieldError('role')}</p>
          )}

          {/* ── basic ── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Full name" name="name" required error={fieldError('name')}>
              <Input id="name" name="name" defaultValue={prev('name')} required error={!!fieldError('name')} />
            </Field>

            <Field
              label="Mobile number"
              name="mobile"
              required
              hint="10 digits, without +91"
              error={fieldError('mobile')}
            >
              <Input
                id="mobile"
                name="mobile"
                defaultValue={prev('mobile')}
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                required
                error={!!fieldError('mobile')}
              />
            </Field>

            <Field label="Gender" name="gender">
              <Select id="gender" name="gender" defaultValue={prev('gender')}>
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>

            <Field label="Date of birth" name="dateOfBirth">
              <Input id="dateOfBirth" name="dateOfBirth" defaultValue={prev('dateOfBirth')} type="date" />
            </Field>
          </div>

          {/* ── address ── */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Field label="Address" name="addressLine">
                <Input id="addressLine" name="addressLine" defaultValue={prev('addressLine')} />
              </Field>
            </div>

            <Field
              label="PIN code"
              name="pincode"
              required
              hint="This becomes your PACT area"
              error={fieldError('pincode')}
            >
              <Input
                id="pincode"
                name="pincode"
                defaultValue={prev('pincode')}
                inputMode="numeric"
                maxLength={6}
                placeholder="110005"
                required
                error={!!fieldError('pincode')}
              />
            </Field>

            <Field label="City" name="city">
              <Input id="city" name="city" defaultValue={prev('city')} />
            </Field>

            <div className="lg:col-span-2">
              <Field label="State" name="state" required error={fieldError('state')}>
                <Select id="state" name="state" defaultValue={prev('state')} required error={!!fieldError('state')}>
                  <option value="">Select…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          {/* ── role-specific ── */}
          <RoleFields role={role} fieldError={fieldError} prev={prev} />

          {/* ── terms ── */}
          <div>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                name="termsAccepted"
                defaultChecked={prev('termsAccepted') === 'on'}
                required
                className="mt-0.5 accent-brand"
              />
              <span className="text-[13px] text-ink-2">
                I accept the ArchFacing{' '}
                <Link href="/legal/terms" className="text-brand hover:underline">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
                <span className="ml-1 text-brand">★</span>
              </span>
            </label>
            {fieldError('termsAccepted') && (
              <p className="mt-1 text-[12px] text-brand">
                {fieldError('termsAccepted')}
              </p>
            )}
          </div>

          <Button type="submit" disabled={regPending}>
            {regPending ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
      )}
    </div>
  )
}

/** The little "Registering as … · Change" row shown after the type is chosen. */
function SelectedType({
  role,
  label,
  onChange,
}: {
  role: RoleValue
  label?: string
  onChange: () => void
}) {
  void role
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-paper-2 px-4 py-3">
      <span className="min-w-0 text-[13px] text-ink-2">
        Registering as{' '}
        <strong className="font-semibold text-ink">{label}</strong>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-[12.5px] font-medium text-brand hover:underline"
      >
        Change
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Additional fields, by role
// ═══════════════════════════════════════════════════════════

function RoleFields({
  role,
  fieldError,
  prev,
}: {
  role: RoleValue
  fieldError: (k: string) => string | undefined
  prev: (k: string) => string
}) {
  const [designaType, setDesignaType] = useState(prev('designaType'))
  const [tier, setTier] = useState(prev('tier') || 'PROFESSIONAL')
  const [group, setGroup] = useState(prev('consultantGroup'))

  if (role === 'CLIENT') return null

  const box = 'rounded-card border border-line bg-paper-2 p-5'

  if (role === 'PROFESSIONAL') {
    // §3.1.8.1.1 — a COA number is required for architects (Designa); students are exempt
    const coaRequired = designaType === 'DESIGNA' && tier !== 'STUDENT'

    return (
      <div className={box}>
        <p className="eyebrow mb-4">Professional</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field
            label="Are you Designa or Designi?"
            name="designaType"
            required
            error={fieldError('designaType')}
          >
            <Select
              id="designaType"
              name="designaType"
              required
              value={designaType}
              onChange={(e) => setDesignaType(e.target.value)}
              error={!!fieldError('designaType')}
            >
              <option value="">Select…</option>
              <option value="DESIGNA">DESIGNA — Architecture</option>
              <option value="DESIGNI">DESIGNI — Interior Design</option>
            </Select>
          </Field>

          <Field label="Category" name="tier" required>
            <Select
              id="tier"
              name="tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="PROFESSIONAL">Professional</option>
              <option value="LEGEND">Legend</option>
              <option value="INNOVATOR">Innovator</option>
              <option value="STUDENT">Student (free)</option>
            </Select>
          </Field>

          <Field
            label="COA number"
            name="coaNumber"
            required={coaRequired}
            hint={
              coaRequired
                ? 'Your Council of Architecture registration number'
                : 'Enter it if you have one'
            }
            error={fieldError('coaNumber')}
          >
            <Input
              id="coaNumber"
              name="coaNumber"
              defaultValue={prev('coaNumber')}
              error={!!fieldError('coaNumber')}
            />
          </Field>

          <Field label="Firm name" name="firmName">
            <Input id="firmName" name="firmName" defaultValue={prev('firmName')} />
          </Field>

          <Field label="Experience (years)" name="experience">
            <Input id="experience" name="experience" defaultValue={prev('experience')} type="number" min={0} max={80} />
          </Field>
        </div>
      </div>
    )
  }

  if (role === 'CONSULTANT') {
    const subs = CONSULTANT_GROUPS.find(
      (g) => g.slug === group.toLowerCase().replace(/_/g, '-')
    )?.children

    return (
      <div className={box}>
        <p className="eyebrow mb-4">Consultant</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field
            label="Group"
            name="consultantGroup"
            required
            error={fieldError('consultantGroup')}
          >
            <Select
              id="consultantGroup"
              name="consultantGroup"
              required
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              error={!!fieldError('consultantGroup')}
            >
              <option value="">Select…</option>
              <option value="ENGINEERING">Engineering Consultants</option>
              <option value="REAL_ESTATE">Real Estate Consultants</option>
              <option value="FINANCIAL">Financial Consultants</option>
              <option value="INDIAN_TRADITIONAL">Indian Traditional Sciences</option>
            </Select>
          </Field>

          <Field
            label="Sub-category"
            name="subCategory"
            required
            hint="This determines your PACT seat"
            error={fieldError('subCategory')}
          >
            <Select
              id="subCategory"
              name="subCategory"
              required
              disabled={!subs}
              error={!!fieldError('subCategory')}
            >
              <option value="">
                {subs ? 'Select…' : 'Choose a group first'}
              </option>
              {subs?.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Firm name" name="firmName">
            <Input id="firmName" name="firmName" defaultValue={prev('firmName')} />
          </Field>

          <Field label="Experience (years)" name="experience">
            <Input id="experience" name="experience" defaultValue={prev('experience')} type="number" min={0} max={80} />
          </Field>
        </div>
      </div>
    )
  }

  if (role === 'BMF') {
    return (
      <div className={box}>
        <p className="eyebrow mb-4">Building Materials Facilitator</p>
        <Alert tone="info">
          A BMF must belong to the Designa or Designi community.
        </Alert>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Field
            label="Are you Designa or Designi?"
            name="designaType"
            required
            error={fieldError('designaType')}
          >
            <Select
              id="designaType"
              name="designaType"
              required
              error={!!fieldError('designaType')}
            >
              <option value="">Select…</option>
              <option value="DESIGNA">DESIGNA — Architecture</option>
              <option value="DESIGNI">DESIGNI — Interior Design</option>
            </Select>
          </Field>

          <Field
            label="Business name"
            name="businessName"
            required
            error={fieldError('businessName')}
          >
            <Input
              id="businessName"
              name="businessName"
              defaultValue={prev('businessName')}
              required
              error={!!fieldError('businessName')}
            />
          </Field>

          <Field label="GST number" name="gstNumber">
            <Input id="gstNumber" name="gstNumber" defaultValue={prev('gstNumber')} maxLength={15} />
          </Field>
        </div>
      </div>
    )
  }

  // CORPORATE
  return (
    <div className={box}>
      <p className="eyebrow mb-4">Corporate</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Field
            label="Company name"
            name="companyName"
            required
            error={fieldError('companyName')}
          >
            <Input
              id="companyName"
              name="companyName"
              defaultValue={prev('companyName')}
              required
              error={!!fieldError('companyName')}
            />
          </Field>
        </div>

        <Field
          label="GST number"
          name="gstNumber"
          required
          hint="15 characters"
          error={fieldError('gstNumber')}
        >
          <Input
            id="gstNumber"
            name="gstNumber"
            defaultValue={prev('gstNumber')}
            maxLength={15}
            required
            error={!!fieldError('gstNumber')}
          />
        </Field>

        <Field
          label="PAN number"
          name="panNumber"
          required
          hint="10 characters"
          error={fieldError('panNumber')}
        >
          <Input
            id="panNumber"
            name="panNumber"
            defaultValue={prev('panNumber')}
            maxLength={10}
            required
            error={!!fieldError('panNumber')}
          />
        </Field>

        <div className="lg:col-span-2">
          <Field label="Website" name="website" error={fieldError('website')}>
            <Input
              id="website"
              name="website"
              defaultValue={prev('website')}
              type="url"
              placeholder="https://example.com"
              error={!!fieldError('website')}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
