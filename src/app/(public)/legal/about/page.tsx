import type { Metadata } from 'next'
import { BUSINESS_RULES, termYears } from '@/config/permissions'
import Link from 'next/link'
import {
  LegalPage,
  LegalSectionBlock as S,
  LegalNote,
  type LegalSection,
} from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'What ArchFacing is, who built it, and what the PACT system changes for ' +
    "India's design industry",
}

const SECTIONS: LegalSection[] = [
  { id: 'what', title: 'What ArchFacing is' },
  { id: 'words', title: 'Designa and Designi' },
  { id: 'pact', title: 'PACT — what sets us apart' },
  { id: 'who', title: 'Who joins us' },
  { id: 'founder', title: 'Who built it' },
  { id: 'why', title: 'Why it was built' },
  { id: 'ahead', title: 'What comes next' },
]

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="ArchFacing"
      title="About Us"
      subtitle="An effort to bring India's architecture, interior design and building materials industry together in one place — organised by PIN code."
      image="about"
      pdfRef="6.1.2.2.3"
      updated="27 August 2026"
      sections={SECTIONS}
    >
      <S id="what" title="What ArchFacing is">
        <p>
          ArchFacing is the <strong>B2B marketplace</strong> for India&rsquo;s
          building-design industry. Architects, interior designers, consultants,
          building material suppliers, corporates and clients — all in one place.
        </p>
        <p>
          But it is not just a directory. Here every PIN code is a{' '}
          <strong>territory</strong>, and the professional holding that territory
          connects directly with the client — no agent in between, no commission.
        </p>
      </S>

      <S id="words" title="Designa and Designi">
        <p>
          ArchFacing coined these two words, and they are being used here for the
          first time:
        </p>
        <table>
          <thead>
            <tr>
              <th>Word</th>
              <th>How it was formed</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>DESIGNA</strong></td>
              <td>design + <em>A</em>rchitecture</td>
              <td>Professionals connected with architecture, and their products</td>
            </tr>
            <tr>
              <td><strong>DESIGNI</strong></td>
              <td>design + <em>I</em>nterior</td>
              <td>Professionals connected with interior designing, and their products</td>
            </tr>
          </tbody>
        </table>
        <p>
          That is why our logo says — <strong>&ldquo;We the Designa and
          Designi&rdquo;</strong>.
        </p>
      </S>

      <S id="pact" title="PACT — what sets us apart">
        <p>
          <strong>PACT</strong> stands for PIN Area Code Territory. We treat every
          PIN code of India&rsquo;s postal department as a franchise territory.
        </p>
        <ul>
          <li>
            <strong>19,238 PIN codes</strong> — all of India, in our records
          </li>
          <li>
            Every PIN has 1 Designa, 1 Designi, 1 BMF and 24 Consultant seats
          </li>
          <li>
            <strong>One PIN + one service = one person only</strong> — this rule is
            never broken
          </li>
          <li>Every PACT is granted for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}</li>
          <li>Every enquiry from that area goes straight to that holder&rsquo;s dashboard</li>
        </ul>

        <LegalNote title="Different from a traditional franchise">
          Franchises used to be split by locality, and those boundaries were always
          blurred. A PIN code is official and fixed — so there is never an argument
          about where one territory ends and another begins.
        </LegalNote>

        <p>
          <Link href="/pact">Read about PACT in detail →</Link>
        </p>
      </S>

      <S id="who" title="Who joins us">
        <ul>
          <li>
            <strong>Clients —</strong> people who need a design for their home,
            office or project. Joining is free
          </li>
          <li>
            <strong>Professionals —</strong> architects and interior designers, in
            four categories — Professional, Legend, Innovator and Student
          </li>
          <li>
            <strong>Consultants —</strong> 24 kinds, from engineering to Indian
            Traditional Sciences
          </li>
          <li>
            <strong>BMF —</strong> Building Materials Facilitators, who handle the
            supply of materials in their area
          </li>
          <li>
            <strong>Corporates —</strong> manufacturers and traders, who showcase
            their products
          </li>
          <li>
            <strong>Design Associates —</strong> professionals who work together
            with ArchFacing
          </li>
        </ul>
      </S>

      <S id="founder" title="Who built it">
        <p>
          The ArchFacing concept is the work of{' '}
          <strong>Architect Yudhveer Singh</strong>. After long experience in
          architecture, interiors and project management, he put together this
          system so that the whole world of designing could come onto one digital
          platform.
        </p>
        <p>
          The concept is registered with the Copyright Office of the Government of
          India under <strong>Reg. No. L-92657/2020</strong> (dated 08/07/2020). The
          trademark application for the logo is Ref. 4353766.
        </p>
        <p>
          The platform is operated by <strong>Ardian Designs and Digitals Private
          Limited</strong>.
        </p>
      </S>

      <S id="why" title="Why it was built">
        <p>
          In 2020, while the country was going through the pandemic and what
          followed, the design profession faced one plain question — how do you find
          work.
        </p>
        <p>
          The old way rested on contacts. The better known you were, the more work
          you got; everyone else waited. For newcomers and for professionals in
          smaller cities, that route was all but closed.
        </p>
        <p>
          ArchFacing is an attempt to change exactly that. If you hold the PACT for
          your area, the work coming from there reaches you — whether you are in
          Delhi or in a small town.
        </p>
      </S>

      <S id="ahead" title="What comes next">
        <p>Work is under way on these plans:</p>
        <ul>
          <li>ArchFacing Club — benefits with hotels and corporates</li>
          <li>Merchandise and e-commerce</li>
          <li>Interviews and podcasts with Legends</li>
          <li>Exhibitions, seminars and conferences</li>
          <li>Books and magazines</li>
          <li>Online courses for Designa and Designi</li>
          <li>Design competitions</li>
          <li>A DIY TV programme and channel</li>
          <li>An ArchFacing credit card</li>
        </ul>
        <p>
          All of India in the first phase, the whole world in the second — that is
          the plan.
        </p>
      </S>
    </LegalPage>
  )
}
