import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssociate, associateContent } from '@/lib/design-associates'
import { StorefrontSection } from '../storefront-section'

/**
 * Blog on this associate's storefront.
 *
 * A thin route: it names the post type and hands off. Every one of these
 * pages reads the SAME `Post` rows the associate's dashboard writes, filtered
 * by `authorId` — there is no blog record that belongs to
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
  return { title: `Blog — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const items = await associateContent(a.id, 'BLOG', 48)

  return (
    <StorefrontSection
      title="Blog"
      blurb="Writing published by this associate."
      items={items}
      who={a.firmName || a.name}
      browseAllHref="/blog"
      browseAllLabel="Browse all blog on ArchFacing"
    />
  )
}
