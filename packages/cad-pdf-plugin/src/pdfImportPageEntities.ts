import {
  AcCmColor,
  AcDbArc,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbCircle,
  type AcDbDatabase,
  AcDbEllipse,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d,
  AcGiLineWeight,
  log
} from '@mlightcad/data-model'

import type { AcApResolvedPdfImportOptions } from './AcApPdfImportOptions.js'
import {
  acapPdfCreatePatternHatch,
  acapPdfCreateSolidHatch,
  acapPdfEnsureDashLinetype,
  acapPdfShapeToLoop
} from './pdfImportEntities.js'
import {
  buildPdfImportShapes,
  orderPdfImportPaints,
  type PdfImportShapeItem,
  type PdfImportShapeStats
} from './pdfImportShapes.js'
import {
  PDF_IMPORT_FOREGROUND_COLOR,
  type PdfImportedText,
  type PdfImportPageContent
} from './pdfVectorImport.js'
import type { PdfRecognizedShape } from './recognition/pdfCurveRecognition.js'
import { buildPdfFormBlocks } from './recognition/pdfFormBlocks.js'
import {
  acapPdfRecognizeHatches,
  type PdfRecognizedHatch
} from './recognition/pdfHatchRecognition.js'
import type { PdfRecPoint } from './recognition/pdfRecGeometry.js'
import { mergePdfTextRuns } from './recognition/pdfTextRunMerge.js'

/** Entities built from one PDF page, before they are appended. */
export interface AcApPdfPageEntities {
  /** Linework, hatches, block references and texts in paint order. */
  entities: AcDbEntity[]
  /** Text entities with the PDF runs they came from. */
  textEntities: { entity: AcDbText; run: PdfImportedText }[]
  /** Layers referenced by the entities. */
  usedLayerNames: Set<string>
  /**
   * Outline of each solid fill (one point list per loop), keyed by the
   * hatch entity. Recognizers read filled text glyphs (TrueType fonts
   * printed as outlines) from these.
   */
  fillOutlines: Map<AcDbEntity, PdfRecPoint[][]>
  /**
   * Stroke outline entities kept for fill+stroke paints, keyed by the
   * hatch they outline. Text recovery drops these when it consumes the hatch.
   */
  fillStrokeCompanions: Map<AcDbEntity, AcDbEntity[]>
  /** Counts for the import log. */
  stats: {
    shapes: PdfImportShapeStats
    texts: number
    hatches: number
    patternHatches: number
    patternHatchStrokes: number
    blocks: number
    references: number
  }
}

/**
 * Turns extracted page content into CAD entities: recognized shapes, solid
 * and pattern hatches, form blocks and texts. Images and the append step are
 * left to the caller. Needs no DOM or PDF.js, so a whole page conversion can
 * run headlessly.
 *
 * @param db - Database that receives block, linetype and style records.
 * @param content - Page content from `extractPdfImportSubpaths`.
 * @param options - Resolved import options.
 * @param styleFor - Text style name for a PDF font id, if any.
 */
