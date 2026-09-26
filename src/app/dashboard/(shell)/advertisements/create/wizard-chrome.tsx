'use client'

import { Icon, type IconName } from '@/components/ui'
import { compactCount, type PlatformReach } from '@/lib/platform-reach'
import { cn } from '@/lib/utils'
import type { Draft } from './wizard-types'

/**
 * The furniture that sits around the seven steps — the progress rail across
 * the top, and the panels down the right of step 1.
 */

// ═══════════════════════════════════════════════════════════
//  The stepper
// ═══════════════════════════════════════════════════════════

/**
 * Every step carries a name and what it is for, exactly as the design draws
 * it, because "Placement" alone does not tell a first-time advertiser what
 * they are about to be asked.
 */
export const WIZARD_STEPS = [
  { title: 'Campaign', sub: 'Basic Details' },
  { title: 'Creative', sub: 'Upload & Design' },
  { title: 'Placement', sub: 'Where to Show' },
  { title: 'Audience', sub: 'Targeting' },
  { title: 'Schedule', sub: 'Duration' },
  { title: 'Package', sub: 'Select Plan' },
  { title: 'Review & Pay', sub: 'Confirm & Launch' },
] as const

/**
 * All seven across the full width — never a scrolling strip.
 *
 * An earlier build let the row scroll, which meant a reader saw five steps and
 * reasonably concluded there were five. The grid below cannot do that: seven
 * equal columns, and the labels shrink on a narrow screen instead of the row
 * running off the edge.
 */
