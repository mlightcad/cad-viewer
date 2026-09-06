/**
 * Measurement tools for the offline HTML viewer (distance, continuous, angle, arc, area, coordinate).
 *
 * @module acexMeasurement
 * @packageDocumentation
 */

import { AcGeCircArc2d, AcGeMathUtil } from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcExCommandSessionUiState } from './AcExCommandSessionPanel'
import { AcExConfirmedPointMarks } from './AcExConfirmedPointMarks'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { AcExHtmlIcons } from './AcExHtmlIcons'
import {
  ACEX_OVERLAY_ARROW_SIZE_PX,
  acexPixelsPerWorldUnit,
  acexPositionWcsOverlay,
  acexScaledCanvasLineWidth,
  acexScaledOverlayArrowSize,
  acexScreenPxToWcs,
  acexSeedOverlaySizesFromWcs,
  acexSyncLiveOverlayTextHeight
} from './AcExHtmlOverlayDom'
import {
  acexDrawMarkupArrowHead,
  acexExpandExtentsByClientRects,
  acexOverlayArrowSize
} from './AcExMarkupGeometry'
import { acexBindMarkupPointerDrag } from './AcExMarkupGripDrag'
import {
  ACEX_MEASUREMENT_FONT_SIZE,
  ACEX_MEASUREMENT_LINE_WEIGHT,
  acexMeasureCanvasLineWidth,
  acexMeasurementSidecarFileName,
  parseAcExMeasurementSidecar,
  stringifyAcExMeasurementSidecar
} from './AcExMeasurementSidecar'
import type {
  AcExMeasurementGeometry,
  AcExMeasurementRecord,
  AcExMeasurementSidecarFile,
  AcExMeasurementSidecarStyle,
  AcExMeasurementType
} from './AcExMeasurementTypes'
import {
  type AcExMeasureQuantity,
  type AcExMeasureQuantityEntry,
  sumMeasureQuantities
} from './AcExMeasureTotals'
import {
  type AcExTrackingOptions,
  constrainToAcExTracking
} from './AcExMeasureTracking'
import type { AcExOsnapPoint } from './AcExOsnap'
import { acexIsOverlayGrip, acexOverlayGripClassName } from './AcExOverlayGrip'
import { acexExtentsMatchBox, type AcExSelectionMode } from './AcExSelectionBox'
import type { AcExSessionHistory } from './AcExSessionHistory'
import type { AcExExtents } from './AcExSnapshotTypes'

/**
 * THREE/WebGL color for measurement overlays (lines, preview rubber-band).
 * Matches `--mlcad-accent` in the offline HTML shell CSS.
 */
export const ACEX_MEASURE_COLOR = 0x08e8de

/** Highlight color when a committed measurement is selected (CSS glow only). */
export const ACEX_MEASURE_SELECT_COLOR = 0xffd54f

/** CSS color string used by 2D canvas measurement overlays. */
function measureColorToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

/** Semi-transparent fill derived from a measure accent hex color. */
function measureColorToFill(hex: number): string {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r}, ${g}, ${b}, 0.2)`
}

/** Screen-pixel tolerance for picking a committed measurement. */
const MEASURE_HIT_THRESHOLD_PX = 10

/**
 * Active measurement tool selected from the toolbar.
 *
 * - `distance` — two-point linear distance.
 * - `continuous` — chained linear distances (successive vertices until Enter/Esc).
 * - `angle` — three-point angle (vertex + two arm endpoints).
 * - `arc` — three-point arc length (start, point on arc, end).
 * - `area` — multi-point polygon area.
 * - `coordinate` — single-point X/Y readout in drawing units.
 */
export type AcExMeasureMode =
  | 'distance'
  | 'continuous'
  | 'angle'
  | 'arc'
  | 'area'
  | 'coordinate'

/**
 * Circle geometry in WCS (XY plane) used for arc-length measurement.
 * @internal
 */
interface AcExCircleGeom {
  /** Center X in drawing units. */
  cx: number
  /** Center Y in drawing units. */
  cy: number
  /** Radius in drawing units. */
  r: number
}

/**
 * World point returned by the viewer's snap resolver for one pointer sample.
 * @internal
 */
interface AcExResolvedPoint {
  /** Snapped or raw world position (Z = 0). */
  point: THREE.Vector2
  /** Object-snap hit, if any; otherwise `null`. */
  snap: AcExOsnapPoint | null
}

/**
 * View/camera callbacks supplied by {@link acexHtmlViewerRuntime} so measurement
 * logic stays decoupled from orthographic pan/zoom implementation details.
 */
export interface AcExMeasureViewApi {
  /**
   * Converts a browser pointer position to world coordinates (WCS, XY).
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   */
  screenToWcs: (clientX: number, clientY: number) => THREE.Vector2

  /**
   * Projects a world point to viewport pixel coordinates (for DOM overlays).
   * @param wcs - Point in drawing units.
   */
  wcsToScreen: (wcs: THREE.Vector2) => { x: number; y: number }

  /** Requests a redraw of the WebGL scene (and overlay sync). */
  render: () => void

  /**
   * Monotonic value that changes when pan/zoom invalidates cached pointer picks.
   */
  getSnapCacheKey: () => number

  /** Current orthographic camera zoom (used to scale DOM overlays). */
  getCameraZoom: () => number

  /**
   * Resolves a pointer pick with object snap applied.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   */
  resolvePoint: (clientX: number, clientY: number) => AcExResolvedPoint

  /**
   * Circle or circular-arc under `(x, y)` in WCS, used to lock arc-length
   * picks onto that circumference. `x`/`y` on the result are the nearest
   * point on the drawn stroke (not a radial projection onto the full circle).
   * Omit when the snapshot has no osnap catalog.
   */
  findCircleOrArcNear?: (
    x: number,
    y: number
  ) => { cx: number; cy: number; r: number; x: number; y: number } | null

  /**
   * Formats a linear value using snapshot unit precision (e.g. `LUPREC`).
   * @param value - Length in drawing units.
   */
  formatLength: (value: number) => string

  /**
   * Formats an angle in degrees using snapshot angular precision (e.g. `AUPREC`).
   * @param valueDeg - Angle in degrees.
   */
  formatAngle: (valueDeg: number) => string

  /** Frames the camera on a world-space AABB. */
  zoomToExtents: (extents: AcExExtents) => void
}

/**
 * Construction options for {@link AcExMeasureController}.
 */
export interface AcExMeasureControllerOptions {
  /** Root viewer container (`#mlcad-root`); hosts the overlay layer. */
  root: HTMLElement
  /** I18n helper for status hints and result messages. */
  i18n: AcExHtmlI18n
  /** View transform and formatting callbacks from the runtime. */
  view: AcExMeasureViewApi
  /** Footer status bar updated with hints and last measurement result. */
  statusEl: HTMLElement
  /** Returns the idle status text when no measurement tool is active. */
  getReadyStatus: () => string
  /** Optional drawing title used for sidecar download file names. */
  drawingName?: string
  /**
   * Called when the snap target under the cursor changes during measurement.
   * @param snap - Active snap mode and world position, or `null` when none.
   * @param screen - Viewport position for the snap glyph, or `null` when hidden.
   */
  onOsnapMarker: (
    snap: AcExOsnapPoint | null,
    screen: { x: number; y: number } | null
  ) => void
  /** Returns ortho/polar tracking options while measuring; omit to disable tracking. */
  getTrackingOptions?: () => AcExTrackingOptions | null
  /**
   * Called when a measurement tool becomes active or returns to idle
   * (for example to toggle left-button pan on OrbitControls).
   */
  onActiveChange?: (active: boolean) => void
  /** Called when selection or session draw style changes (session accessory). */
  onStyleChange?: () => void
  /** Active layout BTR id; used to stamp and filter measurement overlays. */
  getActiveLayoutId?: () => string
  /**
   * Updates the mobile/touch session panel (confirm, cancel, live metrics).
   * Pass `null` when no measurement tool is active.
   */
  onSessionUi?: (state: AcExCommandSessionUiState | null) => void
  /**
   * Optional session undo/redo coordinator (markup + measure).
   * When set, create/delete/style/import edits are recorded.
   */
  sessionHistory?: AcExSessionHistory
}

/** Teardown callback registered when a measurement overlay is created. @internal */
type AcExMeasureCleanup = () => void

/** DOM parts belonging to one committed measurement. @internal */
interface AcExCommitParts {
  id: string
  dom: HTMLElement[]
  canvases: HTMLCanvasElement[]
  cleanups: AcExMeasureCleanup[]
}

/** One finished measurement that can be selected and deleted. @internal */
interface AcExCommittedMeasure {
  id: string
  /** Sidecar-compatible record used for import/export. */
  record: AcExMeasurementRecord
  parts: AcExCommitParts
  quantity: AcExMeasureQuantity | null
  value: number
  hitTest: (clientX: number, clientY: number, thresholdPx: number) => boolean
}

function isRecordOnLayout(
  recordLayoutId: string | undefined,
  activeLayoutId: string | undefined
): boolean {
  if (activeLayoutId == null) return true
  return recordLayoutId == null || recordLayoutId === activeLayoutId
}

/** World AABB of a measurement's control geometry (no overlay padding). */
function measurementGeometryExtents(
  geometry: AcExMeasurementGeometry
): AcExExtents | null {
  const xs: number[] = []
  const ys: number[] = []
  const add = (point: { x: number; y: number }) => {
    xs.push(point.x)
    ys.push(point.y)
  }
  switch (geometry.type) {
    case 'distance':
      add(geometry.start)
      add(geometry.end)
      break
    case 'angle':
      add(geometry.vertex)
      add(geometry.arm1)
      add(geometry.arm2)
      break
    case 'area':
      for (const point of geometry.points) add(point)
      break
    case 'arc':
      add({
        x: geometry.center.x - geometry.radius,
        y: geometry.center.y - geometry.radius
      })
      add({
        x: geometry.center.x + geometry.radius,
        y: geometry.center.y + geometry.radius
      })
      break
    case 'point':
      add(geometry.position)
      break
    default:
      return null
  }
  if (xs.length === 0) return null
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  }
}

function padDegenerateExtents(extents: AcExExtents): AcExExtents {
  if (
    extents.maxX - extents.minX > 1e-8 ||
    extents.maxY - extents.minY > 1e-8
  ) {
    return extents
  }
  return {
    minX: extents.minX - 1,
    minY: extents.minY - 1,
    maxX: extents.maxX + 1,
    maxY: extents.maxY + 1
  }
}

/**
 * Combined zoom-to extents: control geometry plus HTML overlay rectangles.
 *
 * Coordinate measurements are a degenerate AABB on their own. Union the
 * badge (capsule) so the camera frames the label instead of the point.
 */
function measurementFocusExtents(
  geometry: AcExMeasurementGeometry,
  overlayRects: ReadonlyArray<{
    left: number
    top: number
    right: number
    bottom: number
  }>,
  clientToWorld: (clientX: number, clientY: number) => { x: number; y: number }
): AcExExtents | null {
  const extents = acexExpandExtentsByClientRects(
    measurementGeometryExtents(geometry),
    overlayRects,
    clientToWorld
  )
  return extents ? padDegenerateExtents(extents) : null
}

/**
 * Euclidean distance between two WCS points in the XY plane.
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in drawing units.
 * @internal
 */
function dist2(a: THREE.Vector2, b: THREE.Vector2): number {
  return a.distanceTo(b)
}

/**
 * Shortest distance from a screen point to a line segment (pixels).
 * @internal
 */
function distPointToSegmentPx(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-10) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Ray-casting point-in-polygon test in screen space.
 * @internal
 */
function pointInPolygonPx(
  px: number,
  py: number,
  verts: { x: number; y: number }[]
): boolean {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i]!.x
    const yi = verts[i]!.y
    const xj = verts[j]!.x
    const yj = verts[j]!.y
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-15) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Minimum screen distance from a point to a polyline (open or closed).
 * @internal
 */
function distPointToPolylinePx(
  px: number,
  py: number,
  verts: { x: number; y: number }[]
): number {
  if (verts.length < 2) {
    if (verts.length === 1)
      return Math.hypot(px - verts[0]!.x, py - verts[0]!.y)
    return Infinity
  }
  let best = Infinity
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i]!
    const b = verts[i + 1]!
    best = Math.min(best, distPointToSegmentPx(px, py, a.x, a.y, b.x, b.y))
  }
  return best
}

/**
 * Screen distance from a point to a circular arc.
 * `antiClockwise` selects the decreasing-angle sweep; both directions wrap
 * through `2π` so major arcs can be hit-tested.
 * @internal
 */
function distPointToArcPx(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  antiClockwise: boolean
): number {
  const twoPi = Math.PI * 2
  const samples = 24
  let best = Infinity
  let span = antiClockwise ? startAngle - endAngle : endAngle - startAngle
  if (span <= 0) span += twoPi
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const a = antiClockwise ? startAngle - t * span : startAngle + t * span
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    best = Math.min(best, Math.hypot(px - x, py - y))
  }
  return best
}

/** Fraction of the shorter world-space arm used as the dimension arc radius. */
const ANGLE_ARC_RADIUS_WCS_FRACTION = 0.3

/**
 * World-space radius of the interior angle dimension arc.
 * @internal
 */
function angleArcRadiusWcs(
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2
): number {
  const len1 = Math.hypot(arm1.x - vertex.x, arm1.y - vertex.y)
  const len2 = Math.hypot(arm2.x - vertex.x, arm2.y - vertex.y)
  return Math.min(len1, len2) * ANGLE_ARC_RADIUS_WCS_FRACTION
}

/**
 * Interior angle arc in overlay pixels. Radius is
 * {@link ANGLE_ARC_RADIUS_WCS_FRACTION} of the shorter world-space arm,
 * then converted with `wcsToScreen`, so the arc stays between the arms when
 * the camera zooms. Matches {@link AcExMeasureController._drawAngleArc}.
 * @internal
 */
function interiorAngleArcScreenMetrics(
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2,
  wcsToScreen: (wcs: { x: number; y: number }) => { x: number; y: number }
): {
  cx: number
  cy: number
  r: number
  startAngle: number
  endAngle: number
  antiClockwise: boolean
} {
  const sv = wcsToScreen(vertex)
  const sa1 = wcsToScreen(arm1)
  const sa2 = wcsToScreen(arm2)
  const cx = sv.x
  const cy = sv.y
  const rWcs = angleArcRadiusWcs(vertex, arm1, arm2)
  const r = rWcs * acexPixelsPerWorldUnit(wcsToScreen)
  const startAngle = Math.atan2(sa1.y - cy, sa1.x - cx)
  const endAngle = Math.atan2(sa2.y - cy, sa2.x - cx)
  const antiClockwise = normaliseAngle(endAngle - startAngle) > Math.PI
  return { cx, cy, r, startAngle, endAngle, antiClockwise }
}

/**
 * Hit test committed DOM overlays (badges/dots) using their rendered bounds.
 * Accounts for CSS transforms such as the coordinate badge vertical offset.
 * @internal
 */
function hitTestMeasureDom(
  parts: AcExCommitParts,
  clientX: number,
  clientY: number,
  paddingPx = 2
): boolean {
  for (const el of parts.dom) {
    if (
      el.classList.contains('mlcad-measure-dot') &&
      !el.classList.contains('mlcad-measure-selected')
    ) {
      continue
    }
    const rect = el.getBoundingClientRect()
    if (
      clientX >= rect.left - paddingPx &&
      clientX <= rect.right + paddingPx &&
      clientY >= rect.top - paddingPx &&
      clientY <= rect.bottom + paddingPx
    ) {
      return true
    }
  }
  return false
}

/**
 * Hit test for a committed angle measurement (arms, arc, badge, endpoint dots).
 * @internal
 */
function hitTestAngleMeasure(
  clientX: number,
  clientY: number,
  thresholdPx: number,
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2,
  badgePos: THREE.Vector2,
  wcsToScreen: (wcs: THREE.Vector2) => { x: number; y: number }
): boolean {
  const screenVerts = [vertex, arm1, vertex, arm2].map(p => wcsToScreen(p))
  if (distPointToPolylinePx(clientX, clientY, screenVerts) <= thresholdPx) {
    return true
  }

  const arc = interiorAngleArcScreenMetrics(vertex, arm1, arm2, p =>
    wcsToScreen(new THREE.Vector2(p.x, p.y))
  )
  if (
    distPointToArcPx(
      clientX,
      clientY,
      arc.cx,
      arc.cy,
      arc.r,
      arc.startAngle,
      arc.endAngle,
      arc.antiClockwise
    ) <= thresholdPx
  ) {
    return true
  }

  const badge = wcsToScreen(badgePos)
  if (Math.hypot(clientX - badge.x, clientY - badge.y) <= thresholdPx + 14) {
    return true
  }

  for (const p of [vertex, arm1, arm2]) {
    const s = wcsToScreen(p)
    if (Math.hypot(clientX - s.x, clientY - s.y) <= thresholdPx + 6) {
      return true
    }
  }

  return false
}

/**
 * Interior angle at `vertex` formed by segments `vertex→arm1` and `vertex→arm2`.
 * @param vertex - Angle vertex in WCS.
 * @param arm1 - Point on the first arm.
 * @param arm2 - Point on the second arm.
 * @returns Angle in degrees, range `[0, 180]`.
 * @internal
 */
function calcAngleDeg(
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2
): number {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const dot = dx1 * dx2 + dy1 * dy2
  const cross = dx1 * dy2 - dy1 * dx2
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI
}

