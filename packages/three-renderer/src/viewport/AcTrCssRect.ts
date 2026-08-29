/**
 * Axis-aligned rectangle in CSS pixels with origin at the top-left of the
 * canvas (or host). Used for overlay viewports, scissor conversion, and
 * loupe layout.
 */
export interface AcTrCssRect {
  /** Left edge in CSS pixels. */
  x: number
  /** Top edge in CSS pixels. */
  y: number
  /** Width in CSS pixels. */
  width: number
  /** Height in CSS pixels. */
  height: number
}

/**
 * Converts a CSS top-left rectangle to WebGL / Three.js viewport coordinates
 * (origin at the bottom-left of the canvas).
 *
 * Three.js `setViewport` / `setScissor` take these CSS-pixel values and apply
 * `pixelRatio` internally.
 *
 * @param rect - Rectangle in CSS pixels, origin top-left.
 * @param canvasCssHeight - Canvas CSS height (same space as `rect.y`).
 * @returns The same rectangle with `y` measured from the canvas bottom.
 */
export function acTrCssTopLeftRectToGl(
  rect: AcTrCssRect,
  canvasCssHeight: number
): AcTrCssRect {
  return {
    x: rect.x,
    y: canvasCssHeight - rect.y - rect.height,
    width: rect.width,
    height: rect.height
  }
}

/**
 * Intersection of two CSS rectangles, or `null` when the overlap is empty
 * or smaller than 1px.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns Overlap rectangle, or `null` when there is no usable overlap.
 */
export function acTrIntersectCssRects(
  a: AcTrCssRect,
  b: AcTrCssRect
): AcTrCssRect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const width = right - x
  const height = bottom - y
  if (width < 1 || height < 1) return null
  return { x, y, width, height }
}

/**
 * Maps a world-space axis-aligned box into a CSS rectangle, given that
 * `viewBox` fills `screen` (Y-up world → Y-down CSS).
 *
 * @param box - World box to project.
 * @param viewBox - World extents currently mapped onto `screen`.
 * @param screen - CSS rectangle that displays `viewBox`.
 * @returns `box` in the same CSS space as `screen`.
 */
export function acTrWcsBoxToCssRect(
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
  viewBox: { min: { x: number; y: number }; max: { x: number; y: number } },
  screen: AcTrCssRect
): AcTrCssRect {
  const vx = Math.max(viewBox.max.x - viewBox.min.x, Number.EPSILON)
  const vy = Math.max(viewBox.max.y - viewBox.min.y, Number.EPSILON)
  const x = screen.x + ((box.min.x - viewBox.min.x) / vx) * screen.width
  const y = screen.y + ((viewBox.max.y - box.max.y) / vy) * screen.height
  return {
    x,
    y,
    width: ((box.max.x - box.min.x) / vx) * screen.width,
    height: ((box.max.y - box.min.y) / vy) * screen.height
  }
}

/**
 * Inverse of {@link acTrWcsBoxToCssRect}: CSS rectangle → world box.
 *
 * @param rect - CSS rectangle inside `screen`.
 * @param viewBox - World extents currently mapped onto `screen`.
 * @param screen - CSS rectangle that displays `viewBox`.
 * @returns Axis-aligned world box corresponding to `rect`.
 */
export function acTrCssRectToWcsBox(
  rect: AcTrCssRect,
  viewBox: { min: { x: number; y: number }; max: { x: number; y: number } },
  screen: AcTrCssRect
): { minX: number; minY: number; maxX: number; maxY: number } {
  const vx = Math.max(viewBox.max.x - viewBox.min.x, Number.EPSILON)
  const vy = Math.max(viewBox.max.y - viewBox.min.y, Number.EPSILON)
  const minX = viewBox.min.x + ((rect.x - screen.x) / screen.width) * vx
  const maxX =
    viewBox.min.x + ((rect.x + rect.width - screen.x) / screen.width) * vx
  const maxY = viewBox.max.y - ((rect.y - screen.y) / screen.height) * vy
  const minY =
    viewBox.max.y - ((rect.y + rect.height - screen.y) / screen.height) * vy
  return { minX, minY, maxX, maxY }
}
