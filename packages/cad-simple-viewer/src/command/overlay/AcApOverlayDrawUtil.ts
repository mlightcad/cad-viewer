/**
 * Shared canvas helpers for markup / measure overlay drawing.
 */

import type { AcTrHtmlElement } from '@mlightcad/three-renderer'

import type { AcEdBaseView } from '../../editor'
import type { AcTrView2d } from '../../view'

/** Dataset key storing stroke width in world units for view-synced canvas pens. */
export const ACAP_OVERLAY_STROKE_WCS = 'overlayStrokeWcs'

/** Dataset key storing revision-cloud lobe diameter in world units. */
export const ACAP_OVERLAY_CLOUD_WCS = 'overlayCloudWcs'

/** Target screen diameter in CSS pixels for each revision-cloud lobe at creation. */
export const ACAP_OVERLAY_CLOUD_DIAMETER_PX = 8

/** Returns the active orthographic camera zoom, or `null` when unavailable. */
export function acapGetCameraZoom(view: AcEdBaseView): number | null {
  const zoom = (view as AcTrView2d).internalCamera?.zoom
  return typeof zoom === 'number' && zoom > 0 ? zoom : null
}

/**
 * CSS pixels per one world-space unit along +X (from {@link AcEdBaseView.worldToScreen}).
 */
export function acapPixelsPerWorldUnit(view: AcEdBaseView): number {
  const a = view.worldToScreen({ x: 0, y: 0 })
  const b = view.worldToScreen({ x: 1, y: 0 })
  const ppu = Math.hypot(b.x - a.x, b.y - a.y)
  return ppu > 0 && Number.isFinite(ppu) ? ppu : 1
}

/** Converts a screen-space size in CSS pixels to world units. */
export function acapScreenPxToWcs(px: number, view: AcEdBaseView): number {
  return px / acapPixelsPerWorldUnit(view)
}

/** Converts a world-space size to CSS pixels at the current view scale. */
export function acapWcsToScreenPx(wcs: number, view: AcEdBaseView): number {
  return wcs * acapPixelsPerWorldUnit(view)
}

/** Pre-seeds a canvas stroke width in world units (import / first layout). */
export function acapSeedOverlayStrokeWcs(
  anchor: HTMLElement,
  strokeWidthWcs: number
): void {
  if (!(strokeWidthWcs > 0) || !Number.isFinite(strokeWidthWcs)) return
  anchor.dataset[ACAP_OVERLAY_STROKE_WCS] = String(strokeWidthWcs)
}

/** Pre-seeds overlay arrow-head length in world units (import / first layout). */
export function acapSeedOverlayArrowWcs(
  anchor: HTMLElement,
  arrowSizeWcs: number
): void {
  if (!(arrowSizeWcs > 0) || !Number.isFinite(arrowSizeWcs)) return
  anchor.dataset[ACAP_OVERLAY_ARROW_WCS] = String(arrowSizeWcs)
}

/**
 * View-synced canvas stroke width.
 *
 * Prefer an explicit world-space width; otherwise use a seeded dataset value,
 * else convert `baseLineWidth` to WCS on first paint and keep that pen size as
 * the camera zooms. Callers that re-seed after style edits should omit the
 * explicit WCS argument so the dataset wins.
 *
 * A non-positive `baseLineWidth` is hairline: always 1 CSS pixel, with any
 * stored WCS width cleared.
 */
export function acapScaledOverlayLineWidth(
  baseLineWidth: number,
  anchor: HTMLElement,
  view: AcEdBaseView,
  strokeWidthWcs?: number
): number {
  if (!(baseLineWidth > 0)) {
    delete anchor.dataset[ACAP_OVERLAY_STROKE_WCS]
    return 1
  }
  const ppu = acapPixelsPerWorldUnit(view)
  let wcs =
    strokeWidthWcs != null && strokeWidthWcs > 0
      ? strokeWidthWcs
      : Number(anchor.dataset[ACAP_OVERLAY_STROKE_WCS])
  if (!Number.isFinite(wcs) || wcs <= 0) {
    wcs = baseLineWidth / ppu
    anchor.dataset[ACAP_OVERLAY_STROKE_WCS] = String(wcs)
  } else if (
    strokeWidthWcs != null &&
    strokeWidthWcs > 0 &&
    anchor.dataset[ACAP_OVERLAY_STROKE_WCS] !== String(wcs)
  ) {
    anchor.dataset[ACAP_OVERLAY_STROKE_WCS] = String(wcs)
  }
  return Math.max(0.5, wcs * ppu)
}

/** Arrow-head length in CSS pixels at the overlay's creation-scale stroke. */
export const ACAP_OVERLAY_ARROW_SIZE_PX = 12

