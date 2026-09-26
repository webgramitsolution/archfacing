import type { Metadata } from 'next'
import { safeNext } from '@/lib/safe-next'
import { redirect } from 'next/navigation'
import { auth, dashboardPathFor } from '@/lib/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your ArchFacing dashboard.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const session = await auth()
  if (session?.user) redirect(dashboardPathFor(session.user.role))

  const { error, next } = await searchParams
  return <LoginForm initialError={error} next={safeNext(next, '/dashboard')} />
}
