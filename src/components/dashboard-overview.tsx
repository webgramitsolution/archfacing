import Link from 'next/link'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PageHeading, ComingSoon } from './dashboard-shell'
import { can } from '@/config/permissions'
import { BUSINESS_RULES } from '@/config/permissions'

/** The landing page of every role's dashboard */
export async function DashboardOverview({
  userId,
  role,
}: {
  userId: string
  role: Role
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      pincode: true,
      state: true,
      storageQuotaMb: true,
      storageUsedMb: true,
      status: true,
      professionalProfile: { select: { designaType: true, tier: true, isVerified: true } },
      consultantProfile: { select: { group: true, subCategory: true, isVerified: true } },
      bmfProfile: { select: { businessName: true, isVerified: true } },
      corporateProfile: { select: { companyName: true, isVerified: true } },
      _count: { select: { pacts: true, posts: true, enquiriesRecvd: true } },
    },
  })

  if (!user) return null

  const canBuyPact = can(role, 'pact:buy')

  const stats = [
    { label: 'PACT', value: user._count.pacts, show: canBuyPact },
    { label: 'Postings', value: user._count.posts, show: true },
    { label: 'Enquiries', value: user._count.enquiriesRecvd, show: canBuyPact },
    {
      label: 'Storage',
      value: `${user.storageUsedMb} / ${user.storageQuotaMb} MB`,
      show: true,
    },
  ].filter((s) => s.show)

  return (
    <div>
      <PageHeading title={`Welcome, ${user.name}`}>
        {user.pincode && (
          <>
            Your PIN <strong className="font-mono">{user.pincode}</strong>
            {user.state && ` · ${user.state}`}
          </>
        )}
      </PageHeading>

      {/* ─── stats ─── */}
      <dl className="mb-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper-2 px-4 py-3.5">
            <dt className="eyebrow">{s.label}</dt>
            <dd className="tabular mt-1 font-mono text-xl font-semibold">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ─── next step ─── */}
      {canBuyPact && user._count.pacts === 0 && (
        <div className="mb-10 rounded-card border border-line border-l-[3px] border-l-brand bg-brand-soft p-5">
          <p className="eyebrow mb-2 text-brand">Next step</p>
          <h2 className="font-display text-lg font-semibold">
            Take the PACT for your area
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
            PACT stands for PIN Area Code Territory — the exclusive franchise for
            your PIN code, for {BUSINESS_RULES.PACT_VALIDITY_YEARS} years. Every
            enquiry from that area will land straight in your dashboard.
            {user.pincode && (
              <>
                {' '}
                Check whether your PIN <strong className="font-mono">{user.pincode}</strong> is
                still available.
              </>
            )}
          </p>
          <span className="mt-4 inline-block rounded bg-paper-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            Coming in Phase 2
          </span>
        </div>
      )}

      {/* ─── profile ─── */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-base font-semibold">Your profile</h2>
        <dl className="overflow-hidden rounded-card border border-line text-[13.5px]">
          <Row k="Email" v={user.email} />
          <Row
            k="Status"
            v={
              user.status === 'ACTIVE'
                ? 'Active'
                : user.status === 'PENDING_VERIFICATION'
                  ? 'Verification pending'
                  : user.status
            }
          />
          {user.professionalProfile && (
            <>
              <Row k="Category" v={user.professionalProfile.designaType} />
              <Row k="Tier" v={user.professionalProfile.tier} />
            </>
          )}
          {user.consultantProfile && (
            <>
              <Row k="Group" v={user.consultantProfile.group.replace(/_/g, ' ')} />
              <Row
                k="Sub-category"
                v={user.consultantProfile.subCategory.replace(/-/g, ' ')}
              />
            </>
          )}
          {user.bmfProfile && <Row k="Business" v={user.bmfProfile.businessName} />}
          {user.corporateProfile && (
            <Row k="Company" v={user.corporateProfile.companyName} />
          )}
        </dl>

        <Link
          href={`/dashboard/${role.toLowerCase().replace('_', '-')}/profile`}
          className="mt-3 inline-block text-[13px] font-medium text-brand hover:underline"
        >
          Complete your profile →
        </Link>
      </section>

      {/* ─── what's coming next ─── */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold">
          What&apos;s coming next
        </h2>
        <ComingSoon items={upcomingFor(role)} />
      </section>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex gap-4 border-b border-line-soft px-4 py-2.5 last:border-0">
      <dt className="w-32 shrink-0 text-ink-3">{k}</dt>
      <dd className="text-ink">{v ?? '—'}</dd>
    </div>
  )
}

function upcomingFor(role: Role) {
  const common = [
    { label: 'Buying a PACT and lead routing', ref: '3.1.8', phase: 'Phase 2' },
    { label: 'Projects / Products posting', ref: '5.2.2', phase: 'Phase 3' },
    { label: 'Consult Nearby enquiries', ref: '5.2.12', phase: 'Phase 4' },
    { label: 'Club Membership', ref: '5.2.10', phase: 'Phase 6' },
  ]

  if (role === 'CLIENT') {
    return [
      { label: 'Sending enquiries via Consult Nearby', ref: '5.1.2', phase: 'Phase 4' },
      { label: 'Artistry posting', ref: '5.1.3', phase: 'Phase 3' },
      { label: 'Around Us — free categories', ref: '5.1.4', phase: 'Phase 3' },
      { label: 'Buying Merchandise', ref: '7.4.5', phase: 'Phase 6' },
    ]
  }

  if (role === 'BMF') {
    return [
      { label: 'Buying a PACT', ref: '5.3.4', phase: 'Phase 2' },
      { label: 'Blog posting', ref: '5.3.2', phase: 'Phase 3' },
      { label: 'Design Competition posting', ref: '5.3.3', phase: 'Phase 3' },
      { label: 'Sending leads to corporates', ref: '5.3', phase: 'Phase 4' },
    ]
  }

  if (role === 'CORPORATE') {
    return [
      { label: 'Products posting + brand panel', ref: '6.1.3.6', phase: 'Phase 3' },
      { label: 'Advertisements', ref: '7.4.6', phase: 'Phase 6' },
      { label: 'Portal Spaces', ref: '5.4.4', phase: 'Phase 6' },
      { label: 'Leads from BMF', ref: '3.2.3', phase: 'Phase 4' },
    ]
  }

  if (role === 'PROFESSIONAL') {
    return [...common, { label: 'Becoming a Design Associate', ref: '3.1.7', phase: 'Phase 7' }]
  }

  return common
}
