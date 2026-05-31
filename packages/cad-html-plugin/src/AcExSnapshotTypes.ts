import type { AcExOsnapCatalog } from './AcExOsnapPrimitiveTypes'

/**
 * Current snapshot schema version.
 * Increment when breaking changes are introduced to {@link AcExSnapshot}.
 */
export const ACEX_SNAPSHOT_VERSION = 2 as const

/**
 * Literal type of the supported snapshot schema version.
 * Always matches {@link ACEX_SNAPSHOT_VERSION}.
 */
export type AcExSnapshotVersion = typeof ACEX_SNAPSHOT_VERSION

/**
 * Drawing units and display formatting copied from an open database
 * for use by the offline HTML viewer (measurement labels, precision, etc.).
 */
export interface AcExViewerUnits {
  /** AutoCAD `INSUNITS` — drawing units for insertion content. */
  insunits: number
  /** AutoCAD `LUNITS` — linear unit format (scientific, decimal, engineering, …). */
  lunits: number
  /** AutoCAD `LUPREC` — decimal places for linear measurements. */
  luprec: number
  /** AutoCAD `AUNITS` — angular unit format (degrees, gradians, radians, …). */
  aunits: number
  /** AutoCAD `AUPREC` — decimal places for angular measurements. */
  auprec: number
  /** AutoCAD `MEASUREMENT` — metric (1) vs imperial (0) when ambiguous. */
  measurement: number
  /** AutoCAD `LTSCALE` — global linetype scale factor. */
  ltscale: number
  /** AutoCAD `ANGBASE` — base angle for polar coordinates (radians). */
  angbase: number
  /** AutoCAD `ANGDIR` — 0 = counter-clockwise positive, 1 = clockwise. */
  angdir: number
}

/**
 * Axis-aligned bounding box in world coordinates (WCS), XY plane.
 * Z is not stored; extents are used for zoom-to-extents and layer fit.
 */
export interface AcExExtents {
  /** Minimum X in drawing units. */
  minX: number
  /** Minimum Y in drawing units. */
  minY: number
  /** Maximum X in drawing units. */
  maxX: number
  /** Maximum Y in drawing units. */
  maxY: number
}

/**
 * Layer table entry preserved for the offline viewer layer panel.
 */
export interface AcExLayerSnapshot {
  /** Layer name (unique key in the snapshot). */
  name: string
  /** Display color as 24-bit RGB hex (e.g. `0xff0000`). */
  color: number
  /** Whether the layer is on (visible) at export time. */
  visible: boolean
}

/**
 * Pre-scaled linetype dash/gap sequence stored on a line batch.
 * Values match the `pattern` / `patternLength` uniforms on the export-time shader.
 */
export interface AcExLinePattern {
  /** Scaled dash and gap lengths for the linetype shader. */
  pattern: number[]
  /** Total repeat length of {@link AcExLinePattern.pattern}. */
  patternLength: number
  /** Viewport scale factor paired with {@link AcExLinePattern.pattern}. */
  viewportScale: number
}

/**
 * One hatch pattern definition line serialized for offline playback.
 */
export interface AcExHatchPatternLine {
  /** Pattern line angle in radians. */
  angle: number
  /** Pattern origin in hatch object space. */
  base: [number, number]
  /** Spacing offset between repeated pattern lines. */
  offset: [number, number]
  /** Dash and gap lengths for this pattern line. */
  dashLengths: number[]
  /** Total repeat length of {@link AcExHatchPatternLine.dashLengths}. */
  patternLength: number
}

/**
 * Hatch fill pattern serialized for offline playback.
 */
export interface AcExHatchPattern {
  /** Hatch-wide rotation applied before individual pattern lines. */
  patternAngle: number
  /** One or more pattern definition lines. */
  patternLines: AcExHatchPatternLine[]
}

/**
 * One packed line batch suitable for `THREE.LineSegments`
 * (pairs of vertices interpreted as line segments).
 */
export interface AcExLineBatch {
  /** Layer name used for grouping and visibility in the viewer. */
  layer: string
  /** Line color as 24-bit RGB hex. */
  color: number
  /** Rebase origin (world translation) stored in double precision; not baked into {@link AcExLineBatch.positions}. */
  offset: [number, number, number]
  /**
   * Rebased local vertex buffer: `[x0, y0, z0, x1, y1, z1, …]`.
   * World position = local + {@link AcExLineBatch.offset} (applied via object transform at render time).
   */
  positions: Float32Array
  /**
   * Optional index buffer referencing vertices in {@link AcExLineBatch.positions}.
   * When omitted, positions are consumed sequentially as segment pairs.
   */
  indices?: Uint32Array
  /** Optional linetype pattern for dashed/dotted lines. */
  linePattern?: AcExLinePattern
  /**
   * Per-vertex cumulative distance along the polyline, required when
   * {@link AcExLineBatch.linePattern} is set.
   */
  lineDistances?: Float32Array
}

/**
 * Gradient hatch fill serialized for offline playback.
 */
