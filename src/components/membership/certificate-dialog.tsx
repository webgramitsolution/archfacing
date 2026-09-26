'use client'

import { useEffect, useState } from 'react'
import { MembershipCertificate } from './membership-certificate'
import type { CertificateData } from '@/lib/membership'

/**
 * Opens the Membership Certificate in a modal from anywhere — under the seller
 * block on a product or project page, or from the seller storefront header.
 *
 * The default trigger is the green "verified" plan badge (IndiaMart / JustDial
 * style); pass a custom `trigger` to change it. Printing isolates just the
 * certificate, so "Print" and "Download PDF" (Save as PDF) both produce a clean
 * single A4-landscape page regardless of the page it was opened from.
 *
 * No dialog library, no PDF generator — plain React state and the browser's own
 * print pipeline.
 */
export function CertificateDialog({
  data,
  trigger,
}: {
  data: CertificateData
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  // Lock body scroll while the modal is open, and close on Escape.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex text-left">
        {trigger ?? (
          <span className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok text-white">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="text-[12px] font-semibold text-ok">{data.membershipLevel} Verified</span>
          </span>
        )}
      </button>

      {open && (
        <div className="cert-modal fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-navy/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Membership certificate">
          <style>{`
            @media print {
              body { visibility: hidden !important; }
              .cert-modal { position: absolute !important; inset: 0 !important; padding: 0 !important; background: #f5f0e6 !important; overflow: visible !important; visibility: visible !important; }
              .cert-modal * { visibility: visible !important; }
            }
          `}</style>

          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="print:hidden absolute inset-0 cursor-default" />

          {/* toolbar */}
          <div className="print:hidden relative z-10 mx-auto mb-3 flex w-full max-w-[900px] items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-card transition-colors hover:bg-paper-3"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
              Print
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-colors hover:bg-brand-hover"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-2 shadow-card transition-colors hover:bg-paper-3"
            >
              ✕
            </button>
          </div>

          {/* certificate */}
          <div className="relative z-10 mx-auto w-full max-w-[900px]">
            <MembershipCertificate data={data} />
          </div>
        </div>
      )}
    </>
  )
}
