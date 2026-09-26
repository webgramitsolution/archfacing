/**
 * Everything about an advertisement creative that is arithmetic rather than
 * markup: how it fits a placement, what colour to extend it with, how much
 * text that placement can carry, and which layout suits its shape.
 *
 * Pure — no Prisma, no React, no sharp. A Server Component, a Client
 * Component and a test can all import it, and the same numbers decide the
 * dashboard preview and (when the engine lands) the public render. A preview
 * that computes its own geometry is a preview that can disagree with the
 * thing it is previewing.
 */

// ═══════════════════════════════════════════════════════════
//  What the uploaded file is
// ═══════════════════════════════════════════════════════════

/**
 * The colours measured off the creative at upload.
 *
 * `left` and `right` are the average colour of the outer 8% of each side —
 * those are the edges a wider placement has to extend, so they are the ones
 * worth knowing. `dominant` is the image's most common colour and is what a
 * taller placement extends above and below. `isDark` decides whether the
 * generated backdrop carries white type or dark.
 */
export type CreativePalette = {
  left: string
  right: string
  dominant: string
  isDark: boolean
}

/** An uploaded creative, as much as is known about it. */
export type CreativeFile = {
  url: string
  /** Pixel size, when it was measured. Older uploads have none. */
  width?: number | null
  height?: number | null
  palette?: CreativePalette | null
}

const FALLBACK_PALETTE: CreativePalette = {
  left: '#111827',
  right: '#1F2937',
  dominant: '#111827',
  isDark: true,
}

/** Never throws: a preview must render even for an upload measured before this existed. */
export function paletteOf(file: CreativeFile | null | undefined): CreativePalette {
  const p = file?.palette
  if (!p || typeof p !== 'object') return FALLBACK_PALETTE
  return {
    left: typeof p.left === 'string' ? p.left : FALLBACK_PALETTE.left,
    right: typeof p.right === 'string' ? p.right : FALLBACK_PALETTE.right,
    dominant: typeof p.dominant === 'string' ? p.dominant : FALLBACK_PALETTE.dominant,
    isDark: typeof p.isDark === 'boolean' ? p.isDark : FALLBACK_PALETTE.isDark,
  }
}

// ═══════════════════════════════════════════════════════════
//  The placement's shape
// ═══════════════════════════════════════════════════════════

export type Size = { w: number; h: number }

/**
 * "1200 × 300" → `{ w: 1200, h: 300 }`.
 *
 * The string is `AdPlacement.size`, so it is whatever an admin typed;
 * anything unreadable falls back to the standard banner rather than throwing
 * inside a preview.
 */
export function parseSize(size: string | null | undefined): Size {
  const [w, h] = String(size ?? '')
    .split(/[×x*]/)
    .map((n) => Number(n.replace(/[^\d]/g, '')))
  return w > 0 && h > 0 ? { w, h } : { w: 1200, h: 300 }
}

/**
 * Which composition a placement calls for, from its proportions alone.
 *
 * The placements in the database run from 728 × 90 (8:1) to 300 × 600 (1:2),
 * and no single layout serves both. Deciding from the ratio rather than from
 * a per-placement table means a placement added next year gets a sensible
 * layout without anyone editing this file.
 */
export type CreativeShape = 'strip' | 'banner' | 'square' | 'portrait'

export function shapeOf(size: Size): CreativeShape {
  const r = size.w / size.h
  if (r >= 5) return 'strip' //  728 × 90, a thin bar
  if (r >= 1.6) return 'banner' // 1200 × 300, the usual wide slot
  if (r >= 0.9) return 'square' //  a boxy unit
  return 'portrait' //  300 × 600, a skyscraper
}

// ═══════════════════════════════════════════════════════════
//  Fitting the image without cropping it
// ═══════════════════════════════════════════════════════════

export type CreativeFit = {
  /**
   * How the image sits in the frame.
   *
   *  · `exact`  — the ratios match; the image fills the frame.
   *  · `letterbox` — the image is WIDER than the frame, so it is scaled to
   *    the frame's width and the spare height is backdrop.
   *  · `pillarbox` — the image is TALLER than the frame, so it is scaled to
   *    the frame's height and the spare width is backdrop.
   */
  mode: 'exact' | 'letterbox' | 'pillarbox'
  /** The image's own width and height as a percentage of the frame. */
  widthPct: number
  heightPct: number
  /** How much of the frame is backdrop rather than image, 0–1. */
  spare: number
  /** Where the image is placed — the copy goes in the space that is left. */
  align: 'center' | 'left' | 'right' | 'top' | 'bottom'
}

