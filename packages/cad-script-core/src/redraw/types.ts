import type { Point2dInput } from '../tools/types.js'

/**
 * How much physical accuracy an image redraw may claim.
 *
 * - `strict-dimensioned`: engineering deliverable; needs real units and a
 *   known/scaled calibration.
 * - `general` (default): mixed-quality sources; draws everything.
 * - `hybrid`: dimensions where readable, calibrated proportions elsewhere.
 * - `visual-trace`: copies visible linework without a real-world scale claim.
 * - `geometry-only`: draws object geometry only (no text, dimensions,
 *   leaders, or table text).
 */
export type RedrawProfile =
  | 'strict-dimensioned'
  | 'general'
  | 'hybrid'
  | 'visual-trace'
  | 'geometry-only'

/** Drawing units a redraw spec may declare. `unitless` never assumes mm. */
export type RedrawUnits = 'unitless' | 'mm' | 'cm' | 'm' | 'in' | 'ft'

/**
 * Where a value came from.
 *
 * - `known`: stated by the user or legible in the image (a dimension text).
 * - `scaled`: measured on the image after a documented calibration.
 * - `inferred`: derived from symmetry, continuity, or engineering judgment.
 * - `unreadable`: visible but not reliably decipherable.
 */
export type RedrawEvidenceLevel = 'known' | 'scaled' | 'inferred' | 'unreadable'

/** Calibration method mapping image pixels to CAD coordinates. */
export type RedrawCalibrationMethod =
  | 'dimension-anchor'
  | 'similarity'
  | 'affine'
  | 'homography'
  | 'sheet-scale'
  | 'visual-only'

/** Point accepted in a spec: `[x, y]` or `{ x, y }`. */
export type RedrawPointInput = [number, number] | Point2dInput

/** Entity types a redraw spec can contain. */
export const REDRAW_ENTITY_TYPES = [
  'line',
  'polyline',
  'rectangle',
  'circle',
  'arc',
  'ellipse',
  'center_mark',
  'text',
  'mtext',
  'leader',
  'linear_dimension',
  'aligned_dimension',
  'radial_dimension',
  'diameter_dimension',
  'angular_dimension',
  'table'
] as const

/** One entity type from {@link REDRAW_ENTITY_TYPES}. */
export type RedrawEntityType = (typeof REDRAW_ENTITY_TYPES)[number]

/** Annotation types skipped by the `geometry-only` profile. */
export const REDRAW_ANNOTATION_TYPES: ReadonlySet<RedrawEntityType> = new Set([
  'text',
  'mtext',
  'leader',
  'linear_dimension',
  'aligned_dimension',
  'radial_dimension',
  'diameter_dimension',
  'angular_dimension'
])

/** Dimension entity types. */
export const REDRAW_DIMENSION_TYPES: ReadonlySet<RedrawEntityType> = new Set([
  'linear_dimension',
  'aligned_dimension',
  'radial_dimension',
  'diameter_dimension',
  'angular_dimension'
])

/** Groups a draw can omit, matching the original `--omit` flags. */
export type RedrawOmitGroup =
  | 'text'
  | 'dimensions'
  | 'leaders'
  | 'tableText'
  | 'tables'
  | 'borders'
  | 'center'

/** Layer the redraw should create (only when missing). */
export interface RedrawLayerSpec {
  name: string
  /** AutoCAD color index 1–255. */
  color?: number
  /** `Continuous`, `HIDDEN`, `CENTER`, `DASHED`, `PHANTOM`, or `DOT`. */
  linetype?: string
}

/** One independently scaled region of the source image. */
export interface RedrawViewSpec {
  id: string
  /** Pixel ROI `[left, top, right, bottom]` (top-left origin). */
  sourceRoi?: [number, number, number, number]
  /** CAD point the ROI bottom-left maps to (scale-only calibrations). */
  cadOrigin?: RedrawPointInput
  /** Calibration id used for this view's `coords: 'source'` entities. */
  calibration?: string
  notes?: string
}

