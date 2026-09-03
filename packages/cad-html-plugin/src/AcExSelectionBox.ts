import type { AcExExtents } from './AcExSnapshotTypes'

/** AutoCAD-style box selection semantics. */
export type AcExSelectionMode = 'window' | 'crossing'

/**
 * Whether an item AABB matches a selection box.
 *
 * Window requires full containment; crossing requires intersection.
 */
export function acExExtentsMatchBox(
  item: AcExExtents,
  box: AcExExtents,
  mode: AcExSelectionMode
): boolean {
  if (mode === 'window') {
    return (
      item.minX >= box.minX &&
      item.maxX <= box.maxX &&
      item.minY >= box.minY &&
      item.maxY <= box.maxY
    )
  }
  return !(
    item.maxX < box.minX ||
    item.minX > box.maxX ||
    item.maxY < box.minY ||
    item.minY > box.maxY
  )
}

/**
 * Window vs crossing from drag direction in client (or canvas) space.
 * Left-to-right = window; right-to-left = crossing.
 */
export function acExSelectionModeFromDrag(
  startX: number,
  endX: number
): AcExSelectionMode {
  return endX >= startX ? 'window' : 'crossing'
}
