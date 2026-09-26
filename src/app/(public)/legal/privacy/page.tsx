import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LegalPage,
  LegalSectionBlock as S,
  LegalNote,
  type LegalSection,
} from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What information ArchFacing collects, why it collects it, where it is stored ' +
    'and what rights you have',
}

const SECTIONS: LegalSection[] = [
  { id: 'scope', title: 'Who this policy applies to' },
  { id: 'collect', title: 'What information we collect' },
  { id: 'why', title: 'What we do with it' },
  { id: 'share', title: 'Who we share it with' },
  { id: 'pact', title: 'PACT and your PIN code' },
  { id: 'cookies', title: 'Cookies and tracking' },
  { id: 'security', title: 'How we keep it safe' },
  { id: 'retention', title: 'How long we keep it' },
  { id: 'rights', title: 'Your rights' },
  { id: 'children', title: "Children's information" },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact' },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="What information we collect, why we collect it, where we keep it and what you can do about it — all set out clearly here."
      image="privacy"
      pdfRef="6.1.2.2.1"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="scope" title="Who this policy applies to">
        <p>
          This policy applies to <strong>www.archfacing.com</strong> and every
          service connected to it — whether you are just browsing, registered as a
          client, or joined as a Professional, Consultant, BMF or Corporate.
        </p>
        <p>
          ArchFacing is operated by <strong>Ardian Designs and Digitals Private
          Limited</strong>. In this policy, &ldquo;we&rdquo; means that company,
          and &ldquo;you&rdquo; means the person or organisation using the
          platform.
        </p>
      </S>

      <S id="collect" title="What information we collect">
        <h3>What you give us yourself</h3>
        <ul>
          <li>
            <strong>Identity —</strong> name, email address, mobile number, gender
            and date of birth
          </li>
          <li>
            <strong>Address —</strong> PIN code, city, state and full address
          </li>
          <li>
            <strong>Professional details —</strong> COA number, qualification (from
            Class 10 up to PhD), professional membership, experience and firm name
          </li>
          <li>
            <strong>Business details —</strong> GST number, PAN and date of
            incorporation, for Corporate and BMF
          </li>
          <li>
            <strong>Your work —</strong> the projects, products, blogs and images
            you post
          </li>
          <li>
            <strong>KYC documents —</strong> from Design Associates
          </li>
        </ul>

        <h3>What is collected automatically</h3>
        <ul>
          <li>IP address, browser and device information</li>
          <li>Which pages you viewed and how long you stayed</li>
          <li>Login time and device</li>
        </ul>

        <LegalNote tone="ok" title="What we never collect">
          We never see or store your card number, CVV or net-banking password. All
          payments happen on the payment gateway&rsquo;s own secure pages.
        </LegalNote>
      </S>

      <S id="why" title="What we do with it">
        <table>
          <thead>
            <tr>
              <th>Information</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email and mobile</td>
              <td>Identity verification (OTP), enquiry alerts, essential updates</td>
            </tr>
            <tr>
              <td>PIN code</td>
              <td>Deciding the PACT territory and routing enquiries from your area to you</td>
            </tr>
            <tr>
              <td>Qualification and COA</td>
              <td>Checking eligibility</td>
            </tr>
            <tr>
              <td>GST and PAN</td>
              <td>Raising invoices and meeting tax obligations</td>
            </tr>
            <tr>
              <td>Your postings</td>
              <td>Displaying them on the platform so clients can find you</td>
            </tr>
            <tr>
              <td>Usage information</td>
              <td>Fixing faults, preventing fraud, improving the service</td>
            </tr>
          </tbody>
        </table>

        <p>
          We <strong>do not sell</strong> your information — not to an advertising
          company, not to a data broker.
        </p>
      </S>

      <S id="share" title="Who we share it with">
        <p>Information is shared only in these situations, and only the part that is needed:</p>
        <ul>
          <li>
            <strong>With the PACT holder —</strong> when you send an enquiry through
            Consult Nearby, your name, mobile, PIN code and the requirement you
            wrote go to the registrant you want to connect with
          </li>
          <li>
            <strong>Payment gateway —</strong> to complete the payment
          </li>
          <li>
            <strong>Email and SMS providers —</strong> to deliver notifications
          </li>
          <li>
            <strong>On a legal demand —</strong> under a valid order from a court or
            a competent government authority
          </li>
        </ul>

        <LegalNote tone="info" title="About Design Associates">
          A DA works on your project on behalf of ArchFacing. They
          receive only the project information that is necessary to complete the
          work.
        </LegalNote>
      </S>

      <S id="pact" title="PACT and your PIN code">
        <p>
          The whole structure of ArchFacing rests on the PIN code. So for
          us a PIN code is not just an address — it decides who your enquiry
          reaches.
        </p>
        <ul>
          <li>
            Your PIN code is visible to the PACT holder for that area, so they can
            contact you
          </li>
          <li>
            If there is no registrant on that PIN, we look up to 50 kilometres
            around it
          </li>
          <li>
            If there is still no one, the enquiry goes to the ArchFacing team, who
            connect you with a suitable registrant
          </li>
          <li>
            When you press &ldquo;Use My Location&rdquo;, your browser asks for your
            permission. Your coordinates are used only to find the nearest PIN —{' '}
            <strong>we do not store them</strong>
          </li>
        </ul>
      </S>

      <S id="cookies" title="Cookies and tracking">
        <p>
          We use a few essential cookies — such as keeping you logged in and
          remembering your cart. The full details are in the{' '}
          <Link href="/legal/cookies">Cookies Policy</Link>.
        </p>
        <p>
          For podcasts and videos we use YouTube&rsquo;s{' '}
          <code>youtube-nocookie.com</code>{' '}
          so that simply watching a video does not place a tracking cookie on your
          device.
        </p>
      </S>

      <S id="security" title="How we keep it safe">
        <ul>
          <li>Passwords are never stored directly — only a bcrypt hash</li>
          <li>OTPs are stored hashed too, and expire in 10 minutes</li>
          <li>The entire site runs on HTTPS</li>
          <li>KYC documents stay behind restricted access — only authorised staff can view them</li>
          <li>Every admin action is recorded in an audit log</li>
          <li>EXIF data, including GPS, is stripped from every uploaded image</li>
        </ul>

        <LegalNote tone="warn" title="No system is completely secure">
          We keep good safeguards in place, but no method on the internet is a
          hundred per cent secure. Do not share your password with anyone, and if
          something looks suspicious, write to{' '}
          <a href="mailto:support@archfacing.com">support@archfacing.com</a>{' '}
          straight away.
        </LegalNote>
      </S>

      <S id="retention" title="How long we keep it">
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>How long</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account information</td>
              <td>As long as the account is active</td>
            </tr>
            <tr>
              <td>PACT and its records</td>
              <td>The full PACT term + as required by law</td>
            </tr>
            <tr>
              <td>Invoices and payments</td>
              <td>8 years — as required by tax law</td>
            </tr>
            <tr>
              <td>OTP records</td>
              <td>A few hours — then deleted</td>
            </tr>
            <tr>
              <td>Enquiries and the conversations on them</td>
              <td>3 years</td>
            </tr>
          </tbody>
        </table>
      </S>

      <S id="rights" title="Your rights">
        <p>Your information is yours. You can ask us at any time to —</p>
        <ol>
          <li>Show you everything we hold about you</li>
          <li>Correct information that is wrong</li>
          <li>Delete your account and your information</li>
          <li>Stop sending you marketing emails</li>
          <li>Give you a copy of your information</li>
        </ol>
        <p>
          For any of these, write to{' '}
          <a href="mailto:support@archfacing.com">support@archfacing.com</a>. We
          respond within <strong>30 days</strong>.
        </p>

        <LegalNote>
          Some information has to be kept by law — invoices and tax records, for
          example. Even after an account is deleted, these stay protected for the
          prescribed period, but they are not used for anything else.
        </LegalNote>
      </S>

      <S id="children" title="Children's information">
        <p>
          ArchFacing is not for people under 18. Registration in the Student
          category is also only for those who have turned 18. If we learn that a
          minor has created an account, we remove it.
        </p>
      </S>

      <S id="changes" title="Changes to this policy">
        <p>
          This policy may change when needed. When there is a significant change, we
          tell registered users by email and update the &ldquo;Last updated&rdquo;
          date shown above.
        </p>
      </S>

      <S id="contact" title="Contact">
        <p>For anything to do with privacy:</p>
        <ul>
          <li>
            Email — <a href="mailto:support@archfacing.com">support@archfacing.com</a>
          </li>
          <li>
            General information — <a href="mailto:info@archfacing.com">info@archfacing.com</a>
          </li>
          <li>
            Phone — <a href="tel:+919667987129">+91 96679 87129</a>
          </li>
        </ul>
        <p>
          ArchFacing · Ardian Designs and Digitals Private Limited · India
          <br />
          Copyright Registration No. L-92657/2020
        </p>
      </S>
    </LegalPage>
  )
}