/** Ratios within this of each other are treated as the same shape. */
const RATIO_TOLERANCE = 0.04

/**
 * Fit, never crop.
 *
 * `object-cover` — the obvious thing, and what this used to do — fills the
 * frame by throwing away whatever does not fit. On a 1920 × 600 creative in a
 * 300 × 600 sidebar that discards 84% of the width, which is to say the
 * headline, the logo and the product. So the image is always scaled to fit
 * whole (`contain`), and the leftover is filled with colour taken FROM the
 * image, which is what keeps it reading as one artwork instead of a picture
 * on a coloured box.
 */
export function fitCreative(image: Size | null | undefined, frame: Size): CreativeFit {
  // Nothing measured — assume it fills, which is what an unmeasured older
  // upload did before, so nothing regresses.
  if (!image || !image.w || !image.h) {
    return { mode: 'exact', widthPct: 100, heightPct: 100, spare: 0, align: 'center' }
  }

  const imageRatio = image.w / image.h
  const frameRatio = frame.w / frame.h
  const drift = Math.abs(imageRatio - frameRatio) / frameRatio

  if (drift <= RATIO_TOLERANCE) {
    return { mode: 'exact', widthPct: 100, heightPct: 100, spare: 0, align: 'center' }
  }

  if (imageRatio > frameRatio) {
    // Wider than the frame: full width, spare height above and below.
    const heightPct = (frameRatio / imageRatio) * 100
    return {
      mode: 'letterbox',
      widthPct: 100,
      heightPct,
      spare: 1 - heightPct / 100,
      /*
       * Where the spare height goes, and it matters.
       *
       * A tall frame stacks its copy UNDER the artwork — the ordinary
       * vertical advertisement — so the image goes to the top and the copy
       * has clean backdrop beneath it. Aligning it to the bottom in a
       * skyscraper put the picture and the words in the same 16% band.
       *
       * A wide frame keeps its copy over the top band instead, so there the
       * image sits low, which also suits a banner whose subject is usually
       * in its lower half.
       */
      align: frameRatio < 1.6 ? 'top' : 'bottom',
    }
  }

  // Taller than the frame: full height, spare width to one side.
  const widthPct = (imageRatio / frameRatio) * 100
  return {
    mode: 'pillarbox',
    widthPct,
    heightPct: 100,
    spare: 1 - widthPct / 100,
    // Pushed right, so the generated backdrop on the left is where the copy
    // goes — the arrangement every banner in the design already uses.
    align: 'right',
  }
}

/**
 * The width to draw a frame at so it fits a box, keeping its true ratio.
 *
 * A gallery of placements has to show a 728 × 90 bar and a 300 × 600
 * skyscraper in the same row of cards. Giving both the card's full width
 * makes the skyscraper 560px tall and the row ragged; giving both the same
 * height makes the bar 1280px wide. Capping BOTH and letting the ratio pick
 * the binding constraint keeps every preview inside the same band while
 * leaving their shapes visibly different — which is the point of the gallery.
 */
export function drawWidthFor(frame: Size, maxWidth: number, maxHeight: number): number {
  return Math.round(Math.min(maxWidth, maxHeight * (frame.w / frame.h)))
}

/**
 * The backdrop behind and beside the image.
 *
 * Built from the palette so it continues the creative rather than framing it.
 * A `pillarbox` fit extends the image's LEFT edge leftwards, because that is
 * the edge the gap touches; a `letterbox` fit extends the dominant colour,
 * because the gap touches the top and bottom where there is no single edge.
 */
export function backdropOf(fit: CreativeFit, palette: CreativePalette): string {
  if (fit.mode === 'pillarbox') {
    /*
     * The gradient has to ARRIVE at the image's own edge colour.
     *
     * This ran the other way round at first — it started at the edge colour
     * and travelled to the dominant one, which meant the colour touching the
     * artwork was the one furthest from it. Measured on a real upload: the
     * creative's left edge is #323e53 and the backdrop met it at #081838, a
     * visible step exactly where the two are supposed to be indivisible.
     *
     * So the stops are keyed to where the image actually starts: deep at the
     * outer edge, and precisely `palette.left` by the time it reaches the
     * artwork. The copy gets a darker ground to sit on and the join
     * disappears.
     */
    const seam = Math.max(1, Math.round(fit.spare * 100))
    return (
      `linear-gradient(to right, ${palette.dominant} 0%, ` +
      `${mix(palette.dominant, palette.left, 0.55)} ${Math.round(seam * 0.6)}%, ` +
      `${palette.left} ${seam}%, ${palette.left} 100%)`
    )
  }

  if (fit.mode === 'letterbox') {
    // Spare height. The image is at one end, so the backdrop deepens away
    // from it rather than being banded symmetrically.
    const seam = Math.max(1, Math.round((1 - fit.spare) * 100))
    return fit.align === 'top'
      ? `linear-gradient(to bottom, ${palette.left} ${seam}%, ${mix(palette.dominant, palette.left, 0.4)} 100%)`
      : `linear-gradient(to top, ${palette.left} ${seam}%, ${mix(palette.dominant, palette.left, 0.4)} 100%)`
  }

  return palette.dominant
}

