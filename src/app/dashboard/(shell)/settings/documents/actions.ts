'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { addVerificationDocument, DocError, syncDocumentCount } from '@/lib/verification-docs'
import { getVerificationConfig } from '@/lib/verification-config'

export type DocState = { ok: boolean; message: string } | null

function refresh(userId: string) {
  revalidatePath('/dashboard/settings/documents')
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/visitors/verification')
}

/** A member uploads one of their own verification documents. */
export async function uploadMyDocumentAction(_p: DocState, fd: FormData): Promise<DocState> {
  const me = await requireAuth()
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a file to upload.' }
  try {
    const doc = await addVerificationDocument({ ownerId: me.id, uploaderId: me.id, docTypeId: String(fd.get('docTypeId') ?? ''), file })
    await prisma.auditLog.create({ data: { actorId: me.id, action: 'DOCUMENT_UPLOADED', entityType: 'User', entityId: me.id, after: { document: doc.docName, self: true } } })
    // Let the default reviewer know there is something new to look at.
    const cfg = await getVerificationConfig()
    if (cfg.defaultReviewerId && cfg.defaultReviewerId !== me.id) {
      await prisma.notification.create({
        data: { userId: cfg.defaultReviewerId, type: 'DOCUMENT_UPLOADED', title: 'New verification document', body: `${me.name} uploaded ${doc.docName}.`, link: `/admin/users/${me.id}` },
      })
    }
  } catch (e) {
    if (e instanceof DocError) return { ok: false, message: e.message }
    throw e
  }
  refresh(me.id)
  return { ok: true, message: 'Uploaded — our team will review it.' }
}

/** Withdraw a document that has not been accepted yet. */
export async function removeMyDocumentAction(fd: FormData): Promise<void> {
  const me = await requireAuth()
  const id = String(fd.get('id') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return
  const gone = await prisma.verificationDocument.deleteMany({ where: { id, userId: me.id, status: { not: 'ACCEPTED' } } })
  if (gone.count) {
    await syncDocumentCount(me.id)
    await prisma.auditLog.create({ data: { actorId: me.id, action: 'DOCUMENT_WITHDRAWN', entityType: 'User', entityId: me.id } })
  }
  refresh(me.id)
}
