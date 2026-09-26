import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { EnquiryThread } from '@/components/enquiry-thread'
import { myEnquiries } from '../../enquiry-actions'

export const metadata: Metadata = { title: 'Leads & Enquiries' }

/**
 * §5.4.3 — the leads a Corporate account receives.
 *
 * The dashboard home links here from its "Recent Enquiries" panel and the
 * menu's Engagement group; without this page both landed on a 404.
 *
 * `myEnquiries()` scopes to the signed-in holder, so a company only ever sees
 * the leads routed to it.
 */
export default async function Page() {
  const user = await requireRole('CORPORATE')
  const enquiries = await myEnquiries()

  return (
    <div>
      <PageHeading title="Leads &amp; Enquiries" pdfRef="5.4.3">
        Requirements raised against your products and projects, plus anything
        routed to you through the PACT area you hold.
      </PageHeading>

      {enquiries.length === 0 ? (
        <div className="rounded-card border border-line bg-paper px-6 py-14 text-center">
          <p className="text-[15px] font-medium">No enquiries yet</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Enquiries from the PIN codes you hold a PACT for appear here, along
            with anything an RM assigns to you.
          </p>
          <Link
            href="/dashboard/corporate/pact"
            className="mt-4 inline-block text-[13px] font-medium text-brand hover:underline"
          >
            View your PACT →
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
