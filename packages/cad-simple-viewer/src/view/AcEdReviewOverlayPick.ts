import { hitTestMarkupGeometry } from '../command/markup/AcApMarkupGeometry'
import { getMarkupStore } from '../command/markup/AcApMarkupStore'
import { pickMeasurementAt } from '../command/measure/AcApMeasurementStore'
import type { AcEdSelectionAction } from '../editor'
import type { AcTrView2d } from './AcTrView2d'

/** Pixel radius used when clicking markup / measurement strokes. */
export const REVIEW_OVERLAY_HIT_THRESHOLD_PX = 10

function pickMarkupAt(
  view: AcTrView2d,
  canvasX: number,
  canvasY: number,
  threshold: number
): string | undefined {
  const canvas = { x: canvasX, y: canvasY }
  const worldToScreen = (point: { x: number; y: number }) =>
    view.worldToScreen(point)
  const layoutId = view.activeLayoutBtrId
  const records = getMarkupStore().list()
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i]
    if (record.layoutId != null && record.layoutId !== layoutId) continue
    const group = view.htmlTransientManager.getGroup(record.id)
    if (!group?.visible) continue
    if (
      hitTestMarkupGeometry(record.geometry, canvas, worldToScreen, threshold)
    ) {
      return record.id
    }
  }
  return undefined
}

/**
 * Apply a click to one overlay group.
 *
 * @returns `true` when this click should consume the pick (skip CAD entities).
 *   `'remove'` / `'add'` only consume when selection actually changed, so a
 *   Shift-click on an unselected overlay can still reach CAD geometry.
 *   `'replace'` always consumes a hit overlay.
 */
function applyOverlaySelection(
  view: AcTrView2d,
  id: string,
  action: AcEdSelectionAction
): boolean {
  const ht = view.htmlTransientManager
  if (action === 'remove') {
    return ht.deselectGroup(id)
  }
  if (action === 'add') {
    return ht.selectGroup(id, false)
  }
  ht.selectGroup(id, true)
  return true
}

/**
 * Select a markup or measurement overlay under a canvas click on its
 * drawn stroke (CAD transient or canvas leader), not just HTML handles.
 *
 * @returns `true` when an overlay was hit and this click should not fall
 *   through to CAD entity picking.
 */
export function trySelectReviewOverlay(
  view: AcTrView2d,
  canvasX: number,
  canvasY: number,
  action: AcEdSelectionAction
): boolean {
  const threshold = Math.max(
    view.selectionBoxSize * 2,
    REVIEW_OVERLAY_HIT_THRESHOLD_PX
  )
  const markupId = pickMarkupAt(view, canvasX, canvasY, threshold)
  const measurementId = pickMeasurementAt(view, canvasX, canvasY, threshold)
  const id = markupId ?? measurementId
  if (!id) return false
  const consumed = applyOverlaySelection(view, id, action)
  if (consumed) view.isDirty = true
  return consumed
}
