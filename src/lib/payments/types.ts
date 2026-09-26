/**
 * The payment provider contract.
 *
 * ⚠️ The rest of the codebase knows only this interface, never a concrete
 *    gateway. That is why the whole PACT flow works without Razorpay — and once
 *    the keys arrive, switching to the live gateway is only an .env change,
 *    with no other code to touch.
 *
 * Today:  MockProvider     (dev — succeeds immediately)
 * Later:  RazorpayProvider (live — as soon as the keys are set in env)
 */

import type { PaymentPurpose } from '@prisma/client'

export type CreateOrderInput = {
  /** Our own Payment row id — sent to the gateway as the reference */
  paymentId: string
  /** In rupees (not paise — the provider converts it itself) */
  amount: number
  currency: 'INR'
  purpose: PaymentPurpose
  userId: string
  userEmail: string
  userName: string
  userMobile?: string | null
  /** The description shown in the gateway's dashboard */
  description: string
  notes?: Record<string, string>
}

export type CreateOrderResult = {
  /** The gateway's order id — stored in Payment.razorpayOrderId */
  orderId: string
  /**
   * What the frontend needs in order to open checkout.
   * This is null for the mock provider — there is no checkout there.
   */
  checkout: {
    keyId: string
    orderId: string
    amount: number
    currency: string
    name: string
    description: string
    prefill: { name: string; email: string; contact?: string }
  } | null
}

export type WebhookVerification =
  | {
      ok: true
      event: 'payment.captured' | 'payment.failed' | 'refund.processed'
      /** Our own Payment row id */
      paymentId: string
      gatewayPaymentId: string
      amount: number
    }
  | { ok: false; reason: string }

export interface PaymentProvider {
  /** Identity — shown in logs and the admin panel */
  readonly name: 'mock' | 'razorpay'

  /** Does it collect real money, or is it only a simulation? */
  readonly isLive: boolean

  /** Creates an order on the gateway */
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>

  /**
   * Verifies the webhook signature.
   * ⚠️ Never skip this — without verification anyone could send a forged
   *    "payment successful" event and obtain a PACT for free.
   */
  verifyWebhook(rawBody: string, signature: string): WebhookVerification

  /**
   * Verifies the signature returned by the browser after checkout.
   * This is not a substitute for the webhook — it exists only to show the user
   * a prompt "done" confirmation. The authoritative confirmation always comes
   * from the webhook.
   */
  verifyCheckout(
    orderId: string,
    gatewayPaymentId: string,
    signature: string
  ): boolean

  /** §6.1.2.2.6 — a maximum refund of 25% */
  refund(gatewayPaymentId: string, amount: number, reason: string): Promise<{
    ok: boolean
    refundId?: string
    error?: string
  }>
}
