import {
  applyCurrentDimStyle,
  commitDimBlock,
  disposeDimBlock,
  readDimStyleFields,
  setDimStyleOverride,
  writeDimStyleFields
} from '@mlightcad/cad-simple-viewer'
import {
  AcDb3PointAngularDimension,
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  type AcDbDatabase,
  AcDbDiametricDimension,
  type AcDbDimStyleOverride,
  AcDbDimStyleTableRecord,
  type AcDbEntity,
  AcDbHatch,
  AcDbLine,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRotatedDimension,
  AcDbText,
  acdbWriteDimStyleOverrides,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  parsePdfDimensionValue,
  type PdfDimensionCandidate,
  type PdfDimInput
} from './recognition/pdfDimensionPattern'

/** Dimension style created for recovered dimensions. */
export const PDF_DIM_STYLE = 'PDF_DIM'

/** Dimension entity created by {@link acapPdfCreateDimensions}. */
export type PdfDimEntity =
  | AcDbRotatedDimension
  | AcDbRadialDimension
  | AcDbDiametricDimension
  | AcDb3PointAngularDimension

/**
 * Describes entities for {@link recognizePdfDimensions}: lines and 2-vertex
 * polylines as segments, closed polylines and small solid hatches as possible
 * arrowheads, circles and arcs as radial targets, and texts as dimension
 * values.
 */
export function pdfEntitiesToDimInput<Id>(
  entities: Map<Id, AcDbEntity>
): PdfDimInput<Id> {
  const input: PdfDimInput<Id> = {
    segments: [],
    polygons: [],
    curves: [],
    texts: [],
    arcs: []
  }
  for (const [id, entity] of entities) {
    if (entity instanceof AcDbLine) {
      input.segments.push({
        id,
        p0: { x: entity.startPoint.x, y: entity.startPoint.y },
        p1: { x: entity.endPoint.x, y: entity.endPoint.y }
      })
    } else if (entity instanceof AcDbPolyline) {
      const vertices = []
      for (let i = 0; i < entity.numberOfVertices; i++) {
        const p = entity.getPoint2dAt(i)
        vertices.push({ x: p.x, y: p.y })
      }
      if (entity.closed && vertices.length >= 3) {
        input.polygons.push({ id, vertices })
      } else if (vertices.length === 2) {
        input.segments.push({ id, p0: vertices[0], p1: vertices[1] })
      }
    } else if (entity instanceof AcDbHatch) {
      // `pdfimport` imports a filled arrowhead as a solid hatch; its boundary
      // vertices (grip points, in loop order) describe the triangle.
      const vertices = hatchArrowVertices(entity)
      if (vertices) input.polygons.push({ id, vertices })
    } else if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
      input.curves.push({
        center: { x: entity.center.x, y: entity.center.y },
        radius: entity.radius
      })
      if (entity instanceof AcDbArc) {
        input.arcs!.push({
          id,
          center: { x: entity.center.x, y: entity.center.y },
          radius: entity.radius,
          startAngle: entity.startAngle,
          endAngle: entity.endAngle
        })
      }
    } else if (entity instanceof AcDbText) {
      input.texts.push({
        id,
        text: entity.textString,
        center: textCenter(entity),
        height: entity.height
      })
    }
  }
  return input
}

/**
 * Boundary of a solid hatch with three or four vertices, the shape of a
 * filled arrowhead. Larger or curved fills are never arrowheads.
 */
function hatchArrowVertices(hatch: AcDbHatch) {
  if (!hatch.isSolidFill) return undefined
  const points = hatch.subGetGripPoints()
  if (points.length < 3 || points.length > 4) return undefined
  return points.map(p => ({ x: p.x, y: p.y }))
}

/** Text box center; falls back to an estimate when no font metrics exist. */
function textCenter(text: AcDbText) {
  try {
    const box = text.geometricExtents
    if (box && Number.isFinite(box.min.x) && box.max.x > box.min.x) {
      return { x: (box.min.x + box.max.x) / 2, y: (box.min.y + box.max.y) / 2 }
    }
  } catch {
    // Fonts not loaded yet: estimate below.
  }
  const width = text.textString.length * text.height * 0.6
  const c = Math.cos(text.rotation)
  const s = Math.sin(text.rotation)
  return {
    x: text.position.x + (c * width - s * text.height) / 2,
    y: text.position.y + (s * width + c * text.height) / 2
  }
}

