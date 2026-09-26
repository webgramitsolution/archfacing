/**
 * Generates placeholder illustrations — as SVG.
 *
 *   node scripts/gen-placeholders.mjs
 *
 * These stand in for real images. Once you have the real photos, just drop
 * a file of the same name into public/img/ — no code needs to change.
 */

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join('public', 'img')
fs.mkdirSync(path.join(OUT, 'pro'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'product'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'brand'), { recursive: true })

const P = {
  night: ['#0F1A2B', '#1E3252', '#2C4A7A'],
  dusk: ['#2A1F35', '#4A3355', '#6B4A6E'],
  clay: ['#3A2418', '#6B4226', '#A8663C'],
  moss: ['#16281E', '#274A34', '#3E7350'],
  slate: ['#1B2228', '#374651', '#5A7183'],
  amber: ['#2E1F0A', '#6B4A14', '#B8802A'],
  sand: ['#EFE7DC', '#DCCDB8', '#C4AE93'],
  mist: ['#E8EDF2', '#CFDAE4', '#AFC0D0'],
}

const wrap = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`

const grad = (id, [a, b], angle = 'x1="0" y1="0" x2="0" y2="1"') =>
  `<linearGradient id="${id}" ${angle}><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`

/** The silhouette of a building — with windows */
function building(x, y, w, h, fill, lit, seed) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
  const cols = Math.max(2, Math.floor(w / 22))
  const rows = Math.max(2, Math.floor(h / 26))
  const cw = w / cols
  const rh = h / rows

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      // no Math.random — determined by the seed, so the same image every time
      const n = (seed * 9301 + (c * 31 + r * 17) * 49297) % 233280
      if (n / 233280 > 0.45) continue
      s += `<rect x="${(x + c * cw + cw * 0.24).toFixed(1)}" y="${(y + r * rh + rh * 0.22).toFixed(1)}" width="${(cw * 0.5).toFixed(1)}" height="${(rh * 0.44).toFixed(1)}" fill="${lit}" opacity="${(0.28 + (n % 60) / 140).toFixed(2)}"/>`
    }
  }
  return s
}

/** An architecture image — for the professionals' cards */
function architecture(name, paletteKey, seed, w = 640, h = 400) {
  const [dark, mid, light] = P[paletteKey]
  let s = grad('sky', [light, mid]) + grad('gl', ['#FFD9A0', '#FF8A3D'])
  s = `<defs>${s}</defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`

  // buildings in the distance
  let x = -20
  let i = 0
  while (x < w + 40) {
    const bw = 42 + ((seed + i * 13) % 5) * 16
    const bh = 90 + ((seed + i * 29) % 7) * 26
    s += building(x, h - bh - 62, bw, bh, mid, light, seed + i)
    x += bw + 8
    i++
  }

  // the main building in front
  const mw = w * 0.36
  const mx = w * 0.5 - mw / 2
  const mh = h * 0.62
  s += building(mx, h - mh - 40, mw, mh, dark, 'url(#gl)', seed + 99)

  // ground
  s += `<rect y="${h - 40}" width="${w}" height="40" fill="${dark}"/>`
  s += `<rect y="${h - 40}" width="${w}" height="2" fill="${light}" opacity=".25"/>`

  return wrap(w, h, s)
}

/** Interior — like a room */
function interior(paletteKey, seed, w = 640, h = 400) {
  const [dark, mid, light] = P[paletteKey]
  let s = `<defs>${grad('wall', [light, mid])}${grad('warm', ['#FFE3B8', '#FFB067'])}</defs>`
  s += `<rect width="${w}" height="${h}" fill="url(#wall)"/>`
  // floor
  s += `<path d="M0 ${h * 0.68} L${w} ${h * 0.62} L${w} ${h} L0 ${h} Z" fill="${dark}" opacity=".85"/>`
  // window
  s += `<rect x="${w * 0.58}" y="${h * 0.14}" width="${w * 0.3}" height="${h * 0.42}" fill="url(#warm)" opacity=".55"/>`
  s += `<rect x="${w * 0.58}" y="${h * 0.14}" width="${w * 0.3}" height="${h * 0.42}" fill="none" stroke="${dark}" stroke-width="3"/>`
  s += `<line x1="${w * 0.73}" y1="${h * 0.14}" x2="${w * 0.73}" y2="${h * 0.56}" stroke="${dark}" stroke-width="3"/>`
  // sofa
  s += `<rect x="${w * 0.08}" y="${h * 0.5}" width="${w * 0.34}" height="${h * 0.18}" rx="8" fill="${dark}"/>`
  s += `<rect x="${w * 0.08}" y="${h * 0.42}" width="${w * 0.34}" height="${h * 0.12}" rx="8" fill="${mid}"/>`
  // lamp
  s += `<circle cx="${w * 0.5}" cy="${h * 0.26}" r="${h * 0.055}" fill="url(#warm)"/>`
  s += `<line x1="${w * 0.5}" y1="0" x2="${w * 0.5}" y2="${h * 0.21}" stroke="${dark}" stroke-width="2"/>`
  return wrap(w, h, s)
}

/** A plain product image */
function product(kind, w = 500, h = 500) {
  const [bg, mid, dark] = P.sand
  let s = `<defs>${grad('pbg', [bg, mid])}</defs><rect width="${w}" height="${h}" fill="url(#pbg)"/>`
  const cx = w / 2
  const cy = h / 2

  const shapes = {
    sofa: `<rect x="${cx - 150}" y="${cy - 10}" width="300" height="90" rx="14" fill="${dark}"/>
           <rect x="${cx - 150}" y="${cy - 70}" width="300" height="70" rx="14" fill="#8A7358"/>
           <rect x="${cx - 160}" y="${cy + 70}" width="20" height="34" fill="#5C4A38"/>
           <rect x="${cx + 140}" y="${cy + 70}" width="20" height="34" fill="#5C4A38"/>`,
    chair: `<rect x="${cx - 60}" y="${cy - 110}" width="120" height="130" rx="16" fill="${dark}"/>
            <rect x="${cx - 75}" y="${cy + 20}" width="150" height="26" rx="10" fill="#8A7358"/>
            <line x1="${cx}" y1="${cy + 46}" x2="${cx}" y2="${cy + 110}" stroke="#5C4A38" stroke-width="12"/>
            <ellipse cx="${cx}" cy="${cy + 120}" rx="70" ry="12" fill="#5C4A38"/>`,
    lamp: `<path d="M${cx - 70} ${cy + 10} L${cx - 40} ${cy - 70} L${cx + 40} ${cy - 70} L${cx + 70} ${cy + 10} Z" fill="${dark}"/>
           <line x1="${cx}" y1="${cy + 10}" x2="${cx}" y2="${cy + 110}" stroke="#5C4A38" stroke-width="8"/>
           <ellipse cx="${cx}" cy="${cy + 116}" rx="52" ry="12" fill="#5C4A38"/>
           <circle cx="${cx}" cy="${cy + 30}" r="26" fill="#FFCF8A" opacity=".7"/>`,
    pot: `<path d="M${cx - 60} ${cy + 20} L${cx - 44} ${cy + 110} L${cx + 44} ${cy + 110} L${cx + 60} ${cy + 20} Z" fill="#A8663C"/>
          <ellipse cx="${cx}" cy="${cy + 20}" rx="60" ry="14" fill="#8A5230"/>
          <path d="M${cx} ${cy + 20} C${cx - 70} ${cy - 40} ${cx - 40} ${cy - 120} ${cx} ${cy - 100}" stroke="#3E7350" stroke-width="10" fill="none"/>
          <path d="M${cx} ${cy + 20} C${cx + 70} ${cy - 30} ${cx + 40} ${cy - 110} ${cx} ${cy - 90}" stroke="#4C8A60" stroke-width="10" fill="none"/>`,
    clock: `<circle cx="${cx}" cy="${cy}" r="110" fill="${dark}"/>
            <circle cx="${cx}" cy="${cy}" r="92" fill="${bg}"/>
            <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 60}" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>
            <line x1="${cx}" y1="${cy}" x2="${cx + 44}" y2="${cy + 20}" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>`,
    shelf: `<rect x="${cx - 130}" y="${cy - 90}" width="260" height="14" fill="${dark}"/>
            <rect x="${cx - 130}" y="${cy - 10}" width="260" height="14" fill="${dark}"/>
            <rect x="${cx - 130}" y="${cy + 70}" width="260" height="14" fill="${dark}"/>
            <rect x="${cx - 100}" y="${cy - 60}" width="26" height="50" fill="#8A5230"/>
            <rect x="${cx - 64}" y="${cy - 52}" width="22" height="42" fill="#3E7350"/>
            <rect x="${cx + 40}" y="${cy + 20}" width="30" height="50" fill="#6B4226"/>`,
    box: `<path d="M${cx - 110} ${cy - 30} L${cx} ${cy - 80} L${cx + 110} ${cy - 30} L${cx + 110} ${cy + 70} L${cx} ${cy + 120} L${cx - 110} ${cy + 70} Z" fill="${dark}"/>
          <path d="M${cx - 110} ${cy - 30} L${cx} ${cy + 20} L${cx + 110} ${cy - 30}" fill="none" stroke="${bg}" stroke-width="4"/>
          <line x1="${cx}" y1="${cy + 20}" x2="${cx}" y2="${cy + 120}" stroke="${bg}" stroke-width="4"/>`,
    bed: `<rect x="${cx - 150}" y="${cy - 20}" width="300" height="80" rx="10" fill="#8A7358"/>
          <rect x="${cx - 150}" y="${cy - 70}" width="300" height="54" rx="10" fill="${dark}"/>
          <rect x="${cx - 120}" y="${cy - 56}" width="90" height="34" rx="8" fill="${bg}"/>
          <rect x="${cx + 30}" y="${cy - 56}" width="90" height="34" rx="8" fill="${bg}"/>`,
    tools: `<rect x="${cx - 120}" y="${cy - 50}" width="240" height="130" rx="12" fill="${dark}"/>
            <rect x="${cx - 40}" y="${cy - 76}" width="80" height="30" rx="10" fill="#5C4A38"/>
            <line x1="${cx - 80}" y1="${cy - 10}" x2="${cx - 40}" y2="${cy + 50}" stroke="${bg}" stroke-width="10" stroke-linecap="round"/>
            <circle cx="${cx + 30}" cy="${cy + 20}" r="26" fill="none" stroke="${bg}" stroke-width="10"/>`,
    rug: `<ellipse cx="${cx}" cy="${cy + 20}" rx="160" ry="90" fill="${dark}"/>
          <ellipse cx="${cx}" cy="${cy + 20}" rx="120" ry="64" fill="#8A7358"/>
          <ellipse cx="${cx}" cy="${cy + 20}" rx="70" ry="36" fill="#A8663C"/>`,
    cookware: `<ellipse cx="${cx}" cy="${cy + 30}" rx="100" ry="26" fill="#8C97A3"/>
               <path d="M${cx - 100} ${cy + 30} L${cx - 84} ${cy - 40} L${cx + 84} ${cy - 40} L${cx + 100} ${cy + 30} Z" fill="#A8B4C0"/>
               <ellipse cx="${cx}" cy="${cy - 40}" rx="84" ry="20" fill="#C4CDD6"/>
               <rect x="${cx - 130}" y="${cy - 20}" width="34" height="12" rx="6" fill="#5A6572"/>
               <rect x="${cx + 96}" y="${cy - 20}" width="34" height="12" rx="6" fill="#5A6572"/>`,
    desk: `<rect x="${cx - 150}" y="${cy - 10}" width="300" height="18" fill="${dark}"/>
           <rect x="${cx - 140}" y="${cy + 8}" width="16" height="100" fill="#5C4A38"/>
           <rect x="${cx + 124}" y="${cy + 8}" width="16" height="100" fill="#5C4A38"/>
           <rect x="${cx - 60}" y="${cy - 90}" width="120" height="76" rx="6" fill="#37424E"/>
           <rect x="${cx - 52}" y="${cy - 82}" width="104" height="60" fill="#8FA6BC"/>`,
  }

  s += shapes[kind] ?? shapes.box
  return wrap(w, h, s)
}

// ═══════════════════════════════════════════════════════════

const PROS = [
  ['studio-lotus', 'architecture', 'night', 3],
  ['morph-design', 'interior', 'dusk', 7],
  ['greenspace', 'architecture', 'moss', 11],
  ['structura-plus', 'architecture', 'slate', 17],
  ['design-matrix', 'architecture', 'night', 23],
  ['the-design-co', 'interior', 'clay', 29],
  ['urban-space', 'architecture', 'dusk', 31],
  ['light-craft', 'interior', 'amber', 37],
  ['spacematrix', 'architecture', 'slate', 41],
  ['design-workshop', 'interior', 'dusk', 43],
  ['arc-beyond', 'architecture', 'moss', 47],
  ['plancraft', 'architecture', 'night', 53],
]

for (const [name, kind, pal, seed] of PROS) {
  const svg = kind === 'interior' ? interior(pal, seed) : architecture(name, pal, seed)
  fs.writeFileSync(path.join(OUT, 'pro', `${name}.svg`), svg)
}

const PROFESSIONS = [
  ['architects', 'architecture', 'night', 5],
  ['interior-designers', 'interior', 'clay', 9],
  ['landscape-designers', 'architecture', 'moss', 13],
  ['structural-engineers', 'architecture', 'slate', 19],
  ['mep-consultants', 'architecture', 'mist', 25],
  ['lighting-designers', 'interior', 'amber', 33],
  ['urban-planners', 'architecture', 'dusk', 39],
]

for (const [name, kind, pal, seed] of PROFESSIONS) {
  const svg = kind === 'interior' ? interior(pal, seed, 400, 300) : architecture(name, pal, seed, 400, 300)
  fs.writeFileSync(path.join(OUT, 'pro', `cat-${name}.svg`), svg)
}

const PRODUCTS = [
  ['sofa', 'sofa'], ['office-chair', 'chair'], ['pendant-light', 'lamp'],
  ['cookware', 'cookware'], ['indoor-plant', 'pot'], ['area-rug', 'rug'],
  ['wall-clock', 'clock'], ['wall-shelf', 'shelf'], ['bedsheet', 'bed'],
  ['study-table', 'desk'], ['storage-box', 'box'], ['tool-kit', 'tools'],
  ['table-lamp', 'lamp'],
]

for (const [name, kind] of PRODUCTS) {
  fs.writeFileSync(path.join(OUT, 'product', `${name}.svg`), product(kind))
}

// hero — the professionals banner
fs.writeFileSync(
  path.join(OUT, 'hero-professionals.svg'),
  architecture('hero', 'night', 61, 900, 460)
)
fs.writeFileSync(
  path.join(OUT, 'hero-merchandise.svg'),
  interior('sand', 67, 900, 420)
)
fs.writeFileSync(
  path.join(OUT, 'ad-building-materials.svg'),
  architecture('ad', 'clay', 71, 600, 340)
)
fs.writeFileSync(
  path.join(OUT, 'consultation.svg'),
  interior('mist', 73, 600, 300)
)

console.log('✓ placeholder illustrations created:')
console.log(`  ${PROS.length} professionals · ${PROFESSIONS.length} categories · ${PRODUCTS.length} products · 4 banners`)
console.log('\n  When the real images arrive, drop a file of the same name into public/img/.')
