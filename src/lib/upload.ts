/**
 * File upload — following the rules in PDF §7.10.
 *
 * Video is not handled here. §7.10.2 specified MP4 upload, but we take a
 * YouTube/Dailymotion link instead — see `src/lib/video.ts`.
 *
 * Every upload passes three checks:
 *   1. Real file type — from the file's leading bytes, not its extension
 *   2. Size — the limits in §7.10
 *   3. Quota — §4.4 (VII), whether the user has space left
 *
 * Images are then re-encoded, which:
 *   · strips EXIF data (including GPS coordinates)
 *   · neutralises any payload hidden inside the image
 *   · reduces the file size
 */

import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import type { CreativePalette } from './ad-creative'
import { prisma } from './prisma'
import { getStorage } from './storage'
import { UPLOAD_LIMITS, IMAGE_ASPECT } from '@/config/permissions'

export type UploadKind = 'IMAGE' | 'PDF' | 'PPT' | 'DOCUMENT'

export type UploadResult =
  | {
      ok: true
      key: string
      url: string
      sizeBytes: number
      mimeType: string
      width?: number
      height?: number
      /** Present only when `analysePalette` was asked for. */
      palette?: CreativePalette
    }
  | { ok: false; error: string }

/**
 * The colours of an image's edges, for a caller that has to extend it.
 *
 * An advertisement creative rarely matches its slot's shape, and the gap has
 * to be filled with something that continues the artwork. Reading that colour
 * here — once, from the buffer already in hand — is the only place it can be
 * done cheaply: the alternative is downloading the pixels in the browser and
 * reading them off a canvas on every render of every preview.
 *
 * The outer 8% of each side is averaged rather than the single edge column,
 * because one column of a photograph is noise.
 */
async function analyse(clean: Buffer): Promise<CreativePalette | undefined> {
  try {
    const meta = await sharp(clean).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h) return undefined

    const strip = Math.max(1, Math.round(w * 0.08))

    /** The average colour of one region, as `#rrggbb`. */
    const avg = async (left: number): Promise<string> => {
      const { channels } = await sharp(clean)
        .extract({ left, top: 0, width: strip, height: h })
        .stats()
      const [r, g, b] = channels
      const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
      return `#${hex(r.mean)}${hex(g.mean)}${hex(b.mean)}`
    }

    const [left, right, stats] = await Promise.all([
      avg(0),
      avg(Math.max(0, w - strip)),
      sharp(clean).stats(),
    ])

    const d = stats.dominant
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    const dominant = `#${hex(d.r)}${hex(d.g)}${hex(d.b)}`

    // Rec. 601 luma of the whole image — decides whether the generated
    // backdrop carries white type or dark.
    const [rc, gc, bc] = stats.channels
    const luma = 0.299 * rc.mean + 0.587 * gc.mean + 0.114 * bc.mean

    return { left, right, dominant, isDark: luma < 130 }
  } catch (e) {
    // A preview with a fallback colour is fine; a failed upload is not.
    console.error('Creative palette analysis failed:', e)
    return undefined
  }
}

// ═══════════════════════════════════════════════════════════
//  Detecting the real file type (magic bytes)
// ═══════════════════════════════════════════════════════════

/**
 * ⚠️ Both the extension and the content-type reported by the browser can lie.
 *    Uploading a PHP script named `.jpg` is a long-standing attack. So we
 *    identify the real type from the file's leading bytes.
 */
function detectType(buf: Buffer): string | null {
  if (buf.length < 8) return null

  // JPEG — FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'

  // PNG — 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png'
  }

  // WebP — RIFF....WEBP
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    return 'image/webp'
  }

  // PDF — %PDF
  if (buf.subarray(0, 4).toString() === '%PDF') return 'application/pdf'

  // ZIP-based — docx, xlsx, pptx (PK\x03\x04)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05)) {
    return 'application/zip'
  }

  // Legacy MS Office — D0 CF 11 E0
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return 'application/x-ole-storage'
  }

  return null
}

const ALLOWED_BY_KIND: Record<UploadKind, string[]> = {
  // §7.10.1 of the PDF specifies JPG; we also accept PNG/WebP because that is
  // what people actually send — we convert them to JPEG
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  PDF: ['application/pdf'],
  PPT: ['application/zip', 'application/x-ole-storage'],
  DOCUMENT: ['application/zip', 'application/x-ole-storage'],
}

// ═══════════════════════════════════════════════════════════
//  Quota — §4.4 (VII)
// ═══════════════════════════════════════════════════════════

export async function checkQuota(userId: string, incomingBytes: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageQuotaMb: true, storageUsedMb: true },
  })
  if (!user) return { ok: false as const, error: 'User not found.' }

  const incomingMb = incomingBytes / (1024 * 1024)
  const afterMb = user.storageUsedMb + incomingMb

  if (afterMb > user.storageQuotaMb) {
    const leftMb = Math.max(0, user.storageQuotaMb - user.storageUsedMb)
    return {
      ok: false as const,
      error:
        `Not enough storage — ${leftMb.toFixed(1)} MB remaining, but this upload ` +
        `needs ${incomingMb.toFixed(1)} MB. Please free up space or purchase a Portal Space.`,
    }
  }

  return { ok: true as const, afterMb }
}

