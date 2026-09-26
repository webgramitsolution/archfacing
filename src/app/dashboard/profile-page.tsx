import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { ProfileForm, type ProfileValues } from './profile-form'

/**
 * Edit Profile, shared by every role that has one — §5.1.1 for a client,
 * §5.2.1 for a professional or consultant, §5.3.1 for a BMF, §5.4.1 for a
 * corporate. They all edit the same User row, so one page serves them all
 * and each role's route is a two-line wrapper around it.
 */
export async function ProfilePage({
  userId,
  pdfRef,
}: {
  userId: string
  pdfRef: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, mobile: true, gender: true,
      addressLine: true, pincode: true, city: true, state: true,
      facebookUrl: true, instagramUrl: true, linkedinUrl: true,
      youtubeUrl: true, twitterUrl: true,
    },
  })

  if (!user) return null

  const values: ProfileValues = {
    name: user.name ?? '',
    email: user.email,
    mobile: user.mobile ?? '',
    gender: user.gender ?? '',
    addressLine: user.addressLine ?? '',
    pincode: user.pincode ?? '',
    city: user.city ?? '',
    state: user.state ?? '',
    facebookUrl: user.facebookUrl ?? '',
    instagramUrl: user.instagramUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    youtubeUrl: user.youtubeUrl ?? '',
    twitterUrl: user.twitterUrl ?? '',
  }

  return (
    <div>
      <PageHeading title="Edit Profile" pdfRef={pdfRef}>
        Your name, where you work and how people reach you. This is what shows
        on your postings and in Consult Nearby.
      </PageHeading>

      <ProfileForm values={values} />
    </div>
  )
}
