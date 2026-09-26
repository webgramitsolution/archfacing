'use server'

import { prisma } from '@/lib/prisma'
import { seatMapForPincode } from '@/lib/pact'

export type FinderState = {
  ok: boolean
  error?: string
  map?: Awaited<ReturnType<typeof seatMapForPincode>>
}

/**
 * Public PACT lookup — works without login.
 *
 * No permission check here, because it only reports which seats are
 * vacant. No holder's name or contact details are shown.
 */
export async function findPactAction(
  _prev: FinderState | null,
  formData: FormData
): Promise<FinderState> {
  const pincode = String(formData.get('pincode') ?? '').trim()

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { ok: false, error: 'PIN code must be 6 digits.' }
  }

  const map = await seatMapForPincode(pincode)
  if (!map) {
    return { ok: false, error: `PIN ${pincode} is not in our records.` }
  }

  return { ok: true, map }
}

/** Districts (cities/towns) that have PACT areas in a state, for the picker. */
export async function districtsForState(state: string): Promise<string[]> {
  if (!state) return []
  const rows = await prisma.pincode.findMany({
    where: { state },
    distinct: ['district'],
    select: { district: true },
    orderBy: { district: 'asc' },
  })
  return rows.map((r) => r.district)
}

/** The PACT areas (PIN codes) inside one district, for the picker. */
export async function pincodesForDistrict(
  state: string,
  district: string
): Promise<{ code: string; locality: string }[]> {
  if (!state || !district) return []
  const rows = await prisma.pincode.findMany({
    where: { state, district },
    select: { code: true, localities: true },
    orderBy: { code: 'asc' },
    take: 300,
  })
  return rows.map((r) => ({ code: r.code, locality: r.localities[0] ?? '' }))
}

/**
 * "Use my location" — the browser gives us coordinates, we return the closest
 * PACT area. Uses the PIN master's lat/lng (from GeoNames); if those are not
 * loaded, the caller falls back to a manual PIN entry.
 */
export async function nearestPincode(
  lat: number,
  lng: number
): Promise<{ code: string; district: string; state: string } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  // A ~0.9° box around the point keeps the scan small; widen once if empty.
  for (const span of [0.9, 2.2]) {
    const rows = await prisma.pincode.findMany({
      where: {
        lat: { gte: lat - span, lte: lat + span },
        lng: { gte: lng - span, lte: lng + span },
      },
      select: { code: true, district: true, state: true, lat: true, lng: true },
      take: 4000,
    })
    if (rows.length === 0) continue

    let best: (typeof rows)[number] | null = null
    let bestD = Infinity
    for (const r of rows) {
      if (r.lat == null || r.lng == null) continue
      const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2
      if (d < bestD) {
        bestD = d
        best = r
      }
    }
    if (best) return { code: best.code, district: best.district, state: best.state }
  }
  return null
}