/** World-space badge anchor along the angle bisector. @internal */
function angleBadgeWorld(
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2
): THREE.Vector2 {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const wLen1 = Math.hypot(dx1, dy1)
  const wLen2 = Math.hypot(dx2, dy2)
  const u1x = wLen1 > 0 ? dx1 / wLen1 : 1
  const u1y = wLen1 > 0 ? dy1 / wLen1 : 0
  const u2x = wLen2 > 0 ? dx2 / wLen2 : 1
  const u2y = wLen2 > 0 ? dy2 / wLen2 : 0
  let bx = u1x + u2x
  let by = u1y + u2y
  const bLen = Math.hypot(bx, by)
  if (bLen > 0) {
    bx /= bLen
    by /= bLen
  } else {
    bx = -u1y
    by = u1x
  }
  const offset = Math.max(
    Math.min(wLen1, wLen2) * 0.4,
    Math.max(wLen1, wLen2) * 0.15
  )
  return new THREE.Vector2(vertex.x + bx * offset, vertex.y + by * offset)
}

/**
 * Wraps a radian angle into `[0, 2π)`.
 * @internal
 */
function normaliseAngle(a: number): number {
  return AcGeMathUtil.normalizeAngle(a)
}

/**
 * Circumcircle through three non-collinear WCS points.
 * @internal
 */
function circleFromThreePoints(
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  p3: THREE.Vector2
): AcExCircleGeom | null {
  const circle = AcGeCircArc2d.computeCircumcircle(p1, p2, p3)
  if (!circle) return null
  return { cx: circle.center.x, cy: circle.center.y, r: circle.radius }
}

/**
 * Whether `mid` lies on the CCW sweep from `start` to `end`.
 * @internal
 */
function isAngleOnSweep(start: number, mid: number, end: number): boolean {
  return AcGeMathUtil.isAngleOnCcwSweep(start, mid, end)
}

/**
 * Arc length of the shorter arc between two points on circle `g`.
 * @internal
 */
function shortArcLength(
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  g: AcExCircleGeom
): number {
  return (
    AcGeCircArc2d.tryCreateShorterArc(p1, p2, { x: g.cx, y: g.cy })?.length ?? 0
  )
}

/**
 * Midpoint of the shorter arc between two points on circle `g`.
 * @internal
 */
function shortArcMid(
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  g: AcExCircleGeom
): THREE.Vector2 {
  const mid = AcGeCircArc2d.tryCreateShorterArc(p1, p2, {
    x: g.cx,
    y: g.cy
  })?.midPoint
  return mid ? new THREE.Vector2(mid.x, mid.y) : new THREE.Vector2(p1.x, p1.y)
}

/**
 * Whether the shorter arc from `start` to `end` is counter-clockwise.
 * @internal
 */
function shortArcCounterClockwise(
  start: THREE.Vector2,
  end: THREE.Vector2,
  g: AcExCircleGeom
): boolean {
  const arc = AcGeCircArc2d.tryCreateShorterArc(start, end, {
    x: g.cx,
    y: g.cy
  })
  return arc ? !arc.clockwise : true
}

/** Best-effort CSS color → 24-bit RGB for THREE materials. @internal */
function cssColorToHex(css: string, fallback: number): number {
  const s = css.trim()
  const hex6 = s.match(/^#([0-9a-f]{6})$/i)
  if (hex6) return Number.parseInt(hex6[1]!, 16)
  const hex3 = s.match(/^#([0-9a-f]{3})$/i)
  if (hex3) {
    const h = hex3[1]!
    return Number.parseInt(`${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`, 16)
  }
  const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i)
  if (rgb) {
    const r = Math.max(0, Math.min(255, Math.round(Number(rgb[1]))))
    const g = Math.max(0, Math.min(255, Math.round(Number(rgb[2]))))
    const b = Math.max(0, Math.min(255, Math.round(Number(rgb[3]))))
    if ([r, g, b].every(Number.isFinite)) return (r << 16) | (g << 8) | b
  }
  return fallback
}

/**
 * Projects `p` onto the circle circumference. If `p` is the center, the
 * point at angle 0 is returned.
 * @internal
 */
function snapPointToCircle(p: THREE.Vector2, g: AcExCircleGeom): THREE.Vector2 {
  const dx = p.x - g.cx
  const dy = p.y - g.cy
  const d = Math.hypot(dx, dy)
  if (!(d > 0)) return new THREE.Vector2(g.cx + g.r, g.cy)
  const s = g.r / d
  return new THREE.Vector2(g.cx + dx * s, g.cy + dy * s)
}

/** True when `p` lies on circle `g` within a relative radial tolerance. */
function pointLiesOnCircle(
  p: { x: number; y: number },
  g: AcExCircleGeom
): boolean {
  const radial = Math.abs(Math.hypot(p.x - g.cx, p.y - g.cy) - g.r)
  return radial <= Math.max(1e-6, g.r * 1e-5)
}

function sameCircleGeom(a: AcExCircleGeom, b: AcExCircleGeom): boolean {
  return (
    Math.abs(a.cx - b.cx) <= 1e-8 &&
    Math.abs(a.cy - b.cy) <= 1e-8 &&
    Math.abs(a.r - b.r) <= 1e-8
  )
}

/** Minimum angular move (radians) before locked-arc sweep direction is chosen. */
const ACEX_ARC_DIR_LOCK_RAD = 0.02

/**
 * Wraps an angle delta into (−π, π].
 * @internal
 */
function wrapAngleToPi(delta: number): number {
  return AcGeMathUtil.normalizeAngle(delta + Math.PI) - Math.PI
}

/**
 * Sweep on `g` from `start` to `end`.
 * Default is CCW so the sweep can grow past 180°. `clockwise` is the
 * complementary direction (Ctrl / ⌘ toggle).
 * @internal
 */
function lockedSweep(
  start: THREE.Vector2,
  end: THREE.Vector2,
  g: AcExCircleGeom,
  clockwise: boolean
): { through: THREE.Vector2; length: number } | null {
  const a1 = Math.atan2(start.y - g.cy, start.x - g.cx)
  const a2 = Math.atan2(end.y - g.cy, end.x - g.cx)
  const span = AcGeMathUtil.normalizeAngle(clockwise ? a1 - a2 : a2 - a1)
  if (!(span > 1e-10) || span >= Math.PI * 2 - 1e-10) return null
  const mid = clockwise ? a1 - span / 2 : a1 + span / 2
  return {
    through: new THREE.Vector2(
      g.cx + g.r * Math.cos(mid),
      g.cy + g.r * Math.sin(mid)
    ),
    length: span * g.r
  }
}

/** Sync document CSS accent vars used by measure badges. @internal */
function applyMeasureAccentCss(hex: number): void {
  const css = measureColorToCss(hex)
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const root = document.documentElement
  root.style.setProperty('--mlcad-measure-accent', css)
  root.style.setProperty(
    '--mlcad-measure-accent-border',
    `rgba(${r}, ${g}, ${b}, 0.45)`
  )
  root.style.setProperty(
    '--mlcad-measure-accent-fill',
    `rgba(${r}, ${g}, ${b}, 0.2)`
  )
}

/**
 * Arc sweep from `start` to `end` that passes through `through`.
 * @internal
 */
function arcSweepThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  _g: AcExCircleGeom
): { span: number; counterClockwise: boolean } {
  const arc = AcGeCircArc2d.tryCreateByThreePoints(start, through, end)
  if (!arc) return { span: 0, counterClockwise: true }
  return { span: arc.deltaAngle, counterClockwise: !arc.clockwise }
}

/**
 * Arc length from `start` to `end` through `through`.
 * @internal
 */
function arcLengthThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  _g: AcExCircleGeom
): number {
  return AcGeCircArc2d.tryCreateByThreePoints(start, through, end)?.length ?? 0
}

/**
 * Midpoint on the arc from `start` to `end` that passes through `through`.
 * @internal
 */
function arcMidThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  _g: AcExCircleGeom
): THREE.Vector2 {
  const mid = AcGeCircArc2d.tryCreateByThreePoints(
    start,
    through,
    end
  )?.midPoint
  return mid
    ? new THREE.Vector2(mid.x, mid.y)
    : new THREE.Vector2(start.x, start.y)
}

/**
 * Polygon area via the shoelace (Gauss) formula in the XY plane.
 * @param pts - Polygon vertices in order (need not be explicitly closed).
 * @returns Unsigned area in square drawing units.
 * @internal
 */
function shoelaceArea(pts: THREE.Vector2[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i]!.x * pts[j]!.y
    area -= pts[j]!.x * pts[i]!.y
  }
  return Math.abs(area) / 2
}

/**
 * Arithmetic mean of polygon vertices (used to place area badges).
 * @param pts - Polygon vertices.
 * @internal
 */
function centroid(pts: THREE.Vector2[]): THREE.Vector2 {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return new THREE.Vector2(x, y)
}

/**
 * Tests whether open segments `(p1→p2)` and `(p3→p4)` cross in their interiors.
 * Endpoint touches are excluded so adjacent polygon edges do not auto-close.
 * @internal
 */
function segmentsIntersect(
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  p3: THREE.Vector2,
  p4: THREE.Vector2
): boolean {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return false
  const dx = p3.x - p1.x
  const dy = p3.y - p1.y
  const t = (dx * d2y - dy * d2x) / denom
  const u = (dx * d1y - dy * d1x) / denom
  return t > 0 && t < 1 && u > 0 && u < 1
}

/**
 * Creates a persistent endpoint marker (`mlcad-measure-dot`).
 * World position is stored on `dataset.wcsX` / `dataset.wcsY` and updated by
 * {@link AcExMeasureController.syncOverlays}.
 * @internal
 */
function makeDotEl(): HTMLDivElement {
  const dot = document.createElement('div')
  dot.className = acexOverlayGripClassName('measure')
  return dot
}

/**
 * Creates a persistent value label (`mlcad-measure-badge`).
 * @param text - Pre-formatted measurement string shown to the user.
 * @internal
 */
function makeBadgeEl(text: string): HTMLDivElement {
  const badge = document.createElement('div')
  badge.className = 'mlcad-measure-badge'
  badge.textContent = text
  return badge
}

/**
 * Appends a full-viewport 2D canvas for angle arcs, arc strokes, or area fills.
 * @param container - Overlay layer (`#mlcad-measure-overlays`).
 * @internal
 */
function makeOverlayCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.className = 'mlcad-measure-canvas'
  container.appendChild(canvas)
  return canvas
}

/**
 * Manages measurement tools for the offline HTML viewer.
 *
 * Responsibilities:
 * - Toolbar mode state (distance, angle, arc, area, coordinate) with status-bar hints.
 * - Live preview (HTML canvas rubber-band, arcs/fills, cursor-following label).
 * - Committed results that survive pan/zoom: HTML canvas strokes, DOM badges/dots,
 *   redrawn on {@link syncOverlays}.
 *
 * Pointer routing: while {@link isActive}, the runtime should call
 * {@link handlePointerDown} / {@link handlePointerMove} instead of panning.
 * {@link clearAll} removes every committed overlay and exits any active tool.
 */
export class AcExMeasureController {
  /** Viewer root (`#mlcad-root`). */
  private readonly _root: HTMLElement
  /** Localized status hints and result strings. */
  private readonly _i18n: AcExHtmlI18n
  /** Pan/zoom and formatting callbacks from the runtime. */
  private readonly _view: AcExMeasureViewApi
  /** Footer status bar. */
  private readonly _statusEl: HTMLElement
  /** Idle status text provider. */
  private readonly _getReadyStatus: () => string
  /** Drawing title for sidecar download names. */
  private readonly _drawingName: string | undefined
  /** Snap marker callback for the runtime. */
  private readonly _onOsnapMarker: AcExMeasureControllerOptions['onOsnapMarker']
  /** Ortho/polar tracking options from the settings panel. */
  private readonly _getTrackingOptions:
    | (() => AcExTrackingOptions | null)
    | null
  /** Notifies the viewer when measure-tool activity starts or stops. */
  private readonly _onActiveChange: ((active: boolean) => void) | null
  /** Updates the touch session panel (confirm / metrics / chips). */
  private readonly _onSessionUi:
    | ((state: AcExCommandSessionUiState | null) => void)
    | null
  /** Notifies when selection / session draw style changes. */
  private readonly _onStyleChange: (() => void) | null
  /** Active layout BTR id for stamping / filtering overlays. */
  private readonly _getActiveLayoutId: (() => string) | null
  private readonly _sessionHistory: AcExSessionHistory | null
  /** True while {@link restoreRecords} rebuilds visuals (skip nested history). */
  private _restoring = false
  /** Accent color for lines, labels, and canvas overlays. */
  private _measureColor = ACEX_MEASURE_COLOR
  /** Session badge font size for new measurements. */
  private _drawFontSize = ACEX_MEASUREMENT_FONT_SIZE
  private _drawTextHeightMode: 'adaptive' | 'custom' = 'adaptive'
  private _drawCustomTextHeightWcs: number | undefined
  /** Style of the measurement currently being committed (import or interactive). */
  private _commitStyle: AcExMeasurementSidecarStyle | null = null
  /** Host for canvas overlays, dots, and badges. */
  private readonly _overlayLayer: HTMLDivElement
  /** Hidden file input for sidecar import. */
  private readonly _fileInput: HTMLInputElement
  /** Canvas redraw callbacks invoked from {@link syncOverlays}. */
  private readonly _redrawListeners: AcExMeasureCleanup[] = []
  /** Finished measurements that survive after the tool is deactivated. */
  private readonly _committed: AcExCommittedMeasure[] = []
  /** When false, DOM overlays and THREE measure lines are hidden. */
  private _visible = true
  /** Parts being assembled for the measurement currently being committed. */
  private _commitParts: AcExCommitParts | null = null
  /** Monotonic id source for {@link _committed}. */
  private _commitCounter = 0
  /** Selected committed measurement ids. */
  private readonly _selectedIds = new Set<string>()
  /** Listeners notified when the committed measurement list changes. */
  private readonly _recordListeners = new Set<() => void>()

  /** Active toolbar mode, or `null` when idle. */
  private _mode: AcExMeasureMode | null = null
  /** True while a peer create tool (e.g. markup) is armed. */
  private _peerToolActive = false
  /** Vertices collected for the current in-progress measurement. */
  private _points: THREE.Vector2[] = []
  /**
   * Circle locked when the first arc-tool click lands on a CIRCLE/ARC.
   * Subsequent picks project onto this circumference (2-point sweep).
   */
  private _arcLock: AcExCircleGeom | null = null
  /**
   * Sticky Ctrl/⌘ toggle: flips the complementary (major/minor) sweep
   * after a circle is locked. Press once; key-up does not revert.
   */
  private _arcLockFlip = false
  /**
   * Clockwise vs CCW chosen from the first significant mouse move after lock.
   * `null` until that move; preview then defaults to CCW.
   */
  private _arcLockClockwise: boolean | null = null
  /** Last polar angle of the snapped cursor while a circle is locked. */
  private _arcLockLastAngle = 0
  /** Screen-pixel distance to the first vertex that auto-closes an area polygon. */
  private _areaCloseThresholdPx = 14
  /** Last pointer position during an active measure tool (for overlay sync on pan/zoom). */
  private _lastPointer: { x: number; y: number } | null = null
  /**
   * True while a live cursor sample should drive rubber-band preview (mouse
   * hover, or touch loupe / precise capture). After lift, canvas preview stays
   * hidden until the next live sample — not drawn at the last committed vertex.
   */
  private _livePointer = false
  /** Guards against re-entrant `render()` while {@link syncOverlays} refreshes preview. */
  private _inOverlaySync = false
  /** Cached `#mlcad-root` rect for one {@link syncOverlays} pass. @internal */
  private _overlayRootRect: DOMRect | null = null
  /** Last view key used for committed overlay layout/redraw. @internal */
  private _lastOverlaySyncKey = -1
  /** Cached object-snap resolution for the current pointer sample. @internal */
  private _osnapCache: {
    clientX: number
    clientY: number
    cacheKey: number
    point: THREE.Vector2
    snap: AcExOsnapPoint | null
  } | null = null
  /** Phone/pad plus marks at confirmed in-progress pick points. */
  private readonly _confirmedPointMarks: AcExConfirmedPointMarks

  /**
   * Creates HTML overlay layers in `root` for measurement graphics.
   * @param options - Viewer hooks and DOM targets; see {@link AcExMeasureControllerOptions}.
   */
  constructor(options: AcExMeasureControllerOptions) {
    this._root = options.root
    this._i18n = options.i18n
    this._view = options.view
    this._statusEl = options.statusEl
    this._getReadyStatus = options.getReadyStatus
    this._drawingName = options.drawingName
    this._onOsnapMarker = options.onOsnapMarker
    this._getTrackingOptions = options.getTrackingOptions ?? null
    this._onActiveChange = options.onActiveChange ?? null
    this._onSessionUi = options.onSessionUi ?? null
    this._onStyleChange = options.onStyleChange ?? null
    this._getActiveLayoutId = options.getActiveLayoutId ?? null
    this._sessionHistory = options.sessionHistory ?? null

    this._overlayLayer = document.createElement('div')
    this._overlayLayer.id = 'mlcad-measure-overlays'
    this._root.appendChild(this._overlayLayer)

    this._fileInput = document.createElement('input')
    this._fileInput.type = 'file'
    this._fileInput.accept = '.json,application/json'
    this._fileInput.style.display = 'none'
    this._fileInput.addEventListener('change', () => {
      void this._handleImportFile()
    })
    this._root.appendChild(this._fileInput)

    this._confirmedPointMarks = new AcExConfirmedPointMarks(this._root, pos =>
      this._confirmedPointMarkScreen(pos)
    )

    this._updateVisibilityToolbar()

    this._sessionHistory?.attachMeasure({
      snapshot: () => this.snapshotRecords(),
      restore: records => this.restoreRecords(records)
    })
  }

