import type { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/guard'
import { csvCell } from '@/lib/csv'
import { prisma } from '@/lib/prisma'

/**
 * GET /admin/user-activity/export?days=30 — the activity / audit log as CSV:
 * who did what, to which record, from which device, and whether it worked.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requirePermission('admin:reports')
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 86_400_000)
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 20000,
    select: { createdAt: true, action: true, entityType: true, entityId: true, status: true, device: true, ipAddress: true, actor: { select: { name: true, email: true, role: true } } },
  })
  const cell = (v: unknown) => csvCell(v)
  const lines = [
    'When,Who,Email,Role,Action,Record type,Record id,Status,Device,IP',
    ...rows.map((r) => [r.createdAt.toISOString().replace('T', ' ').slice(0, 19), r.actor?.name ?? 'System', r.actor?.email, r.actor?.role, r.action, r.entityType, r.entityId, r.status, r.device, r.ipAddress].map(cell).join(',')),
  ]
  const today = new Date().toISOString().slice(0, 10)
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="archfacing-activity-${days}d-${today}.csv"`, 'Cache-Control': 'no-store' },
  })
}
