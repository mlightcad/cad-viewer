import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'
import { PDFDocument, rgb } from 'pdf-lib'

import type { AcPdfEntity } from '../renderer/AcPdfEntity'
import { AcPdfContentWriter } from './AcPdfContentWriter'
import { AcPdfOcgManager } from './AcPdfOcgManager'
import {
  type AcPdfPageLayoutInput,
  computePageLayout,
  PDF_MIN_STROKE_PT} from './AcPdfPageLayout'

export interface AcPdfWriteOptions extends AcPdfPageLayoutInput {
  background: 'none' | number
  title?: string
  fitBox?: {
    min: { x: number; y: number }
    max: { x: number; y: number }
  }
  embedTextActualText?: boolean
}

/**
 * Serializes accumulated {@link AcPdfEntity} nodes into a PDF document.
 */
export class AcPdfDocumentWriter {
  static async write(
    entities: AcPdfEntity[],
    options: AcPdfWriteOptions
  ): Promise<Uint8Array> {
    const unionBbox = unionDrawableBoxes(entities)
    const bbox = options.fitBox
      ? boxFromFit(options.fitBox)
      : unionBbox
    const layout = computePageLayout(bbox, options)
    const doc = await PDFDocument.create()
    doc.setProducer('MLightCAD pdf-renderer')
    doc.setCreator('MLightCAD')
    if (options.title) {
      doc.setTitle(options.title)
    }
    const page = doc.addPage([layout.pageWidth, layout.pageHeight])

    if (typeof options.background === 'number') {
      const c = options.background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: layout.pageWidth,
        height: layout.pageHeight,
        color: rgb(
          ((c >> 16) & 0xff) / 255,
          ((c >> 8) & 0xff) / 255,
          (c & 0xff) / 255
        )
      })
    }

    const writer = new AcPdfContentWriter(page, doc, {
      minUserLineWidth:
        PDF_MIN_STROKE_PT / Math.max(Math.abs(layout.scale), 1e-12)
    })
    const ocg = new AcPdfOcgManager(doc)
    for (const entity of entities) {
      const embeds: Promise<void>[] = []
      entity.forEachOp(op => {
        if (op.kind === 'image') {
          embeds.push(writer.embedImage(op))
        }
      })
      await Promise.all(embeds)
    }

    writer.save()
    const drawingToPage = new AcGeMatrix3d().set(
      layout.scale,
      0,
      0,
      layout.offsetX,
      0,
      layout.scale,
      0,
      layout.offsetY,
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
        formReuse: false
      })
    }
    writer.restore()
    ocg.attachToPage(page)

    return doc.save({ useObjectStreams: true })
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
  for (const entity of entities) {
    if (!entity.visible) {
      continue
    }
    const box = entity.box
    if (box.isEmpty()) {
      continue
    }
    if (
      !Number.isFinite(box.min.x) ||
      !Number.isFinite(box.min.y) ||
      !Number.isFinite(box.max.x) ||
      !Number.isFinite(box.max.y)
    ) {
      continue
    }
    boxes.push(box)
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
