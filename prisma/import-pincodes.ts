/**
 * Loads India's PIN codes into the DB — the foundation of the PACT engine.
 *
 *   pnpm db:pincodes
 *
 * Source: GeoNames (https://download.geonames.org/export/zip/IN.zip)
 * Download `.data/geonames/IN.txt` once, then run this script.
 *
 * In GeoNames every locality has its own row (150,000 rows, 19,000
 * pincodes). We group them by pincode and build a single row.
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SOURCE = path.join(process.cwd(), '.data', 'geonames', 'IN.txt')

/**
 * GeoNames' state names differ slightly from our own list.
 * Reconciling them is essential, otherwise the state chosen during
 * registration will not match the pincode's state.
 */
const STATE_FIXES: Record<string, string> = {
  'Andaman & Nicobar Islands': 'Andaman and Nicobar Islands',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  Pondicherry: 'Puducherry',
  'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
}

/**
 * Ladakh became a separate UT in 2019, but GeoNames still counts it
 * under Jammu & Kashmir. We move these districts into Ladakh.
 */
const LADAKH_DISTRICTS = new Set(['Leh', 'Kargil', 'Leh (Ladakh)'])

function fixState(state: string, district: string): string {
  if (LADAKH_DISTRICTS.has(district)) return 'Ladakh'
  return STATE_FIXES[state] ?? state
}

type Row = {
  code: string
  district: string
  state: string
  localities: Set<string>
  latSum: number
  lngSum: number
  points: number
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`\n❌ ${SOURCE} not found.\n`)
    console.error('   Download this first:')
    console.error('   https://download.geonames.org/export/zip/IN.zip')
    console.error('   and extract it into .data/geonames/.\n')
    process.exit(1)
  }

  console.log('═'.repeat(58))
  console.log('  PIN code master data')
  console.log('═'.repeat(58))
  console.log('\n📖 Reading the GeoNames file…')

  const byCode = new Map<string, Row>()
  const rl = readline.createInterface({
    input: fs.createReadStream(SOURCE, 'utf8'),
    crlfDelay: Infinity,
  })

  let lineCount = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    lineCount++

    // country, postal, place, admin1(state), a1code, admin2(district), …, lat, lng, accuracy
    const f = line.split('\t')
    const code = f[1]?.trim()
    const place = f[2]?.trim()
    const state = f[3]?.trim()
    const district = f[5]?.trim()
    const lat = Number.parseFloat(f[9])
    const lng = Number.parseFloat(f[10])

    // Only genuine 6-digit Indian PINs
    if (!/^[1-9]\d{5}$/.test(code)) continue

    let row = byCode.get(code)
    if (!row) {
      row = {
        code,
        district: district || '—',
        state: fixState(state, district),
        localities: new Set(),
        latSum: 0,
        lngSum: 0,
        points: 0,
      }
      byCode.set(code, row)
    }

    if (place) row.localities.add(place)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      row.latSum += lat
      row.lngSum += lng
      row.points++
    }
  }

  console.log(`   ✓ ${lineCount.toLocaleString('en-IN')} rows read`)
  console.log(`   ✓ ${byCode.size.toLocaleString('en-IN')} unique PIN codes found`)

  console.log('\n💾 Inserting into the database…')

  const all = [...byCode.values()].map((r) => ({
    code: r.code,
    district: r.district,
    state: r.state,
    // 8 main localities per PIN are enough — these are what show up in search
    localities: [...r.localities].slice(0, 8),
    lat: r.points ? Number((r.latSum / r.points).toFixed(5)) : null,
    lng: r.points ? Number((r.lngSum / r.points).toFixed(5)) : null,
  }))

  // A clean start on a re-run — this is master data, not user data
  await prisma.pincode.deleteMany()

  const BATCH = 2000
  for (let i = 0; i < all.length; i += BATCH) {
    await prisma.pincode.createMany({
      data: all.slice(i, i + BATCH),
      skipDuplicates: true,
    })
    process.stdout.write(
      `\r   ${Math.min(i + BATCH, all.length).toLocaleString('en-IN')} / ${all.length.toLocaleString('en-IN')}`
    )
  }
  console.log()

  // ─── Verification ───
  const total = await prisma.pincode.count()
  const states = await prisma.pincode.groupBy({
    by: ['state'],
    _count: true,
    orderBy: { _count: { state: 'desc' } },
  })

  console.log(`\n   ✓ ${total.toLocaleString('en-IN')} PIN codes in the DB`)
  console.log(`   ✓ ${states.length} states\n`)

  console.log('   Top 5 states by PIN count:')
  for (const s of states.slice(0, 5)) {
    console.log(`     ${s.state.padEnd(20)} ${String(s._count).padStart(5)}`)
  }

  // Let us check a few well-known PINs
  console.log('\n   Sample check:')
  for (const code of ['110005', '400001', '560001', '700001', '194101']) {
    const p = await prisma.pincode.findUnique({ where: { code } })
    console.log(
      `     ${code}  ${p ? `${p.district}, ${p.state}` : '❌ not found'}`
    )
  }

  console.log('\n' + '─'.repeat(58) + '\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Import fail:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
