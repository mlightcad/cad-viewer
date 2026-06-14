/**
 * Measurement tools for the offline HTML viewer (distance, angle, arc, area, coordinate).
 *
 * @module AcExMeasurement
 * @packageDocumentation
 */

import * as THREE from 'three'

import type { AcExHtmlI18n } from './AcExHtmlI18n'
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

/**
 * THREE/WebGL color for measurement overlays (lines, preview rubber-band).
 * Matches `--mlcad-accent` in the offline HTML shell CSS.
 */
export const ACEX_MEASURE_COLOR = 0x08e8de

/** Highlight color when a committed measurement is selected. */
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
 * - `angle` — three-point angle (vertex + two arm endpoints).
 * - `arc` — three-point arc length (start, point on arc, end).
 * - `area` — multi-point polygon area.
 * - `coordinate` — single-point X/Y readout in drawing units.
 */
export type AcExMeasureMode =
  | 'distance'
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
 * View/camera callbacks supplied by {@link AcExHtmlViewerRuntime} so measurement
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

  /**
   * Resolves a pointer pick with object snap applied.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   */
  resolvePoint: (clientX: number, clientY: number) => AcExResolvedPoint

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
}

/**
 * Construction options for {@link AcExMeasureController}.
 */
export interface AcExMeasureControllerOptions {
  /** Root viewer container (`#mlcad-root`); hosts the overlay layer. */
  root: HTMLElement
  /** THREE scene that receives persistent measurement line geometry. */
  scene: THREE.Scene
  /** I18n helper for status hints and result messages. */
  i18n: AcExHtmlI18n
  /** View transform and formatting callbacks from the runtime. */
  view: AcExMeasureViewApi
  /** Footer status bar updated with hints and last measurement result. */
  statusEl: HTMLElement
  /** Returns the idle status text when no measurement tool is active. */
  getReadyStatus: () => string
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
}

/** Teardown callback registered when a measurement overlay is created. @internal */
type AcExMeasureCleanup = () => void

/** DOM/WebGL parts belonging to one committed measurement. @internal */
interface AcExCommitParts {
  id: string
  dom: HTMLElement[]
  lines: THREE.Line[]
  canvases: HTMLCanvasElement[]
  cleanups: AcExMeasureCleanup[]
}

/** One finished measurement that can be selected and deleted. @internal */
interface AcExCommittedMeasure {
  id: string
  parts: AcExCommitParts
  quantity: AcExMeasureQuantity | null
  value: number
  hitTest: (clientX: number, clientY: number, thresholdPx: number) => boolean
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
 * Screen distance from a point to a circular arc (shorter arc between two angles).
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
  const samples = 24
  let best = Infinity
  const span = antiClockwise ? startAngle - endAngle : endAngle - startAngle
  const total = Math.abs(span)
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const a = antiClockwise ? startAngle - t * total : startAngle + t * total
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    best = Math.min(best, Math.hypot(px - x, py - y))
  }
  return best
}

/**
 * Screen-space interior angle arc (viewport pixels), matching {@link AcExMeasureController._drawAngleArc}.
 * @internal
 */
function interiorAngleArcScreenMetrics(
  vertex: THREE.Vector2,
  arm1: THREE.Vector2,
  arm2: THREE.Vector2,
  wcsToScreen: (wcs: THREE.Vector2) => { x: number; y: number }
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
  const len1 = Math.hypot(sa1.x - cx, sa1.y - cy)
  const len2 = Math.hypot(sa2.x - cx, sa2.y - cy)
  const r = Math.max(Math.min(len1, len2) * 0.3, 15)
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

  const arc = interiorAngleArcScreenMetrics(vertex, arm1, arm2, wcsToScreen)
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

/**
 * Wraps a radian angle into `[0, 2π)`.
 * @param a - Angle in radians.
 * @internal
 */
function normaliseAngle(a: number): number {
  return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
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
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const x3 = p3.x
  const y3 = p3.y
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
  if (Math.abs(d) < 1e-10) return null
  const cx =
    ((x1 * x1 + y1 * y1) * (y2 - y3) +
      (x2 * x2 + y2 * y2) * (y3 - y1) +
      (x3 * x3 + y3 * y3) * (y1 - y2)) /
    d
  const cy =
    ((x1 * x1 + y1 * y1) * (x3 - x2) +
      (x2 * x2 + y2 * y2) * (x1 - x3) +
      (x3 * x3 + y3 * y3) * (x2 - x1)) /
    d
  const r = Math.hypot(cx - x1, cy - y1)
  if (!Number.isFinite(r) || r < 1e-9) return null
  return { cx, cy, r }
}

/**
 * Whether `mid` lies on the CCW sweep from `start` to `end` (angles in `[0, 2π)`).
 * @internal
 */
function isAngleOnSweep(start: number, mid: number, end: number): boolean {
  const total = normaliseAngle(end - start)
  const offset = normaliseAngle(mid - start)
  return offset <= total + 1e-7
}

/**
 * Arc sweep from `start` to `end` that passes through `through` (radians).
 * @returns `{ span, counterClockwise }` for canvas `arc()` and length = span * r.
 * @internal
 */
function arcSweepThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  g: AcExCircleGeom
): { span: number; counterClockwise: boolean } {
  const a1 = Math.atan2(start.y - g.cy, start.x - g.cx)
  const aMid = Math.atan2(through.y - g.cy, through.x - g.cx)
  const a2 = Math.atan2(end.y - g.cy, end.x - g.cx)
  const ccwSpan = normaliseAngle(a2 - a1)
  if (isAngleOnSweep(a1, aMid, a2)) {
    return { span: ccwSpan, counterClockwise: true }
  }
  return { span: 2 * Math.PI - ccwSpan, counterClockwise: false }
}

