import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { activePlanName } from '@/lib/membership'
import { Icon } from '@/components/ui'
import { SettingsPanel, InfoRow } from './settings-parts'

export const metadata = { title: 'Account Settings · ArchFacing' }

const ROLE_LABEL: Record<string, string> = {
  PROFESSIONAL: 'Professional',
  CONSULTANT: 'Consultant',
  BMF: 'BMF',
  CORPORATE: 'Corporate',
  CLIENT: 'Client',
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
}

function fmt(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export default async function AccountOverviewPage() {
  const auth = await requireAuth()

  const [u, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        name: true, email: true, mobile: true, mobileVerified: true, emailVerified: true,
        role: true, status: true, city: true, state: true, pincode: true, sellerSlug: true,
        createdAt: true, lastLoginAt: true,
      },
    }),
    activePlanName(auth.id),
  ])

  if (!u) return null

  const location = [u.city, u.state].filter(Boolean).join(', ') || '—'
  const statusTone =
    u.status === 'ACTIVE' ? 'pill-ok' : u.status === 'PENDING_VERIFICATION' ? 'pill-warn' : 'pill-muted'

  return (
    <SettingsPanel icon="user" title="Account Overview" subtitle="View and update your basic information">
      {/* identity strip */}
      <div className="mb-5 flex items-center gap-3.5 rounded-card border border-line-soft bg-paper-2 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-[17px] font-bold text-white">
          {auth.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={auth.profilePhoto} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            u.name?.[0]?.toUpperCase() ?? '?'
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-ink">{u.name}</p>
          <p className="truncate text-[12.5px] text-ink-3">{u.email}</p>
        </div>
        <span className={`pill ${statusTone} ml-auto text-[11px]`}>{u.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="grid gap-x-8 md:grid-cols-2">
        <InfoRow label="Account type" value={ROLE_LABEL[u.role] ?? u.role} />
        <InfoRow label="Membership plan" value={plan ?? 'No active plan'} />
        <InfoRow label="Email" value={<span className="inline-flex items-center gap-1.5">{u.email}{u.emailVerified && <Icon name="shield" className="h-3.5 w-3.5 text-info" />}</span>} />
        <InfoRow label="Phone" value={u.mobile ? <span className="inline-flex items-center gap-1.5">{u.mobile}{u.mobileVerified && <Icon name="shield" className="h-3.5 w-3.5 text-info" />}</span> : 'Not added'} />
        <InfoRow label="Location" value={location} />
        <InfoRow label="PIN code (PACT)" value={u.pincode ?? '—'} />
        <InfoRow label="Member since" value={fmt(u.createdAt)} />
        <InfoRow label="Last sign-in" value={fmt(u.lastLoginAt)} />
      </div>

      {u.sellerSlug && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-info/20 bg-info-soft px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-ink">Your storefront address</p>
            <p className="truncate text-[12px] text-ink-3">archfacing.com/{u.sellerSlug}</p>
          </div>
          <Link href={`/${u.sellerSlug}`} className="btn-outline shrink-0 px-3.5 py-1.5 text-[12.5px]">
            <Icon name="globe2" className="h-4 w-4" />
            View
          </Link>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link href="/dashboard/settings/personal" className="btn-outline px-4 py-2 text-[13px]">
          <Icon name="edit" className="h-4 w-4" />
          Edit personal information
        </Link>
        <Link href="/dashboard/settings/notifications" className="btn-outline px-4 py-2 text-[13px]">
          <Icon name="bell" className="h-4 w-4" />
          Notification settings
        </Link>
      </div>
    </SettingsPanel>
  )
}
