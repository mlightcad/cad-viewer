/** Square loupe size in CSS pixels. */
export const ACEX_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACEX_SNAP_LOUPE_ZOOM = 3
/** Horizontal / vertical offset of the loupe from the canvas top-left. */
export const ACEX_SNAP_LOUPE_INSET_PX = 8
/**
 * @deprecated Session prompts live in the bottom panel; loupe stays at top inset.
 */
export const ACEX_SNAP_LOUPE_GAP_BELOW_STATUS_PX = 8
/**
 * @deprecated Prefer {@link ACEX_SNAP_LOUPE_INSET_PX}; kept for call-site stability.
 */
export const ACEX_SNAP_LOUPE_TOP_INSET_PX = ACEX_SNAP_LOUPE_INSET_PX

/**
 * Resolves loupe placement at the canvas top-left inset.
 *
 * Session prompts are in the bottom panel, so the loupe no longer sits below
 * `#mlcad-status-bar`.
 *
 * @param _host - Canvas host (unused; kept for call-site stability).
 * @param _statusEl - Unused; kept for call-site stability.
 * @returns Loupe `x` / `y` / `size` in host-local CSS pixels.
 */
export function acexResolveLoupePlacement(
  _host: HTMLElement,
  _statusEl?: HTMLElement | null
): { x: number; y: number; size: number } {
  return {
    x: ACEX_SNAP_LOUPE_INSET_PX,
    y: ACEX_SNAP_LOUPE_INSET_PX,
    size: ACEX_SNAP_LOUPE_SIZE_PX
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