/**
 * Arc length from `start` to `end` on `g` through `through`.
 * @internal
 */
function arcLengthThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  g: AcExCircleGeom
): number {
  return arcSweepThroughMiddle(start, through, end, g).span * g.r
}

/**
 * Midpoint on the arc from `start` to `end` that passes through `through`.
 * @internal
 */
function arcMidThroughMiddle(
  start: THREE.Vector2,
  through: THREE.Vector2,
  end: THREE.Vector2,
  g: AcExCircleGeom
): THREE.Vector2 {
  const a1 = Math.atan2(start.y - g.cy, start.x - g.cx)
  const { span, counterClockwise } = arcSweepThroughMiddle(
    start,
    through,
    end,
    g
  )
  const midAngle = counterClockwise ? a1 + span / 2 : a1 - span / 2
  return new THREE.Vector2(
    g.cx + g.r * Math.cos(midAngle),
    g.cy + g.r * Math.sin(midAngle)
  )
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
 * Builds a THREE polyline geometry from WCS vertices (Z = 0).
 * @param points - At least two XY points.
 * @returns Buffer geometry, or `null` when `points.length < 2`.
 * @internal
 */
function makeLineGeometry(
  points: THREE.Vector2[]
): THREE.BufferGeometry | null {
  if (points.length < 2) return null
  const positions = new Float32Array(points.length * 3)
  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i]!.x
    positions[i * 3 + 1] = points[i]!.y
    positions[i * 3 + 2] = 0
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

/**
 * Creates a persistent endpoint marker (`mlcad-measure-dot`).
 * World position is stored on `dataset.wcsX` / `dataset.wcsY` and updated by
 * {@link AcExMeasureController.syncOverlays}.
 * @internal
 */
function makeDotEl(): HTMLDivElement {
  const dot = document.createElement('div')
  dot.className = 'mlcad-measure-dot'
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
 * - Live preview (rubber-band line, canvas arcs/fills, cursor-following label).
 * - Committed results that survive pan/zoom: THREE lines, DOM badges/dots, and
 *   canvas overlays redrawn on {@link syncOverlays}.
 *
 * Pointer routing: while {@link isActive}, the runtime should call
 * {@link handlePointerDown} / {@link handlePointerMove} instead of panning.
 * {@link clearAll} removes every committed overlay and exits any active tool.
 */
export class AcExMeasureController {
  /** Viewer root (`#mlcad-root`). */
  private readonly _root: HTMLElement
  /** Scene receiving persistent measurement lines. */
  private readonly _scene: THREE.Scene
  /** Localized status hints and result strings. */
  private readonly _i18n: AcExHtmlI18n
  /** Pan/zoom and formatting callbacks from the runtime. */
  private readonly _view: AcExMeasureViewApi
  /** Footer status bar. */
  private readonly _statusEl: HTMLElement
  /** Idle status text provider. */
  private readonly _getReadyStatus: () => string
  /** Snap marker callback for the runtime. */
  private readonly _onOsnapMarker: AcExMeasureControllerOptions['onOsnapMarker']
  /** Ortho/polar tracking options from the settings panel. */
  private readonly _getTrackingOptions:
    | (() => AcExTrackingOptions | null)
    | null
  /** Accent color for lines, labels, and canvas overlays. */
  private _measureColor = ACEX_MEASURE_COLOR
  /** Parent group for committed THREE line geometry. */
  private readonly _measureGroup: THREE.Group
  /** Host for canvas overlays, dots, badges, and the live label. */
  private readonly _overlayLayer: HTMLDivElement
  /** Cursor-following value shown during interactive preview. */
  private readonly _liveLabel: HTMLDivElement
  /** Rubber-band line while picking points. */
  private readonly _previewLine: THREE.Line
  /** Canvas redraw callbacks invoked from {@link syncOverlays}. */
  private readonly _redrawListeners: AcExMeasureCleanup[] = []
  /** Finished measurements that survive after the tool is deactivated. */
  private readonly _committed: AcExCommittedMeasure[] = []
  /** Parts being assembled for the measurement currently being committed. */
  private _commitParts: AcExCommitParts | null = null
  /** Monotonic id source for {@link _committed}. */
  private _commitCounter = 0
  /** Selected committed measurement ids. */
  private readonly _selectedIds = new Set<string>()

  /** Active toolbar mode, or `null` when idle. */
  private _mode: AcExMeasureMode | null = null
  /** Vertices collected for the current in-progress measurement. */
  private _points: THREE.Vector2[] = []
  /** Screen-pixel distance to the first vertex that auto-closes an area polygon. */
  private _areaCloseThresholdPx = 14
  /** Last pointer position during an active measure tool (for overlay sync on pan/zoom). */
  private _lastPointer: { x: number; y: number } | null = null
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

  /**
   * Creates overlay layers in `root` and registers preview geometry in `scene`.
   * @param options - Viewer hooks and DOM targets; see {@link AcExMeasureControllerOptions}.
   */
  constructor(options: AcExMeasureControllerOptions) {
    this._root = options.root
    this._scene = options.scene
    this._i18n = options.i18n
    this._view = options.view
    this._statusEl = options.statusEl
    this._getReadyStatus = options.getReadyStatus
    this._onOsnapMarker = options.onOsnapMarker
    this._getTrackingOptions = options.getTrackingOptions ?? null

    this._measureGroup = new THREE.Group()
    this._measureGroup.name = 'measurements'
    this._measureGroup.renderOrder = 20
    this._scene.add(this._measureGroup)

    this._overlayLayer = document.createElement('div')
    this._overlayLayer.id = 'mlcad-measure-overlays'
    this._root.appendChild(this._overlayLayer)

    this._liveLabel = document.createElement('div')
    this._liveLabel.className = 'mlcad-measure-live-label'
    this._overlayLayer.appendChild(this._liveLabel)

    const previewMaterial = new THREE.LineBasicMaterial({
      color: this._measureColor,
      depthTest: false
    })
    const previewGeometry = new THREE.BufferGeometry()
    this._previewLine = new THREE.Line(previewGeometry, previewMaterial)
    this._previewLine.visible = false
    this._previewLine.frustumCulled = false
    this._previewLine.renderOrder = 15
    this._scene.add(this._previewLine)
  }

  /**
   * Whether a measurement command is active (viewer should not start panning).
   */
  get isActive(): boolean {
    return this._mode !== null
  }

  /**
   * Currently selected toolbar mode, or `null` when idle.
   */
  get mode(): AcExMeasureMode | null {
    return this._mode
  }

  /**
   * Updates the accent color used for measurement overlays and redraws canvases.
   *
   * @param hex - 24-bit RGB color (for example `0x08e8de`).
   */
  setMeasureColor(hex: number): void {
    if (!Number.isFinite(hex)) return
    this._measureColor = hex
    const material = this._previewLine.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.color.setHex(hex)
    }
    for (const measure of this._committed) {
      if (this._selectedIds.has(measure.id)) continue
      for (const line of measure.parts.lines) {
        const lineMaterial = line.material
        if (lineMaterial instanceof THREE.LineBasicMaterial) {
          lineMaterial.color.setHex(hex)
        }
      }
    }
    for (const fn of this._redrawListeners) fn()
    this._view.render()
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
   * the tool is turned off via {@link cancelMode}. Switching modes clears
   * in-progress picks and updates toolbar `active` styling.
   *
   * @param mode - Tool to enable, or `null` to only reset state.
   * @param toggleOff - If true, clicking the same tool again deactivates it.
   */
  setMode(mode: AcExMeasureMode | null, toggleOff = true): void {
    if (mode === this._mode && toggleOff) {
      this.cancelMode()
      return
    }
    this.cancelMode()
    this._deselect(false)
    if (mode === null) return
    this._mode = mode
    this._points = []
    this._updateToolbarActive()
    this._statusEl.textContent = this._hintForMode(mode)
  }

  /**
   * Exits the active measurement tool and discards in-progress picks/preview.
   * Does not remove committed measurement graphics (use {@link clearAll}).
   */
  cancelMode(): void {
    this._mode = null
    this._points = []
    this._lastPointer = null
    this._osnapCache = null
    this._hidePreview()
    this._onOsnapMarker(null, null)
    this._updateToolbarActive()
    this._updateIdleStatus()
    this._view.render()
  }

  /**
   * Refreshes the idle status bar (totals or ready text) when no tool is active.
   */
  refreshIdleStatus(): void {
    this._updateIdleStatus()
  }

  /**
   * Removes all persistent measurement graphics (lines, canvas, badges, dots),
   * disposes THREE resources, and returns the viewer to idle status.
   */
  clearAll(): void {
    this.cancelMode()
    this._deselect(false)
    for (const measure of [...this._committed]) {
      this._removeCommitted(measure.id, false)
    }
    this._updateIdleStatus()
    this._view.render()
  }

  /**
   * Repositions DOM badges/dots and redraws registered canvas overlays.
   * Invoke from the viewer `render` path and after resize so graphics track pan/zoom.
   */
  syncOverlays(): void {
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
    } finally {
      this._inOverlaySync = false
      this._overlayRootRect = null
    }
  }

  /**
   * Handles a pointer-down while a measurement tool is active.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   * @returns `true` when the event was handled.
   */
  handlePointerDown(clientX: number, clientY: number): boolean {
    if (this._trySelectCommittedAt(clientX, clientY)) {
      return true
    }
    if (!this._mode) return false
    this._lastPointer = { x: clientX, y: clientY }
    const point = this._resolvePointerWithOsnap(clientX, clientY)

    switch (this._mode) {
      case 'distance':
        return this._pointerDistance(point, clientX, clientY)
      case 'angle':
        return this._pointerAngle(point, clientX, clientY)
      case 'arc':
        return this._pointerArc(point, clientX, clientY)
      case 'area':
        return this._pointerArea(point, clientX, clientY)
      case 'coordinate':
        return this._pointerCoordinate(point, clientX, clientY)
      default:
        return true
    }
  }

  /**
   * Updates live preview and object-snap marker for the active tool.
   * @param clientX - Pointer X in viewport pixels.
   * @param clientY - Pointer Y in viewport pixels.
   */
  handlePointerMove(clientX: number, clientY: number): void {
    if (!this._mode) return
    this._lastPointer = { x: clientX, y: clientY }
  }

  /**
   * Keyboard shortcuts during measurement.
   *
   * - `Escape` — {@link cancelMode} when a tool is active.
   * - `Enter` — commit an area polygon when at least three vertices are placed.
   *
   * @param key - `KeyboardEvent.key` value.
   * @returns `true` when the key was handled (caller may call `preventDefault`).
   */
  handleKeyDown(key: string): boolean {
    if (key === 'Escape') {
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
      this._statusEl.textContent = this._hintForMode('area')
      return true
    }
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
   * Deletes all selected committed measurements.
   * Handles `Delete` and `Backspace` (Mac delete key).
   */
  handleSelectionKeyDown(key: string, event?: KeyboardEvent): boolean {
    if (key !== 'Delete' && key !== 'Backspace') return false
    if (this._selectedIds.size === 0) return false

    const target = event?.target
    if (target instanceof HTMLElement) {
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        return false
      }
    }

    for (const id of [...this._selectedIds]) {
      this._removeCommitted(id, false)
    }
    this._selectedIds.clear()
    this._updateIdleStatus()
    this._view.render()
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

  /** Syncs `#mlcad-toolbar [data-measure-mode]` `active` class with `_mode`. @internal */
  private _updateToolbarActive(): void {
    document
      .querySelectorAll('#mlcad-toolbar [data-measure-mode]')
      .forEach(btn => {
        const mode = btn.getAttribute('data-measure-mode')
        btn.classList.toggle('active', mode === this._mode)
      })
  }

  /** Removes transient preview line, label, and preview canvas. @internal */
  private _hidePreview(): void {
    this._previewLine.visible = false
    this._liveLabel.style.display = 'none'
    this._overlayLayer
      .querySelectorAll('.mlcad-measure-canvas--preview')
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
   * Resolves the WCS pick (with object snap) and refreshes the on-screen snap marker.
   * @internal
   */
  private _resolvePointerWithOsnap(
    clientX: number,
    clientY: number
  ): THREE.Vector2 {
    const cacheKey = this._view.getSnapCacheKey()
    const cached = this._osnapCache
    if (
      cached &&
      cached.clientX === clientX &&
      cached.clientY === clientY &&
      cached.cacheKey === cacheKey
    ) {
      this._onOsnapMarker(
        cached.snap,
        cached.snap ? this._view.wcsToScreen(cached.point) : null
      )
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
    this._onOsnapMarker(snap, snap ? this._view.wcsToScreen(point) : null)
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
   * Redraws in-progress preview and object-snap marker after pan/zoom using the last pointer sample.
   * @internal
   */
  private _refreshActivePreview(): void {
    if (!this._mode || !this._lastPointer) return
    const { x, y } = this._lastPointer
    const point = this._resolvePointerWithOsnap(x, y)

    switch (this._mode) {
      case 'distance':
        if (this._points.length === 1) {
          this._previewDistance(point, x, y)
        }
        break
      case 'angle':
        if (this._points.length >= 1) {
          this._previewAngle(point, x, y)
        }
        break
      case 'arc':
        if (this._points.length >= 1) {
          this._previewArc(point, x, y)
        }
        break
      case 'area':
        if (this._points.length >= 1) {
          this._previewArea(point, x, y)
        }
        break
      case 'coordinate':
        this._previewCoordinate(point, x, y)
        break
    }
  }

  /**
   * Positions the cursor-following preview label in root-local coordinates.
   * @internal
   */
  private _showLiveLabel(text: string, clientX: number, clientY: number): void {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    this._liveLabel.textContent = text
    this._liveLabel.style.display = 'block'
    this._liveLabel.style.left = `${clientX - rootRect.left}px`
    this._liveLabel.style.top = `${clientY - rootRect.top}px`
  }

  /** Updates the rubber-band THREE line from WCS vertices. @internal */
  private _setPreviewLine(points: THREE.Vector2[]): void {
    if (points.length < 2) {
      this._previewLine.visible = false
      return
    }
    const geometry = this._previewLine.geometry
    const existing = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (existing && existing.count === points.length) {
      for (let i = 0; i < points.length; i++) {
        existing.setXYZ(i, points[i]!.x, points[i]!.y, 0)
      }
      existing.needsUpdate = true
      geometry.computeBoundingSphere()
    } else {
      const positions = new Float32Array(points.length * 3)
      for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i]!.x
        positions[i * 3 + 1] = points[i]!.y
      }
      geometry.dispose()
      const next = new THREE.BufferGeometry()
      next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      next.computeBoundingSphere()
      this._previewLine.geometry = next
    }
    this._previewLine.visible = true
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
    clientX: number,
    clientY: number
  ): boolean {
    this._commitCoordinate(point)
    this._hidePreview()
    this._statusEl.textContent = this._hintForMode('coordinate')
    this._previewCoordinate(point, clientX, clientY)
    return true
  }

  /** Coordinate tool live preview at the cursor. @internal */
  private _previewCoordinate(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): void {
    this._hidePreview()
    this._showLiveLabel(
      this._formatCoordinateLabel(point.x, point.y),
      clientX,
      clientY
    )
    this._requestRender()
  }

  /**
   * Persists a coordinate measurement: endpoint dot and offset badge.
   * @internal
   */
  private _commitCoordinate(point: THREE.Vector2): void {
    const label = this._formatCoordinateLabel(point.x, point.y)
    this._startCommit()
    this._addDot(point)
    const badge = this._addBadge(point, label)
    badge.classList.add('mlcad-measure-badge--coordinate')
    this._finishCommit((clientX, clientY, threshold) => {
      const s = this._view.wcsToScreen(point)
      return Math.hypot(clientX - s.x, clientY - s.y) <= threshold
    }, null)
    this._statusEl.textContent = this._i18n.t('status.coordinates', {
      x: this._view.formatLength(point.x),
      y: this._view.formatLength(point.y)
    })
  }

  /**
   * Distance tool: two clicks, then {@link _commitDistance}.
   * @internal
   */
  private _pointerDistance(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    this._points.push(point.clone())
    if (this._points.length < 2) {
      this._previewDistance(point, clientX, clientY)
      return true
    }
    const [a, b] = this._points
    this._commitDistance(a!, b!)
    this._points = []
    this._hidePreview()
    this._statusEl.textContent = this._hintForMode('distance')
    return true
  }

  /** Distance tool live preview after the first anchor is set. @internal */
  private _previewDistance(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): void {
    if (this._points.length !== 1) {
      this._hidePreview()
      return
    }
    const anchor = this._points[0]!
    this._setPreviewLine([anchor, point])
    const dist = dist2(anchor, point)
    this._showLiveLabel(this._view.formatLength(dist), clientX, clientY)
    this._requestRender()
  }

  /**
   * Persists a distance measurement: line, endpoint dots, and midpoint badge.
   * @internal
   */
  private _commitDistance(a: THREE.Vector2, b: THREE.Vector2): void {
    const dist = dist2(a, b)
    this._startCommit()
    this._addPersistentLine([a, b])
    this._addDot(a)
    this._addDot(b)
    const mid = new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2)
    this._addBadge(mid, this._view.formatLength(dist))
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const sa = this._view.wcsToScreen(a)
        const sb = this._view.wcsToScreen(b)
        return (
          distPointToSegmentPx(clientX, clientY, sa.x, sa.y, sb.x, sb.y) <=
          threshold
        )
      },
      'length',
      dist
    )
    this._statusEl.textContent = this._i18n.t('status.distance', {
      value: this._view.formatLength(dist)
    })
  }

  /**
   * Angle tool: vertex, arm1, arm2 (three clicks), then {@link _commitAngle}.
   * @internal
   */
  private _pointerAngle(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    this._points.push(point.clone())
    if (this._points.length < 3) {
      this._previewAngle(point, clientX, clientY)
      return true
    }
    const vertex = this._points[0]!
    const arm1 = this._points[1]!
    const arm2 = this._points[2]!
    this._commitAngle(vertex, arm1, arm2)
    this._points = []
    this._hidePreview()
    this._statusEl.textContent = this._hintForMode('angle')
    return true
  }

  /** Angle tool live preview (arms + arc canvas + label). @internal */
  private _previewAngle(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const vertex = this._points[0]!
    if (this._points.length === 1) {
      this._setPreviewLine([vertex, point])
      return
    }
    const arm1 = this._points[1]!
    this._setPreviewLine([vertex, arm1, vertex, point])
    const deg = calcAngleDeg(vertex, arm1, point)
    this._showLiveLabel(this._view.formatAngle(deg), clientX, clientY)
    this._drawPreviewAngleArc(vertex, arm1, point)
    this._requestRender()
  }

  /**
   * Persists an angle measurement: two arms, arc canvas, dots, bisector badge.
   * @internal
   */
  private _commitAngle(
    vertex: THREE.Vector2,
    arm1: THREE.Vector2,
    arm2: THREE.Vector2
  ): void {
    const deg = calcAngleDeg(vertex, arm1, arm2)
    this._startCommit()
    this._addPersistentLine([vertex, arm1])
    this._addPersistentLine([vertex, arm2])
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const redraw = () => this._drawAngleArc(canvas, vertex, arm1, arm2)
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    this._addDot(vertex)
    this._addDot(arm1)
    this._addDot(arm2)

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
    const badgePos = new THREE.Vector2(
      vertex.x + bx * offset,
      vertex.y + by * offset
    )
    this._addBadge(badgePos, this._view.formatAngle(deg))
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
      null
    )
    this._statusEl.textContent = this._i18n.t('status.angle', {
      value: this._view.formatAngle(deg)
    })
  }

  /**
   * Arc tool: start → point on arc → end, then {@link _commitArc}.
   * @internal
   */
  private _pointerArc(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): boolean {
    this._points.push(point.clone())
    if (this._points.length < 3) {
      this._previewArc(point, clientX, clientY)
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
    this._statusEl.textContent = this._hintForMode('arc')
    return true
  }

  /** Arc tool live preview (chord lines or arc stroke + label). @internal */
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
    if (this._points.length === 1) {
      this._setPreviewLine([start, point])
      this._requestRender()
      return
    }
    const through = this._points[1]!
    const geom = circleFromThreePoints(start, through, point)
    if (!geom) {
      this._setPreviewLine([start, through, point])
      this._liveLabel.style.display = 'none'
      this._overlayLayer
        .querySelectorAll('.mlcad-measure-canvas--preview')
        .forEach(el => el.remove())
      this._requestRender()
      return
    }
    const len = arcLengthThroughMiddle(start, through, point, geom)
    this._showLiveLabel(this._view.formatLength(len), clientX, clientY)
    this._drawPreviewArc(geom, start, through, point)
    this._requestRender()
  }

  /**
   * Persists an arc-length measurement: arc canvas, three dots, midpoint badge.
   * @internal
   */
  private _commitArc(
    geom: AcExCircleGeom,
    start: THREE.Vector2,
    through: THREE.Vector2,
    end: THREE.Vector2
  ): void {
    const len = arcLengthThroughMiddle(start, through, end, geom)
    const mid = arcMidThroughMiddle(start, through, end, geom)
    this._startCommit()
    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const redraw = () => this._drawArc(canvas, geom, start, through, end)
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    this._addDot(start)
    this._addDot(through)
    this._addDot(end)
    this._addBadge(mid, this._view.formatLength(len))
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
        const { counterClockwise } = arcSweepThroughMiddle(
          start,
          through,
          end,
          geom
        )
        return (
          distPointToArcPx(
            clientX,
            clientY,
            cx,
            cy,
            screenR,
            sa,
            ea,
            counterClockwise
          ) <= threshold
        )
      },
      'length',
      len
    )
    this._statusEl.textContent = this._i18n.t('status.arcLength', {
      value: this._view.formatLength(len)
    })
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
        this._statusEl.textContent = this._hintForMode('area')
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
            this._statusEl.textContent = this._hintForMode('area')
            return true
          }
        }
      }
    }

    this._points.push(point.clone())
    this._previewArea(point, clientX, clientY)
    return true
  }

  /** Area tool live preview (outline + fill canvas + label). @internal */
  private _previewArea(
    point: THREE.Vector2,
    clientX: number,
    clientY: number
  ): void {
    if (this._points.length === 0) {
      this._hidePreview()
      return
    }
    const pts = [...this._points, point]
    this._setPreviewLine(pts)
    if (pts.length >= 3) {
      const area = shoelaceArea(pts)
      this._showLiveLabel(`${this._view.formatLength(area)}²`, clientX, clientY)
      this._drawPreviewArea(pts)
    }
    this._requestRender()
  }

  /**
   * Persists an area measurement: boundary line, fill canvas, vertex dots, badge.
   * @internal
   */
  private _commitArea(points: THREE.Vector2[]): void {
    if (points.length < 3) return
    const area = shoelaceArea(points)
    const closed = [...points, points[0]!]
    this._startCommit()
    this._addPersistentLine(closed)

    const canvas = makeOverlayCanvas(this._overlayLayer)
    this._trackCanvas(canvas)
    const redraw = () => this._drawAreaFill(canvas, points)
    redraw()
    this._registerRedraw(redraw, () => canvas.remove())

    for (const p of points) this._addDot(p)
    this._addBadge(centroid(points), `${this._view.formatLength(area)}²`)
    this._finishCommit(
      (clientX, clientY, threshold) => {
        const poly = this._screenPolyline(points)
        if (pointInPolygonPx(clientX, clientY, poly)) return true
        const closedPoly = [...poly, poly[0]!]
        return distPointToPolylinePx(clientX, clientY, closedPoly) <= threshold
      },
      'area',
      area
    )
    this._statusEl.textContent = this._i18n.t('status.area', {
      value: `${this._view.formatLength(area)}²`
    })
  }

  /** Adds a committed THREE line and registers disposal in `_cleanups`. @internal */
  private _addPersistentLine(points: THREE.Vector2[]): void {
    const geometry = makeLineGeometry(points)
    if (!geometry) return
    const material = new THREE.LineBasicMaterial({
      color: this._measureColor,
      depthTest: false
    })
    const line = new THREE.Line(geometry, material)
    line.renderOrder = 18
    this._measureGroup.add(line)
    const parts = this._commitParts
    if (parts) {
      parts.lines.push(line)
      parts.cleanups.push(() => {
        this._measureGroup.remove(line)
        geometry.dispose()
        material.dispose()
      })
    }
  }

  /** Adds a DOM endpoint dot tracked in WCS via dataset attributes. @internal */
  private _addDot(wcs: THREE.Vector2): HTMLDivElement {
    const dot = makeDotEl()
    dot.dataset.wcsX = String(wcs.x)
    dot.dataset.wcsY = String(wcs.y)
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
  private _startCommit(): string {
    const id = `m${++this._commitCounter}`
    this._commitParts = {
      id,
      dom: [],
      lines: [],
      canvases: [],
      cleanups: []
    }
    return id
  }

  /** @internal */
  private _finishCommit(
    hitTest: (clientX: number, clientY: number, thresholdPx: number) => boolean,
    quantity: AcExMeasureQuantity | null,
    value = 0
  ): void {
    const parts = this._commitParts
    if (!parts) return
    this._committed.push({ id: parts.id, parts, hitTest, quantity, value })
    this._commitParts = null
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
    const measure = this._pickCommittedMeasure(clientX, clientY)
    if (measure) {
      this._select(measure.id)
      return true
    }
    return false
  }

  /** @internal */
  private _select(id: string): void {
    if (this._selectedIds.has(id)) return
    this._selectedIds.add(id)
    const measure = this._committed.find(m => m.id === id)
    if (measure) this._applyMeasureSelection(measure.parts, true)
    if (!this._mode) this._updateIdleStatus()
    this._view.render()
  }

  /** @internal */
  private _deselect(updateStatus = true): void {
    if (this._selectedIds.size === 0) return
    for (const id of this._selectedIds) {
      const measure = this._committed.find(m => m.id === id)
      if (measure) this._applyMeasureSelection(measure.parts, false)
    }
    this._selectedIds.clear()
    if (updateStatus && !this._mode) this._updateIdleStatus()
    this._view.render()
  }

  /** @internal */
  private _applyMeasureSelection(
    parts: AcExCommitParts,
    selected: boolean
  ): void {
    for (const line of parts.lines) {
      const material = line.material
      if (material instanceof THREE.LineBasicMaterial) {
        material.color.setHex(
          selected ? ACEX_MEASURE_SELECT_COLOR : this._measureColor
        )
      }
    }
    for (const el of parts.dom) {
      el.classList.toggle('mlcad-measure-selected', selected)
    }
    for (const canvas of parts.canvases) {
      canvas.classList.toggle('mlcad-measure-selected', selected)
    }
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
  }

  /** Projects `data-wcs-*` DOM overlays to root-local screen coordinates. @internal */
  private _positionDomOverlays(): void {
    const rootRect = this._overlayRootRect ?? this._root.getBoundingClientRect()
    this._overlayLayer
      .querySelectorAll<HTMLElement>('.mlcad-measure-dot, .mlcad-measure-badge')
      .forEach(el => {
        const x = Number(el.dataset.wcsX)
        const y = Number(el.dataset.wcsY)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return
        const screen = this._view.wcsToScreen(new THREE.Vector2(x, y))
        el.style.left = `${screen.x - rootRect.left}px`
        el.style.top = `${screen.y - rootRect.top}px`
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
    arm2: THREE.Vector2
  ): void {
    const synced = this._syncCanvas(canvas)
    if (!synced) return
    const { ctx, w, h, dpr } = synced
    ctx.clearRect(0, 0, w * dpr, h * dpr)
    ctx.save()
    ctx.scale(dpr, dpr)

    const arc = interiorAngleArcScreenMetrics(vertex, arm1, arm2, wcs =>
      this._view.wcsToScreen(wcs)
    )
    const rootRect = this._overlayRootOffset()
    const vx = arc.cx - rootRect.left
    const vy = arc.cy - rootRect.top

    ctx.beginPath()
    ctx.arc(vx, vy, arc.r, arc.startAngle, arc.endAngle, arc.antiClockwise)
    ctx.strokeStyle = this._measureCss()
    ctx.lineWidth = 2
    ctx.stroke()
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
    this._drawAngleArc(canvas, vertex, arm1, arm2)
  }

  /** Draws the arc through `through` between `start` and `end` in screen space. @internal */
  private _drawArc(
    canvas: HTMLCanvasElement,
    g: AcExCircleGeom,
    start: THREE.Vector2,
    through: THREE.Vector2,
    end: THREE.Vector2
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
    const { counterClockwise } = arcSweepThroughMiddle(start, through, end, g)

    ctx.beginPath()
    ctx.arc(cx, cy, screenR, sa, ea, counterClockwise)
    ctx.strokeStyle = this._measureCss()
    ctx.lineWidth = 3
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
    this._drawArc(canvas, g, start, through, end)
  }

  /** Fills and strokes a polygon on a synced overlay canvas. @internal */
  private _drawAreaFill(
    canvas: HTMLCanvasElement,
    points: THREE.Vector2[]
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

    ctx.beginPath()
    ctx.moveTo(spts[0]!.x, spts[0]!.y)
    for (let i = 1; i < spts.length; i++) {
      ctx.lineTo(spts[i]!.x, spts[i]!.y)
    }
    ctx.closePath()
    ctx.fillStyle = this._measureFill()
    ctx.fill()
    ctx.strokeStyle = this._measureCss()
    ctx.lineWidth = 2
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
    this._drawAreaFill(canvas, points)
  }
}
