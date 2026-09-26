'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { uploadFile } from '@/lib/upload'

export type QualState = { ok: boolean; message: string } | null

/** §4.3.3.2 — from Class 10 up to PhD, plus professional memberships (COA etc.). */
const LEVELS = ['TENTH', 'TWELFTH', 'DIPLOMA', 'GRADUATION', 'POST_GRADUATION', 'PHD', 'PROFESSIONAL_MEMBERSHIP']

/** The profile row a qualification hangs off — whichever this account has. */
async function ownerProfile(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { professionalProfile: { select: { id: true } }, consultantProfile: { select: { id: true } } },
  })
  if (u?.professionalProfile) return { professionalProfileId: u.professionalProfile.id }
  if (u?.consultantProfile) return { consultantProfileId: u.consultantProfile.id }
  return null
}

function refresh() {
  revalidatePath('/dashboard/professional/qualifications')
  revalidatePath('/dashboard/consultant/qualifications')
}

export async function addQualificationAction(_p: QualState, fd: FormData): Promise<QualState> {
  const me = await requireAuth()
  const owner = await ownerProfile(me.id)
  if (!owner) return { ok: false, message: 'Qualifications belong to professional and consultant profiles.' }

  const level = String(fd.get('level') ?? '')
  const boardOrUniv = String(fd.get('boardOrUniv') ?? '').trim().slice(0, 150)
  const state = String(fd.get('state') ?? '').trim().slice(0, 60)
  const passingYear = Number(fd.get('passingYear'))
  const membershipNo = String(fd.get('membershipNo') ?? '').trim().slice(0, 60) || null
  const thisYear = new Date().getFullYear()

  if (!LEVELS.includes(level)) return { ok: false, message: 'Pick a level.' }
  if (boardOrUniv.length < 2) return { ok: false, message: 'Enter the board, university or institute.' }
  if (state.length < 2) return { ok: false, message: 'Enter the state.' }
  if (!Number.isInteger(passingYear) || passingYear < 1950 || passingYear > thisYear + 1) return { ok: false, message: `Enter a passing year between 1950 and ${thisYear + 1}.` }
  if (level === 'PROFESSIONAL_MEMBERSHIP' && !membershipNo) return { ok: false, message: 'Enter the membership number (for example your COA number).' }

  const count = await prisma.qualification.count({ where: owner })
  if (count >= 20) return { ok: false, message: 'You can list up to 20 qualifications.' }

  let certificateUrl: string | null = null
  const file = fd.get('certificate')
  if (file instanceof File && file.size > 0) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const up = await uploadFile({ userId: me.id, file, kind: isPdf ? 'PDF' : 'IMAGE', aspect: 'free', folder: 'qualifications' })
    if (!up.ok) return { ok: false, message: up.error }
    certificateUrl = up.url
  }

  await prisma.qualification.create({ data: { ...owner, level, boardOrUniv, state, passingYear, membershipNo, certificateUrl } })
  refresh()
  return { ok: true, message: 'Qualification added.' }
}

export async function deleteQualificationAction(fd: FormData): Promise<void> {
  const me = await requireAuth()
  const owner = await ownerProfile(me.id)
  const id = String(fd.get('id') ?? '')
  if (!owner || !/^[a-z0-9]{10,40}$/i.test(id)) return
  await prisma.qualification.deleteMany({ where: { id, ...owner } })
  refresh()
}
