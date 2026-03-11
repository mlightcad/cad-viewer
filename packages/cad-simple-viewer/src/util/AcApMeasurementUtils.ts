import {
  AcCmColor,
  AcCmColorMethod,
  AcDbLine,
  AcGePoint3dLike,
  AcGiLineWeight
} from '@mlightcad/data-model'

/** Default line weight for measurement transient entities (1 px). */
export const MEASUREMENT_LINE_WEIGHT: AcGiLineWeight =
  AcGiLineWeight.LineWeight040

/** Default canvas stroke width for measurement overlays (px). */
export const MEASUREMENT_CANVAS_LINE_WIDTH = 2

/** Standard blue colour for measurement overlays: `#60a5fa`. */
export const MEASUREMENT_COLOR = '#60a5fa'

/** Semi-transparent fill variant of {@link MEASUREMENT_COLOR}. */
export const MEASUREMENT_COLOR_FILL = 'rgba(96, 165, 250, 0.2)'

/**
 * Sizes and clears an overlay `<canvas>` so it covers `viewCanvas`,
 * then returns a 2D context already scaled for `devicePixelRatio`.
 *
 * Returns `null` when a context cannot be obtained.
 */
export function prepareCanvasOverlay(
  canvas: HTMLCanvasElement,
  viewCanvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  const rect = viewCanvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  canvas.style.left = `${rect.left}px`
  canvas.style.top = `${rect.top}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)
  return ctx
}

/** Returns an {@link AcCmColor} matching {@link MEASUREMENT_COLOR}. */
function blueColor(): AcCmColor {
  return new AcCmColor(AcCmColorMethod.ByColor).setRGB(96, 165, 250)
}

/**
 * Creates a styled measurement line between two points.
 *
 * Uses the standard blue colour and {@link MEASUREMENT_LINE_WEIGHT} by
 * default.  Pass `lineWeight` to override for a specific command.
 */
export function createMeasurementLine(
  from: AcGePoint3dLike,
  to: AcGePoint3dLike,
  lineWeight: AcGiLineWeight = MEASUREMENT_LINE_WEIGHT
): AcDbLine {
  const line = new AcDbLine(from, to)
  line.color = blueColor()
  line.lineWeight = lineWeight
  return line
}
