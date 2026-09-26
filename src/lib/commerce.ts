/**
 * Merchandise store — cart, stock and checkout.
 *
 * §9.2 (Merchandising), §9.10–9.11 (e-commerce), §7.4.5 (open to everyone).
 *
 * ★ Stock is the most delicate part. Two people can buy the last item at the
 *   same moment, so the stock decrement happens inside a transaction and is
 *   conditional — exactly the way PACT seats are handled.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { freeShippingThreshold } from './settings'
import { quoteCoupon, redeemCoupon, releaseCoupon } from './coupons'

export class CommerceError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'OUT_OF_STOCK'
      | 'NOT_FOUND'
      | 'EMPTY_CART'
      | 'INACTIVE'
      | 'BAD_QUANTITY'
      | 'NOT_CANCELLABLE'
      | 'BAD_COUPON'
  ) {
    super(message)
  }
}

/** No more than this per order — prevents both mistakes and hoarding */
const MAX_PER_ITEM = 10

// ═══════════════════════════════════════════════════════════
//  Cart
// ═══════════════════════════════════════════════════════════

export async function getCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { addedAt: 'asc' },
        include: {
          variant: {
            include: {
              post: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                  media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!cart) return { items: [], subtotal: 0, tax: 0, total: 0, count: 0 }

  let subtotal = 0
  let tax = 0

  const items = cart.items.map((it) => {
    const price = Number(it.variant.price)
    const line = price * it.quantity
    const lineTax = (line * Number(it.variant.taxPercent)) / 100
    subtotal += line
    tax += lineTax

    return {
      id: it.id,
      variantId: it.variantId,
      quantity: it.quantity,
      price,
      lineTotal: line,
      label: it.variant.label,
      sku: it.variant.sku,
      stock: it.variant.stock,
      isActive: it.variant.isActive && it.variant.post.status === 'PUBLISHED',
      postId: it.variant.post.id,
      title: it.variant.post.title,
      slug: it.variant.post.slug,
      image: it.variant.post.media[0]?.url ?? null,
    }
  })

  return {
    items,
    subtotal: round(subtotal),
    tax: round(tax),
    total: round(subtotal + tax),
    count: items.reduce((n, i) => n + i.quantity, 0),
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

export async function addToCart(userId: string, variantId: string, quantity = 1) {
  if (quantity < 1 || quantity > MAX_PER_ITEM) {
    throw new CommerceError(
      `You can order between 1 and ${MAX_PER_ITEM} units of an item at a time.`,
      'BAD_QUANTITY'
    )
  }

  const variant = await prisma.merchandiseVariant.findUnique({
    where: { id: variantId },
    include: { post: { select: { status: true, title: true } } },
  })

  if (!variant) throw new CommerceError('This item could not be found.', 'NOT_FOUND')
  if (!variant.isActive || variant.post.status !== 'PUBLISHED') {
    throw new CommerceError('This item is not currently available for sale.', 'INACTIVE')
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  })

  const wanted = (existing?.quantity ?? 0) + quantity

  if (wanted > variant.stock) {
    throw new CommerceError(
      variant.stock === 0
        ? 'This item is out of stock.'
        : `Only ${variant.stock} left in stock. Please reduce the quantity.`,
      'OUT_OF_STOCK'
    )
  }
  if (wanted > MAX_PER_ITEM) {
    throw new CommerceError(
      `You can order at most ${MAX_PER_ITEM} units of an item at a time.`,
      'BAD_QUANTITY'
    )
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: wanted },
    create: { cartId: cart.id, variantId, quantity },
  })
}

export async function setCartQuantity(
  userId: string,
  itemId: string,
  quantity: number
) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { variant: true },
  })
  if (!item) throw new CommerceError('This item is not in your cart.', 'NOT_FOUND')

  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: itemId } })
    return
  }
  if (quantity > item.variant.stock) {
    throw new CommerceError(`Only ${item.variant.stock} left in stock. Please reduce the quantity.`, 'OUT_OF_STOCK')
  }
  if (quantity > MAX_PER_ITEM) {
    throw new CommerceError(`You can order at most ${MAX_PER_ITEM} units of an item at a time.`, 'BAD_QUANTITY')
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } })
}

