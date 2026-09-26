/**
 * Reading the settings an admin edits at /admin/settings (§7.11.1.9).
 *
 * ⚠️ A setting that nothing reads is worse than no setting at all — the admin
 *    changes a number, the screen says it saved, and the site keeps behaving
 *    the old way. So anything listed in `src/config/site-settings.ts` must be
 *    read through this module at the point where it actually matters.
 *
 * Values are cached for a minute. Settings change a handful of times a year,
 * and without a cache every cart page would add a database round trip.
 */

import { prisma } from './prisma'
import { SITE_SETTINGS, type SettingKey } from '@/config/site-settings'

type Cache = { at: number; values: Map<string, unknown> }

const TTL_MS = 60_000
let cache: Cache | null = null

function defaultFor(key: string): unknown {
  return SITE_SETTINGS.find((s) => s.key === key)?.default
}

async function load(): Promise<Map<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SITE_SETTINGS.map((s) => s.key) } },
  })

  const values = new Map<string, unknown>()
  for (const row of rows) values.set(row.key, row.value)

  cache = { at: Date.now(), values }
  return values
}

/**
 * Call after a save so the next read does not serve a stale value.
 *
 * This clears the cache in the process that handled the save. Under a
 * multi-worker deployment the other workers keep their copy until the TTL
 * runs out, so a change can take up to a minute to reach every visitor.
 * That is acceptable for settings; it would not be for anything that
 * decides money or access.
 */
export function clearSettingsCache() {
  cache = null
}

/**
 * One setting, falling back to the declared default when no row exists.
 * A saved row of the wrong shape also falls back, so a bad write can never
 * take a page down.
 */
export async function getSetting<T = unknown>(key: SettingKey): Promise<T> {
  const values = await load()
  const stored = values.get(key)
  return (stored === undefined || stored === null ? defaultFor(key) : stored) as T
}

export async function getNumberSetting(key: SettingKey, fallback = 0): Promise<number> {
  const raw = await getSetting(key)
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export async function getBooleanSetting(key: SettingKey, fallback = false): Promise<boolean> {
  const raw = await getSetting(key)
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}

export async function getStringSetting(key: SettingKey, fallback = ''): Promise<string> {
  const raw = await getSetting(key)
  return typeof raw === 'string' ? raw : raw == null ? fallback : String(raw)
}

// ═══════════════════════════════════════════════════════════
//  Named readers, so callers never repeat a key string
// ═══════════════════════════════════════════════════════════

/** ₹ — orders at or above this ship free. 0 switches free shipping off. */
export function freeShippingThreshold(): Promise<number> {
  return getNumberSetting('commerce.freeShippingThreshold', 1500)
}

export function defaultGstPercent(): Promise<number> {
  return getNumberSetting('commerce.defaultGstPercent', 18)
}

export function postsPerPage(): Promise<number> {
  return getNumberSetting('content.postsPerPage', 12)
}

export function moderateNewPosts(): Promise<boolean> {
  return getBooleanSetting('content.moderateNewPosts', true)
}

export function supportEmail(): Promise<string> {
  return getStringSetting('contact.supportEmail', 'support@archfacing.com')
}

export function supportPhone(): Promise<string> {
  return getStringSetting('contact.supportPhone', '')
}

/** The banner is hidden when the text is blank. */
export async function announcement(): Promise<{ text: string; link: string } | null> {
  const text = (await getStringSetting('platform.announcementBanner', '')).trim()
  if (!text) return null
  return { text, link: (await getStringSetting('platform.announcementLink', '')).trim() }
}

export function maintenanceMode(): Promise<boolean> {
  return getBooleanSetting('platform.maintenanceMode', false)
}
