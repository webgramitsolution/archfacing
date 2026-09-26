'use server'

/**
 * Employee management — §7.11.1 and the original requirement.
 *
 * The admin creates an email + password here. Entering those same
 * credentials on the frontend's usual /login page opens the Employee
 * Dashboard — there is no separate login page for employees.
 */

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma, type Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission, accountChangeRefusal } from '@/lib/guard'
import { GRANTABLE_KEYS } from '@/config/permissions'
import { addVerificationDocument, DocError } from '@/lib/verification-docs'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { INDIAN_STATES } from '@/config/states'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .optional()
    .or(z.literal('')),
  role: z.enum(['RM_EMPLOYEE', 'ADMIN_SELLER', 'ADMIN']),
  department: z.string().trim().max(80).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
  states: z.string().optional(),
  pincodes: z.string().optional(),
})

export type EmployeeState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  created?: { name: string; email: string; emailSent: boolean }
}

export async function createEmployeeAction(
  _prev: EmployeeState | null,
  formData: FormData
): Promise<EmployeeState> {
  // §7.11.1 — only a Super Admin can create an employee
  const admin = await requirePermission('admin:employees')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form')
      fieldErrors[key] ??= i.message
    }
    return { ok: false, error: 'Some fields need to be corrected.', fieldErrors, values: raw }
  }

  const d = parsed.data

  // Only a Super Admin creates admin-level accounts; a holder of the
  // Employees grant may create RM employees only.
  if (d.role !== 'RM_EMPLOYEE' && admin.role !== 'SUPER_ADMIN') {
    return { ok: false, error: 'Only a Super Admin can create an Admin or Admin-Seller account.', values: raw }
  }

  // territory — for RM Employee
  const states = (d.states ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => INDIAN_STATES.includes(s as never))

  const pincodes = (d.pincodes ?? '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[1-9]\d{5}$/.test(s))

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(d.password, 12),
        role: d.role as Role,
        status: 'ACTIVE',
        name: d.name,
        department: d.department || null,
        assignedStates: states,
        assignedPincodes: pincodes,
        // prompt for a password change on first login
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'EMPLOYEE_CREATED',
        entityType: 'User',
        entityId: user.id,
        after: { email: d.email, role: d.role, states, pincodes },
      },
    })

    // credentials email — if it fails, the account still stands
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailSent = false
    try {
      const mail = employeeCredentialsEmail(
        d.name,
        d.email,
        d.password,
        `${appUrl}/login`
      )
      const res = await sendMail({ to: d.email, ...mail })
      emailSent = res.sent
    } catch (e) {
      console.error('Employee credentials email failed to send:', e)
    }

    revalidatePath('/admin/employees')
    return { ok: true, created: { name: d.name, email: d.email, emailSent } }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return {
        ok: false,
        error: target.includes('mobile')
          ? 'This mobile number is already on another account.'
          : 'An account with this email already exists.',
        values: raw,
      }
    }
    console.error('Employee create fail:', e)
    return { ok: false, error: 'Could not create the employee. Please try again.', values: raw }
  }
}

// ═══════════════════════════════════════════════════════════
//  Full "Add Employee" wizard — creates the employee end to end
// ═══════════════════════════════════════════════════════════

const fullSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid official email').toLowerCase(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile').optional().or(z.literal('')),
  employeeCode: z.string().trim().max(40).optional(),
  department: z.string().trim().min(1, 'Select a department').max(80),
  designation: z.string().trim().min(1, 'Enter a designation').max(80),
  designationLevel: z.enum(['RM', 'Employee', 'Manager', 'Admin']).default('Employee'),
  workMode: z.enum(['Office', 'Hybrid', 'Remote']).default('Office'),
  employmentType: z.string().trim().max(40).optional(),
  joinedAt: z.string().trim().optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pactCode: z.string().trim().max(40).optional(),
  dob: z.string().trim().optional(),
  gender: z.string().trim().max(20).optional(),
  address1: z.string().trim().max(200).optional(),
  address2: z.string().trim().max(200).optional(),
  emergencyName: z.string().trim().max(80).optional(),
  emergencyRelation: z.string().trim().max(40).optional(),
  emergencyPhone: z.string().trim().max(15).optional(),
  reportingManagerId: z.string().trim().max(40).optional(),
  employmentStatus: z.string().trim().max(40).optional(),
  probation: z.string().trim().max(40).optional(),
  accessLevel: z.string().trim().max(40).optional(),
  officeAddress: z.string().trim().max(300).optional(),
  pactMode: z.enum(['all', 'specific']).optional(),
  pincodes: z.string().trim().max(2000).optional(),
})