/** Geometry taken from recovered PDF dimensions for a dim style / overrides. */
export interface AcApPdfDimStyleMetrics {
  dimscale: number
  dimtxt: number
  dimasz: number
  dimgap: number
  dimexo: number
  dimexe: number
  dimse1: 0
  dimse2: 0
  dimatfit: number
  dimtix: 0
  dimtofl: number
  dimlfac: number
  dimdec: number
  dimtad: 1
  dimsah: 0
  dimblk: string
  dimblk1: string
  dimblk2: string
}

/**
 * Measures text height, arrow size and extension from recovered candidates so
 * both the style record and per-entity overrides stay in sync.
 */
export function acapPdfDimStyleMetrics(
  candidates: PdfDimensionCandidate[],
  scale: number
): AcApPdfDimStyleMetrics {
  const linear = candidates.filter(
    (c): c is Extract<PdfDimensionCandidate, { kind: 'linear' }> =>
      c.kind === 'linear'
  )
  // Dimensions drawn without terminators report size 0; they must not
  // shrink the arrows of the others, and alone fall back to the text height.
  const rawArrow =
    median(candidates.map(c => c.arrowSize).filter(s => s > 0)) || 0
  const rawText =
    median(candidates.map(c => c.text.height).filter(h => h > 0)) || 0
  const measured =
    median(linear.map(c => c.measured).filter(m => m > 0)) ||
    median(candidates.map(c => c.measured).filter(m => m > 0)) ||
    0
  // Bare dims (no terminators) keep the text height as arrow size so DIMASZ
  // does not shrink below the recovered label.
  const arrowSize =
    rawArrow || rawText || Math.max(measured * 0.05, 1)
  // Prefer arrow-relative text size. Stroke OCR often reports a cluster bbox
  // taller than the glyphs; CAD text is typically ≤ the arrow head.
  const textHeight =
    rawArrow > 0
      ? clamp(rawText || rawArrow * 0.75, rawArrow * 0.45, rawArrow * 1.0)
      : clamp(
          rawText || arrowSize * 0.8,
          arrowSize * 0.35,
          measured > 0 ? measured * 0.12 : arrowSize
        )
  const ticks = linear.filter(c => c.ticks).length > linear.length / 2
  const bare = linear.filter(c => c.arrowSize === 0).length > linear.length / 2
  const arrowsOut = linear.filter(c => c.arrowsOut).length > linear.length / 2
  const beyond =
    median(linear.map(c => c.extensionBeyond).filter(b => b > 0)) ||
    arrowSize * 0.5
  return {
    // Paper geometry from the PDF — never inherit a drawing-scale DIMSCALE
    // (e.g. Standard with DIMSCALE 100 would make text/arrows 100× too large
    // and DIMEXO would eat the extension lines).
    dimscale: 1,
    dimtxt: textHeight,
    dimasz: arrowSize,
    dimgap: textHeight * 0.25,
    dimexo: 0,
    dimexe: beyond,
    dimse1: 0,
    dimse2: 0,
    dimatfit: arrowsOut ? 0 : 3,
    dimtix: 0,
    dimtofl: arrowsOut ? 1 : 0,
    dimlfac: scale,
    dimdec: decimalsOf(candidates.map(c => c.text.text)),
    dimtad: 1,
    dimsah: 0,
    ...(ticks
      ? { dimblk: '_ArchTick', dimblk1: '', dimblk2: '' }
      : bare
        ? { dimblk: '_NONE', dimblk1: '', dimblk2: '' }
        : { dimblk: '', dimblk1: '', dimblk2: '' })
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** DXF group-code overrides that pin recovered sizes onto a dimension entity. */
export function acapPdfDimStyleOverrides(
  metrics: AcApPdfDimStyleMetrics
): AcDbDimStyleOverride[] {
  return [
    { code: 40, value: metrics.dimscale },
    { code: 140, value: metrics.dimtxt },
    { code: 41, value: metrics.dimasz },
    { code: 147, value: metrics.dimgap },
    { code: 42, value: metrics.dimexo },
    { code: 44, value: metrics.dimexe },
    { code: 75, value: metrics.dimse1 },
    { code: 76, value: metrics.dimse2 },
    { code: 289, value: metrics.dimatfit },
    { code: 174, value: metrics.dimtix },
    { code: 172, value: metrics.dimtofl },
    { code: 144, value: metrics.dimlfac },
    { code: 271, value: metrics.dimdec },
    { code: 77, value: metrics.dimtad },
    { code: 173, value: metrics.dimsah }
  ]
}

/** Appearance fields copied from a picked style onto the working PDF style. */
const APPEARANCE_FIELDS = [
  'dimclrd',
  'dimclre',
  'dimclrt',
  'dimtxsty',
  'dimlwd',
  'dimlwe',
  'dimtih',
  'dimtoh',
  'dimtad',
  'dimjust',
  'dimtfill',
  'dimtfillclr'
] as const

/**
 * Creates or updates a dim style with recovered paper sizes. Uses `attrs.set`
 * so the write succeeds even when the record could not be opened for write.
 */
export function acapPdfEnsureDimStyle(
  db: AcDbDatabase,
  candidates: PdfDimensionCandidate[],
  scale: number,
  styleName: string = PDF_DIM_STYLE,
  appearanceFrom?: string
): AcDbDimStyleTableRecord {
  const table = db.tables.dimStyleTable
  const name = styleName.trim() || PDF_DIM_STYLE
  const existing = table.getAt(name)
  const style = existing
    ? (db.openObjectForWrite<AcDbDimStyleTableRecord>(existing.objectId) ??
      existing)
    : new AcDbDimStyleTableRecord()
  if (!existing) {
    style.name = name
    const base =
      table.getAt(appearanceFrom || db.dimstyle || 'Standard') ??
      table.getAt('Standard')
    if (base) writeDimStyleFields(style, readDimStyleFields(base))
    table.add(style)
  } else if (appearanceFrom) {
    const appearance = table.getAt(appearanceFrom)
    if (appearance) {
      const fields = readDimStyleFields(appearance)
      const picked: Partial<Record<string, unknown>> = {}
      for (const key of APPEARANCE_FIELDS) {
        if (fields[key] !== undefined) picked[key] = fields[key]
      }
      writeStyleAttrs(style, picked)
    }
  }
  writeStyleAttrs(style, {
    ...acapPdfDimStyleMetrics(candidates, scale)
  })
  return style
}

/** Write dim style fields without requiring an open-for-write transaction. */
function writeStyleAttrs(
  style: AcDbDimStyleTableRecord,
  values: Partial<Record<string, unknown>>
) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      style.attrs.set(key, value as never)
    }
  }
}

