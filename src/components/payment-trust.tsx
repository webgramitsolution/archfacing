import Image from 'next/image'

/**
 * "100% Secure Payment By Razorpay" trust strip — the supplied badge artwork
 * (PAYMENT-GETWAY-2-1), shown as-is. The image already carries the Razorpay
 * lockup and every wallet/bank mark, so it needs no chrome around it.
 */
export function PaymentTrust({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/img/payment-gateway.webp"
        alt="100% Secure Payment By Razorpay — VISA, MasterCard, UPI, RuPay, Google Pay, PhonePe, Paytm, Amazon Pay, JioMoney and all Indian wallets, banks & netbanking"
        width={1497}
        height={258}
        sizes="(max-width: 640px) 100vw, 640px"
        className="h-auto w-full"
      />
    </div>
  )
}

/** The Razorpay chevron mark. */
export function RazorpayMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M22 4 9 40h7l6-16 3 9-4 7h7L40 4h-7l-6 17-3-9 4-8h-6z" fill="#3395FF" />
      <path d="M22 4 9 40h7l6-16z" fill="#072654" />
    </svg>
  )
}
