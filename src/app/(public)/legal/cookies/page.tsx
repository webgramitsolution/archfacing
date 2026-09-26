import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LegalPage,
  LegalSectionBlock as S,
  LegalNote,
  type LegalSection,
} from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Cookies Policy',
  description:
    'Which cookies ArchFacing stores, why it stores them, and how you can ' +
    'turn them off',
}

const SECTIONS: LegalSection[] = [
  { id: 'what', title: 'What a cookie is' },
  { id: 'ours', title: 'The cookies we use' },
  { id: 'third', title: 'Third-party services' },
  { id: 'control', title: 'What you can do' },
  { id: 'contact', title: 'Contact' },
]

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookies Policy"
      subtitle="Which cookies we use and why — the full list, with no runaround."
      image="cookies"
      pdfRef="6.1.2.2.2"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="what" title="What a cookie is">
        <p>
          A cookie is a small file that a website places in your browser. The next
          time you visit, the site reads that file and recognises that you are the
          same person — which is why you do not have to log in again on every page.
        </p>

        <h3>There are two kinds</h3>
        <ul>
          <li>
            <strong>Session cookie —</strong> erased the moment you close the
            browser. For example, the security cookie used while you fill a form
          </li>
          <li>
            <strong>Persistent cookie —</strong> stays for a set period. For
            example, your login, which lasts 30 days
          </li>
        </ul>

        <h3>What we use them for</h3>
        <ul>
          <li>To keep you logged in</li>
          <li>To remember your cart</li>
          <li>To remember the city you picked at the top</li>
          <li>To protect against attacks on forms</li>
        </ul>
      </S>

      <S id="ours" title="The cookies we use">
        <p>
          ArchFacing keeps only the cookies needed to run the site. We do not use
          cookies that follow you around for advertising.
        </p>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>How long</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>authjs.session-token</code></td>
              <td>To keep you logged in</td>
              <td>30 days</td>
            </tr>
            <tr>
              <td><code>authjs.csrf-token</code></td>
              <td>Protection against attacks on forms</td>
              <td>For the session</td>
            </tr>
            <tr>
              <td><code>af.city</code></td>
              <td>Remembering the city you picked at the top</td>
              <td>Until you clear it</td>
            </tr>
          </tbody>
        </table>

        <LegalNote tone="ok" title="These are all essential">
          None of these cookies is there to show you advertisements or to read your
          habits. Together, all they do is keep the site working properly.
        </LegalNote>
      </S>

      <S id="third" title="Third-party services">
        <p>
          Some parts of the site come from third-party services, which may have
          cookies of their own:
        </p>
        <ul>
          <li>
            <strong>YouTube —</strong> podcast and project videos. We use{' '}
            <code>youtube-nocookie.com</code> so that simply watching a video does
            not place a tracking cookie on your device
          </li>
          <li>
            <strong>Dailymotion —</strong> playing a video may set their own
            cookies
          </li>
          <li>
            <strong>Payment gateway —</strong> at the time of payment, to prevent fraud
          </li>
        </ul>
        <p>
          These services have their own policies, over which we have no control.
        </p>
      </S>

      <S id="control" title="What you can do">
        <p>
          Every browser lets you view, block and delete cookies — usually under
          Settings → Privacy.
        </p>

        <LegalNote tone="warn" title="If you turn everything off">
          Blocking session cookies means your login will not hold, your cart will
          keep emptying and forms will keep getting stuck. So please leave at least
          the essential cookies on.
        </LegalNote>

        <p>
          This policy may change from time to time. For the full picture, see the{' '}
          <Link href="/legal/privacy">Privacy Policy</Link> as well.
        </p>
      </S>

      <S id="contact" title="Contact">
        <p>
          If you have any question about cookies, write to{' '}
          <a href="mailto:support@archfacing.com">support@archfacing.com</a>.
        </p>
      </S>
    </LegalPage>
  )
}
