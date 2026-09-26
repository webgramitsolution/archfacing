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
  title: 'Return, Refund & Cancellation Policy',
  description:
    'The refund rules on ArchFacing — a 15-day window, a maximum of 25% and ' +
    'a 30-day settlement.',
}

const SECTIONS: LegalSection[] = [
  { id: 'summary', title: 'At a glance' },
  { id: 'window', title: 'The 15-day window' },
  { id: 'cap', title: 'A maximum of 25%' },
  { id: 'settlement', title: 'When the money reaches you' },
  { id: 'services', title: 'Rules for services' },
  { id: 'merchandise', title: 'Returning merchandise' },
  { id: 'no-refund', title: 'What is not refundable' },
  { id: 'how', title: 'How to request a refund' },
  { id: 'cancel', title: 'Cancellation rules' },
  { id: 'contact', title: 'Contact' },
]

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Return, Refund & Cancellation Policy"
      subtitle="The refund rules are clear and fixed — by when you can ask, how much you get, and when it reaches your account."
      image="refund"
      pdfRef="6.1.2.2.6"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="summary" title="At a glance">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Window to request a refund</td>
              <td>
                Within <strong>{BUSINESS_RULES.REFUND_WINDOW_DAYS} days</strong> of payment
              </td>
            </tr>
            <tr>
              <td>Maximum you can get back</td>
              <td>
                <strong>{BUSINESS_RULES.REFUND_MAX_PERCENT}%</strong> of the amount paid
              </td>
            </tr>
            <tr>
              <td>Time to reach your account</td>
              <td>
                At least <strong>{BUSINESS_RULES.REFUND_SETTLEMENT_DAYS} days</strong>
              </td>
            </tr>
            <tr>
              <td>Portal Space</td>
              <td>Non-refundable — valid for 5 years</td>
            </tr>
            <tr>
              <td>Merchandise</td>
              <td>Within 7 days of delivery, unused</td>
            </tr>
          </tbody>
        </table>
      </S>

      <S id="window" title={`The ${BUSINESS_RULES.REFUND_WINDOW_DAYS}-day window`}>
        <p>
          A refund for any service must be requested within{' '}
          <strong>{BUSINESS_RULES.REFUND_WINDOW_DAYS} days</strong> of the date of
          payment.
        </p>

        <LegalNote tone="warn" title="No refund after that">
          Once {BUSINESS_RULES.REFUND_WINDOW_DAYS} days have passed, money is not
          returned under any circumstances. This rule
          applies equally to everyone.
        </LegalNote>

        <p>
          The count starts from the day we received your payment — not from the day
          you started using the service.
        </p>
      </S>

      <S id="cap" title={`A maximum of ${BUSINESS_RULES.REFUND_MAX_PERCENT}%`}>
        <p>
          Even when a refund is approved, the full amount is not returned. At most{' '}
          <strong>{BUSINESS_RULES.REFUND_MAX_PERCENT}%</strong> is refunded.
        </p>

        <h3>Worked examples</h3>
        <table>
          <thead>
            <tr>
              <th>You paid</th>
              <th>Maximum refund</th>
              <th>Retained by ArchFacing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>₹29,500 (Designa PACT)</td>
              <td>₹7,375</td>
              <td>₹22,125</td>
            </tr>
            <tr>
              <td>₹17,700 (Consultant PACT)</td>
              <td>₹4,425</td>
              <td>₹13,275</td>
            </tr>
            <tr>
              <td>₹23,600 (BMF PACT)</td>
              <td>₹5,900</td>
              <td>₹17,700</td>
            </tr>
          </tbody>
        </table>

        <p>
          The retained portion covers the work already done on your registration —
          verification, holding the PACT seat, gateway charges and government taxes.
        </p>
      </S>

      <S id="settlement" title="When the money reaches you">
        <p>
          Once a refund is approved, the money takes at least{' '}
          <strong>{BUSINESS_RULES.REFUND_SETTLEMENT_DAYS} days</strong> to reach your
          account.
        </p>
        <ol>
          <li>You send the refund request</li>
          <li>The ArchFacing team reviews it within 7 working days</li>
          <li>On approval, an instruction goes to the payment gateway</li>
          <li>It takes another 5–10 working days from the gateway to your bank</li>
        </ol>
        <p>
          The money goes back the same way you paid it. We do not refund in cash or
          to a different account.
        </p>
      </S>

      <S id="services" title="Rules for services">
        <h3>PACT (PIN Area Code Territory)</h3>
        <ul>
          <li>
            Requested within {BUSINESS_RULES.REFUND_WINDOW_DAYS} days, a maximum of{' '}
            {BUSINESS_RULES.REFUND_MAX_PERCENT}%
          </li>
          <li>
            If even one enquiry has come through that PACT, there is no refund — the
            service is treated as having begun
          </li>
          <li>
            A suspended PACT gets no refund
          </li>
          <li>
            The term ends automatically once {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)} are complete — that is not a
            refund
          </li>
        </ul>

        <h3>Club Membership</h3>
        <ul>
          <li>Within {BUSINESS_RULES.REFUND_WINDOW_DAYS} days of starting, a maximum of {BUSINESS_RULES.REFUND_MAX_PERCENT}%</li>
          <li>No refund once any benefit has been used</li>
          <li>
            The {BUSINESS_RULES.DA_FREE_CLUB_YEARS}-year free membership given to Design Associates carries no
            question of a refund
          </li>
        </ul>

        <h3>Advertisement</h3>
        <ul>
          <li>Cancel before it goes live and you get up to {BUSINESS_RULES.REFUND_MAX_PERCENT}%</li>
          <li>No refund once it has started running</li>
          <li>If there is a technical fault at our end, the run is extended by that many days</li>
        </ul>

        <h3>Design Competition</h3>
        <ul>
          <li>Withdraw before the closing date and you get up to {BUSINESS_RULES.REFUND_MAX_PERCENT}%</li>
          <li>No refund once the entry has been submitted</li>
        </ul>
      </S>

      <S id="merchandise" title="Returning merchandise">
        <p>
          ArchFacing&rsquo;s own products follow different rules, because this is a
          purchase of goods, not a service.
        </p>
        <ul>
          <li>
            Request the return within <strong>7 days</strong> of receiving the item
          </li>
          <li>
            The item must be unused, in its original packaging and with all tags
            intact
          </li>
          <li>
            If you received a damaged or wrong item, you get a{' '}
            <strong>full refund</strong> — the 25% cap does not apply here
          </li>
          <li>
            If you simply changed your mind, the return shipping cost is yours
          </li>
        </ul>

        <LegalNote tone="ok" title="Our mistake means your money back in full">
          If you received something broken, defective or different from what you
          ordered, we return the entire amount and cover the return cost as well.
          Just send us a photo and it is settled.
        </LegalNote>
      </S>

      <S id="no-refund" title="What is not refundable">
        <ul>
          <li>
            <strong>Portal Space —</strong> sold for 5 years and non-refundable
          </li>
          <li>
            <strong>Registration fee —</strong> once the verification work is done
          </li>
          <li>
            <strong>Services already used —</strong> where an enquiry or lead has already come through
          </li>
          <li>
            <strong>Suspended accounts —</strong> those stopped for breaking the rules
          </li>
          <li>
            <strong>The Design Associate&rsquo;s share —</strong> where it has already
            been paid out under the 80/20 split
          </li>
        </ul>
      </S>

      <S id="how" title="How to request a refund">
        <ol>
          <li>
            Write to <a href="mailto:support@archfacing.com">support@archfacing.com</a>
          </li>
          <li>
            Put this in the subject line — <code>Refund Request — [your invoice number]</code>
          </li>
          <li>
            Include: registered email, invoice number, date of payment and the
            reason
          </li>
          <li>Our team will reply within 7 working days</li>
          <li>On approval, the money reaches your account in {BUSINESS_RULES.REFUND_SETTLEMENT_DAYS}+ days</li>
        </ol>

        <p>
          Every invoice number is available in your dashboard and in your email. It
          looks like
          <code> AF/2026/000123</code>.
        </p>
      </S>

      <S id="cancel" title="Cancellation rules">
        <h3>Before payment</h3>
        <p>
          The seat held for 15 minutes for a PACT can be released at any time — no
          fee, no consequence. If payment is not made, it is released
          automatically.
        </p>

        <h3>Merchandise orders</h3>
        <p>
          You can cancel an order any time before it is dispatched and get a full
          refund. Once it has been dispatched, the return rules above apply.
        </p>

        <h3>From ArchFacing&rsquo;s side</h3>
        <p>
          We may stop a service in case of a breach of the rules, incorrect
          information, or PACT cessation. In such cases no refund is
          given, but the reason is given to you in writing.
        </p>
      </S>

      <S id="contact" title="Contact">
        <ul>
          <li>
            For refunds —{' '}
            <a href="mailto:support@archfacing.com">support@archfacing.com</a>
          </li>
          <li>
            Phone — <a href="tel:+919667987129">+91 96679 87129</a>
          </li>
        </ul>
        <p>
          For anything else, see the <Link href="/legal/terms">Terms &amp; Conditions</Link>{' '}
          and <Link href="/legal/need-help">Need Help</Link>.
        </p>
      </S>
    </LegalPage>
  )
}
