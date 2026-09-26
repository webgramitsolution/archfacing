/** Where a settings item that lives in the profile editor should send the user. */
const SELLERS = ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE']

export function profileEditHref(role: string): string {
  if (role === 'PROFESSIONAL') return '/dashboard/professional/profile/edit'
  if (SELLERS.includes(role)) return `/dashboard/${role.toLowerCase()}/profile`
  return '/dashboard'
}
