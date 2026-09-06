/**
 * Object snap (OSNAP) types for the offline HTML viewer.
 *
 * These definitions describe **analytic** geometry in world coordinates (WCS, XY plane).
 * All coordinate fields use IEEE-754 `number` (double precision) for measurement-grade
 * accuracy on large-coordinate drawings.
 * Curve/point/path kinds are serialized per layout in {@link AcExLayoutSnapshot.osnap}
 * at export time (see {@link buildOsnapCatalog}). Ordinary drawing `line` strokes are
 * omitted from exported catalogs and rebuilt at runtime from {@link AcExLineBatch}
 * display geometry. Fill/frame boundaries (hatch, TRACE/SOLID, IMAGE clip, …) are
 * stored as compact {@link AcExOsnapPathPrimitive} records, not exploded line edges.
 * Wide LWPOLYLINE entities (start/end width) are also stored as a centerline
 * `path` because they render as meshes and never appear in {@link AcExLineBatch}.
 *
 * @packageDocumentation
 */

/**
 * Object snap modes supported by the offline HTML viewer.
 *
 * Names align with common AutoCAD OSNAP modes. Priority when multiple candidates
 * are within the aperture is handled by {@link AcExOsnapIndex} (endpoint / midpoint /
 * center beat quadrant / node, which beat nearest).
 *
 * - `endpoint` — Line, arc, ellipse arc, and spline start/end vertices.
 * - `midpoint` — Segment midpoint, arc midpoint, or open ellipse arc parameter midpoint.
 * - `center` — Circle/arc/ellipse center (geometric center).
 * - `quadrant` — 0° / 90° / 180° / 270° on circles; arc-limited on arcs; axis crossings on closed ellipses.
 * - `nearest` — Closest point on the curve or segment to the pick point (not tessellated).
 * - `node` — Spline knot locations; also used for `AcDbPoint` entities.
 * - `intersection` — Intersection of two nearby curves (computed on pointer query).
 *
 * Tangent snap is not implemented in the offline viewer.
 */
export type AcExOsnapMode =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'quadrant'
  | 'nearest'
  | 'node'
  | 'intersection'

/**
 * A single object snap candidate returned to the measurement UI.
 *
 * Coordinates are in drawing WCS (XY); Z is not stored.
 */
export interface AcExOsnapPoint {
  /** Snap X in world coordinates. */
  x: number
  /** Snap Y in world coordinates. */
  y: number
  /** Which OSNAP mode produced this point. */
  mode: AcExOsnapMode
}

/**
 * Default OSNAP modes enabled in the offline HTML viewer.
 *
 * Matches the subset commonly used for measure workflows in the main CAD viewer
 * (endpoint, midpoint, center, quadrant, nearest). Additional modes such as
 * `node` can be passed explicitly to {@link AcExOsnapIndex}.
 */
export const ACEX_DEFAULT_OSNAP_MODES: readonly AcExOsnapMode[] = [
  'endpoint',
  'midpoint',
  'center',
  'quadrant',
  'intersection',
  'nearest'
] as const

/**
 * Fields shared by every exported snap primitive.
 *
 * All coordinates are already transformed into layout WCS, including geometry
 * that originated inside block references.
 */
export interface AcExOsnapPrimitiveBase {
  /**
   * Effective layer name used for visibility filtering in the viewer.
   *
   * Follows AutoCAD block rules: entities on layer `0` inside a block inherit
   * the INSERT layer assigned during export.
   */
  layer: string
}

/**
 * A straight line segment (`AcDbLine`, or a non-bulge polyline edge).
 *
 * Not written by {@link buildOsnapCatalog}; retained so runtime / tests can
 * represent tessellated snap edges derived from {@link AcExLineBatch}.
 *
 * @see {@link AcExOsnapLinePrimitive.kind}
 */
export interface AcExOsnapLinePrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'line'
  /** Start X in WCS. */
  x0: number
  /** Start Y in WCS. */
  y0: number
  /** End X in WCS. */
  x1: number
  /** End Y in WCS. */
  y1: number
}

/**
 * A full circle (`AcDbCircle`) in the XY plane.
 *
 * Snap support: center, quadrant (four cardinal directions), nearest on circumference.
 * A full circle has no arc midpoint or endpoints.
 */
export interface AcExOsnapCirclePrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'circle'
  /** Center X in WCS. */
  cx: number
  /** Center Y in WCS. */
  cy: number
  /** Radius in drawing units (after block scale). */
  r: number
  /**
   * Extrusion / normal sign: `+1` = CCW positive angles (+Z normal),
   * `-1` = CW (+Y mirrored, −Z normal).
   */
  normalSign: 1 | -1
}

/**
 * A circular arc (`AcDbArc`, or a bulge segment from `AcDbPolyline`).
 *
 * Angles are AutoCAD OCS parameters in radians. When
 * {@link AcExOsnapArcPrimitive.normalSign} is `+1`, they match WCS `atan2`;
 * when `-1`, X is mirrored (−Z extrusion) so HTML snap can rebuild the WCS
 * stroke. Do not copy clockwise `AcGeCircArc2d` public angles here — those
 * are Y-mirrored, not OCS.
 */
