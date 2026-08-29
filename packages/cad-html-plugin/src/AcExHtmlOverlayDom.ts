/** Dataset key storing orthographic zoom when an overlay was first positioned. */
export const ACEX_OVERLAY_BASE_ZOOM = 'overlayBaseZoom'

/** Dataset key storing canvas stroke width in world units. */
export const ACEX_OVERLAY_STROKE_WCS = 'overlayStrokeWcs'

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

/** CSS px per one WCS unit along +X. */
export function acExPixelsPerWorldUnit(
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number {
  const a = wcsToScreen({ x: 0, y: 0 })
  const b = wcsToScreen({ x: 1, y: 0 })
  const ppu = Math.hypot(b.x - a.x, b.y - a.y)
  return ppu > 0 && Number.isFinite(ppu) ? ppu : 1
}

export function acExScreenPxToWcs(
  px: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number {
  return px / acExPixelsPerWorldUnit(wcsToScreen)
}

export function acExSeedOverlayStrokeWcs(
  canvas: HTMLElement,
  strokeWidthWcs: number
): void {
  if (!(strokeWidthWcs > 0) || !Number.isFinite(strokeWidthWcs)) return
  canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = String(strokeWidthWcs)
}

/**
 * View-synced canvas stroke. Prefer strokeWidthWcs; else convert baseLineWidth
 * to WCS on first paint and stash on the canvas.
 */
export function acExScaledCanvasLineWidth(
  baseLineWidth: number,
  canvas: HTMLCanvasElement,
  zoom: number,
  options?: {
    strokeWidthWcs?: number
    wcsToScreen?: (wcs: { x: number; y: number }) => { x: number; y: number }
  }
): number {
  if (options?.wcsToScreen) {
    const ppu = acExPixelsPerWorldUnit(options.wcsToScreen)
    let wcs =
      options.strokeWidthWcs != null && options.strokeWidthWcs > 0
        ? options.strokeWidthWcs
        : Number(canvas.dataset[ACEX_OVERLAY_STROKE_WCS])
    if (!Number.isFinite(wcs) || wcs <= 0) {
      wcs = baseLineWidth / ppu
      canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = String(wcs)
    } else if (options.strokeWidthWcs != null && options.strokeWidthWcs > 0) {
      canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = String(wcs)
    }
    return Math.max(0.5, wcs * ppu)
  }
  return baseLineWidth * acExOverlayViewScale(zoom, canvas)
}

/** Seed DOM baseZoom so CSS size matches WCS at current camera. */
export function acExBaseZoomFromWcsSize(
  screenPxAtCreate: number,
  sizeWcs: number,
  zoom: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number | null {
  const ppu = acExPixelsPerWorldUnit(wcsToScreen)
  if (!(zoom > 0) || !(screenPxAtCreate > 0) || !(sizeWcs > 0)) return null
  const base = (screenPxAtCreate * zoom) / (sizeWcs * ppu)
  return base > 0 && Number.isFinite(base) ? base : null
}

export function acExSeedOverlaySizesFromWcs(
  zoom: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number },
  options: {
    textHeightWcs?: number
    strokeWidthWcs?: number
    fontSizePx?: number
    strokeScreenPx?: number
    elements?: readonly HTMLElement[]
    canvases?: readonly HTMLElement[]
  }
): void {
  const {
    textHeightWcs,
    strokeWidthWcs,
    fontSizePx,
    elements,
    canvases
  } = options

  if (strokeWidthWcs != null && strokeWidthWcs > 0) {
    for (const canvas of canvases ?? []) {
      acExSeedOverlayStrokeWcs(canvas, strokeWidthWcs)
    }
  }

  if (
    strokeWidthWcs != null &&
    strokeWidthWcs > 0 &&
    options.strokeScreenPx != null &&
    options.strokeScreenPx > 0
  ) {
    const cloudWcs = (8 * strokeWidthWcs) / options.strokeScreenPx
    for (const canvas of canvases ?? []) {
      if (!canvas.dataset.overlayCloudWcs) {
        canvas.dataset.overlayCloudWcs = String(cloudWcs)
      }
    }
  }

  // Pair text screen/WCS axes only — never mix fontSize with strokeWidthWcs.
  if (
    !(fontSizePx != null && fontSizePx > 0) ||
    !(textHeightWcs != null && textHeightWcs > 0)
  ) {
    return
  }

  const baseZoom = acExBaseZoomFromWcsSize(
    fontSizePx,
    textHeightWcs,
    zoom,
    wcsToScreen
  )
  if (baseZoom == null) return
  for (const el of elements ?? []) {
    el.dataset[ACEX_OVERLAY_BASE_ZOOM] = String(baseZoom)
  }
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
