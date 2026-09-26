'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { getPaymentProvider } from '@/lib/payments'
import {
  startClubPurchase,
  activateClubMembership,
  ClubError,
} from '@/lib/club'

/**
 * Starts a Club Membership purchase.
 *
 * Mirrors the PACT flow exactly: create the Payment row, ask the provider
 * for an order, and hand the checkout details back to the browser. With no
 * Razorpay keys configured the provider is the mock one, so `checkout` comes
 * back null and the UI shows a confirm button instead.
 */
export async function startClubPurchaseAction(planSlug: string) {
  const user = await requireAuth()

  let purchase
  try {
    purchase = await startClubPurchase(user.id, planSlug)
  } catch (e) {
    if (e instanceof ClubError) return { ok: false as const, error: e.message }
    console.error('Club purchase failed:', e)
    return { ok: false as const, error: 'Could not start this purchase. Please try again.' }
  }

  const provider = getPaymentProvider()

  try {
    const order = await provider.createOrder({
      paymentId: purchase.paymentId,
      amount: purchase.price.total,
      currency: 'INR',
      purpose: 'CLUB_MEMBERSHIP',
      userId: user.id,
      userEmail: user.email ?? '',
      userName: user.name ?? 'ArchFacing member',
      description: `Club Membership — ${purchase.plan.name}`,
      notes: { plan: purchase.plan.slug },
    })

    await prisma.payment.update({
      where: { id: purchase.paymentId },
      data: { status: 'PENDING', razorpayOrderId: order.orderId },
    })

    return {
      ok: true as const,
      paymentId: purchase.paymentId,
      planName: purchase.plan.name,
      months: purchase.plan.months,
      amount: purchase.price.total,
      isMock: !provider.isLive,
    }
  } catch (e) {
    // The payment row is left CREATED and simply never completes — nothing
    // was granted, so there is nothing to roll back.
    console.error('Club payment order failed:', e)
    return { ok: false as const, error: 'Payment could not be started. Please try again.' }
  }
}

/**
 * ⚠️ Development only. The moment real Razorpay keys are present,
 *    `provider.isLive` becomes true and this action refuses to run —
 *    confirmation then comes only from the signed webhook.
 */
export async function confirmMockClubPaymentAction(paymentId: string) {
  const user = await requireAuth()
  const provider = getPaymentProvider()

  if (provider.isLive) {
    return { ok: false as const, error: 'The live gateway is active — mock confirmation is disabled.' }
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.userId !== user.id) {
    return { ok: false as const, error: 'Payment not found.' }
  }

  try {
    await activateClubMembership(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath('/dashboard/club')
    revalidatePath('/club')
    return { ok: true as const }
  } catch (e) {
    console.error('Club activation failed:', e)
    return { ok: false as const, error: 'The membership could not be activated.' }
  }
}
