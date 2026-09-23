import type { AcDbDatabase } from '@mlightcad/data-model'

import type { AcExExtents } from './AcExSnapshotTypes'

/**
 * Default canvas aspect used when capturing AutoCAD's saved model-space
 * VPORT without a live viewer size (CLI / headless snapshot builds).
 */
const DEFAULT_CANVAS_ASPECT = 16 / 9

/**
 * Captures AutoCAD's saved view for one layout as offline-viewer extents.
 *
 * - Model space: VPORT `*ACTIVE` via {@link AcDbViewportTable.getActiveVportBox}.
 * - Paper space: layout {@link AcDbLayout.limits} (LIMMIN / LIMMAX).
 *
 * @param database - Open drawing database.
 * @param layoutBtrId - Block-table-record id of the layout.
 * @param isModelSpace - Whether the layout is model space.
 * @param canvasAspectRatio - Width/height used to resolve the VPORT box.
 * @returns Saved-view extents, or `undefined` when missing / implausible.
 */
export function captureAcExSavedViewExtents(
  database: AcDbDatabase,
  layoutBtrId: string,
  isModelSpace: boolean,
  canvasAspectRatio: number = DEFAULT_CANVAS_ASPECT
): AcExExtents | undefined {
  const aspect =
    Number.isFinite(canvasAspectRatio) && canvasAspectRatio > 0
      ? canvasAspectRatio
      : DEFAULT_CANVAS_ASPECT

  if (isModelSpace) {
    const box = database.tables?.viewportTable?.getActiveVportBox?.(aspect)
    return extentsFromBox2d(box)
  }

  const layoutTable = database.objects?.layout
  if (!layoutTable?.newIterator) {
    return undefined
  }
  for (const layout of layoutTable.newIterator()) {
    if (layout.blockTableRecordId !== layoutBtrId) {
      continue
    }
    return extentsFromBox2d(layout.limits)
  }
  return undefined
}

function extentsFromBox2d(box: {
  min: { x: number; y: number }
  max: { x: number; y: number }
  isEmpty?: () => boolean
} | null | undefined): AcExExtents | undefined {
  if (!box) return undefined
  if (typeof box.isEmpty === 'function' && box.isEmpty()) return undefined
  const minX = box.min.x
  const minY = box.min.y
  const maxX = box.max.x
  const maxY = box.max.y
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    maxX - minX <= 0 ||
    maxY - minY <= 0
  ) {
    return undefined
  }
  return { minX, minY, maxX, maxY }
}
