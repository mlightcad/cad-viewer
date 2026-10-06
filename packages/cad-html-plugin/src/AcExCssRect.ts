/**
 * Axis-aligned rectangle in CSS pixels with origin at the top-left of the
 * canvas (or host). Used for the snap-loupe overlay and nested paper-space
 * viewport scissors in the exported HTML runtime.
 */
export interface AcExCssRect {
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
 * @param rect - Rectangle in CSS pixels, origin top-left.
 * @param canvasCssHeight - Canvas CSS height (same space as `rect.y`).
 * @returns The same rectangle with `y` measured from the canvas bottom.
 */
export function acexCssTopLeftRectToGl(
  rect: AcExCssRect,
  canvasCssHeight: number
): AcExCssRect {
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
export function acexIntersectCssRects(
  a: AcExCssRect,
  b: AcExCssRect
): AcExCssRect | null {
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
 * @param box - World box to project (`minX`/`minY`/`maxX`/`maxY`).
 * @param viewBox - World extents currently mapped onto `screen`.
 * @param screen - CSS rectangle that displays `viewBox`.
 * @returns `box` in the same CSS space as `screen`.
 */
export function acexWcsBoxToCssRect(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  viewBox: { minX: number; minY: number; maxX: number; maxY: number },
  screen: AcExCssRect
): AcExCssRect {
  const vx = Math.max(viewBox.maxX - viewBox.minX, Number.EPSILON)
  const vy = Math.max(viewBox.maxY - viewBox.minY, Number.EPSILON)
  return {
    x: screen.x + ((box.minX - viewBox.minX) / vx) * screen.width,
    y: screen.y + ((viewBox.maxY - box.maxY) / vy) * screen.height,
    width: ((box.maxX - box.minX) / vx) * screen.width,
    height: ((box.maxY - box.minY) / vy) * screen.height
  }
}

/**
 * Inverse of {@link acexWcsBoxToCssRect}: CSS rectangle → world box.
 *
 * @param rect - CSS rectangle inside `screen`.
 * @param viewBox - World extents currently mapped onto `screen`.
 * @param screen - CSS rectangle that displays `viewBox`.
 * @returns Axis-aligned world box corresponding to `rect`.
 */
export function acexCssRectToWcsBox(
  rect: AcExCssRect,
  viewBox: { minX: number; minY: number; maxX: number; maxY: number },
  screen: AcExCssRect
): { minX: number; minY: number; maxX: number; maxY: number } {
  const vx = Math.max(viewBox.maxX - viewBox.minX, Number.EPSILON)
  const vy = Math.max(viewBox.maxY - viewBox.minY, Number.EPSILON)
  return {
    minX: viewBox.minX + ((rect.x - screen.x) / screen.width) * vx,
    maxX: viewBox.minX + ((rect.x + rect.width - screen.x) / screen.width) * vx,
    maxY: viewBox.maxY - ((rect.y - screen.y) / screen.height) * vy,
    minY: viewBox.maxY - ((rect.y + rect.height - screen.y) / screen.height) * vy
  }
}
