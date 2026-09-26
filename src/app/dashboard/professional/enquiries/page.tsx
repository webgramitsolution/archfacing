import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { myLeadConversations } from '../../enquiry-actions'
import { LeadsWorkspace } from './leads-workspace'

export const metadata: Metadata = { title: 'Leads & Enquiries' }
export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pincode?: string }>
}) {
  await requireRole('PROFESSIONAL')
  const { conversations, kpis, myId } = await myLeadConversations()

  // "View Leads" on a PACT row arrives with ?pincode=… — the list opens
  // already filtered to that territory. Only digits are accepted.
  const { pincode } = await searchParams
  const initialQuery = /^\d{6}$/.test(pincode ?? '') ? pincode! : ''

  return (
    <div className="md:h-full">
      {conversations.length === 0 && (
        <h1 className="mb-5 font-display text-[18px] font-bold tracking-tight text-ink">
          Leads &amp; Enquiries
        </h1>
      )}
      {conversations.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium">No enquiries yet</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Every enquiry from the PIN codes and categories you hold a PACT for —
            plus direct enquiries on your listings — will appear here as a chat.
          </p>
          <Link
            href="/dashboard/professional/pact"
            className="mt-4 inline-block text-[13px] font-medium text-brand hover:underline"
          >
            View your PACTs →
          </Link>
        </div>
      ) : (
        <LeadsWorkspace conversations={conversations} kpis={kpis} myId={myId} initialQuery={initialQuery} />
      )}
    </div>
  )
}