export function acapPdfBuildPageEntities(
  db: AcDbDatabase,
  content: PdfImportPageContent,
  options: AcApResolvedPdfImportOptions,
  styleFor: (fontId?: string) => string | undefined = () => undefined
): AcApPdfPageEntities {
  const formBlocks = options.formBlocks
    ? buildPdfFormBlocks(content, {
        curveRecognition: options.curveRecognition
      })
    : { blocks: [], consumed: new Set<number>() }
  const { items, stats } = buildPdfImportShapes(
    {
      subpaths: content.subpaths.filter(
        (_, index) => !formBlocks.consumed.has(index)
      )
    },
    options
  )

  // Pattern hatches arrive as loose strokes; rebuild them where the
  // strokes match a pattern exactly.
  const recognized = options.recognizeHatches
    ? acapPdfRecognizeHatches(
        items,
        {
          tolerance: PDF_HATCH_TOLERANCE_MM * options.scale,
          ...options.hatchRecognition
        },
        content.clipPaths?.map(loops =>
          loops.map(loop =>
            loop.map(p => ({
              x: options.insertionPoint.x + p.x * options.scale,
              y: options.insertionPoint.y + p.y * options.scale
            }))
          )
        )
      )
    : { hatches: [], consumed: new Set<number>() }
  const itemIndex = new Map<PdfImportShapeItem, number>()
  items.forEach((item, index) => itemIndex.set(item, index))
  const hatchAt = new Map<number, PdfRecognizedHatch>()
  for (const hatch of recognized.hatches) hatchAt.set(hatch.items[0], hatch)

  const usedLayerNames = new Set<string>()
  const createEntity = (item: PdfImportShapeItem) => {
    const entity = shapeToEntity(item.shape)
    if (!entity) return null
    if (item.layerName) {
      usedLayerNames.add(item.layerName)
      entity.layer = item.layerName
    }
    acapPdfApplyColor(entity, item.color)
    if (options.lineWeights && item.lineWidth) {
      entity.lineWeight = nearestLineWeight(item.lineWidth)
    }
    if (options.dashLinetypes && item.dashPattern) {
      entity.lineType = acapPdfEnsureDashLinetype(
        db,
        item.dashPattern.map(length => length * options.scale)
      )
    }
    return entity
  }

  const entities: AcDbEntity[] = []
  const fillOutlines = new Map<AcDbEntity, PdfRecPoint[][]>()
  const fillStrokeCompanions = new Map<AcDbEntity, AcDbEntity[]>()
  const hatchByPaintGroup = new Map<number, AcDbEntity>()
  let hatchCount = 0
  let patternHatchCount = 0
  for (const paint of orderPdfImportPaints(items, options.fillHatches)) {
    if (paint.kind === 'shape') {
      const index = itemIndex.get(paint.item)
      if (index !== undefined && recognized.consumed.has(index)) {
        // The hatch takes the paint position of its first stroke.
        const found = hatchAt.get(index)
        const hatch = found && createPatternHatch(db, found)
        if (hatch) {
          if (found.layerName) usedLayerNames.add(found.layerName)
          entities.push(hatch)
          patternHatchCount++
        }
        continue
      }
      const entity = createEntity(paint.item)
      if (!entity) continue
      entities.push(entity)
      const item = paint.item
      if (
        item.filled &&
        item.stroked &&
        item.paintGroup !== undefined
      ) {
        const hatch = hatchByPaintGroup.get(item.paintGroup)
        if (hatch) {
          const list = fillStrokeCompanions.get(hatch)
          if (list) list.push(entity)
          else fillStrokeCompanions.set(hatch, [entity])
        }
      }
      continue
    }
    // One solid hatch per fill paint; extra loops are holes (even-odd).
    const group = paint.items
    const loops = group
      .map(item => acapPdfShapeToLoop(item.shape))
      .filter((loop): loop is NonNullable<typeof loop> => !!loop)
    const hatch = acapPdfCreateSolidHatch(db, loops)
    if (!hatch) {
      // Nothing closed to fill: keep the outlines instead of dropping them.
      for (const item of group) {
        if (item.stroked) continue
        const entity = createEntity(item)
        if (entity) entities.push(entity)
      }
      continue
    }
    const first = group[0]
    if (first.layerName) {
      usedLayerNames.add(first.layerName)
      hatch.layer = first.layerName
    }
    acapPdfApplyColor(hatch, first.fillColor ?? first.color)
    entities.push(hatch)
    if (first.paintGroup !== undefined) {
      hatchByPaintGroup.set(first.paintGroup, hatch)
    }
    fillOutlines.set(
      hatch,
      group
        .map(item => pdfShapeOutline(item.shape))
        .filter(points => points.length >= 2)
    )
    hatchCount++
  }

  // Repeated Form XObjects become block definitions plus references.
  const blockTable = db.tables.blockTable
  let referenceCount = 0
  for (const block of formBlocks.blocks) {
    const blockEntities = block.shapes
      .map(createEntity)
      .filter((entity): entity is AcDbEntity => entity !== null)
    if (blockEntities.length === 0) continue
    const name = uniqueBlockName(db, PDF_FORM_BLOCK_PREFIX)
    const record = new AcDbBlockTableRecord({
      name,
      origin: new AcGePoint3d(0, 0, 0)
    })
    blockTable.add(record)
    record.appendEntity(blockEntities)
    const { insertionPoint, scale } = options
    for (const placement of block.references) {
      const ref = new AcDbBlockReference(name)
      ref.position = new AcGePoint3d(
        insertionPoint.x + placement.position.x * scale,
        insertionPoint.y + placement.position.y * scale,
        0
      )
      ref.rotation = placement.rotation
      ref.scaleFactors = new AcGePoint3d(
        placement.scaleX * scale,
        placement.scaleY * scale,
        1
      )
      if (placement.layerName) {
        usedLayerNames.add(placement.layerName)
        ref.layer = placement.layerName
      }
      entities.push(ref)
      referenceCount++
    }
  }
  const texts = options.mergeTextRuns
    ? mergePdfTextRuns(content.texts)
    : content.texts
  const textEntities: { entity: AcDbText; run: PdfImportedText }[] = []
  for (const textRun of texts) {
    if (textRun.layerName) {
      usedLayerNames.add(textRun.layerName)
    }
    const entity = pdfTextToEntity(textRun, options)
    if (!entity) continue
    const style = styleFor(textRun.fontId)
    if (style) entity.styleName = style
    textEntities.push({ entity, run: textRun })
    entities.push(entity)
  }
  return {
    entities,
    textEntities,
    usedLayerNames,
    fillOutlines,
    fillStrokeCompanions,
    stats: {
      shapes: stats,
      texts: texts.length,
      hatches: hatchCount,
      patternHatches: patternHatchCount,
      patternHatchStrokes: recognized.consumed.size,
      blocks: formBlocks.blocks.length,
      references: referenceCount
    }
  }
}

