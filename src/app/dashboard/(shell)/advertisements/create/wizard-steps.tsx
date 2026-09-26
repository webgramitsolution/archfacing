'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Icon, type IconName } from '@/components/ui'
import { cn, formatINR } from '@/lib/utils'
import { adTone } from '@/lib/ad-tone'
import {
  StepCard, Field, TextInput, TextArea, SelectInput, CheckRow,
  MultiSelect, TagInput, BackButton, ContinueButton, GuidelineList, ErrorLine,
} from './wizard-fields'
import {
  uploadCreativeAction, checkAvailabilityAction, type CreativeMeasurement,
} from './wizard-actions'
import type { PlacementAvailability } from '@/lib/ad-marketplace'
import { PlacementPreview } from './placement-preview'
import { AdCreative } from '@/components/dashboard/ad-creative-preview'
import {
  drawWidthFor, fitReport, limitsAcross, overLimit, parseSize,
  type CreativeFile, type FitReport,
} from '@/lib/ad-creative'
import { NextStepBand, SAMPLE_PHOTO } from './wizard-chrome'
import {
  AUDIENCE_TYPES, OBJECTIVES,
  type Draft, type WizardOptions,
} from './wizard-types'

/**
 * The seven steps of the Create Advertisement wizard.
 *
 * Each one is given the draft, a `patch` to write back into it, and the
 * navigation callbacks. None of them saves anything itself — the shell owns
 * that, so "Continue" and "Save as Draft" cannot end up doing it differently.
 */

