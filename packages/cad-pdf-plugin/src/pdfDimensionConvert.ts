import {
  commitDimBlock,
  readDimStyleFields,
  writeDimStyleFields
} from '@mlightcad/cad-simple-viewer'
import {
  AcDb3PointAngularDimension,
  AcDbArc,
  AcDbCircle,
  type AcDbDatabase,
  AcDbDiametricDimension,
  AcDbDimStyleTableRecord,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRotatedDimension,
  AcDbText,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  parsePdfDimensionValue,
  type PdfDimensionCandidate,
  type PdfDimInput
} from './recognition/pdfDimensionPattern'

/** Dimension style created for recovered dimensions. */
export const PDF_DIM_STYLE = 'PDF_DIM'

type PdfDimEntity =
  | AcDbRotatedDimension
  | AcDbRadialDimension
  | AcDbDiametricDimension
  | AcDb3PointAngularDimension

/**
 * Describes entities for {@link recognizePdfDimensions}: lines and 2-vertex
 * polylines as segments, closed polylines as possible arrowheads, circles
 * and arcs as radial targets, and texts as dimension values.
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

/**
 * Creates or updates the `PDF_DIM` style: the current style plus the text
 * height, arrow size and extension measured in the PDF, and a linear scale
 * factor (DIMLFAC) equal to the drawing scale the texts imply.
 */
export function acapPdfEnsureDimStyle(
  db: AcDbDatabase,
  candidates: PdfDimensionCandidate[],
  scale: number
): AcDbDimStyleTableRecord {
  const table = db.tables.dimStyleTable
  const existing = table.getAt(PDF_DIM_STYLE)
  // ObjectARX semantics: a record already in the database must be opened for
  // write inside the command transaction; a new one is filled before `add`.
  const style = existing
    ? (db.openObjectForWrite<AcDbDimStyleTableRecord>(existing.objectId) ??
      existing)
    : new AcDbDimStyleTableRecord()
  if (!existing) {
    style.name = PDF_DIM_STYLE
    const base = table.getAt(db.dimstyle || 'Standard')
    if (base) writeDimStyleFields(style, readDimStyleFields(base))
  }
  const textHeight = median(candidates.map(c => c.text.height))
  const arrowSize = median(candidates.map(c => c.arrowSize))
  const linear = candidates.filter(
    (c): c is Extract<PdfDimensionCandidate, { kind: 'linear' }> =>
      c.kind === 'linear'
  )
  const ticks = linear.filter(c => c.ticks).length > linear.length / 2
  writeDimStyleFields(style, {
    dimscale: 1,
    dimtxt: textHeight,
    dimasz: arrowSize,
    dimgap: textHeight * 0.25,
    dimexo: 0,
    dimexe: median(linear.map(c => c.extensionBeyond)) || arrowSize * 0.5,
    dimlfac: scale,
    dimdec: decimalsOf(candidates.map(c => c.text.text)),
    dimtad: 1,
    ...(ticks ? { dimblk: '_ArchTick' } : {})
  })
  if (!existing) table.add(style)
  return style
}

/**
 * Appends one dimension per candidate to model space, using the `PDF_DIM`
 * style (create it first with {@link acapPdfEnsureDimStyle}).
 *
 * A dimension keeps the PDF text as an override when the text is not a
 * plain number (prefix, tolerance, multiplier) or disagrees with the
 * measurement times `scale`.
 *
 * @param layerOf - Layer for each dimension, e.g. that of its value text.
 * @returns The created dimensions.
 */
export function acapPdfCreateDimensions<Id>(
  db: AcDbDatabase,
  candidates: PdfDimensionCandidate<Id>[],
  scale: number,
  layerOf?: (candidate: PdfDimensionCandidate<Id>) => string | undefined
): PdfDimEntity[] {
  const decimals = db.tables.dimStyleTable.getAt(PDF_DIM_STYLE)?.dimdec ?? 0
  const created: PdfDimEntity[] = []
  for (const candidate of candidates) {
    const dimension = createDimension(candidate)
    dimension.dimensionStyleName = PDF_DIM_STYLE
    const value = parsePdfDimensionValue(candidate.text.text)
    // Angles are not affected by DIMLFAC; a degree sign is still plain.
    const angular = candidate.kind === 'angular'
    const expected = angular ? candidate.measured : candidate.measured * scale
    const plain = (angular ? /^[\s\d.,°]*$/ : /^[\s\d.,]*$/).test(
      candidate.text.text
    )
    const agrees =
      value !== undefined &&
      Math.abs(value - expected) <=
        Math.max(expected * 0.005, 0.5 * 10 ** -decimals)
    if (!agrees || !plain) dimension.dimensionText = candidate.text.text
    const layer = layerOf?.(candidate)
    if (layer) dimension.layer = layer
    commitDimBlock(db, dimension)
    db.tables.blockTable.modelSpace.appendEntity(dimension)
    created.push(dimension)
  }
  return created
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
