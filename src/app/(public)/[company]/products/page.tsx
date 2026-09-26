import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssociate, associateContent } from '@/lib/design-associates'
import { Icon } from '@/components/ui'
import { StorefrontSection } from '../storefront-section'

/**
 * Products on this associate's storefront.
 *
 * A thin route: it names the post type and hands off. Every one of these
 * pages reads the SAME `Post` rows the associate's dashboard writes, filtered
 * by `authorId` — there is no products record that belongs to
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
  return { title: `Products — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const items = await associateContent(a.id, 'PRODUCT', 48)

  /*
   * The business record is a note, never a gate.
   *
   * This blocked the whole shelf when `CorporateProfile` was missing — and
   * hid three products a professional had already published, which is the
   * opposite of what a storefront is for. Company details (name, GST, PAN)
   * are what a seller needs to keep listing and to be invoiced against; they
   * are not a reason to hide work that is already public.
   *
   * So the products show, and the missing registration is said quietly above
   * them.
   */
  return (
    <>
      {items.length > 0 && !a.company && (
        <div className="container-af pt-7">
          <p className="flex items-start gap-2 rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-[12.5px] leading-snug text-ink-2">
            <Icon name="alert" className="mt-[2px] h-4 w-4 shrink-0 text-warn" />
            <span>
              {a.firmName || a.name} has not registered business details on
              ArchFacing yet. Company name, GST and PAN are needed for invoicing
              — contact them directly for a quote.
            </span>
          </p>
        </div>
      )}

      <StorefrontSection
        title="Products"
        blurb="Products this seller lists on ArchFacing."
        items={items}
        who={a.firmName || a.name}
        browseAllHref="/products"
        browseAllLabel="Browse all products on ArchFacing"
        itemHrefBase={`/${a.slug}/products`}
      />
    </>
  )
}
