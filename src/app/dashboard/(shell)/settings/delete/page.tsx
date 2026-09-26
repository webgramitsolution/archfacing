import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { DeleteAccount } from './delete-account'

export const metadata = { title: 'Delete Account · ArchFacing' }

export default async function Page() {
  const user = await requireAuth()
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } })
  return <DeleteAccount email={me?.email ?? ''} />
}
