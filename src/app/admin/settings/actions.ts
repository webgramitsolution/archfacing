'use server'

/**
 * §7.11.1.9 — site settings.
 *
 * The SiteSetting table is a key/value store. Only the keys declared in
 * `src/config/site-settings.ts` are accepted here — anything else is ignored.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { clearSettingsCache } from '@/lib/settings'
import {
  SITE_SETTINGS,
  SETTING_KEYS,
  type SettingDef,
} from '@/config/site-settings'

export type SettingsState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  /** What the admin submitted — so an error never wipes the form */
  values?: Record<string, string>
  saved?: number
}

type SettingValue = string | number | boolean

/** One zod schema per kind — §7.11.1.9 */
function schemaFor(def: SettingDef) {
  switch (def.kind) {
    case 'number': {
      let s = z.coerce
        .number({ invalid_type_error: 'Enter a number' })
        .finite('Enter a number')
      if (def.min !== undefined) s = s.min(def.min, `Cannot be less than ${def.min}`)
      if (def.max !== undefined) s = s.max(def.max, `Cannot be more than ${def.max}`)
      return s
    }
    case 'email':
      return z.string().email('Enter a valid email address')
    case 'url':
      return z.string().url('Enter a full URL, including https://')
    case 'textarea':
      return z.string().max(600, 'Please keep this under 600 characters')
    default:
      return z.string().max(200, 'Please keep this under 200 characters')
  }
}

export async function saveSettingsAction(
  _prev: SettingsState | null,
  formData: FormData
): Promise<SettingsState> {
  const admin = await requirePermission('admin:settings')

  const values: Record<string, string> = {}
  const fieldErrors: Record<string, string> = {}
  const parsed: Record<string, SettingValue> = {}

  for (const def of SITE_SETTINGS) {
    if (def.kind === 'boolean') {
      const on = formData.get(def.key) === 'on'
      values[def.key] = on ? 'true' : 'false'
      parsed[def.key] = on
      continue
    }

    const raw = formData.get(def.key)
    const text = typeof raw === 'string' ? raw.trim() : ''
    values[def.key] = text

    if (!text) {
      if (def.required) {
        fieldErrors[def.key] = `${def.label} cannot be left blank.`
        continue
      }
      parsed[def.key] = ''
      continue
    }

    const result = schemaFor(def).safeParse(text)
    if (!result.success) {
      fieldErrors[def.key] = result.error.issues[0]?.message ?? 'This value is not valid.'
      continue
    }
    parsed[def.key] = result.data
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: 'Some settings need to be corrected — nothing has been saved.',
      fieldErrors,
      values,
    }
  }

  // read once, then write only what actually moved
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SETTING_KEYS } },
  })
  const stored = new Map(rows.map((r) => [r.key, r.value]))

  const changed = SITE_SETTINGS.filter((def) => {
    const before = stored.has(def.key) ? stored.get(def.key) : def.default
    return JSON.stringify(before) !== JSON.stringify(parsed[def.key])
  })

  if (changed.length === 0) {
    return { ok: true, saved: 0, values }
  }

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const def of changed) {
    before[def.key] = stored.has(def.key) ? stored.get(def.key) : def.default
    after[def.key] = parsed[def.key]
  }

  await prisma.$transaction(
    changed.map((def) =>
      prisma.siteSetting.upsert({
        where: { key: def.key },
        create: { key: def.key, value: parsed[def.key] },
        update: { value: parsed[def.key] },
      })
    )
  )

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SITE_SETTINGS_UPDATED',
      entityType: 'SiteSetting',
      entityId: changed.length === 1 ? changed[0].key : 'site-settings',
      before: before as Prisma.InputJsonObject,
      after: after as Prisma.InputJsonObject,
    },
  })

  // Settings are cached for a minute when read, so drop that cache here —
  // otherwise the admin saves a value and the site keeps using the old one.
  clearSettingsCache()

  revalidatePath('/admin/settings')
  // the tagline, banner and maintenance flag are read on every page
  revalidatePath('/', 'layout')

  return { ok: true, saved: changed.length, values }
}