export async function removeFromCart(userId: string, itemId: string) {
  await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } })
}

// ═══════════════════════════════════════════════════════════
//  Checkout
// ═══════════════════════════════════════════════════════════

export type ShippingAddress = {
  name: string
  phone: string
  address: string
  pincode: string
  city: string
  state: string
}

/** Flat rate below the threshold, free at or above it. */
export const FLAT_SHIPPING = 79

/**
 * A simple flat rule for now — a courier API can replace it later.
 *
 * The threshold comes from Site Settings rather than a constant, so the
 * number the admin sees on /admin/settings is the number checkout uses.
 * A threshold of 0 switches free shipping off entirely.
 */
async function shippingFor(subtotal: number): Promise<number> {
  const threshold = await freeShippingThreshold()
  if (threshold > 0 && subtotal >= threshold) return 0
  return FLAT_SHIPPING
}

export async function createOrder(userId: string, address: ShippingAddress, couponCode?: string | null) {
  const cart = await getCart(userId)
  if (!cart.items.length) {
    throw new CommerceError('Your cart is empty. Add an item before checking out.', 'EMPTY_CART')
  }

  const dead = cart.items.filter((i) => !i.isActive)
  if (dead.length) {
    throw new CommerceError(
      `${dead.map((d) => d.title).join(', ')} is no longer available for sale. Please remove it from your cart to continue.`,
      'INACTIVE'
    )
  }

  const shipping = await shippingFor(cart.subtotal)

  return prisma.$transaction(async (tx) => {
    // Coupon: re-checked here against the live cart, then one redemption taken
    // atomically so the last use cannot go to two buyers.
    let discount = 0
    let appliedCode: string | null = null
    if (couponCode && couponCode.trim()) {
      const q = await quoteCoupon(couponCode, cart.subtotal, cart.total, tx)
      if (!q.ok) throw new CommerceError(q.error, 'BAD_COUPON')
      if (!(await redeemCoupon(tx, q.couponId))) throw new CommerceError('This coupon has just been fully used.', 'BAD_COUPON')
      discount = q.discount
      appliedCode = q.code
    }

    // ★ Decrement stock conditionally, so two buyers cannot take the last item.
    //   updateMany + stock: { gte } together are atomic: if someone else took
    //   it in the meantime, count comes back 0 and we stop.
    for (const item of cart.items) {
      const res = await tx.merchandiseVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (res.count !== 1) {
        throw new CommerceError(
          `${item.title} just went out of stock. Please remove it from your cart and try again.`,
          'OUT_OF_STOCK'
        )
      }
    }

    const orderNumber = await nextOrderNumber(tx)

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        subtotal: new Prisma.Decimal(cart.subtotal),
        shipping: new Prisma.Decimal(shipping),
        tax: new Prisma.Decimal(cart.tax),
        discount: new Prisma.Decimal(discount),
        couponCode: appliedCode,
        total: new Prisma.Decimal(round(cart.total + shipping - discount)),
        status: 'PENDING',
        shippingName: address.name,
        shippingPhone: address.phone,
        shippingAddress: address.address,
        shippingPincode: address.pincode,
        shippingCity: address.city,
        shippingState: address.state,
        items: {
          create: cart.items.map((i) => ({
            postId: i.postId,
            variantId: i.variantId,
            title: i.title,
            variant: i.label,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: new Prisma.Decimal(i.price),
            lineTotal: new Prisma.Decimal(i.lineTotal),
          })),
        },
      },
    })

    const payment = await tx.payment.create({
      data: {
        userId,
        purpose: 'MERCHANDISE_ORDER',
        status: 'CREATED',
        amount: new Prisma.Decimal(round(Math.max(0, cart.subtotal + shipping - discount))),
        taxAmount: new Prisma.Decimal(cart.tax),
        totalAmount: new Prisma.Decimal(round(cart.total + shipping - discount)),
        referenceId: order.id,
        metadata: { orderNumber },
      },
    })

    await tx.order.update({
      where: { id: order.id },
      data: { paymentId: payment.id },
    })

    // Empty the cart
    await tx.cartItem.deleteMany({ where: { cart: { userId } } })

    return { order, paymentId: payment.id, shipping, discount }
  })
}

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.order.count()
  return `AF-${year}-${String(count + 1).padStart(5, '0')}`
}

