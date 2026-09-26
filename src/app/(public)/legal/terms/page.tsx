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
  title: 'Terms & Conditions',
  description:
    'The terms for using ArchFacing — rules for registration, PACT, posting, ' +
    'Design Associate and payments.',
}

const SECTIONS: LegalSection[] = [
  { id: 'accept', title: 'Accepting these terms' },
  { id: 'account', title: 'Account and registration' },
  { id: 'roles', title: 'Who can do what' },
  { id: 'pact', title: 'PACT rules' },
  { id: 'cessation', title: 'When a PACT is withdrawn' },
  { id: 'content', title: 'Your postings' },
  { id: 'da', title: 'Design Associates' },
  { id: 'payments', title: 'Payments and taxes' },
  { id: 'conduct', title: 'What you must not do' },
  { id: 'ip', title: 'Intellectual property' },
  { id: 'liability', title: 'Limits of our liability' },
  { id: 'law', title: 'Governing law and disputes' },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      subtitle="Please read these terms before using ArchFacing. Joining means you accept them."
      image="terms"
      pdfRef="6.1.2.2"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="accept" title="Accepting these terms">
        <p>
          By using <strong>www.archfacing.com</strong>, or by creating an account on
          it, you accept these terms. If you do not agree, please do not use the
          platform.
        </p>
        <p>
          ArchFacing is operated by <strong>Ardian Designs and Digitals Private
          Limited</strong>. The ArchFacing concept, the PACT system and the words
          &ldquo;DESIGNA&rdquo; and &ldquo;DESIGNI&rdquo; are protected under
          Copyright Registration No. <strong>L-92657/2020</strong>.
        </p>
      </S>

      <S id="account" title="Account and registration">
        <ul>
          <li>You must be 18 or older to create an account</li>
          <li>The information you give must be true and your own — not in someone else&rsquo;s name</li>
          <li>One email creates one account</li>
          <li>Keep your password to yourself; every activity from it will be treated as yours</li>
          <li>An account may be closed if we find incorrect information</li>
        </ul>

        <h3>Verification</h3>
        <p>
          Accounts for Professionals and Consultants stay in{' '}
          <strong>verification</strong> first. ArchFacing checks your qualification
          — for architects a COA number is mandatory. Until the check
          is complete you cannot take a PACT or post anything.
        </p>
      </S>

      <S id="roles" title="Who can do what">
        <p>Every category has its own rights:</p>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>What they can do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Client / Visitor</td>
              <td>Send enquiries, post Artistry and free Around Us, buy merchandise</td>
            </tr>
            <tr>
              <td>Professional (Designa / Designi)</td>
              <td>Post everything, take a PACT, sell products, become a DA</td>
            </tr>
            <tr>
              <td>Consultant</td>
              <td>Post everything, take a PACT in their own specialisation</td>
            </tr>
            <tr>
              <td>BMF</td>
              <td>Only Blog, Around Us, Artistry and Design Competition; can take a PACT</td>
            </tr>
            <tr>
              <td>Corporate</td>
              <td>Post Projects, Products and Blogs, and place advertisements</td>
            </tr>
          </tbody>
        </table>

        <LegalNote tone="info">
          A BMF can only come from the Designa or Designi community,
          and PACT has not been opened for Corporate yet.
        </LegalNote>
      </S>

      <S id="pact" title="PACT rules">
        <p>
          PACT stands for PIN Area Code Territory — an exclusive franchise over a
          PIN code.
        </p>
        <ul>
          <li>
            Term of <strong>{termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}</strong>,
            from the date of purchase
          </li>
          <li>
            <strong>One PIN + one service = one person only.</strong> ArchFacing
            never sells the same service in the same area to two people
          </li>
          <li>
            Every PIN has 1 Designa, 1 Designi, 1 BMF and 24 Consultant seats
          </li>
          <li>One person may hold several PACTs and several services</li>
          <li>
            After {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)} it can be reactivated
            at a reduced fee
          </li>
          <li>
            A PACT may be transferred to someone else with the same qualification, or
            to a family member — but only with ArchFacing&rsquo;s approval and on
            payment of the fee
          </li>
          <li>
            Prices are set by ArchFacing and may change from time to time
          </li>
        </ul>
      </S>

      <S id="cessation" title="When a PACT is withdrawn">
        <p>A PACT is suspended in these situations:</p>
        <ol>
          <li>
            Not serving or responding to clients for{' '}
            <strong>{BUSINESS_RULES.PACT_INACTIVITY_DAYS} days</strong>
          </li>
          <li>
            Receiving <strong>{BUSINESS_RULES.PACT_MAX_COMPLAINTS} complaints</strong> from that area
          </li>
          <li>Not following the standards set by ArchFacing</li>
        </ol>
        <p>
          All complaints go to the ArchFacing Design Cell, which investigates and
          gives the PACT holder reasonable time to put things right. A suspended
          PACT receives no new enquiries, and no refund is given.
        </p>
      </S>

      <S id="content" title="Your postings">
        <ul>
          <li>
            Whatever you post is your responsibility — images, descriptions and
            claims alike
          </li>
          <li>
            Post only your own work. Passing off someone else&rsquo;s work as your
            own is a breach of these terms
          </li>
          <li>
            Every posting goes through an ArchFacing review and may be stopped before
            it is published
          </li>
          <li>
            Upload rules: images as JPG up to 2 MB, PDF/PPT up to
            10 MB
          </li>
          <li>
            For video, give a YouTube or Dailymotion link; we do not accept file
            uploads
          </li>
          <li>
            You get free space to begin with; if you need more, you have to buy
            Portal Space (valid for 5 years, non-refundable)
          </li>
        </ul>

        <p>
          By posting, you give ArchFacing the right to display your content on the
          platform. Ownership stays with you.
        </p>
      </S>

      <S id="da" title="Design Associates">
        <p>
          DAs are professionals who hold a PACT and work together with ArchFacing.
        </p>

        <h3>Conditions for becoming a DA</h3>
        <ul>
          <li>Only Designa or Designi can become one — not Consultants</li>
          <li>At least one active PACT is required</li>
          <li>KYC and tax documents must be submitted</li>
        </ul>

        <h3>Revenue share</h3>
        <LegalNote title="80 / 20">
          <strong>80% of the service fee goes to the DA</strong> and{' '}
          <strong>ArchFacing keeps 20%</strong>. All taxes are handled by
          ArchFacing.
        </LegalNote>

        <h3>How the work runs</h3>
        <ul>
          <li>The DA meets the client, understands the requirement and prepares the design proposal</li>
          <li>The Head Design Office reviews it and issues a stamp and a number</li>
          <li>ArchFacing raises the invoice on the 1st of every month</li>
          <li>The DA pays ArchFacing&rsquo;s share by the end of the month</li>
          <li>DAs receive {termYears(BUSINESS_RULES.DA_FREE_CLUB_YEARS)} of free Club Membership and discounts at events</li>
          <li>DAs may use the ArchFacing logo on their stationery</li>
        </ul>
      </S>

      <S id="payments" title="Payments and taxes">
        <ul>
          <li>All prices are in Indian rupees</li>
          <li>GST is charged separately and shown on the invoice</li>
          <li>Payments run through an external payment gateway; we do not store card details</li>
          <li>A service starts only once payment is complete</li>
          <li>
            A PACT seat is held for payment for only{' '}
            <strong>{BUSINESS_RULES.PACT_RESERVATION_MINUTES} minutes</strong>, after
            which it opens up for someone else
          </li>
        </ul>
        <p>
          The rules for getting money back are set out separately in the{' '}
          <Link href="/legal/refund">Return, Refund &amp; Cancellation Policy</Link>.
        </p>
      </S>

      <S id="conduct" title="What you must not do">
        <ul>
          <li>Claim someone else&rsquo;s identity or qualification</li>
          <li>Post false, misleading or fake work</li>
          <li>Upload other people&rsquo;s images or designs without permission</li>
          <li>Deal outside the platform to bypass ArchFacing</li>
          <li>Pull data using automated tools (scraping)</li>
          <li>Attempt to break the platform&rsquo;s security</li>
          <li>Post obscene, violent or unlawful content</li>
          <li>Harass or abuse other registrants</li>
        </ul>
        <p>
          Doing any of these can lead to the account being closed, and the amounts
          paid are not refunded.
        </p>
      </S>

      <S id="ip" title="Intellectual property">
        <ul>
          <li>
            The ArchFacing name, logo, the PACT system, and the words
            &ldquo;DESIGNA&rdquo; and &ldquo;DESIGNI&rdquo; belong to us
          </li>
          <li>Copyright Registration No. L-92657/2020</li>
          <li>Trademark application Ref. 4353766, dated 18/03/2020</li>
          <li>
            The content you post stays yours; we only receive the right to display
            it
          </li>
          <li>
            Do not use ArchFacing content anywhere else without written permission
          </li>
        </ul>
      </S>

      <S id="liability" title="Limits of our liability">
        <p>
          ArchFacing is a <strong>platform that connects people</strong>. We bring
          professionals and clients together — but we are not a party to the work,
          the deal or the agreement between them.
        </p>
        <ul>
          <li>
            We do not guarantee the quality, timing or conduct of any
            registrant&rsquo;s work
          </li>
          <li>
            We do carry out verification, but we cannot vouch for the truth of every
            claim
          </li>
          <li>
            The platform may face technical interruptions; we do not promise
            uninterrupted service
          </li>
          <li>
            In any dispute, our liability is limited to the amount you paid for that
            service
          </li>
        </ul>
        <p>
          Where work is carried out through a Design Associate, ArchFacing reviews
          the design and takes care of the standards relating to building safety.
        </p>
      </S>

      <S id="law" title="Governing law and disputes">
        <p>
          These terms are governed by the law of India. Any dispute will first be
          taken up for resolution through mutual discussion. If that does not work,
          the Indian courts will have jurisdiction.
        </p>
        <p>
          ArchFacing may change these terms when required. When there is a
          significant change, registered users are informed by email.
        </p>
      </S>
    </LegalPage>
  )
}
