import type { PostType } from '@prisma/client'

/**
 * Every value of the PostType enum, with the wording used in the admin panel.
 * Kept here (not in actions.ts) because a `'use server'` file may only export
 * async functions, and the client form needs this list too.
 */
export const POST_TYPE_OPTIONS = [
  { value: 'PROJECT', label: 'Projects' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'AROUND_US', label: 'Around Us' },
  { value: 'ARTISTRY', label: 'Artistry' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'DESIGN_COMPETITION', label: 'Design Competition' },
  { value: 'PODCAST', label: 'Podcast' },
  { value: 'MERCHANDISE', label: 'Merchandise' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
] as const satisfies readonly { value: PostType; label: string }[]

export const POST_TYPE_VALUES = POST_TYPE_OPTIONS.map((o) => o.value) as PostType[]

/** The tab the page opens on when no ?type= is given */
export const DEFAULT_POST_TYPE: PostType = POST_TYPE_OPTIONS[0].value

export function isPostType(value: string | undefined): value is PostType {
  return !!value && (POST_TYPE_VALUES as string[]).includes(value)
}

export function postTypeLabel(value: string): string {
  return POST_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}
