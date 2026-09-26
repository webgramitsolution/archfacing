/**
 * Lead routing — the heart of Consult Nearby (§4.1.2, §5.2.12).
 *
 * This is where the entire value of a PACT is proven: a PACT holder pays
 * precisely so that enquiries from their territory come straight to them.
 *
 * The path:
 *   1. Look for an ACTIVE holder in the same PIN code
 *   2. If none, look at nearby PIN codes (up to 50 km)
 *   3. If still none, put it in the admin/RM queue (UNROUTED)
 *
 * ⚠️ Leads are never sent to a SUSPENDED holder (§3.1.8.5) — a suspended PACT
 *    means exactly that the holder is not servicing clients.
 */

import type { LeadSourceType, PactServiceType, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { normalizeSubCategory } from '@/config/permissions'

/** Distance between two points in km — haversine formula */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const NEARBY_RADIUS_KM = 50

/**
 * A seat past its expiry date must not receive leads even if the nightly cron
 * has not yet flipped it to EXPIRED — the buyer's phone number is at stake.
 */
function notExpired(): Prisma.PactWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
}

export type RoutingResult =
  | {
      routed: true
      /** Whether the holder was found in the same PIN code or a nearby one */
      via: 'exact' | 'nearby'
      pactId: string
      holderId: string
      holderName: string
      /** For nearby matches — which PIN code the holder came from */
      fromPincode?: string
      distanceKm?: number
    }
  | { routed: false; reason: 'NO_HOLDER' | 'BAD_PINCODE' }

/**
 * Decides who should receive the lead for this PIN code + service.
 * It changes nothing — it only reports. So it can also be used on the form to
 * show the user who will respond to their enquiry.
 */
export async function findRecipient(
  pincode: string,
  serviceType: PactServiceType,
  subCategory?: string | null
): Promise<RoutingResult> {
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { routed: false, reason: 'BAD_PINCODE' }
  }

  let sub: string
  try {
    sub = normalizeSubCategory(serviceType, subCategory)
  } catch {
    return { routed: false, reason: 'BAD_PINCODE' }
  }

  // ─── 1. In the same PIN code ───
  const exact = await prisma.pact.findFirst({
    where: { pincode, serviceType, subCategory: sub, status: 'ACTIVE', ...notExpired() },
    include: { holder: { select: { id: true, name: true, status: true } } },
  })

  if (exact?.holder && exact.holder.status === 'ACTIVE') {
    return {
      routed: true,
      via: 'exact',
      pactId: exact.id,
      holderId: exact.holder.id,
      holderName: exact.holder.name,
    }
  }

  // ─── 2. Nearby PIN codes ───
  const place = await prisma.pincode.findUnique({ where: { code: pincode } })
  if (!place?.lat || !place?.lng) return { routed: false, reason: 'NO_HOLDER' }

  // 50 km ≈ 0.45° of latitude. We first filter roughly by a bounding box to
  // keep the DB's work light, then measure the true distance on what remains.
  const box = 0.5
  const candidates = await prisma.pact.findMany({
    where: {
      serviceType,
      subCategory: sub,
      status: 'ACTIVE',
      ...notExpired(),
      pincode: { not: pincode },
      holder: { status: 'ACTIVE' },
    },
    include: { holder: { select: { id: true, name: true } } },
    take: 500,
  })

  if (!candidates.length) return { routed: false, reason: 'NO_HOLDER' }

  const nearbyPlaces = await prisma.pincode.findMany({
    where: {
      code: { in: candidates.map((c) => c.pincode) },
      lat: { gte: place.lat - box, lte: place.lat + box },
      lng: { gte: place.lng - box, lte: place.lng + box },
    },
    select: { code: true, lat: true, lng: true },
  })

  let best: { pact: (typeof candidates)[number]; km: number } | null = null

  for (const np of nearbyPlaces) {
    if (np.lat == null || np.lng == null) continue
    const km = distanceKm(place.lat, place.lng, np.lat, np.lng)
    if (km > NEARBY_RADIUS_KM) continue

    const pact = candidates.find((c) => c.pincode === np.code)
    if (!pact?.holder) continue

    if (!best || km < best.km) best = { pact, km }
  }

  if (!best) return { routed: false, reason: 'NO_HOLDER' }

  return {
    routed: true,
    via: 'nearby',
    pactId: best.pact.id,
    holderId: best.pact.holder!.id,
    holderName: best.pact.holder!.name,
    fromPincode: best.pact.pincode,
    distanceKm: Math.round(best.km),
  }
}

/**
 * Every ACTIVE PACT holder for this exact PIN + service + sub-category (§4,§6).
 * Unlike findRecipient (which picks the single nearest), this returns ALL
 * eligible seats — the marketplace routes the same enquiry to every matching
 * PACT holder, not just one. Ordered oldest-seat-first for a stable fan-out.
 */
