/** Square loupe size in CSS pixels. */
export const ACED_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACED_SNAP_LOUPE_ZOOM = 3
/** Offset of the loupe from the canvas top-left. */
export const ACED_SNAP_LOUPE_INSET_PX = 8
/**
 * @deprecated Prompt is no longer a top bar; kept for re-export stability.
 */
export const ACED_SNAP_LOUPE_GAP_BELOW_PROMPT_PX = 8

/**
 * Resolves the loupe top-left in host-local CSS pixels.
 *
 * Session prompts live in the bottom panel, so the loupe stays at the top
 * inset whether or not session chrome is active.
 *
 * @param _host - View / canvas container (unused; kept for call-site stability).
 * @param _options - Layout hints (unused; kept for call-site stability).
 * @returns Loupe `x` / `y` / `size` in host-local CSS pixels.
 */
export function acedResolveLoupePlacement(
  _host: HTMLElement,
  _options: {
    usesSessionChrome: boolean
    promptSelector?: string
  }
): { x: number; y: number; size: number } {
  return {
    x: ACED_SNAP_LOUPE_INSET_PX,
    y: ACED_SNAP_LOUPE_INSET_PX,
    size: ACED_SNAP_LOUPE_SIZE_PX
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
 *   {@link ACED_SNAP_LOUPE_SIZE_PX}.
 * @param zoom - Magnification relative to the main view; defaults to
 *   {@link ACED_SNAP_LOUPE_ZOOM}.
 * @returns Loupe-local coordinates with origin at the loupe top-left.
 */
export function acedLoupeLocalFromCanvasDelta(
  dx: number,
  dy: number,
  size: number = ACED_SNAP_LOUPE_SIZE_PX,
  zoom: number = ACED_SNAP_LOUPE_ZOOM
): { x: number; y: number } {
  return {
    x: size / 2 + dx * zoom,
    y: size / 2 + dy * zoom
  }
}
