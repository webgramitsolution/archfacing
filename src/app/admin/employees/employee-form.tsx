'use client'

import { useActionState, useEffect, useState } from 'react'
import { createEmployeeAction, type EmployeeState } from './actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { Icon, Callout } from '@/components/ui'
import { INDIAN_STATES } from '@/config/states'

const ROLES = [
  {
    value: 'RM_EMPLOYEE',
    label: 'RM Employee',
    desc: 'Handles unassigned leads and views registrants in their own territory',
  },
  {
    value: 'ADMIN_SELLER',
    label: 'Admin — Seller',
    desc: 'Can post Merchandise and Podcast listings only',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    desc: 'Full access — users, PACT, moderation and payments',
  },
] as const

/** readable but strong password */
function suggestPassword() {
  const words = ['Delhi', 'Mumbai', 'Chennai', 'Jaipur', 'Kochi', 'Surat']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${w}@${n}af`
}

export function EmployeeForm() {
  const [state, submit, pending] = useActionState<EmployeeState | null, FormData>(
    createEmployeeAction,
    null
  )

  const [role, setRole] = useState<string>('RM_EMPLOYEE')
  const [password, setPassword] = useState('')
  const [showStates, setShowStates] = useState<string[]>([])

  const err = (k: string) => state?.fieldErrors?.[k]
  const prev = (k: string) => state?.values?.[k] ?? ''

  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state && !state.ok) setFormKey((k) => k + 1)
  }, [state])

  useEffect(() => {
    if (!password) setPassword(suggestPassword())
  }, [password])

  if (state?.ok && state.created) {
    return (
      <Callout tone="ok" icon="check" title={`Account created for ${state.created.name}`}>
        <p>
          <strong className="font-mono">{state.created.email}</strong> —{' '}
          {state.created.emailSent
            ? 'credentials have been emailed.'
            : 'SMTP is not configured, so no email was sent — share the password yourself.'}
        </p>
        <p className="mt-2">
          They sign in on this site&rsquo;s <strong>/login</strong> page by choosing
          “With password”, and will be asked to change it on first login.
        </p>
        <div className="mt-4">
          <Button type="button" onClick={() => window.location.reload()}>
            Create another employee
          </Button>
        </div>
      </Callout>
    )
  }

  return (
    <form key={formKey} action={submit} className="flex flex-col gap-6">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {/* ── role ── */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">
          Account type<span className="ml-1 text-brand">*</span>
        </legend>

        {ROLES.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer gap-3 rounded-card border p-4 transition-colors ${
              role === r.value
                ? 'border-brand bg-brand-soft'
                : 'border-line bg-paper-2 hover:border-ink-4'
            }`}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
              className="mt-1 accent-brand"
            />
            <span>
              <span className="block text-[14px] font-semibold text-ink">
                {r.label}
              </span>
              <span className="block text-[12.5px] text-ink-2">{r.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* ── basics ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required error={err('name')}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={prev('name')}
            error={!!err('name')}
          />
        </Field>

        <Field
          label="Email"
          name="email"
          required
          hint="This will be their login username"
          error={err('email')}
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={prev('email')}
            error={!!err('email')}
          />
        </Field>

        <Field label="Mobile" name="mobile" error={err('mobile')}>
          <Input
            id="mobile"
            name="mobile"
            inputMode="numeric"
            maxLength={10}
            defaultValue={prev('mobile')}
            error={!!err('mobile')}
          />
        </Field>

        <Field label="Department" name="department">
          <Input
            id="department"
            name="department"
            placeholder="e.g. North Zone"
            defaultValue={prev('department')}
          />
        </Field>
      </div>

      {/* ── password ── */}
      <Field
        label="Password"
        name="password"
        required
        hint="They will be asked to change this on first login"
        error={err('password')}
      >
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            error={!!err('password')}
            className="font-mono"
          />
          <button
            type="button"
            onClick={() => setPassword(suggestPassword())}
            className="btn-outline shrink-0 px-3"
            title="Generate a new password"
          >
            <Icon name="settings" className="h-4 w-4" />
          </button>
        </div>
      </Field>

      {/* ── territory — RM only ── */}
      {role === 'RM_EMPLOYEE' && (
        <fieldset className="rounded-card border border-line bg-paper-3 p-5">
          <legend className="eyebrow px-1">Territory</legend>
          <p className="mb-4 text-[13px] text-ink-2">
            They will only see leads from the states or PIN codes selected here.
            Leave blank for all of India.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="States" name="statesPicker">
              <Select
                id="statesPicker"
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v && !showStates.includes(v)) setShowStates([...showStates, v])
                }}
              >
                <option value="">Add a state…</option>
                {INDIAN_STATES.filter((s) => !showStates.includes(s)).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <input type="hidden" name="states" value={showStates.join(',')} />
            </Field>

            <Field
              label="PIN codes"
              name="pincodes"
              hint="Separate with commas or spaces"
            >
              <Input
                id="pincodes"
                name="pincodes"
                placeholder="110005, 110016"
                defaultValue={prev('pincodes')}
                className="font-mono"
              />
            </Field>
          </div>

          {showStates.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {showStates.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setShowStates(showStates.filter((x) => x !== s))}
                    className="pill-brand gap-1"
                  >
                    {s}
                    <span aria-hidden>×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create employee'}
        </Button>
        <p className="text-[12.5px] text-ink-3">
          Credentials will be emailed to them.
        </p>
      </div>
    </form>
  )
}
