import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { EnquiryThread } from '@/components/enquiry-thread'
import { myEnquiries } from '../../enquiry-actions'

export const metadata: Metadata = { title: 'Leads & Enquiries' }

export default async function Page() {
  const user = await requireRole('CONSULTANT')
  const enquiries = await myEnquiries()

  return (
    <div>
      <PageHeading title="Leads &amp; Enquiries" pdfRef="5.2.12">
        Enquiries from your PACT territory. The sooner you reply, the better —
        30 days without a response can lead to your PACT being suspended.
      </PageHeading>

      {enquiries.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium">No enquiries yet</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Every enquiry from the PIN codes you hold a PACT for will appear here.
          </p>
          <Link
            href="/dashboard/consultant/pact"
            className="mt-4 inline-block text-[13px] font-medium text-brand hover:underline"
          >
            View your PACTs →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {enquiries.map((e) => (
            <EnquiryThread
              key={e.id}
              enquiry={e}
              myId={user.id}
              side="holder"
              counterpartName={e.client?.name}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
