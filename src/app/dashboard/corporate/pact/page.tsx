import type { Metadata } from 'next'
import { BUSINESS_RULES, termYears } from '@/config/permissions'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { PactBrowser } from '../../pact-browser'
import { pactPlanBlock } from '@/lib/pact'
import { MyPactList } from '../../my-pact-list'

export const metadata: Metadata = { title: 'My PACT' }

/**
 * §5.4.3 — the PACT area a Corporate account holds.
 *
 * The same pair of components every other role's PACT page uses; only the
 * guard and the copy differ. `PactBrowser` reads `designaType` on its
 * PROFESSIONAL branch and `lockedSubCategory` on its CONSULTANT one, neither
 * of which a Corporate row carries, so both are passed as null.
 */
export default async function CorporatePactPage() {
  const user = await requireRole('CORPORATE')

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pincode: true,
      pacts: {
        where: { status: { in: ['ACTIVE', 'RESERVED', 'SUSPENDED'] } },
        orderBy: { purchasedAt: 'desc' },
      },
    },
  })

  // Free plan → no PACT; a paid plan caps how many (lib/pact.ts pactPlanBlock).
  const planBlock = user.status === 'ACTIVE' ? await pactPlanBlock(user.id) : null
  const canBuy = user.status === 'ACTIVE' && !planBlock

  return (
    <div>
      <PageHeading title="My PACT" pdfRef="5.4.3">
        PACT stands for PIN Area Code Territory — an exclusive franchise over a
        PIN code for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}, renewable. Every enquiry from that area comes straight to
        your company.
      </PageHeading>

      {profile?.pacts.length ? (
        <div className="mb-10">
          <MyPactList pacts={profile.pacts} />
        </div>
      ) : null}

      <PactBrowser
        role={user.role}
        designaType={null}
        lockedSubCategory={null}
        homePincode={profile?.pincode ?? null}
        canBuy={canBuy}
        blockedReason={
          canBuy
            ? undefined
            : planBlock
              ? planBlock.message
              : 'Your company is still under verification. You will be able to purchase a PACT once the ArchFacing team completes that review.'
        }
      />
    </div>
  )
}
