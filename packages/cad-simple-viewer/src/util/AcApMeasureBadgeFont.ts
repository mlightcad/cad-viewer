/**
 * Fit-to-screen measure badges must not swallow the segment they label.
 * Capsule width is limited to a fraction of the segment's screen length.
 *
 * Capsule padding and border are authored in `em` (see {@link AcTrHtmlBadge}),
 * so horizontal chrome scales with font size.
 */

/** Reference font size matching {@link AcTrHtmlBadge} authoring. */
export const ACAP_MEASURE_BADGE_REF_FONT_PX = 13

/** Horizontal padding at {@link ACAP_MEASURE_BADGE_REF_FONT_PX} (each side). */
export const ACAP_MEASURE_BADGE_PAD_X_PX = 14

/** Border width at {@link ACAP_MEASURE_BADGE_REF_FONT_PX} (each side). */
export const ACAP_MEASURE_BADGE_BORDER_PX = 1

/**
 * Horizontal pad+border at the reference font size (legacy constant).
 * Prefer {@link acapMeasureBadgeChromePx} when font size varies.
 */
export const ACAP_MEASURE_BADGE_H_CHROME_PX =
  ACAP_MEASURE_BADGE_PAD_X_PX * 2 + ACAP_MEASURE_BADGE_BORDER_PX * 2

/** Max fraction of the measured segment a mid-line badge may occupy. */
export const ACAP_MEASURE_BADGE_MAX_LINE_FRACTION = 0.5

/**
 * Angle badge reference uses this fraction of the shorter arm (screen),
 * matching the dimension-arc radius so the capsule stays near the wedge.
 */
export const ACAP_MEASURE_ANGLE_BADGE_REF_ARM_FRACTION = 0.5

let measureCtx: CanvasRenderingContext2D | null | undefined

function textMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx
  if (typeof document === 'undefined') {
    measureCtx = null
    return null
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d')
  } catch {
    measureCtx = null
  }
  return measureCtx
}

export type AcApMeasureBadgeFontOptions = {
  /**
   * Horizontal padding in `em` (default
   * {@link ACAP_MEASURE_BADGE_PAD_X_PX} / {@link ACAP_MEASURE_BADGE_REF_FONT_PX}).
   */
  padXEm?: number
  /**
   * Border width each side in `em` (default
   * {@link ACAP_MEASURE_BADGE_BORDER_PX} / {@link ACAP_MEASURE_BADGE_REF_FONT_PX}).
   */
  borderEm?: number
  fontWeight?: string
  fontFamily?: string
  /** Max badge width as a fraction of segment length (default 0.5). */
  maxLineFraction?: number
}

function padXEm(options?: AcApMeasureBadgeFontOptions): number {
  return (
    options?.padXEm ??
    ACAP_MEASURE_BADGE_PAD_X_PX / ACAP_MEASURE_BADGE_REF_FONT_PX
  )
}

function borderEm(options?: AcApMeasureBadgeFontOptions): number {
  const b =
    options?.borderEm ??
    ACAP_MEASURE_BADGE_BORDER_PX / ACAP_MEASURE_BADGE_REF_FONT_PX
  return b > 0 ? b : 0
}

/** Horizontal capsule chrome (pad + border) at a given font size. */
export function acapMeasureBadgeChromePx(
  fontSizePx: number,
  options?: AcApMeasureBadgeFontOptions
): number {
  if (!(fontSizePx > 0)) return 0
  return 2 * (padXEm(options) + borderEm(options)) * fontSizePx
}

/** Estimates the rendered width of a measure value capsule at `fontSizePx`. */
export function acapEstimateMeasureBadgeWidthPx(
  text: string,
  fontSizePx: number,
  options?: AcApMeasureBadgeFontOptions
): number {
  const chrome = acapMeasureBadgeChromePx(fontSizePx, options)
  if (!(fontSizePx > 0)) return chrome
  const ctx = textMeasureContext()
  if (!ctx) {
    // Headless / no canvas: rough CJK-aware fallback (~0.6em average).
    return text.length * fontSizePx * 0.6 + chrome
  }
  const weight = options?.fontWeight ?? '500'
  const family = options?.fontFamily ?? 'sans-serif'
  ctx.font = `${weight} ${fontSizePx}px ${family}`
  return ctx.measureText(text).width + chrome
}

/**
 * Returns `preferredFontSizePx`, or a smaller size so the capsule width is at
 * most {@link ACAP_MEASURE_BADGE_MAX_LINE_FRACTION} of `lineLengthScreenPx`.
 *
 * Assumes em-based horizontal padding and border so chrome shrinks with the font.
 */
