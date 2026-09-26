'use server'

/**
 * User verification — §3.1.8.1.
 *
 * After registration, professionals and consultants stay in
 * PENDING_VERIFICATION. ArchFacing only moves them to ACTIVE after
 * checking their qualification (the COA number for architects) —
 * only then can they buy a PACT and publish posts.
 */

import { revalidatePath } from 'next/cache'
import type { Role, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail } from '@/lib/mailer'
import { getVerificationConfig } from '@/lib/verification-config'
import { GRANTABLE_KEYS, STAFF_ROLES } from '@/config/permissions'
import { addVerificationDocument, DocError, syncDocumentCount } from '@/lib/verification-docs'

export async function pendingUsers() {
  await requirePermission('admin:users')
  return prisma.user.findMany({
    where: { status: 'PENDING_VERIFICATION', deletedAt: null },
    include: {
      professionalProfile: { include: { qualifications: true } },
      consultantProfile: { include: { qualifications: true } },
      bmfProfile: true,
      corporateProfile: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function allUsers(q?: string) {
  await requirePermission('admin:users')
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { notIn: ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE'] },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { pincode: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      pincode: true, state: true, createdAt: true,
      _count: { select: { pacts: true, posts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

/** §3.1.8.1 — activate the account after checking the qualification */
export async function verifyUserAction(userId: string) {
  const admin = await requirePermission('admin:users')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!user) return { ok: false, error: 'User not found.' }
  // Notify / email toggles — Verification Settings → workflow.
  const cfg = await getVerificationConfig()

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    })

    // mark the profile as verified too
    await tx.professionalProfile.updateMany({
      where: { userId },
      data: { isVerified: true, verifiedAt: new Date(), verifiedById: admin.id, coaVerified: true },
    })
    await tx.consultantProfile.updateMany({
      where: { userId },
      data: { isVerified: true, verifiedAt: new Date() },
    })
    await tx.bmfProfile.updateMany({ where: { userId }, data: { isVerified: true } })
    await tx.corporateProfile.updateMany({ where: { userId }, data: { isVerified: true } })

    if (cfg.notifyUser) await tx.notification.create({
      data: {
        userId,
        type: 'ACCOUNT_VERIFIED',
        title: 'Your account has been verified',
        body: 'You can now buy a PACT and post your work.',
        link: '/dashboard',
      },
    })

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'USER_VERIFIED',
        entityType: 'User',
        entityId: userId,
      },
    })
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (cfg.emailUser) await sendMail({
    to: user.email,
    subject: 'Your ArchFacing account has been verified',
    text: [
      `Hello ${user.name},`,
      '',
      'ArchFacing has reviewed your details and activated your account.',
      'You can now buy the PACT for your PIN code and post your work.',
      '',
      `${appUrl}/dashboard`,
    ].join('\n'),
    html: `<p>Hello ${user.name},</p>
<p>ArchFacing has reviewed your details and activated your account.</p>
<p>You can now buy the PACT for your PIN code and post your work.</p>
<p><a href="${appUrl}/dashboard">Open your dashboard →</a></p>`,
  }).catch((e) => console.error('Verification email failed to send:', e))

  revalidatePath('/admin/users')
  return { ok: true }
}

export async function rejectUserAction(userId: string, reason: string) {
  const admin = await requirePermission('admin:users')

  if (!reason.trim()) {
    return { ok: false, error: 'A reason is required — the user needs to know why.' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) return { ok: false, error: 'User not found.' }

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId,
        type: 'VERIFICATION_FAILED',
        title: 'Something is missing in your verification',
        body: reason.trim(),
        link: '/dashboard',
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'USER_VERIFICATION_REJECTED',
        entityType: 'User',
        entityId: userId,
        after: { reason: reason.trim() },
      },
    }),
  ])

  await sendMail({
    to: user.email,
    subject: 'ArchFacing — something is missing in your verification',
    text: `Hello ${user.name},\n\n${reason.trim()}\n\nPlease correct this and submit again.`,
    html: `<p>Hello ${user.name},</p><p>${reason.trim()}</p><p>Please correct this and submit again.</p>`,
  }).catch(() => {})

  revalidatePath('/admin/users')
  return { ok: true }
}

export async function setUserStatusAction(userId: string, status: UserStatus) {
  const admin = await requirePermission('admin:users')

  await prisma.user.update({ where: { id: userId }, data: { status } })
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: `USER_${status}`,
      entityType: 'User',
      entityId: userId,
    },
  })

  revalidatePath('/admin/users')
  return { ok: true }
}

/**
 * The bulk bar on every admin people-list posts here: `status` is one of
 * ACTIVATE | SUSPEND | VERIFY, and `ids` are the ticked rows.
 *
 * Guard rails, enforced server-side whatever the page offered:
 *   · a SUPER_ADMIN is never touched, and nobody can change their own account;
 *   · staff accounts (ADMIN, ADMIN_SELLER, RM_EMPLOYEE) change only by a SUPER_ADMIN, so an
 *     ADMIN cannot suspend a fellow admin, seller or RM from any list;
 *   · at most 100 rows per submit.
 * VERIFY reuses verifyUserAction per row so the profile flags, notification,
 * audit entry and email stay identical to the single-row path.
 */
