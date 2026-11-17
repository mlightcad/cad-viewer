import type { AcDbDatabase, AcDbEntity } from '@mlightcad/data-model'

import {
  acapPdfCreateDimensions,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  PDF_DIM_STYLE,
  pdfEntitiesToDimInput
} from './pdfDimensionConvert.js'
import { acapPdfPrepareDimStrokeTexts } from './pdfDimStrokeTexts.js'
import {
  type PdfDimensionCandidate,
  type PdfDimensionOptions,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern.js'
import type { PdfGlyphDictionary } from './recognition/pdfGlyphDictionary.js'
import type { PdfRecPoint } from './recognition/pdfRecGeometry.js'

/** What {@link acapPdfRecognizeImportDimensions} changed. */
export interface AcApPdfImportDimensions {
  /** Paint-ordered entities with recognized dimensions in place. */
  entities: AcDbEntity[]
  /** Dimensions created, with the candidate each came from. */
  dimensions: Array<{
    entity: AcDbEntity
    candidate: PdfDimensionCandidate<AcDbEntity>
  }>
  /** Source entities the dimensions replaced. */
  replaced: number
  /** Drawing scale (DIMLFAC) the dimensions use. */
  scale: number
}

/**
 * Recognizes exploded dimensions among freshly imported entities and puts
 * dimension entities in their place.
 *
 * Runs the strict `import` profile: nobody reviews the result, so only
 * dimensions backed by terminators, extension lines and a value text that
 * agrees with the drawing scale are converted. Everything else stays as
 * imported, for `pdfdim` to review.
 *
 * Each dimension takes the paint position of the first entity it replaces,
 * so draw order is kept. Shapes shared by neighbours (an extension line of
 * two chained dimensions) are replaced once.
 *
 * @param db - Database receiving the `PDF_DIM` style and dim blocks.
 * @param entities - Imported entities in paint order (not yet appended).
 * @param dictionary - Learned glyphs for reading stroke text.
 * @param options - Recognition tuning.
 * @param fillOutlines - Outlines of solid fills (filled text glyphs).
 */
export function acapPdfRecognizeImportDimensions(
  db: AcDbDatabase,
  entities: AcDbEntity[],
  dictionary: PdfGlyphDictionary,
  options: Omit<PdfDimensionOptions, 'profile'> = {},
  fillOutlines?: Map<AcDbEntity, PdfRecPoint[][]>
): AcApPdfImportDimensions {
  const byEntity = new Map<AcDbEntity, AcDbEntity>()
  for (const entity of entities) byEntity.set(entity, entity)
  const input = pdfEntitiesToDimInput(byEntity)
  acapPdfPrepareDimStrokeTexts(
    input,
    byEntity,
    dictionary,
    undefined,
    fillOutlines
  )
  const candidates = recognizePdfDimensions(input, {
    ...options,
    profile: 'import'
  })
  if (candidates.length === 0) {
    return { entities, dimensions: [], replaced: 0, scale: 1 }
  }
  const scale = acapPdfNiceScale(suggestPdfDimensionScale(candidates) ?? 1)
  acapPdfEnsureDimStyle(db, candidates, scale)
  const created = acapPdfCreateDimensions(
    db,
    candidates,
    scale,
    candidate => candidate.text.id.layer,
    PDF_DIM_STYLE,
    { append: false }
  )

  // A dimension replaces its source shapes at the first one's position.
  const position = new Map<AcDbEntity, number>()
  entities.forEach((entity, i) => position.set(entity, i))
  const firstOf = new Map<AcDbEntity, number>()
  const consumed = new Set<AcDbEntity>()
  candidates.forEach((candidate, index) => {
    for (const source of candidate.consumed) consumed.add(source)
    let first: AcDbEntity | undefined
    let firstIndex = Infinity
    for (const source of candidate.consumed) {
      const at = position.get(source) ?? -1
      if (at >= 0 && at < firstIndex) {
        firstIndex = at
        first = source
      }
    }
    if (first) firstOf.set(first, index)
  })
  const result: AcDbEntity[] = []
  for (const entity of entities) {
    const index = firstOf.get(entity)
    if (index !== undefined) result.push(created[index])
    if (!consumed.has(entity)) result.push(entity)
  }
  return {
    entities: result,
    dimensions: created.map((entity, i) => ({
      entity,
      candidate: candidates[i]
    })),
    replaced: consumed.size,
    scale
  }
}
