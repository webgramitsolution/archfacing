import { profileEditPathFor } from '@/lib/profile-path'

/** Where a settings item that lives in the profile editor should send the user. */
export function profileEditHref(role: string): string {
  return profileEditPathFor(role)
}
