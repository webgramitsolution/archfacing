'use client'

import { cn } from '@/lib/utils'
import {
  backdropOf, fitCreative, layoutFor, paletteOf, parseSize, shapeOf,
  type CreativeFile, type Size,
} from '@/lib/ad-creative'

/**
 * One advertisement, drawn as it will actually appear in a placement.
 *
 * This replaces the grey wireframes the placement cards used to show. Those
 * answered "roughly whereabouts on the page" and nothing else — every card
 * looked the same, and none of them showed the advertiser their own artwork.
 *
 * Three rules hold the whole thing together:
 *
 *  1. **The frame is the placement's real shape.** 1200 × 300 is drawn at
 *     4:1, 300 × 600 at 1:2. Nothing is forced to a house ratio.
 *  2. **The image is never cropped.** It is scaled to fit whole, and the
 *     leftover is filled with a backdrop built from the image's OWN edge
 *     colours, so artwork and backdrop read as one creative. `object-cover`
 *     would have thrown away 84% of a wide banner placed in a sidebar.
 *  3. **The composition follows the shape.** A thin bar gets a headline and
 *     a button on one line; a skyscraper stacks; a wide banner puts the copy
 *     on the extended backdrop to the left. All of it decided by
 *     `layoutFor`, from the ratio — so a placement added later composes
 *     itself.
 *
 * Everything it draws comes from the campaign. It invents no copy, no brand
 * and no image.
 */

export type AdContent = {
  headline?: string | null
  description?: string | null
  cta?: string | null
  brand?: string | null
  logoUrl?: string | null
}