/** Evidence for one pixel → CAD transform. */
export interface RedrawCalibrationSpec {
  id: string
  method: RedrawCalibrationMethod
  /** Pixel points (top-left origin, y down). */
  sourcePoints?: RedrawPointInput[]
  /** Matching CAD points. */
  cadPoints?: RedrawPointInput[]
  /** CAD units per pixel (scale-only methods). */
  scale?: number
  /** Real length between the two source points (dimension anchor). */
  value?: number
  evidence?: RedrawEvidenceLevel
  sourceRefs?: string[]
  notes?: string
}

/** Numeric consistency check between readable dimensions. */
export interface RedrawConstraintSpec {
  id?: string
  /** `sum`, `difference`, `equality`; other types stay descriptive. */
  type: string
  terms?: number[]
  expected?: number
  tolerance?: number
  notes?: string
}

/** Post-draw numeric check against drawn geometry. */
export interface RedrawCheckSpec {
  name?: string
  /** `length`, `radius`, `distance`, `angle`, `area`, or `dimension`. */
  measure: 'length' | 'radius' | 'distance' | 'angle' | 'area' | 'dimension'
  /** Spec entity id for single-entity measures. */
  entity?: string
  /** Spec entity id (its center) or a CAD point, for `distance`. */
  from?: string | RedrawPointInput
  /** Spec entity id (its center) or a CAD point, for `distance`. */
  to?: string | RedrawPointInput
  expected: number
  tolerance?: number
}

/**
 * One entity in a redraw spec. Geometry fields depend on `type`; see the
 * script API summary for the list.
 */
export interface RedrawEntitySpec {
  id?: string
  type: string
  viewId?: string
  /** `cad` (default) or `source` (pixel coordinates mapped by calibration). */
  coords?: 'cad' | 'source'
  layer?: string
  color?: number
  linetype?: string
  evidence?: RedrawEvidenceLevel
  confidence?: number
  sourceRefs?: string[]
  notes?: string
  [field: string]: unknown
}

/** Validation-only switches. */
export interface RedrawValidationSpec {
  requiredLayers?: string[]
  forbiddenEntityTypes?: string[]
  constraintTolerance?: number
  /** Absolute tolerance for dimension `value` checks. */
  dimensionTolerance?: number
}

/** Semantic description of a drawing reconstructed from an image. */
export interface RedrawSpec {
  schemaVersion?: string
  profile?: RedrawProfile
  units?: RedrawUnits
  /** Default coordinate space for entities (`cad` when omitted). */
  coords?: 'cad' | 'source'
  source?: {
    pixelSize?: [number, number]
    notes?: string
    [field: string]: unknown
  }
  views?: RedrawViewSpec[]
  calibration?: RedrawCalibrationSpec[]
  constraints?: RedrawConstraintSpec[]
  layers?: RedrawLayerSpec[]
  entities: RedrawEntitySpec[]
  checks?: RedrawCheckSpec[]
  validation?: RedrawValidationSpec
  /** Default text / dimension text height (default ≈ drawing span / 80). */
  textHeight?: number
  /** Linetype scale for dashed layers (default follows `textHeight`). */
  linetypeScale?: number
  /** Assumptions the model wants carried into the report. */
  assumptions?: string[]
}

/** Final disposition, mirroring the original skill. */
export type RedrawStatus =
  | 'pass'
  | 'pass_with_warnings'
  | 'needs_review'
  | 'blocked'
  | 'fail'

/** One validation or draw finding. */
export interface RedrawIssue {
  level: 'error' | 'warning'
  /**
   * Error category: `invalid` (fail), `blocked` (strict profile evidence
   * missing), or `conflict` (constraint mismatch → needs_review).
   */
  kind?: 'invalid' | 'blocked' | 'conflict'
  path: string
  message: string
}
