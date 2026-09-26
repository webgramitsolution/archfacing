import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { Icon, EmptyState, Callout } from '@/components/ui'
import { VerifiedTick } from '@/components/verified-badge'
import { badgeTones } from '@/lib/verified'

export const metadata: Metadata = { title: 'Professionals in Area' }

/**
 * Who else is registered in this BMF's PACT PIN code.
 *
 * The sidebar used to send this link to `/designers-associates`, the public
 * directory — which dropped the reader out of their dashboard onto the
 * marketing site, and showed them every professional in India rather than the
 * ones in their own territory. This is the same question asked of the same
 * data, inside the shell, scoped to the PIN code they hold.
 *
 * Everything here is a real row: `User` filtered by `pincode` and `status`.
 * Contact details are deliberately not shown — a BMF reaches a professional
 * through an enquiry, not by lifting their phone number out of a list.
 */

const ROLE_LABEL: Record<string, string> = {
  PROFESSIONAL: 'Professional',
  CONSULTANT: 'Consultant',
  BMF: 'BMF',
  CORPORATE: 'Corporate',
  CLIENT: 'Client',
}

const ROLE_TONE: Record<string, string> = {
  PROFESSIONAL: 'bg-brand-soft text-brand',
  CONSULTANT: 'bg-ok-soft text-ok',
  BMF: 'bg-warn-soft text-warn',
  CORPORATE: 'bg-info-soft text-info',
  CLIENT: 'bg-paper-3 text-ink-3',
}

function pretty(s: string): string {
  return s.replace(/[_-]/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

export default async function BmfProfessionalsPage() {
  const user = await requireRole('BMF')

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pincode: true,
      pacts: {
        where: { status: { in: ['ACTIVE', 'RESERVED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { pincode: true, city: true },
      },
    },
  })

  // the PACT's PIN code is the territory; the home PIN stands in until one is
  // bought, so the page says something useful before the first purchase
  const pact = me?.pacts[0]
  const pin = pact?.pincode ?? me?.pincode ?? null

  const people = pin
    ? await prisma.user.findMany({
        where: {
          pincode: pin,
          status: 'ACTIVE',
          deletedAt: null,
          id: { not: user.id },
          role: { in: ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'] },
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        take: 100,
        select: {
          id: true, name: true, role: true, city: true, state: true,
          professionalProfile: { select: { designaType: true, tier: true, isVerified: true } },
          consultantProfile: { select: { group: true, subCategory: true, isVerified: true } },
          corporateProfile: { select: { companyName: true, isVerified: true } },
          _count: { select: { posts: true } },
        },
      })
    : []
  // Blue tick = an active PACT holder (lib/verified.ts).
  const tones = await badgeTones(people.map((p) => p.id))

  return (
    <div>
      <PageHeading title="Professionals in Area" pdfRef="5.3.4">
        Everyone registered in{' '}
        {pin ? (
          <>
            PIN <strong className="font-mono">{pin}</strong>
            {pact?.city ? ` · ${pact.city}` : ''}
          </>
        ) : (
          'your area'
        )}
        {pact ? ' — the territory your PACT covers.' : '.'}
      </PageHeading>

      {!pin ? (
        <Callout
          tone="info"
          title="No area set yet"
          action={<Link href="/dashboard/bmf/pact" className="btn-primary">Buy a PACT</Link>}
        >
          Add a PIN code to your profile, or take the PACT for your area, and
          the professionals registered there will be listed here.
        </Callout>
      ) : !pact ? (
        <Callout
          tone="warn"
          title="Showing your home PIN code"
          action={<Link href="/dashboard/bmf/pact" className="btn-primary">See PACT areas</Link>}
        >
          You do not hold a PACT yet, so this is the PIN code on your profile
          rather than a territory. Enquiries from an area go to whoever holds
          its PACT.
        </Callout>
      ) : null}

      {pin && people.length === 0 ? (
        <EmptyState
          icon="users"
          title="Nobody else registered here yet"
          action={
            <Link href="/designers-associates" className="btn-secondary">
              Browse the full directory
            </Link>
          }
        >
          No Professional, Consultant or Corporate account is registered in{' '}
          {pin} yet. As the area fills up they will appear here.
        </EmptyState>
      ) : null}

      {people.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 wide:grid-cols-3">
          {people.map((p) => {
            // Blue tick = an active PACT holder (lib/verified.ts).
            const tone = tones.get(p.id) ?? null
            const verified = tone !== null

            // the one line under the name that says what they actually do
            const detail =
              p.professionalProfile?.designaType ??
              (p.consultantProfile
                ? pretty(p.consultantProfile.subCategory)
                : p.corporateProfile?.companyName) ??
              null

            return (
              <li
                key={p.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper-2 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white">
                  {p.name?.[0]?.toUpperCase() ?? '?'}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">
                      {p.name ?? 'Unnamed account'}
                    </span>
                    {verified && (
                      <VerifiedTick className="h-3.5 w-3.5" tone={tone} />
                    )}
                  </span>

                  {detail && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                      {detail}
                      {p.professionalProfile?.tier
                        ? ` · ${pretty(p.professionalProfile.tier)}`
                        : ''}
                    </span>
                  )}

                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${
                        ROLE_TONE[p.role] ?? 'bg-paper-3 text-ink-3'
                      }`}
                    >
                      {ROLE_LABEL[p.role] ?? pretty(p.role)}
                    </span>
                    <span className="text-[11px] text-ink-4">
                      {[p.city, p.state].filter(Boolean).join(', ') || pin}
                    </span>
                    <span className="tabular text-[11px] text-ink-4">
                      {p._count.posts} posting{p._count.posts === 1 ? '' : 's'}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {people.length > 0 && (
        <p className="mt-5 text-[12px] text-ink-3">
          {people.length === 100
            ? 'Showing the first 100. '
            : `${people.length} account${people.length === 1 ? '' : 's'} in this area. `}
          Looking further afield?{' '}
          <Link href="/designers-associates" className="font-semibold text-brand hover:underline">
            Browse the full directory
          </Link>
          .
        </p>
      )}
    </div>
  )
}
