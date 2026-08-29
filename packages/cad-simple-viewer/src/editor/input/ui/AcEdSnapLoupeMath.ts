/** Square loupe size in CSS pixels. */
export const ACED_SNAP_LOUPE_SIZE_PX = 128
/** Magnification relative to the main view. */
export const ACED_SNAP_LOUPE_ZOOM = 3
/** Offset of the loupe from the canvas top-left, in CSS pixels. */
export const ACED_SNAP_LOUPE_INSET_PX = 8

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
