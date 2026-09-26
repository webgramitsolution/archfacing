import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/upload'
import { getVerificationConfig } from '@/lib/verification-config'

/**
 * Verification documents — uploaded by the member (dashboard settings) or by
 * an admin on their behalf (/admin/users/[id], the Add wizards).
 *
 * The document types offered are the active ones from Verification Settings.
 * BuyerProfile.documentsCount mirrors the number of non-rejected documents,
 * which is what the queue's minimum-documents rule checks.
 */

export class DocError extends Error {}

const MAX_DOCS_PER_USER = 30

/** Recount and store a buyer's usable documents. Harmless for non-buyers. */
export async function syncDocumentCount(userId: string) {
  const n = await prisma.verificationDocument.count({ where: { userId, status: { not: 'REJECTED' } } })
  await prisma.buyerProfile.updateMany({ where: { userId }, data: { documentsCount: n, submittedAt: new Date() } })
  return n
}

export async function addVerificationDocument(params: {
  ownerId: string
  uploaderId: string
  docTypeId: string
  file: File
}) {
  const cfg = await getVerificationConfig()
  const type = cfg.documentTypes.find((d) => d.id === params.docTypeId && d.active)
  if (!type) throw new DocError('Pick a document type from the list.')
  const count = await prisma.verificationDocument.count({ where: { userId: params.ownerId } })
  if (count >= MAX_DOCS_PER_USER) throw new DocError('This account already has the maximum number of documents.')

  const isPdf = params.file.type === 'application/pdf' || params.file.name.toLowerCase().endsWith('.pdf')
  const up = await uploadFile({
    userId: params.ownerId,
    file: params.file,
    kind: isPdf ? 'PDF' : 'IMAGE',
    aspect: 'free',
    folder: 'verification',
  })
  if (!up.ok) throw new DocError(up.error)

  const doc = await prisma.verificationDocument.create({
    data: {
      userId: params.ownerId,
      docTypeId: type.id,
      docName: type.name,
      url: up.url,
      storageKey: up.key,
      fileName: params.file.name.slice(0, 200),
      mimeType: up.mimeType,
      sizeBytes: up.sizeBytes,
      uploadedById: params.uploaderId,
    },
  })
  await syncDocumentCount(params.ownerId)
  return doc
}
