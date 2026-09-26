/**
 * The illustration pinned to the right of the Artistry mega-menu.
 *
 *   node scripts/gen-mega-artistry.mjs
 *
 * A line-drawn modern house against a warm sun, with sketchy trees and birds —
 * the same treatment as the design. Replace public/img/mega-artistry.svg with
 * real artwork whenever you have it; nothing in the code needs to change.
 */

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join('public', 'img')
fs.mkdirSync(OUT, { recursive: true })

const W = 560
const H = 340

/** A loose, hand-drawn looking tree. */
function tree(x, groundY, h, seed) {
  const r = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  let twigs = ''
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (r(i) - 0.5) * 2.1
    const len = h * (0.24 + r(i + 40) * 0.3)
    const bx = x + (r(i + 80) - 0.5) * h * 0.24
    const by = groundY - h * (0.42 + r(i + 120) * 0.42)
    twigs += `<path d="M${bx.toFixed(1)} ${by.toFixed(1)} q${(Math.cos(a) * len * 0.5).toFixed(1)} ${(Math.sin(a) * len * 0.5).toFixed(1)} ${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}" />`
  }
  return `<g stroke="#9AA3AC" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.85">
    <path d="M${x} ${groundY} L${x} ${groundY - h * 0.5}" stroke-width="1.4"/>
    ${twigs}
  </g>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFB877"/>
    <stop offset="1" stop-color="#FF8A3D"/>
  </linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFD9B0"/>
    <stop offset="1" stop-color="#FFB067"/>
  </linearGradient>
</defs>

<!-- sun -->
<circle cx="392" cy="112" r="76" fill="url(#sun)" opacity="0.42"/>

<!-- distant towers, faint -->
<g fill="none" stroke="#C7CDD4" stroke-width="1">
  <rect x="432" y="96" width="34" height="150"/>
  <rect x="472" y="128" width="26" height="118"/>
  <path d="M436 112h26M436 128h26M436 144h26M436 160h26M436 176h26M436 192h26"/>
  <path d="M476 142h18M476 158h18M476 174h18M476 190h18"/>
</g>

<!-- the house -->
<g stroke="#5A6470" stroke-width="1.6" fill="none" stroke-linejoin="round">
  <!-- lower slab -->
  <path d="M92 246 L92 196 L300 196 L300 246 Z" fill="#FFFFFF"/>
  <path d="M78 196 L314 196" stroke-width="2.4"/>
  <!-- lower glazing -->
  <g fill="url(#glass)" opacity="0.9" stroke="none">
    <rect x="104" y="206" width="42" height="32" rx="1"/>
    <rect x="154" y="206" width="42" height="32" rx="1"/>
    <rect x="204" y="206" width="42" height="32" rx="1"/>
    <rect x="254" y="206" width="34" height="32" rx="1"/>
  </g>
  <g stroke="#5A6470" stroke-width="1">
    <rect x="104" y="206" width="42" height="32"/>
    <rect x="154" y="206" width="42" height="32"/>
    <rect x="204" y="206" width="42" height="32"/>
    <rect x="254" y="206" width="34" height="32"/>
  </g>

  <!-- upper cantilever, pushed right -->
  <path d="M128 196 L128 138 L336 138 L336 196" fill="#FFFFFF"/>
  <path d="M116 138 L350 138" stroke-width="2.4"/>
  <g fill="url(#glass)" opacity="0.85" stroke="none">
    <rect x="140" y="150" width="52" height="36" rx="1"/>
    <rect x="200" y="150" width="52" height="36" rx="1"/>
    <rect x="260" y="150" width="64" height="36" rx="1"/>
  </g>
  <g stroke="#5A6470" stroke-width="1">
    <rect x="140" y="150" width="52" height="36"/>
    <rect x="200" y="150" width="52" height="36"/>
    <rect x="260" y="150" width="64" height="36"/>
  </g>

  <!-- roof line -->
  <path d="M116 138 L116 122 L350 122 L350 138" stroke-width="1.2"/>

  <!-- columns -->
  <path d="M128 196 L128 246 M300 196 L300 246 M336 138 L336 196"/>
</g>

<!-- ground -->
<path d="M40 246 L520 246" stroke="#5A6470" stroke-width="1.6" fill="none"/>
<path d="M56 254 L470 254" stroke="#C7CDD4" stroke-width="1" fill="none"/>

${tree(70, 246, 132, 3)}
${tree(360, 246, 104, 11)}
${tree(404, 246, 78, 23)}

<!-- birds -->
<g stroke="#8A929B" stroke-width="1.2" fill="none" stroke-linecap="round">
  <path d="M300 58 q7 -7 14 0 q7 -7 14 0"/>
  <path d="M340 40 q5 -5 10 0 q5 -5 10 0"/>
  <path d="M268 82 q5 -5 10 0 q5 -5 10 0"/>
</g>
</svg>`

const file = path.join(OUT, 'mega-artistry.svg')
fs.writeFileSync(file, svg)
console.log(`  ✓ ${file}`)
