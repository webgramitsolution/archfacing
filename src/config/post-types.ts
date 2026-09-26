/**
 * The structure of every kind of posting — in one place.
 *
 * PDF §5.2.2 through §5.2.7 list the fields of each form separately, but the
 * structure is nearly identical. So it lives here as config and a single form
 * component handles all of them.
 */

import type { PostType } from '@prisma/client'
import type { Permission } from './permissions'

export type ExtraField = {
  name: string
  label: string
  /**
   * The richer types exist so a form can capture everything its public page
   * renders, instead of that detail arriving from seeded demo `meta`:
   *   richtext → Markdown body     list  → array of strings
   *   pairs    → label/value rows   select → fixed choices
   */
  type:
    | 'text' | 'number' | 'date' | 'datetime' | 'textarea' | 'url' | 'checkbox'
    | 'richtext' | 'list' | 'pairs' | 'select'
  required?: boolean
  hint?: string
  placeholder?: string
  /** checkbox only — ticked when the form first opens */
  defaultChecked?: boolean
  /** select only */
  options?: string[]
  /** list / pairs only */
  max?: number
  /** pairs only — the two column placeholders */
  pairLabels?: [string, string]
  /** Lays the field out across both columns. Implied for the wide types. */
  wide?: boolean
}

export type PostTypeConfig = {
  type: PostType
  /** Used in the URL — /projects, /products … */
  slug: string
  label: string
  /** The wording shown in the dashboard */
  dashboardLabel: string
  pdfRef: string
  permission: Permission
  /** Path to the public listing */
  publicPath: string

  description: string
  /** The PDF specifies 200 words for most forms */
  maxWords: number

  /** `free` accepts any shape — an artwork is as often portrait as landscape. */
  images: { min: number; max: number; aspect: 'default' | 'wide' | 'free' }
  /**
   * A second, separate image upload — §5.2.4.1.2.16 asks a design competition
   * for the project's plan drawings alongside its photographs. The files are
   * tagged with `label` so the two sets stay apart afterwards.
   */
  planImages?: { min: number; max: number; label: string; hint: string }
  allowVideo: boolean
  allowPdf: boolean
  allowPpt: boolean

  /** Which PostType the category tree is drawn from */
  categorySource: PostType
  /** Is a sub-category required? */
  requiresSubCategory: boolean

  /** Fields specific to this type — stored as JSON in Post.meta */
  extraFields: ExtraField[]
}

