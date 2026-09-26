'use client'

import { useActionState } from 'react'
import { Icon } from '@/components/ui'
import { saveProfileAction, type ProfileState } from './profile-actions'

export type ProfileValues = {
  name: string
  email: string
  mobile: string
  gender: string
  addressLine: string
  pincode: string
  city: string
  state: string
  facebookUrl: string
  instagramUrl: string
  linkedinUrl: string
  youtubeUrl: string
  twitterUrl: string
}

const SOCIALS = [
  ['facebookUrl', 'Facebook'],
  ['instagramUrl', 'Instagram'],
  ['linkedinUrl', 'LinkedIn'],
  ['youtubeUrl', 'YouTube'],
  ['twitterUrl', 'X / Twitter'],
] as const

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, save, pending] = useActionState<ProfileState, FormData>(
    saveProfileAction,
    null
  )

  const err = (k: string) => state?.fieldErrors?.[k]

  return (
    <form action={save} className="flex flex-col gap-5">
      {state && (
        <p
          className={
            state.ok
              ? 'rounded-lg border border-ok/25 bg-ok-soft px-4 py-3 text-[13.5px] text-ink-2'
              : 'rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-ink-2'
          }
        >
          {state.ok ? state.message : state.error}
        </p>
      )}

      {/* ─── who you are ─── */}
      <fieldset className="rounded-xl border border-line bg-paper-2 p-5">
        <legend className="eyebrow px-1">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field name="name" label="Full name" required error={err('name')}
            defaultValue={values.name} placeholder="Ar. Ritu Sharma" />

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">
              Email address
            </label>
            <input value={values.email} disabled className="input" />
            <p className="mt-1 text-[12px] text-ink-4">
              This is your sign-in identity, so it cannot be changed here.
            </p>
          </div>

          <Field name="mobile" label="Mobile" error={err('mobile')}
            defaultValue={values.mobile} placeholder="9876543210" inputMode="numeric" />

          <div>
            <label htmlFor="gender" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Gender
            </label>
            <select id="gender" name="gender" defaultValue={values.gender} className="input">
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* ─── where you are ─── */}
      <fieldset className="rounded-xl border border-line bg-paper-2 p-5">
        <legend className="eyebrow px-1">Where you work</legend>
        <p className="mb-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          Your PIN code is what a PACT is bought against, and it decides which
          enquiries reach you.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2">
            <Field name="addressLine" label="Address" error={err('addressLine')}
              defaultValue={values.addressLine} placeholder="Street, area, landmark" />
          </div>
          <Field name="pincode" label="PIN code" error={err('pincode')}
            defaultValue={values.pincode} placeholder="110029" inputMode="numeric" />
          <Field name="city" label="City" error={err('city')}
            defaultValue={values.city} placeholder="New Delhi" />
          <Field name="state" label="State" error={err('state')}
            defaultValue={values.state} placeholder="Delhi" />
        </div>
      </fieldset>

      {/* ─── links ─── */}
      <fieldset className="rounded-xl border border-line bg-paper-2 p-5">
        <legend className="eyebrow px-1">Social links</legend>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SOCIALS.map(([key, label]) => (
            <Field
              key={key}
              name={key}
              label={label}
              error={err(key)}
              defaultValue={values[key]}
              placeholder="https://"
              type="url"
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        <p className="text-[12.5px] text-ink-3">
          A fuller profile ranks higher in Consult Nearby.
        </p>
      </div>
    </form>
  )
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  error,
  required,
  type = 'text',
  inputMode,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
  error?: string
  required?: boolean
  type?: string
  inputMode?: 'numeric' | 'text'
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={error ? 'input input-error' : 'input'}
      />
      {error && <p className="mt-1 text-[12px] text-brand">{error}</p>}
    </div>
  )
}
