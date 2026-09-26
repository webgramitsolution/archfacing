import { requirePermission } from '@/lib/guard'
import { csvCell } from '@/lib/csv'
import { reportOverview } from '@/lib/admin-reports'

/**
 * GET /admin/reports/export — the Reports page as a CSV.
 *
 * Same permission as the page, same `reportOverview()` query, so the file
 * and the screen can never disagree. Three sections: the headline figures,
 * this month's activity summary, and the 30-day daily series.
 */

export const dynamic = 'force-dynamic'

/** RFC 4180 quoting — a company name with a comma must not split a column. */
function cell(v: string | number | null): string {
  return csvCell(v)
}
const row = (...cells: (string | number | null)[]) => cells.map(cell).join(',')

export async function GET() {
  await requirePermission('admin:reports')
  const r = await reportOverview()
  const today = new Date().toISOString().slice(0, 10)

  const lines: string[] = [
    row('ArchFacing — Reports export', today),
    '',
    row('Headline figures'),
    row('Metric', 'Value', 'Change vs last month (%)'),
    ...r.stats.map((s) => row(s.label, s.value, s.pct)),
    '',
    row('Activity this month'),
    row('Activity', 'This month', 'Change vs last month (%)'),
    ...r.summary.map((s) => row(s.label, s.count, s.pct)),
    '',
    row('Top users by orders'),
    row('User / Company', 'Orders', 'Total value (INR)'),
    ...r.topOrders.map((u) => row(u.name, u.orders, u.value)),
    '',
    row('Last 30 days'),
    row('Date', 'Orders', 'Revenue (INR)', 'Enquiries', 'RFQs'),
    ...r.ordersRevenue.labels.map((label, i) =>
      row(label, r.ordersRevenue.bars[i], r.ordersRevenue.line[i], r.enquiriesRfqs.bars[i], r.enquiriesRfqs.line[i]),
    ),
  ]

  // A BOM so Excel opens the ₹ and the Indian names correctly.
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="archfacing-report-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