export const POST_TYPES: Record<string, PostTypeConfig> = {
  // ─── §5.2.2 ───
  PROJECT: {
    type: 'PROJECT',
    slug: 'projects',
    label: 'Project',
    dashboardLabel: 'My Projects',
    pdfRef: '5.2.2',
    permission: 'post:project',
    publicPath: '/projects',
    description:
      'Showcase your completed work — with images, a description and a video link.',
    maxWords: 200,
    images: { min: 1, max: 8, aspect: 'default' },
    allowVideo: true,
    allowPdf: true,
    allowPpt: true,
    categorySource: 'PROJECT',
    requiresSubCategory: true,
    /*
     * These names are the keys `lib/projects.ts` reads when it renders the
     * public project page, so what is typed here is exactly what appears
     * there — no seeded demo `meta` in between.
     */
    extraFields: [
      {
        name: 'detailBody', label: 'Full description', type: 'richtext',
        hint: 'The long write-up on the project page. Formatting is supported.',
        placeholder: 'Describe the brief, the site, the materials and what makes this project work…',
      },
      { name: 'architect', label: 'Architect / designer', type: 'text' },
      { name: 'client', label: 'Client name', type: 'text' },
      { name: 'style', label: 'Style', type: 'text', placeholder: 'Contemporary, Vernacular…' },
      { name: 'projectType', label: 'Project type', type: 'text', placeholder: 'Residential, Commercial…' },
      { name: 'areaSqft', label: 'Area (sq ft)', type: 'number', hint: 'Built-up area' },
      { name: 'budgetLabel', label: 'Budget', type: 'text', placeholder: '₹80 L – ₹1 Cr' },
      { name: 'yearLabel', label: 'Year of completion', type: 'text', placeholder: '2026' },
      { name: 'url', label: 'Project page (link)', type: 'url' },
      {
        name: 'scopeOfWork', label: 'Scope of work', type: 'list', max: 12,
        placeholder: 'Architecture, Interiors, Landscape…',
        hint: 'Each item appears as a point on the project page.',
      },
      {
        name: 'tags', label: 'Tags', type: 'list', max: 10,
        placeholder: 'Sustainable, Courtyard, Brick…',
      },
      {
        name: 'features', label: 'Key features', type: 'pairs', max: 12,
        pairLabels: ['Feature', 'Detail'],
        hint: 'Shown as the feature grid — e.g. “Bedrooms” / “4”.',
      },
    ],
  },

  // ─── §5.2.3 ───
  PRODUCT: {
    type: 'PRODUCT',
    slug: 'products',
    label: 'Product',
    dashboardLabel: 'My Products',
    pdfRef: '5.2.3',
    permission: 'post:product',
    publicPath: '/products',
    description: 'Showcase your product — with images, pricing and a brochure.',
    maxWords: 200,
    images: { min: 1, max: 8, aspect: 'default' },
    allowVideo: true,
    allowPdf: true,
    allowPpt: false,
    categorySource: 'PRODUCT',
    requiresSubCategory: true,
    /* Keys match `lib/products.ts`, so the product page shows what is typed. */
    extraFields: [
      {
        name: 'detailBody', label: 'Full description', type: 'richtext',
        hint: 'The long description on the product page. Formatting is supported.',
        placeholder: 'What it is, what it is made of, where it is used…',
      },
      { name: 'brand', label: 'Brand', type: 'text' },
      { name: 'price', label: 'Price (₹)', type: 'number' },
      { name: 'unit', label: 'Unit', type: 'text', placeholder: 'per sq.ft / per piece' },
      { name: 'moq', label: 'Minimum order', type: 'text', placeholder: '50 sq.ft' },
      {
        name: 'availability', label: 'Availability', type: 'select',
        options: ['In Stock', 'Made to Order'],
      },
      { name: 'material', label: 'Material', type: 'text' },
      { name: 'colour', label: 'Colour / finish', type: 'text' },
      { name: 'application', label: 'Application', type: 'text', placeholder: 'Flooring, Cladding…' },
      { name: 'warranty', label: 'Warranty', type: 'text' },
      { name: 'url', label: 'Product page (link)', type: 'url' },
      {
        name: 'highlights', label: 'Highlights', type: 'list', max: 10,
        placeholder: 'Scratch resistant, 10-year warranty…',
      },
      {
        name: 'specs', label: 'Specifications', type: 'pairs', max: 20,
        pairLabels: ['Specification', 'Value'],
        hint: 'The specification table on the product page — e.g. “Thickness” / “18 mm”.',
      },
    ],
  },

  // ─── §5.2.4 ───
  AROUND_US: {
    type: 'AROUND_US',
    slug: 'around-us',
    label: 'Around Us',
    dashboardLabel: 'My Around Us Posts',
    pdfRef: '5.2.4',
    permission: 'post:around_us',
    publicPath: '/around-us',
    description:
      'Events, publications and social work. Social Welfare is free of charge; ' +
      'Reporting & Publication is a paid category.',
    maxWords: 200,
    images: { min: 1, max: 8, aspect: 'wide' },
    allowVideo: true,
    allowPdf: true,
    allowPpt: false,
    categorySource: 'AROUND_US',
    requiresSubCategory: true,
    /* Keys match `lib/around-us.ts`, so the event page shows what is typed. */
    extraFields: [
      {
        name: 'about', label: 'Full write-up', type: 'richtext',
        hint: 'The main body of the page. Formatting is supported.',
        placeholder: 'What is happening, who it is for, why it matters…',
      },
      { name: 'venue', label: 'Venue', type: 'text' },
      { name: 'eventDate', label: 'Date', type: 'date' },
      { name: 'entryType', label: 'Entry type', type: 'text', placeholder: 'Free / Paid / Invite only' },
      { name: 'entryFee', label: 'Entry fee (₹)', type: 'number' },
      { name: 'prizeMoney', label: 'Prize money (₹)', type: 'number' },
      { name: 'attendeeCount', label: 'Expected attendees', type: 'number' },
      { name: 'eligibility', label: 'Who can attend', type: 'text' },
      { name: 'registrationEnds', label: 'Registration closes', type: 'date' },
      { name: 'registerUrl', label: 'Registration link', type: 'url' },
      { name: 'referenceUrl', label: 'More information (link)', type: 'url' },
      { name: 'reportedBy', label: 'Reported by', type: 'text' },
      { name: 'writtenBy', label: 'Written by', type: 'text' },
      {
        name: 'keyPoints', label: 'Key points', type: 'list', max: 12,
        placeholder: 'What attendees should know…',
      },
      {
        name: 'participants', label: 'Participants / speakers', type: 'list', max: 20,
        placeholder: 'Name — role',
      },
      {
        name: 'timeline', label: 'Schedule', type: 'pairs', max: 15,
        pairLabels: ['Date / time', 'What happens'],
        hint: 'Drawn as the timeline on the page.',
      },
    ],
  },

  // ─── §5.2.5 ───
  ARTISTRY: {
    type: 'ARTISTRY',
    slug: 'artistry',
    label: 'Artistry',
    dashboardLabel: 'My Artistry Uploads',
    pdfRef: '5.2.5',
    permission: 'post:artistry',
    publicPath: '/artistry',
    description: 'Art and craft — clients can post here as well.',
    maxWords: 200,
    images: { min: 1, max: 10, aspect: 'free' }, // client: 1–10 images (Sept 2026)
    allowVideo: true,
    allowPdf: true,
    allowPpt: false,
    categorySource: 'ARTISTRY',
    requiresSubCategory: false,
    /* Keys match `lib/artistry.ts`, so the artwork page shows what is typed. */
    extraFields: [
      {
        name: 'about', label: 'About this work', type: 'richtext',
        hint: 'The write-up under the artwork. Formatting is supported.',
        placeholder: 'The idea behind it, the process, the materials…',
      },
      { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'A one-line description' },
      { name: 'medium', label: 'Medium', type: 'text', placeholder: 'Oil on canvas, terracotta…' },
      { name: 'location', label: 'Where it is', type: 'text' },
      { name: 'projectStatus', label: 'Status', type: 'select', options: ['Completed', 'In Progress', 'Concept'] },
      { name: 'artworkId', label: 'Artwork reference', type: 'text', placeholder: '#AFD3117' },
      {
        name: 'tags', label: 'Tags', type: 'list', max: 10,
        placeholder: 'Terracotta, Handmade, Traditional…',
      },
      {
        name: 'specsLeft', label: 'Details (left column)', type: 'pairs', max: 10,
        pairLabels: ['Label', 'Value'],
        hint: 'e.g. “Category” / “Design Integration”.',
      },
      {
        name: 'specsRight', label: 'Details (right column)', type: 'pairs', max: 10,
        pairLabels: ['Label', 'Value'],
        hint: 'e.g. “Medium” / “Water Architecture”.',
      },
    ],
  },

  // ─── §5.2.6 ───
  BLOG: {
    type: 'BLOG',
    slug: 'blog',
    label: 'Blog',
    dashboardLabel: 'My Blog Posts',
    pdfRef: '5.2.6',
    permission: 'post:blog',
    publicPath: '/blog',
    description: 'Share your perspective — industry, technology, experience.',
    maxWords: 2000,
    images: { min: 1, max: 4, aspect: 'wide' },
    allowVideo: true,
    allowPdf: false,
    allowPpt: false,
    categorySource: 'BLOG',
    requiresSubCategory: false,
    extraFields: [
      { name: 'writtenBy', label: 'Author', type: 'text' },
      { name: 'readMinutes', label: 'Reading time (minutes)', type: 'number' },
    ],
  },

  // ─── §5.2.7 ───
  DESIGN_COMPETITION: {
    type: 'DESIGN_COMPETITION',
    slug: 'competition',
    label: 'Design Competition',
    dashboardLabel: 'Design Competition',
    pdfRef: '5.2.7',
    permission: 'post:competition',
    publicPath: '/competition',
    description: 'Announce a design competition.',
    maxWords: 200,
    images: { min: 1, max: 2, aspect: 'wide' },
    // §5.2.4.1.2.16
    planImages: {
      min: 0,
      max: 2,
      label: 'Project plan drawings',
      hint: 'The plans designers will work from — up to 2 images',
    },
    allowVideo: true,
    allowPdf: true,
    allowPpt: false,
    categorySource: 'DESIGN_COMPETITION',
    requiresSubCategory: false,
    extraFields: [
      { name: 'prizeMoney', label: 'Prize money (₹)', type: 'number', required: true },
      {
        name: 'submissionDeadline',
        label: 'Submit before (date and time)',
        type: 'datetime',
        required: true,
        hint: 'The hour matters on the closing day',
      },
      { name: 'juryRequired', label: 'Number of jury members', type: 'number' },
      { name: 'proposedArea', label: 'Project area (sq.m)', type: 'number' },
      { name: 'coordinatorEmail', label: 'Co-ordinator email', type: 'text' },
      { name: 'introducerPhone', label: 'Introducer phone', type: 'text' },
      { name: 'introducerWebsite', label: 'Website', type: 'url' },
      // §5.2.4.1.2.1 — who the brief is shown to
      {
        name: 'visibleToDesigna',
        label: 'Visible to DESIGNA (architecture)',
        type: 'checkbox',
        defaultChecked: true,
      },
      {
        name: 'visibleToDesigni',
        label: 'Visible to DESIGNI (interior)',
        type: 'checkbox',
        defaultChecked: true,
      },
      // §5.2.4.1.2.18
      {
        name: 'needsDesignAssociate',
        label: 'I need a Design Associate for this',
        type: 'checkbox',
      },
    ],
  },
}

/** Look up config by slug — for routes like /dashboard/…/projects */
export function postTypeBySlug(slug: string): PostTypeConfig | null {
  return Object.values(POST_TYPES).find((c) => c.slug === slug) ?? null
}

export const ALL_POST_TYPES = Object.values(POST_TYPES)
