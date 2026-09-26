'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The left rail of the Settings area. Every row is a real route; the active one
 * is decided from the URL so the highlight is always correct after a reload or
 * a direct link. "Delete Account" carries the danger styling the reference
 * gives it.
 */

export type SettingsLink = { label: string; desc: string; icon: IconName; href: string; danger?: boolean }

export const SETTINGS_LINKS: SettingsLink[] = [
  { label: 'Account Overview', desc: 'View and update your basic information', icon: 'user', href: '/dashboard/settings' },
  { label: 'Personal Information', desc: 'Update your name, email, phone and profile details', icon: 'edit', href: '/dashboard/settings/personal' },
  { label: 'Business Information', desc: 'Manage your company details', icon: 'building', href: '/dashboard/settings/business' },
  { label: 'Verification Documents', desc: 'Upload ID and business proofs for verification', icon: 'file', href: '/dashboard/settings/documents' },
  { label: 'Change Password', desc: 'Keep your account secure', icon: 'shield', href: '/dashboard/settings/password' },
  { label: 'Notification Settings', desc: 'Manage how you receive notifications', icon: 'bell', href: '/dashboard/settings/notifications' },
  { label: 'Privacy & Security', desc: 'Control your privacy and security preferences', icon: 'eye', href: '/dashboard/settings/privacy' },
  { label: 'Connected Accounts', desc: 'Link your social media accounts', icon: 'share', href: '/dashboard/settings/connected' },
  { label: 'Email Preferences', desc: 'Manage marketing and promotional emails', icon: 'mail', href: '/dashboard/settings/email' },
  { label: 'Language & Region', desc: 'Set your language and location preferences', icon: 'globe', href: '/dashboard/settings/language' },
  { label: 'Delete Account', desc: 'Permanently delete your account', icon: 'trash', href: '/dashboard/settings/delete', danger: true },
]

export function SettingsMenu() {
  const pathname = usePathname()
  // On a phone the full rail would sit above every sub-page, so on a sub-page
  // it is replaced by a link back to the index. Tablet and desktop unchanged.
  const onSubPage = pathname !== '/dashboard/settings'

  return (
    <>
    {onSubPage && (
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline md:hidden"
      >
        ← All settings
      </Link>
    )}
    <nav aria-label="Settings" className={cn('flex flex-col gap-1.5', onSubPage && 'hidden md:flex')}>
      {SETTINGS_LINKS.map((l) => {
        const active = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-start gap-3 rounded-card border px-3.5 py-3 transition-colors',
              active
                ? 'border-info/30 bg-info-soft'
                : l.danger
                  ? 'border-transparent hover:border-danger/25 hover:bg-danger-soft'
                  : 'border-transparent hover:border-line hover:bg-paper-2'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                active
                  ? 'bg-info text-white'
                  : l.danger
                    ? 'bg-danger-soft text-danger'
                    : 'bg-paper-3 text-ink-3 group-hover:text-ink-2'
              )}
            >
              <Icon name={l.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className={cn('block text-[13.5px] font-semibold', active ? 'text-info' : l.danger ? 'text-danger' : 'text-ink')}>
                {l.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{l.desc}</span>
            </span>
          </Link>
        )
      })}
    </nav>
    </>
  )
}
