import { redirect } from 'next/navigation'

/**
 * The Blog Builder is one route for every role that may write one —
 * /dashboard/blog, under the shared `(shell)` layout.
 *
 * This path stayed behind as a redirect because it is what the sidebar, the
 * header's "Post Blog" button and any bookmark still point at. The four role
 * copies of this page were byte-identical apart from the role passed to
 * `requireRole`, and Corporate's was unreachable from its own menu.
 */
export default function Page() {
  redirect('/dashboard/blog')
}
