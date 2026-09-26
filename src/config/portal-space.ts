/**
 * Portal Space packs — PDF §5.2.9, §6.1.2.2.6 IX
 *
 * Every registrant gets 100 MB free (§4.4). When that fills up they can buy
 * extra space, which lasts 5 years and is non-refundable.
 *
 * These live in config rather than the database because the list is short
 * and changes rarely. Prices are pre-tax; GST is added at checkout.
 */

export type PortalSpacePack = {
  slug: string
  name: string
  extraMb: number
  /** rupees, before GST */
  price: number
  blurb: string
  isPopular?: boolean
}

export const PORTAL_SPACE_PACKS: PortalSpacePack[] = [
  {
    slug: 'space-250',
    name: '250 MB',
    extraMb: 250,
    price: 999,
    blurb: 'Roughly 120 more project photographs at our upload sizes.',
  },
  {
    slug: 'space-500',
    name: '500 MB',
    extraMb: 500,
    price: 1799,
    blurb: 'Enough for a full year of regular posting, with drawings and PDFs.',
    isPopular: true,
  },
  {
    slug: 'space-1024',
    name: '1 GB',
    extraMb: 1024,
    price: 2999,
    blurb: 'For firms publishing large portfolios and presentation decks.',
  },
  {
    slug: 'space-2048',
    name: '2 GB',
    extraMb: 2048,
    price: 4999,
    blurb: 'Built for Corporate accounts and BMF catalogues.',
  },
]

export const PORTAL_SPACE_TAX_PERCENT = 18

export function findPack(slug: string): PortalSpacePack | undefined {
  return PORTAL_SPACE_PACKS.find((p) => p.slug === slug)
}
