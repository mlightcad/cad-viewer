/** Dataset key storing orthographic zoom when an overlay was first positioned. */
export const ACEX_OVERLAY_BASE_ZOOM = 'overlayBaseZoom'

/** Dataset key storing canvas stroke width in world units. */
export const ACEX_OVERLAY_STROKE_WCS = 'overlayStrokeWcs'

/** Dataset key storing revision-cloud lobe diameter in world units. */
export const ACEX_OVERLAY_CLOUD_WCS = 'overlayCloudWcs'

/** Target screen diameter in CSS pixels for each revision-cloud lobe at creation. */
export const ACEX_OVERLAY_CLOUD_DIAMETER_PX = 8

/** Arrow-head length in CSS pixels at the overlay's creation-scale stroke. */
export const ACEX_OVERLAY_ARROW_SIZE_PX = 12

/** Dataset key storing overlay arrow-head length in world units. */
export const ACEX_OVERLAY_ARROW_WCS = 'overlayArrowWcs'

/**
 * Scale factor for HTML measure/markup overlays relative to first layout.
 */
export function acexOverlayViewScale(zoom: number, el: HTMLElement): number {
  let base = Number(el.dataset[ACEX_OVERLAY_BASE_ZOOM])
  if (!Number.isFinite(base) || base === 0) {
    base = zoom
    el.dataset[ACEX_OVERLAY_BASE_ZOOM] = String(zoom)
  }
  return zoom / base
}

/** Clears the zoom anchor so the next layout re-bases view scale. */
export function acexResetOverlayViewScale(el: HTMLElement): void {
  delete el.dataset[ACEX_OVERLAY_BASE_ZOOM]
}

/**
 * Seeds or clears view-synced scale for a live preview overlay from draw style.
 *
 * Custom WCS keeps world height while zooming; adaptive stays constant in px.
 */
export function acexSyncLiveOverlayTextHeight(
  zoom: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number },
  el: HTMLElement,
  style: {
    fontSize: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }
): void {
  const custom =
    style.textHeightMode === 'custom' &&
    style.textHeightWcs != null &&
    style.textHeightWcs > 0 &&
    style.fontSize > 0
  if (custom) {
    acexSeedOverlaySizesFromWcs(zoom, wcsToScreen, {
      textHeightWcs: style.textHeightWcs,
      fontSizePx: style.fontSize,
      elements: [el]
    })
    return
  }
  acexResetOverlayViewScale(el)
}

/** CSS transform prefix before optional view-synced `scale()`. */
export function acexOverlayTransformPrefix(el: HTMLElement): string {
  if (el.classList.contains('mlcad-measure-badge--coordinate')) {
    return 'translate(-50%, calc(-50% - 16px))'
  }
  return 'translate(-50%, -50%)'
}

/** Composes centering transform with optional view-synced scale. */
export function acexOverlayTransform(el: HTMLElement, scale: number): string {
  const prefix = acexOverlayTransformPrefix(el)
  if (scale === 1) return prefix
  return `${prefix} scale(${scale})`
}

