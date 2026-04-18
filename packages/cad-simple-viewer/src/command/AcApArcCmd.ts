import {
  AcDbArc,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  eventBus
} from '../editor'
import { AcApI18n } from '../i18n'

const TAU = Math.PI * 2
const EPSILON = 1e-9
const POSITIVE_NORMAL: AcGeVector3dLike = { x: 0, y: 0, z: 1 }
const NEGATIVE_NORMAL: AcGeVector3dLike = { x: 0, y: 0, z: -1 }

// Arc orientation in this command is encoded by the normal direction:
// 1  -> +Z (counterclockwise in XY)
// -1 -> -Z (clockwise in XY)
type ArcNormalSign = 1 | -1

interface ArcDefinition {
  center: AcGePoint3dLike
  radius: number
  startAngle: number
  endAngle: number
  normalSign: ArcNormalSign
}

/**
 * Normalizes an angle to the range [0, 2π).
 *
 * @param angle - Input angle in radians.
 * @returns Normalized angle in radians.
 */
function normalizeAngle(angle: number) {
  const value = angle % TAU
  return value >= 0 ? value : value + TAU
}

/**
 * Computes Euclidean distance in XY plane.
 *
 * @param p1 - First point.
 * @param p2 - Second point.
 * @returns 2D distance between points.
 */
function distance2d(p1: AcGePoint3dLike, p2: AcGePoint3dLike) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * Computes the absolute direction angle from one point to another in degrees.
 *
 * @param from - Origin point.
 * @param to - Target point.
 * @returns Direction angle in degrees.
 */
function directionAngleDeg(from: AcGePoint3dLike, to: AcGePoint3dLike) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

/**
 * Computes point angle around a center under a given arc orientation.
 *
 * For `normalSign = -1` (clockwise), the Y component is mirrored so that
 * angle growth still follows the selected arc direction convention.
 *
 * @param center - Arc center.
 * @param point - Point on the arc/circle.
 * @param normalSign - Arc orientation sign (+Z / -Z).
 * @returns Direction-aware normalized angle in radians.
 */
function angleByNormalSign(
  center: AcGePoint3dLike,
  point: AcGePoint3dLike,
  normalSign: ArcNormalSign
) {
  // For -Z arcs, mirror Y so the angle still increases in the arc direction.
  const dx = point.x - center.x
  const dy = point.y - center.y
  const raw = normalSign === 1 ? Math.atan2(dy, dx) : Math.atan2(-dy, dx)
  return normalizeAngle(raw)
}

/**
 * Maps orientation sign to 3D normal vector.
 *
 * @param sign - Orientation sign.
 * @returns Unit normal vector used by `AcDbArc`.
 */
function toNormal(sign: ArcNormalSign): AcGeVector3dLike {
  return sign === 1 ? POSITIVE_NORMAL : NEGATIVE_NORMAL
}

/**
 * Creates one `AcDbArc` entity from normalized arc definition data.
 *
 * @param definition - Arc definition (center/radius/angles/orientation).
 * @returns New arc entity instance.
 */
function createArcEntity(definition: ArcDefinition) {
  return new AcDbArc(
    definition.center,
    definition.radius,
    definition.startAngle,
    definition.endAngle,
    toNormal(definition.normalSign)
  )
}

/**
 * Applies arc definition fields onto an existing `AcDbArc`.
 *
 * Used by the preview jig to update transient geometry without recreating
 * entity instances on each mouse-move.
 *
 * @param entity - Target arc entity to mutate.
 * @param definition - Source definition values.
 */
function applyArcDefinition(entity: AcDbArc, definition: ArcDefinition) {
  entity.center = definition.center
  entity.radius = definition.radius
  entity.startAngle = definition.startAngle
  entity.endAngle = definition.endAngle
  entity.normal = toNormal(definition.normalSign)
}

/**
 * Creates a tiny placeholder arc used before valid preview geometry exists.
 *
 * @param point - Seed location for fallback arc center.
 * @returns Minimal valid arc definition.
 */
function createFallbackArc(point: AcGePoint3dLike): ArcDefinition {
  return {
    center: { x: point.x, y: point.y, z: 0 },
    radius: 1e-6,
    startAngle: 0,
    endAngle: Math.PI / 2,
    normalSign: 1
  }
}

/**
 * Projects an arbitrary point radially onto a circle.
 *
 * @param center - Circle center.
 * @param radius - Circle radius.
 * @param point - Input point to project.
 * @returns Projected point on circle, or `undefined` when projection fails.
 */
function projectPointToCircle(
  center: AcGePoint3dLike,
  radius: number,
  point: AcGePoint3dLike
) {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const distance = Math.hypot(dx, dy)
  if (distance <= EPSILON) return undefined
  const scale = radius / distance
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
    z: 0
  }
}

/**
 * Tests whether `mid` lies on the forward sweep from `start` to `end`.
 *
 * All angles are treated as normalized radians in [0, 2π).
 *
 * @param start - Sweep start angle.
 * @param mid - Candidate angle to test.
 * @param end - Sweep end angle.
 * @returns `true` if `mid` is on the sweep.
 */
function isAngleOnSweep(start: number, mid: number, end: number) {
  const total = normalizeAngle(end - start)
  const offset = normalizeAngle(mid - start)
  return offset <= total + 1e-7
}

/**
 * Chooses arc orientation for 3-point input so the sweep passes the second point.
 *
 * @param center - Computed circumcenter.
 * @param start - Arc start point.
 * @param second - Point-on-arc (the AutoCAD "second point").
 * @param end - Arc end point.
 * @returns Orientation sign producing the intended 3-point arc.
 */
function chooseThreePointNormalSign(
  center: AcGePoint3dLike,
  start: AcGePoint3dLike,
  second: AcGePoint3dLike,
  end: AcGePoint3dLike
) {
  const startCcw = angleByNormalSign(center, start, 1)
  const secondCcw = angleByNormalSign(center, second, 1)
  const endCcw = angleByNormalSign(center, end, 1)
  const ccwContains = isAngleOnSweep(startCcw, secondCcw, endCcw)

  const startCw = angleByNormalSign(center, start, -1)
  const secondCw = angleByNormalSign(center, second, -1)
  const endCw = angleByNormalSign(center, end, -1)
  const cwContains = isAngleOnSweep(startCw, secondCw, endCw)

  if (ccwContains && !cwContains) return 1 as ArcNormalSign
  if (!ccwContains && cwContains) return -1 as ArcNormalSign

  // Degenerate/near-boundary fallback.
  const cross =
    (second.x - start.x) * (end.y - start.y) -
    (second.y - start.y) * (end.x - start.x)
  return cross >= 0 ? (1 as ArcNormalSign) : (-1 as ArcNormalSign)
}