/** `t` of the way from `a` to `b`, both `#rrggbb`. */
function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  const to = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  if (!/^#[0-9a-fA-F]{6}$/.test(a) || !/^#[0-9a-fA-F]{6}$/.test(b)) return a
  return `#${[0, 1, 2].map((i) => to(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join('')}`
}

// ═══════════════════════════════════════════════════════════
//  How much text the placement can carry
// ═══════════════════════════════════════════════════════════

export type CreativeLimits = {
  headline: number
  description: number
  cta: number
  brand: number
}

/**
 * Character limits, set by how much room the placement actually has.
 *
 * The same rule every advertising platform applies, and for the same reason:
 * a 728 × 90 bar rendered at real size fits about four words, so accepting a
 * hundred characters there is accepting something that cannot be displayed.
 * Measured against the frame's AREA in the creative's own pixels, not its
 * width, so a tall sidebar is not treated as a thin bar.
 */
export function limitsFor(size: Size): CreativeLimits {
  const area = size.w * size.h
  const shape = shapeOf(size)

  // A thin strip is the tightest case whatever its area — there is one line.
  if (shape === 'strip') {
    return { headline: 25, description: 0, cta: 15, brand: 20 }
  }

  if (area < 200_000) {
    // e.g. 970 × 250 and smaller boxes
    return { headline: 30, description: 60, cta: 15, brand: 25 }
  }

  return { headline: 40, description: 90, cta: 20, brand: 30 }
}

/**
 * The limits a campaign must satisfy — the STRICTEST of its placements.
 *
 * A campaign runs in several places at once, so its words have to fit the
 * smallest one it booked. Taking the minimum per field means adding a
 * 728 × 90 placement tightens the headline limit, which is the honest
 * behaviour: that is the slot that will truncate.
 */
export function limitsAcross(sizes: Size[]): CreativeLimits {
  if (sizes.length === 0) return { headline: 40, description: 90, cta: 20, brand: 30 }

  return sizes.map(limitsFor).reduce((a, b) => ({
    headline: Math.min(a.headline, b.headline),
    // A placement that carries no description at all must not force every
    // other placement's description to zero — the field is simply not drawn
    // there. So zero is ignored when combining.
    description: Math.min(a.description || Infinity, b.description || Infinity),
    cta: Math.min(a.cta, b.cta),
    brand: Math.min(a.brand, b.brand),
  }))
}

/** Which fields are over their limit, for the wizard to refuse submission on. */
export function overLimit(
  content: { headline?: string; description?: string; cta?: string; brand?: string },
  limits: CreativeLimits
): string[] {
  const over: string[] = []
  if ((content.headline?.length ?? 0) > limits.headline) over.push('Headline')
  if (limits.description > 0 && (content.description?.length ?? 0) > limits.description) {
    over.push('Description')
  }
  if ((content.cta?.length ?? 0) > limits.cta) over.push('CTA text')
  if ((content.brand?.length ?? 0) > limits.brand) over.push('Brand name')
  return over
}

// ═══════════════════════════════════════════════════════════
//  The composition
// ═══════════════════════════════════════════════════════════

export type CreativeLayout = {
  /** Which parts are drawn at all. */
  showDescription: boolean
  showBrand: boolean
  showCta: boolean
  /** Copy across the bottom instead of beside the image. */
  stacked: boolean
  /** Type sizes, in px, for a frame rendered at `renderedWidth`. */
  headlinePx: number
  descriptionPx: number
  ctaPx: number
  labelPx: number
  padPx: number
  /** How much of the frame's width the copy may use. */
  copyWidthPct: number
}