export function acapClampMeasureBadgeFontSize(
  text: string,
  preferredFontSizePx: number,
  lineLengthScreenPx: number,
  options?: AcApMeasureBadgeFontOptions
): number {
  if (!(preferredFontSizePx > 0) || !(lineLengthScreenPx > 0)) {
    return preferredFontSizePx
  }
  const fraction =
    options?.maxLineFraction ?? ACAP_MEASURE_BADGE_MAX_LINE_FRACTION
  const maxWidth = lineLengthScreenPx * fraction
  const preferredWidth = acapEstimateMeasureBadgeWidthPx(
    text,
    preferredFontSizePx,
    options
  )
  if (preferredWidth <= maxWidth) return preferredFontSizePx
  if (!(maxWidth > 0)) return 1

  const textWidth = Math.max(
    0,
    preferredWidth - acapMeasureBadgeChromePx(preferredFontSizePx, options)
  )
  const kText = textWidth / preferredFontSizePx
  const kChrome = 2 * (padXEm(options) + borderEm(options))
  const denom = kText + kChrome
  if (!(denom > 0)) return preferredFontSizePx
  return Math.max(1, maxWidth / denom)
}

/**
 * Fit-to-screen only: clamp badge font so the capsule stays within half the
 * segment. Custom (WCS) heights are left unchanged.
 */
export function acapAdaptiveMeasureBadgeFontSize(
  text: string,
  style: { fontSize: number; textHeightMode?: 'adaptive' | 'custom' },
  lineLengthScreenPx: number,
  options?: AcApMeasureBadgeFontOptions
): number {
  if (style.textHeightMode === 'custom') return style.fontSize
  return acapClampMeasureBadgeFontSize(
    text,
    style.fontSize,
    lineLengthScreenPx,
    options
  )
}

/** Screen-space length of a world-space segment. */
export function acapScreenSegmentLengthPx(
  worldToScreen: (p: { x: number; y: number }) => { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const sa = worldToScreen(a)
  const sb = worldToScreen(b)
  return Math.hypot(sb.x - sa.x, sb.y - sa.y)
}

/**
 * Scales a Fit-to-screen overlay length (arrow head, etc.) with the badge font
 * clamp so endpoint arrows shrink when the capsule is forced smaller.
 */
export function acapScaleMeasureOverlayPx(
  preferredPx: number,
  preferredFontSizePx: number,
  clampedFontSizePx: number
): number {
  if (!(preferredPx > 0) || !(preferredFontSizePx > 0)) return preferredPx
  if (!(clampedFontSizePx > 0) || clampedFontSizePx >= preferredFontSizePx) {
    return preferredPx
  }
  return Math.max(1, preferredPx * (clampedFontSizePx / preferredFontSizePx))
}

type Point2 = { x: number; y: number }
type WorldToScreen = (p: Point2) => Point2

/** Screen length of the angle dimension arc radius (shorter arm × fraction). */
export function acapScreenAngleBadgeRefLengthPx(
  worldToScreen: WorldToScreen,
  vertex: Point2,
  arm1: Point2,
  arm2: Point2
): number {
  return (
    Math.min(
      acapScreenSegmentLengthPx(worldToScreen, vertex, arm1),
      acapScreenSegmentLengthPx(worldToScreen, vertex, arm2)
    ) * ACAP_MEASURE_ANGLE_BADGE_REF_ARM_FRACTION
  )
}

/**
 * Screen length of a measured arc, via uniform scale `screenR / radiusWcs`.
 */
export function acapScreenArcLengthPx(
  worldToScreen: WorldToScreen,
  center: Point2,
  radiusWcs: number,
  arcLengthWcs: number
): number {
  if (!(radiusWcs > 0) || !(arcLengthWcs > 0)) return 0
  const a = worldToScreen(center)
  const b = worldToScreen({ x: center.x + radiusWcs, y: center.y })
  const screenR = Math.hypot(b.x - a.x, b.y - a.y)
  return (screenR / radiusWcs) * arcLengthWcs
}

/** Distance from point `p` to segment `a`→`b` in the same coordinate space. */
function distPointToSegment2d(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (!(len2 > 0)) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Reference screen length for an area badge at the vertex centroid.
 *
 * Uses the shorter of: minimum polygon edge, and twice the screen distance
 * from the centroid to the nearest edge (local “width” around the label).
 */
export function acapScreenAreaBadgeRefLengthPx(
  worldToScreen: WorldToScreen,
  points: readonly Point2[]
): number {
  const n = points.length
  if (n < 3) return 0
  let minEdge = Infinity
  for (let i = 0; i < n; i++) {
    const a = points[i]!
    const b = points[(i + 1) % n]!
    minEdge = Math.min(
      minEdge,
      acapScreenSegmentLengthPx(worldToScreen, a, b)
    )
  }
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  cx /= n
  cy /= n
  const sc = worldToScreen({ x: cx, y: cy })
  let minToEdge = Infinity
  for (let i = 0; i < n; i++) {
    const a = worldToScreen(points[i]!)
    const b = worldToScreen(points[(i + 1) % n]!)
    minToEdge = Math.min(minToEdge, distPointToSegment2d(sc, a, b))
  }
  return Math.min(minEdge, 2 * minToEdge)
}
