'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { getBrandLogos, processLogo, saveBrandLogos, type BrandLogo } from '@/lib/brand-logos'

export type BrandState = { ok: boolean; message: string } | null

const MAX_LOGOS = 40
const refresh = () => {
  revalidatePath('/admin/settings/brands')
  revalidatePath('/')
  revalidatePath('/club')
}
const cleanHref = (v: FormDataEntryValue | null): string | null | false => {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : false
  } catch {
    return false
  }
}
async function log(actorId: string, action: string, name: string) {
  await prisma.auditLog.create({ data: { actorId, action, entityType: 'SiteSetting', entityId: 'content.brandLogos', after: { name } } })
}

/** Upload a new logo and add it at the end of the strip. */
export async function addBrandLogoAction(_p: BrandState, fd: FormData): Promise<BrandState> {
  const admin = await requirePermission('admin:settings')
  const name = String(fd.get('name') ?? '').trim().slice(0, 60)
  const file = fd.get('file')
  const href = cleanHref(fd.get('href'))
  if (name.length < 2) return { ok: false, message: 'Enter the brand or organisation name.' }
  if (href === false) return { ok: false, message: 'The link must be a full http(s):// address.' }
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a logo file.' }
  const list = await getBrandLogos({ includeHidden: true })
  if (list.length >= MAX_LOGOS) return { ok: false, message: `The strip holds up to ${MAX_LOGOS} logos.` }
  const up = await processLogo(file)
  if (!up.ok) return { ok: false, message: up.error }
  await saveBrandLogos([...list, { id: randomBytes(6).toString('hex'), name, src: up.url, href, active: true }])
  await log(admin.id, 'BRAND_LOGO_ADDED', name)
  refresh()
  return { ok: true, message: `${name} added.` }
}

/** Rename, relink, replace the image, or show/hide one logo. */
export async function updateBrandLogoAction(_p: BrandState, fd: FormData): Promise<BrandState> {
  const admin = await requirePermission('admin:settings')
  const id = String(fd.get('id') ?? '')
  const name = String(fd.get('name') ?? '').trim().slice(0, 60)
  const href = cleanHref(fd.get('href'))
  if (name.length < 2) return { ok: false, message: 'Enter the brand or organisation name.' }
  if (href === false) return { ok: false, message: 'The link must be a full http(s):// address.' }
  const list = await getBrandLogos({ includeHidden: true })
  const cur = list.find((l) => l.id === id)
  if (!cur) return { ok: false, message: 'That logo no longer exists.' }
  let src = cur.src
  const file = fd.get('file')
  if (file instanceof File && file.size > 0) {
    const up = await processLogo(file)
    if (!up.ok) return { ok: false, message: up.error }
    src = up.url
  }
  const next: BrandLogo = { ...cur, name, href, src, active: fd.get('active') === 'on' }
  await saveBrandLogos(list.map((l) => (l.id === id ? next : l)))
  await log(admin.id, 'BRAND_LOGO_UPDATED', name)
  refresh()
  return { ok: true, message: 'Saved.' }
}

/** Move one place left/right, or remove. */
export async function brandLogoOpAction(fd: FormData): Promise<void> {
  const admin = await requirePermission('admin:settings')
  const id = String(fd.get('id') ?? '')
  const op = String(fd.get('op') ?? '')
  const list = await getBrandLogos({ includeHidden: true })
  const i = list.findIndex((l) => l.id === id)
  if (i < 0) return
  if (op === 'DELETE') {
    await saveBrandLogos(list.filter((l) => l.id !== id))
    await log(admin.id, 'BRAND_LOGO_REMOVED', list[i].name)
  } else if (op === 'UP' || op === 'DOWN') {
    const j = op === 'UP' ? i - 1 : i + 1
    if (j < 0 || j >= list.length) return
    const copy = [...list]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    await saveBrandLogos(copy)
  }
  refresh()
}
