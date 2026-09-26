/**
 * Mock payment provider — used until a real Razorpay account exists.
 *
 * It collects no real money. Pressing "Pay" marks the payment as successful, so
 * the entire PACT flow — reservation, activation, expiry — can be tested
 * without a gateway.
 *
 * ⚠️ It disables itself in production — see index.ts. If no real provider is
 *    configured under NODE_ENV=production the app refuses to start, so free
 *    PACTs can never be handed out by accident.
 */

import { randomBytes } from 'node:crypto'
import type {
  PaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  WebhookVerification,
} from './types'

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const
  readonly isLive = false

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const orderId = `mock_order_${randomBytes(10).toString('hex')}`

    console.log(
      `\n💳 [MOCK] Order created — no real money was collected\n` +
        `   ₹${input.amount.toLocaleString('en-IN')} · ${input.purpose}\n` +
        `   ${input.userEmail}\n` +
        `   order: ${orderId}\n`
    )

    // checkout: null means the UI should not open a gateway popup and should
    // show the mock "confirm" button instead
    return { orderId, checkout: null }
  }

  verifyWebhook(): WebhookVerification {
    // The mock never receives webhooks — confirmation comes from a server action
    return { ok: false, reason: 'The mock provider does not accept webhooks' }
  }

  verifyCheckout(): boolean {
    return false
  }

  async refund(gatewayPaymentId: string, amount: number) {
    console.log(
      `💳 [MOCK] Refund ₹${amount.toLocaleString('en-IN')} — ${gatewayPaymentId}`
    )
    return {
      ok: true,
      refundId: `mock_refund_${randomBytes(8).toString('hex')}`,
    }
  }
}
