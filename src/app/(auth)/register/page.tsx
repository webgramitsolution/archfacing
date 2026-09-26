import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, dashboardPathFor } from '@/lib/auth'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register',
  description:
    'Register on ArchFacing as a Professional, Consultant, BMF, Corporate or Client.',
}

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) redirect(dashboardPathFor(session.user.role))

  return (
    <Suspense fallback={<p className="text-ink-3">Loading…</p>}>
      <RegisterForm />
    </Suspense>
  )
}
