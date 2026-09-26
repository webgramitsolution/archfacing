/**
 * Razorpay provider — fully written, only waiting on keys.
 *
 * To enable it, set the following in .env:
 *   RAZORPAY_KEY_ID="rzp_live_xxx"      (or rzp_test_xxx)
 *   RAZORPAY_KEY_SECRET="xxx"
 *   RAZORPAY_WEBHOOK_SECRET="xxx"
 *
 * That alone makes the app drop the mock and use this provider — no other file
 * needs to change.
 *
 * Also add the webhook in the Razorpay dashboard:
 *   URL    : https://archfacing.com/api/payments/webhook
 *   Events : payment.captured, payment.failed, refund.processed
 *
 * The npm `razorpay` package is deliberately not used here — their REST API is
 * straightforward and this keeps one dependency out of the project.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  PaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  WebhookVerification,
} from './types'

const API = 'https://api.razorpay.com/v1'

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay' as const
  readonly isLive = true

  constructor(
    private keyId: string,
    private keySecret: string,
    private webhookSecret: string
  ) {}

  private authHeader() {
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    return `Basic ${token}`
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Razorpay expects the amount in paise
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        // Our own Payment id — it comes back to us in the webhook
        receipt: input.paymentId,
        notes: { ...input.notes, paymentId: input.paymentId, purpose: input.purpose },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Could not create the Razorpay order (${res.status}): ${body}`)
    }

    const order = (await res.json()) as { id: string; amount: number; currency: string }

    return {
      orderId: order.id,
      checkout: {
        keyId: this.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'ArchFacing',
        description: input.description,
        prefill: {
          name: input.userName,
          email: input.userEmail,
          contact: input.userMobile ?? undefined,
        },
      },
    }
  }

  /**
   * ★ This is the real safeguard. Without it, anyone could send a forged
   *   "payment.captured" event and obtain a PACT for free.
   */
  verifyWebhook(rawBody: string, signature: string): WebhookVerification {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (!safeEqual(expected, signature)) {
      return { ok: false, reason: 'The webhook signature did not match' }
    }

    let payload: {
      event?: string
      payload?: {
        payment?: { entity?: { id?: string; amount?: number; notes?: Record<string, string> } }
        refund?: { entity?: { id?: string; amount?: number; notes?: Record<string, string> } }
      }
    }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return { ok: false, reason: 'The request body is not valid JSON' }
    }

    const event = payload.event
    if (
      event !== 'payment.captured' &&
      event !== 'payment.failed' &&
      event !== 'refund.processed'
    ) {
      return { ok: false, reason: `Unrecognised event: ${event}` }
    }

    const entity =
      event === 'refund.processed'
        ? payload.payload?.refund?.entity
        : payload.payload?.payment?.entity

    const paymentId = entity?.notes?.paymentId
    if (!paymentId || !entity?.id) {
      return { ok: false, reason: 'No paymentId was found in the webhook notes' }
    }

    return {
      ok: true,
      event,
      paymentId,
      gatewayPaymentId: entity.id,
      amount: (entity.amount ?? 0) / 100,
    }
  }

  verifyCheckout(orderId: string, gatewayPaymentId: string, signature: string): boolean {
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${gatewayPaymentId}`)
      .digest('hex')
    return safeEqual(expected, signature)
  }

  async refund(gatewayPaymentId: string, amount: number, reason: string) {
    const res = await fetch(`${API}/payments/${gatewayPaymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        notes: { reason },
      }),
    })

    if (!res.ok) {
      return { ok: false, error: `Refund fail (${res.status}): ${await res.text()}` }
    }

    const data = (await res.json()) as { id: string }
    return { ok: true, refundId: data.id }
  }
}