export interface AcExGradientFill {
  /** Gradient start color as 24-bit RGB hex. */
  startColor: number
  /** Gradient end color as 24-bit RGB hex. */
  endColor: number
  /** Gradient rotation in radians. */
  angle: number
  /** Gradient shift along the primary axis. */
  shift: number
  /** Gradient type enum matching {@link createGradientHatchShaderMaterial}. */
  gradientType: number
}

/**
 * One packed mesh or point batch (filled regions, MText quads, point glyphs, etc.)
 * rendered in the offline viewer.
 */
export interface AcExMeshBatch {
  /** Layer name used for grouping and visibility in the viewer. */
  layer: string
  /** Fill color as 24-bit RGB hex. */
  color: number
  /** Rebase origin (world translation) stored in double precision; not baked into {@link AcExMeshBatch.positions}. */
  offset: [number, number, number]
  /**
   * Rebased local vertex buffer: `[x0, y0, z0, x1, y1, z1, …]`.
   * World position = local + {@link AcExMeshBatch.offset} (applied via object transform at render time).
   */
  positions: Float32Array
  /**
   * When `true`, {@link AcExMeshBatch.positions} is rendered with `THREE.Points`
   * instead of a filled `THREE.Mesh`.
   */
  points?: boolean
  /**
   * Triangle index buffer into {@link AcExMeshBatch.positions}.
   * Required for filled mesh batches; omitted for {@link AcExMeshBatch.points}.
   */
  indices?: Uint32Array
  /** Optional hatch pattern for non-solid fills. */
  hatchPattern?: AcExHatchPattern
  /** Optional gradient fill parameters for gradient hatches. */
  gradientFill?: AcExGradientFill
  /**
   * Normalized gradient coordinates per vertex `[x0, y0, x1, y1, …]`.
   * Required when {@link AcExMeshBatch.gradientFill} is set.
   */
  gradientPositions?: Float32Array
  /** Material side when a custom fill shader is used (`0` = front, `1` = back). */
  side?: number
}

/**
 * Geometry for one paper space or model space layout.
 * Contains only display batches — no block definitions or entity handles.
 */
export interface AcExLayoutSnapshot {
  /** Block-table-record id of the layout (matches `activeLayoutBtrId` when active). */
  btrId: string
  /** Human-readable layout name when available (e.g. "Model", "Layout1"). */
  name: string
  /** `true` for model space; `false` for paper space layouts. */
  isModelSpace: boolean
  /** All line/curve batches belonging to this layout. */
  lineBatches: AcExLineBatch[]
  /** All mesh/fill batches belonging to this layout. */
  meshBatches: AcExMeshBatch[]
  /**
   * Analytic geometry for object snap (OSNAP) in the offline viewer.
   *
   * Populated at export time by {@link buildOsnapCatalog} from the drawing database
   * (not from tessellated THREE batches). Includes lines, arcs, circles, ellipses,
   * splines, and points in WCS, including entities inside block references.
   *
   * Coordinates are stored as IEEE-754 `number` (double) in JSON for measurement-grade
   * precision; they are not converted to {@link Float32Array}.
   *
   * When {@link AcExOsnapCatalog.primitives} is non-empty, {@link AcExOsnapIndex}
   * uses these definitions exclusively and does **not** snap to discretized
   * {@link AcExLineBatch} / {@link AcExMeshBatch} vertices.
   */
  osnap?: AcExOsnapCatalog
}

/**
 * Display-only snapshot embedded in exported HTML.
 * Does not contain DXF/DWG bytes, `AcDb` entity records, or editable drawing state.
 *
 * Geometry buffers ({@link AcExLineBatch.positions}, indices, distances, etc.)
 * are stored as typed arrays in memory and serialized as raw binary in
 * {@link encodeSnapshot} / {@link decodeSnapshot}.
 */
export interface AcExSnapshot {
  /** Schema version; must equal {@link ACEX_SNAPSHOT_VERSION}. */
  version: AcExSnapshotVersion
  /** Document-level metadata and viewer defaults. */
  meta: {
    /** Optional drawing title shown in the status bar when no error occurs. */
    title?: string
    /** ISO-8601 timestamp when the snapshot was created. */
    createdAt: string
    /** Database header extents (`EXTMIN` / `EXTMAX`); not used for zoom-to-fit. */
    extents: AcExExtents
    /**
     * Batch-derived extents for the initially active layout, used by the
     * offline viewer for zoom-to-fit instead of {@link AcExSnapshot.meta.extents}.
     */
    viewExtents?: AcExExtents
    /** Unit and formatting sysvars for measurement display. */
    units: AcExViewerUnits
    /** Canvas background color as 24-bit RGB hex. */
    background: number
    /** Export-time UI locale from the CAD app (informational; runtime uses browser language). */
    locale?: string
  }
  /** Layer table used by the layer drawer (visibility toggles, swatches). */
  layers: AcExLayerSnapshot[]
  /** One entry per exported layout (model space and paper spaces). */
  layouts: AcExLayoutSnapshot[]
  /** BTR id of the layout shown when the HTML file is opened. */
  activeLayoutBtrId: string
}
