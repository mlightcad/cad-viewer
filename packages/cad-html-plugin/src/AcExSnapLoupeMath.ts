/** Square loupe size in CSS pixels. */
export const ACEX_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACEX_SNAP_LOUPE_ZOOM = 3
/** Horizontal / no-prompt vertical offset of the loupe, in CSS pixels. */
export const ACEX_SNAP_LOUPE_INSET_PX = 8
/**
 * Gap between the bottom of `#mlcad-status-bar` and the top of the loupe,
 * in CSS pixels.
 */
export const ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX = 8
/**
 * Fallback vertical offset when the status bar is hidden / unmeasurable.
 * ≈ status top (8) + single-line height (28) + gap (8).
 */
export const ACEX_SNAP_LOUPE_TOP_INSET_PX =
  ACEX_SNAP_LOUPE_INSET_PX + 28 + ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX

/**
 * Resolves loupe placement below the live status / prompt bar.
 *
 * @param host - Canvas host that contains the loupe (and usually the status bar).
 * @param statusEl - Optional status bar element; defaults to `#mlcad-status-bar`.
 * @returns Loupe `x` / `y` / `size` in host-local CSS pixels.
 */
export function acexResolveLoupePlacement(
  host: HTMLElement,
  statusEl?: HTMLElement | null
): { x: number; y: number; size: number } {
  const x = ACEX_SNAP_LOUPE_INSET_PX
  const size = ACEX_SNAP_LOUPE_SIZE_PX
  const bar =
    statusEl !== undefined
      ? statusEl
      : (document.getElementById('mlcad-status-bar') as HTMLElement | null)
  if (!bar || bar.hidden || bar.offsetParent === null) {
    return { x, y: ACEX_SNAP_LOUPE_TOP_INSET_PX, size }
  }
  const hostRect = host.getBoundingClientRect()
  const barRect = bar.getBoundingClientRect()
  // Status bar may be a sibling under `#mlcad-canvas-host` or `#mlcad-root`.
  const barBottom = barRect.bottom - hostRect.top
  return {
    x,
    y: Math.max(
      ACEX_SNAP_LOUPE_INSET_PX,
      barBottom + ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX
    ),
    size
  }
}

/**
 * Maps a canvas-space delta (snap − finger) into loupe-local pixels.
 *
 * The loupe center corresponds to the finger sample; the snap glyph is
 * offset from that center by `delta * zoom`.
 *
 * @param dx - Canvas-space X from finger to snap (CSS pixels).
 * @param dy - Canvas-space Y from finger to snap (CSS pixels).
 * @param size - Loupe width/height in CSS pixels; defaults to
 *   {@link ACEX_SNAP_LOUPE_SIZE_PX}.
 * @param zoom - Magnification relative to the main view; defaults to
 *   {@link ACEX_SNAP_LOUPE_ZOOM}.
 * @returns Loupe-local coordinates with origin at the loupe top-left.
 */
export function acexLoupeLocalFromCanvasDelta(
  dx: number,
  dy: number,
  size: number = ACEX_SNAP_LOUPE_SIZE_PX,
  zoom: number = ACEX_SNAP_LOUPE_ZOOM
): { x: number; y: number } {
  return {
    x: size / 2 + dx * zoom,
    y: size / 2 + dy * zoom
  }
}
