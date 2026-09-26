import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth, dashboardPathFor } from '@/lib/auth'

export default async function RegistrationDonePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const path = dashboardPathFor(session.user.role)
  const pending = session.user.status === 'PENDING_VERIFICATION'

  return (
    <div>
      <p className="eyebrow mb-3">Registration complete</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Welcome, {session.user.name}
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
        Your account has been created
        {pending
          ? ' and sent for verification. In the meantime, you can complete your profile.'
          : '. You can now publish your work and start receiving enquiries.'}
      </p>

      <Link
        href={path}
        className="mt-8 inline-block rounded-card bg-ink px-6 py-3 text-[14px] font-semibold text-paper transition-colors hover:bg-brand"
      >
        Open dashboard →
      </Link>
    </div>
  )
}
