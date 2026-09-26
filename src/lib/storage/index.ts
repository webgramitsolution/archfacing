/**
 * This is where the active storage backend is decided.
 *
 *   R2 keys are set  → Cloudflare R2
 *   Not set          → local disk (public/uploads)
 *
 * This differs from payments in one way: local disk is allowed in production.
 * A mock payment would hand out free PACTs, whereas local storage only fills up
 * the server's disk — the downside is smaller, so we let the app start and just
 * log a warning.
 */

import type { StorageProvider } from './types'
import { LocalStorageProvider } from './local'
import { R2StorageProvider } from './r2'

export type { StorageProvider, StoredFile } from './types'

let cached: StorageProvider | null = null

export function getStorage(): StorageProvider {
  if (cached) return cached

  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = process.env.R2_BUCKET?.trim()
  const publicUrl = process.env.R2_PUBLIC_URL?.trim()

  if (accountId && accessKey && secretKey && bucket && publicUrl) {
    cached = new R2StorageProvider(accountId, accessKey, secretKey, bucket, publicUrl)
    return cached
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️  R2 is not configured — files are being written to the server disk. ' +
        'Set the R2_* keys before traffic grows.'
    )
  }

  cached = new LocalStorageProvider()
  return cached
}