export async function bulkUserAction(formData: FormData): Promise<void> {
  const admin = await requirePermission('admin:users')
  const op = String(formData.get('status') ?? '')
  if (op !== 'ACTIVATE' && op !== 'SUSPEND' && op !== 'VERIFY') return

  const ids = [...new Set(formData.getAll('ids').filter((v): v is string => typeof v === 'string'))]
    .filter((id) => /^[a-z0-9]{10,40}$/i.test(id) && id !== admin.id)
    .slice(0, 100)
  if (ids.length === 0) return

  // Every staff role — only a SUPER_ADMIN may change these.
  const staffRoles: Role[] = ['ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE']
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      role: admin.role === 'SUPER_ADMIN'
        ? { not: 'SUPER_ADMIN' }
        : { notIn: ['SUPER_ADMIN' as Role, ...staffRoles] },
    },
    select: { id: true, status: true },
  })
  if (users.length === 0) return

  if (op === 'VERIFY') {
    for (const u of users) await verifyUserAction(u.id)
  } else {
    const status: UserStatus = op === 'ACTIVATE' ? 'ACTIVE' : 'SUSPENDED'
    const changed = users.filter((u) => u.status !== status)
    if (changed.length) {
      await prisma.$transaction([
        prisma.user.updateMany({ where: { id: { in: changed.map((u) => u.id) } }, data: { status } }),
        prisma.auditLog.createMany({
          data: changed.map((u) => ({
            actorId: admin.id,
            action: `USER_${status}`,
            entityType: 'User',
            entityId: u.id,
            before: { status: u.status },
            after: { status },
          })),
        }),
      ])
    }
  }

  for (const p of ['/admin/users', '/admin/admins', '/admin/employees', '/admin/professionals', '/admin/students', '/admin/visitors', '/admin/corporates']) {
    revalidatePath(p)
  }
}

// ═══════════════════════════════════════════════════════════
//  /admin/users/[id] — access, documents
// ═══════════════════════════════════════════════════════════

export type UserOpState = { ok: boolean; message: string } | null

/**
 * Sets a staff account's extra admin modules. Only a SUPER_ADMIN may do
 * this, only for staff roles, and only with keys from GRANTABLE — anything
 * else in the form is dropped.
 */
export async function saveUserAccessAction(_p: UserOpState, fd: FormData): Promise<UserOpState> {
  const admin = await requirePermission('admin:employees')
  if (admin.role !== 'SUPER_ADMIN') return { ok: false, message: 'Only a Super Admin can change module access.' }
  const userId = String(fd.get('userId') ?? '')
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, permissions: true, name: true } })
  if (!target) return { ok: false, message: 'That account was not found.' }
  if (!STAFF_ROLES.includes(target.role)) return { ok: false, message: 'Module access applies to staff accounts only.' }
  const next = [...new Set(fd.getAll('permissions').map(String).filter((p) => GRANTABLE_KEYS.has(p)))].sort()

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { permissions: next } }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'USER_ACCESS_UPDATED', entityType: 'User', entityId: target.id, before: { permissions: target.permissions }, after: { permissions: next } },
    }),
    prisma.notification.create({
      data: { userId: target.id, type: 'ACCESS_UPDATED', title: 'Your admin access was updated', body: next.length ? `You can now open ${next.length} admin module${next.length === 1 ? '' : 's'}.` : 'You no longer have admin module access.', link: next.length ? '/admin' : '/dashboard' },
    }),
  ])
  revalidatePath(`/admin/users/${target.id}`)
  revalidatePath('/admin/employees')
  return { ok: true, message: `Access saved — ${next.length} module${next.length === 1 ? '' : 's'}.` }
}

/** An admin uploads a verification document on a member's behalf. */
export async function adminUploadDocumentAction(_p: UserOpState, fd: FormData): Promise<UserOpState> {
  const admin = await requirePermission('admin:users')
  const userId = String(fd.get('userId') ?? '')
  const docTypeId = String(fd.get('docTypeId') ?? '')
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a file to upload.' }
  const owner = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } })
  if (!owner) return { ok: false, message: 'That account was not found.' }
  try {
    const doc = await addVerificationDocument({ ownerId: owner.id, uploaderId: admin.id, docTypeId, file })
    await prisma.auditLog.create({ data: { actorId: admin.id, action: 'DOCUMENT_UPLOADED', entityType: 'User', entityId: owner.id, after: { document: doc.docName } } })
  } catch (e) {
    if (e instanceof DocError) return { ok: false, message: e.message }
    throw e
  }
  revalidatePath(`/admin/users/${owner.id}`)
  revalidatePath('/admin/visitors/verification')
  return { ok: true, message: 'Document added.' }
}

/** Accept or reject one document. A rejection stops it counting towards the minimum. */
export async function reviewDocumentAction(fd: FormData): Promise<void> {
  const admin = await requirePermission('admin:users')
  const id = String(fd.get('id') ?? '')
  const status = String(fd.get('status') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(id) || (status !== 'ACCEPTED' && status !== 'REJECTED')) return
  const doc = await prisma.verificationDocument.findUnique({ where: { id }, select: { userId: true, docName: true } })
  if (!doc) return
  await prisma.$transaction([
    prisma.verificationDocument.update({ where: { id }, data: { status, reviewedById: admin.id, reviewedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: admin.id, action: `DOCUMENT_${status}`, entityType: 'User', entityId: doc.userId, after: { document: doc.docName } } }),
    ...(status === 'REJECTED'
      ? [prisma.notification.create({ data: { userId: doc.userId, type: 'DOCUMENT_REJECTED', title: 'A document was not accepted', body: `${doc.docName} — please upload a clearer or current copy.`, link: '/dashboard/settings' } })]
      : []),
  ])
  await syncDocumentCount(doc.userId)
  revalidatePath(`/admin/users/${doc.userId}`)
}

/** Form wrapper for verifyUserAction — the "Verify & activate" button on /admin/users/[id]. */
export async function verifyUserFormAction(fd: FormData): Promise<void> {
  const id = String(fd.get('userId') ?? '')
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return
  await verifyUserAction(id)
  revalidatePath(`/admin/users/${id}`)
}
