'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { getPaymentProvider } from '@/lib/payments'
import {
  cancelEventRegistration,
  confirmEventRegistration,
  EventRegistrationError,
  startEventRegistration,
} from '@/lib/club-registration'

export type RegisterResult =
  | { ok: true; free: true; ticketCode: string }
  | { ok: true; free: false; paymentId: string; total: number; isMock: boolean }
  | { ok: false; error: string }

/**
 * Register for an event. A free tier confirms at once; a paid tier holds the
 * seat and opens a gateway order — with no Razorpay keys the provider is the
 * mock one and the UI shows a confirm step, exactly like Club Membership.
 */
export async function registerForEventAction(eventId: string, slug: string): Promise<RegisterResult> {
  const user = await requireAuth()
  let r
  try {
    r = await startEventRegistration(eventId, user.id)
  } catch (e) {
    if (e instanceof EventRegistrationError) return { ok: false, error: e.message }
    console.error('Event registration failed:', e)
    return { ok: false, error: 'Could not register. Please try again.' }
  }
  if (r.free) {
    revalidatePath(`/club/events/${slug}`)
    return { ok: true, free: true, ticketCode: r.ticketCode }
  }

  const payment = await prisma.payment.findUnique({ where: { id: r.paymentId ?? '' }, select: { id: true, totalAmount: true } })
  if (!payment) return { ok: false, error: 'The payment could not be opened.' }
  const provider = getPaymentProvider()
  try {
    const order = await provider.createOrder({
      paymentId: payment.id,
      amount: Number(payment.totalAmount),
      currency: 'INR',
      purpose: 'CLUB_EVENT',
      userId: user.id,
      userEmail: user.email ?? '',
      userName: user.name ?? 'ArchFacing member',
      description: 'ArchFacing Club event seat',
      notes: { eventId },
    })
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PENDING', razorpayOrderId: order.orderId } })
  } catch (e) {
    console.error('Event payment order failed:', e)
    return { ok: false, error: 'Payment could not be started. Please try again.' }
  }
  revalidatePath(`/club/events/${slug}`)
  return { ok: true, free: false, paymentId: payment.id, total: Number(payment.totalAmount), isMock: !provider.isLive }
}

/** ⚠️ Development only — refuses to run once real gateway keys exist. */
export async function confirmMockEventPaymentAction(paymentId: string, slug: string) {
  const user = await requireAuth()
  const provider = getPaymentProvider()
  if (provider.isLive) return { ok: false as const, error: 'The live gateway is active — mock confirmation is disabled.' }
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { userId: true } })
  if (!payment || payment.userId !== user.id) return { ok: false as const, error: 'Payment not found.' }
  try {
    const r = await confirmEventRegistration(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath(`/club/events/${slug}`)
    revalidatePath('/dashboard/club')
    return { ok: true as const, ticketCode: r.ticketCode }
  } catch (e) {
    if (e instanceof EventRegistrationError) return { ok: false as const, error: e.message }
    throw e
  }
}

/** The member cancels their own registration; the seat is returned. */
export async function cancelMyRegistrationAction(registrationId: string, slug: string) {
  const user = await requireAuth()
  const reg = await prisma.clubRegistration.findFirst({ where: { id: registrationId, userId: user.id }, select: { id: true, status: true } })
  if (!reg) return { ok: false as const, error: 'Registration not found.' }
  if (reg.status === 'ATTENDED') return { ok: false as const, error: 'This event has already been attended.' }
  try {
    await cancelEventRegistration(reg.id)
  } catch (e) {
    if (e instanceof EventRegistrationError) return { ok: false as const, error: e.message }
    throw e
  }
  revalidatePath(`/club/events/${slug}`)
  return { ok: true as const }
}