  /**
   * Deep-cloned committed measurement records (all layouts) for undo snapshots.
   */
  snapshotRecords(): AcExMeasurementRecord[] {
    return structuredClone(this._committed.map(item => item.record))
  }

  /**
   * Replace all committed measurements from a history snapshot.
   * Does not itself push a history entry.
   *
   * @param records - Measurement sidecar records to restore.
   */
  restoreRecords(records: AcExMeasurementRecord[]): void {
    this._restoring = true
    try {
      this.cancelMode()
      this._deselect(false)
      for (const measure of [...this._committed]) {
        this._removeCommitted(measure.id, false)
      }
      for (const record of records) {
        this._publishRecord(structuredClone(record))
      }
      this._updateIdleStatus()
      this._view.render()
      this._onStyleChange?.()
    } finally {
      this._restoring = false
    }
  }

  /** Record an undoable measurement mutation when session history is bound. */
  private _edit(label: string, mutate: () => void): void {
    if (this._restoring || !this._sessionHistory) {
      mutate()
      return
    }
    this._sessionHistory.runMeasure(label, mutate)
  }

  /**
   * Whether a measurement command is active (viewer should not start panning).
   */
  get isActive(): boolean {
    return this._mode !== null
  }

  /** Whether one or more committed measurements are selected. */
  get hasSelection(): boolean {
    return this._selectedIds.size > 0
  }

  /** Clears the current measurement selection (if any). */
  clearSelection(): void {
    this._deselect(true)
  }

  /**
   * Suspends measurement endpoint pointer hit-testing while a peer create
   * tool (e.g. markup) is armed, so overlay DOM cannot steal OSNAP clicks.
   */
  setPeerToolActive(active: boolean): void {
    if (this._peerToolActive === active) return
    this._peerToolActive = active
    this._syncGripPointerEvents()
  }

  /**
   * Currently selected toolbar mode, or `null` when idle.
   */
  get mode(): AcExMeasureMode | null {
    return this._mode
  }

  /** Whether committed measurement overlays are currently shown. */
  get visible(): boolean {
    return this._visible
  }

  /**
   * Updates the session accent color used for new measurement overlays.
   *
   * @param hex - 24-bit RGB color (for example `0x08e8de`).
   */
  setMeasureColor(hex: number): void {
    this.setDrawStyle({ colorHex: hex })
  }

  /** Current session draw style (or selected measurement style when applicable). */
  getDrawStyle(): {
    color: string
    lineWeight: number
    fontSize: number
    textHeightMode: 'adaptive' | 'custom'
    textHeightWcs?: number
  } {
    const selectedId =
      this._selectedIds.size === 1 ? [...this._selectedIds][0] : undefined
    if (selectedId) {
      const measure = this._committed.find(m => m.id === selectedId)
      if (measure) {
        const fontSize = measure.record.style.fontSize || this._drawFontSize
        const wcsToScreen = (p: { x: number; y: number }) =>
          this._wcsToScreenPoint(p)
        const textHeightWcs =
          measure.record.style.textHeightWcs != null &&
          measure.record.style.textHeightWcs > 0
            ? measure.record.style.textHeightWcs
            : acexScreenPxToWcs(fontSize, wcsToScreen)
        return {
          color: measure.record.style.color || this._measureCss(),
          lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
          fontSize,
          // Editing a committed overlay always presents Custom + world height.
          textHeightMode: 'custom',
          textHeightWcs
        }
      }
    }
    return {
      color: this._measureCss(),
      lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
      fontSize: this._drawFontSize,
      textHeightMode: this._drawTextHeightMode,
      ...(this._drawTextHeightMode === 'custom' &&
      this._drawCustomTextHeightWcs != null &&
      this._drawCustomTextHeightWcs > 0
        ? { textHeightWcs: this._drawCustomTextHeightWcs }
        : {})
    }
  }

  /**
   * Updates session defaults and applies the same patch to the current selection.
   */
  setDrawStyle(patch: {
    color?: string
    colorHex?: number
    lineWeight?: number
    fontSize?: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }): void {
    this._edit('Edit Measurement Style', () => {
      let colorChanged = false
      if (patch.colorHex != null && Number.isFinite(patch.colorHex)) {
        this._measureColor = patch.colorHex
        colorChanged = true
      } else if (patch.color) {
        const next = cssColorToHex(patch.color, this._measureColor)
        if (next !== this._measureColor || patch.color !== this._measureCss()) {
          this._measureColor = next
          colorChanged = true
        }
      }
      if (patch.fontSize != null && patch.fontSize > 0) {
        this._drawFontSize = patch.fontSize
      }
      if (patch.textHeightMode === 'adaptive') {
        this._drawTextHeightMode = 'adaptive'
        this._drawCustomTextHeightWcs = undefined
      } else if (
        patch.textHeightMode === 'custom' ||
        (patch.textHeightWcs != null && patch.textHeightWcs > 0)
      ) {
        this._drawTextHeightMode = 'custom'
        if (patch.textHeightWcs != null && patch.textHeightWcs > 0) {
          this._drawCustomTextHeightWcs = patch.textHeightWcs
        }
      }

      if (colorChanged) {
        applyMeasureAccentCss(this._measureColor)
      }

      const selectionPatch: {
        color?: string
        fontSize?: number
        textHeightMode?: 'adaptive' | 'custom'
        textHeightWcs?: number
      } = {}
      if (colorChanged || patch.colorHex != null || patch.color) {
        selectionPatch.color = this._measureCss()
      }
      if (patch.fontSize != null && patch.fontSize > 0) {
        selectionPatch.fontSize = patch.fontSize
      }
      if (patch.textHeightMode != null) {
        selectionPatch.textHeightMode = patch.textHeightMode
      }
      if (patch.textHeightWcs != null && patch.textHeightWcs > 0) {
        selectionPatch.textHeightWcs = patch.textHeightWcs
      }
      this._applyStyleToSelection(selectionPatch)

      // Mid-draw: keep in-progress commit style in sync with the session.
      if (this._commitStyle) {
        if (selectionPatch.color) this._commitStyle.color = selectionPatch.color
        this._commitStyle.lineWeight = ACEX_MEASUREMENT_LINE_WEIGHT
        if (selectionPatch.fontSize != null) {
          this._commitStyle.fontSize = selectionPatch.fontSize
        }
        if (selectionPatch.textHeightMode != null) {
          this._commitStyle.textHeightMode = selectionPatch.textHeightMode
        }
        if (
          selectionPatch.textHeightMode === 'custom' &&
          selectionPatch.textHeightWcs != null
        ) {
          this._commitStyle.textHeightWcs = selectionPatch.textHeightWcs
        } else if (selectionPatch.textHeightMode === 'adaptive') {
          this._commitStyle.textHeightWcs = acexScreenPxToWcs(
            this._commitStyle.fontSize,
            p => this._wcsToScreenPoint(p)
          )
        }
      }

      this._refreshActivePreview()
      this._onStyleChange?.()
      this._view.render()
    })
  }

  /** CSS stroke/fill color for canvas overlays. @internal */
  private _measureCss(): string {
    return measureColorToCss(this._measureColor)
  }

  /** Semi-transparent fill for area measurements. @internal */
  private _measureFill(): string {
    return measureColorToFill(this._measureColor)
  }

  /**
   * Activates a measure mode from the toolbar.
   *
   * When `toggleOff` is true (default) and `mode` equals the active mode,
   * an in-progress continuous chain with at least one segment is committed;
   * otherwise the tool is turned off via {@link cancelMode}. Switching away
   * from continuous behaves the same way, then enters the new mode.
   *
   * @param mode - Tool to enable, or `null` to only reset state.
   * @param toggleOff - If true, clicking the same tool again deactivates it.
   */
  setMode(mode: AcExMeasureMode | null, toggleOff = true): void {
    if (mode === this._mode && toggleOff) {
      if (!this._finishContinuousIfPossible()) this.cancelMode()
      return
    }
    if (!this._finishContinuousIfPossible()) this.cancelMode()
    this._deselect(false)
    if (mode === null) return
    this._mode = mode
    this._points = []
    this._livePointer = false
    this._updateToolbarActive()
    this._syncGripPointerEvents()
    this._statusEl.textContent = this._hintForMode(mode)
    this._onActiveChange?.(true)
    this._syncSessionUi()
  }

  /**
   * Exits the active measurement tool and discards in-progress picks/preview.
   * Does not remove committed measurement graphics (use {@link clearAll}).
   */
  cancelMode(): void {
    const wasActive = this._mode !== null
    this._mode = null
    this._points = []
    this._arcLock = null
    this._resetArcLockDirection()
    this._lastPointer = null
    this._livePointer = false
    this._osnapCache = null
    this._hidePreview()
    this._onOsnapMarker(null, null)
    this._confirmedPointMarks.clear()
    this._updateToolbarActive()
    this._syncGripPointerEvents()
    this._updateIdleStatus()
    this._view.render()
    if (wasActive) this._onActiveChange?.(false)
    this._syncSessionUi()
  }

  /**
   * Drops the last in-progress vertex. Returns whether a point was removed.
   */
  undoLastVertex(): boolean {
    if (!this._mode || this._points.length === 0) return false
    this._points.pop()
    if (this._points.length === 0) {
      this._arcLock = null
      this._resetArcLockDirection()
      this._hidePreview()
    }
    this._refreshActivePreview()
    this._syncSessionUi()
    this._syncConfirmedPointMarks()
    this._requestRender()
    return true
  }

  /** Whether {@link undoLastVertex} would remove an in-progress pick. */
  canUndoLastVertex(): boolean {
    return this._mode != null && this._points.length > 0
  }

  /**
   * Empty-Enter equivalent: finish continuous (≥1 segment) or area (≥3 verts).
   */
  confirmSession(): boolean {
    return this.handleKeyDown('Enter')
  }

  /**
   * Session panel × — discard the in-progress measurement without committing.
   *
   * Keyboard Escape still finishes a continuous chain with at least one
   * segment ({@link handleKeyDown}); the on-screen Cancel control must not.
   */
  cancelSession(): boolean {
    if (!this._mode) return false
    this.cancelMode()
    return true
  }

  private _syncSessionUi(): void {
    if (!this._onSessionUi) return
    if (!this._mode) {
      this._onSessionUi(null)
      return
    }
    // Metrics only — never pass showMarker (that revived the OSNAP glyph after
    // a successful pick, undoing the hide in handlePointerDown).
    const cursor = this._lastPointer
      ? this._resolvePointerWithOsnap(
          this._lastPointer.x,
          this._lastPointer.y,
          false
        )
      : this._points[this._points.length - 1]
    const lastCommitted = this._points[this._points.length - 1] ?? null
    const prevCommitted =
      this._points.length >= 2 ? this._points[this._points.length - 2]! : null
    // Finger down: rubber-band from the last pick. Finger up: keep the
    // completed segment (or absolute X/Y of the only pick) until next press.
    const base = this._livePointer ? lastCommitted : prevCommitted
    const useRelative =
      this._mode !== 'coordinate' && base != null && cursor != null
    const dx = useRelative && base && cursor ? cursor.x - base.x : 0
    const dy = useRelative && base && cursor ? cursor.y - base.y : 0
    const length = Math.hypot(dx, dy)
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
    if (angleDeg < 0) angleDeg += 360
    if (this._livePointer && useRelative && length === 0) return
    const confirmEnabled =
      (this._mode === 'continuous' && this._points.length >= 2) ||
      (this._mode === 'area' && this._points.length >= 3)
    this._onSessionUi({
      prompt: this._hintForMode(this._mode),
      confirmEnabled,
      metrics: {
        hasBasePoint: useRelative,
        lengthText: this._view.formatLength(length),
        angleText: this._view.formatAngle(angleDeg),
        dxText: this._view.formatLength(dx),
        dyText: this._view.formatLength(dy),
        xText: this._view.formatLength(cursor?.x ?? 0),
        yText: this._view.formatLength(cursor?.y ?? 0)
      },
      chips: []
    })
  }

  /**
   * Commits an in-progress continuous measurement when at least one segment
   * exists, then exits create mode. Used by Enter, Esc, and tool switching.
   */
  private _finishContinuousIfPossible(): boolean {
    if (this._mode !== 'continuous' || this._points.length < 2) return false
    this._commitContinuous(this._points.map(p => p.clone()))
    this._points = []
    this._hidePreview()
    this._exitCreateModeKeepStatus()
    return true
  }

  /**
   * Ends create mode after a successful interactive commit, keeping the
   * just-written status message (result readout) instead of replacing it
   * with idle totals / empty ready text.
   */
  private _exitCreateModeKeepStatus(): void {
    const msg = this._statusEl.textContent
    this.cancelMode()
    if (msg?.trim()) {
      this._statusEl.textContent = msg
    }
  }

  /**
   * Refreshes the idle status bar (totals or ready text) when no tool is active.
   */
  refreshIdleStatus(): void {
    this._updateIdleStatus()
  }

  /**
   * Committed measurements on the active layout, with formatted badge text.
   */
  list(): Array<{
    id: string
    type: AcExMeasurementType
    valueText: string
    record: AcExMeasurementRecord
  }> {
    const activeId = this._getActiveLayoutId?.()
    return this._committed
      .filter(measure => isRecordOnLayout(measure.record.layoutId, activeId))
      .map(measure => ({
        id: measure.id,
        type: measure.record.type,
        valueText: this._valueText(measure),
        record: measure.record
      }))
  }

  /** Currently selected measurement id when exactly one is selected. */
  get selectedId(): string | undefined {
    if (this._selectedIds.size !== 1) return undefined
    return [...this._selectedIds][0]
  }

  /** Subscribe to list/selection changes. */
  subscribe(listener: () => void): () => void {
    this._recordListeners.add(listener)
    return () => {
      this._recordListeners.delete(listener)
    }
  }

  /** Select a measurement from the list panel. */
  selectFromPanel(id: string): void {
    this._deselect(false)
    this._select(id)
    this._notifyRecordsChanged()
  }

  /**
   * Zoom to a measurement (geometry plus HTML badge) and select it.
   *
   * @returns `true` when extents were applied.
   */
  focus(id: string): boolean {
    const measure = this._committed.find(item => item.id === id)
    if (!measure) return false
    const rects = measure.parts.dom
      .filter(el => !acexIsOverlayGrip(el) && !el.hidden)
      .map(el => el.getBoundingClientRect())
      .filter(rect => rect.width > 0 || rect.height > 0)
    const extents = measurementFocusExtents(
      measure.record.geometry,
      rects,
      (clientX, clientY) => {
        const p = this._view.screenToWcs(clientX, clientY)
        return { x: p.x, y: p.y }
      }
    )
    if (!extents) return false
    this._view.zoomToExtents(extents)
    this.selectFromPanel(id)
    return true
  }

  /** Remove one committed measurement. */
  removeMeasurement(id: string): void {
    this._edit('Delete Measurement', () => {
      this._removeCommitted(id, true)
    })
  }

  private _notifyRecordsChanged(): void {
    for (const listener of this._recordListeners) listener()
  }

  private _valueText(measure: AcExCommittedMeasure): string {
    const badge = measure.parts.dom.find(el =>
      el.classList.contains('mlcad-measure-badge')
    )
    const text = badge?.textContent?.trim()
    if (text) return text
    switch (measure.record.type) {
      case 'area':
        return `${this._view.formatLength(measure.value)}²`
      case 'angle':
        return this._view.formatAngle(measure.value)
      case 'point':
        if (measure.record.geometry.type === 'point') {
          const p = measure.record.geometry.position
          return `X ${this._view.formatLength(p.x)}  Y ${this._view.formatLength(p.y)}`
        }
        return ''
      default:
        return this._view.formatLength(measure.value)
    }
  }

  /**
   * Removes all persistent measurement graphics (lines, canvas, badges, dots),
   * disposes THREE resources, and returns the viewer to idle status.
   */
  clearAll(): void {
    this._edit('Clear Measurements', () => {
      this.cancelMode()
      this._deselect(false)
      for (const measure of [...this._committed]) {
        this._removeCommitted(measure.id, false)
      }
      this._updateIdleStatus()
      this._view.render()
    })
  }

  /**
   * Shows or hides all committed measurement graphics (HTML overlays).
   */
  setVisible(visible: boolean): void {
    this._visible = visible
    this._overlayLayer.style.display = visible ? '' : 'none'
    this._updateVisibilityToolbar()
    this._view.render()
  }

  /** Toggles {@link setVisible}. */
  toggleVisible(): void {
    this.setVisible(!this._visible)
  }

  /**
   * Shows or hides committed overlays according to the active layout.
   * Records without `layoutId` remain visible on every layout.
   */
  syncLayoutVisibility(): void {
    const activeId = this._getActiveLayoutId?.()
    let selectionChanged = false
    for (const measure of this._committed) {
      const onLayout = isRecordOnLayout(measure.record.layoutId, activeId)
      const show = this._visible && onLayout
      for (const el of measure.parts.dom) el.hidden = !show
      for (const canvas of measure.parts.canvases) canvas.hidden = !show
      if (!onLayout && this._selectedIds.has(measure.id)) {
        this._applyMeasureSelection(measure, false)
        this._selectedIds.delete(measure.id)
        selectionChanged = true
      }
    }
    if (selectionChanged) {
      this._onStyleChange?.()
    }
    this._notifyRecordsChanged()
  }