export type StepProps = {
  draft: Draft
  patch: (p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void
  options: WizardOptions
  onBack: () => void
  onContinue: () => void
  busy: boolean
  error: string | null
  /** Real active-member count, from platformReach(). Bases the reach estimate. */
  reach: number
}

const KNOWN_ICONS = new Set<string>([
  'image', 'star', 'box', 'building', 'list', 'bolt', 'grid', 'search',
  'map', 'target', 'trophy', 'file', 'monitor', 'mobile', 'globe',
])
const iconOf = (n: string): IconName => (KNOWN_ICONS.has(n) ? n : 'image') as IconName

/**
 * The size the phone creative is sold at.
 *
 * Named once because three places need to agree on it: the dropzone's
 * "Recommended" line, the label beside the preview, and the shape the
 * preview is drawn in.
 */
const MOBILE_CREATIVE_SIZE = '640 × 200'

/**
 * The three devices a creative is previewed on — §7.
 *
 * Tablet is not a third creative: the advertiser uploads two files, and a
 * tablet is served the desktop one at a narrower width. Previewing it
 * separately is worth it because that is the width where a long headline on
 * a wide banner first starts to crowd, and it is the size the advertiser's
 * own client is most likely to be holding.
 */
type Device = 'desktop' | 'tablet' | 'mobile'

const DEVICES: { key: Device; label: string; icon: IconName }[] = [
  { key: 'desktop', label: 'Desktop', icon: 'monitor' },
  { key: 'tablet', label: 'Tablet', icon: 'monitor' },
  { key: 'mobile', label: 'Mobile', icon: 'mobile' },
]

// ═══════════════════════════════════════════════════════════
//  1 — Campaign details
// ═══════════════════════════════════════════════════════════

export function StepCampaign({ draft, patch, options, onContinue, busy, error }: StepProps) {
  return (
    <StepCard
      step={1}
      title="Campaign Details"
      subtitle="Let's start with the basics. Tell us about your advertisement campaign."
      tip="Choose a clear campaign name and objective to get better results."
      footer={
        <NextStepBand
          title="Next Step: Upload Your Creative"
          body="In the next step, you will upload your advertisement images, add content and see a live preview."
        >
          <ContinueButton label="Continue to Creative" onClick={onContinue} busy={busy} />
        </NextStepBand>
      }
    >
      <ErrorLine message={error} />

      <div className="flex flex-col gap-4">
        {/*
          The hints on these two exist to answer a question the form kept
          raising: why does step 1 ask for a name and description, and step 2
          ask again? Because these two are the advertiser's own filing labels
          and step 2's are the words the public reads. Nothing said so.
        */}
        <Field
          label="Campaign Name"
          required
          hint="Your own label for this campaign — it is not shown in the advertisement."
          count={`${draft.title.length}/100`}
        >
          <TextInput
            value={draft.title}
            onChange={(v) => patch({ title: v })}
            placeholder="e.g. Kajaria Winter Collection 2026"
            max={100}
          />
        </Field>

        <Field
          label="Campaign Description"
          hint="A note for your own records. The words people read are written in step 2."
          count={`${draft.description.length}/300`}
        >
          <TextArea
            value={draft.description}
            onChange={(v) => patch({ description: v })}
            placeholder="Briefly describe your campaign, products or services…"
            max={300}
          />
        </Field>

        {/* ─── advertisement type ─── */}
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink">
            Advertisement Type <span className="text-brand">*</span>
          </p>

          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {options.adTypes.map((t) => {
              const active = draft.adTypeSlug === t.slug
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ adTypeSlug: t.slug })}
                    className={cn(
                      'relative flex w-full items-start gap-2.5 rounded-card border p-3 text-left transition-all',
                      active
                        ? 'border-brand bg-brand-soft shadow-card'
                        : 'border-line bg-paper hover:border-brand-border hover:bg-brand-soft/40'
                    )}
                  >
                    {active && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white shadow-card">
                        <Icon name="check" className="h-3 w-3" />
                      </span>
                    )}

                    {/*
                      Each type keeps its own hue, selected or not — that is
                      how the blueprint draws the grid, and it is what lets a
                      reader find "Sponsored Product" by colour rather than by
                      reading all twelve labels. An earlier build rendered
                      every unselected tile the same grey.
                    */}
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-card',
                        adTone(t.slug).tile
                      )}
                    >
                      <Icon name={iconOf(t.icon)} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-ink">{t.name}</span>
                      {t.description && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                          {t.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ─── whose advertisement it is ─── */}
        <Field
          label="Brand / Business"
          required
          hint="Select the brand or business for this advertisement."
        >
          {options.brands.length > 1 ? (
            <SelectInput
              value={draft.brandName}
              onChange={(v) => patch({ brandName: v })}
              options={options.brands.map((b) => ({ value: b.name, label: b.name }))}
            />
          ) : (
            // One business on the account means there is nothing to choose:
            // the field shows what it will be rather than a select of one.
            <span className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-paper-2 px-3">
              {options.brands[0]?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={options.brands[0].logo}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-[5px] object-contain"
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-brand-soft text-[9px] font-bold text-brand">
                  {(options.brands[0]?.name ?? '—').slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                {options.brands[0]?.name ?? 'Your business'}
              </span>
            </span>
          )}
        </Field>

        {/* ─── objective ─── */}
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink">
            Campaign Objective <span className="text-brand">*</span>
          </p>

          <ul className="grid gap-y-2.5 sm:grid-cols-3">
            {OBJECTIVES.map((o) => {
              const active = draft.objective === o
              return (
                <li key={o}>
                  {/* `relative` contains the sr-only radio — see CheckRow. */}
                  <label className="relative flex cursor-pointer items-center gap-2.5">
                    <input
                      type="radio"
                      name="objective"
                      checked={active}
                      onChange={() => patch({ objective: o })}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30',
                        active ? 'border-brand' : 'border-line'
                      )}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </span>
                    <span className="text-[12.5px] text-ink-2">{o}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </StepCard>
  )
}

// ═══════════════════════════════════════════════════════════
//  2 — Creative
// ═══════════════════════════════════════════════════════════

const CREATIVE_GUIDELINES = [
  'Use high quality images',
  'Follow the recommended dimensions',
  'Keep text short and clear',
  'Use contrasting colours',
  'Show your brand logo (optional)',
]

export function StepCreative({ draft, patch, options, onBack, onContinue, busy, error }: StepProps) {
  const [tab, setTab] = useState<'desktop' | 'mobile'>('desktop')
  const [device, setDevice] = useState<Device>('desktop')

  /*
   * What the campaign actually booked.
   *
   * The preview and the character limits both read the BOOKED placements, so
   * step 2 answers for the slots being paid for rather than for a notional
   * default. With nothing booked yet it falls back to the standard banner and
   * says so.
   */
  const booked = options.placements.filter((pl) => draft.placementSlugs.includes(pl.slug))
  const primary = booked[0]
  const wanted = primary?.size ?? '1200 × 300'

  /*
   * The strictest limits across every booked placement — §8.
   *
   * A campaign's words have to fit the smallest slot it bought: a 728 × 90
   * bar takes a 25-character headline however generous the 1200 × 300 banner
   * is. Adding that placement therefore tightens the counters here, which is
   * the honest behaviour, because that is the slot that would truncate.
   */
  const limits = limitsAcross(booked.map((pl) => parseSize(pl.size)))
  const tooLong = overLimit(
    { headline: draft.headline, description: draft.tagline, cta: draft.ctaText, brand: draft.brandName },
    limits
  )

  const adContent = {
    headline: draft.headline,
    description: draft.tagline,
    cta: draft.ctaText,
    brand: draft.brandName,
    logoUrl: draft.logoUrl,
  }

  /** The cut a device is served, and what is known about it. */
  const fileFor = (d: Device): CreativeFile =>
    d === 'mobile' && draft.mobileImageUrl
      ? {
          url: draft.mobileImageUrl,
          width: draft.mobileImageWidth,
          height: draft.mobileImageHeight,
          palette: draft.mobileImagePalette,
        }
      : {
          url: draft.imageUrl,
          width: draft.imageWidth,
          height: draft.imageHeight,
          palette: draft.imagePalette,
        }

  /** Which slot size each device previews at. */
  const sizeFor = (d: Device) => (d === 'mobile' ? MOBILE_CREATIVE_SIZE : wanted)

  /** The frame width for each device, so the preview reads as that device. */
  const widthFor = (d: Device) => (d === 'desktop' ? 288 : d === 'tablet' ? 232 : 168)

  const uploadedSize =
    tab === 'desktop'
      ? draft.imageWidth && draft.imageHeight
        ? { w: draft.imageWidth, h: draft.imageHeight }
        : null
      : draft.mobileImageWidth && draft.mobileImageHeight
        ? { w: draft.mobileImageWidth, h: draft.mobileImageHeight }
        : null

  const report = fitReport(uploadedSize, parseSize(tab === 'desktop' ? wanted : MOBILE_CREATIVE_SIZE))

  return (
    <StepCard
      step={2}
      title="Creative (Upload & Design)"
      subtitle="Upload your advertisement creatives and add content."
      footer={
        <>
          <BackButton onClick={onBack} disabled={busy} />
          <ContinueButton label="Continue to Placement" onClick={onContinue} busy={busy} />
        </>
      }
    >
      <ErrorLine message={error} />

      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* ─── which cut ─── */}
          <div className="mb-4 flex gap-1 border-b border-line">
            {(['desktop', 'mobile'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'border-b-2 px-3.5 pb-2 pt-1 text-[12.5px] font-semibold capitalize transition-colors',
                  tab === t ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink'
                )}
              >
                {t} Creative{t === 'desktop' && <span className="ml-1 text-[10px] font-normal">(Recommended)</span>}
              </button>
            ))}
          </div>

          <Dropzone
            url={tab === 'desktop' ? draft.imageUrl : draft.mobileImageUrl}
            wanted={tab === 'desktop' ? wanted : MOBILE_CREATIVE_SIZE}
            report={(tab === 'desktop' ? draft.imageUrl : draft.mobileImageUrl) ? report : null}
            onUploaded={(url, key, m) =>
              patch(
                tab === 'desktop'
                  ? {
                      imageUrl: url,
                      imageKey: key,
                      imageWidth: m.width,
                      imageHeight: m.height,
                      imagePalette: m.palette,
                    }
                  : {
                      mobileImageUrl: url,
                      mobileImageWidth: m.width,
                      mobileImageHeight: m.height,
                      mobileImagePalette: m.palette,
                    }
              )
            }
            onClear={() =>
              patch(
                tab === 'desktop'
                  ? { imageUrl: '', imageKey: '', imageWidth: null, imageHeight: null, imagePalette: null }
                  : {
                      mobileImageUrl: '',
                      mobileImageWidth: null,
                      mobileImageHeight: null,
                      mobileImagePalette: null,
                    }
              )
            }
          />

          {/* ─── the words ─── */}
          <div className="mt-5 flex flex-col gap-4">
            <p className="text-[12.5px] font-bold text-ink">Creative Details</p>

            {/*
              The counters are the placement's limits, not one house number.

              `max` stops the field at the limit rather than warning after
              the fact, and the same limits are re-checked on the server at
              submission — a browser must not be the only thing standing
              between a 90-character headline and a 728 x 90 bar.
            */}
            <Field
              label="Headline"
              required
              hint={`The big line inside the advertisement. Limit set by your smallest booked placement.`}
              count={`${draft.headline.length}/${limits.headline}`}
            >
              <TextInput
                value={draft.headline}
                onChange={(v) => patch({ headline: v })}
                placeholder="India's No.1 Tile Company"
                max={limits.headline}
              />
            </Field>

            {limits.description > 0 ? (
              <Field
                label="Description"
                hint="The smaller line under the headline, inside the advertisement."
                count={`${draft.tagline.length}/${limits.description}`}
              >
                <TextInput
                  value={draft.tagline}
                  onChange={(v) => patch({ tagline: v })}
                  placeholder="Crafting beautiful spaces since 1985"
                  max={limits.description}
                />
              </Field>
            ) : (
              <p className="rounded-card border border-dashed border-line bg-paper-2 px-3 py-2.5 text-[11.5px] leading-snug text-ink-3">
                Your smallest booked placement is a thin bar with room for a
                headline and a button only, so no description is shown there.
                Book a taller placement to use one.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CTA Text" required count={`${draft.ctaText.length}/${limits.cta}`}>
                <TextInput
                  value={draft.ctaText}
                  onChange={(v) => patch({ ctaText: v })}
                  placeholder="Explore Now"
                  max={limits.cta}
                />
              </Field>

              <Field label="Landing URL" required>
                <TextInput
                  value={draft.targetUrl}
                  onChange={(v) => patch({ targetUrl: v })}
                  placeholder="https://www.example.com"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ─── preview ─── */}
        <aside className="flex min-w-0 flex-col gap-4">
          <div className="card overflow-hidden">
            <div className="border-b border-line-soft px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 font-display text-[13px] font-bold text-ink">Ad Preview</p>

                {/*
                  §7 — three devices, not two.

                  Each one previews the creative the device is actually served
                  and the slot size it is sold at, so the toggle answers "how
                  does it look on a phone" rather than shrinking a picture.
                */}
                <div className="flex shrink-0 gap-0.5 rounded-card bg-paper-2 p-0.5">
                  {DEVICES.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      aria-pressed={device === d.key}
                      onClick={() => setDevice(d.key)}
                      title={d.label}
                      className={cn(
                        'flex items-center gap-1 rounded-[5px] px-2 py-1 text-[10.5px] font-semibold transition-colors',
                        device === d.key ? 'bg-paper text-brand shadow-card' : 'text-ink-3 hover:text-ink'
                      )}
                    >
                      <Icon name={d.icon} className="h-3 w-3" />
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* What is on screen: which slot, and which uploaded file. */}
              <p className="tabular mt-1.5 text-[10.5px] text-ink-4">
                {sizeFor(device)}
                {' · '}
                {device === 'mobile' && draft.mobileImageUrl
                  ? 'your mobile creative'
                  : draft.imageUrl
                    ? device === 'mobile'
                      ? 'your desktop creative, fitted'
                      : 'your desktop creative'
                    : 'no creative uploaded yet'}
              </p>
            </div>

            <div className="flex items-center justify-center bg-paper-2 p-4">
              {draft.imageUrl || draft.mobileImageUrl ? (
                <AdCreative
                  content={adContent}
                  file={fileFor(device)}
                  size={sizeFor(device)}
                  width={widthFor(device)}
                />
              ) : (
                <span
                  className="flex items-center justify-center rounded-[5px] border border-dashed border-line bg-paper text-center text-[11px] leading-snug text-ink-3"
                  style={{
                    width: widthFor(device),
                    aspectRatio: sizeFor(device).replace(/[^d]+/g, ' / '),
                  }}
                >
                  Upload a creative
                  <br />
                  to see it here
                </span>
              )}
            </div>

            <p className="border-t border-line-soft px-3.5 py-2.5 text-[10.5px] leading-snug text-ink-4">
              Your image is fitted whole — never cropped. Any space left over is
              filled with a background generated from the image&apos;s own colours.
            </p>
          </div>

          {/* §14 — what will happen to the file that was uploaded */}
          {report.uploaded && (
            <div
              className={cn(
                'rounded-card border p-3.5',
                report.tone === 'ok' ? 'border-ok/30 bg-ok-soft' : 'border-warn/30 bg-warn-soft'
              )}
            >
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Icon
                  name={report.tone === 'ok' ? 'check' : 'alert'}
                  className={cn('h-3.5 w-3.5', report.tone === 'ok' ? 'text-ok' : 'text-warn')}
                />
                Image fit
              </p>
              <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-ink-3">Uploaded</dt>
                <dd className="font-semibold text-ink">
                  {report.uploaded} <span className="font-normal text-ink-3">({report.uploadedRatio})</span>
                </dd>
                <dt className="text-ink-3">Placement</dt>
                <dd className="font-semibold text-ink">
                  {report.required} <span className="font-normal text-ink-3">({report.requiredRatio})</span>
                </dd>
              </dl>
              <p className="mt-2 text-[11px] leading-snug text-ink-2">{report.message}</p>
            </div>
          )}

          <GuidelineList title="Creative Guidelines" items={CREATIVE_GUIDELINES} />
        </aside>
      </div>
    </StepCard>
  )
}

/** Upload, preview, replace, delete — all four in one box. */
function Dropzone({
  url,
  wanted,
  report,
  onUploaded,
  onClear,
}: {
  url: string
  wanted: string
  /** The fit line under the box, once there is a file to report on. */
  report: FitReport | null
  /**
   * `measured` is what sharp read off the file: its true pixel size and the
   * colours of its edges. The caller stores it on the draft, because every
   * preview needs it to fit the artwork without cropping and to build the
   * backdrop from the artwork's own colours.
   */
  onUploaded: (url: string, key: string, measured: CreativeMeasurement) => void
  onClear: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const [problem, setProblem] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)

  const send = (file: File) => {
    setProblem(null)
    setName(`${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`)

    startUpload(async () => {
      const fd = new FormData()
      fd.set('file', file)
      const r = await uploadCreativeAction(fd)
      if (r.ok) onUploaded(r.url, r.key, r.measured)
      else {
        setProblem(r.error)
        setName(null)
      }
    })
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) send(f)
        }}
        className="relative flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-paper-2 px-4 py-8 text-center"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-40 w-auto rounded-card object-contain" />
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-card bg-paper text-ink-3 shadow-card">
              <Icon name="download" className="h-5 w-5 rotate-180" />
            </span>
            <p className="text-[12.5px] font-semibold text-ink-2">
              Drag &amp; drop your image here
            </p>
            <p className="text-[11.5px] text-ink-3">or click to browse</p>
          </>
        )}

        <p className="mt-1 text-[11px] text-ink-4">
          Supported formats: JPG, PNG, WebP · Max size 2 MB · Recommended {wanted}
        </p>

        {/*
          §14 — the fit, stated. Uploading a shape that does not match the
          slot is allowed and always will be; what is not allowed is letting
          the advertiser find out by looking at a cropped ad afterwards.
        */}
        {report && (
          <p
            className={cn(
              'mt-1 flex items-start gap-1.5 text-left text-[11px] leading-snug',
              report.tone === 'ok' ? 'text-ok' : 'text-warn'
            )}
          >
            <Icon
              name={report.tone === 'ok' ? 'check' : 'alert'}
              className="mt-[2px] h-3 w-3 shrink-0"
            />
            <span className="min-w-0">{report.message}</span>
          </p>
        )}

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) send(f)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="mt-2 rounded-card border border-line bg-paper px-4 py-2 text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : url ? 'Replace image' : 'Choose file'}
        </button>
      </div>

      {problem && (
        <p className="mt-2 text-[12px] text-danger">{problem}</p>
      )}

      {url && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <Icon name="image" className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="truncate text-[11.5px] text-ink-2">{name ?? 'Uploaded creative'}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onClear()
              setName(null)
            }}
            className="shrink-0 text-[11.5px] font-semibold text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  3 — Placement