export async function findAllPactHolders(
  pincode: string,
  serviceType: PactServiceType,
  subCategory?: string | null
): Promise<{ pactId: string; holderId: string; holderName: string }[]> {
  if (!/^[1-9]\d{5}$/.test(pincode)) return []
  let sub: string
  try {
    sub = normalizeSubCategory(serviceType, subCategory)
  } catch {
    return []
  }

  // §19 PACT validation — seat ACTIVE, holder account ACTIVE, exact match
  const seats = await prisma.pact.findMany({
    where: { pincode, serviceType, subCategory: sub, status: 'ACTIVE', ...notExpired(), holder: { status: 'ACTIVE' } },
    select: { id: true, holderId: true, holder: { select: { id: true, name: true } } },
    orderBy: { purchasedAt: 'asc' },
    take: 200,
  })

  return seats
    .filter((s): s is typeof s & { holderId: string } => Boolean(s.holderId && s.holder))
    .map((s) => ({ pactId: s.id, holderId: s.holderId, holderName: s.holder!.name }))
}

// ═══════════════════════════════════════════════════════════
//  Creating an enquiry — dual distribution (Direct + PACT)
// ═══════════════════════════════════════════════════════════

export type CreateEnquiryInput = {
  clientId: string
  pincode: string
  serviceType: PactServiceType
  subCategory?: string | null
  subject: string
  message: string
  budget?: number | null
  contactName: string
  contactPhone: string
  contactEmail?: string | null
  // ─── marketplace source (§2) ───
  sourceType?: LeadSourceType
  sourceId?: string | null
  sourceUrl?: string | null
  category?: string | null
  city?: string | null
  state?: string | null
  /// The product/profile owner — the DIRECT recipient (§3). Receives the lead
  /// regardless of whether they hold a PACT, and never blocks PACT routing.
  directRecipientId?: string | null
}

/**
 * Creates the enquiry and fans it out (§3–§7):
 *   1. DIRECT lead → the source owner (if any), even without a PACT
 *   2. PACT leads  → every ACTIVE PACT holder for the same category + pincode
 * Both happen for the same enquiry — the direct lead never replaces PACT.
 * Recipients live in LeadRecipient rows (idempotent via the unique index).
 * An enquiry with no recipient at all is UNROUTED, never lost (§16).
 */
export async function createEnquiry(input: CreateEnquiryInput) {
  const pactHolders = await findAllPactHolders(input.pincode, input.serviceType, input.subCategory)
  const directId = input.directRecipientId || null

  // The direct recipient is not also listed as a PACT recipient (they own it).
  const pactRecipients = pactHolders.filter((h) => h.holderId !== directId)

  const hasRecipient = Boolean(directId) || pactRecipients.length > 0
  const firstPact = pactRecipients[0]

  const enquiry = await prisma.$transaction(async (tx) => {
    const e = await tx.enquiry.create({
      data: {
        clientId: input.clientId,
        pincode: input.pincode,
        serviceType: input.serviceType,
        subCategory: input.subCategory || null,
        sourceType: input.sourceType ?? 'CONSULT_NEARBY',
        sourceId: input.sourceId || null,
        sourceUrl: input.sourceUrl || null,
        category: input.category || null,
        city: input.city || null,
        state: input.state || null,
        directRecipientId: directId,
        subject: input.subject,
        message: input.message,
        budget: input.budget ?? null,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail || null,
        // holderId/pactId kept for backward-compat dashboards: the direct owner
        // if there is one, otherwise the first matched PACT holder.
        holderId: directId ?? firstPact?.holderId ?? null,
        pactId: firstPact?.pactId ?? null,
        status: hasRecipient ? 'NEW' : 'UNROUTED',
      },
    })

    const now = new Date()
    const rows: Prisma.LeadRecipientCreateManyInput[] = []
    if (directId) {
      rows.push({
        enquiryId: e.id, recipientId: directId, type: 'DIRECT',
        routingReason: 'Product / profile owner', category: input.category ?? null,
        pincode: input.pincode, deliveryStatus: 'SENT', sentAt: now,
      })
    }
    for (const h of pactRecipients) {
      rows.push({
        enquiryId: e.id, recipientId: h.holderId, type: 'PACT', pactId: h.pactId,
        routingReason: 'Same Category + Pincode', category: input.category ?? null,
        pincode: input.pincode, deliveryStatus: 'SENT', sentAt: now,
      })
    }
    if (rows.length) await tx.leadRecipient.createMany({ data: rows, skipDuplicates: true })

    // audit trail (§21)
    await tx.auditLog.create({
      data: { actorId: input.clientId, action: 'ENQUIRY_CREATED', entityType: 'Enquiry', entityId: e.id, after: { direct: directId, pact: pactRecipients.map((h) => h.holderId), sourceType: e.sourceType } },
    })
    return e
  })

  // notifications — outside the transaction (§7 fan-out)
  const notify: Prisma.NotificationCreateManyInput[] = []
  if (directId) {
    notify.push({ userId: directId, type: 'NEW_ENQUIRY', title: 'New enquiry on your listing', body: `PIN ${input.pincode} — ${input.subject}`, link: '/dashboard' })
  }
  for (const h of pactRecipients) {
    notify.push({ userId: h.holderId, type: 'NEW_ENQUIRY', title: 'New PACT enquiry in your territory', body: `PIN ${input.pincode} — ${input.subject}`, link: '/dashboard' })
  }
  if (notify.length) await prisma.notification.createMany({ data: notify })

  return { enquiry, directId, pactRecipients }
}

