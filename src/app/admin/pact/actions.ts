'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, type PactServiceType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { assignPactByAdmin, PactError } from '@/lib/pact'
import { BUSINESS_RULES, termYears } from '@/config/permissions'

export type AssignState = { ok: boolean; message: string } | null

const SERVICE_TYPES: PactServiceType[] = ['DESIGNA', 'DESIGNI', 'CONSULTANT', 'BMF']

/** Admin allots a territory to a user directly — offline deal or complimentary. */
export async function assignPactAction(
  _prev: AssignState,
  formData: FormData
): Promise<AssignState> {
  const admin = await requirePermission('admin:pact')

  const userEmail = String(formData.get('email') ?? '').trim()
  const pincode = String(formData.get('pincode') ?? '').trim()
  const rawService = String(formData.get('serviceType') ?? '')
  const subCategory = String(formData.get('subCategory') ?? '').trim() || null
  const rawPrice = String(formData.get('price') ?? '').trim()

  const serviceType = SERVICE_TYPES.find((s) => s === rawService)
  if (!serviceType) return { ok: false, message: 'Pick a service type.' }
  if (!userEmail) return { ok: false, message: 'Enter the user’s email address.' }

  const price = rawPrice === '' ? 0 : Number(rawPrice)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: 'The price must be 0 (complimentary) or a positive amount.' }
  }

  try {
    const result = await assignPactByAdmin({
      adminId: admin.id,
      userEmail,
      pincode,
      serviceType,
      subCategory,
      price,
    })
    revalidatePath('/admin/pact')
    return {
      ok: true,
      message: `PIN ${result.pincode} (${result.place}) allotted to ${result.holderName}${
        result.price > 0 ? ` for ₹${result.price.toLocaleString('en-IN')}` : ' — complimentary'
      }. Valid for ${termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}.`,
    }
  } catch (e) {
    if (e instanceof PactError) return { ok: false, message: e.message }
    throw e
  }
}

// ═══════════════════════════════════════════════════════════
//  Seat lifecycle — suspend · reinstate · revoke · extend
// ═══════════════════════════════════════════════════════════

export type PactOpState = { ok: boolean; message: string } | null

const OP = z.object({
  id: z.string().regex(/^[a-z0-9]{10,40}$/i),
  op: z.enum(['SUSPEND', 'REINSTATE', 'REVOKE', 'EXTEND']),
  reason: z.string().trim().max(300).optional(),
  months: z.coerce.number().int().min(1).max(24).optional(),
})

const OP_COPY = {
  SUSPEND: { title: 'Your PACT has been suspended', audit: 'PACT_SUSPENDED' },
  REINSTATE: { title: 'Your PACT is active again', audit: 'PACT_REINSTATED' },
  REVOKE: { title: 'Your PACT has been withdrawn', audit: 'PACT_REVOKED' },
  EXTEND: { title: 'Your PACT has been extended', audit: 'PACT_EXTENDED' },
} as const

/**
 * One entry point for every row action on /admin/pact.
 *
 * · SUSPEND   ACTIVE → SUSPENDED. Lead routing reads ACTIVE only, so leads stop. Reason required.
 * · REINSTATE SUSPENDED → ACTIVE, only while unexpired and only if nobody else has
 *             taken the seat meanwhile — the partial unique index enforces that.
 * · REVOKE    ACTIVE/SUSPENDED → EXPIRED, which frees the seat for sale. Reason required.
 * · EXTEND    pushes expiresAt by 1–24 months (goodwill, offline renewal).
 * Every change notifies the holder and writes an AuditLog row.
 */
