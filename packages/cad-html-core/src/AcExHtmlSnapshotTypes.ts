import type { AcExHtmlOsnapCatalog } from './AcExHtmlOsnapPrimitiveTypes'

/**
 * Current snapshot schema version.
 * Increment when breaking changes are introduced to {@link AcExHtmlSnapshot}.
 *
 * v3 adds {@link AcExHtmlLayoutSnapshot.viewports} so the offline HTML viewer can
 * scissor-render model space through paper-space viewports.
 *
 * Optional {@link AcExHtmlLineBatch.renderOrder} / {@link AcExHtmlMeshBatch.renderOrder}
 * is a backward-compatible flag on v3 batches: hatch fills use `-1` so they
 * sit below linework on the shared Z plane, matching the live viewer's
 * `AcGiSubEntityTraits.drawOrder` / `Object3D.renderOrder` tiers.
 *
 * v4 adds optional textured mesh payloads ({@link AcExHtmlMeshBatch.uvs} +
 * {@link AcExHtmlMeshBatch.texture}) for raster images and OLE frames.
 * Monolithic ACEX layout OSNAP is stored as ACEO bytes (legacy JSON still
 * decodes); package ACEC chunk schema is unchanged.
 *
 * Optional {@link AcExHtmlLayoutSnapshot.savedView} (AutoCAD VPORT / layout limits)
 * is a layout field used by the offline “Saved” zoom action. In ACEX binary it
 * is stored under {@link AcExHtmlSnapshot.meta.savedViews} so the viewport JSON
 * slot stays a bare array compatible with older runtimes.
 *
 * Optional {@link AcExHtmlLayoutSnapshot.fitExtents} is a both backwards- and
 * forwards-compatible addition: the binary codec carries it under
 * {@link AcExHtmlSnapshot.meta.fitExtents} (keyed by layout BTR id) so the layout
 * JSON slot keeps its v4 wire shape. Runtimes that predate it simply ignore
 * the extra meta key and fall back to computing bounds from painted geometry.
 */
export const ACEX_SNAPSHOT_VERSION = 4 as const

/**
 * Literal type of the supported snapshot schema version.
 * Always matches {@link ACEX_SNAPSHOT_VERSION}.
 */
export type AcExHtmlSnapshotVersion = typeof ACEX_SNAPSHOT_VERSION

/**
 * Drawing units and display formatting copied from an open database
 * for use by the offline HTML viewer (measurement labels, precision, etc.).
 */