/** Dataset key storing overlay arrow-head length in world units. */
export const ACAP_OVERLAY_ARROW_WCS = 'overlayArrowWcs'

/**
 * Screen length of an overlay arrow head, tracking the same WCS scale as the stroke.
 *
 * Hairline overlays (`baseLineWidth <= 0`) keep a constant
 * {@link ACAP_OVERLAY_ARROW_SIZE_PX}. Use this during jig / live preview so
 * the head stays a fixed screen size while the user zooms. After commit, use
 * {@link acapScaledOverlayArrowSize} to freeze that size in world units.
 *
 * @param scaledLineWidth - Stroke width already converted to the current view.
 * @param baseLineWidth - CSS stroke used when the overlay was authored (default `2`).
 */
export function acapOverlayArrowSize(
  scaledLineWidth: number,
  baseLineWidth = 2
): number {
  const base =
    baseLineWidth > 0 && Number.isFinite(baseLineWidth) ? baseLineWidth : 1
  return Math.max(1, scaledLineWidth * (ACAP_OVERLAY_ARROW_SIZE_PX / base))
}

/**
 * Arrow-head length in CSS pixels that stays a fixed world size.
 *
 * Used by committed distance measurements and arrow markups. Seeds
 * {@link ACAP_OVERLAY_ARROW_SIZE_PX} as WCS on first paint (the size shown
 * during the jig) unless `arrowSizeWcs` is provided.
 */
export function acapScaledOverlayArrowSize(
  canvas: HTMLElement,
  view: AcEdBaseView,
  arrowSizeWcs?: number
): number {
  const ppu = acapPixelsPerWorldUnit(view)
  let wcs =
    arrowSizeWcs != null && arrowSizeWcs > 0
      ? arrowSizeWcs
      : Number(canvas.dataset[ACAP_OVERLAY_ARROW_WCS])
  if (!Number.isFinite(wcs) || wcs <= 0) {
    wcs = ACAP_OVERLAY_ARROW_SIZE_PX / ppu
    canvas.dataset[ACAP_OVERLAY_ARROW_WCS] = String(wcs)
  } else if (arrowSizeWcs != null && arrowSizeWcs > 0) {
    canvas.dataset[ACAP_OVERLAY_ARROW_WCS] = String(wcs)
  }
  return Math.max(0.5, wcs * ppu)
}

/**
 * Screen dash pattern that stays proportional to the current stroke width.
 */
export function acapOverlayDash(
  scaledLineWidth: number,
  baseLineWidth = 2
): number[] {
  const base =
    baseLineWidth > 0 && Number.isFinite(baseLineWidth) ? baseLineWidth : 1
  const s = scaledLineWidth / base
  return [8 * s, 5 * s]
}

/**
 * Orthographic `baseZoom` that makes a fixed CSS size match a world-space size
 * at the current view (for {@link AcTrHtmlElement.scaleWithView}).
 */
export function acapBaseZoomFromWcsSize(
  screenPxAtCreate: number,
  sizeWcs: number,
  view: AcEdBaseView
): number | null {
  const zoom = acapGetCameraZoom(view)
  const ppu = acapPixelsPerWorldUnit(view)
  if (zoom == null || !(screenPxAtCreate > 0) || !(sizeWcs > 0)) return null
  const base = (screenPxAtCreate * zoom) / (sizeWcs * ppu)
  return base > 0 && Number.isFinite(base) ? base : null
}

/**
 * Seeds HTML overlays and canvases from sidecar world-space sizes so import
 * matches creation scale regardless of the current camera zoom.
 */
export function acapSeedOverlaySizesFromWcs(
  view: AcEdBaseView,
  options: {
    textHeightWcs?: number
    strokeWidthWcs?: number
    arrowSizeWcs?: number
    /** CSS font size used when the overlay was authored (badge / callout). */
    fontSizePx?: number
    /** Screen stroke width used when authored (from CAD line weight). */
    strokeScreenPx?: number
    elements?: readonly AcTrHtmlElement[]
    canvases?: readonly HTMLElement[]
  }
): void {
  const { textHeightWcs, strokeWidthWcs, fontSizePx, elements, canvases } =
    options

  if (strokeWidthWcs != null && strokeWidthWcs > 0) {
    for (const canvas of canvases ?? []) {
      acapSeedOverlayStrokeWcs(canvas, strokeWidthWcs)
    }
  } else if (options.strokeScreenPx === 0) {
    for (const canvas of canvases ?? []) {
      delete canvas.dataset[ACAP_OVERLAY_STROKE_WCS]
    }
  }

  if (options.arrowSizeWcs != null && options.arrowSizeWcs > 0) {
    for (const canvas of canvases ?? []) {
      acapSeedOverlayArrowWcs(canvas, options.arrowSizeWcs)
    }
  }

  if (
    strokeWidthWcs != null &&
    strokeWidthWcs > 0 &&
    options.strokeScreenPx != null &&
    options.strokeScreenPx > 0
  ) {
    const cloudWcs =
      (ACAP_OVERLAY_CLOUD_DIAMETER_PX * strokeWidthWcs) / options.strokeScreenPx
    for (const canvas of canvases ?? []) {
      canvas.dataset[ACAP_OVERLAY_CLOUD_WCS] = String(cloudWcs)
    }
  }

  // Pair text screen/WCS axes only — never mix fontSize with strokeWidthWcs.
  if (
    !(fontSizePx != null && fontSizePx > 0) ||
    !(textHeightWcs != null && textHeightWcs > 0)
  ) {
    return
  }

  const baseZoom = acapBaseZoomFromWcsSize(fontSizePx, textHeightWcs, view)
  if (baseZoom == null) return
  for (const el of elements ?? []) {
    if (el.scaleWithView) el.baseZoom = baseZoom
  }
}

