import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { ExploreRow } from '@/components/mobile/pages/pact-phone-client'
import type { PactPhoneProps, PactMapPin } from '@/components/mobile/pages/pact-phone'

/**
 * The extra, counted figures the PACT page's PHONE layout prints on top of
 * what the desktop body already loads. Nothing here is typed in.
 */

const PRO_ROLES = ['PROFESSIONAL', 'CONSULTANT', 'BMF'] as const

/** India Post's PIN zones — the first digit of every PIN code. */
const ZONES: Record<string, string> = {
  '1': 'Northern — Delhi, Haryana, Punjab, HP, J&K',
  '2': 'Northern — Uttar Pradesh, Uttarakhand',
  '3': 'Western — Rajasthan, Gujarat',
  '4': 'Western — Maharashtra, MP, Chhattisgarh',
  '5': 'Southern — Andhra Pradesh, Telangana, Karnataka',
  '6': 'Southern — Kerala, Tamil Nadu',
  '7': 'Eastern — West Bengal, Odisha, North East',
  '8': 'Eastern — Bihar, Jharkhand',
  '9': 'Army Postal Service',
}

const inK = (n: number) => n.toLocaleString('en-IN')

export async function pactPhoneData(input: {
  q?: string
  states: { state: string; _count: number }[]
  cityByState: Record<string, number>
  nearbyCodes: string[]
  anchor: string | null
  stats: { icon: IconName; value: string; label: string }[]
  seatsLine: string
}): Promise<PactPhoneProps> {
  const q = input.q?.trim().slice(0, 60) || null

  const [qResults, mapRows, zoneRows, topLeadPins, topProPins, recent] = await Promise.all([
    q
      ? prisma.pincode.findMany({
          where: {
            OR: [
              { code: { startsWith: q } },
              { district: { contains: q, mode: 'insensitive' } },
              { state: { contains: q, mode: 'insensitive' } },
              { localities: { has: q } },
            ],
          },
          select: { code: true, district: true, state: true },
          orderBy: { code: 'asc' },
          take: 8,
        })
      : Promise.resolve([]),
    prisma.pincode.findMany({
      where: { code: { in: input.nearbyCodes } },
      select: { code: true, district: true, state: true, lat: true, lng: true },
    }),
    prisma.$queryRaw<{ z: string; n: number }[]>`
      SELECT substring(code, 1, 1) AS z, count(*)::int AS n
      FROM "Pincode" GROUP BY 1 ORDER BY 1`.catch(() => [] as { z: string; n: number }[]),
    prisma.enquiry.groupBy({
      by: ['pincode'],
      _count: { pincode: true },
      orderBy: { _count: { pincode: 'desc' } },
      take: 5,
    }),
    prisma.user.groupBy({
      by: ['pincode'],
      where: { role: { in: [...PRO_ROLES] }, deletedAt: null, pincode: { not: null } },
      _count: { pincode: true },
      orderBy: { _count: { pincode: 'desc' } },
      take: 7,
    }),
    prisma.pact.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ purchasedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: { pincode: true, city: true, state: true, purchasedAt: true, createdAt: true },
      take: 30,
    }),
  ])

  // ── the map: the visitor's anchor area and its nearest PACT areas ──
  const pins: PactMapPin[] = mapRows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({ code: r.code, place: r.district, lat: r.lat!, lng: r.lng! }))
  const focusRow = mapRows.find((r) => r.code === input.anchor)
  const mapFocus =
    focusRow && focusRow.lat != null && focusRow.lng != null
      ? { code: focusRow.code, place: `${focusRow.district}, ${focusRow.state}`, lat: focusRow.lat, lng: focusRow.lng }
      : pins[0] ?? null

  // ── top PACT areas by leads received, with their professionals ──
  const leadCodes = topLeadPins.map((l) => l.pincode)
  const proCodes = topProPins.map((t) => t.pincode!).filter(Boolean)
  const recentCodes: typeof recent = []
  for (const r of recent) if (!recentCodes.some((x) => x.pincode === r.pincode)) recentCodes.push(r)
  const recentTop = recentCodes.slice(0, 7)

  const allCodes = [...new Set([...leadCodes, ...proCodes])]
  const [meta, prosForLeads, leadsForPros] = await Promise.all([
    prisma.pincode.findMany({ where: { code: { in: allCodes } }, select: { code: true, district: true, state: true } }),
    prisma.user.groupBy({
      by: ['pincode'],
      where: { role: { in: [...PRO_ROLES] }, deletedAt: null, pincode: { in: leadCodes } },
      _count: { pincode: true },
    }),
    prisma.enquiry.groupBy({ by: ['pincode'], where: { pincode: { in: proCodes } }, _count: { pincode: true } }),
  ])
  const place = new Map(meta.map((m) => [m.code, `${m.district}, ${m.state}`]))
  const pros = new Map<string, number>()
  for (const r of [...topProPins, ...prosForLeads]) if (r.pincode) pros.set(r.pincode, r._count.pincode)
  const leads = new Map<string, number>()
  for (const r of [...topLeadPins, ...leadsForPros]) leads.set(r.pincode, r._count.pincode)

  const topAreas = topLeadPins.map((l) => ({
    code: l.pincode,
    place: place.get(l.pincode) ?? '',
    professionals: pros.get(l.pincode) ?? 0,
    leads: l._count.pincode,
  }))

  // ── Explore tabs ──
  const byState: ExploreRow[] = input.states.map((s) => ({
    key: s.state,
    title: s.state,
    line1: `${inK(s._count)} PACT Areas`,
    line2: `${inK(input.cityByState[s.state] ?? 0)} Cities`,
    href: `/designers-associates?state=${encodeURIComponent(s.state)}`,
    glyph: s.state,
  }))
  const byRegion: ExploreRow[] = zoneRows
    .filter((z) => ZONES[z.z])
    .map((z) => ({
      key: z.z,
      title: `Zone ${z.z} · ${ZONES[z.z].split(' — ')[0]}`,
      line1: `${inK(Number(z.n))} PACT Areas`,
      line2: ZONES[z.z].split(' — ')[1],
      href: `/pact?q=${z.z}`,
      glyph: `zone${z.z}`,
    }))
  const topByPros: ExploreRow[] = topProPins
    .filter((t) => t.pincode)
    .map((t) => ({
      key: t.pincode!,
      title: `${t.pincode}${place.get(t.pincode!) ? ` - ${place.get(t.pincode!)}` : ''}`,
      line1: `${inK(t._count.pincode)} Professionals`,
      line2: `${inK(leads.get(t.pincode!) ?? 0)} Leads`,
      href: `/pact?q=${t.pincode}#find-pact-phone`,
      glyph: t.pincode!,
    }))
  const recentRows: ExploreRow[] = recentTop.map((r) => ({
    key: r.pincode,
    title: `${r.pincode}${r.city ? ` - ${r.city}` : ''}`,
    line1: r.state,
    line2: `Added ${(r.purchasedAt ?? r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    href: `/designers-associates?pin=${r.pincode}`,
    glyph: r.state,
  }))

  return {
    q,
    qResults,
    stats: input.stats,
    mapFocus,
    mapPins: pins,
    exploreTabs: [
      { label: 'By State', rows: byState, more: { title: 'More States', sub: 'View all states', href: '/designers-associates' } },
      { label: 'By Region', rows: byRegion },
      { label: 'Top PACT Areas', rows: topByPros },
      { label: 'Recently Added', rows: recentRows },
    ],
    topAreas,
    seatsLine: input.seatsLine,
  }
}
