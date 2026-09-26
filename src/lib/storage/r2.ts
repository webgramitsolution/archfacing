/**
 * Cloudflare R2 storage — fully written, waiting on keys.
 *
 * To enable it, set the following in .env:
 *   R2_ACCOUNT_ID="..."
 *   R2_ACCESS_KEY_ID="..."
 *   R2_SECRET_ACCESS_KEY="..."
 *   R2_BUCKET="archfacing"
 *   R2_PUBLIC_URL="https://cdn.archfacing.com"   (or the r2.dev URL)
 *
 * R2's API mirrors S3, so there is no need to pull in the AWS SDK — the SigV4
 * signature is built here instead. One less dependency.
 */

import { createHash, createHmac } from 'node:crypto'
import type { StorageProvider, StoredFile } from './types'

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2' as const
  readonly isCloud = true

  private endpoint: string

  constructor(
    accountId: string,
    private accessKey: string,
    private secretKey: string,
    private bucket: string,
    private publicUrl: string
  ) {
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  }

  /** AWS SigV4 — the scheme R2 accepts */
  private sign(method: string, key: string, body: Buffer, mimeType: string) {
    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const region = 'auto'
    const service = 's3'
    const payloadHash = sha256Hex(body)

    const canonicalHeaders =
      `content-type:${mimeType}\n` +
      `host:${url.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

    const canonicalRequest = [
      method,
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const scope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256Hex(canonicalRequest),
    ].join('\n')

    const kDate = hmac(`AWS4${this.secretKey}`, dateStamp)
    const kRegion = hmac(kDate, region)
    const kService = hmac(kRegion, service)
    const kSigning = hmac(kService, 'aws4_request')
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

    return {
      url: url.toString(),
      headers: {
        'Content-Type': mimeType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization:
          `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
    }
  }

  async put({
    key,
    body,
    mimeType,
  }: {
    key: string
    body: Buffer
    mimeType: string
  }): Promise<StoredFile> {
    const { url, headers } = this.sign('PUT', key, body, mimeType)

    // fetch does not accept a Buffer directly — pass a Uint8Array view
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: new Uint8Array(body),
    })
    if (!res.ok) {
      throw new Error(`R2 upload fail (${res.status}): ${await res.text()}`)
    }

    return {
      key,
      url: this.urlFor(key),
      sizeBytes: body.byteLength,
      mimeType,
    }
  }

  async delete(key: string): Promise<void> {
    const empty = Buffer.alloc(0)
    const { url, headers } = this.sign('DELETE', key, empty, 'application/octet-stream')
    await fetch(url, { method: 'DELETE', headers })
  }

  urlFor(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`
  }
}
