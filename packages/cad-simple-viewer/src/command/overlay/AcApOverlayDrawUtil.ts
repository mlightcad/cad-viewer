/**
 * Shared canvas helpers for markup / measure overlay drawing.
 */

import type { AcEdBaseView } from '../../editor'
import type { AcTrView2d } from '../../view'

/** Dataset key storing orthographic zoom when an overlay canvas was first drawn. */
export const ACAP_OVERLAY_BASE_ZOOM = 'overlayBaseZoom'

/** Returns the active orthographic camera zoom, or `null` when unavailable. */
export function acapGetCameraZoom(view: AcEdBaseView): number | null {
  const zoom = (view as AcTrView2d).internalCamera?.zoom
  return typeof zoom === 'number' && zoom > 0 ? zoom : null
}

/**
 * Scale factor for one overlay canvas relative to the zoom at first paint.
 */
export function acapOverlayViewScale(
  anchor: HTMLElement,
  view: AcEdBaseView
): number {
  const zoom = acapGetCameraZoom(view)
  if (zoom == null) return 1
  let base = Number(anchor.dataset[ACAP_OVERLAY_BASE_ZOOM])
  if (!Number.isFinite(base) || base === 0) {
    base = zoom
    anchor.dataset[ACAP_OVERLAY_BASE_ZOOM] = String(zoom)
  }
  return zoom / base
}

/** Maps a base CSS stroke width to the current view-synced width. */
export function acapScaledOverlayLineWidth(
  baseLineWidth: number,
  anchor: HTMLElement,
  view: AcEdBaseView
): number {
  return baseLineWidth * acapOverlayViewScale(anchor, view)
}

/**
 * Fit a canvas to its container and return a 2D context cleared for this frame.
 *
 * Resizes CSS and buffer dimensions (honoring devicePixelRatio) only when they
 * change, then clears the viewport in CSS pixel space.
 *
 * @param canvas - Target canvas element owned by an overlay.
 * @param container - View container used for size measurement.
 * @returns A 2D context ready to draw, or `null` if unavailable.
 */
export function acapFitOverlayCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): CanvasRenderingContext2D | null {
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const cssWidth = `${rect.width}px`
  const cssHeight = `${rect.height}px`
  const bufferWidth = Math.max(1, Math.floor(rect.width * dpr))
  const bufferHeight = Math.max(1, Math.floor(rect.height * dpr))
  canvas.style.left = '0'
  canvas.style.top = '0'
  if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth
  if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight
  if (canvas.width !== bufferWidth) canvas.width = bufferWidth
  if (canvas.height !== bufferHeight) canvas.height = bufferHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  return ctx
}

/**
 * Draw a filled arrow head at `to`, pointing along `from` → `to`.
 *
 * @param ctx - Canvas 2D context (CSS pixel space).
 * @param from - Tail / direction reference in screen space.
 * @param to - Arrow tip in screen space.
 * @param color - CSS fill color.
 */
export function acapDrawOverlayArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = 12
  const left = {
    x: to.x - ux * size - uy * size * 0.45,
    y: to.y - uy * size + ux * size * 0.45
  }
  const right = {
    x: to.x - ux * size + uy * size * 0.45,
    y: to.y - uy * size - ux * size * 0.45
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(left.x, left.y)
  ctx.lineTo(right.x, right.y)
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw a leader segment, optionally with an arrow head at the tip.
 *
 * @param ctx - Canvas 2D context (CSS pixel space).
 * @param tip - Leader tip (arrow end when `withArrow` is true).
 * @param anchor - Bubble / opposite end of the leader.
 * @param color - CSS stroke / fill color.
 * @param withArrow - When `true`, draws an arrow head at `tip`.
 * @param lineWidth - Stroke width in CSS pixels.
 */
export function acapDrawOverlayLeader(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  anchor: { x: number; y: number },
  color: string,
  withArrow = true,
  lineWidth = 2,
  view: AcEdBaseView
): void {
  const strokeWidth = acapScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(anchor.x, anchor.y)
  ctx.stroke()
  if (withArrow) {
    acapDrawOverlayArrowHead(ctx, anchor, tip, color)
  }
}

/**
 * Draw a translucent highlight rectangle with stroke.
 *
 * @param ctx - Canvas 2D context (CSS pixel space).
 * @param a - One corner of the highlight AABB in screen space.
 * @param b - Opposite corner of the highlight AABB in screen space.
 * @param color - CSS fill / stroke color.
 * @param lineWidth - Outline stroke width in CSS pixels.
 */
export function acapDrawOverlayHighlight(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  color: string,
  lineWidth = 1.5,
  view: AcEdBaseView
): void {
  const strokeWidth = acapScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.28
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.strokeRect(x, y, w, h)
}
