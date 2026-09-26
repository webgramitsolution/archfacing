'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  submitEnquiryAction,
  previewRecipientAction,
  type EnquiryState,
} from './actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { DESIGNA_CATEGORIES, DESIGNI_CATEGORIES, CONSULTANT_GROUPS } from '@/config/taxonomy'

/** §4.1.2 (IX) — the "Menu of service" the client picks from */
const SERVICES = [
  { value: 'DESIGNA', label: 'DESIGNA — Architect', hint: 'Drawings, urban planning, project management' },
  { value: 'DESIGNI', label: 'DESIGNI — Interior Designer', hint: 'Interior, vaastu, furniture, lighting' },
  { value: 'CONSULTANT', label: 'Consultant', hint: 'Engineering, real estate, financial, traditional' },
  { value: 'BMF', label: 'Building Materials', hint: 'Material supply and advice' },
] as const

export function EnquiryForm({
  defaultPincode,
  isLoggedIn,
}: {
  defaultPincode?: string
  isLoggedIn: boolean
}) {
  const [state, submit, pending] = useActionState<EnquiryState | null, FormData>(
    submitEnquiryAction,
    null
  )

  const [pincode, setPincode] = useState(defaultPincode ?? '')
  const [serviceType, setServiceType] = useState<string>('DESIGNA')
  const [group, setGroup] = useState('')
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewRecipientAction>
  > | null>(null)
  const [, startPreview] = useTransition()

  const err = (k: string) => state?.fieldErrors?.[k]
  const prev = (k: string) => state?.values?.[k] ?? ''

  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state && !state.ok) setFormKey((k) => k + 1)
  }, [state])

  // as soon as the PIN is complete, show who will respond
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setPreview(null)
      return
    }
    startPreview(async () => {
      const sub =
        serviceType === 'CONSULTANT'
          ? (document.querySelector<HTMLSelectElement>('[name=subCategory]')?.value ?? null)
          : null
      setPreview(await previewRecipientAction(pincode, serviceType as never, sub))
    })
  }, [pincode, serviceType])

  const subOptions =
    serviceType === 'DESIGNA'
      ? DESIGNA_CATEGORIES
      : serviceType === 'DESIGNI'
        ? DESIGNI_CATEGORIES
        : []

  const consultantSubs =
    CONSULTANT_GROUPS.find((g) => g.slug === group)?.children ?? []

  if (state?.ok) {
    return (
      <Alert tone="success">
        <strong>Your enquiry has been sent.</strong>{' '}
        {state.routedTo
          ? `${state.routedTo} has received it and will get in touch shortly.`
          : 'There is no registrant in this area yet, so the ArchFacing team is reviewing it and will connect you.'}{' '}
        <Link href="/dashboard" className="font-medium text-brand hover:underline">
          Track it in your dashboard →
        </Link>
      </Alert>
    )
  }

  return (
    <form key={formKey} action={submit} className="flex flex-col gap-6">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {!isLoggedIn && (
        <Alert tone="info">
          Please{' '}
          <Link href="/login?next=/consult-nearby" className="font-medium text-brand hover:underline">
            sign in
          </Link>{' '}
          before sending an enquiry, so the reply can reach you. Client registration is free.
        </Alert>
      )}

      {/* ── location ── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="PIN code"
          name="pincode"
          required
          hint="Where the work will happen"
          error={err('pincode')}
        >
          <Input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            required
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            error={!!err('pincode')}
            className="font-mono"
          />
        </Field>

        <div className="flex items-end">
          {preview && (
            <div
              className={`w-full rounded-card border px-3.5 py-2.5 text-[12.5px] leading-snug ${
                preview.routed
                  ? 'border-ok bg-ok-soft'
                  : 'border-line bg-paper-2'
              }`}
            >
              <span className="block font-medium text-ink">
                {preview.district} · {preview.state}
              </span>
              <span className="text-ink-2">
                {preview.routed
                  ? preview.via === 'exact'
                    ? 'A registrant is available for this PIN ✓'
                    : `A registrant from a nearby area will handle it (${preview.distanceKm} km)`
                  : 'No registrant here yet — the ArchFacing team will review it'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── what is needed ── */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-medium text-ink">
          What do you need?<span className="ml-1 text-brand">★</span>
        </legend>

        {SERVICES.map((s) => (
          <label
            key={s.value}
            className={`flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors ${
              serviceType === s.value
                ? 'border-brand bg-brand-soft'
                : 'border-line bg-paper-2 hover:border-ink-3'
            }`}
          >
            <input
              type="radio"
              name="serviceType"
              value={s.value}
              checked={serviceType === s.value}
              onChange={() => {
                setServiceType(s.value)
                setGroup('')
              }}
              className="mt-1 accent-brand"
            />
            <span>
              <span className="block text-[14px] font-semibold">{s.label}</span>
              <span className="block text-[12.5px] text-ink-2">{s.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* ── consultant selection ── */}
      {serviceType === 'CONSULTANT' ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type of consultant" name="consultantGroup" required>
            <Select
              id="consultantGroup"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {CONSULTANT_GROUPS.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Specialisation"
            name="subCategory"
            required
            error={err('subCategory')}
          >
            <Select
              id="subCategory"
              name="subCategory"
              required
              disabled={!consultantSubs.length}
              error={!!err('subCategory')}
            >
              <option value="">
                {consultantSubs.length ? 'Select…' : 'Choose the type above first'}
              </option>
              {consultantSubs.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : subOptions.length > 0 ? (
        <Field label="Type of work" name="subCategory" hint="Optional">
          <Select id="subCategory" name="subCategory" defaultValue={prev('subCategory')}>
            <option value="">Any</option>
            {subOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {/* ── requirement ── */}
      <Field label="Subject" name="subject" required error={err('subject')}>
        <Input
          id="subject"
          name="subject"
          required
          maxLength={180}
          placeholder="e.g. Two-storey house on a 200 sq yd plot"
          defaultValue={prev('subject')}
          error={!!err('subject')}
        />
      </Field>

      <Field
        label="Describe your requirement"
        name="message"
        required
        hint="The clearer you are, the better the response"
        error={err('message')}
      >
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          defaultValue={prev('message')}
          className={`w-full rounded-card border bg-paper-2 px-3 py-2.5 text-[14px] leading-relaxed focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
            err('message') ? 'border-brand' : 'border-line'
          }`}
        />
      </Field>

      <Field label="Estimated budget (₹)" name="budget" hint="Optional">
        <Input
          id="budget"
          name="budget"
          type="number"
          min={0}
          defaultValue={prev('budget')}
          className="max-w-[14rem] font-mono"
        />
      </Field>

      {/* ── contact ── */}
      <fieldset className="rounded-card border border-line bg-paper-2 p-5">
        <legend className="eyebrow px-1">How to reach you</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Name" name="contactName" required error={err('contactName')}>
            <Input
              id="contactName"
              name="contactName"
              required
              defaultValue={prev('contactName')}
              error={!!err('contactName')}
            />
          </Field>

          <Field label="Mobile" name="contactPhone" required error={err('contactPhone')}>
            <Input
              id="contactPhone"
              name="contactPhone"
              inputMode="numeric"
              maxLength={10}
              required
              defaultValue={prev('contactPhone')}
              error={!!err('contactPhone')}
            />
          </Field>

          <Field label="Email" name="contactEmail" error={err('contactEmail')}>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={prev('contactEmail')}
              error={!!err('contactEmail')}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send Enquiry'}
        </Button>
        <p className="text-[12.5px] text-ink-3">
          This goes directly to the registrant for that area — no middlemen.
        </p>
      </div>
    </form>
  )
}
