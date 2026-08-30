import type { AcCmColor, AcDbDatabase, AcDbEntity, AcDbObjectId } from '@mlightcad/data-model'
import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  type AcApMeasurementValue,
  formatMeasurementValue
} from '../../util/AcApMeasurementUnits'
import {
  acapCloneMeasurementStyle,
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../../view'
import {
  acapScreenPxToWcs,
  acapSeedOverlaySizesFromWcs
} from '../overlay/AcApOverlayDrawUtil'
import {
  hitTestMeasurementGeometry,
  measurementGeometryBounds
} from './AcApMeasurementGeometry'
import { runMeasurementEdit } from './AcApMeasurementHistory'
import { serializeMeasurementStyle } from './AcApMeasurementSidecar'
import type {
  AcApMeasurementRecord,
  AcApMeasurementSidecarStyle
} from './AcApMeasurementTypes'

/** HTML transient layer for committed measurement overlays. */
export const MEASUREMENT_LAYER = 'measurement'

/** HTML transient layer for in-progress jig / live preview overlays. */
export const MEASUREMENT_LIVE_LAYER = 'measurement-live'

/** Session visibility for measurement overlays on the active layout. */
let measurementVisible = true

/** Whether measurement overlays are currently shown. */
export function isMeasurementVisible(): boolean {
  return measurementVisible
}

/** Restore the default (shown) session flag after a document open / close. */
export function resetMeasurementVisibility(): void {
  measurementVisible = true
}

/**
 * Show or hide committed measurement overlays on the active layout, plus live
 * jig overlays.
 */
export function setMeasurementVisible(
  view: AcTrView2d,
  visible: boolean
): void {
  measurementVisible = visible
  const layoutId = view.activeLayoutBtrId
  const ht = view.htmlTransientManager
  for (const group of ht.groupsOnLayer(MEASUREMENT_LAYER)) {
    if (group.layoutId == null || group.layoutId === layoutId) {
      group.setVisible(visible)
    }
  }
  ht.setVisible(visible, MEASUREMENT_LIVE_LAYER)
  view.isHtmlDirty = true
}

/**
 * Optional non-HTML resources attached to a measurement {@link AcTrHtmlGroup}.
 */
export interface AcApMeasurementGroupExtras {
  /**
   * @deprecated CAD transients are no longer used for measurements; kept empty
   * for backward-compatible call sites.
   */
  entityIds?: AcDbObjectId[]
  /**
   * @deprecated CAD entity refs are no longer used; style updates go through
   * {@link redraw}.
   */
  entities?: AcDbEntity[]
  /** Style used when the group was committed (and after later style edits). */
  style?: AcApMeasurementStyle
  /** Raw measured value used to refresh the badge when display units change. */
  value?: AcApMeasurementValue
  /** Serializable snapshot used by measurement import / export. */
  snapshot?: AcApMeasurementRecord
  /** Redraw canvas overlays after a style change (color / line weight). */
  redraw?: (style: AcApMeasurementStyle) => void
  /**
   * Removes non-HTML resources (viewChanged listeners).
   * HTML children and group-owned canvases are removed by the html
   * transient manager / group dispose.
   */
  dispose?: () => void
}

type MeasurementSelectionListener = () => void
type MeasurementListListener = () => void

const extrasById = new Map<string, AcApMeasurementGroupExtras>()
/**
 * Per-group extras retained across {@link AcTrHtmlTransientManager.detach} so
 * undo/redo can restore geometry snapshots when groups with the same id are
 * swapped during grip edits.
 */
const extrasByGroup = new WeakMap<AcTrHtmlGroup, AcApMeasurementGroupExtras>()
const stylesById = new Map<string, AcApMeasurementStyle>()
const selectionListeners = new Set<MeasurementSelectionListener>()
const listListeners = new Set<MeasurementListListener>()
let selectedMeasurementId: string | undefined

/** Style currently stored for a committed measurement group. */
export function getMeasurementStyle(
  id: string
): AcApMeasurementStyle | undefined {
  const style = stylesById.get(id)
  return style ? acapCloneMeasurementStyle(style) : undefined
}

/** Id of the currently selected measurement group, if any. */
export function getSelectedMeasurementId(): string | undefined {
  return selectedMeasurementId
}

/** Style of the currently selected measurement, if any. */
export function getActiveMeasurementStyle(): AcApMeasurementStyle | undefined {
  return selectedMeasurementId
    ? getMeasurementStyle(selectedMeasurementId)
    : undefined
}

/** Notify when the selected measurement group changes. */
export function subscribeMeasurementSelection(
  listener: MeasurementSelectionListener
): () => void {
  selectionListeners.add(listener)
  return () => {
    selectionListeners.delete(listener)
  }
}

function notifyMeasurementSelection(): void {
  for (const listener of selectionListeners) listener()
}

/** Notify when committed measurements are added, removed, restored, or filtered by layout. */
export function subscribeMeasurements(
  listener: MeasurementListListener
): () => void {
  listListeners.add(listener)
  return () => {
    listListeners.delete(listener)
  }
}

function notifyMeasurementsChanged(): void {
  for (const listener of listListeners) listener()
}

/**
 * Notify list subscribers that the active layout changed, so layout-filtered
 * views (the measurement palette) can re-query {@link listLayoutMeasurements}.
 */
export function notifyMeasurementLayoutChanged(): void {
  notifyMeasurementsChanged()
}

/**
 * Committed measurements on the active layout (records without `layoutId`
 * are treated as present on every layout).
 */
export function listLayoutMeasurements(
  view: AcTrView2d
): AcApMeasurementRecord[] {
  const layoutId = view.activeLayoutBtrId
  return collectMeasurementRecords(view).filter(
    record => record.layoutId == null || record.layoutId === layoutId
  )
}

/**
 * Formatted badge text for a committed measurement, or an empty string when
 * the value or drawing database is unavailable.
 */
export function getMeasurementValueText(
  id: string,
  db?: AcDbDatabase | null
): string {
  const extras = extrasById.get(id)
  if (!extras?.value || !db) return ''
  return formatMeasurementValue(db, extras.value)
}

/**
 * Select a measurement and zoom the view to its geometry.
 *
 * Point measurements (degenerate AABB) are padded so the camera can frame them.
 */
export function focusMeasurement(
  view: AcTrView2d,
  record: AcApMeasurementRecord
): void {
  const box = measurementGeometryBounds(record.geometry)
  if (!box) return
  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  if (!(width > 1e-8) && !(height > 1e-8)) {
    const pad = 1
    box.expandByPoint({ x: box.min.x - pad, y: box.min.y - pad })
    box.expandByPoint({ x: box.max.x + pad, y: box.max.y + pad })
  }
  view.zoomTo(box, 1.5)
  view.htmlTransientManager.selectGroup(record.id)
}

/**
 * Detach one committed measurement (undoable).
 */
export function removeMeasurement(view: AcTrView2d, id: string): void {
  if (!view.htmlTransientManager.getGroup(id)) return
  runMeasurementEdit(view, 'Delete Measurement', () => {
    view.htmlTransientManager.detach(id)
  })
  view.isHtmlDirty = true
}

function rememberStyle(id: string, style: AcApMeasurementStyle): void {
  stylesById.set(id, acapCloneMeasurementStyle(style))
}

/**
 * Apply a style patch to one measurement group (HTML badges/dots and canvases).
 * Does not record undo; wrap with {@link runMeasurementEdit} from UI.
 *
 * Color, line weight, and font size are independent: changing one does not
 * rewrite the others' world-space sizes from the current camera zoom.
 */
export function applyMeasurementStyle(
  view: AcTrView2d,
  group: AcTrHtmlGroup,
  patch: Partial<AcApMeasurementStyle>
): void {
  const prev = stylesById.get(group.id)
  const color = patch.color?.clone() ?? prev?.color.clone()
  if (!color) return
  const next: AcApMeasurementStyle = {
    color,
    lineWeight: patch.lineWeight ?? prev?.lineWeight ?? MEASUREMENT_LINE_WEIGHT,
    fontSize: patch.fontSize ?? prev?.fontSize ?? MEASUREMENT_FONT_SIZE
  }
  const fontSizeChanged =
    patch.fontSize != null &&
    (prev == null || patch.fontSize !== prev.fontSize)
  const lineWeightChanged =
    patch.lineWeight != null &&
    (prev == null || patch.lineWeight !== prev.lineWeight)

  rememberStyle(group.id, next)
  const extras = extrasById.get(group.id)
  if (extras) {
    extras.style = acapCloneMeasurementStyle(next)
    if (extras.snapshot) {
      const prevSnap = extras.snapshot.style
      const base = serializeMeasurementStyle(next)
      extras.snapshot = {
        ...extras.snapshot,
        style: {
          ...base,
          textHeightWcs: resolveUpdatedTextHeightWcs(
            view,
            next.fontSize,
            prev?.fontSize,
            prevSnap.textHeightWcs,
            fontSizeChanged
          ),
          strokeWidthWcs: resolveUpdatedStrokeWidthWcs(
            view,
            next.lineWeight,
            prev?.lineWeight,
            prevSnap.strokeWidthWcs,
            lineWeightChanged
          )
        }
      }
    }
  }

  if (fontSizeChanged || lineWeightChanged) {
    const snap = extrasById.get(group.id)?.snapshot?.style
    acapSeedOverlaySizesFromWcs(view, {
      textHeightWcs: snap?.textHeightWcs,
      strokeWidthWcs: snap?.strokeWidthWcs,
      fontSizePx: next.fontSize,
      strokeScreenPx: acapMeasurementCanvasLineWidth(next.lineWeight),
      elements: [...(group.children ?? [])],
      canvases: (group.canvases ?? []).map(c => c.canvas)
    })
  }

  paintMeasurementGroup(view, group, next)
}

/** Scale or recompute text height WCS when font size changes; otherwise keep. */
function resolveUpdatedTextHeightWcs(
  view: AcTrView2d,
  nextFontSize: number,
  prevFontSize: number | undefined,
  prevTextHeightWcs: number | undefined,
  fontSizeChanged: boolean
): number {
  if (
    fontSizeChanged &&
    prevTextHeightWcs != null &&
    prevTextHeightWcs > 0 &&
    prevFontSize != null &&
    prevFontSize > 0
  ) {
    return prevTextHeightWcs * (nextFontSize / prevFontSize)
  }
  if (fontSizeChanged || prevTextHeightWcs == null || !(prevTextHeightWcs > 0)) {
    return acapScreenPxToWcs(nextFontSize, view)
  }
  return prevTextHeightWcs
}

/** Scale or recompute stroke WCS when line weight changes; otherwise keep. */
function resolveUpdatedStrokeWidthWcs(
  view: AcTrView2d,
  nextLineWeight: AcApMeasurementStyle['lineWeight'],
  prevLineWeight: AcApMeasurementStyle['lineWeight'] | undefined,
  prevStrokeWidthWcs: number | undefined,
  lineWeightChanged: boolean
): number {
  const nextPx = acapMeasurementCanvasLineWidth(nextLineWeight)
  if (!(nextPx > 0)) return 0
  if (
    lineWeightChanged &&
    prevStrokeWidthWcs != null &&
    prevStrokeWidthWcs > 0 &&
    prevLineWeight != null
  ) {
    const prevPx = acapMeasurementCanvasLineWidth(prevLineWeight)
    if (prevPx > 0) return prevStrokeWidthWcs * (nextPx / prevPx)
  }
  if (
    lineWeightChanged ||
    prevStrokeWidthWcs == null ||
    !(prevStrokeWidthWcs > 0)
  ) {
    return acapScreenPxToWcs(nextPx, view)
  }
  return prevStrokeWidthWcs
}

/**
 * Apply a style patch to every selected measurement group (undoable).
 */
export function applyMeasurementStyleToSelection(
  view: AcTrView2d,
  patch: Partial<AcApMeasurementStyle>
): void {
  const groups = view.htmlTransientManager
    .getSelectedGroups()
    .filter(group => group.layer === MEASUREMENT_LAYER)
  if (groups.length === 0) return
  runMeasurementEdit(view, 'Measurement Style', () => {
    for (const group of groups) {
      applyMeasurementStyle(view, group, patch)
    }
  })
}

function paintMeasurementGroup(
  view: AcTrView2d,
  group: AcTrHtmlGroup,
  style: AcApMeasurementStyle
): void {
  for (const child of group.children) {
    const colorful = child as {
      setColor?: (color: AcCmColor) => void
      setFontSize?: (size: number) => void
    }
    colorful.setColor?.(style.color)
    colorful.setFontSize?.(style.fontSize)
  }

  const extras = extrasById.get(group.id)
  extras?.redraw?.(style)
  view.isHtmlDirty = true
}

/**
 * Reformat committed measurement badges using the effective measurement units.
 */
export function refreshMeasurementValueLabels(
  view: AcTrView2d,
  db: AcDbDatabase
): void {
  for (const group of view.htmlTransientManager.groupsOnLayer(MEASUREMENT_LAYER)) {
    const extras = extrasById.get(group.id)
    if (!extras?.value) continue
    const text = formatMeasurementValue(db, extras.value)
    for (const child of group.children) {
      const badge = child as { setText?: (next: string) => void }
      badge.setText?.(text)
    }
  }
  view.isHtmlDirty = true
}

/** Serializable snapshots of committed measurements currently on the view. */
export function collectMeasurementRecords(
  view: AcTrView2d
): AcApMeasurementRecord[] {
  const records: AcApMeasurementRecord[] = []
  for (const group of view.htmlTransientManager.groupsOnLayer(MEASUREMENT_LAYER)) {
    const extras = extrasById.get(group.id)
    if (!extras?.snapshot) continue
    const live = extras.style ?? stylesById.get(group.id)
    const snapStyle = extras.snapshot.style
    let style: AcApMeasurementSidecarStyle = snapStyle
    if (live) {
      // Keep live color / weights / fontSize, but preserve creation-time WCS
      // from the snapshot (do not recompute from the current zoom).
      const base = serializeMeasurementStyle(live)
      style = {
        ...base,
        textHeightWcs:
          snapStyle.textHeightWcs ?? acapScreenPxToWcs(base.fontSize, view),
        strokeWidthWcs:
          snapStyle.strokeWidthWcs ??
          acapScreenPxToWcs(
            acapMeasurementCanvasLineWidth(base.lineWeight),
            view
          )
      }
    }
    records.push({
      ...extras.snapshot,
      id: group.id,
      layoutId: group.layoutId,
      style
    })
  }
  return records
}

/** Drop style / extras maps (document open). Attached groups are left for view.clear(). */
export function resetMeasurementStyleState(): void {
  extrasById.clear()
  stylesById.clear()
  selectedMeasurementId = undefined
  notifyMeasurementSelection()
  notifyMeasurementsChanged()
}

/**
 * Re-bind extras for a group reattached by measurement undo/redo.
 * Call after {@link AcTrHtmlTransientManager.reattach}.
 */
export function restoreMeasurementGroupExtras(group: AcTrHtmlGroup): void {
  const extras = extrasByGroup.get(group)
  if (!extras) return
  extrasById.set(group.id, extras)
  if (extras.style) {
    rememberStyle(group.id, extras.style)
  }
  notifyMeasurementsChanged()
}

/**
 * Publishes a measurement {@link AcTrHtmlGroup} and wires measurement-specific
 * selection state.
 *
 * The group itself (children, canvases, click selection, Delete, layout
 * visibility) is handled by {@link AcTrHtmlTransientManager}.
 */
export function commitMeasurementGroup(
  view: AcTrView2d,
  group: AcTrHtmlGroup,
  extras?: AcApMeasurementGroupExtras
): void {
  const entityIds = extras?.entityIds ?? []
  const payload = extras ?? {}
  extrasById.set(group.id, payload)
  extrasByGroup.set(group, payload)
  if (extras?.style) {
    rememberStyle(group.id, extras.style)
  }

  const prevSelectedChanged = group.onSelectedChanged
  group.onSelectedChanged = (selected, g) => {
    prevSelectedChanged?.(selected, g)
    if (selected) {
      selectedMeasurementId = g.id
      notifyMeasurementSelection()
      if (entityIds.length > 0) view.highlight(entityIds)
    } else {
      if (selectedMeasurementId === g.id) {
        selectedMeasurementId = undefined
        notifyMeasurementSelection()
      }
      if (entityIds.length > 0) view.unhighlight(entityIds)
    }
  }

  const prevVisibleChanged = group.onVisibleChanged
  group.onVisibleChanged = (visible, g) => {
    prevVisibleChanged?.(visible, g)
    for (const objectId of entityIds) {
      view.setTransientEntityVisible(objectId, visible)
    }
  }

  const prevDispose = group.onDispose
  group.onDispose = () => {
    prevDispose?.()
    extrasById.delete(group.id)
    stylesById.delete(group.id)
    if (selectedMeasurementId === group.id) {
      selectedMeasurementId = undefined
      notifyMeasurementSelection()
    }
    if (entityIds.length > 0) {
      view.unhighlight(entityIds)
    }
    try {
      extras?.dispose?.()
    } catch {
      // Ignore dispose errors from domain cleanups.
    }
    notifyMeasurementsChanged()
  }

  runMeasurementEdit(view, 'Create Measurement', () => {
    view.htmlTransientManager.add(group)
  })
  if (
    !measurementVisible &&
    (group.layoutId == null || group.layoutId === view.activeLayoutBtrId)
  ) {
    group.setVisible(false)
  }
  view.isHtmlDirty = true
  notifyMeasurementsChanged()
}

/** Snapshot geometry for a committed measurement group, if available. */
export function getMeasurementGeometry(
  id: string
): AcApMeasurementRecord['geometry'] | undefined {
  return extrasById.get(id)?.snapshot?.geometry
}

/** Full sidecar snapshot for a committed measurement, if available. */
export function getMeasurementSnapshot(
  id: string
): AcApMeasurementRecord | undefined {
  const snap = extrasById.get(id)?.snapshot
  return snap ? { ...snap, geometry: snap.geometry } : undefined
}

/**
 * Pick a visible measurement group by clicking its drawn stroke / fill.
 *
 * @returns Group id when the canvas-space point is within `threshold` pixels.
 */
export function pickMeasurementAt(
  view: AcTrView2d,
  canvasX: number,
  canvasY: number,
  threshold: number
): string | undefined {
  if (!measurementVisible) return undefined
  const canvas = { x: canvasX, y: canvasY }
  const worldToScreen = (point: { x: number; y: number }) =>
    view.worldToScreen(point)
  const groups = view.htmlTransientManager.groupsOnLayer(MEASUREMENT_LAYER)
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    if (!group.visible) continue
    const geom = getMeasurementGeometry(group.id)
    if (!geom) continue
    if (hitTestMeasurementGeometry(geom, canvas, worldToScreen, threshold)) {
      return group.id
    }
  }
  return undefined
}
