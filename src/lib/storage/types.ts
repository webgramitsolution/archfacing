/**
 * The file storage contract.
 *
 * As with payments, the rest of the codebase knows only this interface.
 * Files currently go to the local disk; once R2/S3 keys are available, an .env
 * change alone moves them to the cloud.
 */

export type StoredFile = {
  /** The path stored in the DB — e.g. "posts/abc123.jpg" */
  key: string
  /** The full URL that can be opened in a browser */
  url: string
  sizeBytes: number
  mimeType: string
  width?: number
  height?: number
}

export interface StorageProvider {
  readonly name: 'local' | 'r2'
  /** Real cloud storage, or the local disk used in development? */
  readonly isCloud: boolean

  put(args: {
    key: string
    body: Buffer
    mimeType: string
  }): Promise<StoredFile>

  delete(key: string): Promise<void>

  /** Builds the public URL for a key */
  urlFor(key: string): string
}