/** Options for {@link acapPdfCreateDimensions}. */
export interface AcApPdfCreateDimensionsOptions<Id> {
  layerOf?: (candidate: PdfDimensionCandidate<Id>) => string | undefined
  styleName?: string
  /** When false, dimensions are not appended to model space (transient preview). */
  append?: boolean
  /**
   * Existing style whose appearance (colours / text style) is blended into the
   * override used while building dim blocks. Lets preview use a picked style
   * without writing {@link PDF_DIM_STYLE} into the table first.
   */
  appearanceFrom?: string
}

/**
 * Builds dimension entities from recovered candidates.
 *
 * Sizes are forced through a temporary dim-style override for `createDimBlock`
 * (so a large DIMSCALE on Standard cannot blow up text or hide extensions),
 * then the permanent style name is restored on the entity.
 *
 * @returns The created dimensions (caller appends or shows as transients).
 */
export function acapPdfCreateDimensions<Id>(
  db: AcDbDatabase,
  candidates: PdfDimensionCandidate<Id>[],
  scale: number,
  layerOf?: (candidate: PdfDimensionCandidate<Id>) => string | undefined,
  styleName: string = PDF_DIM_STYLE,
  options?: Omit<AcApPdfCreateDimensionsOptions<Id>, 'layerOf' | 'styleName'>
): PdfDimEntity[] {
  const name = styleName.trim() || PDF_DIM_STYLE
  const append = options?.append !== false
  const metrics = acapPdfDimStyleMetrics(candidates, scale)
  const decimals =
    db.tables.dimStyleTable.getAt(name)?.dimdec ?? metrics.dimdec
  const overrides = acapPdfDimStyleOverrides(metrics)
  const appearanceName = options?.appearanceFrom?.trim() || name
  const appearance =
    db.tables.dimStyleTable.getAt(appearanceName) ??
    db.tables.dimStyleTable.getAt(name)
  const appearanceFields = appearance
    ? readDimStyleFields(appearance)
    : undefined
  const overrideValues: Partial<Record<string, unknown>> = { ...metrics }
  if (appearanceFields) {
    for (const key of APPEARANCE_FIELDS) {
      if (appearanceFields[key] !== undefined) {
        overrideValues[key] = appearanceFields[key]
      }
    }
  }
  setDimStyleOverride(db, overrideValues)
  const created: PdfDimEntity[] = []
  try {
    for (const candidate of candidates) {
      const prepared =
        candidate.kind === 'linear'
          ? ensureLinearExtensions(candidate)
          : candidate
      const dimension = createDimension(prepared)
      // Bake geometry with the override style (*DimOverride), then retarget
      // the entity to the permanent style name for the drawing.
      applyCurrentDimStyle(dimension, db)
      acdbWriteDimStyleOverrides(dimension, overrides)
      const value = parsePdfDimensionValue(prepared.text.text)
      const angular = prepared.kind === 'angular'
      const expected = angular ? prepared.measured : prepared.measured * scale
      const plain = (angular ? /^[\s\d.,°]*$/ : /^[\s\d.,]*$/).test(
        prepared.text.text
      )
      const agrees =
        value !== undefined &&
        Math.abs(value - expected) <=
          Math.max(expected * 0.005, 0.5 * 10 ** -decimals)
      if (!agrees || !plain) dimension.dimensionText = prepared.text.text
      const layer = layerOf?.(prepared)
      if (layer) dimension.layer = layer
      commitDimBlock(db, dimension)
      dimension.dimensionStyleName = name
      if (
        prepared.kind === 'linear' &&
        prepared.arrowSize > 0 &&
        dimension.dimBlockId
      ) {
        orientLinearDimArrows(
          db,
          dimension.dimBlockId,
          prepared.rotation,
          prepared.arrowsOut
        )
      }
      if (append) db.tables.blockTable.modelSpace.appendEntity(dimension)
      created.push(dimension)
    }
  } finally {
    setDimStyleOverride(db, null)
  }
  return created
}