/**
 * What to draw, and how big, for a frame of a given shape at a given size.
 *
 * Everything scales off the RENDERED width rather than the placement's pixel
 * size, because the same 1200 × 300 slot is previewed at 300px on a card and
 * at 900px in the full-page view, and type that suits one is unreadable or
 * absurd at the other.
 */
export function layoutFor(size: Size, renderedWidth: number): CreativeLayout {
  const shape = shapeOf(size)
  const renderedHeight = renderedWidth / (size.w / size.h)

  /** 1 at a 360px-wide render, less below it, more above — capped either way. */
  const scale = Math.max(0.55, Math.min(1.9, renderedWidth / 360))

  if (shape === 'strip') {
    // One line. Headline and button side by side, nothing else.
    return {
      showDescription: false,
      showBrand: false,
      showCta: renderedWidth >= 240,
      stacked: false,
      headlinePx: Math.round(11 * scale),
      descriptionPx: 0,
      ctaPx: Math.round(9 * scale),
      labelPx: Math.round(7.5 * scale),
      padPx: Math.round(8 * scale),
      copyWidthPct: 66,
    }
  }

  if (shape === 'portrait') {
    // A skyscraper: the copy sits under the image, full width.
    return {
      showDescription: renderedHeight >= 300,
      showBrand: renderedHeight >= 240,
      showCta: true,
      stacked: true,
      headlinePx: Math.round(13 * scale),
      descriptionPx: Math.round(10 * scale),
      ctaPx: Math.round(10 * scale),
      labelPx: Math.round(8 * scale),
      padPx: Math.round(12 * scale),
      copyWidthPct: 100,
    }
  }

  if (shape === 'square') {
    return {
      showDescription: renderedHeight >= 200,
      showBrand: true,
      showCta: true,
      stacked: true,
      headlinePx: Math.round(15 * scale),
      descriptionPx: Math.round(11 * scale),
      ctaPx: Math.round(10.5 * scale),
      labelPx: Math.round(8.5 * scale),
      padPx: Math.round(14 * scale),
      copyWidthPct: 100,
    }
  }

  // banner — the wide slot, copy on the left over the extended backdrop
  return {
    showDescription: renderedHeight >= 96,
    showBrand: renderedHeight >= 120,
    showCta: true,
    stacked: false,
    headlinePx: Math.round(15 * scale),
    descriptionPx: Math.round(10.5 * scale),
    ctaPx: Math.round(10.5 * scale),
    labelPx: Math.round(8.5 * scale),
    padPx: Math.round(14 * scale),
    copyWidthPct: 52,
  }
}

// ═══════════════════════════════════════════════════════════
//  Telling the advertiser what will happen to their file
// ═══════════════════════════════════════════════════════════

export type FitReport = {
  tone: 'ok' | 'warn'
  /** "1920 × 600" */
  uploaded: string | null
  /** "1200 × 300" */
  required: string
  /** "3.20:1" */
  uploadedRatio: string | null
  requiredRatio: string
  message: string
}

/** The line shown under the dropzone once a file is in place. */
export function fitReport(image: Size | null | undefined, frame: Size): FitReport {
  const required = `${frame.w} × ${frame.h}`
  const requiredRatio = `${(frame.w / frame.h).toFixed(2)}:1`

  if (!image || !image.w || !image.h) {
    return {
      tone: 'warn',
      uploaded: null,
      required,
      uploadedRatio: null,
      requiredRatio,
      message: 'This file was uploaded before size checking — replace it to see the fit.',
    }
  }

  const fit = fitCreative(image, frame)
  const uploaded = `${image.w} × ${image.h}`
  const uploadedRatio = `${(image.w / image.h).toFixed(2)}:1`

  if (fit.mode === 'exact') {
    return {
      tone: 'ok',
      uploaded,
      required,
      uploadedRatio,
      requiredRatio,
      message: 'Compatible — fills the placement exactly.',
    }
  }

  const spare = Math.round(fit.spare * 100)

  if (spare <= 25) {
    return {
      tone: 'ok',
      uploaded,
      required,
      uploadedRatio,
      requiredRatio,
      message: `Compatible — fitted whole, with ${spare}% filled by a background taken from your image. Nothing is cropped.`,
    }
  }

  return {
    tone: 'warn',
    uploaded,
    required,
    uploadedRatio,
    requiredRatio,
    message:
      `Different aspect ratio. Your complete image is kept — nothing is cropped — and ` +
      `${spare}% of the slot is filled with a background generated from it. ` +
      `Uploading at ${required} would use the whole slot for artwork.`,
  }
}