export function WizardStepper({
  step,
  onJump,
  busy,
}: {
  step: number
  /** Only a step already passed may be jumped back to. */
  onJump: (n: number) => void
  busy: boolean
}) {
  return (
    <ol className="card mb-5 grid grid-cols-7 gap-0 px-3 py-4">
      {WIZARD_STEPS.map((s, i) => {
        const n = i + 1
        const done = n < step
        const here = n === step

        return (
          <li key={s.title} className="relative flex min-w-0 flex-col items-center">
            {/* the rule to the next step, drawn behind the circle */}
            {i < WIZARD_STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-1/2 top-[15px] h-[2px] w-full',
                  done ? 'bg-brand' : 'bg-line'
                )}
              />
            )}

            <button
              type="button"
              disabled={n >= step || busy}
              onClick={() => onJump(n)}
              aria-current={here ? 'step' : undefined}
              className="relative z-10 flex min-w-0 flex-col items-center gap-1.5 disabled:cursor-default"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors',
                  here
                    ? 'border-brand bg-brand text-white'
                    : done
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-paper text-ink-4'
                )}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" /> : n}
              </span>

              <span className="min-w-0 text-center">
                <span
                  className={cn(
                    'block truncate text-[12px] font-bold leading-tight',
                    here ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-4'
                  )}
                >
                  {s.title}
                </span>
                <span className="mt-0.5 hidden truncate text-[10.5px] leading-tight text-ink-4 sm:block">
                  {s.sub}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ═══════════════════════════════════════════════════════════
//  Campaign preview — live, beside step 1
// ═══════════════════════════════════════════════════════════

/**
 * The stand-in creative, one per view.
 *
 * Two crops of the same photograph rather than one: a 16:9 frame filled with a
 * portrait file — or a 9:16 frame filled with a landscape one — crops to a
 * detail and stops reading as a building. These are ArchFacing's own artwork,
 * served from `public/img/ads/`, so the preview needs no third-party host.
 */
export const SAMPLE_PHOTO = {
  desktop: '/img/ads/preview-desktop.jpg',
  mobile: '/img/ads/preview-mobile.jpg',
} as const

/**
 * What the advertisement will look like, updated as the form is filled.
 *
 * Until a creative is uploaded it shows ArchFacing's own sample — labelled as
 * a sample underneath, so nobody mistakes the stock photograph for their own
 * artwork.
 */
export function CampaignPreview({
  draft,
  view,
  onView,
}: {
  draft: Draft
  view: 'desktop' | 'mobile'
  onView: (v: 'desktop' | 'mobile') => void
}) {
  const isSample = !draft.imageUrl
  /*
   * Falls back through step 1 before reaching the placeholder.
   *
   * The advertisement's own words are `headline` and `tagline`, and they are
   * not asked for until step 2 — so a reader typing on step 1 watched the
   * preview sit there unchanged and reasonably concluded it was broken. The
   * campaign name is the nearest true thing to show in the meantime, and
   * step 2's headline overrides it the moment it exists.
   */
  const headline = draft.headline || draft.title || 'Your Brand\nCould Be Here'
  // Short on purpose: the copy column is half of a 307px frame, and the old
  // default ("Reach India's top Architects, Designers and Builders") set as
  // four lines there. Balanced, this one sets as two of about equal length.
  const body = draft.tagline || draft.description || 'Crafting beautiful spaces since 1985'
  const cta = draft.ctaText || 'Learn More'

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <Icon name="image" className="h-4 w-4 shrink-0 text-ink-3" />
        <h2 className="min-w-0 font-display text-[14px] font-bold text-ink">
          Campaign Preview
        </h2>
        <span className="shrink-0 text-[11px] font-semibold text-brand">(Live)</span>
      </div>

      <p className="px-4 pt-3 text-[11.5px] text-ink-3">
        This is a preview of how your advertisement might look.
      </p>

      <div className="mt-3 flex border-b border-line px-4">
        {(['desktop', 'mobile'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={cn(
              'flex-1 border-b-2 pb-2 text-[12px] font-semibold capitalize transition-colors',
              view === v ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink'
            )}
          >
            {v} View
          </button>
        ))}
      </div>

      <div className="p-4">
        <div
          className={cn(
            /*
              The frame is capped, not just proportioned.

              `aspect-[16/9] w-full` is right in a 300px rail, but below `lg`
              this panel is the full width of the page — 770px on a tablet —
              and a 16:9 box there is 433px tall, which pushed everything
              below it off the screen. 340px wide keeps the preview the size
              of the thing it is previewing.
            */
            'relative isolate overflow-hidden rounded-card bg-navy',
            view === 'mobile'
              ? 'mx-auto aspect-[9/16] w-[150px]'
              : 'mx-auto aspect-[16/9] w-full max-w-[340px] lg:max-w-none'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              view === 'mobile'
                ? draft.mobileImageUrl || draft.imageUrl || SAMPLE_PHOTO.mobile
                : draft.imageUrl || SAMPLE_PHOTO.desktop
            }
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          {/*
            No overlay — same rule as step 2's Ad Preview, and the same
            reason: the copy stays on the dark half rather than the photograph
            being dimmed under it. Half the width on the desktop cut, all of it
            on the 150px phone cut where half would be unreadable.
          */}
          <div
            className={cn(
              'flex h-full flex-col justify-center p-4',
              view === 'mobile' ? 'w-full' : 'w-1/2'
            )}
          >
            <p className="whitespace-pre-line font-display text-[15px] font-bold leading-tight text-white">
              {headline}
            </p>
            <p className="mt-1.5 text-balance text-[10.5px] leading-snug text-white/80">{body}</p>
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-[5px] bg-brand px-3 py-1.5 text-[10.5px] font-bold text-white">
              {cta}
              <Icon name="arrow" className="h-3 w-3" />
            </span>
          </div>
        </div>

        <p className="mt-2.5 text-[10.5px] leading-snug text-ink-4">
          {isSample
            ? 'This is a sample preview. Final appearance may vary based on placement.'
            : 'Final appearance may vary based on the placement you choose.'}
        </p>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Campaign checklist
// ═══════════════════════════════════════════════════════════

const CHECKLIST = [
  { title: 'Campaign details', sub: 'Name, type and objective' },
  { title: 'Creative', sub: 'Upload images and content' },
  { title: 'Placement', sub: 'Select where to show' },
  { title: 'Audience', sub: 'Target your audience' },
  { title: 'Schedule', sub: 'Set campaign duration' },
  { title: 'Package', sub: 'Choose your plan' },
  { title: 'Review & Payment', sub: 'Confirm and launch' },
] as const

/**
 * The seven steps as a vertical trail, so the reader can see what is still
 * ahead of them without leaving the step they are on.
 *
 * `done` comes from the draft itself — the same measurement the Drafts screen
 * uses — so the checklist cannot claim a step is finished when the campaign
 * does not hold its data.
 */
export function CampaignChecklist({ step, done }: { step: number; done: boolean[] }) {
  return (
    <section className="card p-4">
      <div className="mb-3.5 flex items-center gap-2">
        <Icon name="list" className="h-4 w-4 shrink-0 text-ink-3" />
        <h2 className="font-display text-[14px] font-bold text-ink">Campaign Checklist</h2>
      </div>

      <ol className="flex flex-col">
        {CHECKLIST.map((c, i) => {
          const n = i + 1
          const isDone = done[i]
          const here = n === step

          return (
            <li key={c.title} className="relative flex gap-3 pb-4 last:pb-0">
              {i < CHECKLIST.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[11px] top-[22px] h-full w-[2px]',
                    isDone ? 'bg-brand/40' : 'bg-line'
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2',
                  here
                    ? 'border-brand bg-brand text-white'
                    : isDone
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-paper text-ink-4'
                )}
              >
                {isDone && !here ? (
                  <Icon name="check" className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <span className="min-w-0 pt-[1px]">
                <span
                  className={cn(
                    'block text-[12.5px] font-bold leading-tight',
                    here || isDone ? 'text-ink' : 'text-ink-3'
                  )}
                >
                  {c.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-ink-4">{c.sub}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Why advertise
// ═══════════════════════════════════════════════════════════

// Shown at the point of purchase, so the counts must be real — they come
// from platformReach(). The old band claimed 500K+ / 120K+.
function whyBand(reach: PlatformReach): { icon: IconName; value: string; label: string; tone: string }[] {
  return [
    { icon: 'users', value: compactCount(reach.professionals), label: 'Active Professionals', tone: 'bg-brand-soft text-brand' },
    { icon: 'eye', value: reach.impressions > 0 ? compactCount(reach.impressions) : '—', label: 'Impressions Served', tone: 'bg-info-soft text-info' },
    { icon: 'target', value: 'Targeted', label: 'By Category & PIN', tone: 'bg-ok-soft text-ok' },
    { icon: 'award', value: 'A&D Focused', label: 'One Industry', tone: 'bg-[#F5F3FF] text-[#7C3AED]' },
  ]
}

export function WhyAdvertise({ reach }: { reach: PlatformReach }) {
  const WHY = whyBand(reach)
  return (
    <section className="card p-4">
      <h2 className="mb-3.5 font-display text-[14px] font-bold text-ink">
        Why Advertise on ArchFacing?
      </h2>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
        {WHY.map((w) => (
          <li key={w.label} className="flex min-w-0 items-center gap-2">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-card', w.tone)}>
              <Icon name={w.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              {/* wraps rather than truncates — at half a tablet's rail these
                  labels are 105px wide, and 'Active Professionals' clipped to
                  'Active…' names nothing */}
              <span className="block text-[12px] font-bold leading-tight text-ink">{w.value}</span>
              <span className="block text-[10px] leading-tight text-ink-3">{w.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  The band that closes a step
// ═══════════════════════════════════════════════════════════

/**
 * "Next Step: …" — what happens after Continue.
 *
 * It replaces a bare button row, because the thing a first-time advertiser
 * most wants to know at the bottom of a form is what they are about to be
 * asked for next.
 */
export function NextStepBand({
  title,
  body,
  children,
}: {
  title: string
  body: string
  /** The Continue button. */
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card border border-brand-border bg-brand-soft px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-paper text-brand">
        <Icon name="help" className="h-4 w-4" />
      </span>
      <span className="min-w-[14rem] flex-1">
        <span className="block text-[13px] font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-2">{body}</span>
      </span>
      {children}
    </div>
  )
}