/**
 * Removes preview dimensions that were never appended to model space: drops
 * their anonymous dim blocks from the block table.
 */
export function acapPdfDisposeDimensionPreviews(
  db: AcDbDatabase,
  dimensions: PdfDimEntity[]
) {
  for (const dimension of dimensions) {
    const blockName = dimension.dimBlockId
    if (blockName) disposeDimBlock(db, blockName)
    dimension.dimBlockId = null
  }
}

/**
 * Sets arrow insert rotations to match the PDF: inside = pointing apart,
 * outside = pointing toward each other. createDimBlock always draws the
 * inside orientation (`start = rotation+π`, `end = rotation`); outside dims
 * need a π flip.
 */
function orientLinearDimArrows(
  db: AcDbDatabase,
  blockName: string,
  rotation: number,
  arrowsOut: boolean
) {
  const block = db.tables.blockTable.getAt(blockName)
  if (!block) return
  const inserts = [...block.newIterator()].filter(
    (e): e is AcDbBlockReference => e instanceof AcDbBlockReference
  )
  if (inserts.length < 2) return
  const ux = Math.cos(rotation)
  const uy = Math.sin(rotation)
  inserts.sort(
    (a, b) =>
      a.position.x * ux +
      a.position.y * uy -
      (b.position.x * ux + b.position.y * uy)
  )
  // Closed-filled arrow block points +X. Inside (createDimBlock default):
  // first tip faces −u, second +u. Outside: flip both.
  const startRot = arrowsOut ? rotation : rotation + Math.PI
  const endRot = arrowsOut ? rotation + Math.PI : rotation
  inserts[0].rotation = startRot
  inserts[inserts.length - 1].rotation = endRot
}

/**
 * When recognition failed to find extension lines, the origins collapse to the
 * arrow tips and the dim block only draws tiny DIMEXE stubs. Push the origins
 * away from the dimension line so the verticals stay visible after erase.
 */