async function addUsage(userId: string, bytes: number) {
  const mb = Math.ceil(bytes / (1024 * 1024))
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedMb: { increment: mb } },
  })
}

// ═══════════════════════════════════════════════════════════
//  The main upload routine
// ═══════════════════════════════════════════════════════════

export async function uploadFile(params: {
  userId: string
  file: File
  kind: UploadKind
  /**
   * §7.10.1 — landscape 5:3, and 16:9 on certain forms.
   *
   * `free` accepts any shape. It exists for pictures placed *inside* an
   * article — an image-grid tile is square or portrait as often as not, and
   * the ratio rule exists for cover images on a listing card, where a mixed
   * set of shapes would break the grid. Everything else still applies to a
   * `free` upload: the size cap, the magic-byte type check, the quota, and
   * the re-encode that strips EXIF and GPS.
   */
  aspect?: 'default' | 'wide' | 'free'
  folder?: string
  /**
   * Measure the image's edge colours as well as its size.
   *
   * Only advertisement creatives need this — they are the only images the
   * app has to extend into a slot of a different shape.
   */
  analysePalette?: boolean
}): Promise<UploadResult> {
  const {
    userId, file, kind, aspect = 'default', folder = 'posts', analysePalette = false,
  } = params
  const limits = UPLOAD_LIMITS[kind]

  // ─── Size ───
  if (file.size === 0) return { ok: false, error: 'The file is empty. Please choose another file.' }
  if (file.size > limits.maxBytes) {
    const maxMb = limits.maxBytes / (1024 * 1024)
    const gotMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      ok: false,
      error: `This file is ${gotMb} MB — the limit is ${maxMb} MB. Please upload a smaller file.`,
    }
  }

  const buf = Buffer.from(await file.arrayBuffer())

  // ─── Real file type ───
  const realType = detectType(buf)
  if (!realType || !ALLOWED_BY_KIND[kind].includes(realType)) {
    return {
      ok: false,
      error: `This file does not appear to be ${limits.label}. Please upload it in the correct format.`,
    }
  }

  // ─── Quota ───
  const quota = await checkQuota(userId, file.size)
  if (!quota.ok) return { ok: false, error: quota.error }

  const storage = getStorage()
  const id = randomBytes(12).toString('hex')

  // ─── Images: re-encode ───
  if (kind === 'IMAGE') {
    try {
      const meta = await sharp(buf).metadata()
      const width = meta.width ?? 0
      const height = meta.height ?? 0

      if (!width || !height) {
        return { ok: false, error: 'This image could not be read. Please try a different file.' }
      }

      // Shape rules — skipped entirely for `free`; see the `aspect` doc above
      if (aspect !== 'free') {
        // §7.10.1 — the image must be landscape
        if (height >= width) {
          return {
            ok: false,
            error: 'The image must be landscape (wider than it is tall), not portrait.',
          }
        }

        const wanted = aspect === 'wide' ? IMAGE_ASPECT.wide : IMAGE_ASPECT.default
        const actual = width / height
        const drift = Math.abs(actual - wanted) / wanted

        if (drift > IMAGE_ASPECT.toleranceRatio) {
          const label = aspect === 'wide' ? '16:9' : '5:3'
          return {
            ok: false,
            error:
              `The image aspect ratio should be close to ${label}. ` +
              `It is currently ${actual.toFixed(2)}:1 — please crop it and upload again.`,
          }
        }
      }

      // Re-encode without EXIF — this strips GPS data and any hidden payload
      const clean = await sharp(buf)
        .rotate() // apply the EXIF orientation, then discard it
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer()

      const cleanMeta = await sharp(clean).metadata()
      const stored = await storage.put({
        key: `${folder}/${id}.jpg`,
        body: clean,
        mimeType: 'image/jpeg',
      })

      await addUsage(userId, clean.byteLength)

      return {
        ok: true,
        key: stored.key,
        url: stored.url,
        sizeBytes: clean.byteLength,
        mimeType: 'image/jpeg',
        width: cleanMeta.width,
        height: cleanMeta.height,
        palette: analysePalette ? await analyse(clean) : undefined,
      }
    } catch (e) {
      console.error('Image processing failed:', e)
      return { ok: false, error: 'This image could not be processed. Please try a different file.' }
    }
  }

  // ─── All other files are stored as-is ───
  const ext = kind === 'PDF' ? 'pdf' : kind === 'PPT' ? 'pptx' : 'docx'
  const stored = await storage.put({
    key: `${folder}/${id}.${ext}`,
    body: buf,
    mimeType: realType === 'application/zip' ? file.type || realType : realType,
  })

  await addUsage(userId, buf.byteLength)

  return {
    ok: true,
    key: stored.key,
    url: stored.url,
    sizeBytes: buf.byteLength,
    mimeType: stored.mimeType,
  }
}

/** When a post is deleted, remove its files and return the quota */
export async function deleteUploads(userId: string, keys: string[], bytes: number) {
  const storage = getStorage()
  await Promise.all(keys.map((k) => storage.delete(k)))

  const mb = Math.ceil(bytes / (1024 * 1024))
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedMb: { decrement: mb } },
  })
}
