import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LegalPage,
  LegalSectionBlock as S,
  LegalNote,
  type LegalSection,
} from '@/components/legal-page'
import { BUSINESS_RULES, termYears } from '@/config/permissions'

export const metadata: Metadata = {
  title: 'Need Help',
  description:
    'Answers to the common questions on ArchFacing — registration, PACT, posting, ' +
    'payment and orders.',
}

const SECTIONS: LegalSection[] = [
  { id: 'start', title: 'How to get started' },
  { id: 'account', title: 'Account and login' },
  { id: 'pact', title: 'PACT questions' },
  { id: 'posting', title: 'Posting and images' },
  { id: 'enquiry', title: 'Enquiries and leads' },
  { id: 'shop', title: 'Merchandise and orders' },
  { id: 'da', title: 'Design Associate' },
  { id: 'stuck', title: 'Still stuck?' },
]

export default function NeedHelpPage() {
  return (
    <LegalPage
      eyebrow="Support"
      title="Need Help"
      subtitle="Answers to the questions we are asked most often. If yours is not here, write to us — we reply within 24 hours."
      image="help"
      pdfRef="6.1.2.2.5"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="start" title="How to get started">
        <h3>I need an architect or a designer</h3>
        <ol>
          <li>
            Open <Link href="/consult-nearby">Consult Nearby</Link>
          </li>
          <li>Enter your PIN code — you will immediately see who is available there</li>
          <li>Tell us what you need, and leave your number</li>
          <li>The registrant for that area will contact you directly</li>
        </ol>
        <p>
          Joining as a client is <strong>free</strong>.
        </p>

        <h3>I am a professional and I want work</h3>
        <ol>
          <li>
            <Link href="/register?type=professional">Register</Link> — an OTP will
            come to your email
          </li>
          <li>
            Fill in your qualification and COA number (mandatory for architects)
          </li>
          <li>The ArchFacing team will verify it in 3–5 days</li>
          <li>After verification, take the PACT for your PIN code</li>
          <li>Enquiries from that area will then start coming to you</li>
        </ol>
      </S>

      <S id="account" title="Account and login">
        <h3>The OTP is not arriving</h3>
        <ul>
          <li>Check the spam or promotions folder first</li>
          <li>Check the spelling of your email</li>
          <li>An OTP lasts 10 minutes — an old one will not work</li>
          <li>There must be a 60-second gap between two OTPs</li>
          <li>No more than 5 OTPs are sent in an hour</li>
        </ul>

        <h3>I forgot my password</h3>
        <p>
          Employees and admins can get a new password from their admin. Everyone
          else can pick the &ldquo;With an email code&rdquo; option and log in
          without a password.
        </p>

        <h3>My account is stuck in verification</h3>
        <p>
          The qualifications of Professionals and Consultants are checked.
          This takes 3–5 working days. If something is missing, we tell you by email
          — correct it and send it again.
        </p>
      </S>

      <S id="pact" title="PACT questions">
        <h3>What is a PACT</h3>
        <p>
          PIN Area Code Territory — an exclusive franchise over a single PIN code,
          for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}. Every enquiry from that
          area comes straight to you. <Link href="/pact">Read the details →</Link>
        </p>

        <h3>Is my PIN available</h3>
        <p>
          Enter your PIN on the <Link href="/pact">PACT page</Link> — you will see
          the status of all 27 seats for that PIN.
        </p>

        <h3>Can two people hold the same PIN?</h3>
        <p>
          <strong>No.</strong> One PIN + one service goes to one person only. That
          said, Consultants have 24 different specialisations, so a single PIN can
          have 24 different consultants — but only one in each specialisation.
        </p>

        <h3>How long is a seat held</h3>
        <p>
          <strong>{BUSINESS_RULES.PACT_RESERVATION_MINUTES} minutes</strong> for
          payment. If payment is not made in that time, the seat opens up for
          someone else.
        </p>

        <h3>What happens after the term</h3>
        <p>
          When the term ends, the seat becomes available again. The previous holder
          gets the chance to recharge at a reduced fee. We send reminders 90, 30 and
          7 days in advance.
        </p>

        <LegalNote tone="warn" title="A PACT can also be withdrawn">
          A PACT is suspended if you do not respond for{' '}
          {BUSINESS_RULES.PACT_INACTIVITY_DAYS} days, or if{' '}
          {BUSINESS_RULES.PACT_MAX_COMPLAINTS} complaints come in. Stay active and
          you stay safe.
        </LegalNote>
      </S>

      <S id="posting" title="Posting and images">
        <h3>My image is not being accepted</h3>
        <ul>
          <li>It must be a JPG, up to <strong>2 MB</strong></li>
          <li>
            It must be <strong>landscape</strong> — wider than it is tall
          </li>
          <li>An aspect ratio of around 5:3 (16:9 in some places)</li>
          <li>Between 1 and 8 images per posting</li>
        </ul>

        <h3>How do I add a video</h3>
        <p>
          Videos are not uploaded. Put it on YouTube or Dailymotion and paste the
          link here — we take care of the rest. It also keeps your storage free.
        </p>

        <h3>My posting has not been published yet</h3>
        <p>
          Every posting is reviewed by the ArchFacing team first. If something is
          missing, it is sent back with the reason — you will find that in your
          notifications and in your email.
        </p>

        <h3>My space is full</h3>
        <p>
          You get free space to begin with. Once it is full, you have to buy Portal
          Space, which is valid for 5 years and is non-refundable.
        </p>
      </S>

      <S id="enquiry" title="Enquiries and leads">
        <h3>I am not receiving enquiries</h3>
        <ul>
          <li>First check whether your account is verified</li>
          <li>Check whether you hold the PACT for that PIN</li>
          <li>Check that the PACT has not been suspended</li>
          <li>Complete your profile and postings — that is how people find you</li>
        </ul>

        <h3>Nobody was found in my area</h3>
        <p>
          We look at that PIN first, then up to 50 kilometres around it. If there is
          still no one, your enquiry goes to the ArchFacing team, who connect you
          with a suitable registrant. <strong>An enquiry is never lost.</strong>
        </p>

        <h3>Why responding matters</h3>
        <p>
          Every response restarts the clock on your PACT. Stay silent for{' '}
          {BUSINESS_RULES.PACT_INACTIVITY_DAYS}{' '}
          days and the PACT is at risk.
        </p>
      </S>

      <S id="shop" title="Merchandise and orders">
        <h3>How much is shipping</h3>
        <p>
          <strong>Free</strong> on orders above ₹1,500. Below that it is ₹79.
        </p>

        <h3>Where has my order reached</h3>
        <p>
          Check <Link href="/dashboard/orders">Orders</Link> in your dashboard —
          every stage is shown there, along with the tracking number once it is
          dispatched.
        </p>

        <h3>I want to return an item</h3>
        <p>
          Within 7 days of delivery, unused. If you received a broken or wrong item,
          you get your money back in full. The complete rules are in the{' '}
          <Link href="/legal/refund">Refund Policy</Link>.
        </p>
      </S>

      <S id="da" title="Design Associate">
        <h3>Who can become a DA</h3>
        <ul>
          <li>Only Designa or Designi — not Consultants</li>
          <li>The account must be verified</li>
          <li>At least one active PACT is required</li>
          <li>KYC and tax documents must be submitted</li>
        </ul>

        <h3>How is the revenue split</h3>
        <p>
          <strong>80% is yours and 20% is ArchFacing&rsquo;s</strong>.
          All taxes are handled by ArchFacing. The invoice is raised on the 1st of
          every month and must be paid by the end of the month.
        </p>

        <h3>What will a DA&rsquo;s email be</h3>
        <p>
          It is name + PACT. So for PACT 110005 and the name Yudhveer, it is{' '}
          <code>yudhveer110005@gmail.com</code>. This is also your reference code.
        </p>
      </S>

      <S id="stuck" title="Still stuck?">
        <p>If you did not find your answer here, write to us directly:</p>
        <ul>
          <li>
            <a href="mailto:support@archfacing.com">support@archfacing.com</a> —
            a reply within 24 hours
          </li>
          <li>
            <a href="tel:+919667987129">+91 96679 87129</a> — if you would rather talk
          </li>
        </ul>
        <p>
          When you write, do include your registered email and (if it concerns a
          payment) the invoice number — it gets things done faster.
        </p>
        <p>
          <Link href="/legal/contact">See the full contact details →</Link>
        </p>
      </S>
    </LegalPage>
  )
}
