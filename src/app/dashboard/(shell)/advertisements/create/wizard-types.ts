/**
 * The shape the Create Advertisement wizard carries between its steps.
 *
 * One flat object rather than seven: a step reads what it needs and writes
 * back through `patch`, so adding a field to step 4 does not change step 5's
 * signature. Everything is a plain string or array — the same values the
 * server actions parse — which keeps the client from holding Date or Decimal
 * objects it would only have to serialise again.
 */

import type { CreativePalette } from '@/lib/ad-creative'
import type { Spot } from './placement-preview'

export type Draft = {
  id: string | null

  /** Step 1 — campaign details */
  title: string
  /** Whose advertisement it is — the business it runs under. */
  brandName: string
  description: string
  adTypeSlug: string
  objective: string

  /** Step 2 — creative */
  imageUrl: string
  imageKey: string
  mobileImageUrl: string
  logoUrl: string
  headline: string
  tagline: string
  ctaText: string
  targetUrl: string

  /**
   * What the uploaded files ARE — measured by sharp at upload, carried here
   * so every preview can fit the artwork without cropping it and build the
   * backdrop from the artwork's own colours. Null for a creative uploaded
   * before this was measured.
   */
  imageWidth: number | null
  imageHeight: number | null
  imagePalette: CreativePalette | null
  mobileImageWidth: number | null
  mobileImageHeight: number | null
  mobileImagePalette: CreativePalette | null

  /** Step 3 — placement. The first is the campaign's primary placement. */
  placementSlugs: string[]

  /** Step 4 — audience */
  country: string
  states: string[]
  cities: string[]
  pincodes: string[]
  pactAreas: string[]
  productCategories: string[]
  projectCategories: string[]
  professionalCategories: string[]
  audienceRoles: string[]

  /** Step 5 — schedule. ISO dates, "HH:mm" times. */
  startsAt: string
  endsAt: string
  startTime: string
  endTime: string

  /** Step 6 — package */
  packageSlug: string
}

export const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  brandName: '',
  description: '',
  adTypeSlug: '',
  objective: 'Brand Awareness',
  imageUrl: '',
  imageKey: '',
  imageWidth: null,
  imageHeight: null,
  imagePalette: null,
  mobileImageUrl: '',
  mobileImageWidth: null,
  mobileImageHeight: null,
  mobileImagePalette: null,
  logoUrl: '',
  headline: '',
  tagline: '',
  ctaText: '',
  targetUrl: '',
  placementSlugs: [],
  country: 'India',
  states: [],
  cities: [],
  pincodes: [],
  pactAreas: [],
  productCategories: [],
  projectCategories: [],
  professionalCategories: [],
  audienceRoles: [],
  startsAt: '',
  endsAt: '',
  startTime: '',
  endTime: '',
  packageSlug: '',
}

/** What the server hands the wizard to choose from. */
export type WizardOptions = {
  adTypes: { slug: string; name: string; description: string | null; icon: string }[]
  placements: {
    slug: string
    name: string
    size: string
    page: string
    price: number
    note: string
    /** Where on its page the slot sits — drives the page-context preview. */
    spot: Spot
    /** "Premium Placement", "High Visibility" — the coloured line on the card. */
    tag: string
    /**
     * Which creative this slot takes.
     *
     * Derived from the slug rather than stored: a `mobile-*` placement is
     * served the phone cut, everything else the desktop one. A column would
     * be a second place for the two to disagree.
     */
    device: 'Desktop' | 'Mobile'
  }[]
  packages: {
    slug: string
    name: string
    durationLabel: string
    durationDays: number
    price: number
    taxPercent: number
    perLabel: string
    features: string[]
    isPopular: boolean
  }[]
  categories: {
    product: { slug: string; name: string }[]
    project: { slug: string; name: string }[]
    professional: { slug: string; name: string }[]
  }
  states: string[]
  /** The businesses on this account that an advertisement can be run for. */
  brands: { name: string; logo: string | null }[]
}

/** §19 — the segments a campaign can be aimed at. */
export const AUDIENCE_TYPES = [
  { value: 'PROFESSIONAL', label: 'Architects' },
  { value: 'DESIGNI', label: 'Interior Designers' },
  { value: 'BUILDER', label: 'Builders' },
  { value: 'CONTRACTOR', label: 'Contractors' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'CLIENT', label: 'Clients' },
  { value: 'BMF', label: 'BMF' },
  { value: 'STUDENT', label: 'Students' },
] as const

export const OBJECTIVES = [
  'Brand Awareness',
  'Lead Generation',
  'Product Promotion',
  'Event Promotion',
  'Other',
] as const

export const STEPS = [
  'Campaign',
  'Creative',
  'Placement',
  'Audience',
  'Schedule',
  'Package',
  'Review & Pay',
] as const
