'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { channelPrefs, extrasFrom, saveDocs } from '@/lib/wizard-save'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid email').toLowerCase(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile').optional().or(z.literal('')),
  gender: z.string().trim().max(20).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  dob: z.string().trim().optional(),
  institution: z.string().trim().min(2, 'Enter the institution name').max(150),
  course: z.string().trim().min(1, 'Select a course / stream').max(60),
  studentYear: z.string().trim().max(40).optional(),
  studentLevel: z.enum(['Undergraduate', 'Postgraduate', 'Diploma', 'Other']).default('Undergraduate'),
  studentId: z.string().trim().max(40).optional(),
  graduationYear: z.union([z.literal(''), z.string().regex(/^20\d\d$/, 'Enter the expected graduation year, e.g. 2027')]).optional(),
  pincode: z.union([z.literal(''), z.string().regex(/^\d{6}$/, 'The PIN code must be 6 digits')]).optional(),
  accStatus: z.enum(['active', 'inactive']).optional(),
})

export type StudentState = { ok: boolean; error?: string; note?: string; password?: string; created?: { name: string; email: string } } | null

export async function createStudentAction(_prev: StudentState, formData: FormData): Promise<StudentState> {
  const admin = await requirePermission('admin:users')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) if (typeof v === 'string') raw[k] = v.trim()

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Some fields need attention.' }
  const d = parsed.data

  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
  const dob = d.dob ? new Date(d.dob) : null
  const sendCredentials = formData.get('sendCredentials') === 'on'
  const prefs = channelPrefs(formData)
  const skills = String(formData.get('skills') ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20)
  const extras = { ...extrasFrom(formData, ['bloodGroup', 'nationality', 'graduationYear', 'department', 'careerGoals', 'hobbies', 'memberType'], ['interests']), ...(skills.length ? { skills } : {}) }

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'PROFESSIONAL',
        status: d.accStatus === 'inactive' ? 'SUSPENDED' : 'ACTIVE',
        name: d.name,
        gender: d.gender || null,
        dateOfBirth: dob && !isNaN(dob.getTime()) ? dob : null,
        city: d.city || null,
        addressLine: d.address || null,
        pincode: d.pincode || null,
        profileExtras: Object.keys(extras).length ? (extras as Prisma.InputJsonValue) : undefined,
        notificationPrefs: prefs ?? undefined,
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
        professionalProfile: {
          create: {
            designaType: 'DESIGNA',
            tier: 'STUDENT',
            firmName: d.institution,
            categories: [d.course],
            studentId: d.studentId || null,
            studentYear: d.studentYear || null,
            studentLevel: d.studentLevel,
            isVerified: false,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: 'STUDENT_CREATED', entityType: 'User', entityId: user.id, after: { email: d.email, institution: d.institution, course: d.course } },
    })

    const failed = await saveDocs(formData, user.id, admin.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailed = false
    if (sendCredentials) {
      try {
        const mail = employeeCredentialsEmail(d.name, d.email, password, `${appUrl}/login`)
        emailed = (await sendMail({ to: d.email, ...mail })).sent
      } catch (e) {
        console.error('Student credentials email failed:', e)
      }
    }

    revalidatePath('/admin/students')
    return {
      ok: true,
      created: { name: d.name, email: d.email },
      password: emailed ? undefined : password,
      note: failed.length ? `Some documents were not saved — ${failed.join('; ')}. Add them from the account page.` : undefined,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const t = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return { ok: false, error: t.includes('mobile') ? 'This mobile is already on another account.' : t.includes('studentId') ? 'That Enrollment / Roll Number is already taken.' : 'An account with this email already exists.' }
    }
    console.error('Student create failed:', e)
    return { ok: false, error: 'Could not create the student. Please try again.' }
  }
}
