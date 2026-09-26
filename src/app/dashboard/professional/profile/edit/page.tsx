import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { professionalReviewSummary } from '@/lib/professional-reviews'
import { myPactData } from '@/lib/my-pact'
import { ensureMemberCode } from '@/lib/member-code'
import { isPactVerified } from '@/lib/verified'
import { ProfileWorkspace } from '../profile-workspace'

export const metadata: Metadata = { title: 'Edit Profile' }
export const dynamic = 'force-dynamic'

export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireRole('PROFESSIONAL')

  // Scoped to the signed-in holder only — `myPactData` never takes an id from
  // the client, so a reader can only ever see their own territories.
  const [row, reviews, pact] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true, email: true, mobile: true, gender: true,
        city: true, state: true, pincode: true, addressLine: true,
        profilePhoto: true, logo: true, sellerSlug: true,
        facebookUrl: true, instagramUrl: true, linkedinUrl: true, youtubeUrl: true, twitterUrl: true,
        pinterestUrl: true, behanceUrl: true, houzzUrl: true,
        createdAt: true,
        professionalProfile: {
          select: {
            firmName: true, bio: true, experience: true, categories: true, professionType: true, isVerified: true, coaVerified: true,
            shortBio: true, expertise: true,
            altPhone: true, altEmail: true, officeLandline: true, mapsLocation: true, whatsappNumber: true, preferredContactTime: true,
            allowCalls: true, allowEmails: true, allowWhatsapp: true, showPhonePublic: true, showEmailPublic: true, socialHidden: true,
            businessType: true, yearEstablished: true, employeeCount: true, tagline: true, businessEmail: true, website: true, serviceAreas: true,
          },
        },
        corporateProfile: { select: { companyName: true, gstNumber: true, panNumber: true, website: true, isVerified: true } },
        designAssociate: { select: { kycVerified: true } },
      },
    }),
    professionalReviewSummary(user.id),
    myPactData(user.id, user.status === 'ACTIVE'),
  ])

  const pp = row?.professionalProfile
  const cp = row?.corporateProfile

  const CATEGORY_OPTIONS = [
    'Residential Design', 'Commercial Design', 'Interior Design', 'Architecture',
    'Modular Kitchen', 'Turnkey Projects', 'Landscape Design', 'Renovation',
    'Office Interiors', 'Retail Design', 'Vastu Consultancy', '3D Visualisation',
  ]
  const memberSince = row?.createdAt
    ? row.createdAt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : ''

  const data = {
    basic: {
      name: row?.name ?? '',
      professionType: pp?.professionType ?? '',
      shortBio: pp?.shortBio ?? '',
      bio: pp?.bio ?? '',
      city: row?.city ?? '',
      state: row?.state ?? '',
      photo: row?.profilePhoto ?? row?.logo ?? null,
      expertise: pp?.expertise ?? [],
      // Blue tick = an active PACT holder (lib/verified.ts).
      verified: await isPactVerified(user.id),
      location: [row?.city, row?.state].filter(Boolean).join(', '),
      memberCode: await ensureMemberCode(user.id),
    },
    contact: {
      mobile: row?.mobile ?? '', email: row?.email ?? '', addressLine: row?.addressLine ?? '', pincode: row?.pincode ?? '',
      altPhone: pp?.altPhone ?? '', altEmail: pp?.altEmail ?? '', website: pp?.website ?? '', officeLandline: pp?.officeLandline ?? '',
      mapsLocation: pp?.mapsLocation ?? '', whatsappNumber: pp?.whatsappNumber ?? '', preferredContactTime: pp?.preferredContactTime ?? 'Business Hours (9 AM – 6 PM)',
      allowCalls: pp?.allowCalls ?? true, allowEmails: pp?.allowEmails ?? true, allowWhatsapp: pp?.allowWhatsapp ?? true,
      showPhonePublic: pp?.showPhonePublic ?? true, showEmailPublic: pp?.showEmailPublic ?? true,
      photo: row?.profilePhoto ?? row?.logo ?? null, name: row?.name ?? '', professionType: pp?.professionType ?? '',
      location: [row?.city, row?.state].filter(Boolean).join(', '), verified: Boolean(pp?.isVerified),
    },
    business: {
      firmName: pp?.firmName ?? '',
      businessType: pp?.businessType ?? '',
      yearEstablished: pp?.yearEstablished != null ? String(pp.yearEstablished) : '',
      employeeCount: pp?.employeeCount ?? '',
      tagline: pp?.tagline ?? '',
      businessEmail: pp?.businessEmail ?? '',
      website: pp?.website ?? cp?.website ?? '',
      memberSince,
      logo: row?.logo ?? null,
      primaryCategory: pp?.categories?.[0] ?? '',
      categories: pp?.categories ?? [],
      serviceAreas: pp?.serviceAreas ?? [],
      description: pp?.bio ?? '',
      categoryOptions: CATEGORY_OPTIONS,
    },
    gst: { gstNumber: cp?.gstNumber ?? '', panNumber: cp?.panNumber ?? '', companyName: cp?.companyName ?? '', website: cp?.website ?? '', verified: Boolean(cp?.isVerified) },
    social: {
      links: {
        website: pp?.website ?? '',
        linkedin: row?.linkedinUrl ?? '',
        instagram: row?.instagramUrl ?? '',
        facebook: row?.facebookUrl ?? '',
        youtube: row?.youtubeUrl ?? '',
        pinterest: row?.pinterestUrl ?? '',
        behance: row?.behanceUrl ?? '',
        houzz: row?.houzzUrl ?? '',
      },
      hidden: pp?.socialHidden ?? [],
      name: row?.name ?? '', photo: row?.profilePhoto ?? row?.logo ?? null,
      professionType: pp?.professionType ?? '', location: [row?.city, row?.state].filter(Boolean).join(', '),
      verified: Boolean(pp?.isVerified),
    },
    verifications: {
      professional: Boolean(pp?.isVerified), business: Boolean(cp),
      gst: Boolean(cp?.isVerified), kyc: Boolean(row?.designAssociate?.kycVerified),
    },
    publicSlug: row?.sellerSlug ?? null,
    reviews: { average: reviews.average, total: reviews.total },
    pact,
    leadsHref: '/dashboard/professional/enquiries',
    buyPactHref: '/dashboard/professional/pact',
  }

  return <ProfileWorkspace data={data} backHref="/dashboard/professional/profile" initialTab={(await searchParams).tab} />
}
