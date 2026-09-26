'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { getPaymentProvider } from '@/lib/payments'
import { BUSINESS_RULES } from '@/config/permissions'

export type RefundState = { ok: boolean; message: string } | null

/**
 * §6.1.2.2.6 — a refund of at most 25% of the amount paid, within 15 days of
 * payment. Several partial refunds are allowed as long as their total stays
 * under the cap. The gateway is called first; the ledger only moves if it
 * accepted the refund.
 */
export async function refundPaymentAction(_p: RefundState, fd: FormData): Promise<RefundState> {
  const admin = await requirePermission('admin:payments')
  const id = z.string().regex(/^[a-z0-9]{10,40}$/i).safeParse(fd.get('id'))
  const amount = Math.round(Number(fd.get('amount')) * 100) / 100
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 300)
  if (!id.success) return { ok: false, message: 'Payment not found.' }
  if (!(amount > 0)) return { ok: false, message: 'Enter an amount above ₹0.' }
  if (reason.length < 4) return { ok: false, message: 'Give a reason for the refund.' }

  const p = await prisma.payment.findUnique({
    where: { id: id.data },
    select: { id: true, userId: true, status: true, totalAmount: true, refundedAmount: true, paidAt: true, razorpayPaymentId: true, invoiceNumber: true },
  })
  if (!p) return { ok: false, message: 'Payment not found.' }
  if (p.status !== 'PAID' && p.status !== 'PARTIALLY_REFUNDED') return { ok: false, message: 'Only a paid transaction can be refunded.' }
  const paidAt = p.paidAt ?? new Date(0)
  const windowEnd = paidAt.getTime() + BUSINESS_RULES.REFUND_WINDOW_DAYS * 86_400_000
  if (Date.now() > windowEnd) return { ok: false, message: `The ${BUSINESS_RULES.REFUND_WINDOW_DAYS}-day refund window has closed.` }

  const total = Number(p.totalAmount)
  const already = Number(p.refundedAmount)
  const cap = Math.floor(total * BUSINESS_RULES.REFUND_MAX_PERCENT) / 100
  const left = Math.max(0, Math.round((cap - already) * 100) / 100)
  if (amount > left) return { ok: false, message: left > 0 ? `At most ₹${left.toLocaleString('en-IN')} can still be refunded (${BUSINESS_RULES.REFUND_MAX_PERCENT}% cap).` : 'The refund cap for this payment is used up.' }

  const r = await getPaymentProvider().refund(p.razorpayPaymentId ?? p.id, amount, reason)
  if (!r.ok) return { ok: false, message: r.error ?? 'The payment gateway refused the refund.' }

  const ref = p.invoiceNumber ?? `#${p.id.slice(-8)}`
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: p.id },
      data: { refundedAmount: { increment: amount }, refundedAt: new Date(), refundReason: reason, status: 'PARTIALLY_REFUNDED' },
    }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'PAYMENT_REFUND', entityType: 'Payment', entityId: p.id, after: { amount, reason, refundId: r.refundId ?? null } },
    }),
    prisma.notification.create({
      data: {
        userId: p.userId, type: 'PAYMENT_REFUND', title: 'A refund is on its way',
        body: `₹${amount.toLocaleString('en-IN')} of ${ref} is being refunded to your original payment method.`,
        link: '/dashboard/settings',
      },
    }),
  ])
  revalidatePath('/admin/payments')
  return { ok: true, message: `Refunded ₹${amount.toLocaleString('en-IN')}.` }
}
