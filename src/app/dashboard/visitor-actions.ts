'use server'

import { revalidatePath } from 'next/cache'

import { activeSessionUser } from '@/lib/guard'
import {
  deleteReview,
  recordView,
  ReviewError,
  toggleSaved,
  upsertReview,
} from '@/lib/visitor'

/**
 * The reader's own actions — save, view, review.
 *
 * Every one of these is anonymous-safe: a signed-out visitor simply gets
 * `{ ok: false, signIn: true }` rather than an error page, so a Save button can
 * sit on a public listing without gating the page behind a login.
 */

export type SaveState = { ok: boolean; saved?: boolean; signIn?: boolean; error?: string }

export async function toggleSavedAction(postId: string, path?: string): Promise<SaveState> {
  const user = await activeSessionUser()
  if (!user) return { ok: false, signIn: true }

  const saved = await toggleSaved(user.id, postId)
  if (path) revalidatePath(path)
  revalidatePath('/dashboard/client/saved')
  revalidatePath('/dashboard/client')

  return { ok: true, saved }
}

/**
 * Stamp a visit.
 *
 * Deliberately silent: a view is a side effect of reading a page, so a failure
 * here must never surface to the reader or break the page they asked for.
 */
export async function recordViewAction(postId: string): Promise<void> {
  const user = await activeSessionUser()
  if (!user) return

  try {
    await recordView(user.id, postId)
  } catch {
    // A missing post or a race on the unique pair is not worth a page error.
  }
}

export type ReviewState = { ok: boolean; error?: string; signIn?: boolean }

export async function saveReviewAction(
  _prev: ReviewState | null,
  formData: FormData
): Promise<ReviewState> {
  const user = await activeSessionUser()
  if (!user) return { ok: false, signIn: true }

  const postId = String(formData.get('postId') ?? '')
  const rating = Number(formData.get('rating') ?? 0)
  const body = String(formData.get('body') ?? '')

  if (!postId) return { ok: false, error: 'Which item is this review for?' }

  try {
    await upsertReview({ authorId: user.id, postId, rating, body })
  } catch (e) {
    if (e instanceof ReviewError) return { ok: false, error: e.message }
    throw e
  }

  revalidatePath('/dashboard/client/reviews')
  revalidatePath('/dashboard/client')
  return { ok: true }
}

export async function deleteReviewAction(postId: string): Promise<{ ok: boolean }> {
  const user = await activeSessionUser()
  if (!user) return { ok: false }

  await deleteReview(user.id, postId)
  revalidatePath('/dashboard/client/reviews')
  revalidatePath('/dashboard/client')
  return { ok: true }
}
