/**
 * Local disk storage — used until R2/S3 is available.
 *
 * Files go into `public/uploads/`, so Next.js serves them directly and no extra
 * route is needed.
 *
 * ⚠️ This is only suitable for development and small deployments. Under real
 *    traffic, images will consume the server's bandwidth — switch to R2 then.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { StorageProvider, StoredFile } from './types'

const ROOT = path.join(process.cwd(), 'public', 'uploads')

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const
  readonly isCloud = false

  async put({
    key,
    body,
    mimeType,
  }: {
    key: string
    body: Buffer
    mimeType: string
  }): Promise<StoredFile> {
    const full = path.join(ROOT, key)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body)

    return {
      key,
      url: this.urlFor(key),
      sizeBytes: body.byteLength,
      mimeType,
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(ROOT, key))
    } catch {
      // Already gone — nothing to do
    }
  }

  urlFor(key: string): string {
    return `/uploads/${key}`
  }
}
