import type { Metadata } from 'next'
import { requireAuth } from '@/lib/guard'
import { AD_ROLES } from '@/lib/ads'
import { listCampaigns, filterOptions } from '@/lib/advertiser'
import { AdPageHead, AdBanner, NoCampaigns } from '@/components/dashboard/advertiser-parts'
import { FilterBar } from '../filter-bar'
import { DraftCard } from '../campaign-rows'
import { NotAnAdvertiser, readListParams, SORTS } from '../list-params'

export const metadata: Metadata = { title: 'Draft Advertisements' }
export const dynamic = 'force-dynamic'

/**
 * §7 — the campaigns that have been started but not submitted.
 *
 * The percentage on each card is measured from what the campaign actually
 * holds (`draftProgress`), not from a step counter the wizard writes. A draft
 * whose creative is deleted drops back down on its own.
 */
export default async function DraftAdvertisementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) return <NotAnAdvertiser />

  const options = readListParams(await searchParams)

  const [{ rows, total }, filters] = await Promise.all([
    listCampaigns(user.id, 'drafts', options),
    filterOptions(user.id),
  ])

  return (
    <div>
      <AdPageHead
        title="Drafts"
        subtitle="Continue working on your saved advertisement drafts. Edit, preview or submit when you're ready."
        trail={['Advertisements', 'Drafts']}
      />

      {total > 0 && (
        <AdBanner
          icon="file"
          title={`You have ${total} draft campaign${total === 1 ? '' : 's'}`}
          body="Complete and launch your campaigns to reach more architects, designers and industry professionals."
          tone="warn"
        />
      )}

      <FilterBar
        types={filters.types}
        placements={filters.placements}
        sortOptions={SORTS.updated}
        placeholder="Search draft campaigns…"
      />

      {rows.length === 0 ? (
        <NoCampaigns
          icon="file"
          title="No draft campaigns"
          body="Drafts are saved automatically as you move through the campaign wizard, so you can leave and come back."
          cta={{ label: 'Create Advertisement', href: '/dashboard/advertisements/create' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => (
            <DraftCard key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
