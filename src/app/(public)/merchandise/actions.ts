'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, activeSessionUser } from '@/lib/guard'
import {
  addToCart,
  setCartQuantity,
  removeFromCart,
  createOrder,
  markOrderPaid,
  releaseOrder,
  cancelOrderByBuyer,
  getCart,
  CommerceError,
} from '@/lib/commerce'
import { getPaymentProvider } from '@/lib/payments'
import { quoteCoupon } from '@/lib/coupons'
import { freeShippingThreshold } from '@/lib/settings'

/** The PIN check on a product page — a real PIN code lookup and the real shipping rule. */
export async function deliveryCheckAction(pin: string): Promise<{ ok: boolean; message: string }> {
  if (!/^[1-9]\d{5}$/.test(pin)) return { ok: false, message: 'Enter a valid 6-digit PIN code.' }
  const place = await prisma.pincode.findUnique({ where: { code: pin }, select: { district: true, state: true } })
  if (!place) return { ok: false, message: `${pin} is not in our PIN code list — please check it.` }
  const free = await freeShippingThreshold()
  const ship = free > 0 ? ` Free shipping on orders of ₹${free.toLocaleString('en-IN')} or more.` : ''
  return { ok: true, message: `We deliver to ${place.district}, ${place.state}. Payment is online at checkout.${ship}` }
}

export async function addToCartAction(variantId: string, quantity = 1) {
  const user = await activeSessionUser()
  // §7.4.5 — merchandise is open to everyone, but buying needs an
  // account so the order and address stay linked
  if (!user) {
    return { ok: false, needsLogin: true, error: 'Please sign in to make a purchase.' }
  }

  try {
    await addToCart(user.id, variantId, quantity)
    revalidatePath('/merchandise')
    revalidatePath('/cart')
    return { ok: true }
  } catch (e) {
    if (e instanceof CommerceError) return { ok: false, error: e.message }
    console.error('Cart fail:', e)
    return { ok: false, error: 'Could not add to cart.' }
  }
}

export async function updateCartAction(itemId: string, quantity: number) {
  const user = await requireAuth()
  try {
    await setCartQuantity(user.id, itemId, quantity)
    revalidatePath('/cart')
    return { ok: true }
  } catch (e) {
    if (e instanceof CommerceError) return { ok: false, error: e.message }
    return { ok: false, error: 'Could not update the cart.' }
  }
}

export async function removeCartAction(itemId: string) {
  const user = await requireAuth()
  await removeFromCart(user.id, itemId)
  revalidatePath('/cart')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Checkout
// ═══════════════════════════════════════════════════════════

const addressSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(10, 'Enter the complete address').max(300),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid PIN code'),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  state: z.string().trim().min(2, 'Select a state').max(80),
})

export type CheckoutState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  paymentId?: string
  orderNumber?: string
  amount?: number
  isMock?: boolean
}

export async function checkoutAction(
  _prev: CheckoutState | null,
  formData: FormData
): Promise<CheckoutState> {
  const user = await requireAuth()

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }

  const parsed = addressSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form')
      fieldErrors[key] ??= i.message
    }
    return { ok: false, error: 'Please correct the address details.', fieldErrors, values: raw }
  }

  let result
  try {
    result = await createOrder(user.id, parsed.data, raw.couponCode ?? null)
  } catch (e) {
    if (e instanceof CommerceError) return { ok: false, error: e.message, values: raw }
    console.error('Checkout fail:', e)
    return { ok: false, error: 'Could not create the order.', values: raw }
  }

  const provider = getPaymentProvider()
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, mobile: true },
  })

  try {
    const order = await provider.createOrder({
      paymentId: result.paymentId,
      amount: Number(result.order.total),
      currency: 'INR',
      purpose: 'MERCHANDISE_ORDER',
      userId: user.id,
      userEmail: dbUser!.email,
      userName: dbUser!.name,
      userMobile: dbUser!.mobile,
      description: `ArchFacing order ${result.order.orderNumber}`,
    })

    await prisma.payment.update({
      where: { id: result.paymentId },
      data: { status: 'PENDING', razorpayOrderId: order.orderId },
    })

    return {
      ok: true,
      paymentId: result.paymentId,
      orderNumber: result.order.orderNumber,
      amount: Number(result.order.total),
      isMock: !provider.isLive,
    }
  } catch (e) {
    // order created but payment could not start — release the stock
    await releaseOrder(result.paymentId)
    console.error('Payment order fail:', e)
    return { ok: false, error: 'Could not start the payment.', values: raw }
  }
}

/** Dev only — switches off as soon as the real gateway is connected */
export async function confirmMockOrderAction(paymentId: string) {
  const user = await requireAuth()
  const provider = getPaymentProvider()

  if (provider.isLive) {
    return { ok: false, error: 'The live gateway is active — mock confirm is disabled.' }
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.userId !== user.id) {
    return { ok: false, error: 'Payment not found.' }
  }

  try {
    await markOrderPaid(paymentId, `mock_pay_${Date.now()}`)
    revalidatePath('/dashboard/orders')
    return { ok: true }
  } catch (e) {
    console.error('Order confirm fail:', e)
    return { ok: false, error: 'Could not complete the order.' }
  }
}

/** The buyer cancels their own order from the "My Orders" page. */
export async function cancelOrderAction(orderId: string) {
  const user = await requireAuth()
  try {
    await cancelOrderByBuyer(user.id, orderId)
    revalidatePath('/dashboard/orders')
    revalidatePath('/admin/seller/orders')
    return { ok: true }
  } catch (e) {
    if (e instanceof CommerceError) return { ok: false, error: e.message }
    console.error('Cancel order fail:', e)
    return { ok: false, error: 'Could not cancel this order. Please try again.' }
  }
}

export async function cancelCheckoutAction(paymentId: string) {
  const user = await requireAuth()
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.userId !== user.id) return { ok: false }

  await releaseOrder(paymentId)
  revalidatePath('/cart')
  redirect('/merchandise')
}

/** Checks a coupon against the signed-in buyer's current cart — the checkout re-checks it. */
export async function applyCouponAction(code: string): Promise<{ ok: true; code: string; discount: number; label: string } | { ok: false; error: string }> {
  const user = await requireAuth()
  const cart = await getCart(user.id)
  if (!cart.items.length) return { ok: false, error: 'Your cart is empty.' }
  const q = await quoteCoupon(String(code ?? '').slice(0, 40), cart.subtotal, cart.total)
  return q.ok ? { ok: true, code: q.code, discount: q.discount, label: q.label } : q
}
