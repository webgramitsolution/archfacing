import type { PaymentPurpose, PaymentStatus } from '@prisma/client'
import { requirePermission } from '@/lib/guard'
import { csvCell } from '@/lib/csv'
import { prisma } from '@/lib/prisma'

/** GET /admin/payments/export?status=&purpose= — the ledger as CSV, same filters as the page. */
export const dynamic = 'force-dynamic'

const STATUSES = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']

export async function GET(req: Request) {
  await requirePermission('admin:payments')
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? ''
  const purpose = url.searchParams.get('purpose') ?? ''
  const rows = await prisma.payment.findMany({
    where: {
      ...(STATUSES.includes(status) ? { status: status as PaymentStatus } : {}),
      ...(/^[A-Z_]{3,40}$/.test(purpose) ? { purpose: purpose as PaymentPurpose } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20_000,
    select: {
      id: true, invoiceNumber: true, purpose: true, status: true, totalAmount: true, refundedAmount: true,
      refundReason: true, razorpayPaymentId: true, paidAt: true, createdAt: true,
      user: { select: { name: true, email: true } },
    },
  })
  const cell = (v: string) => csvCell(v)
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : '')
  const lines = [
    'Invoice,Payment ID,Name,Email,Purpose,Status,Amount (INR),Refunded (INR),Refund reason,Gateway ID,Created,Paid',
    ...rows.map((r) => [
      r.invoiceNumber ?? '', r.id, r.user.name, r.user.email, r.purpose, r.status,
      Number(r.totalAmount).toFixed(2), Number(r.refundedAmount).toFixed(2), r.refundReason ?? '',
      r.razorpayPaymentId ?? '', d(r.createdAt), d(r.paidAt),
    ].map(cell).join(',')),
  ]
  const today = new Date().toISOString().slice(0, 10)
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="archfacing-payments-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