export async function pactOpAction(_prev: PactOpState, formData: FormData): Promise<PactOpState> {
  const admin = await requirePermission('admin:pact')
  const raw = Object.fromEntries(formData)
  const parsed = OP.safeParse({ ...raw, months: raw.months === '' ? undefined : raw.months, reason: raw.reason || undefined })
  if (!parsed.success) return { ok: false, message: 'That request was not valid.' }
  const { id, op, reason, months } = parsed.data

  const pact = await prisma.pact.findUnique({
    where: { id },
    select: { id: true, status: true, pincode: true, serviceType: true, holderId: true, expiresAt: true },
  })
  if (!pact) return { ok: false, message: 'That PACT no longer exists.' }

  const now = new Date()
  let data: Prisma.PactUpdateInput
  let body: string
  switch (op) {
    case 'SUSPEND':
      if (pact.status !== 'ACTIVE') return { ok: false, message: 'Only an active PACT can be suspended.' }
      if (!reason) return { ok: false, message: 'Give a reason — the holder is told why.' }
      data = { status: 'SUSPENDED', suspendedAt: now, suspensionReason: reason }
      body = `PIN ${pact.pincode} (${pact.serviceType}) is suspended: ${reason}. Leads will not route to it until it is reinstated.`
      break
    case 'REINSTATE':
      if (pact.status !== 'SUSPENDED') return { ok: false, message: 'Only a suspended PACT can be reinstated.' }
      if (pact.expiresAt && pact.expiresAt < now) return { ok: false, message: 'This PACT has already expired — extend it first.' }
      data = { status: 'ACTIVE', suspendedAt: null, suspensionReason: null }
      body = `PIN ${pact.pincode} (${pact.serviceType}) is active again and leads will route to you.`
      break
    case 'REVOKE':
      if (pact.status !== 'ACTIVE' && pact.status !== 'SUSPENDED') return { ok: false, message: 'Only an active or suspended PACT can be withdrawn.' }
      if (!reason) return { ok: false, message: 'Give a reason — the holder is told why.' }
      data = { status: 'EXPIRED', expiresAt: now, suspensionReason: reason }
      body = `PIN ${pact.pincode} (${pact.serviceType}) has been withdrawn: ${reason}.`
      break
    case 'EXTEND': {
      if (pact.status !== 'ACTIVE' && pact.status !== 'SUSPENDED') return { ok: false, message: 'Only an active or suspended PACT can be extended.' }
      const m = months ?? 1
      const base = pact.expiresAt && pact.expiresAt > now ? pact.expiresAt : now
      const next = new Date(base)
      next.setMonth(next.getMonth() + m)
      data = { expiresAt: next }
      body = `PIN ${pact.pincode} (${pact.serviceType}) now runs until ${next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
      break
    }
  }

  try {
    await prisma.$transaction([
      prisma.pact.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: OP_COPY[op].audit,
          entityType: 'Pact',
          entityId: id,
          before: { status: pact.status, expiresAt: pact.expiresAt?.toISOString() ?? null },
          after: { op, reason: reason ?? null, months: months ?? null },
        },
      }),
      ...(pact.holderId
        ? [
            prisma.notification.create({
              data: {
                userId: pact.holderId,
                type: OP_COPY[op].audit,
                title: OP_COPY[op].title,
                body,
                link: '/dashboard/professional/profile',
              },
            }),
          ]
        : []),
    ])
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, message: 'Someone else holds this seat now, so it cannot be reinstated.' }
    }
    throw e
  }

  revalidatePath('/admin/pact')
  return { ok: true, message: body }
}

// ═══════════════════════════════════════════════════════════
//  Pricing
// ═══════════════════════════════════════════════════════════

const PRICE = z.object({
  serviceType: z.enum(['DESIGNA', 'DESIGNI', 'CONSULTANT', 'BMF', 'CORPORATE']),
  price: z.coerce.number().min(0).max(10_000_000),
  renewalPrice: z.coerce.number().min(0).max(10_000_000).optional(),
  taxPercent: z.coerce.number().min(0).max(40),
})

/** Edits the all-states list price for one service. Buyers see it on their next checkout. */
export async function savePactPriceAction(_prev: PactOpState, formData: FormData): Promise<PactOpState> {
  const admin = await requirePermission('admin:pact')
  const raw = Object.fromEntries(formData)
  const parsed = PRICE.safeParse({ ...raw, renewalPrice: raw.renewalPrice === '' ? undefined : raw.renewalPrice })
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the amounts.' }
  const { serviceType, price, renewalPrice, taxPercent } = parsed.data
  const renewal = renewalPrice ?? null

  const existing = await prisma.pactPrice.findFirst({ where: { serviceType, state: null } })
  await prisma.$transaction([
    existing
      ? prisma.pactPrice.update({
          where: { id: existing.id },
          data: { price, renewalPrice: renewal, taxPercent, isActive: true, updatedById: admin.id },
        })
      : prisma.pactPrice.create({
          data: { serviceType, state: null, price, renewalPrice: renewal, taxPercent, updatedById: admin.id },
        }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'PACT_PRICE_UPDATED',
        entityType: 'PactPrice',
        entityId: serviceType,
        before: existing
          ? { price: Number(existing.price), renewalPrice: existing.renewalPrice ? Number(existing.renewalPrice) : null, taxPercent: Number(existing.taxPercent) }
          : Prisma.JsonNull,
        after: { price, renewalPrice: renewal, taxPercent },
      },
    }),
  ])
  revalidatePath('/admin/pact')
  revalidatePath('/pact')
  return { ok: true, message: `${serviceType} price saved.` }
}
