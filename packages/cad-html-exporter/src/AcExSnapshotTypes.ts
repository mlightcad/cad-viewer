import type { AcExOsnapCatalog } from './AcExOsnapPrimitiveTypes'

/**
 * Current snapshot schema version.
 * Increment when breaking changes are introduced to {@link AcExSnapshotV1}.
 */
export const ACEX_SNAPSHOT_VERSION = 1 as const

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
 * One packed line batch suitable for `THREE.LineSegments`
 * (pairs of vertices interpreted as line segments).
 */
export interface AcExLineBatch {
  /** Layer name used for grouping and visibility in the viewer. */
  layer: string
  /** Line color as 24-bit RGB hex. */
  color: number
  /** World-space translation applied to every vertex after unpacking. */
  offset: [number, number, number]
  /**
   * Flat vertex buffer: `[x0, y0, z0, x1, y1, z1, …]` in local space
   * before {@link AcExLineBatch.offset} is applied.
   */
  positions: number[]
  /**
   * Optional index buffer referencing vertices in {@link AcExLineBatch.positions}.
   * When omitted, positions are consumed sequentially as segment pairs.
   */
  indices?: number[]
}

/**
 * One packed mesh batch (filled regions, MText quads, point glyphs, etc.)
 * rendered as `THREE.Mesh` in the offline viewer.
 */
export interface AcExMeshBatch {
  /** Layer name used for grouping and visibility in the viewer. */
  layer: string
  /** Fill color as 24-bit RGB hex. */
  color: number
  /** World-space translation applied to every vertex after unpacking. */
  offset: [number, number, number]
  /**
   * Flat vertex buffer: `[x0, y0, z0, x1, y1, z1, …]` in local space
   * before {@link AcExMeshBatch.offset} is applied.
   */
  positions: number[]
  /**
   * Triangle index buffer into {@link AcExMeshBatch.positions}.
   * When omitted, a single triangle may be inferred from the first three vertices.
   */
  indices?: number[]
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
   * When {@link AcExOsnapCatalog.primitives} is non-empty, {@link AcExOsnapIndex}
   * uses these definitions exclusively and does **not** snap to discretized
   * {@link AcExLineBatch} / {@link AcExMeshBatch} vertices. Older HTML files
   * without this field continue to use batch-based snapping.
   */
  osnap?: AcExOsnapCatalog
}

/**
 * Display-only snapshot embedded in exported HTML.
 * Does not contain DXF/DWG bytes, `AcDb` entity records, or editable drawing state.
 */
export interface AcExSnapshotV1 {
  /** Schema version; must equal {@link ACEX_SNAPSHOT_VERSION}. */
  version: AcExSnapshotVersion
  /** Document-level metadata and viewer defaults. */
  meta: {
    /** Optional drawing title shown in the status bar when no error occurs. */
    title?: string
    /** ISO-8601 timestamp when the snapshot was created. */
    createdAt: string
    /** Overall drawing extents for initial zoom-to-extents. */
    extents: AcExExtents
    /** Unit and formatting sysvars for measurement display. */
    units: AcExViewerUnits
    /** Canvas background color as 24-bit RGB hex. */
    background: number
    /** Preferred UI locale when the HTML is first opened (`en` | `zh`). */
    locale?: string
  }
  /** Layer table used by the layer drawer (visibility toggles, swatches). */
  layers: AcExLayerSnapshot[]
  /** One entry per exported layout (model space and paper spaces). */
  layouts: AcExLayoutSnapshot[]
  /** BTR id of the layout shown when the HTML file is opened. */
  activeLayoutBtrId: string
}
