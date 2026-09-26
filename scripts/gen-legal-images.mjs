/**
 * The hero illustrations for the Legal pages.
 *
 *   node scripts/gen-legal-images.mjs
 *
 * Every page has its own subject — a lock for privacy, a rupee for refund
 * and so on. Once real artwork arrives, drop a file of the same name into
 * public/img/legal/.
 */

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join('public', 'img', 'legal')
fs.mkdirSync(OUT, { recursive: true })

const W = 720
const H = 420

/** The faint grid behind — like drafting paper */
function grid(color = '#FFFFFF', opacity = 0.06) {
  let s = ''
  for (let x = 0; x <= W; x += 40) {
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`
  }
  for (let y = 0; y <= H; y += 40) {
    s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`
  }
  return s
}

function page(icon, from = '#16233A', to = '#22334F') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient>
  <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FF7A4D"/><stop offset="1" stop-color="#FF5722"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${grid()}
<circle cx="${W * 0.78}" cy="${H * 0.24}" r="${H * 0.42}" fill="#FF5722" opacity=".07"/>
<circle cx="${W * 0.2}" cy="${H * 0.82}" r="${H * 0.3}" fill="#FFFFFF" opacity=".04"/>
<g transform="translate(${W / 2 - 90}, ${H / 2 - 90}) scale(7.5)" fill="none"
   stroke="url(#glow)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  ${icon}
</g>
</svg>`
}

const ICONS = {
  // lock — privacy
  privacy: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`,
  // document — terms
  terms: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>`,
  // return arrow — refund
  refund: `<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/><path d="M10 9h4M10 12h4M13 9c0 3-2 3-2 3l3 3"/>`,
  // cookie — cookies
  cookies: `<path d="M12 3a9 9 0 109 9 4 4 0 01-5-5 4 4 0 01-4-4z"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="9" cy="15" r="1"/>`,
  // building — about
  about: `<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M15 10h.01"/>`,
  // envelope — contact
  contact: `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/>`,
  // question — help
  help: `<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>`,
  // shield — security
  security: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>`,
}

const TINTS = {
  privacy: ['#132133', '#1E3350'],
  terms: ['#16233A', '#243A5C'],
  refund: ['#2A1A14', '#4A2A1E'],
  cookies: ['#251C10', '#42331C'],
  about: ['#0F1E2B', '#1B3547'],
  contact: ['#141F32', '#22354F'],
  help: ['#101F1A', '#1C3A2E'],
  security: ['#151A2E', '#232B4A'],
}

for (const [name, icon] of Object.entries(ICONS)) {
  const [from, to] = TINTS[name] ?? ['#16233A', '#22334F']
  fs.writeFileSync(path.join(OUT, `${name}.svg`), page(icon, from, to))
}

console.log(`✓ ${Object.keys(ICONS).length} legal hero illustrations created`)
