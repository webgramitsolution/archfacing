import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { auth } from '@/lib/auth'
import { EnquiryForm } from './enquiry-form'

export const metadata: Metadata = {
  title: 'Consult Nearby',
  description:
    'Connect directly with architects, interior designers, consultants and building ' +
    'material suppliers in your PIN code. Your enquiry goes to the registrant for that area.',
}

export default async function ConsultNearbyPage({
  searchParams,
}: {
  searchParams: Promise<{ pincode?: string }>
}) {
  const [{ pincode }, session] = await Promise.all([searchParams, auth()])

  return (
    <>
      <SiteHeader />

      <main className="bg-paper"><div className="container-af py-12">
        <header className="mb-8 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Consult Nearby
          </h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            Enter your PIN code and tell us what you need. Your enquiry goes
            straight to the PACT registrant for that area — no agents in
            between, no commission.
          </p>
        </header>

        <EnquiryForm defaultPincode={pincode} isLoggedIn={!!session?.user} />
      </div></main>

      <SiteFooter />
    </>
  )
}
