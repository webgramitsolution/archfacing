'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'

export type PlanState = { ok: boolean; message: string } | null

/**
 * Edits one membership plan (SubscriptionPlan). The founder's rule holds:
 * listings stay unlimited on every tier, so only PACT reach, price, term,
 * benefits and visibility are editable here. Existing subscriptions keep the
 * name and price they were bought at — only new purchases see the change.
 */
const PLAN = z.object({
  id: z.string().regex(/^[a-z0-9]{10,40}$/i),
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(120).optional(),
  price: z.coerce.number().min(0).max(10_000_000),
  months: z.coerce.number().int().min(1).max(120),
  taxPercent: z.coerce.number().min(0).max(40),
  pactTerritories: z.string().trim(),
  benefits: z.string().max(3000),
  sortOrder: z.coerce.number().int().min(0).max(99),
})

export async function savePlanAction(_p: PlanState, fd: FormData): Promise<PlanState> {
  const admin = await requirePermission('admin:plans')
  const parsed = PLAN.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the values.' }
  const d = parsed.data
  const unlimited = d.pactTerritories === '' || d.pactTerritories.toLowerCase() === 'unlimited'
  const pact = unlimited ? null : Number(d.pactTerritories)
  if (!unlimited && (!Number.isInteger(pact) || pact! < 0 || pact! > 999)) return { ok: false, message: 'PACT territories must be a whole number, or blank for unlimited.' }
  const benefits = d.benefits.split('\n').map((b) => b.trim()).filter(Boolean).slice(0, 20)
  const isActive = fd.get('isActive') === 'on'
  const isPopular = fd.get('isPopular') === 'on'

  const before = await prisma.subscriptionPlan.findUnique({ where: { id: d.id } })
  if (!before) return { ok: false, message: 'That plan no longer exists.' }

  await prisma.$transaction([
    // Only one plan carries the "Most Popular" ribbon.
    ...(isPopular ? [prisma.subscriptionPlan.updateMany({ where: { id: { not: d.id } }, data: { isPopular: false } })] : []),
    prisma.subscriptionPlan.update({
      where: { id: d.id },
      data: {
        name: d.name, tagline: d.tagline || null, price: d.price, months: d.months, taxPercent: d.taxPercent,
        pactTerritories: pact, benefits, sortOrder: d.sortOrder, isActive, isPopular,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'PLAN_UPDATED', entityType: 'SubscriptionPlan', entityId: d.id,
        before: { name: before.name, price: Number(before.price), months: before.months, pactTerritories: before.pactTerritories, isActive: before.isActive },
        after: { name: d.name, price: d.price, months: d.months, pactTerritories: pact, isActive },
      },
    }),
  ])
  revalidatePath('/admin/plans')
  revalidatePath('/dashboard/membership')
  return { ok: true, message: `${d.name} saved.` }
}
