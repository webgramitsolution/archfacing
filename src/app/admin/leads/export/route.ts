import type { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/guard'
import { listLeads } from '@/lib/admin-leads'

/**
 * GET /admin/leads/export — the leads list as CSV, with exactly the tab,
 * filters, search and sort the admin is looking at (same query string).
 * Pages through listLeads so the rows and the screen use one query.
 */
export const dynamic = 'force-dynamic'

const MAX_ROWS = 5000
const PAGE = 200

function cell(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  await requirePermission('admin:leads')
  const p = req.nextUrl.searchParams
  const base = {
    tab: p.get('tab') ?? 'all',
    status: p.get('status') ?? undefined,
    category: p.get('category') ?? undefined,
    source: p.get('source') ?? undefined,
    location: p.get('location') ?? undefined,
    q: p.get('q') ?? undefined,
    sort: p.get('sort') ?? undefined,
    project: p.get('project') ?? undefined,
    assignee: p.get('assignee') ?? undefined,
    from: p.get('from') ?? undefined,
    to: p.get('to') ?? undefined,
  }

  const lines = [
    ['Received', 'Status', 'Name', 'Phone', 'Email', 'Subject', 'Category', 'Source', 'Listing', 'PIN', 'City', 'State', 'Direct recipient', 'PACT recipients'].map(cell).join(','),
  ]
  for (let page = 1; (page - 1) * PAGE < MAX_ROWS; page++) {
    const { rows, pages } = await listLeads({ ...base, page, perPage: PAGE })
    for (const r of rows) {
      lines.push([
        r.createdAt.toISOString().replace('T', ' ').slice(0, 16), r.status, r.contactName, r.contactPhone, r.contactEmail,
        r.subject, r.category, r.sourceLabel, r.sourceTitle, r.pincode, r.city, r.state,
        r.direct ? (r.direct.company ?? r.direct.name) : '', r.pactCount,
      ].map(cell).join(','))
    }
    if (page >= pages) break
  }

  const today = new Date().toISOString().slice(0, 10)
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="archfacing-leads-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
