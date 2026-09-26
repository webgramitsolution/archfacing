'use server'

import { revalidatePath } from 'next/cache'
import type { Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { addComment, CommentError, deleteComment } from '@/lib/post-comments'

export type CommentState = { ok: boolean; error?: string; signIn?: boolean; nonce?: number }

export async function addCommentAction(
  postId: string,
  path: string,
  _prev: CommentState | null,
  formData: FormData
): Promise<CommentState> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, signIn: true }
  try {
    await addComment(session.user.id, postId, String(formData.get('body') ?? ''))
  } catch (e) {
    if (e instanceof CommentError) return { ok: false, error: e.message }
    throw e
  }
  revalidatePath(path)
  return { ok: true, nonce: Date.now() }
}

export async function deleteCommentAction(commentId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'Sign in first.' }
  try {
    await deleteComment({ id: session.user.id, role: session.user.role as Role | undefined }, commentId)
  } catch (e) {
    if (e instanceof CommentError) return { ok: false, error: e.message }
    throw e
  }
  revalidatePath(path)
  return { ok: true }
}
