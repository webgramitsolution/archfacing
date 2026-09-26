import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssociate, associateContent } from '@/lib/design-associates'
import { StorefrontSection } from '../storefront-section'

/**
 * Around Us on this associate's storefront.
 *
 * A thin route: it names the post type and hands off. Every one of these
 * pages reads the SAME `Post` rows the associate's dashboard writes, filtered
 * by `authorId` — there is no around us record that belongs to
 * the storefront rather than to them.
 */

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return { title: 'Not found' }
  return { title: `Around Us — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const items = await associateContent(a.id, 'AROUND_US', 48)

  return (
    <StorefrontSection
      title="Around Us"
      blurb="Events, notices and social welfare posts from this associate."
      items={items}
      who={a.firmName || a.name}
      browseAllHref="/around-us"
      browseAllLabel="Browse all around us on ArchFacing"
    />
  )
}