function pdfTextToEntity(
  run: PdfImportedText,
  options: AcApResolvedPdfImportOptions
): AcDbText | null {
  if (!run.text || run.height <= 0) return null

  const { insertionPoint, scale } = options
  const text = new AcDbText()
  text.textString = run.text
  text.position = new AcGePoint3d(
    insertionPoint.x + run.position.x * scale,
    insertionPoint.y + run.position.y * scale,
    0
  )
  text.height = run.height * scale
  text.rotation = run.rotation
  if (Number.isFinite(run.widthFactor) && run.widthFactor > 0) {
    text.widthFactor = run.widthFactor
  }
  if (run.layerName) {
    text.layer = run.layerName
  }
  acapPdfApplyColor(text, run.color)
  return text
}

/**
 * Distance (paper millimeters, before import scaling) within which a stroke
 * counts as lying on a recognized hatch line. PDF writers round coordinates
 * to about 0.01 pt (0.0035 mm), so this leaves ample headroom while staying
 * far below any real hatch spacing.
 */
const PDF_HATCH_TOLERANCE_MM = 0.05

function createPatternHatch(
  db: AcDbDatabase,
  found: PdfRecognizedHatch
): AcDbEntity | undefined {
  const loops = found.boundary
    .map(shape => acapPdfShapeToLoop(shape))
    .filter((loop): loop is NonNullable<typeof loop> => !!loop)
  const hatch = acapPdfCreatePatternHatch(
    db,
    loops,
    found.pattern,
    found.definitionLines
  )
  if (!hatch) return undefined
  if (found.layerName) hatch.layer = found.layerName
  acapPdfApplyColor(hatch, found.color)
  return hatch
}

function shapeToEntity(shape: PdfRecognizedShape): AcDbEntity | null {
  switch (shape.kind) {
    case 'line':
      return new AcDbLine(
        new AcGePoint3d(shape.start.x, shape.start.y, 0),
        new AcGePoint3d(shape.end.x, shape.end.y, 0)
      )
    case 'circle':
      return new AcDbCircle(
        new AcGePoint3d(shape.center.x, shape.center.y, 0),
        shape.radius
      )
    case 'arc':
      return new AcDbArc(
        new AcGePoint3d(shape.center.x, shape.center.y, 0),
        shape.radius,
        shape.startAngle,
        shape.endAngle
      )
    case 'ellipse': {
      const major = Math.hypot(shape.majorAxis.x, shape.majorAxis.y)
      if (!(major > 0)) return null
      return new AcDbEllipse(
        new AcGePoint3d(shape.center.x, shape.center.y, 0),
        AcGeVector3d.Z_AXIS,
        new AcGeVector3d(shape.majorAxis.x, shape.majorAxis.y, 0),
        major,
        major * shape.radiusRatio,
        shape.startAngle,
        shape.endAngle
      )
    }
    case 'polyline': {
      if (shape.vertices.length < 2) return null
      const poly = new AcDbPolyline()
      shape.vertices.forEach((v, i) =>
        poly.addVertexAt(i, new AcGePoint2d(v.x, v.y), v.bulge)
      )
      poly.closed = shape.closed
      return poly
    }
    case 'spline':
      try {
        return new AcDbSpline(
          shape.controlPoints.map(p => new AcGePoint3d(p.x, p.y, 0)),
          shape.knots
        )
      } catch (err) {
        log.warn('[PdfImport] Skipped invalid spline:', err)
        return null
      }
  }
}

