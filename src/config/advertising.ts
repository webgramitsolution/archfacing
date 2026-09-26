/**
 * The Advertisements page — the SALES COPY, and nothing else.
 *
 * Everything that describes an actual advertiser, campaign, category, package
 * or count is read from the database (`src/lib/ad-marketplace.ts`). What is
 * left here is the page's own prose: the four promises in the hero, the
 * reasons to advertise, and the trust strip that closes the page. None of it
 * names a brand, and none of it is a number about the marketplace.
 *
 * If you find yourself adding an advertiser or a figure to this file, it
 * belongs in the database instead — see §23 of the advertisement spec.
 */

import type { IconName } from '@/components/ui'

/** The banner behind the hero card and the closing call to action. */
export const AD_BANNER =
  'https://res.cloudinary.com/c7h30ayk/image/upload/v1789166160/hme_baner_1.png'

export const AD_HERO_FEATURES: { icon: IconName; title: string; sub: string }[] = [
  {
    icon: 'target',
    title: 'Target Right Audience',
    sub: 'Architects, Designers,\nBuilders & More',
  },
  {
    icon: 'map',
    title: 'Multiple Ad Locations',
    sub: 'Across Website in\nPremium Slots',
  },
  {
    icon: 'eye',
    title: 'Better Visibility',
    sub: 'Increase Brand Awareness\nand Get Quality Leads',
  },
  {
    icon: 'chart',
    title: 'Measurable Results',
    sub: 'Track Impressions, Clicks\nand Leads Easily',
  },
]

export const WHY_ADVERTISE = [
  'Highly Targeted Audience',
  'Premium Ad Positions',
  'Quality Leads & Inquiries',
  'Increase Brand Visibility',
  'Data Driven Insights',
  'Dedicated Customer Support',
]

export const AD_TRUST: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'target', title: 'Targeted Audience', sub: 'Right People, Right Time' },
  { icon: 'star', title: 'Premium Visibility', sub: 'Top Quality Ad Placements' },
  { icon: 'inbox', title: 'Generate Quality Leads', sub: 'Real Inquiries, Real Business' },
  { icon: 'chart', title: 'Track & Measure', sub: 'Detailed Analytics & Reports' },
  { icon: 'help', title: '24/7 Support', sub: "We're Here to Help" },
]
