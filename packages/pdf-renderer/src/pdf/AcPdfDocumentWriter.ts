import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'
import { PDFDocument, PDFImage } from 'pdf-lib'

import type { AcPdfEntity } from '../renderer/AcPdfEntity'
import type { AcPdfFormRegistry } from './AcPdfContentWriter'
import { AcPdfContentWriter } from './AcPdfContentWriter'
import type { AcPdfFontManager } from './AcPdfFontManager'
import { AcPdfOcgManager } from './AcPdfOcgManager'
import {
  type AcPdfPageLayoutInput,
  computePageLayout,
  pdfRebaseOrigin,
  PDF_MIN_STROKE_PT
} from './AcPdfPageLayout'

export interface AcPdfWriteOptions extends AcPdfPageLayoutInput {
  background: 'none' | number
  title?: string
  fitBox?: {
    min: { x: number; y: number }
    max: { x: number; y: number }
  }
  embedTextActualText?: boolean
  /**
   * Shared OCG manager used when painting several pages into one document,
   * so identical CAD layers resolve to a single OCG instead of being merged
   * afterwards by parsing finished page bytes.
   */
  ocg?: AcPdfOcgManager
  /**
   * Shared embedded-image cache across pages of one document. Keyed by the
   * image byte buffer so transformed paint copies still resolve, and an
   * image used on several pages is decoded/embedded only once.
   */
  imageCache?: Map<Uint8Array, PDFImage>
  /**
   * Embedded-font registry for `text` draw ops (`textMode: 'text'`). Shared
   * across the pages of one document so fonts embed (subset) once and glyph
   * encoding happens once per op.
   */
  fonts?: AcPdfFontManager
  /**
   * Document-scoped Form XObject dedup registry shared across pages, so
   * identical glyph/geometry forms embed once per document instead of once
   * per page.
   */
  formRegistry?: AcPdfFormRegistry
}

/**
 * Serializes accumulated {@link AcPdfEntity} nodes into a PDF document.
 */
export class AcPdfDocumentWriter {
  /**
   * Creates a single-page document from `entities` and returns its bytes.
   * Multi-page exports use {@link writePage} against one shared document to
   * avoid serializing and re-parsing one PDF per layout.
   */
  static async write(
    entities: AcPdfEntity[],
    options: AcPdfWriteOptions
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    doc.setProducer('MLightCAD pdf-renderer')
    doc.setCreator('MLightCAD')
    if (options.title) {
      doc.setTitle(options.title)
    }
    await AcPdfDocumentWriter.writePage(doc, entities, options)
    // Flush deferred font embeds and repair their font programs (see
    // AcPdfFontManager.finalize) before serialization.
    await options.fonts?.finalize()
    return doc.save({ useObjectStreams: true })
  }

  /**
   * Paints `entities` as a new page of `doc`.
   *
   * The page owns its content stream, but the OCG manager and embedded-image
   * cache can be shared with previously written pages to keep one layer per
   * CAD layer and a single image XObject per source image.
   */
  static async writePage(
    doc: PDFDocument,
    entities: AcPdfEntity[],
    options: AcPdfWriteOptions
  ): Promise<void> {
    const unionBbox = unionDrawableBoxes(entities)
    const bbox = options.fitBox
      ? boxFromFit(options.fitBox)
      : unionBbox
    const layout = computePageLayout(bbox, options)
    const page = doc.addPage([layout.pageWidth, layout.pageHeight])

    if (typeof options.background === 'number') {
      const c = options.background
      // Emitted through the writer (raw content stream) instead of
      // `page.drawRectangle` so the whole page content lives in one compact
      // stream and no operator objects are retained by pdf-lib.
      const background = new AcPdfContentWriter(page, doc, {
        imageCache: options.imageCache
      })
      background.push(
        `${(c >> 16) & 0xff} ${(c >> 8) & 0xff} ${c & 0xff} rg 0 0 ` +
          `${layout.pageWidth} ${layout.pageHeight} re f\n`
      )
      background.flushToPage(page)
    }

    const writer = new AcPdfContentWriter(page, doc, {
      minUserLineWidth:
        PDF_MIN_STROKE_PT / Math.max(Math.abs(layout.scale), 1e-12),
      imageCache: options.imageCache,
      fonts: options.fonts,
      formRegistry: options.formRegistry
    })
    const ocg = options.ocg ?? new AcPdfOcgManager(doc)
    for (const entity of entities) {
      const embeds: Promise<void>[] = []
      entity.forEachOp(op => {
        if (op.kind === 'image') {
          embeds.push(writer.embedImage(op))
        } else if (
          op.kind === 'text' &&
          op.hex === '' &&
          !(op.glyphHex && op.glyphHex.length > 0) &&
          options.fonts
        ) {
          // Encoding must happen before painting: paint bakes transformed
          // op copies, and those copies carry the encoded `hex`.
          embeds.push(options.fonts.embedOp(doc, op))
        }
      })
      await Promise.all(embeds)
    }

    writer.save()
    // Large survey coordinates lose precision once a viewer applies the page
    // CTM in float32. Subtract the framing-box center in double precision and
    // fold that origin into the CTM translation so both the path numbers and
    // the `cm` operands stay small — the same local-origin rebase three-renderer
    // applies before uploading vertex buffers.
    const origin = pdfRebaseOrigin(bbox)
    const drawingRebase = origin
      ? new AcGeMatrix3d().makeTranslation(-origin.x, -origin.y, 0)
      : undefined
    const drawingToPage = new AcGeMatrix3d().set(
      layout.scale,
      0,
      0,
      layout.offsetX + (origin ? origin.x * layout.scale : 0),
      0,
      layout.scale,
      0,
      layout.offsetY + (origin ? origin.y * layout.scale : 0),
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    )
    writer.concatMatrix(drawingToPage)

    const indexed = entities.map((entity, index) => ({ entity, index }))
    indexed.sort((a, b) => {
      const order = a.entity.drawOrder - b.entity.drawOrder
      return order !== 0 ? order : a.index - b.index
    })
    for (const { entity } of indexed) {
      entity.paint({
        writer,
        ocg,
        embedActualText: options.embedTextActualText !== false,
        formReuse: false,
        localToDrawing: drawingRebase,
        drawingRebase
      })
    }
    writer.restore()
    // The raw content stream only reaches the page here: the string-based
    // writer accumulates chunks in memory, unlike the former pdf-lib operator
    // path that serialized automatically at save time.
    writer.flushToPage(page)
    ocg.attachToPage(page)
  }
}

