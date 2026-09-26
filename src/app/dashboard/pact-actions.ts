'use server'

/**
 * Server actions for purchasing a PACT.
 *
 * ⚠️ Every action re-checks permissions. What is visible on the client is
 *    never trusted — anyone can call an action directly.
 */

import { revalidatePath } from 'next/cache'
import { Prisma, type PactServiceType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { can } from '@/config/permissions'
import {
  checkAvailability,
  seatMapForPincode,
  reservePact,
  activatePact,
  releasePactForFailedPayment,
  startPactRenewal,
  PactError,
} from '@/lib/pact'
import { getPaymentProvider } from '@/lib/payments'

// ═══════════════════════════════════════════════════════════
//  Checking availability
// ═══════════════════════════════════════════════════════════

export type AvailabilityState = {
  ok: boolean
  error?: string
  result?: Awaited<ReturnType<typeof checkAvailability>>
  seatMap?: Awaited<ReturnType<typeof seatMapForPincode>>
}

export async function checkAvailabilityAction(
  _prev: AvailabilityState | null,
  formData: FormData
): Promise<AvailabilityState> {
  await requireAuth()

  const pincode = String(formData.get('pincode') ?? '').trim()
  const serviceType = String(formData.get('serviceType') ?? '') as PactServiceType
  const subCategory = String(formData.get('subCategory') ?? '').trim() || null

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { ok: false, error: 'A PIN code must be exactly 6 digits.' }
  }

  const [result, seatMap] = await Promise.all([
    serviceType ? checkAvailability(pincode, serviceType, subCategory) : null,
    seatMapForPincode(pincode),
  ])

  if (!seatMap) {
    return { ok: false, error: `PIN ${pincode} is not in our records.` }
  }

  if (result && 'error' in result) {
    return { ok: false, error: result.error, seatMap }
  }

  return { ok: true, result: result ?? undefined, seatMap }
}

// ═══════════════════════════════════════════════════════════
//  Holding a seat and creating the order
// ═══════════════════════════════════════════════════════════

export type ReserveState = {
  ok: boolean
  error?: string
  /** Used to open checkout on a live gateway; null when running mock */
  checkout?: unknown
  paymentId?: string
  pactId?: string
  reservedTill?: string
  /** The mock provider is in use — the UI should show a "confirm" button */
  isMock?: boolean
  amount?: number
}