export interface AcExOsnapArcPrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'arc'
  /** Arc center X in WCS. */
  cx: number
  /** Arc center Y in WCS. */
  cy: number
  /** Arc radius in drawing units. */
  r: number
  /** Start angle in radians (entity parameter, not degrees). */
  startAngle: number
  /** End angle in radians (entity parameter, not degrees). */
  endAngle: number
  /** See {@link AcExOsnapCirclePrimitive.normalSign}. */
  normalSign: 1 | -1
}

/**
 * An ellipse or elliptical arc (`AcDbEllipse`).
 *
 * Used when the source entity is an ellipse, or when a circle/arc is transformed
 * by a non-uniform block scale and can no longer be represented as a circular arc.
 *
 * Parameter angles follow the AutoCAD / `AcGeEllipseArc` convention (not geometric
 * polar angle from the center).
 */
export interface AcExOsnapEllipsePrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'ellipse'
  /** Ellipse center X in WCS. */
  cx: number
  /** Ellipse center Y in WCS. */
  cy: number
  /** Unit vector — major axis direction in WCS (XY). */
  majorX: number
  /** Unit vector — major axis direction in WCS (XY). */
  majorY: number
  /** Semi-major axis length in drawing units. */
  majorR: number
  /** Semi-minor axis length in drawing units. */
  minorR: number
  /** Start parameter angle in radians. */
  startAngle: number
  /** End parameter angle in radians. */
  endAngle: number
  /** `true` for a closed ellipse; `false` for an elliptical arc. */
  closed: boolean
  /**
   * Extrusion normal sign (`+1` for +Z, `-1` for -Z).
   *
   * Omitted in older HTML exports; treated as `1`.
   */
  normalSign?: 1 | -1
}

/**
 * A B-spline / NURBS curve (`AcDbSpline`) serialized for runtime evaluation.
 *
 * Control data is copied from the entity geometry at export time and transformed
 * into WCS. The offline viewer evaluates the curve with de Boor (not render
 * tessellation) for nearest-point snap.
 */
export interface AcExOsnapSplinePrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'spline'
  /**
   * Control polygon vertices in WCS: `[x0, y0, x1, y1, …]`.
   *
   * Length is always even; may be empty if the source spline had no control points.
   */
  controlPoints: number[]
  /** Spline degree (typically 3 for cubic splines). */
  degree: number
  /** Knot vector (clamped), same length rules as AutoCAD `AcDbSpline`. */
  knots: number[]
  /**
   * Per-control-point weights for rational splines.
   *
   * When empty at runtime, unit weights are assumed.
   */
  weights: number[]
  /** Whether the spline is closed in parameter space. */
  closed: boolean
  /**
   * Optional fit points in WCS: `[x0, y0, …]`.
   *
   * Reserved for future snap modes; not required for current OSNAP logic.
   */
  fitPoints?: number[]
}

/**
 * A point entity (`AcDbPoint`) in WCS.
 *
 * Contributes `node` (and legacy `endpoint`) snap when those modes are enabled.
 */
export interface AcExOsnapPointPrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'point'
  /** Point X in WCS. */
  x: number
  /** Point Y in WCS. */
  y: number
}

/**
 * One fill/frame/centerline stored as a vertex chain (hatch loop, TRACE/SOLID,
 * IMAGE clip path, OLE frame, wide LWPOLYLINE centerline).
 *
 * Packed as `[x0, y0, bulge0, x1, y1, bulge1, …]`. A non-zero bulge is the
 * AutoCAD polyline bulge for the outgoing segment (same as `AcGeCircArc2d`
 * from start/end/bulge). Indexed by the whole-path bbox at query time so a
 * 200-edge hatch is one RBush entry, not 200 ACEO lines.
 */
export interface AcExOsnapPathPrimitive extends AcExOsnapPrimitiveBase {
  /** Discriminator for {@link AcExOsnapPrimitive}. */
  kind: 'path'
  /**
   * Vertex pack: three numbers per vertex (`x`, `y`, outgoing `bulge`).
   * Length is always a multiple of 3 and at least 6 (two vertices).
   */
  vertices: number[]
  /** When `true`, the last vertex connects back to the first. */
  closed: boolean
}

/**
 * Discriminated union of all analytic primitives stored in a layout snapshot.
 *
 * Select on {@link AcExOsnapPrimitive.kind} before reading geometry fields.
 */
export type AcExOsnapPrimitive =
  | AcExOsnapLinePrimitive
  | AcExOsnapCirclePrimitive
  | AcExOsnapArcPrimitive
  | AcExOsnapEllipsePrimitive
  | AcExOsnapSplinePrimitive
  | AcExOsnapPointPrimitive
  | AcExOsnapPathPrimitive

/**
 * Per-layout catalog of analytic geometry used for object snap.
 *
 * Embedded on {@link AcExLayoutSnapshot.osnap} when exporting HTML.
 * {@link AcExOsnapIndex} indexes ACEO curves/paths together with tessellated
 * line segments from {@link AcExLineBatch}.
 */
export interface AcExOsnapCatalog {
  /** Analytic OSNAP geometry serialized into the HTML snapshot. */
  primitives: AcExOsnapPrimitive[]
}
