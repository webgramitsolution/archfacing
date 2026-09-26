'use server'

import { revalidatePath } from 'next/cache'
import { activeSessionUser } from '@/lib/guard'
import { addComment, CommentError, deleteComment } from '@/lib/post-comments'

export type CommentState = { ok: boolean; error?: string; signIn?: boolean; nonce?: number }

export async function addCommentAction(
  postId: string,
  path: string,
  _prev: CommentState | null,
  formData: FormData
): Promise<CommentState> {
  const user = await activeSessionUser()
  if (!user) return { ok: false, signIn: true }
  try {
    await addComment(user.id, postId, String(formData.get('body') ?? ''))
  } catch (e) {
    if (e instanceof CommentError) return { ok: false, error: e.message }
    throw e
  }
  revalidatePath(path)
  return { ok: true, nonce: Date.now() }
}

export async function deleteCommentAction(commentId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  const user = await activeSessionUser()
  if (!user) return { ok: false, error: 'Sign in first.' }
  try {
    await deleteComment({ id: user.id, role: user.role }, commentId)
  } catch (e) {
    if (e instanceof CommentError) return { ok: false, error: e.message }
    throw e
  }
  revalidatePath(path)
  return { ok: true }
}
