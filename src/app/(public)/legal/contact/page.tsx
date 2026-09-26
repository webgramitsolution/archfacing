import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LegalPage,
  LegalSectionBlock as S,
  LegalNote,
  type LegalSection,
} from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact ArchFacing — support@archfacing.com, info@archfacing.com, ' +
    '+91 96679 87129.',
}

const SECTIONS: LegalSection[] = [
  { id: 'reach', title: 'Where to write' },
  { id: 'which', title: 'Who to contact for what' },
  { id: 'da', title: 'For Design Associates' },
  { id: 'time', title: 'How soon we reply' },
  { id: 'company', title: 'Company information' },
]

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="ArchFacing"
      title="Contact Us"
      subtitle="A question, a complaint or a suggestion — we try to reply within 24 hours."
      image="contact"
      pdfRef="6.1.2.2.4 · 8"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="reach" title="Where to write">
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Address</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email</td>
              <td>
                <a href="mailto:support@archfacing.com">support@archfacing.com</a>
              </td>
              <td>Any problem — account, payment, refund</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>
                <a href="mailto:info@archfacing.com">info@archfacing.com</a>
              </td>
              <td>Information, partnerships, business matters</td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>
                <a href="tel:+919667987129">+91 96679 87129</a>
              </td>
              <td>When you need to speak to someone right away</td>
            </tr>
          </tbody>
        </table>

        <LegalNote tone="info" title="Want to send an enquiry?">
          If you want to get work done by an architect or a consultant, you do not
          need email — send it straight through{' '}
          <Link href="/consult-nearby">Consult Nearby</Link>. It goes directly to
          the registrant for your PIN code.
        </LegalNote>
      </S>

      <S id="which" title="Who to contact for what">
        <h3>Account and login</h3>
        <ul>
          <li>OTP not arriving — check your spam folder first</li>
          <li>Account closed — write to support to find out why</li>
          <li>Want to change your email — send the request from the registered email only</li>
        </ul>

        <h3>PACT matters</h3>
        <ul>
          <li>Whether a PACT is available — check it yourself on the <Link href="/pact">PACT page</Link></li>
          <li>Want to transfer a PACT to someone else — write to support for approval</li>
          <li>It has been suspended — the Design Cell will investigate; write to support</li>
        </ul>

        <h3>Payment and refund</h3>
        <ul>
          <li>
            The refund rules are set out in the{' '}
            <Link href="/legal/refund">Refund Policy</Link>
          </li>
          <li>Need an invoice — you will find it in the dashboard, or ask support</li>
          <li>Money was deducted but the service did not start — write to us at once and we will check</li>
        </ul>

        <h3>Complaints</h3>
        <p>
          If you have a complaint about a registrant, write to support.
          All complaints go to the ArchFacing Design Cell. A PACT is
          suspended once it receives 5 complaints.
        </p>
      </S>

      <S id="da" title="For Design Associates">
        <p>
          Design Associates have their own email convention — the name
          followed by the PACT number.
        </p>
        <blockquote>
          PACT 110005 and the name Yudhveer → <code>yudhveer110005@gmail.com</code>
        </blockquote>
        <p>
          This is also your reference code. Use this email for all design-related
          correspondence with ArchFacing.
        </p>
        <p>
          Phone hours for the Head Design Office are{' '}
          <strong>2 pm to 5 pm</strong>.
        </p>
      </S>

      <S id="time" title="How soon we reply">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Turnaround</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>General questions</td>
              <td>24 hours</td>
            </tr>
            <tr>
              <td>Payment and refund</td>
              <td>7 working days</td>
            </tr>
            <tr>
              <td>Account verification</td>
              <td>3–5 working days</td>
            </tr>
            <tr>
              <td>Complaint investigation</td>
              <td>15 working days</td>
            </tr>
            <tr>
              <td>Privacy requests</td>
              <td>30 days</td>
            </tr>
          </tbody>
        </table>

        <p>
          Design Associates schedule client meetings between{' '}
          <strong>10 am and 5 pm</strong>.
        </p>
      </S>

      <S id="company" title="Company information">
        <ul>
          <li>
            <strong>Platform —</strong> ArchFacing (www.archfacing.com)
          </li>
          <li>
            <strong>Operated by —</strong> Ardian Designs and Digitals Private Limited
          </li>
          <li>
            <strong>Concept —</strong> Architect Yudhveer Singh
          </li>
          <li>
            <strong>Copyright —</strong> Reg. No. L-92657/2020, dated 08/07/2020
          </li>
          <li>
            <strong>Trademark —</strong> application Ref. 4353766, dated 18/03/2020
          </li>
        </ul>
      </S>
    </LegalPage>
  )
}
