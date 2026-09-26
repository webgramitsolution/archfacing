import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { artworkMeta } from '@/lib/artistry'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { ArtistryForm, EMPTY_DRAFT, type ArtistryDraft } from '../../artistry-form'
import { getArtistryForEdit } from '../../artistry-actions'

export const metadata: Metadata = { title: 'Edit Artistry' }

/** Every slug in the taxonomy, so the ticked groups can be told from badges. */
const GROUPS = new Set(ARTISTRY_CATEGORIES.map((g) => g.slug))

/** Pull a spec row back out of the saved meta by its label. */
function specValue(rows: { label: string; value: string }[], label: string): string {
  return rows.find((r) => r.label === label)?.value ?? ''
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('post:artistry')

  const { id } = await params
  const post = await getArtistryForEdit(id)
  if (!post) notFound()

  const m = artworkMeta(post.meta)
  const extra = (post.meta ?? {}) as Record<string, unknown>
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

  const initial: ArtistryDraft = {
    ...EMPTY_DRAFT,
    id: post.id,
    title: post.title,
    category: post.category,
    subCategory: post.subCategory ?? '',
    location: m.location,
    tags: m.tags,
    shortDescription: post.description,
    detail: m.about.join('\n\n'),
    material: specValue(m.specsLeft, 'Material'),
    dimensions: specValue(m.specsLeft, 'Dimensions (L × W × H)'),
    weight: specValue(m.specsLeft, 'Weight'),
    yearBuilt: specValue(m.specsLeft, 'Year / Built'),
    artType: specValue(m.specsRight, 'Type'),
    technique: specValue(m.specsRight, 'Technique'),
    colourFinish: specValue(m.specsRight, 'Color / Finish'),
    condition: specValue(m.specsRight, 'Condition'),
    // `badges` mixes the ticked taxonomy groups with the marketing flags, so
    // only the ones that are real group slugs come back as checkboxes.
    applicable: m.badges.filter((b) => GROUPS.has(b)),
    featured: m.badges.includes('Featured'),
    projectTitle: m.subtitle,
    projectStatus: m.projectStatus,
    completionDate: m.projectInfo.find((f) => f.label === 'Completion Date')?.value ?? '',
    projectDuration: m.projectInfo.find((f) => f.label === 'Project Duration')?.value ?? '',
    yearPeriod: m.projectInfo.find((f) => f.label === 'Construction Period')?.value ?? '',
    coverImage: m.image,
    gallery: m.gallery,
    videoUrl: typeof extra.videoUrl === 'string' ? extra.videoUrl : '',
    externalUrl: typeof extra.externalUrl === 'string' ? extra.externalUrl : '',
    documents: strings(extra.documents),
    metaTitle: typeof extra.seoTitle === 'string' ? extra.seoTitle : '',
    metaDescription: typeof extra.seoDescription === 'string' ? extra.seoDescription : '',
    keywords: strings(extra.keywords).join(', '),
    allowEnquiries: extra.allowEnquiries !== false,
    allowComments: extra.allowComments !== false,
    showInProfile: extra.showInProfile !== false,
  }

  return <ArtistryForm initial={initial} />
}
