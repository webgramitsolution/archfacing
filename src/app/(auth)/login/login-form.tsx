'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import {
  requestOtpAction,
  verifyOtpAction,
  completeLoginAction,
  type OtpState,
  type VerifyState,
} from '../actions'
import { Field, Input, Button, Alert } from '@/components/form'

type Mode = 'otp' | 'password'

export function LoginForm({
  initialError,
  next = '/dashboard',
}: {
  initialError?: string
  /** Already validated by safeNext() on the server — safe to redirect to. */
  next?: string
}) {
  const [mode, setMode] = useState<Mode>('otp')

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Sign in
      </h1>
      <p className="mb-8 mt-2 text-[15px] text-ink-2">
        Continue to your ArchFacing dashboard.
      </p>

      {initialError && (
        <div className="mb-6">
          <Alert tone="error">{errorMessage(initialError)}</Alert>
        </div>
      )}

      {/*
        Everyone signs in with an email code. Password sign-in exists only for
        staff accounts (Admin, Admin-Seller, RM Employee — see the actions), so
        it is tucked behind a quiet link rather than shown as a co-equal tab.
      */}
      {mode === 'otp' ? (
        <>
          <OtpLogin next={next} />

          <div className="mt-6 border-t border-line-soft pt-5">
            <button
              type="button"
              onClick={() => setMode('password')}
              className="text-[12.5px] font-medium text-ink-3 transition-colors hover:text-brand"
            >
              Staff member? Sign in with a password
            </button>
          </div>
        </>
      ) : (
        <>
          <PasswordLogin next={next} />

          <button
            type="button"
            onClick={() => setMode('otp')}
            className="mt-6 text-[12.5px] font-medium text-brand hover:underline"
          >
            ← Back to email sign-in
          </button>
        </>
      )}

      <p className="mt-8 text-[13px] text-ink-3">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Register now
        </Link>
      </p>
    </div>
  )
}

function errorMessage(code: string) {
  switch (code) {
    case 'banned':
      return 'This account has been closed. Please contact support@archfacing.com.'
    case 'suspended':
      return 'This account is currently suspended. Please contact support@archfacing.com.'
    case 'notfound':
      return 'No account was found for this email address.'
    case 'CredentialsSignin':
      return 'That email address or password is incorrect.'
    default:
      return 'We could not sign you in. Please try again.'
  }
}

// ═══════════════════════════════════════════════════════════
//  Email + OTP
// ═══════════════════════════════════════════════════════════

function OtpLogin({ next }: { next: string }) {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()

  const [otpState, requestOtp, otpPending] = useActionState<OtpState | null, FormData>(
    requestOtpAction,
    null
  )
  const [verifyState, doVerify, verifyPending] = useActionState<
    VerifyState | null,
    FormData
  >(verifyOtpAction, null)

  useEffect(() => {
    if (otpState?.ok && otpState.email) {
      setEmail(otpState.email)
      setStep(1)
    }
  }, [otpState])

  // OTP accepted → create the session and go to the dashboard
  useEffect(() => {
    if (verifyState?.ok && verifyState.token && verifyState.email) {
      startTransition(() => {
        void completeLoginAction(verifyState.email!, verifyState.token!, next)
      })
    }
  }, [verifyState])

  if (step === 0) {
    return (
      <form action={requestOtp} className="flex flex-col gap-5">
        <input type="hidden" name="mode" value="LOGIN" />

        <Field
          label="Email address"
          name="email"
          required
          hint="We will send your sign-in code to this address"
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
          {otpPending ? 'Sending code…' : 'Send sign-in code'}
        </Button>
      </form>
    )
  }

  return (
    <form action={doVerify} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value="LOGIN" />
      <input type="hidden" name="email" value={email} />

      <Alert tone="info">
        We have sent a code to <strong>{email}</strong>.
      </Alert>

      {otpState?.devCode && (
        <Alert tone="success">
          <strong>Dev mode</strong> — code:{' '}
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
        <Button type="submit" disabled={verifyPending || pending}>
          {verifyPending || pending ? 'Verifying…' : 'Sign in'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep(0)}>
          Change email
        </Button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  Email + Password — Admin, Admin-Seller, RM Employee
// ═══════════════════════════════════════════════════════════

function PasswordLogin({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await signIn('password', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        redirect: false,
      })

      if (res?.error) {
        setError('That email address or password is incorrect.')
        return
      }
      // /dashboard routes on to the right place for the role; any other
      // destination is where the visitor was headed before we asked them to
      // sign in.
      window.location.href = next
    })
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      {error && <Alert tone="error">{error}</Alert>}

      <Field label="Email address" name="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          error={!!error}
        />
      </Field>

      <Field
        label="Password"
        name="password"
        required
        hint="Employee? Use the password your administrator issued to you."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={!!error}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
