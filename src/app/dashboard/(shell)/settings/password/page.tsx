import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { SettingsPanel } from '../settings-parts'
import { Icon } from '@/components/ui'
import { ChangePassword } from './change-password'

export const metadata = { title: 'Change Password · ArchFacing' }

export default async function Page() {
  const user = await requireAuth()
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  const hasPassword = !!row?.passwordHash

  if (!hasPassword) {
    return (
      <SettingsPanel icon="shield" title="Change Password" subtitle="Keep your account secure">
        <div className="flex items-start gap-3 rounded-card border border-info/20 bg-info-soft px-4 py-3.5">
          <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <div className="text-[13px] text-ink-2">
            <p className="font-semibold text-ink">You sign in with a one-time code (OTP)</p>
            <p className="mt-1 leading-relaxed">
              Your account has no password — each sign-in uses a fresh code sent to your email, which is
              more secure than a password you have to remember. There is nothing to change here.
            </p>
          </div>
        </div>
      </SettingsPanel>
    )
  }

  return (
    <SettingsPanel icon="shield" title="Change Password" subtitle="Keep your account secure">
      <ChangePassword />
    </SettingsPanel>
  )
}