// ═══════════════════════════════════════════════════════════
//  Responding to an enquiry
// ═══════════════════════════════════════════════════════════

/**
 * Anyone the lead was delivered to may answer it — the direct owner and every
 * PACT holder it was routed to (dual distribution) — plus the buyer.
 *
 * Each professional's progress lives on their own LeadRecipient row, so one
 * holder answering never changes what another holder sees. The enquiry's own
 * status only records "someone has answered the buyer".
 */
export async function respondToEnquiry(params: {
  enquiryId: string
  senderId: string
  message: string
  attachments?: string[]
}) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: params.enquiryId },
    select: { id: true, holderId: true, directRecipientId: true, clientId: true, pactId: true, status: true, subject: true },
  })
  if (!enquiry) throw new Error('Enquiry not found.')

  const rec = await prisma.leadRecipient.findUnique({
    where: { enquiryId_recipientId: { enquiryId: enquiry.id, recipientId: params.senderId } },
    select: { id: true, pactId: true, deliveryStatus: true },
  })
  const isClient = enquiry.clientId === params.senderId
  const isOwner = enquiry.holderId === params.senderId || enquiry.directRecipientId === params.senderId
  const isPro = isOwner || !!rec
  if (!isPro && !isClient) throw new Error('FORBIDDEN')

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.enquiryResponse.create({
      data: {
        enquiryId: enquiry.id,
        senderId: params.senderId,
        message: params.message,
        attachments: params.attachments ?? [],
      },
    })

    if (isPro) {
      if (enquiry.status !== 'CLOSED' && enquiry.status !== 'CONVERTED') {
        await tx.enquiry.update({
          where: { id: enquiry.id },
          data: { status: 'RESPONDED', respondedAt: enquiry.status === 'NEW' || enquiry.status === 'UNROUTED' ? now : undefined },
        })
      }
      if (rec && rec.deliveryStatus !== 'CONVERTED' && rec.deliveryStatus !== 'CLOSED') {
        await tx.leadRecipient.update({ where: { id: rec.id }, data: { deliveryStatus: 'RESPONDED', respondedAt: now } })
      }
      // §3.1.8.5 — the holder responded, so restart the cessation clock
      const pactId = rec?.pactId ?? (enquiry.holderId === params.senderId ? enquiry.pactId : null)
      if (pactId) await tx.pact.update({ where: { id: pactId }, data: { lastResponseAt: now } })

      if (enquiry.clientId) {
        await tx.notification.create({
          data: { userId: enquiry.clientId, type: 'ENQUIRY_REPLY', title: 'You have a reply to your enquiry', body: params.message.slice(0, 120), link: '/dashboard' },
        })
      }
    } else {
      // The buyer wrote back: tell the owner and every professional already in conversation.
      const engaged = await tx.leadRecipient.findMany({
        where: { enquiryId: enquiry.id, deliveryStatus: { in: ['RESPONDED', 'CONVERTED'] } },
        select: { recipientId: true },
      })
      const ids = [...new Set([enquiry.holderId, ...engaged.map((e) => e.recipientId)].filter((x): x is string => !!x))]
      if (ids.length) {
        await tx.notification.createMany({
          data: ids.map((userId) => ({ userId, type: 'ENQUIRY_REPLY', title: 'The client has replied', body: params.message.slice(0, 120), link: '/dashboard' })),
        })
      }
    }
  })
}

/** An RM Employee manually assigns an UNROUTED enquiry to someone */
export async function assignEnquiry(params: {
  enquiryId: string
  holderId: string
  employeeId: string
}) {
  const holder = await prisma.user.findUnique({
    where: { id: params.holderId },
    select: { id: true, name: true, status: true },
  })
  if (!holder || holder.status !== 'ACTIVE') {
    throw new Error('This registrant is not currently active and cannot be assigned an enquiry.')
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: params.enquiryId },
    data: {
      holderId: params.holderId,
      employeeId: params.employeeId,
      status: 'ASSIGNED',
    },
  })

  await prisma.notification.create({
    data: {
      userId: params.holderId,
      type: 'NEW_ENQUIRY',
      title: 'An enquiry has been assigned to you',
      body: `PIN ${enquiry.pincode} — ${enquiry.subject}`,
      link: '/dashboard',
    },
  })

  return enquiry
}
