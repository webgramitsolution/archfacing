import { redirect } from 'next/navigation'

/**
 * Artistry now lives at one route for every role that can post it, the way
 * Blog does — see `src/app/dashboard/(shell)/artistry/`. This redirect keeps
 * existing menu links and bookmarks working.
 */
export default function Page() {
  redirect('/dashboard/artistry')
}