function boxFromFit(fit: {
  min: { x: number; y: number }
  max: { x: number; y: number }
}): AcGeBox2d {
  const box = new AcGeBox2d()
  box.min.set(fit.min.x, fit.min.y)
  box.max.set(fit.max.x, fit.max.y)
  return box
}

function splitDominantCluster(
  boxes: AcGeBox2d[],
  axis: 'x' | 'y'
): AcGeBox2d[] {
  if (boxes.length < 8) {
    return boxes
  }
  const keyed = boxes
    .map(box => ({
      value: axis === 'x' ? (box.min.x + box.max.x) / 2 : (box.min.y + box.max.y) / 2,
      box
    }))
    .sort((a, b) => a.value - b.value)
  const span = keyed[keyed.length - 1].value - keyed[0].value
  if (!(span > 0)) {
    return boxes
  }
  let bestGap = 0
  let bestIndex = 0
  for (let i = 1; i < keyed.length; i++) {
    const gap = keyed[i].value - keyed[i - 1].value
    if (gap > bestGap) {
      bestGap = gap
      bestIndex = i
    }
  }
  if (bestGap < span * 0.2) {
    return boxes
  }
  const left = keyed.slice(0, bestIndex)
  const right = keyed.slice(bestIndex)
  const majority = left.length >= right.length ? left : right
  // Require an outlier-scale gap relative to typical spacing inside the
  // majority side. Using the majority's full axis extent fails when that
  // side still contains a second far subcluster (origin leftover + INSERT
  // double-transform): majExtent becomes huge and peeling never starts.
  // Median nearest-neighbor gap stays small for real drawings and for
  // dense samples (gradient hatch rows), so nearby columns are kept.
  const sizes = boxes.map(box =>
    Math.max(box.max.x - box.min.x, box.max.y - box.min.y, 1e-9)
  )
  sizes.sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 1
  const majNnGaps: number[] = []
  for (let i = 1; i < majority.length; i++) {
    majNnGaps.push(majority[i].value - majority[i - 1].value)
  }
  majNnGaps.sort((a, b) => a - b)
  const typicalGap =
    majNnGaps.length > 0
      ? majNnGaps[Math.floor(majNnGaps.length / 2)] || medianSize
      : medianSize
  const outlierGap = Math.max(typicalGap * 10, medianSize * 20)
  if (bestGap < outlierGap) {
    return boxes
  }
  return majority.map(item => item.box)
}

/**
 * Unions the primary geometry cluster. Header EXTMIN/EXTMAX and a naive
 * union of every drawable are unreliable: origin leftovers plus INSERT
 * double-transforms sit tens of millions of units away and collapse the
 * real drawing to a speck.
 */
function unionDrawableBoxes(entities: AcPdfEntity[]): AcGeBox2d {
  let boxes: AcGeBox2d[] = []
  const visit = (entity: AcPdfEntity) => {
    if (!entity.visible) {
      return
    }
    const box = entity.box
    if (
      !box.isEmpty() &&
      Number.isFinite(box.min.x) &&
      Number.isFinite(box.min.y) &&
      Number.isFinite(box.max.x) &&
      Number.isFinite(box.max.y)
    ) {
      boxes.push(box)
    }
    // Async mtext groups keep an empty parent box until/unless refreshed;
    // still consider children so INSERT/arc-aligned labels frame correctly.
    for (let i = 0; i < entity.childCount; i++) {
      const child = entity.childAt(i)
      if (child) {
        visit(child)
      }
    }
  }
  for (const entity of entities) {
    visit(entity)
  }
  const fallback = new AcGeBox2d()
  for (const box of boxes) {
    fallback.union(box)
  }
  if (boxes.length < 8) {
    return fallback
  }
  let previous = -1
  while (boxes.length !== previous) {
    previous = boxes.length
    boxes = splitDominantCluster(boxes, 'x')
    boxes = splitDominantCluster(boxes, 'y')
  }
  const clustered = new AcGeBox2d()
  for (const box of boxes) {
    clustered.union(box)
  }
  return clustered.isEmpty() ? fallback : clustered
}