export type FullEmployeeState = { ok: boolean; error?: string; note?: string; created?: { name: string; email: string; code: string } } | null

export async function createEmployeeFullAction(_prev: FullEmployeeState, formData: FormData): Promise<FullEmployeeState> {
  const admin = await requirePermission('admin:employees')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) if (typeof v === 'string') raw[k] = v.trim()

  const parsed = fullSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Some fields need to be corrected.' }
  }
  const d = parsed.data

  // Module grants — only keys the platform knows, whatever the form sent.
  const permissions = [...new Set(formData.getAll('permissions').map(String).filter((p) => GRANTABLE_KEYS.has(p)))]
  // Only a Super Admin may hand out Employees or Settings.
  if (admin.role !== 'SUPER_ADMIN' && permissions.some((p) => p === 'admin:employees' || p === 'admin:settings')) {
    return { ok: false, error: 'Only a Super Admin can grant Employees or Website Settings.' }
  }
  const pins = d.pactMode === 'all'
    ? ['*']
    : [...new Set((d.pincodes ?? '').split(/[\s,]+/).filter((p) => /^\d{6}$/.test(p)))].slice(0, 200)
  if (d.pactMode !== 'all' && d.pincodes && pins.length === 0) return { ok: false, error: 'PIN codes must be 6 digits, separated by commas.' }

  const manager = d.reportingManagerId && /^[a-z0-9]{10,40}$/i.test(d.reportingManagerId)
    ? await prisma.user.findFirst({ where: { id: d.reportingManagerId, deletedAt: null }, select: { id: true, name: true } })
    : null
  const dob = d.dob ? new Date(d.dob) : null
  const extras = {
    emergencyContact: d.emergencyName || d.emergencyPhone ? { name: d.emergencyName || '', relationship: d.emergencyRelation || '', phone: d.emergencyPhone || '' } : null,
    reportingManager: manager?.name ?? null,
    reportingManagerId: manager?.id ?? null,
    employmentStatus: d.employmentStatus || null,
    probation: d.probation || null,
    accessLevel: d.accessLevel || null,
    officeAddress: d.officeAddress || null,
  }

  // A readable auto password; the employee must change it on first login.
  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
  const joinedAt = d.joinedAt ? new Date(d.joinedAt) : new Date()

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(password, 12),
        // 'Admin' level from a Super Admin creates a real ADMIN account;
        // anyone else, or any other level, creates an RM employee.
        role: d.designationLevel === 'Admin' && admin.role === 'SUPER_ADMIN' ? 'ADMIN' : 'RM_EMPLOYEE',
        status: 'ACTIVE',
        name: d.name,
        department: d.department,
        designation: d.designation,
        designationLevel: d.designationLevel,
        employeeCode: d.employeeCode || null,
        workMode: d.workMode,
        employmentType: d.employmentType || 'Employee',
        joinedAt: isNaN(joinedAt.getTime()) ? new Date() : joinedAt,
        city: d.city || null,
        state: d.state || null,
        pactCode: d.pactCode || null,
        assignedPincodes: pins,
        // Specific PIN codes (or '*') define the territory on their own; the
        // office state only scopes leads when no PIN codes were given.
        assignedStates: pins.length ? [] : d.state ? [d.state] : [],
        gender: d.gender || null,
        dateOfBirth: dob && !isNaN(dob.getTime()) ? dob : null,
        addressLine: [d.address1, d.address2].filter(Boolean).join(', ') || null,
        permissions,
        profileExtras: extras,
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
      },
    })

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: 'EMPLOYEE_CREATED', entityType: 'User', entityId: user.id, after: { email: d.email, department: d.department, designation: d.designation, permissions } },
    })

    // Documents attached in step 5 — one upload per document type field.
    const failed: string[] = []
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('doc_') || !(value instanceof File) || value.size === 0) continue
      try {
        await addVerificationDocument({ ownerId: user.id, uploaderId: admin.id, docTypeId: key.slice(4), file: value })
      } catch (e) {
        failed.push(e instanceof DocError ? `${value.name}: ${e.message}` : value.name)
      }
    }
    if (manager && manager.id !== admin.id) {
      await prisma.notification.create({
        data: { userId: manager.id, type: 'EMPLOYEE_REPORTS_TO_YOU', title: 'A new team member reports to you', body: `${d.name} — ${d.designation}`, link: `/admin/users/${user.id}` },
      }).catch(() => null)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    try {
      const mail = employeeCredentialsEmail(d.name, d.email, password, `${appUrl}/login`)
      await sendMail({ to: d.email, ...mail })
    } catch (e) {
      console.error('Employee credentials email failed:', e)
    }

    revalidatePath('/admin/employees')
    return {
      ok: true,
      created: { name: d.name, email: d.email, code: d.employeeCode || user.id.slice(-8) },
      note: failed.length ? `Some documents were not saved — ${failed.join('; ')}. Add them from the employee’s page.` : undefined,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return { ok: false, error: target.includes('mobile') ? 'This mobile number is already on another account.' : target.includes('employeeCode') ? 'That Employee ID is already taken.' : 'An account with this email already exists.' }
    }
    console.error('Full employee create failed:', e)
    return { ok: false, error: 'Could not create the employee. Please try again.' }
  }
}

