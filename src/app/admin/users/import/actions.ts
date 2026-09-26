'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { getVerificationConfig, needsVerification } from '@/lib/verification-config'

/**
 * Bulk import from a CSV. One account per row; every row is validated on its
 * own and the result lists what was created and why any row was skipped —
 * one bad row never blocks the rest, and nothing is half-created.
 *
 * Columns (header row required, any order, case-insensitive):
 *   name, email, mobile, city, state, pincode, company (firm / company name)
 */

export type ImportKind = 'PROFESSIONAL' | 'STUDENT' | 'CLIENT' | 'CORPORATE' | 'RM_EMPLOYEE'
export type ImportResult = {
  ok: boolean
  error?: string
  created?: { name: string; email: string; password?: string }[]
  skipped?: { row: number; email: string; reason: string }[]
} | null

const MAX_ROWS = 500

/** A small RFC-4180 reader: quoted fields, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

export async function importUsersAction(_p: ImportResult, fd: FormData): Promise<ImportResult> {
  const kind = String(fd.get('kind') ?? '') as ImportKind
  if (!['PROFESSIONAL', 'STUDENT', 'CLIENT', 'CORPORATE', 'RM_EMPLOYEE'].includes(kind)) return { ok: false, error: 'Pick what kind of accounts the file holds.' }
  const admin = await requirePermission(kind === 'RM_EMPLOYEE' ? 'admin:employees' : 'admin:users')
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a CSV file.' }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Keep the file under 2 MB.' }
  const sendCreds = fd.get('sendCredentials') === 'on'

  const rows = parseCsv((await file.text()).replace(/^﻿/, ''))
  if (rows.length < 2) return { ok: false, error: 'The file needs a header row and at least one account.' }
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => head.findIndex((h) => h === name || h.replace(/[^a-z]/g, '') === name)
  const ix = { name: col('name'), email: col('email'), mobile: col('mobile'), city: col('city'), state: col('state'), pincode: col('pincode'), company: col('company') }
  if (ix.name < 0 || ix.email < 0) return { ok: false, error: 'The header row needs at least “name” and “email”.' }
  if (kind === 'CORPORATE' && ix.company < 0) return { ok: false, error: 'Corporate imports need a “company” column.' }
  const data = rows.slice(1, MAX_ROWS + 1)

  const cfg = await getVerificationConfig()
  const created: NonNullable<Exclude<ImportResult, null>['created']> = []
  const skipped: NonNullable<Exclude<ImportResult, null>['skipped']> = []
  const seen = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  for (let r = 0; r < data.length; r++) {
    const g = (k: keyof typeof ix) => (ix[k] >= 0 ? (data[r][ix[k]] ?? '').trim() : '')
    const name = g('name').slice(0, 120)
    const email = g('email').toLowerCase()
    const mobile = g('mobile').replace(/\D/g, '').slice(-10)
    const pincode = g('pincode')
    const company = g('company').slice(0, 150)
    const rowNo = r + 2
    if (name.length < 2) { skipped.push({ row: rowNo, email, reason: 'Name missing' }); continue }
    if (!/^\S+@\S+\.\S+$/.test(email)) { skipped.push({ row: rowNo, email, reason: 'Email not valid' }); continue }
    if (seen.has(email)) { skipped.push({ row: rowNo, email, reason: 'Duplicate in this file' }); continue }
    seen.add(email)
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) { skipped.push({ row: rowNo, email, reason: 'Mobile not a valid 10-digit number' }); continue }
    if (pincode && !/^\d{6}$/.test(pincode)) { skipped.push({ row: rowNo, email, reason: 'PIN code not 6 digits' }); continue }
    if (kind === 'CORPORATE' && company.length < 2) { skipped.push({ row: rowNo, email, reason: 'Company name missing' }); continue }
    const taken = await prisma.user.findFirst({ where: { OR: [{ email }, ...(mobile ? [{ mobile }] : [])] }, select: { email: true } })
    if (taken) { skipped.push({ row: rowNo, email, reason: taken.email === email ? 'Email already registered' : 'Mobile already registered' }); continue }

    const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
    const role = kind === 'STUDENT' ? 'PROFESSIONAL' : kind
    const pending = needsVerification(cfg, role, kind === 'STUDENT' ? 'STUDENT' : null)
    try {
      const user = await prisma.user.create({
        data: {
          email, name, emailVerified: new Date(), mobile: mobile || null,
          passwordHash: await bcrypt.hash(password, 10),
          role, status: pending ? 'PENDING_VERIFICATION' : 'ACTIVE',
          city: g('city') || null, state: g('state') || null, pincode: pincode || null,
          mustChangePassword: true, termsAcceptedAt: new Date(), createdById: admin.id,
          ...(kind === 'PROFESSIONAL' || kind === 'STUDENT'
            ? { professionalProfile: { create: { designaType: 'DESIGNA', tier: kind === 'STUDENT' ? 'STUDENT' : 'PROFESSIONAL', firmName: company || null, isVerified: false } } }
            : kind === 'CLIENT'
              ? { buyerProfile: { create: { accountType: company ? 'COMPANY' : 'INDIVIDUAL', companyName: company || null } } }
              : kind === 'CORPORATE'
                ? { corporateProfile: { create: { companyName: company, gstNumber: '', panNumber: '', isVerified: false } } }
                : {}),
        },
      })
      let emailed = false
      if (sendCreds) {
        emailed = await sendMail({ to: email, ...employeeCredentialsEmail(name, email, password, `${appUrl}/login`) }).then((x) => x.sent).catch(() => false)
      }
      created.push({ name, email, password: emailed ? undefined : password })
      void user
    } catch {
      skipped.push({ row: rowNo, email, reason: 'Could not be created' })
    }
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'USERS_IMPORTED', entityType: 'User', entityId: kind, after: { created: created.length, skipped: skipped.length, file: file.name } },
  })
  revalidatePath('/admin/users')
  revalidatePath('/admin/professionals')
  revalidatePath('/admin/students')
  revalidatePath('/admin/visitors')
  revalidatePath('/admin/corporates')
  revalidatePath('/admin/employees')
  return {
    ok: true,
    created,
    skipped: [...skipped, ...(rows.length - 1 > MAX_ROWS ? [{ row: MAX_ROWS + 2, email: '', reason: `Only the first ${MAX_ROWS} rows are imported per file` }] : [])],
  }
}