// ═══════════════════════════════════════════════════════════

export function StepPlacement({ draft, patch, options, onBack, onContinue, busy, error }: StepProps) {
  const [page, setPage] = useState('All')
  /** §13 — the placement whose full page-context preview is open. */
  const [opened, setOpened] = useState<string | null>(null)

  /*
   * Bring the panel into view when it opens.
   *
   * It renders below a ten-card grid, so on any real screen it appeared
   * entirely off-screen and the button looked broken — it had worked, one
   * and a half screens further down. The scroller is `<main>`, not the
   * window, which is why `scrollIntoView` on the panel is the right call
   * rather than a window offset.
   */
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (opened && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [opened])

  const pages = ['All', ...new Set(options.placements.map((p) => p.page))]
  const shown =
    page === 'All' ? options.placements : options.placements.filter((p) => p.page === page)

  // Functional form: two quick clicks must both land, and each one has to
  // read the list as it is now rather than as it was when this step rendered.
  const toggle = (slug: string) =>
    patch((d) => ({
      placementSlugs: d.placementSlugs.includes(slug)
        ? d.placementSlugs.filter((s) => s !== slug)
        : [...d.placementSlugs, slug],
    }))

  const chosen = draft.placementSlugs.length
  const openedPlacement = options.placements.find((pl) => pl.slug === opened) ?? null

  /*
   * The campaign's words and files, shared by every card.
   *
   * `fileFor` is the responsive rule in one place: a Mobile placement is
   * served the phone cut when one was uploaded and the desktop cut otherwise
   * — never nothing, and never cropped, because `AdCreative` fits whatever
   * it is given. Each cut carries its own measurements, so the backdrop
   * beside a phone creative comes from the phone creative's colours.
   */
  const creative = Boolean(draft.imageUrl || draft.mobileImageUrl)

  const adContent = {
    headline: draft.headline,
    description: draft.tagline,
    cta: draft.ctaText,
    brand: draft.brandName,
    logoUrl: draft.logoUrl,
  }

  const fileFor = (device: 'Desktop' | 'Mobile') =>
    device === 'Mobile' && draft.mobileImageUrl
      ? {
          url: draft.mobileImageUrl,
          width: draft.mobileImageWidth,
          height: draft.mobileImageHeight,
          palette: draft.mobileImagePalette,
        }
      : {
          url: draft.imageUrl || draft.mobileImageUrl,
          width: draft.imageWidth ?? draft.mobileImageWidth,
          height: draft.imageHeight ?? draft.mobileImageHeight,
          palette: draft.imagePalette ?? draft.mobileImagePalette,
        }

  return (
    <StepCard
      step={3}
      title="Placement (Where to Show)"
      subtitle="Select where you want your advertisement to appear."
      tip="You can select multiple placements based on your package."
      tipTone="info"
      footer={
        <>
          <BackButton onClick={onBack} disabled={busy} />
          <span className="tabular text-[12px] text-ink-3">
            {chosen} placement{chosen === 1 ? '' : 's'} selected
          </span>
          <ContinueButton
            label="Continue to Audience"
            onClick={onContinue}
            busy={busy}
            disabled={chosen === 0}
          />
        </>
      }
    >
      <ErrorLine message={error} />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line scrollbar-none">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3.5 pb-2 pt-1 text-[12.5px] font-semibold transition-colors',
              page === p ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink'
            )}
          >
            {p === 'All' ? 'All Placements' : p}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const active = draft.placementSlugs.includes(p.slug)
          const order = draft.placementSlugs.indexOf(p.slug) + 1

          return (
            <li key={p.slug}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(p.slug)}
                className={cn(
                  'relative flex w-full flex-col overflow-hidden rounded-card border text-left transition-all',
                  active ? 'border-brand shadow-card' : 'border-line hover:border-brand-border'
                )}
              >
                {/*
                  A tick when chosen, and the order it was chosen in — the
                  first pick becomes the campaign's primary placement, so the
                  number is information, not decoration.
                */}
                <span
                  className={cn(
                    'absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-[5px] border',
                    active ? 'border-brand bg-brand text-white' : 'border-line bg-paper/90'
                  )}
                >
                  {active ? (
                    <Icon name="check" className="h-3 w-3" />
                  ) : (
                    <span className="sr-only">Not selected</span>
                  )}
                </span>

                {active && (
                  <span className="absolute left-2 top-2 z-10 rounded-card bg-brand px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                    {order === 1 ? 'PRIMARY' : `#${order}`}
                  </span>
                )}

                {/*
                  THIS campaign's advertisement, at THIS placement's real
                  proportions — the reader's own artwork, not a grey outline
                  of a website. Every card in the gallery therefore looks
                  different, because the slots are different shapes.

                  The mat is a fixed 168px band and the creative is drawn at
                  whichever of width-or-height binds first (`drawWidthFor`),
                  so a 728 × 90 bar and a 300 × 600 skyscraper sit in the
                  same row without one of them being 560px tall.
                */}
                <span className="relative flex h-[168px] w-full items-center justify-center overflow-hidden border-b border-line bg-paper-3 p-3">
                  {creative ? (
                    <AdCreative
                      content={adContent}
                      file={fileFor(p.device)}
                      size={p.size}
                      width={drawWidthFor(parseSize(p.size), 270, 138)}
                    />
                  ) : (
                    /*
                      Nothing uploaded yet — so the slot is drawn at its real
                      shape and labelled, rather than filled with a mock of
                      somebody else's website.
                    */
                    <span
                      className="flex items-center justify-center rounded-[5px] border border-dashed border-brand-border bg-brand-soft/50 text-center text-[10px] font-semibold leading-tight text-brand"
                      style={{
                        width: drawWidthFor(parseSize(p.size), 270, 138),
                        aspectRatio: p.size.replace(/[^\d]+/g, ' / '),
                      }}
                    >
                      {p.size}
                    </span>
                  )}
                </span>

                <span className="flex min-w-0 flex-col gap-0.5 p-3">
                  <span className="truncate text-[12.5px] font-bold text-ink">{p.name}</span>

                  {/* Exact dimensions · device · where on the site it lives */}
                  <span className="tabular flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-3">
                    {p.size}
                    <span className="text-ink-4">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon
                        name={p.device === 'Mobile' ? 'mobile' : 'monitor'}
                        className="h-3 w-3"
                      />
                      {p.device}
                    </span>
                    <span className="text-ink-4">·</span>
                    {p.page}
                  </span>

                  <span className="mt-0.5 text-[10.5px] font-semibold text-brand">{p.tag}</span>
                  <span className="tabular mt-1 font-display text-[14px] font-bold text-ink">
                    {formatINR(p.price)}
                    <span className="ml-1 text-[10.5px] font-normal text-ink-3">/ week</span>
                  </span>
                  <span className="text-[10.5px] text-ink-4">{p.note}</span>
                </span>
              </button>

              {/*
                Outside the selection button on purpose: opening the preview
                must not toggle the placement, and a button inside a button
                is invalid markup.
              */}
              <button
                type="button"
                onClick={() => setOpened(opened === p.slug ? null : p.slug)}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-card border border-line px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
              >
                <Icon name="eye" className="h-3.5 w-3.5" />
                {opened === p.slug ? 'Hide website preview' : 'Preview on website'}
              </button>
            </li>
          )
        })}
      </ul>

      {shown.length === 0 && (
        <p className="rounded-card border border-dashed border-line bg-paper-2 px-4 py-8 text-center text-[12.5px] text-ink-3">
          No placement is available on that page yet.
        </p>
      )}

      {/*
        §13 — the ad in its page, at a size worth looking at.

        The card above answers "what will my ad look like". This answers
        "where on the page does it land", which is the other half of knowing
        what the money buys. `PlacementPreview` draws the page as a wireframe
        and composites the real creative into the slot — a wireframe rather
        than a screenshot because a screenshot of the homepage is wrong the
        first time the homepage changes, while the slot's position is not.
      */}
      {openedPlacement && (
        <section
          ref={panelRef}
          className="mt-5 rounded-card border border-brand-border bg-brand-soft/30 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-[13.5px] font-bold text-ink">
                {openedPlacement.name} — on the website
              </p>
              <p className="tabular mt-0.5 text-[11.5px] text-ink-3">
                {openedPlacement.size} · {openedPlacement.device} · {openedPlacement.page} page
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpened(null)}
              className="shrink-0 rounded-card border border-line bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
            >
              Close
            </button>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-paper">
            <PlacementPreview
              spot={openedPlacement.spot}
              className="h-[300px] w-full"
              creative={
                creative
                  ? {
                      image: fileFor(openedPlacement.device).url,
                      headline: draft.headline || undefined,
                      cta: draft.ctaText || undefined,
                    }
                  : undefined
              }
            />
          </div>

          <p className="mt-2.5 text-[11px] leading-snug text-ink-3">
            The page around your advertisement is drawn as a wireframe — the
            slot&apos;s position and size are real, the surrounding content is
            indicative.
          </p>
        </section>
      )}
    </StepCard>
  )
}