  /** Download current measurements as a `*.measurement.json` sidecar. */
  exportSidecar(): void {
    const file: AcExMeasurementSidecarFile = {
      version: 1,
      drawingName: this._drawingName,
      measurements: this._committed.map(c => c.record)
    }
    const text = stringifyAcExMeasurementSidecar(file)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = acexMeasurementSidecarFileName(this._drawingName)
    a.click()
    URL.revokeObjectURL(url)
    this._statusEl.textContent = this._i18n.t('status.measureExported', {
      count: String(file.measurements.length)
    })
  }

  /** Open a file picker to import a measurement sidecar JSON. */
  importSidecar(): void {
    this._fileInput.value = ''
    this._fileInput.click()
  }

  /** Replace all measurements from a parsed sidecar (used by tests / import). */
  loadSidecar(file: AcExMeasurementSidecarFile): void {
    this._edit('Import Measurements', () => {
      this.cancelMode()
      this._deselect(false)
      for (const measure of [...this._committed]) {
        this._removeCommitted(measure.id, false)
      }
      for (const record of file.measurements) {
        this._publishRecord(record)
      }
      this._updateIdleStatus()
      this._view.render()
    })
  }

  private async _handleImportFile(): Promise<void> {
    const file = this._fileInput.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const sidecar = parseAcExMeasurementSidecar(text)
      this.loadSidecar(sidecar)
      this._statusEl.textContent = this._i18n.t('status.measureImported', {
        count: String(sidecar.measurements.length)
      })
    } catch (error) {
      this._statusEl.textContent = this._i18n.t('status.measureImportFailed', {
        error: String(error)
      })
    }
  }

  /**
   * Repositions DOM badges/dots and redraws registered canvas overlays.
   * Invoke from the viewer `render` path and after resize so graphics track pan/zoom.
   */
  syncOverlays(): void {
    if (!this._visible) return
    this._inOverlaySync = true
    try {
      this._overlayRootRect = this._root.getBoundingClientRect()
      const overlayKey = this._view.getSnapCacheKey()
      const cameraChanged = overlayKey !== this._lastOverlaySyncKey
      if (cameraChanged) {
        for (const fn of this._redrawListeners) fn()
        this._positionDomOverlays()
        this._lastOverlaySyncKey = overlayKey
      }
      this._refreshActivePreview()
      this._syncConfirmedPointMarks()
    } finally {
      this._inOverlaySync = false
      this._overlayRootRect = null
    }
  }

  /**
   * Handles a pointer-down while a measurement tool is active (placement / OSNAP only).
   * Committed overlay selection is idle-only via {@link handleSelectionPointerDown}.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   * @returns `true` when the event was handled.
   */
  handlePointerDown(clientX: number, clientY: number): boolean {
    // While a measure tool is armed, never select/highlight committed overlays —
    // endpoint dots coincide with CAD grips/OSNAP and would steal placement clicks.
    // Idle selection uses {@link handleSelectionPointerDown} instead.
    if (!this._mode) return false
    // End live preview before resolving so a nested render cannot revive the
    // OSNAP glyph; confirmed picks show the plus mark only.
    this._livePointer = false
    this._lastPointer = { x: clientX, y: clientY }
    const point = this._resolvePointerWithOsnap(clientX, clientY, false)

    let handled = true
    switch (this._mode) {
      case 'distance':
        handled = this._pointerDistance(point, clientX, clientY)
        break
      case 'continuous':
        handled = this._pointerContinuous(point, clientX, clientY)
        break
      case 'angle':
        handled = this._pointerAngle(point, clientX, clientY)
        break
      case 'arc':
        handled = this._pointerArc(point, clientX, clientY)
        break
      case 'area':
        handled = this._pointerArea(point, clientX, clientY)
        break
      case 'coordinate':
        handled = this._pointerCoordinate(point, clientX, clientY)
        break
      default:
        handled = true
        break
    }
    this._onOsnapMarker(null, null)
    this._syncSessionUi()
    this._syncConfirmedPointMarks()
    return handled
  }

  /**
   * Updates live preview and object-snap marker for the active tool.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   */
  handlePointerMove(clientX: number, clientY: number): void {
    if (!this._mode) return
    this._livePointer = true
    this._lastPointer = { x: clientX, y: clientY }
  }

  /**
   * Keyboard shortcuts during measurement.
   *
   * - `Escape` — {@link cancelMode} when a tool is active.
   * - `Enter` — commit an area polygon when at least three vertices are placed.
   * - `Control` / `Meta` (⌘) — while a circle is locked, flip major/minor arc.
   *
   * @param key - `KeyboardEvent.key` value.
   * @param event - Optional native event (used to ignore key repeat).
   * @returns `true` when the key was handled (caller may call `preventDefault`).
   */
  handleKeyDown(key: string, event?: KeyboardEvent): boolean {
    if (
      (key === 'Control' || key === 'Meta') &&
      !event?.repeat &&
      this._mode === 'arc' &&
      this._arcLock &&
      this._points.length === 1
    ) {
      this._arcLockFlip = !this._arcLockFlip
      this._refreshActivePreview()
      return true
    }
    if (key === 'Escape') {
      if (this._finishContinuousIfPossible()) return true
      if (this._mode) {
        this.cancelMode()
        return true
      }
      if (this._selectedIds.size > 0) {
        this._deselect()
        return true
      }
      return false
    }
    if (key === 'Enter' && this._mode === 'area' && this._points.length >= 3) {
      this._commitArea([...this._points])
      this._points = []
      this._hidePreview()
      this._exitCreateModeKeepStatus()
      return true
    }
    if (key === 'Enter' && this._finishContinuousIfPossible()) return true
    return false
  }

  /**
   * Picks a committed measurement when no measure tool is active.
   * @returns `true` when selection changed (caller may redraw).
   */
  handleSelectionPointerDown(clientX: number, clientY: number): boolean {
    if (this._mode || this._committed.length === 0) return false
    return this._trySelectCommittedAt(clientX, clientY)
  }

  /**
   * Replaces measurement selection with items whose geometry AABB matches `box`.
   *
   * @returns True when selection state changed.
   */
  handleSelectionBox(box: AcExExtents, mode: AcExSelectionMode): boolean {
    if (this._mode || !this._visible) return false
    const next = new Set<string>()
    for (const measure of this._committed) {
      if (
        !isRecordOnLayout(measure.record.layoutId, this._getActiveLayoutId?.())
      ) {
        continue
      }
      const bounds = measurementGeometryExtents(measure.record.geometry)
      if (!bounds) continue
      if (acexExtentsMatchBox(bounds, box, mode)) {
        next.add(measure.id)
      }
    }
    return this._replaceSelection(next)
  }

  /**
   * Deletes all selected committed measurements.
   * Handles `Delete` and `Backspace` (Mac keyboard delete).
   */
  handleSelectionKeyDown(key: string, event?: KeyboardEvent): boolean {
    const isDelete =
      key === 'Delete' ||
      key === 'Backspace' ||
      event?.code === 'Delete' ||
      event?.code === 'Backspace'
    if (!isDelete) return false
    if (this._selectedIds.size === 0) return false

    const target = event?.target
    if (target instanceof HTMLElement) {
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        return false
      }
    }

    event?.preventDefault()
    this._edit('Delete Measurement', () => {
      for (const id of [...this._selectedIds]) {
        this._removeCommitted(id, false)
      }
      this._selectedIds.clear()
      this._onStyleChange?.()
      this._updateIdleStatus()
      this._view.render()
    })
    return true
  }

  /** Updates the status bar with measurement totals when idle. @internal */
  private _updateIdleStatus(): void {
    if (this._mode) return
    this._statusEl.textContent = this._idleStatusText()
  }

  /** Idle status: ready text, or aggregated length/area totals. @internal */
  private _idleStatusText(): string {
    const entries = this._quantityEntriesForIdleStatus()
    if (entries.length === 0) return this._getReadyStatus()

    const { length, area } = sumMeasureQuantities(entries)
    const parts: string[] = []
    if (entries.some(entry => entry.quantity === 'length')) {
      parts.push(
        this._i18n.t('status.lengthTotal', {
          value: this._view.formatLength(length)
        })
      )
    }
    if (entries.some(entry => entry.quantity === 'area')) {
      parts.push(
        this._i18n.t('status.areaTotal', {
          value: `${this._view.formatLength(area)}²`
        })
      )
    }
    return parts.length > 0 ? parts.join('  ') : this._getReadyStatus()
  }

  /** Committed measurements included in idle totals. @internal */
  private _quantityEntriesForIdleStatus(): AcExMeasureQuantityEntry[] {
    const measures =
      this._selectedIds.size > 0
        ? this._committed.filter(measure => this._selectedIds.has(measure.id))
        : this._committed
    const entries: AcExMeasureQuantityEntry[] = []
    for (const measure of measures) {
      if (measure.quantity == null) continue
      entries.push({ quantity: measure.quantity, value: measure.value })
    }
    return entries
  }

  /** Localized status-bar hint for the given tool. @internal */
  private _hintForMode(mode: AcExMeasureMode): string {
    switch (mode) {
      case 'distance':
        return this._i18n.t('status.measureDistanceHint')
      case 'continuous':
        return this._i18n.t('status.measureContinuousHint')
      case 'angle':
        return this._i18n.t('status.measureAngleHint')
      case 'arc':
        return this._i18n.t('status.measureArcHint')
      case 'area':
        return this._i18n.t('status.measureAreaHint')
      case 'coordinate':
        return this._i18n.t('status.measureCoordinateHint')
    }
  }

  /** Syncs measure-mode `active` class and parent menu highlight. @internal */
  private _updateToolbarActive(): void {
    document.querySelectorAll('[data-measure-mode]').forEach(btn => {
      const mode = btn.getAttribute('data-measure-mode')
      btn.classList.toggle('active', mode === this._mode)
    })
    document
      .getElementById('mlcad-measure-menu-btn')
      ?.classList.toggle('active', this._mode !== null)
  }

  /** Syncs show/hide measurement button label and icon. @internal */
  private _updateVisibilityToolbar(): void {
    const buttons = document.querySelectorAll(
      '[data-action="measure-visibility"]'
    )
    if (buttons.length === 0) return
    // State-oriented icon: open eye while visible, slashed eye while hidden.
    // Tooltip stays action-oriented (click to hide / show).
    const titleKey = this._visible
      ? 'toolbar.measureHide'
      : 'toolbar.measureShow'
    const icon = this._visible
      ? AcExHtmlIcons.markupShow
      : AcExHtmlIcons.markupHide
    const label = this._i18n.t(titleKey)
    buttons.forEach(btn => {
      btn.classList.toggle('active', this._visible)
      btn.classList.toggle('is-toggled', this._visible)
      btn.setAttribute('data-i18n-key', titleKey)
      btn.setAttribute('title', label)
      btn.setAttribute('aria-label', label)
      const labelEl =
        btn.querySelector('.mlcad-tool-btn-label') ??
        btn.querySelector('.mlcad-dropdown-label')
      if (labelEl) {
        labelEl.setAttribute('data-i18n-key', titleKey)
        labelEl.textContent = label
      }
      const iconHost =
        btn.querySelector('.mlcad-tool-btn-icon') ??
        btn.querySelector('.mlcad-dropdown-icon')
      if (iconHost) {
        iconHost.innerHTML = icon
      } else if (!labelEl) {
        btn.innerHTML = icon
      }
    })
  }

  /** Removes transient preview lines, capsules, and preview canvases. @internal */
  private _hidePreview(): void {
    this._overlayLayer
      .querySelectorAll(
        '.mlcad-measure-canvas--preview, .mlcad-measure-canvas--preview-line, .mlcad-measure-badge--preview'
      )
      .forEach(el => el.remove())
  }

  /**
   * Requests a viewer redraw unless called from {@link syncOverlays}.
   * @internal
   */
  private _requestRender(): void {
    if (!this._inOverlaySync) this._view.render()
  }

  /**
   * Resolves the WCS pick (with object snap) and optionally refreshes the
   * on-screen snap marker.
   *
   * @param showMarker - When false, resolve silently (confirmed picks keep
   *   the plus mark only and must not leave a snap glyph behind).
   * @internal
   */
  private _resolvePointerWithOsnap(
    clientX: number,
    clientY: number,
    showMarker: boolean = true
  ): THREE.Vector2 {
    const cacheKey = this._view.getSnapCacheKey()
    const cached = this._osnapCache
    if (
      cached &&
      cached.clientX === clientX &&
      cached.clientY === clientY &&
      cached.cacheKey === cacheKey
    ) {
      if (showMarker) {
        this._onOsnapMarker(
          cached.snap,
          cached.snap ? this._view.wcsToScreen(cached.point) : null
        )
      }
      return cached.point
    }

    const { point: rawPoint, snap } = this._view.resolvePoint(clientX, clientY)
    let point = rawPoint
    const tracking = this._getTrackingOptions?.()
    const reference = this._trackingReference()
    if (tracking && reference && (tracking.ortho || tracking.polar)) {
      const constrained = constrainToAcExTracking(point, reference, tracking)
      point = new THREE.Vector2(constrained.x, constrained.y)
    }
    this._osnapCache = {
      clientX,
      clientY,
      cacheKey,
      point: point.clone(),
      snap
    }
    if (showMarker) {
      this._onOsnapMarker(snap, snap ? this._view.wcsToScreen(point) : null)
    }
    return point
  }

  /** Reference point for ortho/polar tracking during the active tool. @internal */
  private _trackingReference(): THREE.Vector2 | null {
    if (!this._mode || this._points.length === 0) return null
    if (this._mode === 'coordinate') return null
    if (this._mode === 'angle') return this._points[0] ?? null
    return this._points[this._points.length - 1] ?? null
  }

  /**
   * Redraws in-progress preview after pan/zoom.
   *
   * Live cursor (mouse hover / touch loupe) drives the rubber-band to the
   * next pick. Without a live sample, multi-vertex tools still show geometry
   * already confirmed in this session (continuous segments, area edges, …).
   * @internal
   */
  private _refreshActivePreview(): void {
    if (!this._mode) return

    if (this._livePointer && this._lastPointer) {
      const { x, y } = this._lastPointer
      const point = this._resolvePointerWithOsnap(x, y)
      switch (this._mode) {
        case 'distance':
          if (this._points.length === 1) {
            this._previewDistance(point)
          }
          break
        case 'continuous':
          if (this._points.length >= 1) {
            this._previewContinuous(point)
          }
          break
        case 'angle':
          if (this._points.length >= 1) {
            this._previewAngle(point)
          }
          break
        case 'arc':
          if (this._points.length >= 1) {
            this._previewArc(point, x, y)
          }
          break
        case 'area':
          if (this._points.length >= 1) {
            this._previewArea(point)
          }
          break
        case 'coordinate':
          this._previewCoordinate(point)
          break
      }
      this._syncSessionUi()
      return
    }

    // Finger/button up: keep confirmed segments, never leave a snap glyph.
    this._onOsnapMarker(null, null)
    switch (this._mode) {
      case 'continuous':
        this._previewContinuous(null)
        break
      case 'area':
        this._previewArea(null)
        break
      case 'angle':
        this._previewAngleCommitted()
        break
      case 'arc':
        this._previewArcCommitted()
        break
      default:
        break
    }
    this._syncSessionUi()
  }

  /**
   * Positions live value capsules (same badge chrome as committed measurements).
   * Used by continuous segments and distance / angle / arc / coordinate previews.
   * @internal
   */
  private _syncPreviewBadges(
    items: Array<{
      wcs: THREE.Vector2
      text: string
      /** Offset capsule like a committed coordinate readout. */
      coordinate?: boolean
    }>
  ): void {
    const existing = Array.from(
      this._overlayLayer.querySelectorAll<HTMLDivElement>(
        '.mlcad-measure-badge--preview'
      )
    )
    while (existing.length > items.length) existing.pop()?.remove()
    while (existing.length < items.length) {
      const el = makeBadgeEl('')
      el.classList.add('mlcad-measure-badge--preview')
      this._overlayLayer.appendChild(el)
      existing.push(el)
    }
    const css = this._measureCss()
    for (let i = 0; i < items.length; i++) {
      const el = existing[i]!
      const item = items[i]!
      el.textContent = item.text
      el.style.color = css
      el.style.borderColor = css
      el.style.fontSize = `${this._drawFontSize}px`
      el.style.display = 'block'
      el.classList.toggle('mlcad-measure-badge--coordinate', !!item.coordinate)
      this._syncLiveDomTextHeight(el)
      this._placeDomAt(el, item.wcs)
    }
  }

  /**
   * Updates the rubber-band HTML canvas polyline from WCS vertices.
   * Uses the current draw-style color and line weight.
   * @internal
   */
  private _setPreviewLine(
    points: THREE.Vector2[],
    options?: { bothArrows?: boolean; segmentArrows?: boolean }
  ): void {
    let canvas = this._overlayLayer.querySelector<HTMLCanvasElement>(
      '.mlcad-measure-canvas--preview-line'
    )
    if (points.length < 2) {
      canvas?.remove()
      return
    }
    if (!canvas) {
      canvas = makeOverlayCanvas(this._overlayLayer)
      canvas.classList.add('mlcad-measure-canvas--preview-line')
    }
    this._drawPolyline(
      canvas,
      points,
      this._measureCss(),
      acexMeasureCanvasLineWidth(ACEX_MEASUREMENT_LINE_WEIGHT),
      undefined,
      options?.bothArrows,
      false,
      undefined,
      options?.segmentArrows
    )
  }

  /** Formats X/Y for coordinate tool labels and badges. @internal */
  private _formatCoordinateLabel(x: number, y: number): string {
    return `X ${this._view.formatLength(x)}  Y ${this._view.formatLength(y)}`
  }

  /**
   * Coordinate tool: each click commits one X/Y readout.
   * @internal
   */
  private _pointerCoordinate(
    point: THREE.Vector2,
    _clientX: number,
    _clientY: number
  ): boolean {
    this._commitCoordinate(point)
    this._hidePreview()
    this._exitCreateModeKeepStatus()
    return true
  }

  /** Coordinate tool live preview capsule at the pick (matches simple-viewer). @internal */
  private _previewCoordinate(point: THREE.Vector2): void {
    this._hidePreview()
    this._syncPreviewBadges([
      {
        wcs: point,
        text: this._formatCoordinateLabel(point.x, point.y),
        coordinate: true
      }
    ])
    this._requestRender()
  }

  /**
   * Persists a coordinate measurement: endpoint dot and offset badge.
   * @internal
   */
  private _commitCoordinate(
    point: THREE.Vector2,
    existing?: AcExMeasurementRecord
  ): void {
    const pos = point.clone()
    const label = this._formatCoordinateLabel(pos.x, pos.y)
    const id = this._startCommit(existing?.id)
    const dot = this._addDot(pos)
    const badge = this._addBadge(pos, label)
    badge.classList.add('mlcad-measure-badge--coordinate')
    const record =
      existing ??
      this._makeRecord(id, 'point', {
        type: 'point',
        position: { x: pos.x, y: pos.y }
      })
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const s = this._view.wcsToScreen(pos)
        return Math.hypot(clientX - s.x, clientY - s.y) <= threshold
      },
      null,
      0,
      record
    )
    this._bindPointGrips(id, record, pos, dot, badge)
    this._statusEl.textContent = this._i18n.t('status.coordinates', {
      x: this._view.formatLength(pos.x),
      y: this._view.formatLength(pos.y)
    })
  }

  /** Endpoint grip for a coordinate measurement. @internal */
  private _bindPointGrips(
    id: string,
    record: AcExMeasurementRecord,
    pos: THREE.Vector2,
    dot: HTMLElement,
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'point') return

    const refresh = () => {
      g.position.x = pos.x
      g.position.y = pos.y
      badge.textContent = this._formatCoordinateLabel(pos.x, pos.y)
      this._placeDomAt(badge, pos)
      this._view.render()
    }

    parts.cleanups.push(
      acexBindMarkupPointerDrag({
        el: dot,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled: () => this._gripsEnabled(),
        onPointerDown: () => this._selectOnly(id),
        onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
        onMove: world => {
          pos.set(world.x, world.y)
          this._placeDomAt(dot, world)
          refresh()
        },
        onCommit: () => {
          refresh()
          this._touchMeasureGeometry(id, null, 0)
        }
      })
    )
    this._syncGripPointerEvents()
  }

  /**
   * Distance tool: two clicks, then {@link _commitDistance}.
   * @internal
   */
  private _pointerDistance(
    point: THREE.Vector2,
    _clientX: number,
    _clientY: number
  ): boolean {
    this._points.push(point.clone())
    if (this._points.length < 2) {
      // Wait for a live cursor (mouse move / touch loupe) before rubber-band.
      this._hidePreview()
      return true
    }
    const [a, b] = this._points
    this._commitDistance(a!, b!)
    this._points = []
    this._hidePreview()
    this._exitCreateModeKeepStatus()
    return true
  }

  /** Distance tool live preview after the first anchor is set. @internal */
  private _previewDistance(point: THREE.Vector2): void {
    if (this._points.length !== 1) {
      this._hidePreview()
      return
    }
    const anchor = this._points[0]!
    this._setPreviewLine([anchor, point], { bothArrows: true })
    const dist = dist2(anchor, point)
    if (dist < 1e-4) {
      this._syncPreviewBadges([])
    } else {
      this._syncPreviewBadges([
        {
          wcs: new THREE.Vector2(
            (anchor.x + point.x) / 2,
            (anchor.y + point.y) / 2
          ),
          text: this._view.formatLength(dist)
        }
      ])
    }
    this._requestRender()
  }

  /**
   * Persists a distance measurement: line with endpoint arrows, endpoint dots,
   * and midpoint badge.
   * @internal
   */
  private _commitDistance(
    a: THREE.Vector2,
    b: THREE.Vector2,
    existing?: AcExMeasurementRecord
  ): void {
    const start = a.clone()
    const end = b.clone()
    const dist = dist2(start, end)
    const id = this._startCommit(existing?.id)
    this._addPersistentLine([start, end], { bothArrows: true })
    const dot1 = this._addDot(start)
    const dot2 = this._addDot(end)
    const mid = new THREE.Vector2((start.x + end.x) / 2, (start.y + end.y) / 2)
    const badge = this._addBadge(mid, this._view.formatLength(dist))
    const record =
      existing ??
      this._makeRecord(id, 'distance', {
        type: 'distance',
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y }
      })
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const sa = this._view.wcsToScreen(start)
        const sb = this._view.wcsToScreen(end)
        return (
          distPointToSegmentPx(clientX, clientY, sa.x, sa.y, sb.x, sb.y) <=
          threshold
        )
      },
      'length',
      dist,
      record
    )
    this._bindDistanceGrips(id, record, start, end, mid, dot1, dot2, badge)
    this._statusEl.textContent = this._i18n.t('status.distance', {
      value: this._view.formatLength(dist)
    })
  }

  /** Endpoint grips for a distance measurement. @internal */
  private _bindDistanceGrips(
    id: string,
    record: AcExMeasurementRecord,
    start: THREE.Vector2,
    end: THREE.Vector2,
    mid: THREE.Vector2,
    startDot: HTMLElement,
    endDot: HTMLElement,
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'distance') return
    // Keep record geometry as the same object fields we mutate.
    g.start.x = start.x
    g.start.y = start.y
    g.end.x = end.x
    g.end.y = end.y

    const refresh = () => {
      mid.set((start.x + end.x) / 2, (start.y + end.y) / 2)
      const dist = dist2(start, end)
      badge.textContent = this._view.formatLength(dist)
      this._placeDomAt(badge, mid)
      g.start.x = start.x
      g.start.y = start.y
      g.end.x = end.x
      g.end.y = end.y
      for (const fn of this._redrawListeners) fn()
      this._view.render()
      return dist
    }

    const isEnabled = () => this._gripsEnabled()
    const onSelect = () => this._selectOnly(id)
    const onCommit = () => {
      const dist = refresh()
      this._touchMeasureGeometry(id, 'length', dist)
    }
    parts.cleanups.push(
      acexBindMarkupPointerDrag({
        el: startDot,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled,
        onPointerDown: onSelect,
        onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
        onMove: world => {
          start.set(world.x, world.y)
          this._placeDomAt(startDot, world)
          refresh()
        },
        onCommit
      }),
      acexBindMarkupPointerDrag({
        el: endDot,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled,
        onPointerDown: onSelect,
        onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
        onMove: world => {
          end.set(world.x, world.y)
          this._placeDomAt(endDot, world)
          refresh()
        },
        onCommit
      })
    )
    this._syncGripPointerEvents()
  }

  /**
   * Continuous tool: successive vertices until Enter/Esc.
   * @internal
   */
  private _pointerContinuous(
    point: THREE.Vector2,
    _clientX: number,
    _clientY: number
  ): boolean {
    if (this._points.length >= 1) {
      const last = this._points[this._points.length - 1]!
      if (dist2(last, point) < 1e-9) return true
    }
    this._points.push(point.clone())
    // Confirmed segments stay visible; rubber-band waits for the next live pick.
    this._previewContinuous(null)
    return true
  }

  /**
   * Continuous tool preview: confirmed vertices, plus optional rubber-band to
   * a live cursor sample.
   *
   * @param point - Live cursor in WCS, or `null` to show only confirmed segments.
   * @internal
   */
  private _previewContinuous(point: THREE.Vector2 | null): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const pts = point != null ? [...this._points, point] : [...this._points]
    if (pts.length < 2) {
      this._hidePreview()
      return
    }
    this._setPreviewLine(pts, { segmentArrows: true })
    const items: Array<{ wcs: THREE.Vector2; text: string }> = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      const dist = dist2(a, b)
      if (dist < 1e-4) continue
      items.push({
        wcs: new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2),
        text: this._view.formatLength(dist)
      })
    }
    this._syncPreviewBadges(items)
    this._requestRender()
  }

  /**
   * Persists each consecutive pair as a normal distance measurement, then
   * reports the polyline total length in the status bar.
   * @internal
   */
  private _commitContinuous(pointsIn: THREE.Vector2[]): void {
    if (pointsIn.length < 2) return
    let total = 0
    for (let i = 0; i < pointsIn.length - 1; i++) {
      const a = pointsIn[i]!
      const b = pointsIn[i + 1]!
      const segment = dist2(a, b)
      if (segment < 1e-4) continue
      total += segment
      this._commitDistance(a, b)
    }
    this._statusEl.textContent = this._i18n.t('status.continuousTotal', {
      value: this._view.formatLength(total)
    })
  }

  /**
   * Angle tool: vertex, arm1, arm2 (three clicks), then {@link _commitAngle}.
   * @internal
   */
  private _pointerAngle(
    point: THREE.Vector2,
    _clientX: number,
    _clientY: number
  ): boolean {
    this._points.push(point.clone())
    if (this._points.length < 3) {
      this._previewAngleCommitted()
      return true
    }
    const vertex = this._points[0]!
    const arm1 = this._points[1]!
    const arm2 = this._points[2]!
    this._commitAngle(vertex, arm1, arm2)
    this._points = []
    this._hidePreview()
    this._exitCreateModeKeepStatus()
    return true
  }

  /** Angle tool live preview (arms + arc canvas + bisector capsule). @internal */
  private _previewAngle(point: THREE.Vector2): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const vertex = this._points[0]!
    if (this._points.length === 1) {
      this._setPreviewLine([vertex, point])
      this._syncPreviewBadges([])
      this._requestRender()
      return
    }
    const arm1 = this._points[1]!
    this._setPreviewLine([vertex, arm1, vertex, point])
    const deg = calcAngleDeg(vertex, arm1, point)
    this._syncPreviewBadges([
      {
        wcs: angleBadgeWorld(vertex, arm1, point),
        text: this._view.formatAngle(deg)
      }
    ])
    this._drawPreviewAngleArc(vertex, arm1, point)
    this._requestRender()
  }

  /** Confirmed angle arms only (no rubber-band to the next pick). @internal */
  private _previewAngleCommitted(): void {
    if (this._points.length < 2) {
      this._hidePreview()
      return
    }
    const vertex = this._points[0]!
    const arm1 = this._points[1]!
    this._setPreviewLine([vertex, arm1])
    this._syncPreviewBadges([])
    this._overlayLayer
      .querySelectorAll('.mlcad-measure-canvas--preview')
      .forEach(el => el.remove())
    this._requestRender()
  }

  /**
   * Persists an angle measurement: two arms, arc canvas, dots, bisector badge.
   * @internal
   */
  private _commitAngle(
    vertexIn: THREE.Vector2,
    arm1In: THREE.Vector2,
    arm2In: THREE.Vector2,
    existing?: AcExMeasurementRecord
  ): void {
    const vertex = vertexIn.clone()
    const arm1 = arm1In.clone()
    const arm2 = arm2In.clone()
    const deg = calcAngleDeg(vertex, arm1, arm2)
    const id = this._startCommit(existing?.id)
    this._addPersistentLine([vertex, arm1])
    this._addPersistentLine([vertex, arm2])
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const commitId = id
    const redraw = () => {
      const style = this._styleForCommit(commitId)
      this._drawAngleArc(
        canvas,
        vertex,
        arm1,
        arm2,
        style.color,
        acexMeasureCanvasLineWidth(style.lineWeight),
        style.strokeWidthWcs
      )
    }
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    const dotV = this._addDot(vertex)
    const dot1 = this._addDot(arm1)
    const dot2 = this._addDot(arm2)

    const badgePos = angleBadgeWorld(vertex, arm1, arm2)
    const badge = this._addBadge(badgePos, this._view.formatAngle(deg))
    const record =
      existing ??
      this._makeRecord(id, 'angle', {
        type: 'angle',
        vertex: { x: vertex.x, y: vertex.y },
        arm1: { x: arm1.x, y: arm1.y },
        arm2: { x: arm2.x, y: arm2.y }
      })
    this._finishCommit(
      (clientX, clientY, threshold) =>
        hitTestAngleMeasure(
          clientX,
          clientY,
          threshold,
          vertex,
          arm1,
          arm2,
          badgePos,
          wcs => this._view.wcsToScreen(wcs)
        ),
      null,
      0,
      record
    )
    this._bindAngleGrips(
      id,
      record,
      vertex,
      arm1,
      arm2,
      badgePos,
      dotV,
      dot1,
      dot2,
      badge
    )
    this._statusEl.textContent = this._i18n.t('status.angle', {
      value: this._view.formatAngle(deg)
    })
  }

  /** Endpoint grips for an angle measurement. @internal */
  private _bindAngleGrips(
    id: string,
    record: AcExMeasurementRecord,
    vertex: THREE.Vector2,
    arm1: THREE.Vector2,
    arm2: THREE.Vector2,
    badgePos: THREE.Vector2,
    dotV: HTMLElement,
    dot1: HTMLElement,
    dot2: HTMLElement,
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'angle') return

    const syncRecord = () => {
      g.vertex.x = vertex.x
      g.vertex.y = vertex.y
      g.arm1.x = arm1.x
      g.arm1.y = arm1.y
      g.arm2.x = arm2.x
      g.arm2.y = arm2.y
    }

    const refresh = () => {
      const next = angleBadgeWorld(vertex, arm1, arm2)
      badgePos.set(next.x, next.y)
      const deg = calcAngleDeg(vertex, arm1, arm2)
      badge.textContent = this._view.formatAngle(deg)
      this._placeDomAt(badge, badgePos)
      syncRecord()
      for (const fn of this._redrawListeners) fn()
      this._view.render()
      return deg
    }

    const isEnabled = () => this._gripsEnabled()
    const onSelect = () => this._selectOnly(id)
    const onCommit = () => {
      refresh()
      this._touchMeasureGeometry(id, null, 0)
    }
    const bind = (el: HTMLElement, target: THREE.Vector2) =>
      acexBindMarkupPointerDrag({
        el,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled,
        onPointerDown: onSelect,
        onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
        onMove: world => {
          target.set(world.x, world.y)
          this._placeDomAt(el, world)
          refresh()
        },
        onCommit
      })

    parts.cleanups.push(bind(dotV, vertex), bind(dot1, arm1), bind(dot2, arm2))
    this._syncGripPointerEvents()
  }

  /** Clears locked-arc direction state (Ctrl flip and mouse-follow). @internal */
  private _resetArcLockDirection(): void {
    this._arcLockFlip = false
    this._arcLockClockwise = null
    this._arcLockLastAngle = 0
  }

  /**
   * Locks CW vs CCW from the first significant cursor move around the
   * locked circle, then keeps that side so the sweep can pass 180°.
   * @internal
   */
  private _trackArcLockDirection(end: THREE.Vector2): void {
    if (!this._arcLock) return
    const angle = Math.atan2(end.y - this._arcLock.cy, end.x - this._arcLock.cx)
    if (this._arcLockClockwise == null) {
      const delta = wrapAngleToPi(angle - this._arcLockLastAngle)
      if (Math.abs(delta) > ACEX_ARC_DIR_LOCK_RAD) {
        this._arcLockClockwise = delta < 0
      }
    }
    this._arcLockLastAngle = angle
  }

  /**
   * Effective locked-arc direction: mouse-chosen side XOR Ctrl/⌘ flip.
   * @internal
   */
  private _lockedClockwise(): boolean {
    return (this._arcLockClockwise ?? false) !== this._arcLockFlip
  }

  /**
   * After the start lands on a shared polyline vertex, move the lock onto
   * whichever bulge through that vertex the cursor is closer to.
   * @internal
   */
  private _rebindArcLock(raw: THREE.Vector2): void {
    const start = this._points[0]
    const current = this._arcLock
    if (!start || !current) return
    const near = this._view.findCircleOrArcNear?.(raw.x, raw.y)
    if (!near || !(near.r > 0) || !pointLiesOnCircle(start, near)) return
    if (sameCircleGeom(current, near)) return
    this._arcLock = { cx: near.cx, cy: near.cy, r: near.r }
    this._arcLockClockwise = null
    this._arcLockLastAngle = Math.atan2(start.y - near.cy, start.x - near.cx)
  }

  /**
   * Arc tool: start → (point on arc) → end.
   *
   * If the first click lands on a CIRCLE or ARC, the circle is locked and the
   * next click is the end point. Sweep direction follows the cursor so arcs
   * greater than 180 degrees stay on the same side; Ctrl / ⌘ flips to the
   * complementary sweep. Otherwise three free points define the arc.
   * @internal
   */
  private _pointerArc(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    if (this._points.length === 0) {
      const raw = this._view.screenToWcs(clientX, clientY)
      const lock =
        this._view.findCircleOrArcNear?.(raw.x, raw.y) ??
        this._view.findCircleOrArcNear?.(point.x, point.y)
      if (lock && lock.r > 0) {
        this._arcLock = { cx: lock.cx, cy: lock.cy, r: lock.r }
        this._resetArcLockDirection()
        const start = pointLiesOnCircle(point, lock)
          ? point.clone()
          : new THREE.Vector2(lock.x, lock.y)
        this._arcLockLastAngle = Math.atan2(
          start.y - lock.cy,
          start.x - lock.cx
        )
        this._points.push(start)
        this._previewArcCommitted()
        return true
      }
      this._arcLock = null
      this._resetArcLockDirection()
      this._points.push(point.clone())
      this._previewArcCommitted()
      return true
    }

    if (this._arcLock) {
      const start = this._points[0]!
      const raw = this._view.screenToWcs(clientX, clientY)
      this._rebindArcLock(raw)
      const geom = this._arcLock
      if (!geom) {
        this._points = []
        this._resetArcLockDirection()
        this._hidePreview()
        this._statusEl.textContent = this._hintForMode('arc')
        return true
      }
      const end = snapPointToCircle(raw, geom)
      this._trackArcLockDirection(end)
      const sweep = lockedSweep(start, end, geom, this._lockedClockwise())
      if (!sweep) {
        this._points = []
        this._arcLock = null
        this._resetArcLockDirection()
        this._hidePreview()
        this._statusEl.textContent = this._hintForMode('arc')
        return true
      }
      this._commitArc(geom, start, sweep.through, end)
      this._points = []
      this._arcLock = null
      this._resetArcLockDirection()
      this._hidePreview()
      this._exitCreateModeKeepStatus()
      return true
    }

    this._points.push(point.clone())
    if (this._points.length < 3) {
      this._previewArcCommitted()
      return true
    }
    const start = this._points[0]!
    const through = this._points[1]!
    const end = this._points[2]!
    const geom = circleFromThreePoints(start, through, end)
    if (!geom) {
      this._points = []
      this._hidePreview()
      this._statusEl.textContent = this._hintForMode('arc')
      return true
    }
    this._commitArc(geom, start, through, end)
    this._points = []
    this._hidePreview()
    this._exitCreateModeKeepStatus()
    return true
  }

  /** Arc tool live preview (chord lines or arc stroke + length capsule). @internal */
  private _previewArc(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const start = this._points[0]!
    if (this._arcLock && this._points.length === 1) {
      // Raw cursor (not OSNAP) so nearby bulge rebinding follows the finger/mouse.
      const raw = this._view.screenToWcs(clientX, clientY)
      this._rebindArcLock(raw)
      const geom = this._arcLock
      if (!geom) {
        this._hidePreview()
        return
      }
      const end = snapPointToCircle(raw, geom)
      this._trackArcLockDirection(end)
      const sweep = lockedSweep(start, end, geom, this._lockedClockwise())
      this._overlayLayer
        .querySelectorAll('.mlcad-measure-canvas--preview-line')
        .forEach(el => el.remove())
      if (!sweep) {
        this._syncPreviewBadges([])
        this._overlayLayer
          .querySelectorAll('.mlcad-measure-canvas--preview')
          .forEach(el => el.remove())
        this._requestRender()
        return
      }
      this._syncPreviewBadges([
        {
          wcs: sweep.through,
          text: this._view.formatLength(sweep.length)
        }
      ])
      this._drawPreviewArc(geom, start, sweep.through, end)
      this._requestRender()
      return
    }
    if (this._points.length === 1) {
      this._setPreviewLine([start, point])
      this._syncPreviewBadges([])
      this._requestRender()
      return
    }
    const through = this._points[1]!
    const geom = circleFromThreePoints(start, through, point)
    if (!geom) {
      this._setPreviewLine([start, through, point])
      this._syncPreviewBadges([])
      this._overlayLayer
        .querySelectorAll('.mlcad-measure-canvas--preview')
        .forEach(el => el.remove())
      this._requestRender()
      return
    }
    const len = arcLengthThroughMiddle(start, through, point, geom)
    const mid = arcMidThroughMiddle(start, through, point, geom)
    this._syncPreviewBadges([
      {
        wcs: mid,
        text: this._view.formatLength(len)
      }
    ])
    this._drawPreviewArc(geom, start, through, point)
    this._requestRender()
  }

  /** Confirmed arc chords only (no rubber-band to the next pick). @internal */
  private _previewArcCommitted(): void {
    if (this._points.length < 2) {
      this._hidePreview()
      return
    }
    const start = this._points[0]!
    const through = this._points[1]!
    this._setPreviewLine([start, through])
    this._syncPreviewBadges([])
    this._overlayLayer
      .querySelectorAll('.mlcad-measure-canvas--preview')
      .forEach(el => el.remove())
    this._requestRender()
  }

  /**
   * Persists an arc-length measurement: arc canvas, three dots, midpoint badge.
   * @internal
   */
  private _commitArc(
    geomIn: AcExCircleGeom,
    startIn: THREE.Vector2,
    throughIn: THREE.Vector2,
    endIn: THREE.Vector2,
    existing?: AcExMeasurementRecord
  ): void {
    const geom = { ...geomIn }
    const start = startIn.clone()
    const through = throughIn.clone()
    const end = endIn.clone()
    const len = arcLengthThroughMiddle(start, through, end, geom)
    const mid = arcMidThroughMiddle(start, through, end, geom)
    const id = this._startCommit(existing?.id)
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const redraw = () => {
      const style = this._styleForCommit(id)
      this._drawArc(
        canvas,
        geom,
        start,
        through,
        end,
        style.color,
        acexMeasureCanvasLineWidth(style.lineWeight),
        style.strokeWidthWcs
      )
    }
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    const dot1 = this._addDot(start)
    const dotThrough = this._addDot(through)
    const dot2 = this._addDot(end)
    const badge = this._addBadge(mid, this._view.formatLength(len))
    const record =
      existing ??
      this._makeRecord(id, 'arc', {
        type: 'arc',
        center: { x: geom.cx, y: geom.cy },
        radius: geom.r,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        through: { x: through.x, y: through.y }
      })
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const sc = this._view.wcsToScreen(new THREE.Vector2(geom.cx, geom.cy))
        const ss = this._view.wcsToScreen(start)
        const se = this._view.wcsToScreen(end)
        const st = this._view.wcsToScreen(through)
        const cx = sc.x
        const cy = sc.y
        const screenR = Math.hypot(ss.x - cx, ss.y - cy)
        const sa = Math.atan2(ss.y - cy, ss.x - cx)
        const ea = Math.atan2(se.y - cy, se.x - cx)
        const midA = Math.atan2(st.y - cy, st.x - cx)
        const antiClockwise = !isAngleOnSweep(sa, midA, ea)
        return (
          distPointToArcPx(
            clientX,
            clientY,
            cx,
            cy,
            screenR,
            sa,
            ea,
            antiClockwise
          ) <= threshold
        )
      },
      'length',
      len,
      record
    )
    this._bindArcGrips(
      id,
      record,
      geom,
      start,
      through,
      end,
      mid,
      dot1,
      dotThrough,
      dot2,
      badge
    )
    const sweep = arcSweepThroughMiddle(start, through, end, geom)
    const angleDeg = (Math.abs(sweep.span) * 180) / Math.PI
    const chord = dist2(start, end)
    this._statusEl.textContent = this._i18n.t('status.arcLength', {
      length: this._view.formatLength(len),
      radius: this._view.formatLength(geom.r),
      angle: this._view.formatAngle(angleDeg),
      chord: this._view.formatLength(chord)
    })
  }

  /** Endpoint grips for a three-point arc measurement. @internal */
  private _bindArcGrips(
    id: string,
    record: AcExMeasurementRecord,
    geom: AcExCircleGeom,
    start: THREE.Vector2,
    through: THREE.Vector2,
    end: THREE.Vector2,
    mid: THREE.Vector2,
    startDot: HTMLElement,
    throughDot: HTMLElement,
    endDot: HTMLElement,
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'arc') return

    const syncGeom = () => {
      const next = circleFromThreePoints(start, through, end)
      if (!next) return false
      geom.cx = next.cx
      geom.cy = next.cy
      geom.r = next.r
      return true
    }

    let dragStart = {
      start: start.clone(),
      through: through.clone(),
      end: end.clone(),
      geom: { ...geom }
    }

    const refresh = () => {
      if (!syncGeom()) {
        // Dots already moved; drop the stale circumcircle and length until
        // the three points define a circle again (or the drag is reverted).
        badge.textContent = this._view.formatLength(0)
        this._placeDomAt(badge, start)
        for (const fn of this._redrawListeners) fn()
        this._view.render()
        return 0
      }
      const len = arcLengthThroughMiddle(start, through, end, geom)
      const nextMid = arcMidThroughMiddle(start, through, end, geom)
      mid.copy(nextMid)
      badge.textContent = this._view.formatLength(len)
      this._placeDomAt(badge, mid)
      g.center.x = geom.cx
      g.center.y = geom.cy
      g.radius = geom.r
      g.start.x = start.x
      g.start.y = start.y
      g.end.x = end.x
      g.end.y = end.y
      if (g.through) {
        g.through.x = through.x
        g.through.y = through.y
      }
      for (const fn of this._redrawListeners) fn()
      this._view.render()
      return len
    }

    const restoreDragStart = () => {
      start.copy(dragStart.start)
      through.copy(dragStart.through)
      end.copy(dragStart.end)
      geom.cx = dragStart.geom.cx
      geom.cy = dragStart.geom.cy
      geom.r = dragStart.geom.r
      this._placeDomAt(startDot, start)
      this._placeDomAt(throughDot, through)
      this._placeDomAt(endDot, end)
      refresh()
    }

    const isEnabled = () => this._gripsEnabled()
    const onSelect = () => this._selectOnly(id)
    const onCommit = () => {
      if (!syncGeom()) {
        restoreDragStart()
        this._hideOsnapMarker()
        return
      }
      const len = refresh()
      this._touchMeasureGeometry(id, 'length', len)
    }
    const bind = (el: HTMLElement, target: THREE.Vector2) =>
      acexBindMarkupPointerDrag({
        el,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled,
        onPointerDown: onSelect,
        onDragStart: () => {
          this._sessionHistory?.beginMeasureCapture()
          dragStart = {
            start: start.clone(),
            through: through.clone(),
            end: end.clone(),
            geom: { ...geom }
          }
        },
        onMove: world => {
          target.set(world.x, world.y)
          this._placeDomAt(el, world)
          refresh()
        },
        onCommit
      })

    parts.cleanups.push(
      bind(startDot, start),
      bind(throughDot, through),
      bind(endDot, end)
    )
    this._syncGripPointerEvents()
  }

  /**
   * Commits an arc from sidecar geometry (short arc; no through point).
   * @internal
   */
  private _commitShortArc(record: AcExMeasurementRecord): void {
    if (record.geometry.type !== 'arc') return
    const g = record.geometry
    const geom: AcExCircleGeom = {
      cx: g.center.x,
      cy: g.center.y,
      r: g.radius
    }
    const start = new THREE.Vector2(g.start.x, g.start.y)
    const end = new THREE.Vector2(g.end.x, g.end.y)
    const len = shortArcLength(start, end, geom)
    const mid = shortArcMid(start, end, geom)
    this._startCommit(record.id)
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const commitId = record.id
    const redraw = () => {
      const style = this._styleForCommit(commitId)
      this._drawShortArc(
        canvas,
        geom,
        start,
        end,
        style.color,
        acexMeasureCanvasLineWidth(style.lineWeight),
        style.strokeWidthWcs
      )
    }
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())
    const dot1 = this._addDot(start)
    const dot2 = this._addDot(end)
    const badge = this._addBadge(mid, this._view.formatLength(len))
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const sc = this._view.wcsToScreen(new THREE.Vector2(geom.cx, geom.cy))
        const ss = this._view.wcsToScreen(start)
        const se = this._view.wcsToScreen(end)
        const cx = sc.x
        const cy = sc.y
        const screenR = Math.hypot(ss.x - cx, ss.y - cy)
        const sa = Math.atan2(ss.y - cy, ss.x - cx)
        const ea = Math.atan2(se.y - cy, se.x - cx)
        const ccw = shortArcCounterClockwise(start, end, geom)
        return (
          distPointToArcPx(clientX, clientY, cx, cy, screenR, sa, ea, ccw) <=
          threshold
        )
      },
      'length',
      len,
      record
    )
    this._bindShortArcGrips(
      record.id,
      record,
      geom,
      start,
      end,
      mid,
      dot1,
      dot2,
      badge
    )
  }

  /** Endpoint grips for a legacy short arc (constrained to the circle). @internal */
  private _bindShortArcGrips(
    id: string,
    record: AcExMeasurementRecord,
    geom: AcExCircleGeom,
    start: THREE.Vector2,
    end: THREE.Vector2,
    mid: THREE.Vector2,
    startDot: HTMLElement,
    endDot: HTMLElement,
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'arc') return

    const project = (point: { x: number; y: number }): THREE.Vector2 => {
      const dx = point.x - geom.cx
      const dy = point.y - geom.cy
      const len = Math.hypot(dx, dy)
      if (!(len > 1e-12)) {
        return new THREE.Vector2(geom.cx + geom.r, geom.cy)
      }
      const s = geom.r / len
      return new THREE.Vector2(geom.cx + dx * s, geom.cy + dy * s)
    }

    const refresh = () => {
      const len = shortArcLength(start, end, geom)
      mid.copy(shortArcMid(start, end, geom))
      badge.textContent = this._view.formatLength(len)
      this._placeDomAt(badge, mid)
      g.start.x = start.x
      g.start.y = start.y
      g.end.x = end.x
      g.end.y = end.y
      for (const fn of this._redrawListeners) fn()
      this._view.render()
      return len
    }

    const isEnabled = () => this._gripsEnabled()
    const onSelect = () => this._selectOnly(id)
    const onCommit = () => {
      const len = refresh()
      this._touchMeasureGeometry(id, 'length', len)
    }
    const bind = (el: HTMLElement, target: THREE.Vector2) =>
      acexBindMarkupPointerDrag({
        el,
        clientToWorld: (x, y) => this._clientToWorld(x, y),
        isEnabled,
        onPointerDown: onSelect,
        onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
        onMove: world => {
          const projected = project(world)
          target.copy(projected)
          this._placeDomAt(el, projected)
          refresh()
        },
        onCommit
      })

    parts.cleanups.push(bind(startDot, start), bind(endDot, end))
    this._syncGripPointerEvents()
  }

  /**
   * Area tool: successive vertices; closes near first point or on edge crossing.
   * @internal
   */
  private _pointerArea(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    if (this._points.length >= 3) {
      const first = this._points[0]!
      const firstScreen = this._view.wcsToScreen(first)
      const dx = clientX - firstScreen.x
      const dy = clientY - firstScreen.y
      if (Math.hypot(dx, dy) <= this._areaCloseThresholdPx) {
        this._commitArea([...this._points])
        this._points = []
        this._hidePreview()
        this._exitCreateModeKeepStatus()
        return true
      }
    }

    if (this._points.length >= 1) {
      const last = this._points[this._points.length - 1]!
      if (dist2(last, point) < 1e-9) return true

      if (this._points.length >= 3) {
        for (let i = 0; i < this._points.length - 2; i++) {
          if (
            segmentsIntersect(
              last,
              point,
              this._points[i]!,
              this._points[i + 1]!
            )
          ) {
            this._commitArea([...this._points])
            this._points = []
            this._hidePreview()
            this._exitCreateModeKeepStatus()
            return true
          }
        }
      }
    }

    this._points.push(point.clone())
    this._previewArea(null)
    return true
  }

  /**
   * Area tool preview: confirmed vertices, plus optional rubber-band / fill to
   * a live cursor sample. Value capsule sits at the polygon centroid.
   *
   * @param point - Live cursor in WCS, or `null` for confirmed outline only.
   * @internal
   */
  private _previewArea(point: THREE.Vector2 | null): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const pts = point != null ? [...this._points, point] : [...this._points]
    if (pts.length < 2) {
      this._hidePreview()
      return
    }
    this._setPreviewLine(pts)
    if (pts.length >= 3) {
      const area = shoelaceArea(pts)
      if (point != null) {
        this._syncPreviewBadges([
          {
            wcs: centroid(pts),
            text: `${this._view.formatLength(area)}²`
          }
        ])
      } else {
        this._syncPreviewBadges([])
      }
      this._drawPreviewArea(pts)
    } else {
      this._syncPreviewBadges([])
      this._overlayLayer
        .querySelectorAll('.mlcad-measure-canvas--preview')
        .forEach(el => el.remove())
    }
    this._requestRender()
  }

  /**
   * Persists an area measurement: boundary line, fill canvas, vertex dots, badge.
   * @internal
   */
  private _commitArea(
    pointsIn: THREE.Vector2[],
    existing?: AcExMeasurementRecord
  ): void {
    if (pointsIn.length < 3) return
    const points = pointsIn.map(p => p.clone())
    const area = shoelaceArea(points)
    const id = this._startCommit(existing?.id)
    // Outline stroke comes from the area canvas (fill + stroke).
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const redraw = () => {
      const style = this._styleForCommit(id)
      this._drawAreaFill(
        canvas,
        points,
        style.color,
        acexMeasureCanvasLineWidth(style.lineWeight),
        style.strokeWidthWcs
      )
    }
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    const dots = points.map(p => this._addDot(p))
    const mid = centroid(points)
    const badge = this._addBadge(mid, `${this._view.formatLength(area)}²`)
    const record =
      existing ??
      this._makeRecord(id, 'area', {
        type: 'area',
        points: points.map(p => ({ x: p.x, y: p.y }))
      })
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const poly = this._screenPolyline(points)
        if (pointInPolygonPx(clientX, clientY, poly)) return true
        const closedPoly = [...poly, poly[0]!]
        return distPointToPolylinePx(clientX, clientY, closedPoly) <= threshold
      },
      'area',
      area,
      record
    )
    this._bindAreaGrips(id, record, points, mid, dots, badge)
    this._statusEl.textContent = this._i18n.t('status.area', {
      value: `${this._view.formatLength(area)}²`
    })
  }

  /** Vertex grips for an area measurement. @internal */
  private _bindAreaGrips(
    id: string,
    record: AcExMeasurementRecord,
    points: THREE.Vector2[],
    mid: THREE.Vector2,
    dots: HTMLElement[],
    badge: HTMLElement
  ): void {
    const parts = this._committed.find(m => m.id === id)?.parts
    if (!parts) return
    const g = record.geometry
    if (g.type !== 'area') return

    const refresh = () => {
      const area = shoelaceArea(points)
      mid.copy(centroid(points))
      badge.textContent = `${this._view.formatLength(area)}²`
      this._placeDomAt(badge, mid)
      for (let i = 0; i < points.length; i++) {
        const p = points[i]!
        const gp = g.points[i]
        if (gp) {
          gp.x = p.x
          gp.y = p.y
        }
      }
      for (const fn of this._redrawListeners) fn()
      this._view.render()
      return area
    }

    const isEnabled = () => this._gripsEnabled()
    const onSelect = () => this._selectOnly(id)
    const onCommit = () => {
      const area = refresh()
      this._touchMeasureGeometry(id, 'area', area)
    }

    for (let i = 0; i < dots.length; i++) {
      const index = i
      const dot = dots[index]!
      const target = points[index]!
      parts.cleanups.push(
        acexBindMarkupPointerDrag({
          el: dot,
          clientToWorld: (x, y) => this._clientToWorld(x, y),
          isEnabled,
          onPointerDown: onSelect,
          onDragStart: () => this._sessionHistory?.beginMeasureCapture(),
          onMove: world => {
            target.set(world.x, world.y)
            this._placeDomAt(dot, world)
            refresh()
          },
          onCommit
        })
      )
    }
    this._syncGripPointerEvents()
  }

  /**
   * Adds a committed polyline as a style-aware canvas overlay (color + line weight).
   * @internal
   */
  private _addPersistentLine(
    points: THREE.Vector2[],
    options?: { bothArrows?: boolean }
  ): void {
    if (points.length < 2) return
    const parts = this._commitParts
    if (!parts) return
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const commitId = parts.id
    // Keep the caller's Vector2 refs so grip edits can mutate them in place.
    const pts = points
    const bothArrows = options?.bothArrows === true
    const redraw = () => {
      const style = this._styleForCommit(commitId)
      this._drawPolyline(
        canvas,
        pts,
        style.color || this._measureCss(),
        acexMeasureCanvasLineWidth(style.lineWeight),
        style.strokeWidthWcs,
        bothArrows,
        bothArrows,
        style.arrowSizeWcs
      )
    }
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())
  }

  /** Place a measure DOM overlay at a world XY point. @internal */
  private _placeDomAt(el: HTMLElement, wcs: { x: number; y: number }): void {
    el.dataset.wcsX = String(wcs.x)
    el.dataset.wcsY = String(wcs.y)
    if (el.classList.contains('mlcad-measure-badge--preview')) {
      this._syncLiveDomTextHeight(el)
    }
    const screen = this._view.wcsToScreen(new THREE.Vector2(wcs.x, wcs.y))
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    acexPositionWcsOverlay(el, screen, rootRect, this._view.getCameraZoom())
  }

  /** Apply session text-height mode to a live preview badge. @internal */
  private _syncLiveDomTextHeight(el: HTMLElement): void {
    acexSyncLiveOverlayTextHeight(
      this._view.getCameraZoom(),
      p => this._wcsToScreenPoint(p),
      el,
      {
        fontSize: this._drawFontSize,
        textHeightMode: this._drawTextHeightMode,
        textHeightWcs: this._drawCustomTextHeightWcs
      }
    )
  }

  /** Replace selection with a single measurement (grip edit). @internal */
  private _selectOnly(id: string): void {
    if (!(this._selectedIds.size === 1 && this._selectedIds.has(id))) {
      this._deselect(false)
    }
    this._selectedIds.add(id)
    const measure = this._committed.find(m => m.id === id)
    if (measure) this._applyMeasureSelection(measure, true)
    this._onStyleChange?.()
    this._notifyRecordsChanged()
  }

  /** Client → world converter for grip hosts (object snap applied). @internal */
  private _clientToWorld(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const p = this._resolvePointerWithOsnap(clientX, clientY)
    return { x: p.x, y: p.y }
  }

  private _hideOsnapMarker(): void {
    this._osnapCache = null
    this._onOsnapMarker(null, null)
  }

  /** True when committed endpoint grips may receive pointer events. @internal */
  private _gripsEnabled(): boolean {
    return !this._peerToolActive && this._mode === null
  }

  /**
   * Enables or disables pointer hits on measurement endpoint dots.
   * Inline `pointer-events` from grip binding otherwise steal OSNAP clicks.
   * @internal
   */
  private _syncGripPointerEvents(): void {
    const enable = this._gripsEnabled()
    for (const measure of this._committed) {
      const selected = this._selectedIds.has(measure.id)
      for (const el of measure.parts.dom) {
        if (!el.classList.contains('mlcad-measure-dot')) continue
        el.style.pointerEvents = enable && selected ? 'auto' : 'none'
      }
    }
  }

  /**
   * Sync sidecar geometry + quantity after a grip edit.
   * @internal
   */
  private _touchMeasureGeometry(
    id: string,
    quantity: AcExMeasureQuantity | null,
    value: number
  ): void {
    this._hideOsnapMarker()
    const measure = this._committed.find(m => m.id === id)
    if (!measure) return
    measure.quantity = quantity
    measure.value = value
    this._onStyleChange?.()
    this._updateIdleStatus()
    this._sessionHistory?.commitMeasureCapture('Edit Measurement')
  }

  /** Draws a WCS polyline on a synced overlay canvas. @internal */
  private _drawPolyline(
    canvas: HTMLCanvasElement,
    points: THREE.Vector2[],
    strokeCss: string,
    lineWidth: number,
    strokeWidthWcs?: number,
    bothArrows = false,
    scaleArrowsWithView = false,
    arrowSizeWcs?: number,
    segmentArrows = false
  ): void {
    if (points.length < 2) return
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, dpr } = synced
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)
    const rootRect = this._overlayRootOffset()
    const screen: { x: number; y: number }[] = []
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const s = this._view.wcsToScreen(points[i]!)
      const x = s.x - rootRect.left
      const y = s.y - rootRect.top
      screen.push({ x, y })
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = strokeCss
    const scaled = this._scaledCanvasLineWidth(
      lineWidth,
      canvas,
      strokeWidthWcs
    )
    ctx.lineWidth = scaled
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    const drawArrows = segmentArrows
      ? screen.length >= 2
      : bothArrows && screen.length === 2
    if (drawArrows) {
      const arrowSize = scaleArrowsWithView
        ? acexScaledOverlayArrowSize(
            canvas,
            p => this._wcsToScreenPoint(p),
            arrowSizeWcs
          )
        : acexOverlayArrowSize(scaled, lineWidth)
      const last = segmentArrows ? screen.length - 1 : 1
      for (let i = 0; i < last; i++) {
        const a = screen[i]!
        const b = screen[i + 1]!
        if (Math.hypot(b.x - a.x, b.y - a.y) >= arrowSize) {
          acexDrawMarkupArrowHead(ctx, b, a, strokeCss, arrowSize)
          acexDrawMarkupArrowHead(ctx, a, b, strokeCss, arrowSize)
        }
      }
    }
    ctx.restore()
  }

  /** Adds a DOM endpoint dot tracked in WCS via dataset attributes. @internal */
  private _addDot(wcs: THREE.Vector2): HTMLDivElement {
    const dot = makeDotEl()
    dot.dataset.wcsX = String(wcs.x)
    dot.dataset.wcsY = String(wcs.y)
    const css = this._commitCss()
    if (css) dot.style.background = css
    this._overlayLayer.appendChild(dot)
    this._positionDomOverlays()
    this._trackDom(dot)
    return dot
  }

  /** Adds a DOM value badge at a WCS anchor. @internal */
  private _addBadge(wcs: THREE.Vector2, text: string): HTMLDivElement {
    const badge = makeBadgeEl(text)
    badge.dataset.wcsX = String(wcs.x)
    badge.dataset.wcsY = String(wcs.y)
    const css = this._commitCss()
    if (css) {
      badge.style.color = css
      badge.style.borderColor = css
    }
    badge.style.fontSize = `${this._commitFontSize()}px`
    this._overlayLayer.appendChild(badge)
    this._positionDomOverlays()
    this._trackDom(badge)
    return badge
  }

  /**
   * Registers a canvas redraw for pan/zoom and ties removal to the active commit.
   * @internal
   */
  private _registerRedraw(redraw: () => void, onRemove: () => void): void {
    this._redrawListeners.push(redraw)
    const parts = this._commitParts
    if (parts) {
      parts.cleanups.push(() => {
        const idx = this._redrawListeners.indexOf(redraw)
        if (idx >= 0) this._redrawListeners.splice(idx, 1)
        onRemove()
      })
    }
  }

  /** @internal */
  private _startCommit(id?: string): string {
    const commitId = id ?? `m${++this._commitCounter}`
    if (!this._commitStyle) {
      this._commitStyle = this._defaultStyle()
    }
    this._commitParts = {
      id: commitId,
      dom: [],
      canvases: [],
      cleanups: []
    }
    return commitId
  }

  /** @internal */
  private _finishCommit(
    hitTest: (clientX: number, clientY: number, thresholdPx: number) => boolean,
    quantity: AcExMeasureQuantity | null,
    value = 0,
    record?: AcExMeasurementRecord
  ): void {
    const parts = this._commitParts
    if (!parts || !record) {
      this._commitParts = null
      this._commitStyle = null
      return
    }
    this._edit('Add Measurement', () => {
      const style = this._ensureStyleWcs(record.style, record.type === 'distance')
      const committedRecord = { ...record, id: parts.id, style }
      this._committed.push({
        id: parts.id,
        record: committedRecord,
        parts,
        hitTest,
        quantity,
        value
      })
      acexSeedOverlaySizesFromWcs(
        this._view.getCameraZoom(),
        p => this._wcsToScreenPoint(p),
        {
          textHeightWcs: style.textHeightWcs,
          arrowSizeWcs: style.arrowSizeWcs,
          fontSizePx: style.fontSize,
          strokeScreenPx: acexMeasureCanvasLineWidth(
            ACEX_MEASUREMENT_LINE_WEIGHT
          ),
          elements: parts.dom,
          canvases: parts.canvases
        }
      )
      this._positionDomOverlays()
      this._commitParts = null
      this._commitStyle = null
      this.syncLayoutVisibility()
      this._notifyRecordsChanged()
    })
  }

  /** Default sidecar style from the current session draw style. @internal */
  private _defaultStyle(): AcExMeasurementSidecarStyle {
    return this._styleWithWcs({
      color: this._measureCss(),
      lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
      fontSize: this._drawFontSize,
      textHeightMode: this._drawTextHeightMode,
      ...(this._drawTextHeightMode === 'custom' &&
      this._drawCustomTextHeightWcs != null &&
      this._drawCustomTextHeightWcs > 0
        ? { textHeightWcs: this._drawCustomTextHeightWcs }
        : {})
    })
  }

  /**
   * Fill any missing world-space sizes without overwriting sidecar values.
   * Never writes strokeWidthWcs (overlay strokes stay hairline).
   * @internal
   */
  private _ensureStyleWcs(
    style: AcExMeasurementSidecarStyle,
    includeArrow = false
  ): AcExMeasurementSidecarStyle {
    const wcsToScreen = (p: { x: number; y: number }) =>
      this._wcsToScreenPoint(p)
    const { strokeWidthWcs: _omit, ...rest } = style
    const arrowSizeWcs =
      style.arrowSizeWcs != null && style.arrowSizeWcs > 0
        ? style.arrowSizeWcs
        : includeArrow
          ? acexScreenPxToWcs(ACEX_OVERLAY_ARROW_SIZE_PX, wcsToScreen)
          : undefined
    return {
      ...rest,
      lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
      textHeightWcs:
        style.textHeightWcs != null && style.textHeightWcs > 0
          ? style.textHeightWcs
          : acexScreenPxToWcs(style.fontSize, wcsToScreen),
      ...(arrowSizeWcs != null && arrowSizeWcs > 0 ? { arrowSizeWcs } : {})
    }
  }

  /** Attach world-space text height from the current view. @internal */
  private _styleWithWcs(
    style: AcExMeasurementSidecarStyle
  ): AcExMeasurementSidecarStyle {
    const wcsToScreen = (p: { x: number; y: number }) =>
      this._wcsToScreenPoint(p)
    const { strokeWidthWcs: _omit, ...rest } = style
    let textHeightWcs: number
    if (
      style.textHeightMode === 'custom' &&
      style.textHeightWcs != null &&
      style.textHeightWcs > 0
    ) {
      textHeightWcs = style.textHeightWcs
    } else if (style.textHeightMode === 'adaptive') {
      textHeightWcs = acexScreenPxToWcs(style.fontSize, wcsToScreen)
    } else if (style.textHeightWcs != null && style.textHeightWcs > 0) {
      textHeightWcs = style.textHeightWcs
    } else {
      textHeightWcs = acexScreenPxToWcs(style.fontSize, wcsToScreen)
    }
    return {
      ...rest,
      lineWeight: ACEX_MEASUREMENT_LINE_WEIGHT,
      textHeightWcs
    }
  }

  /** Maps WCS to screen coordinates for overlay helpers. @internal */
  private _wcsToScreenPoint(p: { x: number; y: number }): {
    x: number
    y: number
  } {
    const s = this._view.wcsToScreen(new THREE.Vector2(p.x, p.y))
    return { x: s.x, y: s.y }
  }

  /**
   * Host-relative CSS pixels for a confirmed-point plus mark.
   * @internal
   */
  private _confirmedPointMarkScreen(p: { x: number; y: number }): {
    x: number
    y: number
  } {
    const screen = this._wcsToScreenPoint(p)
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    return { x: screen.x - rootRect.left, y: screen.y - rootRect.top }
  }

  /**
   * Shows or clears phone/pad plus marks for in-progress `_points`.
   * @internal
   */
  private _syncConfirmedPointMarks(): void {
    if (!this._mode || this._points.length === 0) {
      this._confirmedPointMarks.clear()
      return
    }
    this._confirmedPointMarks.setWorldPoints(this._points)
  }

  /** View-synced canvas stroke width for the current camera. @internal */
  private _scaledCanvasLineWidth(
    baseLineWidth: number,
    canvas: HTMLCanvasElement,
    strokeWidthWcs?: number
  ): number {
    return acexScaledCanvasLineWidth(
      baseLineWidth,
      canvas,
      this._view.getCameraZoom(),
      {
        strokeWidthWcs,
        wcsToScreen: p => this._wcsToScreenPoint(p)
      }
    )
  }

  /** Build a new sidecar record for an interactive commit. @internal */
  private _makeRecord(
    id: string,
    type: AcExMeasurementRecord['type'],
    geometry: AcExMeasurementRecord['geometry']
  ): AcExMeasurementRecord {
    return {
      id,
      type,
      layoutId: this._getActiveLayoutId?.(),
      style: this._defaultStyle(),
      geometry
    }
  }

  /** CSS color for the measurement currently being committed. @internal */
  private _commitCss(): string | null {
    return this._commitStyle?.color ?? null
  }

  /** Badge font size for the measurement currently being committed. @internal */
  private _commitFontSize(): number {
    return this._commitStyle?.fontSize ?? this._drawFontSize
  }

  /** Resolve live style for a committed (or in-progress) measurement id. @internal */
  private _styleForCommit(commitId: string): AcExMeasurementSidecarStyle {
    const measure = this._committed.find(m => m.id === commitId)
    if (measure) return measure.record.style
    return this._commitStyle ?? this._defaultStyle()
  }

  /** Rebuild visuals from a sidecar record (import path). @internal */
  private _publishRecord(record: AcExMeasurementRecord): void {
    this._commitStyle = { ...record.style }
    try {
      const g = record.geometry
      switch (g.type) {
        case 'distance':
          this._commitDistance(
            new THREE.Vector2(g.start.x, g.start.y),
            new THREE.Vector2(g.end.x, g.end.y),
            record
          )
          break
        case 'angle':
          this._commitAngle(
            new THREE.Vector2(g.vertex.x, g.vertex.y),
            new THREE.Vector2(g.arm1.x, g.arm1.y),
            new THREE.Vector2(g.arm2.x, g.arm2.y),
            record
          )
          break
        case 'area':
          this._commitArea(
            g.points.map(p => new THREE.Vector2(p.x, p.y)),
            record
          )
          break
        case 'arc':
          if (g.through) {
            this._commitArc(
              { cx: g.center.x, cy: g.center.y, r: g.radius },
              new THREE.Vector2(g.start.x, g.start.y),
              new THREE.Vector2(g.through.x, g.through.y),
              new THREE.Vector2(g.end.x, g.end.y),
              record
            )
          } else {
            this._commitShortArc(record)
          }
          break
        case 'point':
          this._commitCoordinate(
            new THREE.Vector2(g.position.x, g.position.y),
            record
          )
          break
      }
    } finally {
      this._commitStyle = null
    }
  }

  /** @internal */
  private _trackDom(el: HTMLElement): void {
    const parts = this._commitParts
    if (!parts) return
    parts.dom.push(el)
    parts.cleanups.push(() => el.remove())
  }

  /** @internal */
  private _trackCanvas(canvas: HTMLCanvasElement): void {
    const parts = this._commitParts
    if (!parts) return
    parts.canvases.push(canvas)
  }

  /** @internal */
  private _screenPolyline(points: THREE.Vector2[]): { x: number; y: number }[] {
    return points.map(p => {
      const s = this._view.wcsToScreen(p)
      return { x: s.x, y: s.y }
    })
  }

  /** @internal */
  private _measureHitAt(
    measure: AcExCommittedMeasure,
    clientX: number,
    clientY: number
  ): boolean {
    if (hitTestMeasureDom(measure.parts, clientX, clientY)) {
      return true
    }
    return measure.hitTest(clientX, clientY, MEASURE_HIT_THRESHOLD_PX)
  }

  /** @internal */
  private _pickCommittedMeasure(
    clientX: number,
    clientY: number
  ): AcExCommittedMeasure | null {
    for (let i = this._committed.length - 1; i >= 0; i--) {
      const measure = this._committed[i]!
      if (
        !isRecordOnLayout(measure.record.layoutId, this._getActiveLayoutId?.())
      ) {
        continue
      }
      if (this._measureHitAt(measure, clientX, clientY)) {
        return measure
      }
    }
    return null
  }

  /**
   * Selects a committed measurement under the pointer.
   * Clicking empty space does not change the current selection.
   * @internal
   */
  private _trySelectCommittedAt(clientX: number, clientY: number): boolean {
    if (!this._visible) return false
    const measure = this._pickCommittedMeasure(clientX, clientY)
    if (measure) {
      this._select(measure.id)
      return true
    }
    if (this._selectedIds.size > 0) {
      this._deselect(true)
      return true
    }
    return false
  }

  /** @internal */
  private _select(id: string): void {
    if (this._selectedIds.has(id)) return
    this._selectedIds.add(id)
    const measure = this._committed.find(m => m.id === id)
    if (measure) this._applyMeasureSelection(measure, true)
    this._onStyleChange?.()
    if (!this._mode) this._updateIdleStatus()
    this._view.render()
    this._notifyRecordsChanged()
  }

  /** @internal */
  private _deselect(updateStatus = true): void {
    if (this._selectedIds.size === 0) return
    for (const id of this._selectedIds) {
      const measure = this._committed.find(m => m.id === id)
      if (measure) this._applyMeasureSelection(measure, false)
    }
    this._selectedIds.clear()
    this._onStyleChange?.()
    if (updateStatus && !this._mode) this._updateIdleStatus()
    this._view.render()
    this._notifyRecordsChanged()
  }

  /**
   * Replaces the current measurement selection with `next`.
   *
   * @returns True when the selected id set changed.
   */
  private _replaceSelection(next: Set<string>): boolean {
    if (
      next.size === this._selectedIds.size &&
      [...next].every(id => this._selectedIds.has(id))
    ) {
      return false
    }
    for (const id of this._selectedIds) {
      if (next.has(id)) continue
      const measure = this._committed.find(m => m.id === id)
      if (measure) this._applyMeasureSelection(measure, false)
    }
    for (const id of next) {
      if (this._selectedIds.has(id)) continue
      const measure = this._committed.find(m => m.id === id)
      if (measure) this._applyMeasureSelection(measure, true)
    }
    this._selectedIds.clear()
    for (const id of next) this._selectedIds.add(id)
    this._onStyleChange?.()
    if (!this._mode) this._updateIdleStatus()
    this._view.render()
    this._notifyRecordsChanged()
    return true
  }

  /** @internal */
  private _applyMeasureSelection(
    measure: AcExCommittedMeasure,
    selected: boolean
  ): void {
    const baseHex = cssColorToHex(
      measure.record.style.color,
      this._measureColor
    )
    const baseCss = measure.record.style.color || measureColorToCss(baseHex)
    for (const el of measure.parts.dom) {
      el.classList.toggle('mlcad-measure-selected', selected)
      if (el.classList.contains('mlcad-measure-badge')) {
        el.style.color = baseCss
        el.style.borderColor = baseCss
        if (measure.record.style.fontSize) {
          el.style.fontSize = `${measure.record.style.fontSize}px`
        }
      } else if (el.classList.contains('mlcad-measure-dot')) {
        el.style.background = baseCss
      }
    }
    for (const canvas of measure.parts.canvases) {
      canvas.classList.toggle('mlcad-measure-selected', selected)
    }
    this._syncGripPointerEvents()
  }

  /** Apply style patch to currently selected measurements. @internal */
  private _applyStyleToSelection(patch: {
    color?: string
    fontSize?: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }): void {
    if (this._selectedIds.size === 0) return
    const wcsToScreen = (p: { x: number; y: number }) =>
      this._wcsToScreenPoint(p)
    for (const id of this._selectedIds) {
      const measure = this._committed.find(m => m.id === id)
      if (!measure) continue
      const style = measure.record.style
      if (patch.color) style.color = patch.color
      style.lineWeight = ACEX_MEASUREMENT_LINE_WEIGHT
      style.strokeWidthWcs = undefined

      const mode =
        patch.textHeightMode ?? style.textHeightMode ?? 'adaptive'
      let fontSizeChanged = false

      if (
        mode === 'custom' &&
        patch.textHeightWcs != null &&
        patch.textHeightWcs > 0
      ) {
        style.textHeightMode = 'custom'
        style.textHeightWcs = patch.textHeightWcs
        if (patch.fontSize != null && patch.fontSize > 0) {
          style.fontSize = patch.fontSize
        } else {
          const perPx = acexScreenPxToWcs(1, wcsToScreen)
          if (perPx > 0) {
            style.fontSize = Math.max(
              1,
              Math.round(patch.textHeightWcs / perPx)
            )
          }
        }
        fontSizeChanged = true
      } else if (mode === 'adaptive' && patch.textHeightMode === 'adaptive') {
        style.textHeightMode = 'adaptive'
        if (patch.fontSize != null && patch.fontSize > 0) {
          style.fontSize = patch.fontSize
        }
        style.textHeightWcs = acexScreenPxToWcs(style.fontSize, wcsToScreen)
        fontSizeChanged = true
      } else if (patch.fontSize != null && patch.fontSize > 0) {
        const prevFont = style.fontSize
        if (
          style.textHeightWcs != null &&
          style.textHeightWcs > 0 &&
          prevFont > 0
        ) {
          style.textHeightWcs =
            style.textHeightWcs * (patch.fontSize / prevFont)
        } else {
          style.textHeightWcs = acexScreenPxToWcs(patch.fontSize, wcsToScreen)
        }
        style.fontSize = patch.fontSize
        fontSizeChanged = true
      }

      if (fontSizeChanged) {
        acexSeedOverlaySizesFromWcs(this._view.getCameraZoom(), wcsToScreen, {
          textHeightWcs: style.textHeightWcs,
          fontSizePx: style.fontSize,
          strokeScreenPx: acexMeasureCanvasLineWidth(
            ACEX_MEASUREMENT_LINE_WEIGHT
          ),
          elements: measure.parts.dom,
          canvases: measure.parts.canvases
        })
      }
      // Keep selection highlight on DOM; canvas redraws pick up color.
      for (const el of measure.parts.dom) {
        if (el.classList.contains('mlcad-measure-badge')) {
          if (style.color) {
            el.style.color = style.color
            el.style.borderColor = style.color
          }
          if (style.fontSize) {
            el.style.fontSize = `${style.fontSize}px`
          }
        } else if (el.classList.contains('mlcad-measure-dot') && style.color) {
          el.style.background = style.color
        }
      }
    }
    this._positionDomOverlays()
    for (const fn of this._redrawListeners) fn()
  }

  /** @internal */
  private _removeCommitted(id: string, render = true): void {
    const idx = this._committed.findIndex(m => m.id === id)
    if (idx < 0) return
    this._selectedIds.delete(id)
    const [measure] = this._committed.splice(idx, 1)
    for (const fn of measure.parts.cleanups) fn()
    if (render && !this._mode) this._updateIdleStatus()
    if (render) this._view.render()
    this._notifyRecordsChanged()
  }

  /** Projects `data-wcs-*` DOM overlays to root-local screen coordinates. @internal */
  private _positionDomOverlays(): void {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    const zoom = this._view.getCameraZoom()
    this._overlayLayer
      .querySelectorAll<HTMLElement>('.mlcad-measure-dot, .mlcad-measure-badge')
      .forEach(el => {
        const x = Number(el.dataset.wcsX)
        const y = Number(el.dataset.wcsY)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return
        const screen = this._view.wcsToScreen(new THREE.Vector2(x, y))
        acexPositionWcsOverlay(el, screen, rootRect, zoom)
      })
  }

  /**
   * Sizes a canvas to `#mlcad-root` and returns a scaled 2D context.
   * @returns Context and dimensions, or `null` if 2D is unavailable.
   * @internal
   */
  private _syncCanvas(canvas: HTMLCanvasElement): {
    ctx: CanvasRenderingContext2D
    w: number
    h: number
    dpr: number
  } | null {
    const rect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return { ctx, w, h, dpr }
  }

  /** Root-local offset for overlay canvases during {@link syncOverlays}. @internal */
  private _overlayRootOffset(): { left: number; top: number } {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    return { left: rootRect.left, top: rootRect.top }
  }

  /** Draws the interior angle arc on a synced overlay canvas. @internal */
  private _drawAngleArc(
    canvas: HTMLCanvasElement,
    vertex: THREE.Vector2,
    arm1: THREE.Vector2,
    arm2: THREE.Vector2,
    strokeCss?: string,
    lineWidth = 2,
    strokeWidthWcs?: number
  ): void {
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, w, h, dpr } = synced
    ctx.clearRect(0, 0, w * dpr, h * dpr)
    ctx.save()
    ctx.scale(dpr, dpr)

    const arc = interiorAngleArcScreenMetrics(vertex, arm1, arm2, p =>
      this._wcsToScreenPoint(p)
    )
    const rootRect = this._overlayRootOffset()
    const vx = arc.cx - rootRect.left
    const vy = arc.cy - rootRect.top

    if (arc.r > 0) {
      ctx.beginPath()
      ctx.arc(vx, vy, arc.r, arc.startAngle, arc.endAngle, arc.antiClockwise)
      ctx.strokeStyle = strokeCss ?? this._measureCss()
      ctx.lineWidth = this._scaledCanvasLineWidth(
        lineWidth,
        canvas,
        strokeWidthWcs
      )
      ctx.stroke()
    }
    ctx.restore()
  }

  /** Reuses or creates `.mlcad-measure-canvas--preview` for angle preview. @internal */
  private _drawPreviewAngleArc(
    vertex: THREE.Vector2,
    arm1: THREE.Vector2,
    arm2: THREE.Vector2
  ): void {
    let canvas = this._overlayLayer.querySelector<HTMLCanvasElement>(
      '.mlcad-measure-canvas--preview'
    )
    if (!canvas) {
      canvas = makeOverlayCanvas(this._overlayLayer)
      canvas.classList.add('mlcad-measure-canvas--preview')
    }
    this._drawAngleArc(
      canvas,
      vertex,
      arm1,
      arm2,
      this._measureCss(),
      acexMeasureCanvasLineWidth(ACEX_MEASUREMENT_LINE_WEIGHT)
    )
  }

  /** Draws the arc through `through` between `start` and `end` in screen space. @internal */
  private _drawArc(
    canvas: HTMLCanvasElement,
    g: AcExCircleGeom,
    start: THREE.Vector2,
    through: THREE.Vector2,
    end: THREE.Vector2,
    strokeCss?: string,
    lineWidth = 3,
    strokeWidthWcs?: number
  ): void {
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, dpr } = synced
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // Collinear start/through/end cannot define a circle; leave the canvas
    // cleared instead of stroking the previous circumcircle.
    if (!AcGeCircArc2d.tryCreateByThreePoints(start, through, end)) {
      ctx.restore()
      return
    }

    const rootRect = this._overlayRootOffset()
    const sc = this._view.wcsToScreen(new THREE.Vector2(g.cx, g.cy))
    const ss = this._view.wcsToScreen(start)
    const se = this._view.wcsToScreen(end)
    const cx = sc.x - rootRect.left
    const cy = sc.y - rootRect.top
    const sx = ss.x - rootRect.left
    const sy = ss.y - rootRect.top
    const ex = se.x - rootRect.left
    const ey = se.y - rootRect.top
    const screenR = Math.hypot(sx - cx, sy - cy)
    const sa = Math.atan2(sy - cy, sx - cx)
    const ea = Math.atan2(ey - cy, ex - cx)
    const { counterClockwise } = arcSweepThroughMiddle(start, through, end, g)

    ctx.beginPath()
    ctx.arc(cx, cy, screenR, sa, ea, counterClockwise)
    ctx.strokeStyle = strokeCss ?? this._measureCss()
    ctx.lineWidth = this._scaledCanvasLineWidth(
      lineWidth,
      canvas,
      strokeWidthWcs
    )
    ctx.stroke()
    ctx.restore()
  }

  /** Draws the shorter arc between `start` and `end` (sidecar / simple-viewer). @internal */
  private _drawShortArc(
    canvas: HTMLCanvasElement,
    g: AcExCircleGeom,
    start: THREE.Vector2,
    end: THREE.Vector2,
    strokeCss?: string,
    lineWidth = 3,
    strokeWidthWcs?: number
  ): void {
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, dpr } = synced
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const rootRect = this._overlayRootOffset()
    const sc = this._view.wcsToScreen(new THREE.Vector2(g.cx, g.cy))
    const ss = this._view.wcsToScreen(start)
    const se = this._view.wcsToScreen(end)
    const cx = sc.x - rootRect.left
    const cy = sc.y - rootRect.top
    const sx = ss.x - rootRect.left
    const sy = ss.y - rootRect.top
    const ex = se.x - rootRect.left
    const ey = se.y - rootRect.top
    const screenR = Math.hypot(sx - cx, sy - cy)
    const sa = Math.atan2(sy - cy, sx - cx)
    const ea = Math.atan2(ey - cy, ex - cx)
    const counterClockwise = shortArcCounterClockwise(start, end, g)

    ctx.beginPath()
    ctx.arc(cx, cy, screenR, sa, ea, counterClockwise)
    ctx.strokeStyle = strokeCss ?? this._measureCss()
    ctx.lineWidth = this._scaledCanvasLineWidth(
      lineWidth,
      canvas,
      strokeWidthWcs
    )
    ctx.stroke()
    ctx.restore()
  }

  /** Preview canvas helper for arc-length picking. @internal */
  private _drawPreviewArc(
    g: AcExCircleGeom,
    start: THREE.Vector2,
    through: THREE.Vector2,
    end: THREE.Vector2
  ): void {
    let canvas = this._overlayLayer.querySelector<HTMLCanvasElement>(
      '.mlcad-measure-canvas--preview'
    )
    if (!canvas) {
      canvas = makeOverlayCanvas(this._overlayLayer)
      canvas.classList.add('mlcad-measure-canvas--preview')
    }
    this._drawArc(
      canvas,
      g,
      start,
      through,
      end,
      this._measureCss(),
      acexMeasureCanvasLineWidth(ACEX_MEASUREMENT_LINE_WEIGHT)
    )
  }

  /** Fills and strokes a polygon on a synced overlay canvas. @internal */
  private _drawAreaFill(
    canvas: HTMLCanvasElement,
    points: THREE.Vector2[],
    strokeCss?: string,
    lineWidth = 2,
    strokeWidthWcs?: number
  ): void {
    if (points.length < 3) return
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, dpr } = synced
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    const rootRect = this._overlayRootOffset()
    const spts = points.map(p => {
      const s = this._view.wcsToScreen(p)
      return { x: s.x - rootRect.left, y: s.y - rootRect.top }
    })

    const stroke = strokeCss ?? this._measureCss()
    const fill = strokeCss
      ? measureColorToFill(cssColorToHex(strokeCss, this._measureColor))
      : this._measureFill()

    ctx.beginPath()
    ctx.moveTo(spts[0]!.x, spts[0]!.y)
    for (let i = 1; i < spts.length; i++) {
      ctx.lineTo(spts[i]!.x, spts[i]!.y)
    }
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = this._scaledCanvasLineWidth(
      lineWidth,
      canvas,
      strokeWidthWcs
    )
    ctx.stroke()
    ctx.restore()
  }

  /** Preview canvas helper for area picking. @internal */
  private _drawPreviewArea(points: THREE.Vector2[]): void {
    if (points.length < 3) return
    let canvas = this._overlayLayer.querySelector<HTMLCanvasElement>(
      '.mlcad-measure-canvas--preview'
    )
    if (!canvas) {
      canvas = makeOverlayCanvas(this._overlayLayer)
      canvas.classList.add('mlcad-measure-canvas--preview')
    }
    this._drawAreaFill(
      canvas,
      points,
      this._measureCss(),
      acexMeasureCanvasLineWidth(ACEX_MEASUREMENT_LINE_WEIGHT)
    )
  }
}
