'use server'

/**
 * Server actions for booking an advertisement — §7.4.6.
 *
 * ⚠️ Not one rule is decided here. `src/lib/ads.ts` owns eligibility, dates,
 *    slot counting and URL safety; these actions only carry the request to it
 *    and hand `AdError.message` back to the browser. Anything else would let
 *    the UI and the library disagree about what is allowed.
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { getPaymentProvider } from '@/lib/payments'
import {
  createBooking,
  markBookingPaid,
  slotsLeft,
  getPlacement,
  isSafeUrl,
  AdError,
} from '@/lib/ads'

/**
 * Parses "2026-09-14" as that day in the server's own timezone.
 *
 * `new Date('2026-09-14')` would be UTC midnight, which in a timezone behind
 * UTC is the previous day — enough to fail the "not in the past" check on a
 * date the advertiser picked as today.
 */
function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null

  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

// ═══════════════════════════════════════════════════════════
//  Availability — asked before the advertiser commits
// ═══════════════════════════════════════════════════════════

export type SlotsState =
  | { ok: true; free: number; total: number; taken: number; endsAt: string }
  | { ok: false; error: string }

/**
 * How many slots are free on a placement for the chosen dates.
 *
 * This is only a preview. `createBooking` counts again inside its own
 * transaction, so a slot taken between this call and the booking is still
 * caught — this exists so the advertiser is not surprised by it.
 */
export async function checkAdSlotsAction(
  placementSlug: string,
  startDate: string,
  weeks: number
): Promise<SlotsState> {
  await requireAuth()

  const startsAt = parseLocalDate(startDate)
  if (!startsAt) {
    return { ok: false, error: 'Choose a start date first.' }
  }

  if (!Number.isInteger(weeks) || weeks < 1) {
    return { ok: false, error: 'Enter a whole number of weeks.' }
  }

  const placement = await getPlacement(placementSlug)
  if (!placement || !placement.isActive) {
    return { ok: false, error: 'That placement is not available right now.' }
  }

  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + weeks * 7)

  try {
    const result = await slotsLeft(placement.id, startsAt, endsAt)
    return {
      ok: true,
      free: result.free,
      total: result.total,
      taken: result.taken,
      endsAt: endsAt.toISOString(),
    }
  } catch (e) {
    if (e instanceof AdError) return { ok: false, error: e.message }
    console.error('Ad slot check failed:', e)
    return { ok: false, error: 'Availability could not be checked. Please try again.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  Booking and payment
// ═══════════════════════════════════════════════════════════

export type BookAdState =
  | {
      ok: true
      paymentId: string
      bookingId: string
      placementName: string
      title: string
      weeks: number
      amount: number
      endsAt: string
      isMock: boolean
    }
  | { ok: false; error: string }

/**
 * Creates the booking and the payment order.
 *
 * Mirrors the Club purchase exactly: the library creates the Payment row, the
 * provider is asked for an order, and the checkout details go back to the
 * browser. With no Razorpay keys configured the provider is the mock one, so
 * `isMock` comes back true and the UI shows a confirm button instead.
 */
export async function bookAdvertisementAction(input: {
  placementSlug: string
  startDate: string
  weeks: number
  title: string
  imageUrl: string
  targetUrl: string
}): Promise<BookAdState> {
  const user = await requireAuth()

  const startsAt = parseLocalDate(input.startDate)
  if (!startsAt) {
    return { ok: false, error: 'Choose a start date in the format day/month/year.' }
  }

  const title = input.title.trim()
  if (title.length < 3) {
    return { ok: false, error: 'Give the ad a title of at least 3 characters so you can recognise it later.' }
  }

  const imageUrl = input.imageUrl.trim()
  if (!imageUrl) {
    return { ok: false, error: 'Add the address of your banner image.' }
  }

  // The banner is rendered into an <img> for every visitor, so the same
  // protocol rule that guards the click target guards the image source.
  if (!isSafeUrl(imageUrl)) {
    return { ok: false, error: 'The banner image must be a full http:// or https:// address.' }
  }

  // ─── the booking itself ───
  let booking
  try {
    booking = await createBooking({
      advertiserId: user.id,
      placementSlug: input.placementSlug,
      title,
      imageUrl,
      targetUrl: input.targetUrl,
      startsAt,
      weeks: input.weeks,
    })
  } catch (e) {
    if (e instanceof AdError) return { ok: false, error: e.message }
    console.error('Ad booking failed:', e)
    return { ok: false, error: 'The booking could not be created. Please try again.' }
  }

  // ─── payment order ───
  const provider = getPaymentProvider()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, mobile: true },
  })

  try {
    const order = await provider.createOrder({
      paymentId: booking.paymentId,
      amount: booking.price.total,
      currency: 'INR',
      purpose: 'ADVERTISEMENT',
      userId: user.id,
      userEmail: dbUser!.email,
      userName: dbUser!.name,
      userMobile: dbUser!.mobile,
      description: `Advertisement — ${booking.placement.name}, ${input.weeks} week${input.weeks === 1 ? '' : 's'}`,
      notes: { placement: booking.placement.slug, weeks: String(input.weeks) },
    })

    await prisma.payment.update({
      where: { id: booking.paymentId },
      data: { status: 'PENDING', razorpayOrderId: order.orderId },
    })

    revalidatePath('/dashboard/advertisements')

    return {
      ok: true,
      paymentId: booking.paymentId,
      bookingId: booking.bookingId,
      placementName: booking.placement.name,
      title,
      weeks: input.weeks,
      amount: booking.price.total,
      endsAt: booking.endsAt.toISOString(),
      isMock: !provider.isLive,
    }
  } catch (e) {
    // The booking stays in PENDING_PAYMENT and its Payment row stays CREATED.
    // Nothing was published, and `releaseUnpaidBookings` frees the slot from
    // the nightly cron, so there is nothing to unwind here.
    console.error('Ad payment order failed:', e)
    return { ok: false, error: 'Payment could not be started. Please try again.' }
  }
}

/**
 * ⚠️ Development only. The moment real Razorpay keys are present,
 *    `provider.isLive` becomes true and this action refuses to run —
 *    confirmation then comes only from the signed webhook.
 */
export async function confirmMockAdPaymentAction(paymentId: string) {
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
    await markBookingPaid(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath('/dashboard/advertisements')
    revalidatePath('/admin/ads')
    return { ok: true as const }
  } catch (e) {
    if (e instanceof AdError) return { ok: false as const, error: e.message }
    console.error('Ad payment confirmation failed:', e)
    return { ok: false as const, error: 'The payment could not be confirmed.' }
  }
}
