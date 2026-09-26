import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { Icon } from '@/components/ui'
import { SettingsMenu } from './settings-menu'
import { profilePathFor } from '@/lib/profile-path'

/**
 * The Settings shell — the gear header and the left rail that every settings
 * sub-page shares. It sits inside the dashboard `(shell)` layout, so the
 * sidebar and top bar are already in place; this only adds the settings
 * chrome around whichever sub-page is open.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  const profileHref = profilePathFor(user.role)

  return (
    <div className="space-y-5">
      {/* ═══════════ header ═══════════ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
            <Icon name="settings" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold leading-tight text-navy">Settings</h1>
            <p className="mt-1 text-[13px] leading-snug text-ink-3">
              Manage your account settings, notification preferences and privacy options.
            </p>
          </div>
        </div>
        <Link href={profileHref} className="btn-outline px-4 py-2 text-[13px]">
          <Icon name="user" className="h-4 w-4" />
          View Profile
        </Link>
      </header>

      {/* ═══════════ menu + page ═══════════ */}
      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-4">
          <SettingsMenu />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
