'use client'

import { useActionState } from 'react'
import { Icon } from './ui'
import { subscribeAction, type SubscribeState } from '@/app/(public)/club/newsletter-actions'

/**
 * The email field in the Club newsletter band, and in the Blog sidebar.
 *
 * Client-side only so the result can replace the form in place — a full page
 * navigation after subscribing would scroll the reader away from wherever
 * they were.
 *
 * Two looks, same behaviour:
 *   · "dark"  — the brand orange button on a dark or bordered band. The
 *              default, and what the footer and every public page uses.
 *   · "light" — the same orange as a full-width button inside a white card,
 *              which is what the Blog and Artistry sidebars need.
 *   · "club"  — gold. ArchFacing Club only; gold is the Club's colour and
 *              is kept out of the rest of the site on purpose.
 */
export function NewsletterForm({
  source = 'club',
  variant = 'dark',
}: {
  source?: string
  variant?: 'dark' | 'light' | 'club'
}) {
  const [state, submit, pending] = useActionState<SubscribeState, FormData>(
    subscribeAction,
    null
  )

  const light = variant === 'light'
  const club = variant === 'club'
  // Two of these can sit on one page, so the id has to carry the source.
  const fieldId = `news-email-${source}`

  if (state?.ok) {
    return (
      <p
        className={
          light
            ? 'flex w-full items-center gap-2.5 rounded-lg border border-ok/25 bg-ok-soft px-4 py-3 text-[13px] text-ink-2'
            : 'flex w-full max-w-md items-center gap-2.5 rounded-lg bg-white/10 px-4 py-3 text-[13.5px] text-white'
        }
      >
        <Icon name="check" className={club ? 'h-4 w-4 shrink-0 text-gold' : 'h-4 w-4 shrink-0 text-ok'} />
        {state.message}
      </p>
    )
  }

  return (
    <div className={light ? 'w-full' : 'w-full max-w-md'}>
      <form
        action={submit}
        className={
          light
            ? 'flex flex-col gap-2.5'
            : 'flex overflow-hidden rounded-lg bg-white'
        }
      >
        <input type="hidden" name="source" value={source} />
        <label htmlFor={fieldId} className="sr-only">
          Email address
        </label>
        <input
          id={fieldId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your email address"
          className={
            light
              ? 'input'
              : 'min-w-0 flex-1 bg-transparent px-4 py-3 text-[13.5px] text-ink placeholder:text-ink-4 focus:outline-none'
          }
        />
        <button
          type="submit"
          disabled={pending}
          className={
            light
              ? 'btn-primary w-full'
              : club
                ? 'shrink-0 bg-gold px-6 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-gold-hover disabled:opacity-60'
                : 'shrink-0 bg-brand px-6 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60'
          }
        >
          {pending ? 'Saving…' : 'Subscribe'}
        </button>
      </form>

      {state && !state.ok && (
        <p className={club ? 'mt-2 text-[12.5px] text-gold-light' : 'mt-2 text-[12.5px] text-brand'}>
          {state.message}
        </p>
      )}
    </div>
  )
}
