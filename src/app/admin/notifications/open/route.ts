import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminShell } from '@/lib/guard'
import { prisma } from '@/lib/prisma'

/**
 * GET /admin/notifications/open?id=… — marks one notification read and goes
 * where it points. Only the owner's own row is touched, and only a same-site
 * path is ever followed.
 */
export async function GET(req: NextRequest) {
  const me = await requireAdminShell()
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const n = /^[a-z0-9]{10,40}$/i.test(id)
    ? await prisma.notification.findFirst({ where: { id, userId: me.id }, select: { id: true, link: true } })
    : null
  if (n) await prisma.notification.update({ where: { id: n.id }, data: { isRead: true } })
  const to = n?.link && n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/admin/notifications'
  return NextResponse.redirect(new URL(to, req.url))
}
