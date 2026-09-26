import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssociate, associateContent } from '@/lib/design-associates'
import { StorefrontSection } from '../storefront-section'

/**
 * Artistry on this associate's storefront.
 *
 * A thin route: it names the post type and hands off. Every one of these
 * pages reads the SAME `Post` rows the associate's dashboard writes, filtered
 * by `authorId` — there is no artistry record that belongs to
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
  return { title: `Artistry — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const items = await associateContent(a.id, 'ARTISTRY', 48)

  return (
    <StorefrontSection
      title="Artistry"
      blurb="Artwork and creative pieces published by this associate."
      items={items}
      who={a.firmName || a.name}
      browseAllHref="/artistry"
      browseAllLabel="Browse all artistry on ArchFacing"
    />
  )
}
