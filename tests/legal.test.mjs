/**
 * Legal pages — structure, formatting and business rules.
 *
 *   pnpm test:legal
 *
 * ★ Most important: the pages must state the very rules that the code
 *   enforces. If the refund limit changes in the code and the page keeps
 *   the old one, that can turn into a legal problem.
 */

import fs from 'node:fs'
import path from 'node:path'
import { BUSINESS_RULES } from '../src/config/permissions.ts'

let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

const DIR = path.join('src', 'app', '(public)', 'legal')

const PAGES = [
  ['privacy', 'Privacy Policy', 'privacy'],
  ['terms', 'Terms & Conditions', 'terms'],
  ['refund', 'Return, Refund & Cancellation Policy', 'refund'],
  ['cookies', 'Cookies Policy', 'cookies'],
  ['about', 'About Us', 'about'],
  ['contact', 'Contact Us', 'contact'],
  ['need-help', 'Need Help', 'help'],
]

// ═══ 1. All pages exist ═══
console.log('\n── All seven pages ──')

const sources = {}
for (const [slug, title, image] of PAGES) {
  const file = path.join(DIR, slug, 'page.tsx')
  const exists = fs.existsSync(file)
  check(`${slug.padEnd(11)} exists`, exists)
  if (exists) sources[slug] = fs.readFileSync(file, 'utf8')
}

// ═══ 2. Structure ═══
console.log('\n── The structure of every page ──')

for (const [slug, title, image] of PAGES) {
  const s = sources[slug]
  if (!s) continue

  const hasTitle = s.includes(`title="${title}"`)
  const hasImage = s.includes(`image="${image}"`)
  const hasSections = s.includes('sections={SECTIONS}')
  const hasMeta = s.includes('export const metadata')

  check(
    `${slug.padEnd(11)} title, image, sections, metadata`,
    hasTitle && hasImage && hasSections && hasMeta,
    `(title:${hasTitle} image:${hasImage} sec:${hasSections} meta:${hasMeta})`
  )
}

// ═══ 3. Hero images exist ═══
console.log('\n── Hero illustrations ──')

for (const [slug, , image] of PAGES) {
  const file = path.join('public', 'img', 'legal', `${image}.svg`)
  check(`${image}.svg has been created`, fs.existsSync(file))
}

// ═══ 4. formatting ═══
console.log('\n── Content formatting ──')

for (const [slug] of PAGES) {
  const s = sources[slug]
  if (!s) continue

  // Every section is built from <S> — that is what emits the h2
  const sections = (s.match(/<S\s/g) ?? []).length
  const bullets = (s.match(/<ul>/g) ?? []).length
  const headings3 = (s.match(/<h3>/g) ?? []).length

  check(
    `${slug.padEnd(11)} ${sections} sections · ${bullets} lists · ${headings3} sub-headings`,
    sections >= 5 && bullets >= 3
  )
}

// ═══ 5. ★ Rules match the code ═══
console.log('\n── ★ The refund page rules must match the code ──')

const refund = sources.refund ?? ''
check(
  'the refund window comes from config (not hard-coded)',
  refund.includes('BUSINESS_RULES.REFUND_WINDOW_DAYS')
)
check(
  'the 25% cap comes from config',
  refund.includes('BUSINESS_RULES.REFUND_MAX_PERCENT')
)
check(
  'the settlement days come from config',
  refund.includes('BUSINESS_RULES.REFUND_SETTLEMENT_DAYS')
)
check('the config window is 15 days', BUSINESS_RULES.REFUND_WINDOW_DAYS === 15)
check('the config maximum is 25%', BUSINESS_RULES.REFUND_MAX_PERCENT === 25)
check('the config settlement is 30 days', BUSINESS_RULES.REFUND_SETTLEMENT_DAYS === 30)

const terms = sources.terms ?? ''
check('Terms takes the PACT term from config', terms.includes('BUSINESS_RULES.PACT_VALIDITY_YEARS'))
check('Terms takes the cessation days from config', terms.includes('BUSINESS_RULES.PACT_INACTIVITY_DAYS'))
check('Terms takes the complaint count from config', terms.includes('BUSINESS_RULES.PACT_MAX_COMPLAINTS'))

// ═══ 6. Essential information ═══
console.log('\n── The essentials from the PDF ──')

check('Privacy mentions COA', (sources.privacy ?? '').includes('COA'))
check('Privacy has a PACT section', (sources.privacy ?? '').includes('PACT'))
check('Terms mentions the 80/20 split', terms.includes('80') && terms.includes('20'))
check('Terms carries the copyright number', terms.includes('L-92657/2020'))
check('About names Yudhveer Singh', (sources.about ?? '').includes('Yudhveer Singh'))
check('About explains Designa/Designi',
  (sources.about ?? '').includes('DESIGNA') && (sources.about ?? '').includes('DESIGNI'))
check('Contact has the support email', (sources.contact ?? '').includes('support@archfacing.com'))
check('Contact has the phone number', (sources.contact ?? '').includes('9667987129'))
check('Contact explains the DA email format (§8.2)',
  (sources.contact ?? '').includes('yudhveer110005@gmail.com'))
check('Refund states Portal Space is non-refundable',
  refund.includes('Portal Space') && /non-refundable/i.test(refund))

// ═══ 7. SEO ═══
console.log('\n── SEO ──')

check('sitemap.ts exists', fs.existsSync(path.join('src', 'app', 'sitemap.ts')))
check('robots.ts exists', fs.existsSync(path.join('src', 'app', 'robots.ts')))

const robots = fs.readFileSync(path.join('src', 'app', 'robots.ts'), 'utf8')
check('★ robots blocks /admin', robots.includes("'/admin/'"))
check('★ robots blocks /dashboard', robots.includes("'/dashboard/'"))
check('robots blocks /api', robots.includes("'/api/'"))
check('robots declares the sitemap', robots.includes('sitemap'))

const sitemap = fs.readFileSync(path.join('src', 'app', 'sitemap.ts'), 'utf8')
check('sitemap lists all the legal pages', PAGES.every(([slug]) => sitemap.includes(slug)))
check('sitemap also includes published postings', sitemap.includes("status: 'PUBLISHED'"))

// ═══ 8. Cross-links ═══
console.log('\n── Cross-links ──')

check('Refund links to Terms', refund.includes('/legal/terms'))
check('Privacy links to Cookies', (sources.privacy ?? '').includes('/legal/cookies'))
check('Need Help links to Refund', (sources['need-help'] ?? '').includes('/legal/refund'))
check('Cookies links to Privacy', (sources.cookies ?? '').includes('/legal/privacy'))

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
