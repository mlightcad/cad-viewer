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
  ACAP_OVERLAY_ARROW_SIZE_PX,
  acapScreenPxToWcs,
  acapSeedOverlaySizesFromWcs
} from '../overlay/AcApOverlayDrawUtil'
import {
  hitTestMeasurementGeometry,
  measurementFocusBox
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
 * Select a measurement and zoom the view to its geometry plus HTML overlays.
 *
 * Coordinate measurements include the badge (capsule) so the camera frames
 * the label instead of zooming onto the point. Zooming to a 1-unit pad around
 * the point would scale the WCS-sized capsule over the canvas and steal
 * pointer events.
 */
export function focusMeasurement(
  view: AcTrView2d,
  record: AcApMeasurementRecord
): void {
  const box = measurementFocusBox(
    record.geometry,
    collectMeasurementOverlayRects(view, record.id),
    (clientX, clientY) => {
      const canvas = view.viewportToCanvas({ x: clientX, y: clientY })
      return view.screenToWorld(canvas)
    }
  )
  if (!box) return
  view.zoomTo(box, 1.5)
  view.htmlTransientManager.selectGroup(record.id)
}

/** Badge / callout client rects; skip endpoint grips that sit on geometry. */
function collectMeasurementOverlayRects(
  view: AcTrView2d,
  id: string
): Array<{ left: number; top: number; right: number; bottom: number }> {
  const group = view.htmlTransientManager.getGroup(id)
  if (!group) return []
  const rects: Array<{
    left: number
    top: number
    right: number
    bottom: number
  }> = []
  for (const child of group.children) {
    const el = child.element
    if (
      el.classList.contains('ml-html-dot') ||
      el.classList.contains('ml-html-grip')
    ) {
      continue
    }
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 && rect.height <= 0) continue
    rects.push(rect)
  }
  return rects
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
 * Color and font size are independent: changing one does not rewrite the
 * other's world-space size from the current camera zoom. Overlay strokes stay
 * hairline ({@link MEASUREMENT_LINE_WEIGHT}); strokeWidthWcs is never written.
 */
export function applyMeasurementStyle(
  view: AcTrView2d,
  group: AcTrHtmlGroup,
  patch: Partial<
    Pick<AcApMeasurementStyle, 'color' | 'fontSize' | 'textHeightMode' | 'textHeightWcs'>
  >
): void {
  const prev = stylesById.get(group.id)
  const color = patch.color?.clone() ?? prev?.color.clone()
  if (!color) return
  const next: AcApMeasurementStyle = {
    color,
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: patch.fontSize ?? prev?.fontSize ?? MEASUREMENT_FONT_SIZE,
    textHeightMode: patch.textHeightMode ?? prev?.textHeightMode ?? 'adaptive',
    textHeightWcs:
      patch.textHeightWcs ??
      (patch.textHeightMode === 'custom' ? undefined : prev?.textHeightWcs)
  }
  if (next.textHeightMode === 'custom' && patch.textHeightWcs != null) {
    next.textHeightWcs = patch.textHeightWcs
  }
  const fontSizeChanged =
    (patch.fontSize != null &&
      (prev == null || patch.fontSize !== prev.fontSize)) ||
    (patch.textHeightWcs != null &&
      (prev == null || patch.textHeightWcs !== prev.textHeightWcs)) ||
    (patch.textHeightMode != null &&
      (prev == null || patch.textHeightMode !== prev.textHeightMode))

  rememberStyle(group.id, next)
  const extras = extrasById.get(group.id)
  if (extras) {
    extras.style = acapCloneMeasurementStyle(next)
    if (extras.snapshot) {
      const prevSnap = extras.snapshot.style
      const base = serializeMeasurementStyle(next)
      const textHeightWcs =
        next.textHeightMode === 'custom' &&
        next.textHeightWcs != null &&
        next.textHeightWcs > 0
          ? next.textHeightWcs
          : resolveUpdatedTextHeightWcs(
              view,
              next.fontSize,
              prev?.fontSize,
              prevSnap.textHeightWcs,
              fontSizeChanged
            )
      extras.snapshot = {
        ...extras.snapshot,
        style: {
          ...base,
          textHeightWcs,
          ...(prevSnap.arrowSizeWcs != null && prevSnap.arrowSizeWcs > 0
            ? { arrowSizeWcs: prevSnap.arrowSizeWcs }
            : {})
        }
      }
    }
  }

  if (fontSizeChanged) {
    const snap = extrasById.get(group.id)?.snapshot?.style
    acapSeedOverlaySizesFromWcs(view, {
      textHeightWcs: snap?.textHeightWcs,
      fontSizePx: next.fontSize,
      strokeScreenPx: acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT),
      elements: [...(group.children ?? [])],
      canvases: (group.canvases ?? []).map(c => c.canvas)
    })
  }

  paintMeasurementGroup(view, group, next)
}

/**
 * Scale or recompute text height WCS when font size changes; otherwise keep.
 */
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

/**
 * Apply a style patch to every selected measurement group (undoable).
 */
export function applyMeasurementStyleToSelection(
  view: AcTrView2d,
  patch: Partial<
    Pick<AcApMeasurementStyle, 'color' | 'fontSize' | 'textHeightMode' | 'textHeightWcs'>
  >
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
 * Notifies list subscribers so palettes refresh their cached value text.
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
  notifyMeasurementsChanged()
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
    let style: AcApMeasurementSidecarStyle
    if (live) {
      // Keep live color / fontSize, force hairline lineWeight, preserve
      // creation-time textHeightWcs / arrowSizeWcs from the snapshot. Never
      // export strokeWidthWcs.
      const base = serializeMeasurementStyle(live)
      const arrowSizeWcs =
        snapStyle.arrowSizeWcs != null && snapStyle.arrowSizeWcs > 0
          ? snapStyle.arrowSizeWcs
          : extras.snapshot.type === 'distance'
            ? acapScreenPxToWcs(ACAP_OVERLAY_ARROW_SIZE_PX, view)
            : undefined
      style = {
        ...base,
        lineWeight: MEASUREMENT_LINE_WEIGHT,
        textHeightWcs:
          snapStyle.textHeightWcs ?? acapScreenPxToWcs(base.fontSize, view),
        ...(arrowSizeWcs != null && arrowSizeWcs > 0 ? { arrowSizeWcs } : {})
      }
    } else {
      const { strokeWidthWcs: _omit, ...rest } = snapStyle
      style = { ...rest, lineWeight: MEASUREMENT_LINE_WEIGHT }
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