export async function reservePactAction(
  _prev: ReserveState | null,
  formData: FormData
): Promise<ReserveState> {
  const user = await requireAuth()

  if (!can(user.role, 'pact:buy')) {
    return { ok: false, error: 'Your membership category is not eligible to hold a PACT.' }
  }

  // §3.1.8.1 — no PACT before the qualification check is complete
  if (user.status !== 'ACTIVE') {
    return {
      ok: false,
      error:
        'Your account is still under verification. You will be able to purchase a PACT once the ArchFacing review is complete.',
    }
  }

  const pincode = String(formData.get('pincode') ?? '').trim()
  const serviceType = String(formData.get('serviceType') ?? '') as PactServiceType
  const subCategory = String(formData.get('subCategory') ?? '').trim() || null

  let reservation
  try {
    reservation = await reservePact({
      userId: user.id,
      role: user.role,
      pincode,
      serviceType,
      subCategory,
    })
  } catch (e) {
    if (e instanceof PactError) return { ok: false, error: e.message }
    console.error('PACT reserve fail:', e)
    return { ok: false, error: 'The seat could not be held. Please try again.' }
  }

  // ─── payment order ───
  const provider = getPaymentProvider()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, mobile: true },
  })

  try {
    const order = await provider.createOrder({
      paymentId: reservation.paymentId,
      amount: reservation.price.total,
      currency: 'INR',
      purpose: 'PACT_PURCHASE',
      userId: user.id,
      userEmail: dbUser!.email,
      userName: dbUser!.name,
      userMobile: dbUser!.mobile,
      description: `PACT ${pincode} · ${serviceType}${subCategory ? ` · ${subCategory}` : ''}`,
      notes: { pincode, serviceType },
    })

    await prisma.payment.update({
      where: { id: reservation.paymentId },
      data: { status: 'PENDING', razorpayOrderId: order.orderId },
    })

    return {
      ok: true,
      checkout: order.checkout,
      paymentId: reservation.paymentId,
      pactId: reservation.pactId,
      reservedTill: reservation.reservedTill.toISOString(),
      isMock: !provider.isLive,
      amount: reservation.price.total,
    }
  } catch (e) {
    // If the order was not created, release the seat at once — otherwise it
    // stays blocked for 15 minutes for no reason
    await releasePactForFailedPayment(reservation.paymentId)
    console.error('Payment order fail:', e)
    return { ok: false, error: 'Payment could not be started. Please try again.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  Mock payment confirmation — development only
// ═══════════════════════════════════════════════════════════

/**
 * ⚠️ This exists so the flow can be tested without a live gateway.
 *    As soon as Razorpay keys are configured, provider.isLive becomes true
 *    and this action stops working — confirmation then comes only from the
 *    webhook, whose signature is verified.
 */
export async function confirmMockPaymentAction(paymentId: string) {
  const user = await requireAuth()
  const provider = getPaymentProvider()

  if (provider.isLive) {
    return { ok: false, error: 'The live gateway is active — mock confirmation is disabled.' }
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.userId !== user.id) {
    return { ok: false, error: 'That payment could not be found.' }
  }

  try {
    await activatePact(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath('/dashboard', 'layout')
    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } })
      return { ok: false, error: 'Someone else has taken this seat. Nothing was charged.' }
    }
    console.error('Mock activate fail:', e)
    return { ok: false, error: 'The PACT could not be activated.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  Renewal
// ═══════════════════════════════════════════════════════════

export type RenewState =
  | { ok: true; paymentId: string; amount: number; newExpiry: string; pincode: string; isMock: boolean }
  | { ok: false; error: string }

export async function startRenewalAction(pactId: string): Promise<RenewState> {
  const user = await requireAuth()
  if (!can(user.role, 'pact:buy')) return { ok: false, error: 'Your membership category is not eligible to hold a PACT.' }
  if (user.status !== 'ACTIVE') return { ok: false, error: 'Your account must be active to renew a PACT.' }
  if (!/^[a-z0-9]{10,40}$/i.test(pactId)) return { ok: false, error: 'That PACT was not found.' }

  let r
  try {
    r = await startPactRenewal(user.id, pactId)
  } catch (e) {
    if (e instanceof PactError) return { ok: false, error: e.message }
    throw e
  }
  const provider = getPaymentProvider()
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, name: true, mobile: true } })
  try {
    const order = await provider.createOrder({
      paymentId: r.paymentId,
      amount: r.price.total,
      currency: 'INR',
      purpose: 'PACT_RENEWAL',
      userId: user.id,
      userEmail: dbUser!.email,
      userName: dbUser!.name,
      userMobile: dbUser!.mobile,
      description: `PACT renewal ${r.pincode}`,
      notes: { pincode: r.pincode, renewal: 'yes' },
    })
    await prisma.payment.update({ where: { id: r.paymentId }, data: { status: 'PENDING', razorpayOrderId: order.orderId } })
  } catch (e) {
    await prisma.payment.update({ where: { id: r.paymentId }, data: { status: 'FAILED' } })
    console.error('Renewal order fail:', e)
    return { ok: false, error: 'Payment could not be started. Please try again.' }
  }
  return { ok: true, paymentId: r.paymentId, amount: r.price.total, newExpiry: r.newExpiry.toISOString(), pincode: r.pincode, isMock: !provider.isLive }
}

/** The user abandoned the flow — release the seat immediately */
export async function cancelReservationAction(paymentId: string) {
  const user = await requireAuth()
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.userId !== user.id) return { ok: false }

  await releasePactForFailedPayment(paymentId)
  revalidatePath('/dashboard')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  My PACTs
// ═══════════════════════════════════════════════════════════

export async function myPacts() {
  const user = await requireAuth()
  return prisma.pact.findMany({
    where: { holderId: user.id, status: { in: ['ACTIVE', 'RESERVED', 'SUSPENDED', 'EXPIRED'] } },
    orderBy: [{ status: 'asc' }, { purchasedAt: 'desc' }],
  })
}
