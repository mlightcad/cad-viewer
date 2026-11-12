import {
  AcDbArc,
  AcDbCircle,
  type AcDbDatabase,
  AcDbEllipse,
  type AcDbEntity,
  AcDbHatch,
  AcDbLine,
  AcDbPolyline
} from '@mlightcad/data-model'

import {
  acapPdfCreatePatternHatch,
  acapPdfShapeToLoop
} from './pdfImportEntities'
import type { PdfImportShapeItem } from './pdfImportShapes'
import type { PdfRecognizedVertex } from './recognition/pdfCurveRecognition'
import {
  acapPdfRecognizeHatches,
  type PdfHatchRecognitionOptions,
  type PdfRecognizedHatch
} from './recognition/pdfHatchRecognition'

/**
 * Selected entities described for hatch recognition: one shape item per
 * line, open straight polyline segment, arc, circle, ellipse or closed
 * polyline, with the entity each item came from.
 */
export interface PdfHatchInput<Id> {
  items: PdfImportShapeItem[]
  /** Entity of each item (same index). */
  owners: Id[]
}

/**
 * Describes entities for {@link acapPdfRecoverHatches}.
 *
 * Items keep the layer, colour and lineweight of their entity: strokes of
 * one hatch share all three. An open polyline of straight segments is split
 * into its segments, since a hatch stroke may have been joined with its
 * neighbours. Entities drawn with a `PDF_DASH_*` linetype count as dashed
 * and never become hatch strokes (they still bound hatches).
 */
export function pdfEntitiesToHatchInput<Id>(
  entities: Map<Id, AcDbEntity>
): PdfHatchInput<Id> {
  const input: PdfHatchInput<Id> = { items: [], owners: [] }
  for (const [id, entity] of entities) {
    const style = entityStyle(entity)
    const push = (shape: PdfImportShapeItem['shape']) => {
      input.items.push({ shape, ...style })
      input.owners.push(id)
    }
    if (entity instanceof AcDbLine) {
      push({
        kind: 'line',
        start: { x: entity.startPoint.x, y: entity.startPoint.y },
        end: { x: entity.endPoint.x, y: entity.endPoint.y }
      })
    } else if (entity instanceof AcDbPolyline) {
      const vertices = polylineVertices(entity)
      if (vertices.length < 2) continue
      const straight = vertices.every(v => Math.abs(v.bulge) <= 1e-12)
      if (!entity.closed && straight) {
        for (let i = 0; i + 1 < vertices.length; i++) {
          push({
            kind: 'line',
            start: { x: vertices[i].x, y: vertices[i].y },
            end: { x: vertices[i + 1].x, y: vertices[i + 1].y }
          })
        }
      } else {
        push({ kind: 'polyline', vertices, closed: entity.closed })
      }
    } else if (entity instanceof AcDbArc) {
      push({
        kind: 'arc',
        center: { x: entity.center.x, y: entity.center.y },
        radius: entity.radius,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle
      })
    } else if (entity instanceof AcDbCircle) {
      push({
        kind: 'circle',
        center: { x: entity.center.x, y: entity.center.y },
        radius: entity.radius
      })
    } else if (entity instanceof AcDbEllipse) {
      const axis = entity.majorAxis
      const length = Math.hypot(axis.x, axis.y) || 1
      const major = entity.majorAxisRadius
      push({
        kind: 'ellipse',
        center: { x: entity.center.x, y: entity.center.y },
        majorAxis: {
          x: (axis.x / length) * major,
          y: (axis.y / length) * major
        },
        radiusRatio: major > 0 ? entity.minorAxisRadius / major : 1,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle
      })
    }
  }
  return input
}

function entityStyle(
  entity: AcDbEntity
): Pick<
  PdfImportShapeItem,
  'layerName' | 'color' | 'lineWidth' | 'dashPattern'
> {
  const weight = Number(entity.lineWeight)
  return {
    layerName: entity.layer,
    color: entity.color.toString(),
    // Lineweights are hundredths of a millimetre; ByLayer/ByBlock are < 0.
    lineWidth: weight > 0 ? weight / 100 : undefined,
    dashPattern: /^PDF_DASH/i.test(entity.lineType ?? '') ? [1] : undefined
  }
}

function polylineVertices(entity: AcDbPolyline): PdfRecognizedVertex[] {
  // Runtime polyline geometry keeps bulge data; the typed API does not
  // expose it (the HATCH command reads it the same way).
  const runtime = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices
  if (runtime && runtime.length === entity.numberOfVertices) {
    return runtime.map(v => ({ x: v.x, y: v.y, bulge: v.bulge ?? 0 }))
  }
  return Array.from({ length: entity.numberOfVertices }, (_, i) => {
    const p = entity.getPoint2dAt(i)
    return { x: p.x, y: p.y, bulge: 0 }
  })
}