/**
 * Keeps live draw-preview overlays sized for the active text-height mode.
 *
 * - `'custom'`: seed {@link AcTrHtmlElement.baseZoom} from WCS so capsules
 *   scale with camera zoom during drawing.
 * - `'adaptive'` (or missing WCS): disable view sync so size stays constant
 *   in screen pixels while drawing.
 */
export function acapSyncLiveOverlayTextHeight(
  view: AcEdBaseView,
  elements: readonly AcTrHtmlElement[],
  style: {
    fontSize?: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }
): void {
  const fontSize =
    style.fontSize != null && style.fontSize > 0 ? style.fontSize : 0
  const custom =
    style.textHeightMode === 'custom' &&
    style.textHeightWcs != null &&
    style.textHeightWcs > 0 &&
    fontSize > 0
  if (custom) {
    for (const el of elements) {
      el.scaleWithView = true
    }
    acapSeedOverlaySizesFromWcs(view, {
      textHeightWcs: style.textHeightWcs,
      fontSizePx: fontSize,
      elements
    })
    return
  }
  for (const el of elements) {
    el.scaleWithView = false
    el.baseZoom = undefined
  }
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
 * Fit a canvas to the view's drawing surface (not the outer container).
 *
 * Live measure overlays must use this when stroking with
 * {@link AcEdBaseView.worldToScreen}: those coordinates are canvas-local,
 * while the view container can include chrome around the WebGL canvas.
 * Positions the overlay with {@link AcEdBaseView.canvasToContainer} so
 * confirmed segments stay aligned with CSS2D badges.
 *
 * @param canvas - Target canvas element owned by an overlay.
 * @param view - View whose canvas bounds and container offset are used.
 * @returns A 2D context ready to draw, or `null` if unavailable.
 */
export function acapFitOverlayCanvasToView(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView
): CanvasRenderingContext2D | null {
  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)
  const origin = view.canvasToContainer({ x: 0, y: 0 })
  canvas.style.left = `${origin.x}px`
  canvas.style.top = `${origin.y}px`
  const cssWidth = `${w}px`
  const cssHeight = `${h}px`
  if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth
  if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight
  const bufferWidth = Math.max(1, Math.floor(w * dpr))
  const bufferHeight = Math.max(1, Math.floor(h * dpr))
  if (canvas.width !== bufferWidth) canvas.width = bufferWidth
  if (canvas.height !== bufferHeight) canvas.height = bufferHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  return ctx
}

/**
 * Draw a filled arrow head at `to`, pointing along `from` → `to`.
 *
 * @param ctx - Canvas 2D context (CSS pixel space).
 * @param from - Tail / direction reference in screen space.
 * @param to - Arrow tip in screen space.
 * @param color - CSS fill color.
 * @param sizePx - Arrow length in CSS pixels (view-scaled by the caller).
 */
export function acapDrawOverlayArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  sizePx = ACAP_OVERLAY_ARROW_SIZE_PX
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = sizePx
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
  view: AcEdBaseView,
  strokeWidthWcs?: number,
  arrowSizeWcs?: number
): void {
  const strokeWidth = acapScaledOverlayLineWidth(
    lineWidth,
    ctx.canvas,
    view,
    strokeWidthWcs
  )
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(anchor.x, anchor.y)
  ctx.stroke()
  if (withArrow) {
    acapDrawOverlayArrowHead(
      ctx,
      anchor,
      tip,
      color,
      acapScaledOverlayArrowSize(ctx.canvas, view, arrowSizeWcs)
    )
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
  view: AcEdBaseView,
  strokeWidthWcs?: number
): void {
  const strokeWidth = acapScaledOverlayLineWidth(
    lineWidth,
    ctx.canvas,
    view,
    strokeWidthWcs
  )
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
