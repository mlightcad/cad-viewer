/** Dataset key storing orthographic zoom when an overlay was first positioned. */
export const ACEX_OVERLAY_BASE_ZOOM = 'overlayBaseZoom'

/**
 * Scale factor for HTML measure/markup overlays relative to first layout.
 */
export function acExOverlayViewScale(zoom: number, el: HTMLElement): number {
  let base = Number(el.dataset[ACEX_OVERLAY_BASE_ZOOM])
  if (!Number.isFinite(base) || base === 0) {
    base = zoom
    el.dataset[ACEX_OVERLAY_BASE_ZOOM] = String(zoom)
  }
  return zoom / base
}

/** Clears the zoom anchor so the next layout re-bases view scale. */
export function acExResetOverlayViewScale(el: HTMLElement): void {
  delete el.dataset[ACEX_OVERLAY_BASE_ZOOM]
}

/** CSS transform prefix before optional view-synced `scale()`. */
export function acExOverlayTransformPrefix(el: HTMLElement): string {
  if (el.classList.contains('mlcad-measure-badge--coordinate')) {
    return 'translate(-50%, calc(-50% - 16px))'
  }
  if (el.classList.contains('mlcad-measure-live-label')) {
    return 'translate(-50%, -120%)'
  }
  return 'translate(-50%, -50%)'
}

/** Composes centering transform with optional view-synced scale. */
export function acExOverlayTransform(el: HTMLElement, scale: number): string {
  const prefix = acExOverlayTransformPrefix(el)
  if (scale === 1) return prefix
  return `${prefix} scale(${scale})`
}

/** Maps a base CSS stroke width to the current view-synced width. */
export function acExScaledCanvasLineWidth(
  baseLineWidth: number,
  canvas: HTMLCanvasElement,
  zoom: number
): number {
  return baseLineWidth * acExOverlayViewScale(zoom, canvas)
}

/**
 * Positions one WCS-anchored overlay in root-local coordinates and applies
 * view-synced scale when `zoom` is provided.
 */
export function acExPositionWcsOverlay(
  el: HTMLElement,
  screen: { x: number; y: number },
  rootRect: DOMRect,
  zoom: number
): void {
  el.style.left = `${screen.x - rootRect.left}px`
  el.style.top = `${screen.y - rootRect.top}px`
  const scale = acExOverlayViewScale(zoom, el)
  el.style.transform = acExOverlayTransform(el, scale)
}

/**
 * Positions a cursor-following overlay in root-local client coordinates.
 */
export function acExPositionClientOverlay(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  rootRect: DOMRect,
  zoom: number
): void {
  el.style.left = `${clientX - rootRect.left}px`
  el.style.top = `${clientY - rootRect.top}px`
  const scale = acExOverlayViewScale(zoom, el)
  el.style.transform = acExOverlayTransform(el, scale)
}