/** A recovered hatch with the entities it replaces. */
export interface PdfRecoveredHatch<Id> {
  hatch: PdfRecognizedHatch
  /** Entities every item of which the hatch re-draws (to erase). */
  consumed: Id[]
}

/** Result of {@link acapPdfRecoverHatches}. */
export interface PdfHatchRecovery<Id> {
  hatches: PdfRecoveredHatch<Id>[]
  /** Tolerance the hatches were recognized with. */
  tolerance: number
}

/**
 * Tolerances tried, as shares of the median stroke length. A hatch stroke
 * is rarely shorter than a few line spacings, and PDF writers round
 * coordinates far below that; the import scale is unknown here, so a few
 * values are tried and the one that explains the most strokes wins.
 */
const TOLERANCE_LADDER = [0.02, 0.05, 0.008]

/**
 * Rebuilds pattern hatches from selected strokes.
 *
 * Boundaries come from closed shapes in the selection or from the faces the
 * selected line work encloses; when no library pattern fits, a custom
 * pattern is measured. An entity is replaced only when the hatch re-draws
 * all of it.
 *
 * @param input - From {@link pdfEntitiesToHatchInput}.
 * @param options - Overrides for the recognizer (tests, tuning).
 */
export function acapPdfRecoverHatches<Id>(
  input: PdfHatchInput<Id>,
  options?: PdfHatchRecognitionOptions
): PdfHatchRecovery<Id> {
  const tolerances =
    options?.tolerance !== undefined
      ? [options.tolerance]
      : TOLERANCE_LADDER.map(share => share * medianLineLength(input.items))
  let best: PdfHatchRecovery<Id> = { hatches: [], tolerance: tolerances[0] }
  let bestCount = 0
  for (const tolerance of tolerances) {
    if (!(tolerance > 0)) continue
    const { hatches } = acapPdfRecognizeHatches(input.items, {
      faceBoundaries: true,
      customPatterns: true,
      ...options,
      tolerance
    })
    const count = hatches.reduce((sum, hatch) => sum + hatch.items.length, 0)
    if (count > bestCount) {
      bestCount = count
      best = { hatches: withConsumed(input, hatches), tolerance }
    }
  }
  return best
}

function medianLineLength(items: readonly PdfImportShapeItem[]): number {
  const lengths: number[] = []
  for (const item of items) {
    if (item.shape.kind !== 'line') continue
    const { start, end } = item.shape
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    if (length > 0) lengths.push(length)
  }
  if (lengths.length === 0) return 0
  lengths.sort((p, q) => p - q)
  return lengths[Math.floor(lengths.length / 2)]
}

function withConsumed<Id>(
  input: PdfHatchInput<Id>,
  hatches: PdfRecognizedHatch[]
): PdfRecoveredHatch<Id>[] {
  const itemCount = new Map<Id, number>()
  for (const owner of input.owners) {
    itemCount.set(owner, (itemCount.get(owner) ?? 0) + 1)
  }
  return hatches.map(hatch => {
    const taken = new Map<Id, number>()
    for (const index of hatch.items) {
      const owner = input.owners[index]
      taken.set(owner, (taken.get(owner) ?? 0) + 1)
    }
    // A polyline whose other segments are line work stays as it is.
    const consumed = [...taken.entries()]
      .filter(([owner, count]) => count === itemCount.get(owner))
      .map(([owner]) => owner)
    return { hatch, consumed }
  })
}

/**
 * The hatch entity of a recovered hatch, on the layer and in the colour of
 * `source` (one of the strokes it replaces).
 *
 * @returns The hatch, or `undefined` when its boundary has no closed loop.
 */
export function acapPdfCreateRecoveredHatch(
  db: AcDbDatabase,
  hatch: PdfRecognizedHatch,
  source?: AcDbEntity
): AcDbHatch | undefined {
  const loops = hatch.boundary
    .map(shape => acapPdfShapeToLoop(shape))
    .filter((loop): loop is NonNullable<typeof loop> => !!loop)
  const entity = acapPdfCreatePatternHatch(
    db,
    loops,
    hatch.pattern,
    hatch.definitionLines
  )
  if (!entity) return undefined
  if (source) {
    entity.layer = source.layer
    entity.color = source.color.clone()
    entity.lineWeight = source.lineWeight
  }
  return entity
}

/** Short label of a hatch pattern for prompts (`ANSI31`, `USER`, ...). */
export function acapPdfHatchPatternLabel(hatch: PdfRecognizedHatch): string {
  const pattern = hatch.pattern
  if (pattern.type === 'predefined') return pattern.name
  if (pattern.type === 'userDefined')
    return pattern.double ? 'USER (x2)' : 'USER'
  return pattern.name
}
