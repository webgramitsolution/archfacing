/**
 * Returns the nearest PIN code.
 *
 *   GET /api/pincode/nearest?lat=28.64&lng=77.21
 *
 * "Use My Location" calls this. It only reads and stores no personal
 * information — the coordinates never reach the database.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Both lat and lng are required' }, { status: 400 })
  }

  // Reject anything outside India
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
    return NextResponse.json({ error: 'This location does not appear to be in India' }, { status: 404 })
  }

  // First filter roughly (a box of about 55 km), then measure the real distance
  const box = 0.5
  const near = await prisma.pincode.findMany({
    where: {
      lat: { gte: lat - box, lte: lat + box },
      lng: { gte: lng - box, lte: lng + box },
    },
    select: { code: true, district: true, state: true, lat: true, lng: true },
    take: 400,
  })

  if (!near.length) {
    return NextResponse.json({ error: 'No PIN code was found nearby' }, { status: 404 })
  }

  let best = near[0]
  let bestD = Infinity
  for (const p of near) {
    if (p.lat == null || p.lng == null) continue
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }

  return NextResponse.json({
    code: best.code,
    district: best.district,
    state: best.state,
  })
}
