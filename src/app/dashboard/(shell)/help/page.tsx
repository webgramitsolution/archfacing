import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { HelpView } from './help-view'
import { supportEmail, supportPhone } from '@/lib/settings'

export const metadata = { title: 'Help & Support · ArchFacing' }

export default async function HelpPage() {
  const user = await requireAuth()
  const openTickets = await prisma.supportTicket
    .count({ where: { userId: user.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } })
    .catch(() => 0)

  const [email, phone] = await Promise.all([supportEmail(), supportPhone()])
  return <HelpView openTickets={openTickets} supportEmail={email} supportPhone={phone} />
}