function ensureLinearExtensions<Id>(
  candidate: Extract<PdfDimensionCandidate<Id>, { kind: 'linear' }>
): Extract<PdfDimensionCandidate<Id>, { kind: 'linear' }> {
  const ux = Math.cos(candidate.rotation)
  const uy = Math.sin(candidate.rotation)
  const nx = -uy
  const ny = ux
  // Invented stubs stay modest; recognized origins keep their full length.
  const minLen = Math.max(candidate.arrowSize * 3, 4)
  const beyond = Math.max(0, candidate.extensionBeyond)
  const fix = (
    origin: { x: number; y: number },
    tip: { x: number; y: number }
  ) => {
    const across = (origin.x - tip.x) * nx + (origin.y - tip.y) * ny
    if (Math.abs(across) >= minLen * 0.25) {
      return { origin, beyond }
    }
    // Prefer the side the (collapsed) origin already hints at; else toward the
    // value text (usually between the dim line and the object).
    const side =
      Math.abs(across) > 1e-9
        ? Math.sign(across)
        : Math.sign(
            (candidate.text.center.x - tip.x) * nx +
              (candidate.text.center.y - tip.y) * ny
          ) || 1
    return {
      origin: {
        x: tip.x + nx * side * minLen,
        y: tip.y + ny * side * minLen
      },
      beyond: Math.max(
        beyond,
        candidate.arrowSize > 0 ? candidate.arrowSize * 0.25 : 0
      )
    }
  }
  // Project reported origins onto the dim-line feet when they already sit on
  // the span; otherwise keep dimLinePoint / dimLinePoint+measured as tips.
  const along1 =
    (candidate.xLine1.x - candidate.dimLinePoint.x) * ux +
    (candidate.xLine1.y - candidate.dimLinePoint.y) * uy
  const along2 =
    (candidate.xLine2.x - candidate.dimLinePoint.x) * ux +
    (candidate.xLine2.y - candidate.dimLinePoint.y) * uy
  const foot1 = {
    x: candidate.dimLinePoint.x + ux * along1,
    y: candidate.dimLinePoint.y + uy * along1
  }
  const foot2 = {
    x: candidate.dimLinePoint.x + ux * along2,
    y: candidate.dimLinePoint.y + uy * along2
  }
  const a = fix(candidate.xLine1, foot1)
  const b = fix(candidate.xLine2, foot2)
  return {
    ...candidate,
    xLine1: a.origin,
    xLine2: b.origin,
    extensionBeyond: Math.max(a.beyond, b.beyond)
  }
}

function createDimension<Id>(
  candidate: PdfDimensionCandidate<Id>
): PdfDimEntity {
  const pt = (p: { x: number; y: number }) => new AcGePoint3d(p.x, p.y, 0)
  if (candidate.kind === 'linear') {
    const dimension = new AcDbRotatedDimension(
      pt(candidate.xLine1),
      pt(candidate.xLine2),
      pt(candidate.dimLinePoint)
    )
    dimension.rotation = candidate.rotation
    return dimension
  }
  if (candidate.kind === 'angular') {
    return new AcDb3PointAngularDimension(
      pt(candidate.center),
      pt(candidate.xLine1),
      pt(candidate.xLine2),
      pt(candidate.arcPoint)
    )
  }
  if (candidate.kind === 'radius') {
    return new AcDbRadialDimension(
      pt(candidate.center),
      pt(candidate.chordPoint),
      candidate.leaderLength
    )
  }
  const far = {
    x: 2 * candidate.center.x - candidate.chordPoint.x,
    y: 2 * candidate.center.y - candidate.chordPoint.y
  }
  return new AcDbDiametricDimension(
    pt(candidate.chordPoint),
    pt(far),
    candidate.leaderLength
  )
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Decimal places used by the dimension texts (most common). */
function decimalsOf(texts: string[]) {
  return median(
    texts.map(t => {
      const match = /\d+[.,](\d+)/.exec(t)
      return match ? match[1].length : 0
    })
  )
}

/**
 * Snaps a drawing scale to the nearest common value (1, 2, 2.5, 5 × 10ⁿ)
 * when within 1 %, since dimension texts are rounded.
 */
export function acapPdfNiceScale(scale: number): number {
  if (!(scale > 0)) return 1
  const exponent = Math.floor(Math.log10(scale))
  for (const e of [exponent - 1, exponent, exponent + 1]) {
    for (const m of [1, 2, 2.5, 5]) {
      const nice = m * 10 ** e
      if (Math.abs(nice - scale) <= scale * 0.01) return nice
    }
  }
  return scale
}