export interface AcExHtmlViewerUnits {
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
 * CAD entity square-grip appearance from `GRIPSIZE` / `GRIPCOLOR` / `GRIPHOT`.
 * Overlay measure/markup endpoint circles keep their own colored-dot styling.
 */
export interface AcExHtmlViewerGripAppearance {
  /** Grip square edge length in CSS pixels (`GRIPSIZE`). */
  size: number
  /** CSS color for idle grips (`GRIPCOLOR`). */
  colorCss: string
  /** CSS color for hover / hot grips (`GRIPHOT`). */
  hotColorCss: string
}

/**
 * Axis-aligned bounding box in world coordinates (WCS), XY plane.
 * Z is not stored; extents are used for zoom-to-extents and layer fit.
 */
export interface AcExHtmlExtents {
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
export interface AcExHtmlLayerSnapshot {
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
export interface AcExHtmlLinePattern {
  /** Scaled dash and gap lengths for the linetype shader. */
  pattern: number[]
  /** Total repeat length of {@link AcExHtmlLinePattern.pattern}. */
  patternLength: number
  /** Viewport scale factor paired with {@link AcExHtmlLinePattern.pattern}. */
  viewportScale: number
}

/**
 * One hatch pattern definition line serialized for offline playback.
 *
 * {@link AcExHtmlHatchPatternLine.offset} is stored in the same frame as the live
 * hatch shader uniform (already rotated by `-angle` in
 * {@link AcTrFillMaterialManager}), not as a raw DXF/PAT definition offset.
 */
export interface AcExHtmlHatchPatternLine {
  /** Pattern line angle in radians. */
  angle: number
  /** Pattern origin in hatch object space. */
  base: [number, number]
  /**
   * Spacing offset between repeated pattern lines, in the hatch shader's
   * line-local frame (pre-rotated by `-angle`).
   */
  offset: [number, number]
  /** Dash and gap lengths for this pattern line. */
  dashLengths: number[]
  /** Total repeat length of {@link AcExHtmlHatchPatternLine.dashLengths}. */
  patternLength: number
}

/**
 * Hatch fill pattern serialized for offline playback.
 */
export interface AcExHtmlHatchPattern {
  /** Hatch-wide rotation applied before individual pattern lines. */
  patternAngle: number
  /** One or more pattern definition lines. */
  patternLines: AcExHtmlHatchPatternLine[]
}

/**
 * One packed line batch suitable for `THREE.LineSegments`
 * (pairs of vertices interpreted as line segments).
 */
export interface AcExHtmlLineBatch {
  /** Layer name used for grouping and visibility in the viewer. */
  layer: string
  /** Line color as 24-bit RGB hex. */
  color: number
  /** Rebase origin (world translation) stored in double precision; not baked into {@link AcExHtmlLineBatch.positions}. */
  offset: [number, number, number]
  /**
   * Rebased local vertex buffer: `[x0, y0, z0, x1, y1, z1, …]`.
   * World position = local + {@link AcExHtmlLineBatch.offset} (applied via object transform at render time).
   */
  positions: Float32Array
  /**
   * Optional index buffer referencing vertices in {@link AcExHtmlLineBatch.positions}.
   * When omitted, positions are consumed sequentially as segment pairs.
   */
  indices?: Uint32Array
  /** Optional linetype pattern for dashed/dotted lines. */
  linePattern?: AcExHtmlLinePattern
  /**
   * Per-vertex cumulative distance along the polyline, required when
   * {@link AcExHtmlLineBatch.linePattern} is set.
   */
  lineDistances?: Float32Array
  /**
   * Screen-space line width in pixels for wide lines rendered with
   * `LineSegments2` / `LineMaterial`. Omitted for 1px `THREE.LineSegments`.
   */
  lineWidth?: number
  /**
   * Three.js `Object3D.renderOrder` for same-plane compositing.
   * Omitted when `0` (the default linework tier).
   */
  renderOrder?: number
  /**
   * When `true`, hybrid OSNAP must not index this batch's vertices.
   * Set for text/point glyph stroke batches (`bboxIntersectionCheck` drawables)
   * whose outlines flood snap without matching AutoCAD text snap behavior.
   * Insertion/node snap for TEXT/MTEXT still comes from analytic ACEO points.
   */
  excludeFromOsnap?: boolean
}

/**
 * Gradient hatch fill serialized for offline playback.
 */
export interface AcExHtmlGradientFill {
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
 * Embedded raster texture for an image / OLE mesh batch (PNG bytes).
 */
export interface AcExHtmlMeshTexture {
  /** MIME type, typically `image/png`. */
  mimeType: string
  /** Encoded image bytes. */
  bytes: Uint8Array
}

/**
 * One packed mesh or point batch (filled regions, MText quads, point glyphs, etc.)
 * rendered in the offline viewer.
 */
export interface AcExHtmlMeshBatch {
  /** Layer name used for grouping and visibility in the offline viewer. */
  layer: string
  /** Fill color as 24-bit RGB hex. */
  color: number
  /** Rebase origin (world translation) stored in double precision; not baked into {@link AcExHtmlMeshBatch.positions}. */
  offset: [number, number, number]
  /**
   * Rebased local vertex buffer: `[x0, y0, z0, x1, y1, z1, …]`.
   * World position = local + {@link AcExHtmlMeshBatch.offset} (applied via object transform at render time).
   */
  positions: Float32Array
  /**
   * When `true`, {@link AcExHtmlMeshBatch.positions} is rendered with `THREE.Points`
   * instead of a filled `THREE.Mesh`.
   */
  points?: boolean
  /**
   * Triangle index buffer into {@link AcExHtmlMeshBatch.positions}.
   * Required for filled mesh batches; omitted for {@link AcExHtmlMeshBatch.points}.
   */
  indices?: Uint32Array
  /** Optional hatch pattern for non-solid fills. */
  hatchPattern?: AcExHtmlHatchPattern
  /** Optional gradient fill parameters for gradient hatches. */
  gradientFill?: AcExHtmlGradientFill
  /**
   * Normalized gradient coordinates per vertex `[x0, y0, x1, y1, …]`.
   * Required when {@link AcExHtmlMeshBatch.gradientFill} is set.
   */
  gradientPositions?: Float32Array
  /**
   * Per-vertex UVs `[u0, v0, u1, v1, …]` paired with {@link AcExHtmlMeshBatch.texture}.
   * Vertex count must match {@link AcExHtmlMeshBatch.positions}.
   */
  uvs?: Float32Array
  /**
   * Raster texture for IMAGE / OLE frames. Requires {@link AcExHtmlMeshBatch.uvs}.
   */
  texture?: AcExHtmlMeshTexture
  /** Material side when a custom fill shader is used (`0` = front, `1` = back). */
  side?: number
  /**
   * Three.js `Object3D.renderOrder` for same-plane compositing.
   * Hatch fills are `-1` so they sit below linework; omitted when `0`.
   */
  renderOrder?: number
}

/**
 * One paper-space viewport that shows a rectangle of model space.
 *
 * Matches the live viewer's `AcGiViewport.box` (paper) and `viewBox` (model)
 * so the offline HTML viewer can scissor-render model geometry through the
 * viewport, the same way {@link AcTrLayoutView} draws `AcTrViewportView`s.
 */
export interface AcExHtmlViewportSnapshot {
  /** Viewport border in paper-space WCS (`AcGiViewport.box`). */
  paper: AcExHtmlExtents
  /** Model-space rectangle shown through the viewport (`AcGiViewport.viewBox`). */
  model: AcExHtmlExtents
  /**
   * View twist in radians (`AcGiViewport.viewTwistAngle`, DXF group 51).
   * Omitted when zero. Paper↔model mapping and the scissor camera rotate by
   * this angle around the model view center.
   */
  twist?: number
  /**
   * Layer names frozen in this viewport (VPLAYER / DXF group 331), resolved
   * from {@link AcGiViewport.frozenLayers}. Omitted when empty. The offline
   * viewer hides matching model-space layer groups while drawing the pass.
   */
  frozenLayers?: string[]
}

/**
 * Geometry for one paper space or model space layout.
 * Contains only display batches — no block definitions or entity handles.
 */
export interface AcExHtmlLayoutSnapshot {
  /** Block-table-record id of the layout (matches `activeLayoutBtrId` when active). */
  btrId: string
  /** Human-readable layout name when available (e.g. "Model", "Layout1"). */
  name: string
  /** `true` for model space; `false` for paper space layouts. */
  isModelSpace: boolean
  /** All line/curve batches belonging to this layout. */
  lineBatches: AcExHtmlLineBatch[]
  /** All mesh/fill batches belonging to this layout. */
  meshBatches: AcExHtmlMeshBatch[]
  /**
   * Analytic geometry for object snap (OSNAP) in the offline viewer.
   *
   * Populated at export time by {@link acexHtmlBuildOsnapCatalog} from the drawing database.
   * Contains **curve/point/path** primitives (circle, arc, ellipse, spline, point,
   * polyline bulge arcs, fill/frame `path` records, and wide LWPOLYLINE
   * centerline `path` records). Straight drawing-line
   * edges are omitted because they duplicate {@link AcExHtmlLineBatch} display
   * geometry; the offline viewer rebuilds line snap from those batches
   * (self-contained HTML and multi-file packages). Hatch / TRACE / SOLID / IMAGE
   * clip / OLE boundaries are stored as compact `path` primitives, not exploded
   * ACEO lines.
   *
   * Coordinates are IEEE-754 `number` (double) for measurement-grade precision.
   *
   * {@link AcExOsnapIndex} indexes ACEO curves/paths together with tessellated line
   * segments extracted from resident {@link AcExHtmlLineBatch} / mesh edges.
   */
  osnap?: AcExHtmlOsnapCatalog
  /**
   * User-created paper-space viewports (skipped for model space).
   *
   * The default `*Paper_Space` viewport is omitted. The offline viewer uses
   * these descriptors to scissor-render model-space batches inside each frame.
   */
  viewports?: AcExHtmlViewportSnapshot[]
  /**
   * AutoCAD saved view for this layout (model: VPORT `*ACTIVE`; paper: layout
   * limits). Used by the offline toolbar “Saved” zoom action. Omitted when the
   * drawing has no usable saved view.
   */
  savedView?: AcExHtmlExtents
  /**
   * Zoom-to-fit box computed at export time from this layout's own geometry
   * (batches unioned with viewport paper frames, see
   * {@link acexHtmlComputeLayoutViewExtents}).
   *
   * Persisted per layout so “Zoom extents” in the offline viewer frames the
   * same box as the export-time fit — including layouts whose geometry is not
   * resident yet (progressive packages paint viewport frames before chunks
   * arrive) and layouts that were never the active export layout
   * ({@link AcExHtmlSnapshot.meta.viewExtents} only describes the active one).
   */
  fitExtents?: AcExHtmlExtents
}

/** Camera state for restoring the export-time view in the offline HTML viewer. */
export interface AcExHtmlViewState {
  /** View center X in world coordinates. */
  centerX: number
  /** View center Y in world coordinates. */
  centerY: number
  /** Orthographic zoom scaled for the offline viewer frustum. */
  zoom: number
}

/** How the offline HTML viewer frames the drawing on first open. */
export type AcExHtmlInitialViewMode = 'fit' | 'current'

/**
 * Offline viewer capability profile embedded at export time.
 *
 * - `view` — pan/zoom and layer visibility only (no measurement, markup, or OSNAP data).
 * - `measure` — full viewer with measurement tools, markup annotations, and analytic OSNAP catalog.
 */
export type AcExHtmlViewerMode = 'view' | 'measure'

/**
 * Display-only snapshot embedded in exported HTML.
 * Does not contain DXF/DWG bytes, `AcDb` entity records, or editable drawing state.
 *
 * Geometry buffers ({@link AcExHtmlLineBatch.positions}, indices, distances, etc.)
 * are stored as typed arrays in memory and serialized as raw binary in
 * {@link acexHtmlEncodeSnapshot} / {@link acexHtmlDecodeSnapshot}.
 */
export interface AcExHtmlSnapshot {
  /** Schema version; must equal {@link ACEX_SNAPSHOT_VERSION}. */
  version: AcExHtmlSnapshotVersion
  /** Document-level metadata and viewer defaults. */
  meta: {
    /** Optional drawing title shown in the status bar when no error occurs. */
    title?: string
    /** ISO-8601 timestamp when the snapshot was created. */
    createdAt: string
    /** Database header extents (`EXTMIN` / `EXTMAX`); not used for zoom-to-fit. */
    extents: AcExHtmlExtents
    /**
     * Batch-derived extents for the initially active layout, used by the
     * offline viewer for zoom-to-fit instead of {@link AcExHtmlSnapshot.meta.extents}.
     *
     * Only describes {@link AcExHtmlSnapshot.activeLayoutBtrId}; every layout's own
     * box lives on {@link AcExHtmlLayoutSnapshot.fitExtents}.
     */
    viewExtents?: AcExHtmlExtents
    /** Unit and formatting sysvars for measurement display. */
    units: AcExHtmlViewerUnits
    /**
     * CAD entity square-grip appearance from `GRIPSIZE` / `GRIPCOLOR` /
     * `GRIPHOT`. Overlay endpoint circles ignore these values. Omitted on
     * snapshots produced before this field existed; the viewer then uses
     * AutoCAD-like defaults (8px, `#0080ff` / `#ff0000`).
     */
    grip?: AcExHtmlViewerGripAppearance
    /**
     * Canvas background color as 24-bit RGB hex.
     *
     * When {@link backgroundMode} is `'space'`, this is the initially active
     * layout's color (black in model space, white in paper space). The offline
     * viewer switches the canvas on layout change. Older snapshots omit the
     * mode and use this color for every layout.
     */
    background: number
    /**
     * How {@link background} relates to layouts.
     *
     * - `'black'` / `'white'` — every layout uses {@link background}.
     * - `'space'` — model space is black and paper space is white.
     *
     * Omitted on snapshots produced before this field existed.
     */
    backgroundMode?: 'black' | 'white' | 'space'
    /** Export-time UI locale from the CAD app (informational; runtime uses browser language). */
    locale?: string
    /**
     * Initial framing when the HTML file opens. Defaults to `'fit'` when omitted
     * for snapshots produced before this option existed.
     */
    initialView?: AcExHtmlInitialViewMode
    /**
     * Saved view center and zoom when {@link AcExHtmlSnapshot.meta.initialView} is
     * `'current'`.
     */
    viewState?: AcExHtmlViewState
    /**
     * Viewer capability profile. Defaults to `'measure'` when omitted for
     * snapshots produced before this option existed.
     */
    viewerMode?: AcExHtmlViewerMode
    /**
     * Absolute root URL for localized user-guide pages. When omitted, the
     * offline viewer uses the default mlightcad docs site.
     */
    docsBaseUrl?: string
    /**
     * When `false`, paper-space layouts were not exported. The offline viewer
     * hides the layout switcher and may release CPU geometry after the first
     * draw. Defaults to `true` when omitted for snapshots produced before this
     * option existed.
     */
    exportLayouts?: boolean
    /**
     * AutoCAD saved views keyed by layout BTR id. Written by the ACEX binary
     * codec so the layout viewport JSON slot remains a bare array; the decoder
     * copies entries onto {@link AcExHtmlLayoutSnapshot.savedView}. Omitted when
     * no layout has a usable saved view.
     */
    savedViews?: Record<string, AcExHtmlExtents>
    /**
     * Per-layout zoom-to-fit boxes keyed by layout BTR id
     * ({@link AcExHtmlLayoutSnapshot.fitExtents}). Written by the ACEX binary codec
     * (and by the package manifest's layout refs) so the layout JSON slot keeps
     * its v4 wire shape. Omitted when no layout has geometry.
     */
    fitExtents?: Record<string, AcExHtmlExtents>
  }
  /** Layer table used by the layer drawer (visibility toggles, swatches). */
  layers: AcExHtmlLayerSnapshot[]
  /** One entry per exported layout (model space and paper spaces). */
  layouts: AcExHtmlLayoutSnapshot[]
  /** BTR id of the layout shown when the HTML file is opened. */
  activeLayoutBtrId: string
}
