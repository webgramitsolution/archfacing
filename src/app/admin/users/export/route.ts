import type { NextRequest } from 'next/server'
import type { Role } from '@prisma/client'
import { requirePermission } from '@/lib/guard'
import { csvCell } from '@/lib/csv'
import { prisma } from '@/lib/prisma'

/**
 * GET /admin/users/export?role=PROFESSIONAL[,CONSULTANT] &tier=STUDENT
 * Accounts as CSV for the list the admin is on (Users, Professionals,
 * Students, Employees, Corporates, Buyers). Staff lists need the Employees
 * permission; everything else needs Users.
 */
export const dynamic = 'force-dynamic'

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE', 'CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE', 'EXTERNAL_ADVERTISER']
const STAFF: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE']

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const roles = (p.get('role') ?? '').split(',').map((r) => r.trim()).filter((r): r is Role => ROLES.includes(r as Role))
  const tier = p.get('tier') === 'STUDENT' ? 'STUDENT' : p.get('tier') === 'PROFESSIONAL' ? 'PROFESSIONAL' : null
  await requirePermission(roles.some((r) => STAFF.includes(r)) ? 'admin:employees' : 'admin:users')

  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(roles.length ? { role: { in: roles } } : {}),
      ...(tier ? { professionalProfile: { tier } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20000,
    select: {
      name: true, email: true, mobile: true, role: true, status: true, city: true, state: true, pincode: true, createdAt: true, lastLoginAt: true,
      employeeCode: true, department: true, designation: true,
      professionalProfile: { select: { firmName: true, professionType: true, coaNumber: true, isVerified: true } },
      corporateProfile: { select: { companyName: true, gstNumber: true } },
      bmfProfile: { select: { businessName: true } },
      buyerProfile: { select: { accountType: true, companyName: true, verificationStatus: true } },
    },
  })
  const cell = (v: unknown) => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
    return csvCell(s)
  }
  const head = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Company / Firm', 'Type', 'GST / COA', 'Verification', 'City', 'State', 'PIN', 'Employee ID', 'Department', 'Designation', 'Joined', 'Last sign-in']
  const lines = [head.join(','), ...rows.map((u) => [
    u.name, u.email, u.mobile, u.role, u.status,
    u.corporateProfile?.companyName ?? u.bmfProfile?.businessName ?? u.professionalProfile?.firmName ?? u.buyerProfile?.companyName,
    u.professionalProfile?.professionType ?? u.buyerProfile?.accountType,
    u.corporateProfile?.gstNumber ?? u.professionalProfile?.coaNumber,
    u.buyerProfile?.verificationStatus ?? (u.professionalProfile ? (u.professionalProfile.isVerified ? 'VERIFIED' : 'PENDING') : ''),
    u.city, u.state, u.pincode, u.employeeCode, u.department, u.designation, u.createdAt, u.lastLoginAt,
  ].map(cell).join(','))]
  const today = new Date().toISOString().slice(0, 10)
  const label = roles.length === 1 ? roles[0].toLowerCase() : 'users'
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="archfacing-${label}-${today}.csv"`, 'Cache-Control': 'no-store' },
  })
}
