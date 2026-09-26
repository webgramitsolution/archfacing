import type { Metadata } from 'next'
import Link from 'next/link'

import { requireAuth } from '@/lib/guard'
import { getSellerCertificate } from '@/lib/membership'
import { MembershipCertificate } from '@/components/membership/membership-certificate'
import { PrintButtons } from '@/components/membership/print-buttons'

export const metadata: Metadata = { title: 'Membership Certificate' }
export const dynamic = 'force-dynamic'

/**
 * The seller's own certificate — a full-page print surface. The certificate
 * sits on a dark ground on screen (which resets to the parchment cream in
 * print), with fixed Print / Download controls.
 */
export default async function MembershipCertificatePage() {
  const user = await requireAuth()
  const cert = await getSellerCertificate(user.id)

  if (!cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold text-ink">No active membership</h1>
        <p className="mt-2 text-[13.5px] text-ink-3">
          Your certificate appears here once you hold an active ArchFacing Club plan. It shows on
          your product, project and storefront pages as a verified badge that anyone can open.
        </p>
        <Link href="/membership" className="btn-primary mt-5 inline-flex px-5">
          View membership plans
        </Link>
      </div>
    )
  }

  return (
    <div className="cert-standalone min-h-screen bg-navy px-3 py-16 sm:px-6">
      <style>{`@media print { .cert-standalone { background: #f5f0e6 !important; padding: 0 !important; } }`}</style>
      <PrintButtons />
      <div className="mx-auto w-full max-w-[900px]">
        <MembershipCertificate data={cert} />
      </div>
    </div>
  )
}