/**
 * Builds an arc from 3-point input (start / point-on-arc / end).
 *
 * This method computes circumcenter/radius explicitly in XY and chooses
 * orientation so the final sweep passes through `second`. If `reverseDirection`
 * is true, the orientation is flipped (used by Ctrl toggle).
 *
 * @param start - Start point.
 * @param second - Point on arc.
 * @param end - End point.
 * @param reverseDirection - Whether to invert auto-selected orientation.
 * @returns Arc definition or `undefined` when points are invalid.
 */
function createArcFromThreePoints(
  start: AcGePoint3dLike,
  second: AcGePoint3dLike,
  end: AcGePoint3dLike,
  reverseDirection: boolean = false
) {
  // Compute circumcenter from three non-collinear points in XY.
  const x1 = start.x
  const y1 = start.y
  const x2 = second.x
  const y2 = second.y
  const x3 = end.x
  const y3 = end.y
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
  if (Math.abs(d) <= EPSILON) return undefined

  const ux =
    ((x1 * x1 + y1 * y1) * (y2 - y3) +
      (x2 * x2 + y2 * y2) * (y3 - y1) +
      (x3 * x3 + y3 * y3) * (y1 - y2)) /
    d
  const uy =
    ((x1 * x1 + y1 * y1) * (x3 - x2) +
      (x2 * x2 + y2 * y2) * (x1 - x3) +
      (x3 * x3 + y3 * y3) * (x2 - x1)) /
    d

  const center = { x: ux, y: uy, z: 0 }
  const radius = distance2d(center, start)
  if (!Number.isFinite(radius) || radius <= EPSILON) return undefined

  // By default, choose the arc that actually passes through the second point.
  // Ctrl toggle can reverse this selection to the complementary direction.
  const autoNormalSign = chooseThreePointNormalSign(center, start, second, end)
  const normalSign = reverseDirection
    ? (-autoNormalSign as ArcNormalSign)
    : autoNormalSign
  return {
    center,
    radius,
    startAngle: angleByNormalSign(center, start, normalSign),
    endAngle: angleByNormalSign(center, end, normalSign),
    normalSign
  }
}

/**
 * Builds arc by center/start/end with explicit orientation.
 *
 * @param center - Arc center.
 * @param start - Arc start point.
 * @param end - Arc end point.
 * @param normalSign - Orientation sign (+Z / -Z).
 * @returns Arc definition, or `undefined` if geometric constraints fail.
 */
function createArcFromCenterStartEnd(
  center: AcGePoint3dLike,
  start: AcGePoint3dLike,
  end: AcGePoint3dLike,
  normalSign: ArcNormalSign
) {
  const radiusFromStart = distance2d(center, start)
  const radiusFromEnd = distance2d(center, end)
  if (radiusFromStart <= EPSILON || radiusFromEnd <= EPSILON) {
    return undefined
  }
  // Start/end must lie on the same circle (small tolerance for picked input).
  const tolerance = Math.max(EPSILON, radiusFromStart * 1e-6)
  if (Math.abs(radiusFromStart - radiusFromEnd) > tolerance) {
    return undefined
  }

  return {
    center: { x: center.x, y: center.y, z: 0 },
    radius: radiusFromStart,
    startAngle: angleByNormalSign(center, start, normalSign),
    endAngle: angleByNormalSign(center, end, normalSign),
    normalSign
  }
}

/**
 * Builds center-start arc where user end input is projected onto the circle.
 *
 * Useful for preview/interaction where raw cursor point may not lie exactly
 * on the circle defined by center+start.
 *
 * @param center - Arc center.
 * @param start - Arc start point.
 * @param rawEnd - Raw user cursor/pick point.
 * @param normalSign - Orientation sign (+Z / -Z).
 * @returns Arc definition, or `undefined` if projection/geometry fails.
 */
function createArcFromCenterStartProjectedEnd(
  center: AcGePoint3dLike,
  start: AcGePoint3dLike,
  rawEnd: AcGePoint3dLike,
  normalSign: ArcNormalSign
) {
  const radius = distance2d(center, start)
  if (radius <= EPSILON) return undefined
  const end = projectPointToCircle(center, radius, rawEnd)
  if (!end) return undefined
  return createArcFromCenterStartEnd(center, start, end, normalSign)
}

/**
 * Builds center-start arc from included sweep angle.
 *
 * Positive sweep = +Z orientation, negative sweep = -Z orientation.
 *
 * @param center - Arc center.
 * @param start - Arc start point.
 * @param sweepRad - Included angle in radians (signed).
 * @returns Arc definition, or `undefined` for invalid sweep/radius.
 */
function createArcFromCenterStartSweep(
  center: AcGePoint3dLike,
  start: AcGePoint3dLike,
  sweepRad: number
) {
  const radius = distance2d(center, start)
  const sweep = Math.abs(sweepRad)
  if (radius <= EPSILON || sweep <= EPSILON || sweep >= TAU - EPSILON) {
    return undefined
  }

  const normalSign: ArcNormalSign = sweepRad >= 0 ? 1 : -1
  const startAngle = angleByNormalSign(center, start, normalSign)
  const endAngle = normalizeAngle(startAngle + sweep)
  return {
    center: { x: center.x, y: center.y, z: 0 },
    radius,
    startAngle,
    endAngle,
    normalSign
  }
}

/**
 * Builds center-start arc from chord length.
 *
 * Sign of chord length controls orientation; magnitude controls included angle.
 *
 * @param center - Arc center.
 * @param start - Arc start point.
 * @param chordLength - Chord length (signed).
 * @returns Arc definition, or `undefined` when out of geometric range.
 */
function createArcFromCenterStartChord(
  center: AcGePoint3dLike,
  start: AcGePoint3dLike,
  chordLength: number
) {
  const radius = distance2d(center, start)
  const chord = Math.abs(chordLength)
  if (radius <= EPSILON || chord <= EPSILON || chord > 2 * radius + EPSILON) {
    return undefined
  }
  const ratio = Math.max(-1, Math.min(1, chord / (2 * radius)))
  const sweep = 2 * Math.asin(ratio)
  const signedSweep = chordLength >= 0 ? sweep : -sweep
  return createArcFromCenterStartSweep(center, start, signedSweep)
}

/**
 * Builds start-end arc from included angle.
 *
 * @param start - Arc start point.
 * @param end - Arc end point.
 * @param sweepRad - Included angle in radians (signed).
 * @returns Arc definition, or `undefined` if no valid solution exists.
 */
