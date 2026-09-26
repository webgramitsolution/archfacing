'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { getPaymentProvider } from '@/lib/payments'
import {
  startPortalSpacePurchase,
  activatePortalSpace,
  PortalSpaceError,
} from '@/lib/portal-space'

/**
 * Starts a Portal Space purchase. Same shape as the PACT and Club flows:
 * create the Payment row, ask the provider for an order, hand the checkout
 * back to the browser. No storage is granted until payment confirms.
 */
export async function startPortalSpaceAction(packSlug: string) {
  const user = await requireAuth()

  let purchase
  try {
    purchase = await startPortalSpacePurchase(user.id, packSlug)
  } catch (e) {
    if (e instanceof PortalSpaceError) return { ok: false as const, error: e.message }
    console.error('Portal Space purchase failed:', e)
    return { ok: false as const, error: 'Could not start this purchase. Please try again.' }
  }

  const provider = getPaymentProvider()

  try {
    const order = await provider.createOrder({
      paymentId: purchase.paymentId,
      amount: purchase.price.total,
      currency: 'INR',
      purpose: 'PORTAL_SPACE',
      userId: user.id,
      userEmail: user.email ?? '',
      userName: user.name ?? 'ArchFacing member',
      description: `Portal Space — ${purchase.pack.name}`,
      notes: { pack: purchase.pack.slug },
    })

    await prisma.payment.update({
      where: { id: purchase.paymentId },
      data: { status: 'PENDING', razorpayOrderId: order.orderId },
    })

    return {
      ok: true as const,
      paymentId: purchase.paymentId,
      packName: purchase.pack.name,
      extraMb: purchase.pack.extraMb,
      amount: purchase.price.total,
      isMock: !provider.isLive,
    }
  } catch (e) {
    console.error('Portal Space payment order failed:', e)
    return { ok: false as const, error: 'Payment could not be started. Please try again.' }
  }
}

/**
 * ⚠️ Development only. Once real Razorpay keys exist, `provider.isLive`
 *    becomes true and this refuses to run — confirmation then arrives only
 *    through the signed webhook.
 */
export async function confirmMockPortalSpaceAction(paymentId: string) {
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
    await activatePortalSpace(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath('/dashboard/portal-space')
    return { ok: true as const }
  } catch (e) {
    console.error('Portal Space activation failed:', e)
    return { ok: false as const, error: 'The storage could not be added.' }
  }
}
