'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  saveCampaignStepAction, saveCreativeStepAction, savePlacementStepAction,
  saveAudienceStepAction, saveScheduleStepAction, savePackageStepAction,
  submitCampaignAction,
} from './wizard-actions'
import {
  StepCampaign, StepCreative, StepPlacement, StepAudience,
  StepSchedule, StepPackage, StepReview,
} from './wizard-steps'
import type { PlatformReach } from '@/lib/platform-reach'
import { type Draft, type WizardOptions } from './wizard-types'
import {
  WizardStepper, CampaignPreview, CampaignChecklist, WhyAdvertise,
} from './wizard-chrome'

/**
 * The Create Advertisement wizard.
 *
 * The shell owns three things the steps deliberately do not:
 *
 *  · **The draft.** One object, patched by whichever step is open.
 *  · **Saving.** Every step goes through `advance()`, so "Continue" and
 *    "Save as Draft" can never end up saving different things.
 *  · **The campaign id.** Created by step 1's save and then pushed into the
 *    URL as `?draft=<id>`, which is what makes leaving and coming back work —
 *    the Drafts screen links straight back to the same row.
 *
 * Nothing here decides a campaign's status. The wizard writes fields; the
 * server decides when the campaign has enough of them to be submitted.
 */
export function CreateAdvertisementWizard({
  initial,
  options,
  reach,
  startAt,
}: {
  initial: Draft
  options: WizardOptions
  /** Real platform reach, shown in the "why advertise" band. */
  reach: PlatformReach
  /** Resuming a draft opens on the first step it has not finished. */
  startAt: number
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(initial)
  const [step, setStep] = useState(Math.min(Math.max(1, startAt), 7))
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, startSaving] = useTransition()
  const [previewView, setPreviewView] = useState('desktop')

  /**
   * Writes into the draft.
   *
   * The function form matters: a step that computes its new value FROM the
   * draft — toggling a placement in and out of a list, ticking an audience
   * box — must read the latest one, not the copy captured when that step last
   * rendered. Two clicks in the same tick with the object form would see the
   * same stale array and the second would overwrite the first.
   */
  const patch = useCallback((p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
    setDraft((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }))
    setError(null)
    setSaved(null)
  }, [])

  /**
   * Persists the step the reader is on.
   *
   * Returns false when the server refused, so the caller knows not to move on.
   * Step 1 is the only one that can create the row, so it is the only one that
   * hands back an id.
   */
  const save = useCallback(
    async (which: number, d: Draft): Promise<{ ok: boolean; id?: string }> => {
      if (which > 1 && !d.id) {
        setError('Finish step 1 first — the campaign has not been created yet.')
        return { ok: false }
      }

      switch (which) {
        case 1: {
          const r = await saveCampaignStepAction(d.id, {
            title: d.title,
            description: d.description,
            adTypeSlug: d.adTypeSlug,
            objective: d.objective,
            brandName: d.brandName,
          })
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true, id: r.id }
        }
        case 2: {
          const r = await saveCreativeStepAction(d.id!, {
            imageUrl: d.imageUrl,
            imageKey: d.imageKey,
            mobileImageUrl: d.mobileImageUrl,
            logoUrl: d.logoUrl,
            headline: d.headline,
            tagline: d.tagline,
            ctaText: d.ctaText,
            targetUrl: d.targetUrl,
            /*
             * The measurements travel with the URLs.
             *
             * Left out, the previews worked for as long as the wizard was
             * open — the values were in state — and then the campaign was
             * stored without them, so reopening the draft (and, later, the
             * public render) had nothing to fit or colour with and fell back
             * to a flat navy. The fields the previews depend on have to be
             * saved by the same call that saves the file they describe.
             */
            imageWidth: d.imageWidth,
            imageHeight: d.imageHeight,
            imagePalette: d.imagePalette,
            mobileImageWidth: d.mobileImageWidth,
            mobileImageHeight: d.mobileImageHeight,
            mobileImagePalette: d.mobileImagePalette,
          })
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true }
        }
        case 3: {
          const r = await savePlacementStepAction(d.id!, d.placementSlugs)
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true }
        }
        case 4: {
          const r = await saveAudienceStepAction(d.id!, {
            country: d.country,
            states: d.states,
            cities: d.cities,
            pincodes: d.pincodes,
            pactAreas: d.pactAreas,
            productCategories: d.productCategories,
            projectCategories: d.projectCategories,
            professionalCategories: d.professionalCategories,
            audienceRoles: d.audienceRoles,
          })
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true }
        }
        case 5: {
          const r = await saveScheduleStepAction(d.id!, {
            startsAt: d.startsAt,
            endsAt: d.endsAt,
            startTime: d.startTime,
            endTime: d.endTime,
          })
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true }
        }
        case 6: {
          const r = await savePackageStepAction(d.id!, d.packageSlug)
          if (!r.ok) { setError(r.error); return { ok: false } }
          return { ok: true }
        }
        default:
          return { ok: true }
      }
    },
    []
  )

  const advance = () => {
    setError(null)
    startSaving(async () => {
      const r = await save(step, draft)
      if (!r.ok) return

      if (r.id && r.id !== draft.id) {
        setDraft((d) => ({ ...d, id: r.id! }))
        // Put the id in the URL without a navigation, so a reload — or the
        // Drafts screen's "Continue Editing" — lands on the same campaign.
        window.history.replaceState(null, '', `?draft=${r.id}`)
      }

      setStep((s) => Math.min(7, s + 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const saveDraft = () => {
    setError(null)
    startSaving(async () => {
      const r = await save(step, draft)
      if (!r.ok) return

      if (r.id && r.id !== draft.id) {
        setDraft((d) => ({ ...d, id: r.id! }))
        window.history.replaceState(null, '', `?draft=${r.id}`)
      }
      setSaved('Draft saved')
      router.refresh()
    })
  }

  const submit = () => {
    setError(null)
    startSaving(async () => {
      if (!draft.id) {
        setError('The campaign has not been created yet.')
        return
      }
      const r = await submitCampaignAction(draft.id, accepted)
      if (!r.ok) { setError(r.error); return }
      router.push('/dashboard/advertisements/pending')
    })
  }

  /**
   * What the checklist beside step 1 ticks.
   *
   * Measured from the draft in hand rather than from the step number, so a
   * reader who jumped back and cleared a field sees the tick disappear.
   */
  const checklistDone = [
    Boolean(draft.title.trim() && draft.adTypeSlug),
    Boolean(draft.imageUrl && draft.headline),
    draft.placementSlugs.length > 0,
    draft.audienceRoles.length > 0,
    Boolean(draft.startsAt && draft.endsAt),
    Boolean(draft.packageSlug),
    false,
  ]

  const stepProps = {
    draft,
    patch,
    options,
    busy,
    error,
    // The real member count, so StepAudience never invents a reach figure.
    reach: reach.professionals,
    onBack: () => {
      setError(null)
      setStep((s) => Math.max(1, s - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onContinue: advance,
  }

  return (
    <div>
      {/* ═══════════ masthead ═══════════ */}
      {/* Same one-row masthead as the status screens — see `AdPageHead`. */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
            Create Advertisement
          </h1>
          <p className="mt-1.5 max-w-[26rem] text-balance text-[13px] leading-snug text-ink-3">
            Launch your campaign in 7 simple steps and reach India&apos;s largest
            Architecture &amp; Design community.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ok">
              <Icon name="check" className="h-3.5 w-3.5" />
              {saved}
            </span>
          )}

          <button
            type="button"
            onClick={saveDraft}
            disabled={busy || step === 7}
            className="flex items-center gap-2 rounded-card border border-brand-border bg-paper px-4 py-2.5 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            <Icon name="file" className="h-4 w-4" />
            Save as Draft
          </button>

          <div className="hidden items-center gap-3 rounded-card border border-line bg-paper px-4 py-2.5 shadow-card lg:flex">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-brand-soft text-brand">
              <Icon name="help" className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-ink">Need Help?</span>
              <span className="block text-[11.5px] text-ink-3">Talk to our advertising team</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ stepper ═══════════ */}
      <WizardStepper
        step={step}
        busy={busy}
        onJump={(n) => {
          setError(null)
          setStep(n)
        }}
      />

      {/* ═══════════ the step ═══════════ */}
      {step === 1 ? (
        <div className="grid gap-5 md:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <StepCampaign {...stepProps} />
          </div>

          {/*
            Below `lg` this is not a rail — it is a full-width band under the
            form, and three stacked cards there leave half of every row empty.
            On tablet the preview keeps the full width (it is the widest thing
            here) and the checklist sits beside "Why Advertise"; from `lg` all
            three go back to one column beside the form.
          */}
          <aside className="grid min-w-0 content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="min-w-0 md:col-span-2 lg:col-span-1">
              <CampaignPreview
                draft={draft}
                view={previewView === 'mobile' ? 'mobile' : 'desktop'}
                onView={setPreviewView}
              />
            </div>
            <CampaignChecklist step={step} done={checklistDone} />
            <WhyAdvertise reach={reach} />
          </aside>
        </div>
      ) : null}
      {step === 2 && <StepCreative {...stepProps} />}
      {step === 3 && <StepPlacement {...stepProps} />}
      {step === 4 && <StepAudience {...stepProps} />}
      {step === 5 && <StepSchedule {...stepProps} />}
      {step === 6 && <StepPackage {...stepProps} />}
      {step === 7 && (
        <StepReview
          {...stepProps}
          onSubmit={submit}
          accepted={accepted}
          setAccepted={setAccepted}
        />
      )}

      <p className="mt-4 text-center text-[11.5px] text-ink-3">
        Changed your mind?{' '}
        <Link href="/dashboard/advertisements/drafts" className="font-semibold text-brand hover:underline">
          See all drafts
        </Link>
      </p>
    </div>
  )
}