/** Standard AutoCAD line weights in 1/100 mm. */
const STANDARD_LINE_WEIGHTS = [
  0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106,
  120, 140, 158, 200, 211
]

/** Maps a stroke width in millimeters to the nearest standard line weight. */
function nearestLineWeight(widthMm: number): AcGiLineWeight {
  const hundredths = widthMm * 100
  let best = STANDARD_LINE_WEIGHTS[0]
  for (const weight of STANDARD_LINE_WEIGHTS) {
    if (Math.abs(weight - hundredths) < Math.abs(best - hundredths)) {
      best = weight
    }
  }
  return best as AcGiLineWeight
}

/** Name prefix for blocks recovered from repeated Form XObjects. */
const PDF_FORM_BLOCK_PREFIX = 'PDF_FORM_'

/** First `<prefix><n>` block name not used in the drawing. */
function uniqueBlockName(db: AcDbDatabase, prefix: string) {
  const blockTable = db.tables.blockTable
  let index = 1
  while (blockTable.has(`${prefix}${index}`)) index++
  return `${prefix}${index}`
}

/** Applies a PDF paint colour to an entity. */
export function acapPdfApplyColor(entity: AcDbEntity, color?: string) {
  if (!color) return
  if (color === PDF_IMPORT_FOREGROUND_COLOR) {
    entity.color = new AcCmColor().setForeground()
    return
  }
  const match = /^#([0-9a-fA-F]{6})$/.exec(color)
  if (!match) return
  const value = Number.parseInt(match[1], 16)
  entity.color = new AcCmColor().setRGB(
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255
  )
}

/** Points along a shape's outline, for glyph recognition (coarse is fine). */
function pdfShapeOutline(shape: PdfRecognizedShape): PdfRecPoint[] {
  switch (shape.kind) {
    case 'line':
      return [shape.start, shape.end]
    case 'polyline': {
      const points = shape.vertices.map(v => ({ x: v.x, y: v.y }))
      if (shape.closed && points.length > 1) points.push({ ...points[0] })
      return points
    }
    case 'spline':
      return shape.controlPoints.map(p => ({ x: p.x, y: p.y }))
    case 'circle':
    case 'arc': {
      const start = shape.kind === 'arc' ? shape.startAngle : 0
      let sweep = shape.kind === 'arc' ? shape.endAngle - start : Math.PI * 2
      if (sweep <= 0) sweep += Math.PI * 2
      const steps = Math.max(4, Math.ceil((24 * sweep) / (Math.PI * 2)))
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = start + (sweep * i) / steps
        return {
          x: shape.center.x + shape.radius * Math.cos(t),
          y: shape.center.y + shape.radius * Math.sin(t)
        }
      })
    }
    case 'ellipse': {
      const major = Math.hypot(shape.majorAxis.x, shape.majorAxis.y)
      if (!(major > 0)) return []
      const ux = shape.majorAxis.x / major
      const uy = shape.majorAxis.y / major
      const minor = major * shape.radiusRatio
      let sweep = shape.endAngle - shape.startAngle
      if (sweep <= 0) sweep += Math.PI * 2
      const steps = Math.max(4, Math.ceil((24 * sweep) / (Math.PI * 2)))
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = shape.startAngle + (sweep * i) / steps
        const u = major * Math.cos(t)
        const v = minor * Math.sin(t)
        return {
          x: shape.center.x + u * ux - v * uy,
          y: shape.center.y + u * uy + v * ux
        }
      })
    }
  }
}