/** Marks the order PAID once payment succeeds — idempotent */
export async function markOrderPaid(paymentId: string, gatewayPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new CommerceError('Payment record not found.', 'NOT_FOUND')
    if (payment.status === 'PAID') return { alreadyDone: true }

    const order = await tx.order.findUnique({
      where: { id: payment.referenceId ?? '' },
    })
    if (!order) throw new CommerceError('Order not found.', 'NOT_FOUND')

    // Return the result of the update, not the object read earlier — otherwise
    // the caller would still see the status as PENDING
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    })

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        razorpayPaymentId: gatewayPaymentId ?? null,
      },
    })

    await tx.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_PAID',
        title: 'Your order has been confirmed',
        body: `Order ${order.orderNumber} has been confirmed and will be dispatched shortly.`,
        link: '/dashboard/orders',
      },
    })

    return { alreadyDone: false, order: updated }
  })
}

/**
 * The buyer cancels their own order from "My Orders".
 *
 * Only allowed while the order is still PENDING (payment not completed) or PAID
 * (paid but not yet packed) — once the seller has PACKED/SHIPPED it, it is on
 * its way and can only be cancelled by contacting support. Cancelling returns
 * the exact size/colour stock (via variantId) so the item is sellable again,
 * marks a PAID order's payment REFUNDED (a mock refund until the live gateway
 * is wired), and tells the buyer.
 */
const BUYER_CANCELLABLE = ['PENDING', 'PAID']

export async function cancelOrderByBuyer(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    })
    if (!order) throw new CommerceError('Order not found.', 'NOT_FOUND')

    if (!BUYER_CANCELLABLE.includes(order.status)) {
      throw new CommerceError(
        order.status === 'CANCELLED' || order.status === 'REFUNDED'
          ? 'This order is already cancelled.'
          : 'This order has already been packed for dispatch, so it can no longer be cancelled online. Please contact support for help.',
        'NOT_CANCELLABLE'
      )
    }

    const wasPaid = order.status === 'PAID'

    // Return every line's stock to its exact variant
    for (const item of order.items) {
      await tx.merchandiseVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      })
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    })

    if (order.paymentId) {
      await tx.payment.updateMany({
        where: { id: order.paymentId },
        data: wasPaid
          ? { status: 'REFUNDED', refundedAt: new Date(), refundReason: 'Cancelled by buyer' }
          : { status: 'FAILED' },
      })
    }
    // An order cancelled before payment gives its coupon use back.
    if (!wasPaid && order.couponCode) await releaseCoupon(tx, order.couponCode)

    await tx.notification.create({
      data: {
        userId,
        type: 'ORDER_CANCELLED',
        title: 'Your order has been cancelled',
        body: wasPaid
          ? `Order ${order.orderNumber} was cancelled and a refund will be processed to your original payment method.`
          : `Order ${order.orderNumber} was cancelled.`,
        link: '/dashboard/orders',
      },
    })

    return updated
  })
}

/** Payment failed or cancelled — return the stock */
export async function releaseOrder(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment?.referenceId) return

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: payment.referenceId! },
      include: { items: true },
    })
    if (!order || order.status !== 'PENDING') return

    // Restore the exact size/colour via variantId — no guesswork
    for (const item of order.items) {
      await tx.merchandiseVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      })
    }

    await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } })
    await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } })
    if (order.couponCode) await releaseCoupon(tx, order.couponCode)
  })
}