/** CSS px per one WCS unit along +X. */
export function acexPixelsPerWorldUnit(
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number {
  const a = wcsToScreen({ x: 0, y: 0 })
  const b = wcsToScreen({ x: 1, y: 0 })
  const ppu = Math.hypot(b.x - a.x, b.y - a.y)
  return ppu > 0 && Number.isFinite(ppu) ? ppu : 1
}

export function acexScreenPxToWcs(
  px: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number {
  return px / acexPixelsPerWorldUnit(wcsToScreen)
}

export function acexSeedOverlayStrokeWcs(
  canvas: HTMLElement,
  strokeWidthWcs: number
): void {
  if (!(strokeWidthWcs > 0) || !Number.isFinite(strokeWidthWcs)) return
  canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = String(strokeWidthWcs)
}

export function acexSeedOverlayArrowWcs(
  canvas: HTMLElement,
  arrowSizeWcs: number
): void {
  if (!(arrowSizeWcs > 0) || !Number.isFinite(arrowSizeWcs)) return
  canvas.dataset[ACEX_OVERLAY_ARROW_WCS] = String(arrowSizeWcs)
}

/**
 * View-synced canvas stroke. Prefer strokeWidthWcs; else convert baseLineWidth
 * to WCS on first paint and stash on the canvas.
 */
export function acexScaledCanvasLineWidth(
  baseLineWidth: number,
  canvas: HTMLCanvasElement,
  zoom: number,
  options?: {
    strokeWidthWcs?: number
    wcsToScreen?: (wcs: { x: number; y: number }) => { x: number; y: number }
  }
): number {
  if (!(baseLineWidth > 0)) {
    delete canvas.dataset[ACEX_OVERLAY_STROKE_WCS]
    return 1
  }
  if (options?.wcsToScreen) {
    const ppu = acexPixelsPerWorldUnit(options.wcsToScreen)
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
  return baseLineWidth * acexOverlayViewScale(zoom, canvas)
}

/**
 * Arrow-head length in CSS pixels that stays a fixed world size.
 *
 * Used by committed distance measurements and arrow markups. Seeds
 * {@link ACEX_OVERLAY_ARROW_SIZE_PX} as WCS on first paint (the size shown
 * during the jig) unless `arrowSizeWcs` is provided. Live previews should use
 * `acexOverlayArrowSize` so the head stays a constant screen size
 * while the user zooms during placement.
 */
export function acexScaledOverlayArrowSize(
  canvas: HTMLCanvasElement,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number },
  arrowSizeWcs?: number
): number {
  const ppu = acexPixelsPerWorldUnit(wcsToScreen)
  let wcs =
    arrowSizeWcs != null && arrowSizeWcs > 0
      ? arrowSizeWcs
      : Number(canvas.dataset[ACEX_OVERLAY_ARROW_WCS])
  if (!Number.isFinite(wcs) || wcs <= 0) {
    wcs = ACEX_OVERLAY_ARROW_SIZE_PX / ppu
    canvas.dataset[ACEX_OVERLAY_ARROW_WCS] = String(wcs)
  } else if (arrowSizeWcs != null && arrowSizeWcs > 0) {
    canvas.dataset[ACEX_OVERLAY_ARROW_WCS] = String(wcs)
  }
  return Math.max(0.5, wcs * ppu)
}

/** Seed DOM baseZoom so CSS size matches WCS at current camera. */
export function acexBaseZoomFromWcsSize(
  screenPxAtCreate: number,
  sizeWcs: number,
  zoom: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): number | null {
  const ppu = acexPixelsPerWorldUnit(wcsToScreen)
  if (!(zoom > 0) || !(screenPxAtCreate > 0) || !(sizeWcs > 0)) return null
  const base = (screenPxAtCreate * zoom) / (sizeWcs * ppu)
  return base > 0 && Number.isFinite(base) ? base : null
}

export function acexSeedOverlaySizesFromWcs(
  zoom: number,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number },
  options: {
    textHeightWcs?: number
    strokeWidthWcs?: number
    arrowSizeWcs?: number
    fontSizePx?: number
    strokeScreenPx?: number
    elements?: readonly HTMLElement[]
    canvases?: readonly HTMLElement[]
  }
): void {
  const { textHeightWcs, strokeWidthWcs, fontSizePx, elements, canvases } =
    options

  if (strokeWidthWcs != null && strokeWidthWcs > 0) {
    for (const canvas of canvases ?? []) {
      acexSeedOverlayStrokeWcs(canvas, strokeWidthWcs)
    }
  } else if (options.strokeScreenPx === 0) {
    for (const canvas of canvases ?? []) {
      delete canvas.dataset[ACEX_OVERLAY_STROKE_WCS]
    }
  }

  if (options.arrowSizeWcs != null && options.arrowSizeWcs > 0) {
    for (const canvas of canvases ?? []) {
      acexSeedOverlayArrowWcs(canvas, options.arrowSizeWcs)
    }
  }

  if (
    strokeWidthWcs != null &&
    strokeWidthWcs > 0 &&
    options.strokeScreenPx != null &&
    options.strokeScreenPx > 0
  ) {
    const cloudWcs =
      (ACEX_OVERLAY_CLOUD_DIAMETER_PX * strokeWidthWcs) / options.strokeScreenPx
    for (const canvas of canvases ?? []) {
      canvas.dataset[ACEX_OVERLAY_CLOUD_WCS] = String(cloudWcs)
    }
  }

  // Pair text screen/WCS axes only — never mix fontSize with strokeWidthWcs.
  if (
    !(fontSizePx != null && fontSizePx > 0) ||
    !(textHeightWcs != null && textHeightWcs > 0)
  ) {
    return
  }

  const baseZoom = acexBaseZoomFromWcsSize(
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
export function acexPositionWcsOverlay(
  el: HTMLElement,
  screen: { x: number; y: number },
  rootRect: DOMRect,
  zoom: number
): void {
  el.style.left = `${screen.x - rootRect.left}px`
  el.style.top = `${screen.y - rootRect.top}px`
  const scale = acexOverlayViewScale(zoom, el)
  el.style.transform = acexOverlayTransform(el, scale)
}

/**
 * Positions a cursor-following overlay in root-local client coordinates.
 */
export function acexPositionClientOverlay(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  rootRect: DOMRect,
  zoom: number
): void {
  el.style.left = `${clientX - rootRect.left}px`
  el.style.top = `${clientY - rootRect.top}px`
  const scale = acexOverlayViewScale(zoom, el)
  el.style.transform = acexOverlayTransform(el, scale)
}
