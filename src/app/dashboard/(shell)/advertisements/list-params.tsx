import Link from 'next/link'
import { Callout } from '@/components/ui'
import type { ListOptions } from '@/lib/advertiser'

/**
 * The bits every advertisement list screen needs but none of them owns.
 */

/** Turns the URL's query string into the options `listCampaigns` takes. */
export function readListParams(sp: Record<string, string | undefined>): ListOptions {
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const take = 10

  return {
    q: sp.q?.trim() || undefined,
    typeSlug: sp.type || undefined,
    placementSlug: sp.placement || undefined,
    // Performance sorts included: the statistic tiles on the Active screen
    // link here with ?sort=impressions and the like, so the list below ranks
    // by whichever figure was clicked.
    sort: (['newest', 'oldest', 'name', 'soonest', 'impressions', 'clicks', 'ctr', 'spend'] as const).includes(sp.sort as never)
      ? (sp.sort as ListOptions['sort'])
      : 'newest',
    take,
    skip: (page - 1) * take,
  }
}

/**
 * The sort choices each screen offers.
 *
 * They differ because the question differs: on Scheduled you want to know what
 * is coming next, on Completed what happened most recently.
 */
export const SORTS = {
  updated: [
    { value: '', label: 'Last Modified' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name (A–Z)' },
  ],
  submitted: [
    { value: '', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name (A–Z)' },
  ],
  upcoming: [
    { value: 'soonest', label: 'Upcoming First' },
    { value: 'newest', label: 'Newest First' },
    { value: 'name', label: 'Name (A–Z)' },
  ],
  recent: [
    { value: '', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name (A–Z)' },
  ],
  /**
   * Active adds the performance sorts, so the dropdown can say what the
   * statistic tiles above it already do.
   */
  performance: [
    { value: '', label: 'Newest First' },
    { value: 'impressions', label: 'Most Impressions' },
    { value: 'clicks', label: 'Most Clicks' },
    { value: 'ctr', label: 'Best CTR' },
    { value: 'spend', label: 'Highest Spend' },
    { value: 'name', label: 'Name (A–Z)' },
  ],
} satisfies Record<string, { value: string; label: string }[]>

/**
 * Shown instead of a campaign list when the reader's account cannot advertise.
 *
 * Rendered rather than redirected on purpose: someone who followed a link from
 * the rate card deserves to be told why, not bounced back to their dashboard
 * with no explanation.
 */
export function NotAnAdvertiser() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Callout tone="info" icon="help" title="Advertising is not open on this account">
        Advertisement campaigns can be booked by Corporate and Building Materials
        Facilitator accounts.{' '}
        <Link href="/advertisements" className="font-semibold text-brand hover:underline">
          See what advertising on ArchFacing involves
        </Link>
        , or{' '}
        <Link href="/legal/contact" className="font-semibold text-brand hover:underline">
          talk to our team
        </Link>
        .
      </Callout>
    </div>
  )
}
