'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { isPaymentLive } from '@/lib/payments'

export type ChooseState = { ok: boolean; error?: string; planName?: string }

/**
 * Put the reader on a plan.
 *
 * Payment is a MOCK in this build — there are no Razorpay keys yet, so the
 * subscription is written straight to ACTIVE with a `mock_…` reference. When
 * the gateway lands, its success callback replaces the `subscription.create`
 * block below and produces the exact same row; nothing else on this page
 * changes. The plan's own `months` sets the term and the plan's own `price` is
 * copied onto the subscription, so a later price edit never rewrites history.
 */
export async function choosePlanAction(planId: string): Promise<ChooseState> {
  const user = await requireAuth()

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) {
    return { ok: false, error: 'That plan is no longer available.' }
  }
  if (Number(plan.price) <= 0) {
    return { ok: false, error: 'The Free plan is already yours — it applies whenever no paid plan is running.' }
  }

  // The grant below takes no payment. It may only run on the mock provider in
  // development — never in production and never once a real gateway is live,
  // or every paid plan would be free.
  if (process.env.NODE_ENV === 'production' || isPaymentLive()) {
    return { ok: false, error: 'Paid plans cannot be bought online yet. Please contact ArchFacing support to upgrade.' }
  }

  const active = await prisma.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE', expiresAt: { gte: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { planId: true },
  })
  if (active?.planId === plan.id) {
    return { ok: false, error: `You are already on the ${plan.name} plan.` }
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + plan.months)

  await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      // Copied at purchase so the certificate keeps the plan name even if the
      // plan is later renamed or removed.
      planName: plan.name,
      price: plan.price,
      startsAt: now,
      expiresAt,
      status: 'ACTIVE',
      paymentId: `mock_${Date.now()}`,
    },
  })

  revalidatePath('/dashboard/membership')
  revalidatePath('/dashboard/membership-certificate')
  return { ok: true, planName: plan.name }
}
