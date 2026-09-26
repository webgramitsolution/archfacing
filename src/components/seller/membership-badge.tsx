'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui'

/**
 * The membership chip on the seller header.
 *
 * A paid membership opens a small certificate card; the free tier (or none)
 * renders a quiet static badge. Plain React state — no dialog library, no PDF
 * generator; printing the open card is the browser's job.
 */
export function MembershipBadge({
  membership,
  company,
  location,
  gstNumber,
  memberSince,
}: {
  membership: { planName: string; expiresAt: string; isFree: boolean } | null
  company: string
  location: string
  gstNumber: string | null
  memberSince: string
}) {
  const [open, setOpen] = useState(false)

  if (!membership) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-3 text-ink-3">
          <Icon name="award" className="h-3.5 w-3.5" />
        </span>
        <span className="text-left">
          <span className="block text-[9px] font-medium text-ink-4">Member</span>
          <span className="block text-[11.5px] font-bold text-ink-2">Starter</span>
        </span>
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-paper-3 sm:px-3"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-warn to-amber-500 text-white shadow-sm">
          <Icon name="trophy" className="h-3.5 w-3.5" />
        </span>
        <span className="text-left">
          <span className="block text-[9px] font-medium text-ink-4">Member</span>
          <span className="block text-[11.5px] font-bold text-warn">{membership.planName}</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Membership certificate"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-navy/60"
          />

          <div className="relative w-full max-w-md rounded-card border border-line bg-paper p-6 shadow-lift">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-warn to-amber-500 text-white shadow-md">
                <Icon name="trophy" className="h-7 w-7" />
              </span>
              <p className="eyebrow mt-4">ArchFacing Club Membership</p>
              <h2 className="mt-1 font-display text-[20px] font-bold text-ink">{company}</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{location}</p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-4 text-left">
              <div>
                <dt className="eyebrow">Plan</dt>
                <dd className="mt-0.5 text-[13px] font-semibold text-ink">{membership.planName}</dd>
              </div>
              <div>
                <dt className="eyebrow">Valid till</dt>
                <dd className="tabular mt-0.5 text-[13px] font-semibold text-ink">
                  {new Date(membership.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Member since</dt>
                <dd className="tabular mt-0.5 text-[13px] font-semibold text-ink">{memberSince}</dd>
              </div>
              {gstNumber && (
                <div>
                  <dt className="eyebrow">GST</dt>
                  <dd className="tabular mt-0.5 text-[13px] font-semibold text-ink">{gstNumber}</dd>
                </div>
              )}
            </dl>

            {membership.isFree && (
              <p className="mt-4 rounded-lg bg-gold-soft px-3 py-2 text-center text-[11.5px] text-ink-2">
                Included with Design Associate status.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
