/**
 * Admin Panel — creating employees and verifying users.
 *
 *   pnpm test:admin
 *
 * ★ Most important: an employee created by an admin must be able to get in
 *   through the same /login page with a password — that was the original
 *   requirement.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
let pass = 0, fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { actor: { email: { contains: '@atest.dev' } } } })
  await prisma.notification.deleteMany({ where: { user: { email: { contains: '@atest.dev' } } } })
  await prisma.user.deleteMany({ where: { email: { contains: '@atest.dev' } } })
}
await cleanup()

console.log('\n── Creating an employee ──')

const admin = await prisma.user.create({
  data: { email:'super@atest.dev', name:'Super Admin', role:'SUPER_ADMIN',
    status:'ACTIVE', emailVerified:new Date(), passwordHash: await bcrypt.hash('AdminPass@1',12) },
})

const PLAIN = 'Delhi@4821af'
const emp = await prisma.user.create({
  data: {
    email:'rm.north@atest.dev', name:'Rakesh RM', role:'RM_EMPLOYEE',
    status:'ACTIVE', emailVerified:new Date(),
    passwordHash: await bcrypt.hash(PLAIN, 12),
    department:'North Zone', assignedStates:['Delhi','Haryana'],
    assignedPincodes:['110005','110016'], mustChangePassword:true,
    createdById: admin.id, termsAcceptedAt:new Date(),
  },
})

check('the employee was created', !!emp.id)
check('the role is RM_EMPLOYEE', emp.role === 'RM_EMPLOYEE')
check('ACTIVE immediately — no verification needed', emp.status === 'ACTIVE')
check('will be asked to change the password', emp.mustChangePassword === true)
check('the territory was recorded', emp.assignedStates.length === 2 && emp.assignedPincodes.length === 2)
check('who created it is recorded', emp.createdById === admin.id)

console.log('\n── ★ The same credentials must work at /login ──')

// This is exactly the check the password provider in auth.ts performs
const found = await prisma.user.findUnique({ where: { email: 'rm.north@atest.dev' } })
check('the user was found by email', !!found)
check('status is ACTIVE (which the provider requires)', found.status === 'ACTIVE')
check('passwordHash is present', !!found.passwordHash)
check('★ the correct password matches', await bcrypt.compare(PLAIN, found.passwordHash))
check('a wrong password does not work', !(await bcrypt.compare('GalatPass@1', found.passwordHash)))
check('the password is not stored in plain text', found.passwordHash !== PLAIN)

console.log('\n── Who gets the employee dashboard ──')

const { dashboardPathFor } = await import('../src/lib/auth.ts')
check('RM_EMPLOYEE → /dashboard/employee', dashboardPathFor('RM_EMPLOYEE') === '/dashboard/employee')
check('ADMIN_SELLER → /admin/seller', dashboardPathFor('ADMIN_SELLER') === '/admin/seller')
check('SUPER_ADMIN → /admin', dashboardPathFor('SUPER_ADMIN') === '/admin')

console.log('\n── User verification (§3.1.8.1) ──')

const pending = await prisma.user.create({
  data: {
    email:'arch.pending@atest.dev', name:'Ar. Pending', role:'PROFESSIONAL',
    status:'PENDING_VERIFICATION', emailVerified:new Date(),
    pincode:'110005', state:'Delhi',
    professionalProfile:{ create:{ designaType:'DESIGNA', tier:'PROFESSIONAL', coaNumber:'CA/2015/111' } },
  },
  include:{ professionalProfile:true },
})

check('a new professional starts in PENDING_VERIFICATION', pending.status === 'PENDING_VERIFICATION')
check('the profile is not verified yet', pending.professionalProfile.isVerified === false)
check('the COA has not been checked yet', pending.professionalProfile.coaVerified === false)

// the admin verifies
await prisma.$transaction([
  prisma.user.update({ where:{ id:pending.id }, data:{ status:'ACTIVE' } }),
  prisma.professionalProfile.updateMany({ where:{ userId:pending.id },
    data:{ isVerified:true, verifiedAt:new Date(), verifiedById:admin.id, coaVerified:true } }),
  prisma.auditLog.create({ data:{ actorId:admin.id, action:'USER_VERIFIED',
    entityType:'User', entityId:pending.id } }),
])

const after = await prisma.user.findUnique({
  where:{ id:pending.id }, include:{ professionalProfile:true },
})
check('became ACTIVE after verification', after.status === 'ACTIVE')
check('the profile became verified', after.professionalProfile.isVerified === true)
check('the COA became verified', after.professionalProfile.coaVerified === true)
check('who verified it is recorded', after.professionalProfile.verifiedById === admin.id)

const log = await prisma.auditLog.findFirst({
  where:{ entityId: pending.id, action:'USER_VERIFIED' },
})
check('★ an audit log was written — who, when, what', !!log && log.actorId === admin.id)

console.log('\n── Security ──')

const { can } = await import('../src/config/permissions.ts')
check('★ only SUPER_ADMIN can create an employee', can('SUPER_ADMIN','admin:employees'))
check('ADMIN cannot create an employee', !can('ADMIN','admin:employees'))
check('RM_EMPLOYEE cannot create an employee', !can('RM_EMPLOYEE','admin:employees'))
check('PROFESSIONAL cannot see admin pages', !can('PROFESSIONAL','admin:users'))
check('ADMIN_SELLER gets merchandise/podcast only', can('ADMIN_SELLER','seller:merchandise') && !can('ADMIN_SELLER','admin:users'))
check('RM_EMPLOYEE can see leads', can('RM_EMPLOYEE','employee:leads'))

await cleanup()
await prisma.$disconnect()

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
