/**
 * Computes the equal slot width used by stretch + wrap sub-toolbars.
 *
 * - One row that is not full (`buttonCount <= perRow`): divide the strip evenly
 *   among the buttons so nothing is left empty on the right.
 * - Multiple rows: full rows use `containerWidth / perRow`; a short last row
 *   reuses that same slot width and stays left-aligned.
 *
 * @param containerWidth - Strip CSS width in pixels.
 * @param buttonHeight - Measured button height (used for the portrait max width).
 * @param buttonCount - Number of buttons in the strip.
 * @returns Slot width and how many buttons fit in one full row.
 */
export function acuiComputeWrapPackSlot(
  containerWidth: number,
  buttonHeight: number,
  buttonCount: number = 0
): { perRow: number; slotWidth: number; preferredMaxWidth: number } {
  const preferredMaxWidth = Math.max(24, buttonHeight - 4)
  if (containerWidth <= 0) {
    return { perRow: 1, slotWidth: preferredMaxWidth, preferredMaxWidth }
  }
  const perRow = Math.max(1, Math.floor(containerWidth / preferredMaxWidth))
  const count = Math.max(0, buttonCount)
  // Single incomplete row: stretch buttons across the full strip.
  if (count > 0 && count <= perRow) {
    return {
      perRow,
      slotWidth: containerWidth / count,
      preferredMaxWidth
    }
  }
  return {
    perRow,
    slotWidth: containerWidth / perRow,
    preferredMaxWidth
  }
}
