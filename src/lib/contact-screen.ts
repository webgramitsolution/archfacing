import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { findPhoneNumbers } from './phone-detect'

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

async function prepared(buf: Buffer, invert: boolean): Promise<Buffer> {
  let img = sharp(buf, { failOn: 'none' }).rotate().greyscale()
  const meta = await sharp(buf, { failOn: 'none' }).metadata()
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
  const results = await Promise.all(
    files.map(async (f) => ({ label: f.label, hits: await phonesInImage(Buffer.from(await f.file.arrayBuffer())) }))
  )
  const bad = results.find((r) => r.hits.length)
  return bad ? { label: bad.label, number: bad.hits[0] } : null
}
