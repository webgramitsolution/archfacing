/**
 * The "no phone numbers on listings" rule — text patterns and image OCR.
 * Run: npx tsx tests/no-phone.check.ts
 */
import sharp from 'sharp'
import { findPhoneNumbers } from '../src/lib/phone-detect'
import { phonesInImage } from '../src/lib/contact-screen'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

const PHONE = [
  'Call 9876543210 for a quote', 'Contact: +91 98765 43210', 'WhatsApp +91-98765-43210', 'ph 098765 43210',
  'Office 011-2345 6789', 'Toll free 1800-123-4567', 'reach me on 98765.43210', 'nine eight seven six five four three two one zero',
  'mob: 9 8 7 6 5 4 3 2 1 0', '(+91) 7766554433',
]
const CLEAN = [
  'Built-up area 3,500 sq ft in 2024', 'Budget ₹1,20,00,000 to ₹1,50,00,000', 'PIN 600001 2024 completion',
  'Sizes 600 x 1200 mm, 12 mm thick', 'Model AF-2024-778', 'Years 2019 2020 2021 2022', 'GSTIN 07AABCU9603R1ZM',
  '110001', 'Phase 2 of 3, 450 units',
]

async function banner(text: string, dark: boolean, w = 1200, h = 500) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${dark ? '#1f2937' : '#f5f0e8'}"/>
    <text x="60" y="${h / 2}" font-family="Arial" font-size="64" font-weight="700" fill="${dark ? '#ffffff' : '#222222'}">${text}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg().toBuffer()
}

async function main() {
  console.log('Text')
  for (const t of PHONE) ok(findPhoneNumbers(t).length > 0, `catches: ${t}`)
  for (const t of CLEAN) ok(findPhoneNumbers(t).length === 0, `ignores: ${t}`)

  console.log('Images (OCR)')
  ok((await phonesInImage(await banner('Call 98765 43210', false))).length > 0, 'dark text on light banner')
  ok((await phonesInImage(await banner('+91 99887 76655', true))).length > 0, 'white text on dark banner')
  const tilted = await sharp(await banner('Enquire 8800112233', false)).rotate(4, { background: '#f5f0e8' }).jpeg().toBuffer()
  ok((await phonesInImage(tilted)).length > 0, 'slightly rotated text')
  ok((await phonesInImage(await banner('Modern Villa · 3,500 sq ft · 2024', false))).length === 0, 'caption without a number passes')
  ok((await phonesInImage(await banner('', true))).length === 0, 'plain image passes')

  console.log(fails ? `${fails} FAILED` : 'all passed')
  process.exit(fails ? 1 : 0)
}
main()