function createArcFromStartEndAngle(
  start: AcGePoint3dLike,
  end: AcGePoint3dLike,
  sweepRad: number
) {
  const chord = distance2d(start, end)
  const sweep = Math.abs(sweepRad)
  if (chord <= EPSILON || sweep <= EPSILON || sweep >= TAU - EPSILON) {
    return undefined
  }

  // chord = 2 * r * sin(theta/2)  ->  r = chord / (2 * sin(theta/2))
  const sinHalf = Math.sin(sweep / 2)
  if (Math.abs(sinHalf) <= EPSILON) return undefined

  const radius = chord / (2 * sinHalf)
  const offsetSquared = radius * radius - (chord * chord) / 4
  if (offsetSquared < -EPSILON) return undefined

  const offset = Math.sqrt(Math.max(0, offsetSquared))
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const ux = -dy / chord
  const uy = dx / chord

  const isCounterClockwise = sweepRad >= 0
  // Two circle centers satisfy start/end + radius. Select side by
  // CW/CCW intent and whether included angle is minor/major.
  const useLeft =
    (isCounterClockwise && sweep <= Math.PI) ||
    (!isCounterClockwise && sweep > Math.PI)
  const side = useLeft ? 1 : -1

  const center = {
    x: midX + ux * offset * side,
    y: midY + uy * offset * side,
    z: 0
  }
  const normalSign: ArcNormalSign = isCounterClockwise ? 1 : -1
  return createArcFromCenterStartEnd(center, start, end, normalSign)
}

/**
 * Builds start-end arc from tangent direction at start.
 *
 * @param start - Arc start point.
 * @param end - Arc end point.
 * @param directionRad - Tangent direction at start (radians).
 * @returns Arc definition, or `undefined` when constraints are degenerate.
 */
function createArcFromStartEndDirection(
  start: AcGePoint3dLike,
  end: AcGePoint3dLike,
  directionRad: number
) {
  // Build center from tangent constraint at start:
  // center lies on line through start with normal to tangent.
  const tx = Math.cos(directionRad)
  const ty = Math.sin(directionRad)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const nx = -ty
  const ny = tx
  const denominator = 2 * (dx * nx + dy * ny)
  if (Math.abs(denominator) <= EPSILON) return undefined

  // Solve center = start + lambda * n so that |center-start| = |center-end|.
  const lambda = (dx * dx + dy * dy) / denominator
  if (!Number.isFinite(lambda)) return undefined

  const center = {
    x: start.x + nx * lambda,
    y: start.y + ny * lambda,
    z: 0
  }
  const radiusVectorX = start.x - center.x
  const radiusVectorY = start.y - center.y
  const cross = radiusVectorX * ty - radiusVectorY * tx
  if (Math.abs(cross) <= EPSILON) return undefined

  const normalSign: ArcNormalSign = cross >= 0 ? 1 : -1
  return createArcFromCenterStartEnd(center, start, end, normalSign)
}

/**
 * Builds start-end arc from radius.
 *
 * Radius sign controls side/orientation (AutoCAD-like behavior).
 *
 * @param start - Arc start point.
 * @param end - Arc end point.
 * @param radiusInput - Radius value (signed).
 * @returns Arc definition, or `undefined` when radius cannot connect points.
 */
function createArcFromStartEndRadius(
  start: AcGePoint3dLike,
  end: AcGePoint3dLike,
  radiusInput: number
) {
  const radius = Math.abs(radiusInput)
  const chord = distance2d(start, end)
  if (radius <= EPSILON || chord <= EPSILON || chord > 2 * radius + EPSILON) {
    return undefined
  }

  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const ux = -dy / chord
  const uy = dx / chord
  const offset = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4))

  // Keep AutoCAD-like behavior:
  // positive radius picks +Z side, negative radius picks mirrored side.
  const side = radiusInput >= 0 ? 1 : -1
  const center = {
    x: midX + ux * offset * side,
    y: midY + uy * offset * side,
    z: 0
  }
  const normalSign: ArcNormalSign = radiusInput >= 0 ? 1 : -1
  return createArcFromCenterStartEnd(center, start, end, normalSign)
}

/**
 * Dynamic preview jig for ARC command.
 *
 * The jig holds one transient `AcDbArc` and updates it from a builder callback
 * as cursor input changes.
 */
class AcApArcJig extends AcEdPreviewJig<AcGePoint3dLike> {
  /**
   * Transient arc entity reused across preview updates.
   */
  private _arc: AcDbArc
  /**
   * Builder callback that resolves current cursor point to arc definition.
   */
  private _builder: (point: AcGePoint3dLike) => ArcDefinition | undefined

  /**
   * Creates a preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Cursor-to-arc definition resolver.
   * @param fallback - Initial valid fallback definition.
   */
  constructor(
    view: AcEdBaseView,
    builder: (point: AcGePoint3dLike) => ArcDefinition | undefined,
    fallback: ArcDefinition
  ) {
    super(view)
    this._builder = builder
    this._arc = createArcEntity(fallback)
  }

  /**
   * Gets transient arc entity.
   */
  get entity(): AcDbArc {
    return this._arc
  }

  /**
   * Updates transient arc for current cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: AcGePoint3dLike) {
    // Ignore invalid intermediate states while the cursor moves.
    const definition = this._builder(point)
    if (!definition) return
    applyArcDefinition(this._arc, definition)
  }
}

/**
 * Numeric preview jig for ARC command.
 *
 * This jig is used by angle, chord-length, and radius prompts where the user
 * is no longer selecting a point directly, but we still want the transient arc
 * to update from the current numeric value.
 *
 * @typeParam T - Numeric prompt value type that drives the preview.
 */
class AcApArcValueJig<T> extends AcEdPreviewJig<T> {
  /**
   * Transient arc entity reused across preview updates.
   */
  private _arc: AcDbArc
  /**
   * Builder callback that resolves current prompt value to an arc definition.
   */
  private _builder: (value: T) => ArcDefinition | undefined

  /**
   * Creates a numeric preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Prompt-value-to-arc definition resolver.
   * @param fallback - Initial valid fallback definition.
   */
  constructor(
    view: AcEdBaseView,
    builder: (value: T) => ArcDefinition | undefined,
    fallback: ArcDefinition
  ) {
    super(view)
    this._builder = builder
    this._arc = createArcEntity(fallback)
  }

  /**
   * Gets transient arc entity.
   */
  get entity(): AcDbArc {
    return this._arc
  }

