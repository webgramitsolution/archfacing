/**
 * Hero illustrations for the Phase 9 pages.
 *
 *   node scripts/gen-phase9-images.mjs
 *
 * Same treatment as the legal heroes — navy ground, drafting grid, one
 * brand-orange line icon. Drop a real photograph in at the same filename
 * when you have one; no code changes are needed.
 */

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join('public', 'img')
fs.mkdirSync(OUT, { recursive: true })

const W = 720
const H = 420

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

const FILES = {
  // Award ribbon — Club Membership
  'hero-club': `<circle cx="12" cy="9" r="6"/><path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5"/><path d="M12 6.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 8.8 11 8.5z"/>`,
  // Display board on a stand — Advertisements
  'hero-advertisements': `<rect x="2" y="4" width="20" height="12" rx="2"/><path d="M12 16v5M8 21h8"/><path d="M6 8h7M6 11h4"/>`,
  // Stacked drives — Portal Space
  'hero-portal-space': `<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>`,
}

for (const [name, icon] of Object.entries(FILES)) {
  const file = path.join(OUT, `${name}.svg`)
  fs.writeFileSync(file, page(icon))
  console.log(`  ✓ ${file}`)
}

console.log(`\n${Object.keys(FILES).length} illustrations written.\n`)