export function AdCreative({
  content,
  file,
  /** The placement's size — "1200 × 300" or a parsed `{w,h}`. */
  size,
  /** The CSS width to draw at. Type and spacing scale off this. */
  width,
  /** Shown unless the caller is drawing its own label outside the frame. */
  showSponsored = true,
  className,
}: {
  content: AdContent
  file: CreativeFile | null | undefined
  size: string | Size
  width: number
  showSponsored?: boolean
  className?: string
}) {
  const frame = typeof size === 'string' ? parseSize(size) : size
  const palette = paletteOf(file)
  const image = file?.width && file?.height ? { w: file.width, h: file.height } : null
  const fit = fitCreative(image, frame)
  const layout = layoutFor(frame, width)
  const shape = shapeOf(frame)

  /*
   * White type on a dark backdrop, dark on a light one.
   *
   * Taken from the creative's own luminance rather than assumed — an
   * advertiser who uploads a white-background banner would otherwise get
   * white text on white.
   */
  const onDark = palette.isDark
  const ink = onDark ? 'text-white' : 'text-navy'
  const inkSoft = onDark ? 'text-white/75' : 'text-navy/70'
  const labelSkin = onDark
    ? 'bg-black/35 text-white/85 ring-white/20'
    : 'bg-white/70 text-navy/75 ring-black/10'

  const headline = content.headline?.trim()
  const description = content.description?.trim()
  const cta = content.cta?.trim()
  const brand = content.brand?.trim()

  /*
   * Where the copy goes.
   *
   * A `pillarbox` fit has already pushed the image to the right, so the
   * generated backdrop on the left is exactly the space the copy belongs in
   * — the arrangement the design uses for every banner. A `letterbox` fit
   * has spare height instead, so the copy sits over the top band. Anything
   * that fills the frame exactly has no spare room, and the copy goes over
   * the artwork's left half.
   */
  const copyOverBackdrop = fit.mode === 'pillarbox' && fit.spare >= 0.18

  return (
    <div
      className={cn('relative isolate overflow-hidden rounded-[5px]', className)}
      style={{
        width,
        maxWidth: '100%',
        aspectRatio: `${frame.w} / ${frame.h}`,
        background: backdropOf(fit, palette),
      }}
    >
      {/* ─── the artwork, whole ─── */}
      {file?.url && (
        <span
          className="absolute inset-0 flex"
          style={{
            justifyContent:
              fit.align === 'right' ? 'flex-end' : fit.align === 'left' ? 'flex-start' : 'center',
            alignItems:
              fit.align === 'bottom' ? 'flex-end' : fit.align === 'top' ? 'flex-start' : 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt=""
            /*
              `object-contain` inside a box sized to the fit — the image keeps
              its own proportions and every pixel of it stays visible. The
              box is what is positioned; the image simply fills it.
            */
            className="h-full w-full object-contain"
            style={{ width: `${fit.widthPct}%`, height: `${fit.heightPct}%` }}
          />

        </span>
      )}

      {/* ─── the words ─── */}
      <div
        className={cn(
          'absolute inset-0 flex',
          layout.stacked ? 'flex-col justify-end' : 'flex-col justify-center'
        )}
        style={{ padding: layout.padPx }}
      >
        {/*
          `Sponsored` — required on every rendering of an advertisement, so a
          reader can tell paid placement from editorial. Kept small and in
          the corner: visible, not shouting.
        */}
        {showSponsored && (
          <span
            className={cn(
              'absolute top-0 m-[4px] rounded-[3px] px-[5px] py-[2px] font-semibold uppercase tracking-[0.06em] ring-1',
              labelSkin,
              /*
                In the corner the copy does not use — measured, because it
                collided: on a 270 × 68 banner the chip sat at (4,4) and the
                headline at (11,13), so the first thing the advertiser read
                was their own headline with SPONSORED printed through it.

                Copy beside the image runs down the left, so the label goes
                right. Copy stacked under the image starts at the bottom, so
                the label goes left.
              */
              layout.stacked ? 'left-0' : 'right-0'
            )}
            style={{ fontSize: layout.labelPx }}
          >
            {/*
              "Ad" on a thin bar. A 728 × 90 strip is one line of type high;
              spelling out "Sponsored · Brand Name" there would take the room
              the headline needs, and "Ad" is what a bar that size carries on
              every real platform.
            */}
            {shape === 'strip'
              ? 'Ad'
              : brand && layout.showBrand
                ? `Sponsored · ${brand}`
                : 'Sponsored'}
          </span>
        )}

        <div
          className={cn(
            'flex min-w-0',
            shape === 'strip' ? 'items-center gap-2' : 'flex-col',
            // On a strip the label shares the top edge, so the row is nudged
            // down to clear it.
            // The strip's label sits top-right, so the row clears it on that
            // side rather than being pushed down in a 33px-tall frame.
            shape === 'strip' && showSponsored ? 'pr-[22px]' : ''
          )}
          style={{
            width: layout.stacked ? '100%' : `${layout.copyWidthPct}%`,
            // Copy sits on the backdrop the fit created, when there is one.
            marginRight: copyOverBackdrop ? 'auto' : undefined,
          }}
        >
          {headline && (
            <p
              className={cn(
                'min-w-0 font-display font-bold leading-tight',
                ink,
                shape === 'strip' ? 'flex-1 truncate' : 'text-balance'
              )}
              style={{ fontSize: layout.headlinePx }}
            >
              {headline}
            </p>
          )}

          {layout.showDescription && description && (
            <p
              className={cn('text-balance leading-snug', inkSoft)}
              style={{ fontSize: layout.descriptionPx, marginTop: Math.round(layout.padPx * 0.3) }}
            >
              {description}
            </p>
          )}

          {layout.showCta && cta && (
            <span
              className="inline-flex w-fit shrink-0 items-center rounded-[4px] bg-brand font-bold text-white"
              style={{
                fontSize: layout.ctaPx,
                marginTop: shape === 'strip' ? 0 : Math.round(layout.padPx * 0.6),
                padding: `${Math.round(layout.ctaPx * 0.45)}px ${Math.round(layout.ctaPx * 0.9)}px`,
              }}
            >
              {cta}
            </span>
          )}
        </div>

        {/*
          The advertiser's logo, bottom right, where it does not compete with
          the headline. Only on frames tall enough to hold it.
        */}
        {content.logoUrl && layout.showBrand && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.logoUrl}
            alt=""
            className="absolute bottom-0 right-0 m-[6px] rounded-[3px] bg-white/90 object-contain p-[2px]"
            style={{ height: Math.round(layout.headlinePx * 1.6) }}
          />
        )}
      </div>
    </div>
  )
}