// ═══════════════════════════════════════════════════════════
//  4 — Audience
// ═══════════════════════════════════════════════════════════

export function StepAudience({ draft, patch, options, onBack, onContinue, busy, error, reach: platformMembers }: StepProps) {
  /*
   * The estimate starts from the REAL number of active members on the
   * platform, passed down from platformReach(). It used to start from a
   * hardcoded 500,000 — a figure nothing produced, shown to someone about to
   * spend money. Narrowing still scales it down; the panel still calls it an
   * estimate, because until an impression is recorded that is what it is.
   */
  const BASE = Math.max(platformMembers, 1)
  const narrowing =
    (draft.states.length ? 0.45 : 1) *
    (draft.cities.length ? 0.35 : 1) *
    (draft.pincodes.length ? 0.12 : 1) *
    (draft.audienceRoles.length ? Math.min(1, draft.audienceRoles.length / 4) : 1) *
    (draft.productCategories.length || draft.projectCategories.length ? 0.6 : 1)

  // Rounded to a readable step, but never rounded UP past the real member
  // count — an estimate may not claim more audience than the platform has.
  const step = BASE >= 10_000 ? 1_000 : BASE >= 1_000 ? 100 : 10
  const reach = Math.min(BASE, Math.max(step, Math.round((BASE * narrowing) / step) * step))

  /** Nothing narrows the location, so the campaign runs across the country. */
  const panIndia =
    draft.states.length === 0 && draft.cities.length === 0 && draft.pincodes.length === 0

  return (
    <StepCard
      step={4}
      title="Audience (Targeting)"
      subtitle="Define your target audience to reach the right people."
      footer={
        <>
          <BackButton onClick={onBack} disabled={busy} />
          <ContinueButton
            label="Continue to Schedule"
            onClick={onContinue}
            busy={busy}
            disabled={draft.audienceRoles.length === 0}
          />
        </>
      }
    >
      <ErrorLine message={error} />

      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="min-w-0 flex flex-col gap-4">
          <p className="text-[12.5px] font-bold text-ink">Location Targeting</p>

          {/*
            Pan India, said out loud.

            Leaving every location field empty already meant "the whole
            country", and the State field's hint said so in small type — but
            an advertiser who wants all of India had no way to express it
            except by not doing anything, which reads as an unfinished form.

            `panIndia` is DERIVED from the fields rather than stored beside
            them, so the two can never disagree: adding a state switches this
            off on its own, and choosing Pan India clears what was narrowing
            the reach.
          */}
          <div className="flex flex-wrap items-center gap-1 rounded-card border border-line bg-paper-2 p-1">
            {[
              { on: true, label: 'Pan India', sub: 'Every state and city' },
              { on: false, label: 'Specific locations', sub: 'Choose states, cities or PIN codes' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={panIndia === o.on}
                onClick={() =>
                  o.on ? patch({ states: [], cities: [], pincodes: [] }) : undefined
                }
                className={cn(
                  'min-w-0 flex-1 rounded-[5px] px-3 py-2 text-left transition-colors',
                  panIndia === o.on ? 'bg-paper shadow-card' : 'hover:bg-paper/60'
                )}
              >
                <span
                  className={cn(
                    'block text-[12.5px] font-bold',
                    panIndia === o.on ? 'text-brand' : 'text-ink-3'
                  )}
                >
                  {o.label}
                </span>
                <span className="block text-[10.5px] leading-tight text-ink-4">{o.sub}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <SelectInput
                value={draft.country}
                onChange={(v) => patch({ country: v })}
                options={[{ value: 'India', label: 'India' }]}
              />
            </Field>

            <Field label="State" hint="Leave empty to reach every state">
              <MultiSelect
                values={draft.states}
                onChange={(v) => patch({ states: v })}
                options={options.states.map((s) => ({ value: s, label: s }))}
                placeholder={panIndia ? 'All states (Pan India)' : 'Select states'}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" hint="Press Enter to add">
              <TagInput
                values={draft.cities}
                onChange={(v) => patch({ cities: v })}
                placeholder={panIndia ? 'All cities' : 'e.g. Gurugram'}
              />
            </Field>

            <Field label="Pincode (Optional)" hint="Six digits, press Enter to add">
              <TagInput
                values={draft.pincodes}
                onChange={(v) => patch({ pincodes: v })}
                placeholder="e.g. 121001"
                pattern={/^\d{6}$/}
              />
            </Field>
          </div>

          <Field
            label="PACT Territory (Optional)"
            hint="A PACT is addressed by its PIN code — add the ones you want to reach"
          >
            <TagInput
              values={draft.pactAreas}
              onChange={(v) => patch({ pactAreas: v })}
              placeholder="e.g. 121001"
              pattern={/^\d{6}$/}
            />
          </Field>

          <div>
            <p className="mb-2 text-[12.5px] font-bold text-ink">
              Audience Type <span className="text-brand">*</span>
            </p>
            <ul className="grid grid-cols-2 gap-y-2.5 sm:grid-cols-2">
              {AUDIENCE_TYPES.map((a) => (
                <li key={a.value}>
                  <CheckRow
                    checked={draft.audienceRoles.includes(a.value)}
                    onChange={(on) =>
                      patch((d) => ({
                        audienceRoles: on
                          ? [...d.audienceRoles, a.value]
                          : d.audienceRoles.filter((r) => r !== a.value),
                      }))
                    }
                    label={a.label}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <p className="text-[12.5px] font-bold text-ink">
            Category Targeting <span className="font-normal text-ink-3">(Optional)</span>
          </p>

          <Field label="Product Categories">
            <MultiSelect
              values={draft.productCategories}
              onChange={(v) => patch({ productCategories: v })}
              options={options.categories.product.map((c) => ({ value: c.slug, label: c.name }))}
              placeholder="Select categories"
            />
          </Field>

          <Field label="Project Categories">
            <MultiSelect
              values={draft.projectCategories}
              onChange={(v) => patch({ projectCategories: v })}
              options={options.categories.project.map((c) => ({ value: c.slug, label: c.name }))}
              placeholder="Select categories"
            />
          </Field>

          <Field label="Professional Categories">
            <MultiSelect
              values={draft.professionalCategories}
              onChange={(v) => patch({ professionalCategories: v })}
              options={options.categories.professional.map((c) => ({ value: c.slug, label: c.name }))}
              placeholder="Select categories"
            />
          </Field>

          <div className="rounded-card border border-[#DDD6FE] bg-[#F5F3FF] p-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[#6D28D9]">
              <Icon name="users" className="h-4 w-4" />
              Estimated Audience Reach
            </p>
            <p className="tabular mt-2 font-display text-[24px] font-bold leading-none text-[#4C1D95]">
              {reach.toLocaleString('en-IN')}+
            </p>
            <p className="mt-1 text-[11px] text-[#6D28D9]">
              Professionals in your target segment
            </p>
            <p className="mt-2 text-[10.5px] leading-snug text-[#7C3AED]">
              An estimate from your targeting criteria — not a guarantee. Real
              figures appear once the campaign runs.
            </p>
          </div>
        </aside>
      </div>
    </StepCard>
  )
}

// ═══════════════════════════════════════════════════════════
//  5 — Schedule
// ═══════════════════════════════════════════════════════════

export function StepSchedule({ draft, patch, options, onBack, onContinue, busy, error }: StepProps) {
  /**
   * §13 — availability, asked of the server whenever the dates change.
   *
   * The answer is advisory here; `saveScheduleStepAction` asks again and
   * refuses a clashing save, so this panel is a courtesy rather than the gate.
   */
  const [availability, setAvailability] = useState<PlacementAvailability[]>([])
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!draft.startsAt || !draft.endsAt || draft.placementSlugs.length === 0) {
      setAvailability([])
      return
    }

    let live = true
    setChecking(true)

    checkAvailabilityAction(draft.id, draft.placementSlugs, draft.startsAt, draft.endsAt)
      .then((r) => {
        if (!live) return
        setAvailability(r.ok ? r.rows : [])
      })
      .finally(() => live && setChecking(false))

    return () => {
      live = false
    }
  }, [draft.id, draft.startsAt, draft.endsAt, draft.placementSlugs])

  const blocked = availability.some((a) => !a.available)

  const days =
    draft.startsAt && draft.endsAt
      ? Math.max(
          0,
          Math.round(
            (+new Date(`${draft.endsAt}T00:00:00`) - +new Date(`${draft.startsAt}T00:00:00`)) /
              86_400_000
          )
        )
      : 0

  const weeks = Math.max(1, Math.ceil(days / 7))
  const placementCost = options.placements
    .filter((p) => draft.placementSlugs.includes(p.slug))
    .reduce((sum, p) => sum + p.price, 0)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <StepCard
      step={5}
      title="Schedule (Duration)"
      subtitle="Choose your campaign start and end date."
      footer={
        <>
          <BackButton onClick={onBack} disabled={busy} />
          <ContinueButton
            label="Continue to Package"
            onClick={onContinue}
            busy={busy}
            disabled={!draft.startsAt || !draft.endsAt || blocked}
          />
        </>
      }
    >
      <ErrorLine message={error} />

      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="min-w-0 flex flex-col gap-4">
          <p className="text-[12.5px] font-bold text-ink">Campaign Schedule</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date" required>
              <input
                type="date"
                min={today}
                value={draft.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
                className="input h-10 py-0 text-[13px]"
              />
            </Field>

            <Field label="End Date" required>
              <input
                type="date"
                min={draft.startsAt || today}
                value={draft.endsAt}
                onChange={(e) => patch({ endsAt: e.target.value })}
                className="input h-10 py-0 text-[13px]"
              />
            </Field>
          </div>

          {days > 0 && (
            <div className="flex items-center gap-3 rounded-card border border-brand-border bg-brand-soft px-4 py-3">
              <Icon name="clock" className="h-5 w-5 shrink-0 text-brand" />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink-2">
                  Campaign Duration
                </span>
                <span className="tabular block font-display text-[17px] font-bold text-ink">
                  {days} Days
                </span>
              </span>
            </div>
          )}

          <div>
            <p className="mb-2 text-[12.5px] font-bold text-ink">
              Time <span className="font-normal text-ink-3">(Optional)</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Time">
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => patch({ startTime: e.target.value })}
                  className="input h-10 py-0 text-[13px]"
                />
              </Field>
              <Field label="End Time">
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => patch({ endTime: e.target.value })}
                  className="input h-10 py-0 text-[13px]"
                />
              </Field>
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="card p-4">
            <p className="mb-3 font-display text-[13.5px] font-bold text-ink">
              Placement Availability
            </p>
            {draft.placementSlugs.length === 0 ? (
              <p className="text-[12px] text-ink-3">No placement chosen yet.</p>
            ) : !draft.startsAt || !draft.endsAt ? (
              <p className="text-[12px] text-ink-3">
                Choose your dates and availability is checked against what is
                already booked.
              </p>
            ) : checking ? (
              <p className="text-[12px] text-ink-3">Checking availability…</p>
            ) : availability.length === 0 ? (
              <p className="text-[12px] text-ink-3">Availability could not be checked.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {availability.map((a) => (
                  <li
                    key={a.slug}
                    className={cn(
                      'flex items-start gap-2 rounded-card px-3 py-2 text-[11.5px]',
                      a.available ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
                    )}
                  >
                    <Icon
                      name={a.available ? 'check' : 'alert'}
                      className="mt-[2px] h-3.5 w-3.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="block">
                        {a.available
                          ? `${a.free} of ${a.total} slot${a.total === 1 ? '' : 's'} free`
                          : 'Unavailable for selected dates'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ScheduleCalendar
            start={draft.startsAt}
            end={draft.endsAt}
            onPick={(iso) => {
              // Clicking a day sets whichever end of the range makes sense:
              // the start if there is none or the range is already complete,
              // otherwise the end.
              if (!draft.startsAt || (draft.startsAt && draft.endsAt)) {
                patch({ startsAt: iso, endsAt: '' })
              } else if (iso > draft.startsAt) {
                patch({ endsAt: iso })
              } else {
                patch({ startsAt: iso })
              }
            }}
          />

          {days > 0 && (
            <div className="card p-4">
              <p className="mb-3 font-display text-[13.5px] font-bold text-ink">Estimate</p>
              <ul className="flex flex-col gap-2 text-[12px]">
                <Row label="Duration" value={`${days} days · ${weeks} week${weeks === 1 ? '' : 's'}`} />
                <Row label="Placements" value={String(draft.placementSlugs.length)} />
                <Row label="Placement cost" value={`${formatINR(placementCost * weeks)}`} />
              </ul>
              <p className="mt-2.5 border-t border-line-soft pt-2 text-[10.5px] leading-snug text-ink-4">
                The package you choose next sets the final price; this is the
                placement inventory at its weekly rate.
              </p>
            </div>
          )}
        </aside>
      </div>
    </StepCard>
  )
}

/**
 * The month grid beside the date fields.
 *
 * It is not decoration: the chosen range is painted across it, a past day
 * cannot be picked, and clicking a day sets the start or the end depending on
 * what is already chosen. The month follows the start date, so opening the
 * step on a campaign that begins in November shows November.
 */
function ScheduleCalendar({
  start,
  end,
  onPick,
}: {
  start: string
  end: string
  onPick: (iso: string) => void
}) {
  const anchor = start ? new Date(`${start}T00:00:00`) : new Date()
  const [month, setMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  // Sunday-first, matching the reference and the Indian convention.
  const lead = first.getDay()

  const iso = (day: number) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-card border border-line text-ink-3 transition-colors hover:border-brand hover:text-brand"
        >
          <span aria-hidden>‹</span>
        </button>

        <p className="font-display text-[13px] font-bold text-ink">
          {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-card border border-line text-ink-3 transition-colors hover:border-brand hover:text-brand"
        >
          <span aria-hidden>›</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="text-[10px] font-semibold text-ink-4">
            {d}
          </span>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <span key={`gap-${i}`} />

          const value = iso(day)
          const date = new Date(`${value}T00:00:00`)
          const past = date < today
          const isStart = value === start
          const isEnd = value === end
          const inRange = Boolean(start && end && value > start && value < end)

          return (
            <button
              key={value}
              type="button"
              disabled={past}
              onClick={() => onPick(value)}
              aria-pressed={isStart || isEnd}
              aria-label={date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              className={cn(
                'tabular mx-auto flex h-7 w-7 items-center justify-center rounded-card text-[11px] transition-colors',
                past && 'cursor-not-allowed text-ink-4/50',
                !past && !isStart && !isEnd && !inRange && 'text-ink-2 hover:bg-brand-soft hover:text-brand',
                inRange && 'bg-brand-soft text-brand',
                (isStart || isEnd) && 'bg-brand font-bold text-white'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line-soft pt-2.5 text-[10px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Start / End
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-border" /> Running
        </span>
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-ink-3">{label}</span>
      <span className="tabular shrink-0 font-semibold text-ink">{value}</span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  6 — Package
// ═══════════════════════════════════════════════════════════

export function StepPackage({ draft, patch, options, onBack, onContinue, busy, error }: StepProps) {
  return (
    <StepCard
      step={6}
      title="Package (Select Plan)"
      subtitle="Choose the advertisement package that suits your goals."
      tip="Larger packages give you better reach and more value."
      tipTone="ok"
      aside={
        <a
          href="/advertisements#packages"
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-card border border-brand-border bg-paper px-3.5 py-2 text-[12px] font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          Compare Plans
        </a>
      }
      footer={
        <>
          <BackButton onClick={onBack} disabled={busy} />
          <ContinueButton
            label="Continue to Review"
            onClick={onContinue}
            busy={busy}
            disabled={!draft.packageSlug}
          />
        </>
      }
    >
      <ErrorLine message={error} />

      {/*
        Four columns, because four plans are sold. The count is not baked in —
        `options.packages` is whatever the admin has left active — but the
        widest rung matches it, so the row neither stretches two cards across
        the table nor leaves a fifth column empty.
      */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {options.packages.map((p) => {
          const active = draft.packageSlug === p.slug
          return (
            <li key={p.slug} className="relative">
              {p.isPopular && (
                <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-card bg-brand px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.05em] text-white">
                  Popular
                </span>
              )}

              <button
                type="button"
                aria-pressed={active}
                onClick={() => patch({ packageSlug: p.slug })}
                className={cn(
                  'flex h-full w-full flex-col rounded-card border p-4 pt-5 text-left transition-all',
                  active
                    ? 'border-brand bg-brand-soft/50 shadow-card'
                    : p.isPopular
                      ? 'border-brand-border bg-paper hover:shadow-card'
                      : 'border-line bg-paper hover:border-brand-border hover:shadow-card'
                )}
              >
                <span className="block text-center text-[13px] font-bold text-ink">{p.name}</span>
                <span className="mt-0.5 block text-center text-[11px] text-ink-3">
                  {p.durationLabel}
                </span>

                <span className="tabular mt-3 block text-center font-display text-[21px] font-bold leading-none text-ink">
                  {formatINR(p.price)}
                </span>
                <span className="mt-1 block text-center text-[10.5px] text-ink-3">{p.perLabel}</span>

                <span className="mt-4 flex flex-1 flex-col gap-1.5">
                  {p.features.map((f) => (
                    <span key={f} className="flex items-start gap-1.5">
                      <Icon name="check" className="mt-[3px] h-3 w-3 shrink-0 text-ok" />
                      <span className="text-[10.5px] leading-[1.45] text-ink-2">{f}</span>
                    </span>
                  ))}
                </span>

                <span
                  className={cn(
                    'mt-4 flex h-9 items-center justify-center rounded-card text-[12px] font-semibold transition-colors',
                    active
                      ? 'bg-brand text-white'
                      : 'border border-line text-ink'
                  )}
                >
                  {active ? 'Selected' : 'Choose Plan'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </StepCard>
  )
}

// ═══════════════════════════════════════════════════════════
//  7 — Review & pay
// ═══════════════════════════════════════════════════════════

export function StepReview({
  draft,
  options,
  onBack,
  onSubmit,
  busy,
  error,
  accepted,
  setAccepted,
}: StepProps & {
  onSubmit: () => void
  accepted: boolean
  setAccepted: (v: boolean) => void
}) {
  const pkg = options.packages.find((p) => p.slug === draft.packageSlug)
  const chosen = draft.placementSlugs
    .map((s) => options.placements.find((p) => p.slug === s))
    .filter((p): p is WizardOptions['placements'][number] => Boolean(p))

  const extras = chosen.slice(1).reduce((sum, p) => sum + p.price, 0)
  const amount = (pkg?.price ?? 0) + extras
  const taxPercent = pkg?.taxPercent ?? 18
  const tax = Math.round(amount * taxPercent) / 100
  const total = amount + tax

  const type = options.adTypes.find((t) => t.slug === draft.adTypeSlug)

  const audience = draft.audienceRoles
    .map((r) => AUDIENCE_TYPES.find((a) => a.value === r)?.label ?? r)
    .join(', ')

  /*
   * "Pan India" rather than a bare "India" when nothing narrows the location.
   *
   * The review page is the last thing read before paying, so it has to name
   * the choice that was actually made on step 4 — and "India" alone does not
   * distinguish the whole country from a campaign whose states were simply
   * never filled in.
   */
  const place =
    draft.states.length === 0 && draft.cities.length === 0 && draft.pincodes.length === 0
      ? `Pan ${draft.country}`
      : [draft.country, ...draft.states, ...draft.cities].filter(Boolean).join(' › ')

  return (
    <StepCard
      step={7}
      title="Review & Pay"
      subtitle="Review your campaign details and complete the payment."
      footer={<BackButton onClick={onBack} disabled={busy} />}
    >
      <ErrorLine message={error} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* ─── summary ─── */}
        <Panel title="Campaign Summary">
          <div className="mb-3">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.imageUrl}
                alt=""
                className="h-24 w-full rounded-card object-cover"
              />
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-card bg-paper-3">
                <Icon name="image" className="h-5 w-5 text-ink-4" />
              </div>
            )}
          </div>
          <Detail label="Campaign Name" value={draft.title || '—'} />
          <Detail label="Advertisement Type" value={type?.name ?? '—'} />
          <Detail label="Objective" value={draft.objective || '—'} />
          <Detail
            label="Schedule"
            value={
              draft.startsAt && draft.endsAt
                ? `${draft.startsAt} → ${draft.endsAt}`
                : '—'
            }
          />
        </Panel>

        {/* ─── targeting ─── */}
        <Panel title="Targeting">
          <Detail label="Location" value={place || 'All India'} />
          <Detail label="Audience" value={audience || '—'} />
          <Detail
            label="Categories"
            value={
              [...draft.productCategories, ...draft.projectCategories, ...draft.professionalCategories]
                .join(', ') || 'All categories'
            }
          />
          {draft.pincodes.length > 0 && (
            <Detail label="PIN codes" value={draft.pincodes.join(', ')} />
          )}
        </Panel>

        {/* ─── placements ─── */}
        <Panel title={`Placements (${chosen.length})`}>
          {chosen.length === 0 ? (
            <p className="text-[12px] text-ink-3">None chosen.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {chosen.map((p, i) => (
                <li key={p.slug} className="flex items-start gap-2.5">
                  <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-card bg-paper-3">
                    <Icon name="monitor" className="h-3.5 w-3.5 text-ink-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-ink">
                      {p.name}
                      {i === 0 && (
                        <span className="ml-1.5 text-[10px] font-normal text-brand">Primary</span>
                      )}
                    </span>
                    <span className="tabular block text-[10.5px] text-ink-3">{p.size}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ─── package ─── */}
        <Panel title="Package">
          {pkg ? (
            <>
              <p className="font-display text-[15px] font-bold text-brand">{pkg.name} Plan</p>
              <p className="tabular mt-0.5 text-[12px] text-ink-3">
                {formatINR(pkg.price)} {pkg.perLabel}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Icon name="check" className="mt-[3px] h-3 w-3 shrink-0 text-ok" />
                    <span className="text-[11px] leading-snug text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[12px] text-ink-3">No package chosen.</p>
          )}
        </Panel>

        {/* ─── payment ─── */}
        <div className="card p-4 lg:col-span-2 xl:col-span-2">
          <h3 className="mb-3 font-display text-[13.5px] font-bold text-ink">Payment Details</h3>

          <ul className="flex flex-col gap-2 border-b border-line-soft pb-3 text-[12.5px]">
            <Row label="Plan amount" value={formatINR(pkg?.price ?? 0)} />
            {extras > 0 && <Row label="Additional placements" value={formatINR(extras)} />}
            <Row label={`GST (${taxPercent}%)`} value={formatINR(tax)} />
          </ul>

          <p className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-ink">Total Amount</span>
            <span className="tabular font-display text-[19px] font-bold text-ink">
              {formatINR(total)}
            </span>
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-[3px] h-4 w-4 shrink-0 accent-[#F97316]"
            />
            <span className="text-[11.5px] leading-snug text-ink-2">
              I agree to the{' '}
              <a href="/legal/terms" className="font-semibold text-brand hover:underline">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href="/legal/refund" className="font-semibold text-brand hover:underline">
                Advertising Policy
              </a>
              .
            </span>
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !accepted}
            className="btn-primary mt-4 w-full"
          >
            {busy ? 'Submitting…' : 'Submit & Proceed to Payment'}
          </button>

          <p className="mt-2 text-[10.5px] leading-snug text-ink-4">
            Paying does not publish the advertisement. Every campaign is reviewed
            by our team first, and you are told the reason if anything needs changing.
          </p>
        </div>
      </div>
    </StepCard>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 font-display text-[13.5px] font-bold text-ink">{title}</h3>
      {children}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="mb-2.5 last:mb-0">
      <span className="block text-[10.5px] text-ink-4">{label}</span>
      <span className="block text-[12px] font-medium text-ink-2">{value}</span>
    </p>
  )
}