/** If the password is forgotten, the admin can issue a new one */
export async function resetEmployeePasswordAction(userId: string) {
  const admin = await requirePermission('admin:employees')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!user) return { ok: false, error: 'Employee not found.' }

  const INTERNAL: Role[] = ['RM_EMPLOYEE', 'ADMIN_SELLER', 'ADMIN']
  if (!INTERNAL.includes(user.role)) {
    return { ok: false, error: 'This account is not an internal employee.' }
  }
  const refusal = accountChangeRefusal(admin, user, { allowRmByGrant: true })
  if (refusal) return { ok: false, error: refusal }

  // readable but unguessable password
  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'EMPLOYEE_PASSWORD_RESET',
      entityType: 'User',
      entityId: userId,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const mail = employeeCredentialsEmail(user.name, user.email, password, `${appUrl}/login`)
  const res = await sendMail({ to: user.email, ...mail }).catch(() => ({ sent: false }))

  revalidatePath('/admin/employees')
  // if the email did not go out, show the password to the admin; otherwise hide it
  return { ok: true, password: res.sent ? null : password }
}

export async function toggleEmployeeAction(userId: string, suspend: boolean) {
  const admin = await requirePermission('admin:employees')

  // Only internal staff are managed here — never members, a Super Admin or
  // yourself; admin-level accounts only by a Super Admin.
  const target = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, role: true },
  })
  if (!target) return { ok: false, error: 'Employee not found.' }
  const INTERNAL: Role[] = ['RM_EMPLOYEE', 'ADMIN_SELLER', 'ADMIN']
  if (!INTERNAL.includes(target.role)) {
    return { ok: false, error: 'This account is not an internal employee.' }
  }
  const refusal = accountChangeRefusal(admin, target, { allowRmByGrant: true })
  if (refusal) return { ok: false, error: refusal }

  await prisma.user.update({
    where: { id: target.id },
    data: { status: suspend === true ? 'SUSPENDED' : 'ACTIVE' },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: suspend ? 'EMPLOYEE_SUSPENDED' : 'EMPLOYEE_ACTIVATED',
      entityType: 'User',
      entityId: userId,
    },
  })

  revalidatePath('/admin/employees')
  return { ok: true }
}

export async function listEmployees() {
  await requirePermission('admin:employees')
  return prisma.user.findMany({
    where: {
      role: { in: ['RM_EMPLOYEE', 'ADMIN_SELLER', 'ADMIN'] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      department: true,
      assignedStates: true,
      assignedPincodes: true,
      lastLoginAt: true,
      mustChangePassword: true,
      createdAt: true,
      _count: { select: { enquiriesMgd: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
