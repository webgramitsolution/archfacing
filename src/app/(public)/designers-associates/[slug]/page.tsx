import { permanentRedirect } from 'next/navigation'

/**
 * The storefront moved to the root.
 *
 * A seller's address is `archfacing.com/webgramitsolution`, not
 * `archfacing.com/designers-associates/webgramitsolution` — it is the address
 * they put on a card, so it has to be short. This keeps every link that was
 * already shared working, with a 308 so search engines move their record of
 * the page rather than treating the two as duplicates.
 */
export default async function MovedStorefront({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  permanentRedirect(`/${slug}`)
}
