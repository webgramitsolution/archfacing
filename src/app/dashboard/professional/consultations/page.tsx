import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { EnquiryThread } from '@/components/enquiry-thread'
import { myConsultations } from '../../enquiry-actions'

export const metadata: Metadata = { title: 'Enquiries I Sent' }

export default async function Page() {
  const user = await requireRole('PROFESSIONAL')
  const enquiries = await myConsultations()

  return (
    <div>
      <PageHeading title="Enquiries I Sent" pdfRef="5.2.11">
        The enquiries you have sent, and the replies you have received.
      </PageHeading>

      {enquiries.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium">You have not sent any enquiries yet</p>
          <Link
            href="/consult-nearby"
            className="mt-4 inline-block rounded-card bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper hover:bg-brand"
          >
            Consult Nearby →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {enquiries.map((e) => (
            <EnquiryThread
              key={e.id}
              enquiry={e}
              myId={user.id}
              side="client"
              counterpartName={e.holder?.name}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
