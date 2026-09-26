import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { getStorage } from '@/lib/storage'
import { BRAND_LOGOS } from '@/config/brand-logos'

/**
 * The "Trusted by leading brands & organisations" logo strip (home page and
 * club page), managed from /admin/settings/brands.
 *
 * Stored as one SiteSetting row ('content.brandLogos'). Until an admin saves
 * the list for the first time, the logos in src/config/brand-logos.ts are
 * shown, so nothing disappears when this ships.
 */

export type BrandLogo = { id: string; name: string; src: string; href: string | null; active: boolean }
export const BRAND_LOGOS_KEY = 'content.brandLogos'

export async function getBrandLogos(opts: { includeHidden?: boolean } = {}): Promise<BrandLogo[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: BRAND_LOGOS_KEY } }).catch(() => null)
  const list: BrandLogo[] = Array.isArray(row?.value)
    ? (row!.value as unknown[]).flatMap((v) => {
        const o = v as Partial<BrandLogo>
        return o && typeof o.id === 'string' && typeof o.src === 'string' && typeof o.name === 'string'
          ? [{ id: o.id, name: o.name, src: o.src, href: typeof o.href === 'string' ? o.href : null, active: o.active !== false }]
          : []
      })
    : BRAND_LOGOS.map((b, i) => ({ id: `seed-${i}`, name: b.name, src: b.src, href: null, active: true }))
  return opts.includeHidden ? list : list.filter((l) => l.active)
}

export async function saveBrandLogos(list: BrandLogo[]) {
  await prisma.siteSetting.upsert({
    where: { key: BRAND_LOGOS_KEY },
    create: { key: BRAND_LOGOS_KEY, value: list },
    update: { value: list },
  })
}

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Prepares an uploaded logo so any file looks right in the strip:
 *   · SVG, PNG, JPG or WebP in; the real type is sniffed, not trusted;
 *   · the empty border around the artwork is trimmed, so a logo delivered
 *     with a big white or transparent margin is not drawn tiny;
 *   · fitted inside 800×320 (never enlarged) and saved as WebP, keeping any
 *     transparency — a JPEG would turn a transparent background black.
 * The tile then centres it with padding (object-contain), whatever its shape.
 */
export async function processLogo(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: 'The file is empty.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Logos must be under 5 MB.' }
  const buf = Buffer.from(await file.arrayBuffer())
  let meta
  try {
    meta = await sharp(buf).metadata()
  } catch {
    return { ok: false, error: 'This file is not an image we can read. Use SVG, PNG, JPG or WebP.' }
  }
  if (!meta.format || !['svg', 'png', 'jpeg', 'webp', 'gif'].includes(meta.format)) {
    return { ok: false, error: 'Use an SVG, PNG, JPG or WebP logo.' }
  }
  let out: Buffer
  try {
    const base = sharp(buf, { density: 300 }).rotate()
    // trim() throws on a single-colour image; fall back to the untrimmed one.
    const trimmed = await base.clone().trim({ threshold: 12 }).toBuffer().catch(() => null)
    out = await sharp(trimmed ?? (await base.toBuffer()))
      .resize({ width: 800, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer()
  } catch {
    return { ok: false, error: 'This logo could not be processed. Try a PNG export.' }
  }
  const stored = await getStorage().put({ key: `brands/${randomBytes(10).toString('hex')}.webp`, body: out, mimeType: 'image/webp' })
  return { ok: true, url: stored.url }
}
