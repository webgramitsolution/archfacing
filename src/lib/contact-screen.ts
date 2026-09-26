import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { findPhoneNumbers } from './phone-detect'
import { UPLOAD_LIMITS } from '@/config/permissions'

/**
 * Reads the text printed on listing images (OCR) and reports any phone
 * number found — the image half of the "no contact details on listings" rule.
 *
 * Two passes per image: as uploaded, then colour-inverted, because Tesseract
 * reads dark text on a light ground far better than the reverse and a phone
 * number is often white on a banner. Images are shrunk/enlarged to ~1600px
 * and greyscaled first. Workers are created once and reused.
 *
 * If OCR itself fails the image is let through (and logged) — every listing
 * is still reviewed by a moderator before it goes live, and a broken OCR
 * engine must not stop the whole site from posting.
 */

type Recognize = (img: Buffer) => Promise<string>

const g = globalThis as unknown as { __afOcr?: Promise<Recognize> }

async function engine(): Promise<Recognize> {
  if (!g.__afOcr) {
    g.__afOcr = (async () => {
      const { createScheduler, createWorker } = await import('tesseract.js')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lang = require('@tesseract.js-data/eng') as { langPath: string; gzip: boolean }
      const scheduler = createScheduler()
      for (let i = 0; i < 2; i++) {
        const w = await createWorker('eng', 1, {
          langPath: lang.langPath,
          gzip: lang.gzip,
          cacheMethod: 'none',
          cachePath: path.join(os.tmpdir(), 'archfacing-ocr'),
        })
        scheduler.addWorker(w)
      }
      return async (img: Buffer) => {
        const r = await scheduler.addJob('recognize', img)
        return r.data.text ?? ''
      }
    })().catch((e) => {
      g.__afOcr = undefined
      throw e
    })
  }
  return g.__afOcr
}

/** OCR confusions inside numbers: O→0, l/I/|→1, S→5, B→8 — only between digits. */
function fixDigits(text: string): string {
  let t = text
  for (let i = 0; i < 2; i++) {
    t = t
      .replace(/(\d)[Oo](?=[\d\s-])/g, '$10').replace(/(\d[\s-]?)[Oo](\d)/g, '$10$2')
      .replace(/(\d)[lI|](?=[\d\s-])/g, '$11').replace(/(\d[\s-]?)[lI|](\d)/g, '$11$2')
      .replace(/(\d)S(?=\d)/g, '$15').replace(/(\d)B(?=\d)/g, '$18')
  }
  return t
}

/** Refuse to decode anything larger than this many pixels (decompression bombs). */
const MAX_INPUT_PIXELS = 40_000_000

/**
 * Cheap pre-check before OCR touches a file: within the IMAGE size cap and a
 * real JPEG / PNG / WebP by its leading bytes. Anything else is skipped here —
 * uploadFile() rejects it right after with the proper message.
 */
function isScreenableImage(buf: Buffer): boolean {
  if (buf.length < 12 || buf.length > UPLOAD_LIMITS.IMAGE.maxBytes) return false
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  const webp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP'
  return jpeg || png || webp
}

async function prepared(buf: Buffer, invert: boolean): Promise<Buffer> {
  const opts = { failOn: 'none' as const, limitInputPixels: MAX_INPUT_PIXELS }
  let img = sharp(buf, opts).rotate().greyscale()
  const meta = await sharp(buf, opts).metadata()
  const w = meta.width ?? 1600
  img = img.resize({ width: w < 1000 ? 1400 : Math.min(w, 1400) })
  img = img.normalize()
  if (invert) img = img.negate({ alpha: false })
  return img.png().toBuffer()
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | undefined
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error('OCR timeout')), ms) })])
  } finally {
    if (t) clearTimeout(t)
  }
}

/** Phone numbers visible in one image (empty when none, or when OCR fails). */
export async function phonesInImage(buf: Buffer): Promise<string[]> {
  try {
    const read = await engine()
    for (const invert of [false, true]) {
      const text = fixDigits(await withTimeout(read(await prepared(buf, invert)), 25_000))
      const hits = findPhoneNumbers(text)
      if (hits.length) return hits
    }
    return []
  } catch (e) {
    console.error('Contact screen OCR failed — image let through for moderator review:', e)
    return []
  }
}

/** Screen several uploads; returns the first offending file and number, or null. */
export async function screenImagesForPhones(
  files: { file: File; label: string }[]
): Promise<{ label: string; number: string } | null> {
  // One image at a time, and only files that pass the size / type pre-check,
  // so a large or malformed upload cannot tie up the OCR workers.
  for (const f of files) {
    if (f.file.size === 0 || f.file.size > UPLOAD_LIMITS.IMAGE.maxBytes) continue
    const buf = Buffer.from(await f.file.arrayBuffer())
    if (!isScreenableImage(buf)) continue
    const hits = await phonesInImage(buf)
    if (hits.length) return { label: f.label, number: hits[0] }
  }
  return null
}
