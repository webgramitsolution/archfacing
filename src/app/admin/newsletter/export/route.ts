import { requirePermission } from '@/lib/guard'
import { csvCell } from '@/lib/csv'
import { prisma } from '@/lib/prisma'

/** GET /admin/newsletter/export — active subscribers as CSV, for the mailing tool. */
export const dynamic = 'force-dynamic'

export async function GET() {
  await requirePermission('admin:reports')
  const rows = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { email: true, source: true, createdAt: true, confirmedAt: true },
  })
  const cell = (v: string) => csvCell(v)
  const lines = ['Email,Source,Subscribed,Confirmed', ...rows.map((r) =>
    [r.email, r.source, r.createdAt.toISOString().slice(0, 10), r.confirmedAt ? r.confirmedAt.toISOString().slice(0, 10) : ''].map(cell).join(','))]
  const today = new Date().toISOString().slice(0, 10)
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="archfacing-newsletter-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
