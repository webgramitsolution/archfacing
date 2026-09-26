'use client'

import { useActionState } from 'react'
import { sendSellerMessageAction, type ContactState } from './contact-actions'

/** The storefront contact form — plain form + server action, no libraries. */
export function SellerContactForm({ company, sellerName }: { company: string; sellerName: string }) {
  const [state, submit, pending] = useActionState<ContactState | null, FormData>(
    sendSellerMessageAction,
    null
  )

  const err = (k: string) => state?.fieldErrors?.[k]

  if (state?.ok) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h3 className="mt-4 font-display text-[18px] font-bold text-ink">Message sent</h3>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-2">
          {sellerName} has received your message and will reply to the email address you
          gave.
        </p>
      </div>
    )
  }

  const input =
    'w-full rounded-lg border border-line bg-paper-2 px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="company" value={company} />

      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">
            First Name <span className="text-brand">*</span>
          </span>
          <input name="firstName" required maxLength={80} placeholder="Your first name" className={input} />
          {err('firstName') && <span className="mt-1 block text-[11.5px] text-danger">{err('firstName')}</span>}
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">Last Name</span>
          <input name="lastName" maxLength={80} placeholder="Your last name" className={input} />
        </label>
      </div>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          Email <span className="text-brand">*</span>
        </span>
        <input name="email" type="email" required placeholder="you@example.com" className={input} />
        {err('email') && <span className="mt-1 block text-[11.5px] text-danger">{err('email')}</span>}
      </label>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          Message <span className="text-brand">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={2000}
          placeholder="Tell them what you are looking for…"
          className={`${input} resize-y`}
        />
        {err('message') && <span className="mt-1 block text-[11.5px] text-danger">{err('message')}</span>}
      </label>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" name="consentPromo" className="mt-0.5 accent-brand" />
        <span className="text-[12px] leading-snug text-ink-2">
          I&apos;d like to receive occasional updates and offers from {sellerName}.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" name="consentStorage" required className="mt-0.5 accent-brand" />
        <span className="text-[12px] leading-snug text-ink-2">
          I agree that my details are stored so the seller can respond to this enquiry.{' '}
          <span className="text-brand">*</span>
        </span>
      </label>
      {err('consentStorage') && (
        <span className="-mt-2 block text-[11.5px] text-danger">{err('consentStorage')}</span>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-1 sm:self-start sm:px-8">
        {pending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