  /**
   * Updates transient arc for the current numeric input value.
   *
   * @param value - Current prompt value.
   */
  update(value: T) {
    const definition = this._builder(value)
    if (!definition) return
    applyArcDefinition(this._arc, definition)
  }
}

/**
 * Keyword identifiers used to look up localized ARC prompt options.
 *
 * These values map directly to `jig.arc.keywords.*` translation entries and
 * are intentionally kept small because they are only an internal bridge
 * between prompt-building code and i18n resources.
 */
type ArcKeywordKey =
  | 'angle'
  | 'center'
  | 'chordLength'
  | 'direction'
  | 'end'
  | 'radius'

/**
 * Script-selectable ARC entry modes.
 *
 * `AcApArcCmd` still exposes a single `ARC` command externally. These modes are
 * only an internal dispatch layer that allows scripted callers such as the
 * ribbon UI to preselect one AutoCAD-style option family or one exact branch
 * before the normal interactive prompt flow begins.
 *
 * Naming conventions:
 * - `default`: ordinary ARC startup with no preselected branch
 * - `threePoint`: Start/Second/End flow
 * - `startCenter*`: Start-first, then Center family
 * - `startEnd*`: Start-first, then End family
 * - `centerStart*`: Center-first family
 */
type ArcEntryMode =
  | 'default'
  | 'threePoint'
  | 'startCenter'
  | 'startCenterEnd'
  | 'startCenterAngle'
  | 'startCenterLength'
  | 'startEnd'
  | 'startEndAngle'
  | 'startEndDirection'
  | 'startEndRadius'
  | 'centerStart'
  | 'centerStartEnd'
  | 'centerStartAngle'
  | 'centerStartLength'

/**
 * Invalid-geometry categories used for user-facing warning messages.
 *
 * Each key maps to one localized `jig.arc.invalid.*` message so the command can
 * report why a particular geometric construction failed without duplicating
 * message-selection logic throughout the control flow.
 */
type ArcInvalidKey =
  | 'threePoint'
  | 'center'
  | 'angle'
  | 'chordLength'
  | 'direction'
  | 'radius'

/**
 * Normalized scripted ARC entry tokens mapped to an internal entry mode.
 *
 * Tokens are normalized by lowercasing and stripping non-alphanumeric
 * characters before lookup. This lets the command accept a few equivalent
 * spellings for the same branch, for example:
 * - documentation-style phrases such as `Start Center End`
 * - compact aliases such as `SCE`
 * - historical shorthand such as `3P`
 *
 * The table is intentionally centralized so supported scripted spellings remain
 * easy to audit and extend without touching the main execution logic.
 */
const ARC_ENTRY_MODE_BY_TOKEN: Record<string, ArcEntryMode> = {
  '3p': 'threePoint',
  '3point': 'threePoint',
  threepoint: 'threePoint',
  startcenter: 'startCenter',
  sc: 'startCenter',
  startcenterend: 'startCenterEnd',
  sce: 'startCenterEnd',
  startcenterangle: 'startCenterAngle',
  sca: 'startCenterAngle',
  startcenterlength: 'startCenterLength',
  startcenterchordlength: 'startCenterLength',
  scl: 'startCenterLength',
  startend: 'startEnd',
  se: 'startEnd',
  startendangle: 'startEndAngle',
  sea: 'startEndAngle',
  startenddirection: 'startEndDirection',
  sed: 'startEndDirection',
  startendradius: 'startEndRadius',
  ser: 'startEndRadius',
  center: 'centerStart',
  c: 'centerStart',
  centerstart: 'centerStart',
  cs: 'centerStart',
  centerstartend: 'centerStartEnd',
  cse: 'centerStartEnd',
  centerstartangle: 'centerStartAngle',
  csa: 'centerStartAngle',
  centerstartlength: 'centerStartLength',
  centerstartchordlength: 'centerStartLength',
  csl: 'centerStartLength'
}

/**
 * Command to create one arc.
 *
 * Supported input flows align with AutoCAD ARC command options:
 * - Start/Second/End (3-point)
 * - Start/Center/End, Start/Center/Angle, Start/Center/Chord Length
 * - Start/End/Center, Start/End/Angle, Start/End/Direction, Start/End/Radius
 * - Center/Start/End, Center/Start/Angle, Center/Start/Chord Length
 */
export class AcApArcCmd extends AcEdCommand {
  /**
   * Creates ARC command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supports initial Start-point branch and Center-first branch.
   *
   * @param context - Current app context.
   */
  async execute(context: AcApContext) {
    // Keep ARC behavior deterministic for each run (same as PLINE flow).
    AcApDocManager.instance.editor.resetInputToggles()

    const entryMode = this.consumeEntryMode()
    if (entryMode !== 'default') {
      await this.executeEntryMode(context, entryMode)
      return
    }

    // Entry step:
    // Start point by default, or switch to "Center" branch.
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.startPointOrCenter')
    )
    this.addKeyword(prompt, 'center')
    const result = await AcApDocManager.instance.editor.getPoint(prompt)

    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Center') {
        await this.runCenterStartFlow(context)
      }
      return
    }
    if (result.status !== AcEdPromptStatus.OK) return

    await this.runStartFlow(context, result.value!)
  }

  /**
   * Executes one preselected ARC branch.
   *
   * This method is used only when a scripted caller queued an entry token
   * before invoking `ARC`. Instead of starting at the standard root prompt, the
   * command jumps directly into the requested option family so the user still
   * interacts with a single `ARC` command while shortcuts can open a more
   * specific workflow.
   *
   * @param context - Current app context.
   * @param entryMode - Resolved scripted branch to execute.
   */
  private async executeEntryMode(
    context: AcApContext,
    entryMode: ArcEntryMode
  ) {
    switch (entryMode) {
      case 'threePoint':
        await this.runExactThreePointFlow(context)
        return
      case 'startCenter':
        await this.runStartCenterFlowFromEntry(context)
        return
      case 'startCenterEnd':
        await this.runExactStartCenterFlow(context, 'end')
        return
      case 'startCenterAngle':
        await this.runExactStartCenterFlow(context, 'angle')
        return
      case 'startCenterLength':
        await this.runExactStartCenterFlow(context, 'chordLength')
        return
      case 'startEnd':
        await this.runStartEndFlowFromEntry(context)
        return
      case 'startEndAngle':
        await this.runExactStartEndFlow(context, 'angle')
        return
      case 'startEndDirection':
        await this.runExactStartEndFlow(context, 'direction')
        return
      case 'startEndRadius':
        await this.runExactStartEndFlow(context, 'radius')
        return
      case 'centerStart':
        await this.runCenterStartFlow(context)
        return
      case 'centerStartEnd':
        await this.runExactCenterStartFlow(context, 'end')
        return
      case 'centerStartAngle':
        await this.runExactCenterStartFlow(context, 'angle')
        return
      case 'centerStartLength':
        await this.runExactCenterStartFlow(context, 'chordLength')
        return
    }
  }

  /**
   * Consumes one optional scripted ARC entry token when present.
   *
   * This keeps `ARC` as a single command while still allowing ribbon shortcuts
   * to preselect a specific option family or exact branch.
   *
   * The next queued scripted token is treated as an ARC entry selector only
   * when it matches a known token in {@link ARC_ENTRY_MODE_BY_TOKEN}. Unknown
   * input is left untouched so the ordinary command prompts can consume it as
   * regular scripted input.
   *
   * @returns Resolved entry mode, or `'default'` when no special entry token is
   * queued.
   */
  private consumeEntryMode(): ArcEntryMode {
    const token = AcApDocManager.instance.editor.peekScriptInput()
    if (token == null) return 'default'

    const normalized = token
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
    const entryMode = ARC_ENTRY_MODE_BY_TOKEN[normalized]

    if (!entryMode) return 'default'

    AcApDocManager.instance.editor.consumeScriptInput()
    return entryMode
  }

  /**
   * Adds one localized keyword to a prompt options object.
   *
   * @param prompt - Prompt options to extend.
   * @param key - Keyword i18n key suffix.
   */
  private addKeyword(
    prompt:
      | AcEdPromptPointOptions
      | AcEdPromptDoubleOptions
      | AcEdPromptDistanceOptions,
    key: ArcKeywordKey
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.arc.keywords.${key}.display`),
      AcApI18n.t(`jig.arc.keywords.${key}.global`),
      AcApI18n.t(`jig.arc.keywords.${key}.local`)
    )
  }

  /**
   * Appends created arc entity to model space.
   *
   * @param context - Current app context.
   * @param arc - Arc definition to append.
   */
  private appendArc(context: AcApContext, arc: ArcDefinition) {
    context.doc.database.tables.blockTable.modelSpace.appendEntity(
      createArcEntity(arc)
    )
  }

  /**
   * Emits one warning message for invalid geometry input.
   *
   * @param key - Invalid-input category key.
   */
  private warnInvalidGeometry(key: ArcInvalidKey) {
    eventBus.emit('message', {
      message: AcApI18n.t(`jig.arc.invalid.${key}`),
      type: 'warning'
    })
  }

  /**
   * Prompts one start point.
   *
   * This helper is shared by several scripted entry branches that need to begin
   * directly at a known Start-point step instead of the normal ARC root prompt.
   *
   * @returns Selected start point, or `undefined` when the user cancels or the
   * prompt does not complete successfully.
   */
  private async promptStartPoint() {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.startPoint'))
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    return result.status === AcEdPromptStatus.OK ? result.value! : undefined
  }

  /**
   * Prompts one center point, optionally using a base point for feedback.
   *
   * When a base point is provided, the prompt mirrors the standard ARC UX by
   * enabling dashed reference feedback from the previously chosen point.
   *
   * @param basePoint - Optional reference point.
   * @returns Selected center point, or `undefined` when the prompt is aborted.
   */
  private async promptCenterPoint(basePoint?: AcGePoint3dLike) {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.centerPoint'))
    if (basePoint) {
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = new AcGePoint3d(basePoint)
    }
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    return result.status === AcEdPromptStatus.OK ? result.value! : undefined
  }

  /**
   * Prompts one end point, optionally using a base point for feedback.
   *
   * This helper is used by the scripted entry paths that need a plain End-point
   * acquisition step before resuming the standard ARC family logic.
   *
   * @param basePoint - Optional reference point.
   * @returns Selected end point, or `undefined` when the prompt is aborted.
   */
  private async promptEndPoint(basePoint?: AcGePoint3dLike) {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.endPoint'))
    if (basePoint) {
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = new AcGePoint3d(basePoint)
    }
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    return result.status === AcEdPromptStatus.OK ? result.value! : undefined
  }

  /**
   * Prompts the second point on the arc in the 3-point workflow.
   *
   * This is distinct from {@link promptEndPoint} because the 3-point ARC flow
   * uses a different prompt message and semantic meaning: the second point lies
   * somewhere on the arc, not necessarily at its final endpoint.
   *
   * @param start - Arc start point.
   * @returns Selected second point, or `undefined` when the prompt is aborted.
   */
  private async promptSecondPoint(start: AcGePoint3dLike) {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.secondPoint'))
    prompt.useBasePoint = true
    prompt.useDashedLine = true
    prompt.basePoint = new AcGePoint3d(start)
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    return result.status === AcEdPromptStatus.OK ? result.value! : undefined
  }

  /**
   * Runs the exact 3-point flow selected by a scripted entry token.
   *
   * This bypasses the ordinary ARC root prompt and immediately acquires the
   * Start and Second points required for the 3-point construction, then reuses
   * the existing shared finalization logic.
   *
   * @param context - Current app context.
   */
  private async runExactThreePointFlow(context: AcApContext) {
    const start = await this.promptStartPoint()
    if (!start) return

    const second = await this.promptSecondPoint(start)
    if (!second) return

    await this.finishThreePointArc(context, start, second)
  }

  /**
   * Runs the Start-Center option family from an explicit entry token.
   *
   * This mode corresponds to the AutoCAD-style branch where the command is
   * already committed to the Start/Center family, but the final sub-option
   * (End, Angle, or Chord Length) is still chosen interactively.
   *
   * @param context - Current app context.
   */
  private async runStartCenterFlowFromEntry(context: AcApContext) {
    const start = await this.promptStartPoint()
    if (!start) return
    await this.runStartCenterFlow(context, start)
  }

  /**
   * Runs one exact Start-Center-* flow selected by a scripted entry token.
   *
   * Unlike {@link runStartCenterFlowFromEntry}, this method locks both the
   * option family and the terminal construction variant up front. It is used by
   * ribbon dropdown items that represent a fully specified ARC recipe.
   *
   * @param context - Current app context.
   * @param variant - Terminal Start-Center variant to execute after Start and
   * Center are collected.
   */
  private async runExactStartCenterFlow(
    context: AcApContext,
    variant: 'end' | 'angle' | 'chordLength'
  ) {
    const start = await this.promptStartPoint()
    if (!start) return

    const center = await this.promptCenterPoint(start)
    if (!center) return

    if (variant === 'end') {
      await this.finishExactCenterStartEnd(context, center, start)
      return
    }

    if (variant === 'angle') {
      const anglePrompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.arc.includedAngle')
      )
      anglePrompt.allowNegative = true
      anglePrompt.allowZero = false
      anglePrompt.useBasePoint = true
      anglePrompt.useDashedLine = true
      anglePrompt.basePoint = new AcGePoint3d(center)
      anglePrompt.baseAngle = directionAngleDeg(center, start)
      anglePrompt.jig = new AcApArcValueJig(
        context.view,
        degreeValue =>
          createArcFromCenterStartSweep(
            center,
            start,
            this.applyCtrlDirectionValue(this.degToRad(degreeValue))
          ),
        createFallbackArc(start)
      )
      const angleResult =
        await AcApDocManager.instance.editor.getAngle(anglePrompt)
      const angle =
        angleResult.status === AcEdPromptStatus.OK
          ? angleResult.value
          : undefined
      if (angle == null) return

      const arc = createArcFromCenterStartSweep(
        center,
        start,
        this.applyCtrlDirectionValue(this.degToRad(angle))
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('angle')
      }
      return
    }

    const chordPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.arc.chordLength')
    )
    chordPrompt.allowNegative = true
    chordPrompt.allowZero = false
    chordPrompt.useBasePoint = true
    chordPrompt.useDashedLine = true
    chordPrompt.basePoint = new AcGePoint3d(start)
    chordPrompt.jig = new AcApArcValueJig(
      context.view,
      chordValue =>
        createArcFromCenterStartChord(
          center,
          start,
          this.applyCtrlDirectionValue(chordValue)
        ),
      createFallbackArc(start)
    )
    const chordResult =
      await AcApDocManager.instance.editor.getDistance(chordPrompt)
    const chordLength =
      chordResult.status === AcEdPromptStatus.OK ? chordResult.value : undefined
    if (chordLength == null) return

    const arc = createArcFromCenterStartChord(
      center,
      start,
      this.applyCtrlDirectionValue(chordLength)
    )
    if (arc) {
      this.appendArc(context, arc)
    } else {
      this.warnInvalidGeometry('chordLength')
    }
  }

  /**
   * Runs one exact Center-Start-* flow selected by a scripted entry token.
   *
   * This mirrors {@link runExactStartCenterFlow} for the Center-first ARC
   * family, allowing a shortcut to bypass the default root prompt and enter one
   * fully specified Center/Start branch directly.
   *
   * @param context - Current app context.
   * @param variant - Terminal Center-Start variant to execute after Center and
   * Start are collected.
   */
  private async runExactCenterStartFlow(
    context: AcApContext,
    variant: 'end' | 'angle' | 'chordLength'
  ) {
    const center = await this.promptCenterPoint()
    if (!center) return

    const start = await this.promptStartPointFromCenter(center)
    if (!start) return

    if (variant === 'end') {
      await this.finishExactCenterStartEnd(context, center, start)
      return
    }

    if (variant === 'angle') {
      const anglePrompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.arc.includedAngle')
      )
      anglePrompt.allowNegative = true
      anglePrompt.allowZero = false
      anglePrompt.useBasePoint = true
      anglePrompt.useDashedLine = true
      anglePrompt.basePoint = new AcGePoint3d(center)
      anglePrompt.baseAngle = directionAngleDeg(center, start)
      anglePrompt.jig = new AcApArcValueJig(
        context.view,
        degreeValue =>
          createArcFromCenterStartSweep(
            center,
            start,
            this.applyCtrlDirectionValue(this.degToRad(degreeValue))
          ),
        createFallbackArc(start)
      )
      const angleResult =
        await AcApDocManager.instance.editor.getAngle(anglePrompt)
      const angle =
        angleResult.status === AcEdPromptStatus.OK
          ? angleResult.value
          : undefined
      if (angle == null) return

      const arc = createArcFromCenterStartSweep(
        center,
        start,
        this.applyCtrlDirectionValue(this.degToRad(angle))
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('angle')
      }
      return
    }

    const chordPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.arc.chordLength')
    )
    chordPrompt.allowNegative = true
    chordPrompt.allowZero = false
    chordPrompt.useBasePoint = true
    chordPrompt.useDashedLine = true
    chordPrompt.basePoint = new AcGePoint3d(start)
    chordPrompt.jig = new AcApArcValueJig(
      context.view,
      chordValue =>
        createArcFromCenterStartChord(
          center,
          start,
          this.applyCtrlDirectionValue(chordValue)
        ),
      createFallbackArc(start)
    )
    const chordResult =
      await AcApDocManager.instance.editor.getDistance(chordPrompt)
    const chordLength =
      chordResult.status === AcEdPromptStatus.OK ? chordResult.value : undefined
    if (chordLength == null) return

    const arc = createArcFromCenterStartChord(
      center,
      start,
      this.applyCtrlDirectionValue(chordLength)
    )
    if (arc) {
      this.appendArc(context, arc)
    } else {
      this.warnInvalidGeometry('chordLength')
    }
  }

  /**
   * Runs one exact Start-End-* flow selected by a scripted entry token.
   *
   * This path is used when a shortcut already knows that the Start-End family
   * should be used and only needs the command to perform the exact terminal
   * construction indicated by `variant`.
   *
   * @param context - Current app context.
   * @param variant - Terminal Start-End variant to execute after Start and End
   * are collected.
   */
  private async runExactStartEndFlow(
    context: AcApContext,
    variant: 'angle' | 'direction' | 'radius'
  ) {
    const start = await this.promptStartPoint()
    if (!start) return

    const end = await this.promptEndPoint(start)
    if (!end) return

    if (variant === 'angle') {
      const anglePrompt = new AcEdPromptAngleOptions(
        AcApI18n.t('jig.arc.includedAngle')
      )
      anglePrompt.allowNegative = true
      anglePrompt.allowZero = false
      anglePrompt.useBasePoint = true
      anglePrompt.useDashedLine = true
      anglePrompt.basePoint = new AcGePoint3d(start)
      anglePrompt.baseAngle = directionAngleDeg(start, end)
      anglePrompt.jig = new AcApArcValueJig(
        context.view,
        degreeValue =>
          createArcFromStartEndAngle(
            start,
            end,
            this.applyCtrlDirectionValue(this.degToRad(degreeValue))
          ),
        createFallbackArc(start)
      )
      const angleResult =
        await AcApDocManager.instance.editor.getAngle(anglePrompt)
      const angle =
        angleResult.status === AcEdPromptStatus.OK
          ? angleResult.value
          : undefined
      if (angle == null) return

      const arc = createArcFromStartEndAngle(
        start,
        end,
        this.applyCtrlDirectionValue(this.degToRad(angle))
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('angle')
      }
      return
    }

    if (variant === 'direction') {
      const directionPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.arc.tangentDirection')
      )
      directionPrompt.useBasePoint = true
      directionPrompt.useDashedLine = true
      directionPrompt.basePoint = new AcGePoint3d(start)
      directionPrompt.jig = new AcApArcJig(
        context.view,
        point =>
          createArcFromStartEndDirection(
            start,
            end,
            Math.atan2(point.y - start.y, point.x - start.x)
          ),
        createFallbackArc(start)
      )
      const directionResult =
        await AcApDocManager.instance.editor.getPoint(directionPrompt)
      const directionPoint =
        directionResult.status === AcEdPromptStatus.OK
          ? directionResult.value
          : undefined
      if (!directionPoint) return

      const direction = Math.atan2(
        directionPoint.y - start.y,
        directionPoint.x - start.x
      )
      const arc = createArcFromStartEndDirection(start, end, direction)
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('direction')
      }
      return
    }

    const radiusPrompt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.arc.radius')
    )
    radiusPrompt.allowNegative = true
    radiusPrompt.allowZero = false
    radiusPrompt.useBasePoint = true
    radiusPrompt.useDashedLine = true
    radiusPrompt.basePoint = new AcGePoint3d(start)
    radiusPrompt.jig = new AcApArcValueJig(
      context.view,
      radiusValue =>
        createArcFromStartEndRadius(
          start,
          end,
          this.applyCtrlDirectionValue(radiusValue)
        ),
      createFallbackArc(start)
    )
    const radiusResult =
      await AcApDocManager.instance.editor.getDistance(radiusPrompt)
    const radius =
      radiusResult.status === AcEdPromptStatus.OK
        ? radiusResult.value
        : undefined
    if (radius == null) return

    const arc = createArcFromStartEndRadius(
      start,
      end,
      this.applyCtrlDirectionValue(radius)
    )
    if (arc) {
      this.appendArc(context, arc)
    } else {
      this.warnInvalidGeometry('radius')
    }
  }

  /**
   * Runs the Start-End option family from an explicit entry token.
   *
   * This mode corresponds to the AutoCAD-style Start/End branch where the
   * family is preselected, but the final option (Center, Angle, Direction, or
   * Radius) is still chosen through the usual interactive prompts.
   *
   * @param context - Current app context.
   */
  private async runStartEndFlowFromEntry(context: AcApContext) {
    const start = await this.promptStartPoint()
    if (!start) return
    await this.runStartEndFlow(context, start)
  }

  /**
   * Prompts one start point using the given center point as reference.
   *
   * The supplied center point is used as the base point so the visual feedback
   * matches the standard Center/Start ARC family experience.
   *
   * @param center - Arc center point.
   * @returns Selected start point, or `undefined` when the prompt is aborted.
   */
  private async promptStartPointFromCenter(center: AcGePoint3dLike) {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.startPoint'))
    prompt.useBasePoint = true
    prompt.useDashedLine = true
    prompt.basePoint = new AcGePoint3d(center)
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    return result.status === AcEdPromptStatus.OK ? result.value! : undefined
  }

  /**
   * Finishes one exact Center-Start-End style flow with end-point preview.
   *
   * This helper exists because the exact scripted branch needs the same live
   * preview behavior as the interactive Center/Start/End path, but without the
   * intermediate option-selection prompt used by the generic family handler.
   *
   * @param context - Current app context.
   * @param center - Arc center point.
   * @param start - Arc start point.
   */
  private async finishExactCenterStartEnd(
    context: AcApContext,
    center: AcGePoint3dLike,
    start: AcGePoint3dLike
  ) {
    const endPrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.endPoint'))
    endPrompt.useBasePoint = true
    endPrompt.useDashedLine = true
    endPrompt.basePoint = new AcGePoint3d(start)
    endPrompt.jig = new AcApArcJig(
      context.view,
      point =>
        createArcFromCenterStartProjectedEnd(
          center,
          start,
          point,
          this.applyCtrlDirectionSign(1)
        ),
      createFallbackArc(start)
    )

    const endResult = await AcApDocManager.instance.editor.getPoint(endPrompt)
    if (endResult.status !== AcEdPromptStatus.OK) return

    const arc = createArcFromCenterStartProjectedEnd(
      center,
      start,
      endResult.value!,
      this.applyCtrlDirectionSign(1)
    )
    if (arc) {
      this.appendArc(context, arc)
    } else {
      this.warnInvalidGeometry('center')
    }
  }

  /**
   * Gets direction factor from Ctrl-toggle state.
   *
   * @returns `1` for normal direction, `-1` for flipped direction.
   */
  private getArcDirectionFactor() {
    const toggles = AcApDocManager.instance.editor.getInputToggles()
    return toggles.ctrlArcFlip ? -1 : 1
  }

  /**
   * Applies Ctrl direction factor to orientation sign.
   *
   * @param sign - Base orientation sign.
   * @returns Possibly flipped orientation sign.
   */
  private applyCtrlDirectionSign(sign: ArcNormalSign): ArcNormalSign {
    return (sign * this.getArcDirectionFactor()) as ArcNormalSign
  }

  /**
   * Applies Ctrl direction factor to a signed numeric input.
   *
   * @param value - Signed value (angle/chord/radius).
   * @returns Value with direction factor applied.
   */
  private applyCtrlDirectionValue(value: number) {
    // Used by signed numeric inputs (angle/chord/radius), so Ctrl can flip sign.
    return value * this.getArcDirectionFactor()
  }

  /**
   * Gets whether current Ctrl-toggle indicates direction reversal.
   *
   * @returns `true` when direction is flipped.
   */
  private isCtrlDirectionFlipped() {
    // 3-point flow uses geometric auto-direction first, then optional Ctrl reverse.
    const toggles = AcApDocManager.instance.editor.getInputToggles()
    return toggles.ctrlArcFlip
  }

  /**
   * Handles Start-first main branch.
   *
   * Flow:
   * - Start -> Second -> End (3-point)
   * - Start -> Center -> ...
   * - Start -> End -> ...
   *
   * @param context - Current app context.
   * @param start - Start point picked by user.
   */
  private async runStartFlow(context: AcApContext, start: AcGePoint3dLike) {
    // After Start:
    // - Pick second point directly -> 3-point arc
    // - Or choose Center / End option families
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.secondPointOrOptions')
    )
    this.addKeyword(prompt, 'center')
    this.addKeyword(prompt, 'end')
    prompt.useBasePoint = true
    prompt.useDashedLine = true
    prompt.basePoint = new AcGePoint3d(start)

    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.OK) {
      await this.finishThreePointArc(context, start, result.value!)
      return
    }
    if (result.status !== AcEdPromptStatus.Keyword) return

    if (result.stringResult === 'Center') {
      await this.runStartCenterFlow(context, start)
      return
    }
    if (result.stringResult === 'End') {
      await this.runStartEndFlow(context, start)
    }
  }

  /**
   * Completes 3-point arc flow (Start/Second/End).
   *
   * @param context - Current app context.
   * @param start - Start point.
   * @param second - Point on arc.
   */
  private async finishThreePointArc(
    context: AcApContext,
    start: AcGePoint3dLike,
    second: AcGePoint3dLike
  ) {
    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.endPoint'))
    prompt.useBasePoint = true
    prompt.useDashedLine = true
    prompt.basePoint = new AcGePoint3d(start)
    prompt.jig = new AcApArcJig(
      context.view,
      point =>
        createArcFromThreePoints(
          start,
          second,
          point,
          // Live preview follows the same Ctrl reverse behavior as final commit.
          this.isCtrlDirectionFlipped()
        ),
      createFallbackArc(start)
    )

    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const arc = createArcFromThreePoints(
      start,
      second,
      result.value!,
      // Keep commit behavior identical to preview.
      this.isCtrlDirectionFlipped()
    )
    if (arc) {
      this.appendArc(context, arc)
    } else {
      this.warnInvalidGeometry('threePoint')
    }
  }

  /**
   * Runs Center-first branch:
   * Center -> Start -> (End | Angle | Chord Length)
   *
   * @param context - Current app context.
   */
  private async runCenterStartFlow(context: AcApContext) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.centerPoint')
    )
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK) return
    const center = centerResult.value!

    const startPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.startPoint')
    )
    startPrompt.useBasePoint = true
    startPrompt.useDashedLine = true
    startPrompt.basePoint = new AcGePoint3d(center)
    const startResult =
      await AcApDocManager.instance.editor.getPoint(startPrompt)
    if (startResult.status !== AcEdPromptStatus.OK) return

    await this.finishCenterStartFlow(context, center, startResult.value!)
  }

  /**
   * Runs Start->Center branch:
   * Start -> Center -> (End | Angle | Chord Length)
   *
   * @param context - Current app context.
   * @param start - Start point.
   */
  private async runStartCenterFlow(
    context: AcApContext,
    start: AcGePoint3dLike
  ) {
    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.centerPoint')
    )
    centerPrompt.useBasePoint = true
    centerPrompt.useDashedLine = true
    centerPrompt.basePoint = new AcGePoint3d(start)
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK) return

    await this.finishCenterStartFlow(context, centerResult.value!, start)
  }

  /**
   * Shared handler for center-start option family.
   *
   * Supports:
   * - End point picking
   * - Included angle input
   * - Chord length input
   *
   * @param context - Current app context.
   * @param center - Arc center.
   * @param start - Arc start point.
   */
  private async finishCenterStartFlow(
    context: AcApContext,
    center: AcGePoint3dLike,
    start: AcGePoint3dLike
  ) {
    // Center/Start branch:
    // End by pick, or numeric Angle / ChordLength.
    const endPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.endPointOrOptions')
    )
    this.addKeyword(endPrompt, 'angle')
    this.addKeyword(endPrompt, 'chordLength')
    endPrompt.useBasePoint = true
    endPrompt.useDashedLine = true
    endPrompt.basePoint = new AcGePoint3d(start)
    endPrompt.jig = new AcApArcJig(
      context.view,
      point =>
        createArcFromCenterStartProjectedEnd(
          center,
          start,
          point,
          this.applyCtrlDirectionSign(1)
        ),
      createFallbackArc(start)
    )

    const endResult = await AcApDocManager.instance.editor.getPoint(endPrompt)
    if (endResult.status === AcEdPromptStatus.OK) {
      const arc = createArcFromCenterStartProjectedEnd(
        center,
        start,
        endResult.value!,
        this.applyCtrlDirectionSign(1)
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('center')
      }
      return
    }
    if (endResult.status !== AcEdPromptStatus.Keyword) return

    if (endResult.stringResult === 'Angle') {
      const anglePrompt = new AcEdPromptDoubleOptions(
        AcApI18n.t('jig.arc.includedAngle')
      )
      anglePrompt.allowZero = false
      anglePrompt.allowNegative = true
      const angleResult =
        await AcApDocManager.instance.editor.getDouble(anglePrompt)
      if (angleResult.status !== AcEdPromptStatus.OK) return

      const arc = createArcFromCenterStartSweep(
        center,
        start,
        this.applyCtrlDirectionValue(this.degToRad(angleResult.value!))
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('angle')
      }
      return
    }

    if (endResult.stringResult === 'ChordLength') {
      const chordPrompt = new AcEdPromptDistanceOptions(
        AcApI18n.t('jig.arc.chordLength')
      )
      chordPrompt.allowZero = false
      chordPrompt.allowNegative = true
      const chordResult =
        await AcApDocManager.instance.editor.getDistance(chordPrompt)
      if (chordResult.status !== AcEdPromptStatus.OK) return

      const arc = createArcFromCenterStartChord(
        center,
        start,
        this.applyCtrlDirectionValue(chordResult.value!)
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('chordLength')
      }
    }
  }

  /**
   * Handles Start-End option family.
   *
   * Supports:
   * - Start -> End -> Center
   * - Start -> End -> Angle
   * - Start -> End -> Direction
   * - Start -> End -> Radius
   *
   * @param context - Current app context.
   * @param start - Arc start point.
   */
  private async runStartEndFlow(context: AcApContext, start: AcGePoint3dLike) {
    const endPrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.arc.endPoint'))
    endPrompt.useBasePoint = true
    endPrompt.useDashedLine = true
    endPrompt.basePoint = new AcGePoint3d(start)
    const endResult = await AcApDocManager.instance.editor.getPoint(endPrompt)
    if (endResult.status !== AcEdPromptStatus.OK) return
    const end = endResult.value!

    // Start/End branch:
    // Center by pick, or Angle / Direction / Radius.
    const centerOrOptionPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.arc.centerPointOrOptions')
    )
    this.addKeyword(centerOrOptionPrompt, 'angle')
    this.addKeyword(centerOrOptionPrompt, 'direction')
    this.addKeyword(centerOrOptionPrompt, 'radius')
    centerOrOptionPrompt.useBasePoint = true
    centerOrOptionPrompt.useDashedLine = true
    centerOrOptionPrompt.basePoint = new AcGePoint3d(start)
    centerOrOptionPrompt.jig = new AcApArcJig(
      context.view,
      point =>
        createArcFromCenterStartEnd(
          point,
          start,
          end,
          this.applyCtrlDirectionSign(1)
        ),
      createFallbackArc(start)
    )

    const centerOrOptionResult =
      await AcApDocManager.instance.editor.getPoint(centerOrOptionPrompt)
    if (centerOrOptionResult.status === AcEdPromptStatus.OK) {
      const arc = createArcFromCenterStartEnd(
        centerOrOptionResult.value!,
        start,
        end,
        this.applyCtrlDirectionSign(1)
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('center')
      }
      return
    }
    if (centerOrOptionResult.status !== AcEdPromptStatus.Keyword) return

    if (centerOrOptionResult.stringResult === 'Angle') {
      const anglePrompt = new AcEdPromptDoubleOptions(
        AcApI18n.t('jig.arc.includedAngle')
      )
      anglePrompt.allowZero = false
      anglePrompt.allowNegative = true
      const angleResult =
        await AcApDocManager.instance.editor.getDouble(anglePrompt)
      if (angleResult.status !== AcEdPromptStatus.OK) return

      const arc = createArcFromStartEndAngle(
        start,
        end,
        this.applyCtrlDirectionValue(this.degToRad(angleResult.value!))
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('angle')
      }
      return
    }

    if (centerOrOptionResult.stringResult === 'Direction') {
      const directionPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.arc.tangentDirection')
      )
      directionPrompt.useBasePoint = true
      directionPrompt.useDashedLine = true
      directionPrompt.basePoint = new AcGePoint3d(start)
      const directionResult =
        await AcApDocManager.instance.editor.getPoint(directionPrompt)
      if (directionResult.status !== AcEdPromptStatus.OK) return

      const directionPoint = directionResult.value!
      const direction = Math.atan2(
        directionPoint.y - start.y,
        directionPoint.x - start.x
      )
      const arc = createArcFromStartEndDirection(start, end, direction)
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('direction')
      }
      return
    }

    if (centerOrOptionResult.stringResult === 'Radius') {
      const radiusPrompt = new AcEdPromptDistanceOptions(
        AcApI18n.t('jig.arc.radius')
      )
      radiusPrompt.allowZero = false
      radiusPrompt.allowNegative = true
      const radiusResult =
        await AcApDocManager.instance.editor.getDistance(radiusPrompt)
      if (radiusResult.status !== AcEdPromptStatus.OK) return

      const arc = createArcFromStartEndRadius(
        start,
        end,
        this.applyCtrlDirectionValue(radiusResult.value!)
      )
      if (arc) {
        this.appendArc(context, arc)
      } else {
        this.warnInvalidGeometry('radius')
      }
    }
  }

  /**
   * Converts degrees to radians.
   *
   * @param degree - Angle in degrees.
   * @returns Angle in radians.
   */
  private degToRad(degree: number) {
    return (degree * Math.PI) / 180
  }
}
