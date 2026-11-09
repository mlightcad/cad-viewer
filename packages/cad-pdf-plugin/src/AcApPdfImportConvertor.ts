import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCorsorType,
  AcEdPromptDoubleOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcDbArc,
  AcDbCircle,
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
import type { PDFDocumentProxy } from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist'

import { acapPdfT } from './acapPdfI18n'
import {
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions'
import { buildPdfImportShapes } from './pdfImportShapes'
import {
  allocatePdfFallbackLayerName,
  collectPdfOcgLayers,
  normalizeCadLayerKey,
  pdfOperatorListHasOptionalContent,
  type PdfOptionalContentConfigLike
} from './pdfOptionalContent'
import {
  extractPdfImportSubpaths,
  PDF_IMPORT_FOREGROUND_COLOR,
  type PdfImportedText,
  type PdfImportOps
} from './pdfVectorImport'
import type { PdfRecognizedShape } from './recognition/pdfCurveRecognition'

/**
 * PDF.js worker shipped beside this module.
 *
 * Vite rewrites `new URL(..., import.meta.url)` and emits `pdf.worker.mjs`.
 * App builds that rebundle this package pick that file up from the package
 * `dist` and emit it into their own assets. PDF.js 5 rejects an empty
 * `workerSrc`, and a `?url` import would keep the URL from the library build
 * instead of the app chunk that actually loads it.
 */
const PDF_WORKER_URL = new URL(
  '../node_modules/pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
)
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL.href

/**
 * Converts a PDF file into CAD entities appended to the current document's
 * model space.
 */
export class AcApPdfImportConvertor {
  /**
   * Prompts the user to pick a PDF file, asks for page / insertion point /
   * scale / curve recognition, and imports vector geometry.
   *
   * Returns without database edits when the picker is dismissed. The command
   * undo mark then has no committed changes, so nothing is pushed onto the
   * undo stack.
   *
   * @param context - Application context for the target document
   */
  async importFromFilePicker(context: AcApContext): Promise<void> {
    try {
      const file = await this.pickPdfFile()
      if (!file) return

      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      try {
        // Prompts run after the file dialog so the user sees the page count.
        const prompted = await this.promptImportOptions(pdf.numPages)
        if (!prompted) return
        await this.importDocument(
          context,
          pdf,
          resolveAcApPdfImportOptions(prompted)
        )
      } finally {
        await pdf.destroy()
      }
    } finally {
      // Chrome drops an SVG data-URI cursor after the native file dialog.
      restoreViewCursor(context)
    }
  }

  /**
   * Opens the browser file picker.
   *
   * Resolves `undefined` when the user cancels the picker. `cancel` does not
   * fire for every dismiss path, so closing the dialog (window focus with no
   * selected file) also settles the promise. Otherwise `ipdf` would stay
   * inside its write transaction.
   */
  private pickPdfFile(): Promise<File | undefined> {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf,application/pdf'
      input.style.display = 'none'
      document.body.appendChild(input)

      let settled = false
      let focusFallbackTimer: number | undefined

      const finish = (file?: File) => {
        if (settled) return
        settled = true
        window.removeEventListener('focus', onWindowFocus)
        if (focusFallbackTimer !== undefined) {
          clearTimeout(focusFallbackTimer)
        }
        input.remove()
        resolve(file)
      }

      const onWindowFocus = () => {
        // `change` can arrive just after focus. Wait before treating an empty
        // selection as a cancel.
        focusFallbackTimer = window.setTimeout(() => {
          finish(input.files?.[0])
        }, 500)
      }

      input.addEventListener('change', () => finish(input.files?.[0]), {
        once: true
      })
      input.addEventListener('cancel', () => finish(), { once: true })
      input.click()

      // Attach after click so the focus event from opening the dialog is not
      // treated as a dismiss.
      window.setTimeout(() => {
        if (!settled) {
          window.addEventListener('focus', onWindowFocus)
        }
      }, 0)
    })
  }

  /**
   * Imports one PDF page into model space.
   *
   * @param context - Application context for the target document
   * @param data - PDF file bytes
   * @param pageNumberOrOptions - 1-based page number, or full import options
   */
  async convert(
    context: AcApContext,
    data: ArrayBuffer,
    pageNumberOrOptions: number | AcApPdfImportOptions = 1
  ) {
    const options = resolveAcApPdfImportOptions(
      typeof pageNumberOrOptions === 'number'
        ? { pageNumber: pageNumberOrOptions }
        : pageNumberOrOptions
    )
    const pdf = await pdfjsLib.getDocument({ data }).promise
    try {
      await this.importDocument(context, pdf, options)
    } finally {
      await pdf.destroy()
    }
  }

  private async importDocument(
    context: AcApContext,
    pdf: PDFDocumentProxy,
    options: AcApResolvedPdfImportOptions
  ) {
    await AcApDocManager.instance.withBusyIndicator(
      () => this.importPage(context, pdf, options),
      AcApI18n.t('main.message.importingPdf')
    )
  }

  /**
   * Command-line prompts: page (multi-page files only), then insertion point
   * with `Scale` and `Curves` options.
   *
   * @returns Options to import with, or `undefined` when the user cancels.
   */
  private async promptImportOptions(
    pageCount: number
  ): Promise<AcApPdfImportOptions | undefined> {
    const editor = AcApDocManager.instance.editor
    const options: AcApPdfImportOptions = {}

    if (pageCount > 1) {
      const pagePrompt = new AcEdPromptIntegerOptions(
        acapPdfT('jig.ipdf.pageNumber', { count: pageCount }),
        1,
        pageCount
      )
      pagePrompt.defaultValue = 1
      pagePrompt.useDefaultValue = true
      pagePrompt.allowNone = true
      const pageResult = await editor.getInteger(pagePrompt)
      if (pageResult.status === AcEdPromptStatus.OK) {
        options.pageNumber = pageResult.value ?? 1
      } else if (pageResult.status !== AcEdPromptStatus.None) {
        return undefined
      }
    }

    let scale = 1
    let recognizeCurves = true
    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        acapPdfT('jig.ipdf.insertionPoint', {
          scale: String(scale),
          curves: AcApI18n.t(
            recognizeCurves ? 'jig.ipdf.curvesOn' : 'jig.ipdf.curvesOff'
          )
        })
      )
      pointPrompt.allowNone = true
      pointPrompt.keywords.add(
        AcApI18n.t('jig.ipdf.keywords.scale.display'),
        AcApI18n.t('jig.ipdf.keywords.scale.global'),
        AcApI18n.t('jig.ipdf.keywords.scale.local')
      )
      pointPrompt.keywords.add(
        AcApI18n.t('jig.ipdf.keywords.curves.display'),
        AcApI18n.t('jig.ipdf.keywords.curves.global'),
        AcApI18n.t('jig.ipdf.keywords.curves.local')
      )
      const result = await editor.getPoint(pointPrompt)
      if (result.status === AcEdPromptStatus.OK && result.value) {
        options.insertionPoint = { x: result.value.x, y: result.value.y }
        break
      }
      if (result.status === AcEdPromptStatus.None) break
      if (result.status !== AcEdPromptStatus.Keyword) return undefined

      if (result.stringResult === 'Curves') {
        recognizeCurves = !recognizeCurves
        continue
      }
      if (result.stringResult === 'Scale') {
        const scalePrompt = new AcEdPromptDoubleOptions(
          AcApI18n.t('jig.ipdf.scaleFactor')
        )
        scalePrompt.defaultValue = scale
        scalePrompt.useDefaultValue = true
        scalePrompt.allowNone = true
        scalePrompt.allowNegative = false
        scalePrompt.allowZero = false
        const scaleResult = await editor.getDouble(scalePrompt)
        if (scaleResult.status === AcEdPromptStatus.OK) {
          scale = scaleResult.value ?? scale
        } else if (scaleResult.status !== AcEdPromptStatus.None) {
          return undefined
        }
      }
    }
    options.scale = scale
    options.recognizeCurves = recognizeCurves
    return options
  }

  private async importPage(
    context: AcApContext,
    pdf: PDFDocumentProxy,
    options: AcApResolvedPdfImportOptions
  ) {
    try {
      const page = await pdf.getPage(options.pageNumber)
      const viewport = page.getViewport({ scale: 1 })

      const operatorList = await page.getOperatorList()
      const optionalContentConfig = (await pdf.getOptionalContentConfig({
        intent: 'display'
      })) as PdfOptionalContentConfigLike

      const reservedLayerNames = databaseLayerNames(context)
      const ocgLayers = collectPdfOcgLayers(
        operatorList,
        pdfjsLib.OPS.beginMarkedContentProps,
        optionalContentConfig,
        reservedLayerNames
      )

      // Preserve the pre-OCG flat-import behavior for PDFs without optional
      // content. OCMD-only pages still count: their geometry uses the fallback
      // layer instead of the current drawing layer.
      const fallbackLayerName = pdfOperatorListHasOptionalContent(
        operatorList,
        pdfjsLib.OPS.beginMarkedContentProps
      )
        ? allocatePdfFallbackLayerName(
            reservedLayerNames,
            [...ocgLayers.values()].map(layer => layer.layerName)
          )
        : undefined

      const content = extractPdfImportSubpaths(
        operatorList,
        pdfjsLib.OPS as unknown as PdfImportOps,
        viewport,
        ocgLayers,
        fallbackLayerName,
        { remapContrastInk: true, paperTone: 'auto' }
      )
      const { items, stats } = buildPdfImportShapes(content, options)

      const entities: AcDbEntity[] = []
      const usedLayerNames = new Set<string>()
      for (const item of items) {
        const entity = shapeToEntity(item.shape)
        if (!entity) continue
        if (item.layerName) {
          usedLayerNames.add(item.layerName)
          entity.layer = item.layerName
        }
        applyPdfColor(entity, item.color)
        if (options.lineWeights && item.lineWidth) {
          entity.lineWeight = nearestLineWeight(item.lineWidth)
        }
        entities.push(entity)
      }
      for (const textRun of content.texts) {
        if (textRun.layerName) {
          usedLayerNames.add(textRun.layerName)
        }
        const entity = this.textToEntity(textRun, options)
        if (entity) entities.push(entity)
      }

      if (entities.length === 0) {
        log.warn('[PdfImport] No vector geometry found in PDF page.')
        return
      }

      const layerService = context.doc.layerService
      const existed =
        usedLayerNames.size > 0
          ? layerService.createLayers([...usedLayerNames]).existed
          : []
      const existedKeys = new Set(existed.map(normalizeCadLayerKey))

      for (const layerInfo of ocgLayers.values()) {
        if (!usedLayerNames.has(layerInfo.layerName)) continue
        if (existedKeys.has(normalizeCadLayerKey(layerInfo.layerName))) continue
        if (layerInfo.visible) continue
        layerService.setLayerOn(layerInfo.layerName, false)
      }

      const modelSpace = context.doc.database.tables.blockTable.modelSpace
      for (const entity of entities) {
        modelSpace.appendEntity(entity)
      }

      log.info(
        `[PdfImport] Imported ${entities.length} entities across ${usedLayerNames.size} CAD layer(s): ` +
          `${stats.line} lines, ${stats.polyline} polylines, ${stats.circle} circles, ` +
          `${stats.arc} arcs, ${stats.ellipse} ellipses, ${stats.spline} splines, ` +
          `${content.texts.length} texts; ${stats.duplicates} duplicates skipped.`
      )
    } catch (err) {
      log.error('[PdfImport] Failed to import PDF:', err)
      throw err
    }
  }

  private textToEntity(
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
    applyPdfColor(text, run.color)
    return text
  }
}

/** Creates the CAD entity for a recognized shape. */
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

function applyPdfColor(entity: AcDbEntity, color?: string) {
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

function restoreViewCursor(context: AcApContext) {
  const view = context.view
  if (!view) return
  const cursor = view.editor.currentCursor ?? AcEdCorsorType.Crosshair
  const canvas = view.canvas
  const apply = () => {
    canvas.style.cursor = 'default'
    view.editor.setCursor(cursor)
  }
  apply()
  window.requestAnimationFrame(apply)
}

function databaseLayerNames(context: AcApContext): string[] {
  return [...context.doc.database.tables.layerTable.newIterator()].map(
    layer => layer.name
  )
}
