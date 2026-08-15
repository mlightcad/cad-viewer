import { AcGeBox2d } from '@mlightcad/data-model'

import {
  hitTestMarkupGeometry,
  markupGeometryBounds
} from '../command/markup/AcApMarkupGeometry'
import { getMarkupStore } from '../command/markup/AcApMarkupStore'
import { measurementGeometryBounds } from '../command/measure/AcApMeasurementGeometry'
import {
  getMeasurementGeometry,
  isMeasurementVisible,
  MEASUREMENT_LAYER,
  pickMeasurementAt
} from '../command/measure/AcApMeasurementStore'
import type { AcEdSelectionAction, AcEdSelectionMode } from '../editor'
import {
  type AcTrSpatialIndexBBox,
  isSpatialBoxFullyInside
} from '../spatialIndex/AcTrSpatialIndex'
import type { AcTrView2d } from './AcTrView2d'

/** Pixel radius used when clicking markup / measurement strokes. */
export const REVIEW_OVERLAY_HIT_THRESHOLD_PX = 10

function toSpatialBBox(box: AcGeBox2d): AcTrSpatialIndexBBox {
  return {
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y
  }
}

function boxesIntersect(
  a: AcTrSpatialIndexBBox,
  b: AcTrSpatialIndexBBox
): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}

function overlayMatchesBox(
  bounds: AcGeBox2d,
  selection: AcTrSpatialIndexBBox,
  mode: AcEdSelectionMode
): boolean {
  const item = toSpatialBBox(bounds)
  if (mode === 'window') {
    return isSpatialBoxFullyInside(item, selection)
  }
  return boxesIntersect(item, selection)
}

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
 * Collect markup / measurement group ids whose geometry AABB matches the
 * selection box (window = fully inside, crossing = intersects).
 */
export function collectReviewOverlayIdsByBox(
  view: AcTrView2d,
  box: AcGeBox2d,
  mode: AcEdSelectionMode
): string[] {
  const selection = toSpatialBBox(box)
  const layoutId = view.activeLayoutBtrId
  const ids: string[] = []

  for (const record of getMarkupStore().list()) {
    if (record.layoutId != null && record.layoutId !== layoutId) continue
    const group = view.htmlTransientManager.getGroup(record.id)
    if (!group?.visible) continue
    const bounds = markupGeometryBounds(record.geometry)
    if (!bounds) continue
    if (overlayMatchesBox(bounds, selection, mode)) {
      ids.push(record.id)
    }
  }

  if (!isMeasurementVisible()) return ids

  for (const group of view.htmlTransientManager.groupsOnLayer(
    MEASUREMENT_LAYER
  )) {
    if (!group.visible) continue
    if (group.layoutId != null && group.layoutId !== layoutId) continue
    const geometry = getMeasurementGeometry(group.id)
    if (!geometry) continue
    const bounds = measurementGeometryBounds(geometry)
    if (!bounds) continue
    if (overlayMatchesBox(bounds, selection, mode)) {
      ids.push(group.id)
    }
  }

  return ids
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

function applyOverlayBoxSelection(
  view: AcTrView2d,
  ids: string[],
  action: AcEdSelectionAction
): boolean {
  const ht = view.htmlTransientManager
  let changed = false

  if (action === 'replace') {
    const hadSelection = ht.hasSelection()
    ht.deselectAll()
    for (const id of ids) {
      if (ht.selectGroup(id, false)) changed = true
    }
    return hadSelection || changed
  }

  if (ids.length === 0) return false

  if (action === 'add') {
    for (const id of ids) {
      if (ht.selectGroup(id, false)) changed = true
    }
    return changed
  }

  for (const id of ids) {
    if (ht.deselectGroup(id)) changed = true
  }
  return changed
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
  if (consumed) view.isHtmlDirty = true
  return consumed
}

/**
 * Select markup / measurement overlays by window or crossing box.
 *
 * @returns `true` when HTML selection state changed.
 */
export function trySelectReviewOverlaysByBox(
  view: AcTrView2d,
  box: AcGeBox2d,
  mode: AcEdSelectionMode,
  action: AcEdSelectionAction
): boolean {
  const ids = collectReviewOverlayIdsByBox(view, box, mode)
  const changed = applyOverlayBoxSelection(view, ids, action)
  if (changed) view.isHtmlDirty = true
  return changed
}
