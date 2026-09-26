/**
 * This is where the active payment provider is decided.
 *
 *   RAZORPAY_KEY_ID is set          → Razorpay
 *   Empty, and running in dev       → Mock (no real money)
 *   Empty, and running in production→ ❌ the app refuses to start
 *
 * That last rule is deliberately strict. If the mock provider ever ran in
 * production, everyone would get a PACT for free — and PACT is this platform's
 * revenue.
 */

import type { PaymentProvider } from './types'
import { MockPaymentProvider } from './mock'
import { RazorpayProvider } from './razorpay'

export type { PaymentProvider, CreateOrderInput, CreateOrderResult } from './types'

let cached: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached

  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()

  if (keyId && keySecret && webhookSecret) {
    cached = new RazorpayProvider(keyId, keySecret, webhookSecret)
    return cached
  }

  // Some keys set, others missing — better to fail loudly than fall back to mock
  if (keyId || keySecret || webhookSecret) {
    throw new Error(
      'Only some of the Razorpay keys are set. All three are required: ' +
        'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET'
    )
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'A payment gateway is required in production. Set the Razorpay keys in .env — ' +
        'the mock provider collects no real money and would hand out free PACTs.'
    )
  }

  cached = new MockPaymentProvider()
  return cached
}

/** Tells the UI whether a live gateway is currently in use */
export function isPaymentLive(): boolean {
  try {
    return getPaymentProvider().isLive
  } catch {
    return false
  }
}
