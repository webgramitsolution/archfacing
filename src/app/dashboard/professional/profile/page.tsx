import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { disciplineOf, tierLabel } from '@/lib/design-associates'
import { storefrontBanners } from '@/lib/seller'
import { myPactData } from '@/lib/my-pact'
import { productMeta } from '@/lib/products'
import { POST_TYPES } from '@/config/post-types'
import { type IconName } from '@/components/ui'
import { ProfileView, type ProfileViewData } from './profile-view'
import { badgeTone } from '@/lib/verified'

export const metadata: Metadata = { title: 'Profile & Portfolio' }
export const dynamic = 'force-dynamic'

const detail = (type: string, slug: string) => {
  const cfg = (POST_TYPES as Record<string, { publicPath: string }>)[type]
  return cfg?.publicPath ? `${cfg.publicPath}/${slug}` : '#'
}

/** The four profile highlights (reference), used to fill the About feature row. */
const DEFAULT_HIGHLIGHTS: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'star', title: 'Modern Design', sub: 'Approach' },
  { icon: 'leaf', title: 'Sustainable', sub: 'Solutions' },
  { icon: 'users', title: 'Client-Centric', sub: 'Process' },
  { icon: 'check', title: 'End-to-End', sub: 'Execution' },
]

export default async function Page() {
  const user = await requireRole('PROFESSIONAL')

  const [row, banners, products, projects, ratingAgg, recentReviews, viewsAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true, email: true, mobile: true, city: true, state: true, pincode: true, addressLine: true,
        profilePhoto: true, logo: true, sellerSlug: true,
        facebookUrl: true, instagramUrl: true, linkedinUrl: true, youtubeUrl: true, twitterUrl: true,
        professionalProfile: { select: { firmName: true, bio: true, experience: true, categories: true, professionType: true, isVerified: true, tier: true, designaType: true } },
        corporateProfile: { select: { companyName: true, gstNumber: true, panNumber: true, website: true, isVerified: true } },
        designAssociate: { select: { kycVerified: true } },
      },
    }),
    storefrontBanners(user.id),
    prisma.post.findMany({ where: { authorId: user.id, type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null }, orderBy: { publishedAt: 'desc' }, take: 4, select: { id: true, slug: true, title: true, category: true, meta: true, media: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } } } }),
    prisma.post.findMany({ where: { authorId: user.id, type: 'PROJECT', status: 'PUBLISHED', deletedAt: null }, orderBy: { publishedAt: 'desc' }, take: 4, select: { id: true, slug: true, title: true, city: true, state: true, media: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } } } }),
    prisma.review.aggregate({ where: { post: { authorId: user.id, deletedAt: null } }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.findMany({ where: { post: { authorId: user.id, deletedAt: null } }, orderBy: { createdAt: 'desc' }, take: 2, select: { id: true, rating: true, body: true, createdAt: true, author: { select: { name: true, profilePhoto: true, role: true } } } }),
    prisma.post.aggregate({ where: { authorId: user.id, deletedAt: null }, _sum: { viewCount: true } }),
  ])

  // Holder-scoped: the id comes from requireRole above, never from the client.
  const pact = await myPactData(user.id, user.status === 'ACTIVE')

  const [productCount, projectCount] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id, type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null } }),
    prisma.post.count({ where: { authorId: user.id, type: 'PROJECT', status: 'PUBLISHED', deletedAt: null } }),
  ])

  const pp = row?.professionalProfile
  const cp = row?.corporateProfile
  const discipline = pp?.designaType ? disciplineOf(pp.designaType) : null
  const location = [row?.city, row?.state].filter(Boolean).join(', ')
  const tags = [...(discipline ? [discipline] : []), ...(pp?.categories ?? []).slice(0, 2)].slice(0, 3)
  const avg = ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null

  const business: ProfileViewData['business'] = ([
    { k: 'Business Name', v: cp?.companyName || pp?.firmName || row?.name || '' },
    { k: 'Business Type', v: cp ? 'Registered Company' : 'Professional Practice' },
    { k: 'Experience', v: pp?.experience != null ? `${pp.experience} years` : '' },
    { k: 'Category', v: discipline ?? (pp?.categories?.[0] ?? '') },
    { k: 'Sub Categories', v: (pp?.categories ?? []).join(', ') },
    { k: 'Membership', v: pp?.tier ? tierLabel(pp.tier) : '' },
    { k: 'Service Areas', v: [row?.city, row?.state].filter(Boolean).join(', ') },
    { k: 'Website', v: cp?.website ?? '', isUrl: true },
  ] as ProfileViewData['business']).filter((r) => r.v)

  // GST — the OWNER sees their own full numbers on their own dashboard.
  const gst: ProfileViewData['gst'] = cp?.gstNumber
    ? {
        verified: Boolean(cp.isVerified),
        rows: ([
          { k: 'GST Number', v: cp.gstNumber, mono: true },
          { k: 'PAN Number', v: cp.panNumber ?? '', mono: true },
          { k: 'Legal Business Name', v: cp.companyName },
          { k: 'State', v: row?.state ?? '' },
        ] as { k: string; v: string; mono?: boolean }[]).filter((r) => r.v),
      }
    : null

  const social = ([
    { href: row?.instagramUrl, icon: 'image' as IconName, label: 'Instagram', color: '#E4405F' },
    { href: row?.linkedinUrl, icon: 'users' as IconName, label: 'LinkedIn', color: '#0A66C2' },
    { href: row?.facebookUrl, icon: 'globe2' as IconName, label: 'Facebook', color: '#1877F2' },
    { href: row?.youtubeUrl, icon: 'monitor' as IconName, label: 'YouTube', color: '#FF0000' },
    { href: row?.twitterUrl, icon: 'share' as IconName, label: 'X', color: '#111111' },
    { href: cp?.website, icon: 'globe2' as IconName, label: 'Website', color: '#64748b' },
  ].filter((s) => s.href) as ProfileViewData['social'])

  const kyc = Boolean(row?.designAssociate?.kycVerified)
  const documents: ProfileViewData['documents'] = [
    { label: 'Aadhaar Card', icon: 'user', ok: kyc },
    { label: 'PAN Card', icon: 'file', ok: Boolean(cp?.panNumber) },
    { label: 'Business Registration', icon: 'building', ok: Boolean(cp) },
    { label: 'GST Certificate', icon: 'shield', ok: Boolean(cp?.isVerified) },
    { label: 'Company Brochure', icon: 'file', ok: false },
  ]

  const highlights: ProfileViewData['highlights'] = (pp?.categories ?? []).length >= 4
    ? (pp!.categories.slice(0, 4).map((c, i) => ({ icon: DEFAULT_HIGHLIGHTS[i].icon, title: c })))
    : DEFAULT_HIGHLIGHTS

  const data: ProfileViewData = {
    hero: {
      images: banners.length ? banners : ['/img/profile-hero-default.png'],
      eyebrow: tags.map((t) => t.toUpperCase()).join('  |  ') || 'ARCHFACING PROFESSIONAL',
      heading: pp?.firmName || row?.name || 'Your Profile',
      tagline: pp?.bio ? pp.bio.slice(0, 120) : `Verified ${discipline ?? 'design'} professional in ${location || 'India'}.`,
      script: discipline ? 'Spaces that Inspire' : null,
    },
    name: row?.name ?? 'Your Profile',
    subtitle: [pp?.tier ? tierLabel(pp.tier) : null, pp?.professionType || (discipline ? `${discipline} Professional` : 'Professional')].filter(Boolean).join(' · '),
    firmName: pp?.firmName ?? null,
    location,
    pincode: row?.pincode ?? null,
    photo: row?.profilePhoto ?? row?.logo ?? null,
    verified: (await badgeTone(user.id)) !== null,
    badgeTone: await badgeTone(user.id),
    tags,
    stats: { products: productCount, projects: projectCount, rating: avg, reviewCount: ratingAgg._count._all, views: viewsAgg._sum.viewCount ?? 0 },
    sellerSlug: row?.sellerSlug ?? null,
    about: pp?.bio ?? null,
    aboutLead: pp?.bio ? null : null,
    highlights,
    business,
    businessVerified: Boolean(cp?.isVerified),
    gst,
    products: products.map((p) => ({ id: p.id, href: detail('PRODUCT', p.slug), image: p.media[0]?.url ?? null, title: p.title, sub: p.category ?? (productMeta(p.meta).price > 0 ? '₹' + productMeta(p.meta).price : 'Product') })),
    projects: projects.map((p) => ({ id: p.id, href: detail('PROJECT', p.slug), image: p.media[0]?.url ?? null, title: p.title, sub: [p.city, p.state].filter(Boolean).join(', ') || 'Project' })),
    contact: { phone: row?.mobile ?? null, email: row?.email ?? null, address: row?.addressLine ?? null, location, pincode: row?.pincode ?? null },
    social,
    documents,
    documentsVerified: documents.some((doc) => doc.ok),
    reviews: recentReviews.map((r) => ({
      id: r.id, name: r.author.name || 'Client',
      role: r.author.role === 'PROFESSIONAL' ? 'Professional' : 'Client',
      photo: r.author.profilePhoto, rating: r.rating, body: r.body,
      date: r.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    })),
    editHref: '/dashboard/professional/profile/edit',
    pact,
    leadsHref: '/dashboard/professional/enquiries',
    buyPactHref: '/dashboard/professional/pact',
  }

  return <ProfileView d={data} />
}
