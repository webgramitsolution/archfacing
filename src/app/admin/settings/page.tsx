import Link from 'next/link'
import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead } from '@/components/admin/parts'
import {
  SITE_SETTINGS,
  SETTING_KEYS,
  toFormValue,
} from '@/config/site-settings'
import { SettingsForm } from './settings-form'

export const metadata: Metadata = { title: 'Site Settings' }

export default async function AdminSettingsPage() {
  await requirePermission('admin:settings')

  // one read for every key — a missing row falls back to its declared default
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SETTING_KEYS } },
  })
  const stored = new Map(rows.map((r) => [r.key, r.value]))

  const initial: Record<string, string> = {}
  for (const def of SITE_SETTINGS) {
    initial[def.key] = toFormValue(
      stored.has(def.key) ? stored.get(def.key) : def.default
    )
  }

  const unset = SITE_SETTINGS.filter((d) => !stored.has(d.key)).length

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Website Settings"
        action={
          <Link href="/admin/settings/brands" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Trusted Brands (logo strip) ›</Link>
        }
      >
        Values the platform reads while it runs — contact details, commerce
        defaults, listing behaviour and site-wide notices. A change takes effect
        as soon as it is saved.
        {unset > 0 && ` ${unset} of ${SITE_SETTINGS.length} settings are on their built-in defaults.`}
      </AdminPageHead>

      <SettingsForm initial={initial} />
    </div>
  )
}
