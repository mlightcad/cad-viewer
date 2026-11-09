import {
  type AcApContext,
  AcApDocManager,
  AcApFontUtil,
  AcApI18n,
  AcEdCorsorType,
  type AcEdKeyword,
  type AcEdKeywordCollection,
  AcEdPromptDoubleOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
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
  AcDbRasterImage,
  AcDbRasterImageDef,
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
  type AcApPdfImportMode,
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions'
import { acapPdfImportResourceUrls } from './AcApPdfImportResources'
import {
  acapPdfCreateSolidHatch,
  acapPdfEnsureDashLinetype,
  acapPdfEnsureTextStyle,
  acapPdfFitWidthFactor,
  acapPdfFontFamily,
  acapPdfShapeToLoop
} from './pdfImportEntities'
import { acapPdfRasterizeImage, type PdfJsImageLike } from './pdfImportImages'
import {
  buildPdfImportShapes,
  orderPdfImportPaints,
  type PdfImportShapeItem
} from './pdfImportShapes'
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
  type PdfImportedImage,
  type PdfImportedText,
  type PdfImportOps
} from './pdfVectorImport'
import type { PdfRecognizedShape } from './recognition/pdfCurveRecognition'
import { buildPdfFormBlocks } from './recognition/pdfFormBlocks'
import { mergePdfTextRuns } from './recognition/pdfTextRunMerge'

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
 * `getDocument` parameters. CMaps and standard fonts are required for CID
 * (e.g. Chinese) fonts; without them PDF.js returns empty glyph runs.
 */
function pdfDocumentParams(data: ArrayBuffer) {
  return {
    data,
    ...acapPdfImportResourceUrls(pdfjsLib.version),
    cMapPacked: true
  }
}

/** Mode last picked at the `ipdf` prompt; reused as the next default. */
let lastImportMode: AcApPdfImportMode = 'recover'

/** i18n key of the prompt label for `mode`. */
function importModeLabelKey(mode: AcApPdfImportMode) {
  return mode === 'visual' ? 'jig.ipdf.modeVisual' : 'jig.ipdf.modeRecover'
}

/** Adds the `jig.ipdf.keywords.<name>` keyword to `keywords`. */
function addIpdfKeyword(
  keywords: AcEdKeywordCollection,
  name: 'scale' | 'mode' | 'recover' | 'visual'
): AcEdKeyword {
  const base = `jig.ipdf.keywords.${name}`
  return keywords.add(
    AcApI18n.t(`${base}.display`),
    AcApI18n.t(`${base}.global`),
    AcApI18n.t(`${base}.local`)
  )
}

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
      const pdf = await pdfjsLib.getDocument(pdfDocumentParams(buffer)).promise
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
    const pdf = await pdfjsLib.getDocument(pdfDocumentParams(data)).promise
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
   * with `Scale` and `Mode` (recover the drawing / keep the PDF look)
   * options.
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
    let mode = lastImportMode
    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        acapPdfT('jig.ipdf.insertionPoint', {
          scale: String(scale),
          mode: AcApI18n.t(importModeLabelKey(mode))
        })
      )
      pointPrompt.allowNone = true
      addIpdfKeyword(pointPrompt.keywords, 'scale')
      addIpdfKeyword(pointPrompt.keywords, 'mode')
      const result = await editor.getPoint(pointPrompt)
      if (result.status === AcEdPromptStatus.OK && result.value) {
        options.insertionPoint = { x: result.value.x, y: result.value.y }
        break
      }
      if (result.status === AcEdPromptStatus.None) break
      if (result.status !== AcEdPromptStatus.Keyword) return undefined

      if (result.stringResult === 'Mode') {
        const picked = await this.promptImportMode(mode)
        if (!picked) return undefined
        mode = picked
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
    options.mode = mode
    lastImportMode = mode
    return options
  }

  /**
   * Asks for the import mode; Enter keeps `current`.
   *
   * @returns The chosen mode, or `undefined` when the user cancels.
   */
  private async promptImportMode(
    current: AcApPdfImportMode
  ): Promise<AcApPdfImportMode | undefined> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.ipdf.modePrompt')
    )
    prompt.allowNone = true
    const recover = addIpdfKeyword(prompt.keywords, 'recover')
    const visual = addIpdfKeyword(prompt.keywords, 'visual')
    prompt.keywords.default = current === 'visual' ? visual : recover
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.None) return current
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return undefined
    }
    if (result.stringResult === 'Visual') return 'visual'
    if (result.stringResult === 'Recover') return 'recover'
    return current
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

      const db = context.doc.database
      const usedLayerNames = new Set<string>()
      const createEntity = (item: PdfImportShapeItem) => {
        const entity = shapeToEntity(item.shape)
        if (!entity) return null
        if (item.layerName) {
          usedLayerNames.add(item.layerName)
          entity.layer = item.layerName
        }
        applyPdfColor(entity, item.color)
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
      let hatchCount = 0
      for (const paint of orderPdfImportPaints(items, options.fillHatches)) {
        if (paint.kind === 'shape') {
          const entity = createEntity(paint.item)
          if (entity) entities.push(entity)
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
        applyPdfColor(hatch, first.fillColor ?? first.color)
        entities.push(hatch)
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
        const name = uniqueBlockName(context, PDF_FORM_BLOCK_PREFIX)
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
      // PDF fonts become PDF_<family> text styles (font names come from the
      // fonts PDF.js loaded for this page).
      const styleByFont = new Map<string, string | undefined>()
      const styleFor = (fontId?: string) => {
        if (!options.textStyles || fontId === undefined) return undefined
        if (!styleByFont.has(fontId)) {
          const name = pdfFontName(page, fontId)
          styleByFont.set(
            fontId,
            name
              ? acapPdfEnsureTextStyle(db, acapPdfFontFamily(name))
              : undefined
          )
        }
        return styleByFont.get(fontId)
      }
      const textEntities: { entity: AcDbText; run: PdfImportedText }[] = []
      for (const textRun of texts) {
        if (textRun.layerName) {
          usedLayerNames.add(textRun.layerName)
        }
        const entity = this.textToEntity(textRun, options)
        if (!entity) continue
        const style = styleFor(textRun.fontId)
        if (style) entity.styleName = style
        textEntities.push({ entity, run: textRun })
        entities.push(entity)
      }
      if (options.fitTextWidth) {
        await fitTextWidths(db, textEntities, options.scale)
      }

      // Images go first so linework and text draw on top of them.
      const imageEntities =
        options.images && content.images
          ? await createImageEntities(page, db, content.images, options)
          : []
      for (const image of imageEntities) {
        if (image.layer && image.layer !== '0') usedLayerNames.add(image.layer)
      }
      entities.unshift(...imageEntities)

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
          `mode ${options.mode}, ${texts.length} texts, ${imageEntities.length} images, ${hatchCount} hatches, ${formBlocks.blocks.length} blocks ` +
          `(${referenceCount} references); ${stats.duplicates} duplicates skipped.`
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

/** File name prefix of image definitions created for PDF images. */
const PDF_IMAGE_PREFIX = 'PDF_IMAGE_'

/** How long to wait for PDF.js to deliver one decoded image. */
const PDF_IMAGE_TIMEOUT_MS = 10000

/**
 * Turns PDF image paints into raster images. Each image is redrawn upright
 * with its rotation / mirroring baked in; the PNG is kept in memory on the
 * entity (`AcDbRasterImage.image`) and its definition is named
 * `PDF_IMAGE_<n>.png`.
 */
async function createImageEntities(
  page: PdfPageObjects,
  db: AcDbDatabase,
  images: PdfImportedImage[],
  options: AcApResolvedPdfImportOptions
): Promise<AcDbRasterImage[]> {
  const { scale, insertionPoint } = options
  const decoded = new Map<string, Promise<PdfJsImageLike | undefined>>()
  const result: AcDbRasterImage[] = []
  for (const paint of images) {
    let image: PdfJsImageLike | undefined
    if (paint.objId) {
      let pending = decoded.get(paint.objId)
      if (!pending) {
        pending = pdfImageObject(page, paint.objId)
        decoded.set(paint.objId, pending)
      }
      image = await pending
    } else {
      image = paint.inline as PdfJsImageLike | undefined
    }
    if (!image) continue

    const { a, b, c, d, e, f } = paint.toCad
    let raster
    try {
      raster = await acapPdfRasterizeImage(image, {
        a: a * scale,
        b: b * scale,
        c: c * scale,
        d: d * scale,
        e: insertionPoint.x + e * scale,
        f: insertionPoint.y + f * scale
      })
    } catch (err) {
      log.warn('[PdfImport] Skipped an image that could not be drawn:', err)
      continue
    }
    if (!raster) continue

    const fileName = uniqueImageFileName(db)
    const imageDef = new AcDbRasterImageDef()
    imageDef.sourceFileName = fileName
    imageDef.imageSize = new AcGePoint2d(raster.pixelWidth, raster.pixelHeight)
    imageDef.isLoaded = true
    db.objects.imageDefinition.setAt(fileName, imageDef)

    const entity = new AcDbRasterImage()
    entity.position = new AcGePoint3d(raster.box.x, raster.box.y, 0)
    entity.width = raster.box.width
    entity.height = raster.box.height
    entity.imageSize = new AcGePoint2d(raster.pixelWidth, raster.pixelHeight)
    entity.image = raster.png
    entity.imageDefId = imageDef.objectId
    if (paint.layerName) entity.layer = paint.layerName
    result.push(entity)
  }
  return result
}

/** The parts of a PDF.js page that hold decoded images. */
interface PdfPageObjects {
  objs: PdfObjectStore
  commonObjs: PdfObjectStore
}

interface PdfObjectStore {
  get(objId: string, callback: (data: unknown) => void): unknown
}

/** Waits for PDF.js to deliver a decoded image object. */
function pdfImageObject(
  page: PdfPageObjects,
  objId: string
): Promise<PdfJsImageLike | undefined> {
  const store = objId.startsWith('g_') ? page.commonObjs : page.objs
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      log.warn(`[PdfImport] Timed out waiting for image ${objId}.`)
      resolve(undefined)
    }, PDF_IMAGE_TIMEOUT_MS)
    try {
      store.get(objId, data => {
        clearTimeout(timer)
        resolve((data ?? undefined) as PdfJsImageLike | undefined)
      })
    } catch (err) {
      clearTimeout(timer)
      log.warn(`[PdfImport] Image ${objId} is not available:`, err)
      resolve(undefined)
    }
  })
}

/** First `PDF_IMAGE_<n>.png` not used by an image definition. */
function uniqueImageFileName(db: AcDbDatabase) {
  let index = 1
  while (db.objects.imageDefinition.has(`${PDF_IMAGE_PREFIX}${index}.png`)) {
    index++
  }
  return `${PDF_IMAGE_PREFIX}${index}.png`
}

/**
 * Sets each text's width factor so it spans its PDF advance width in the
 * font the viewer will actually draw it with (usually a substitute for the
 * PDF font). Texts whose glyphs cannot be measured keep the PDF factor.
 */
async function fitTextWidths(
  db: AcDbDatabase,
  texts: { entity: AcDbText; run: PdfImportedText }[],
  scale: number
) {
  const styleTable = db.tables.textStyleTable
  const fontsOf = (entity: AcDbText) => {
    const style = styleTable.resolveAt(entity.styleName || db.textstyle)
    return {
      font: style?.textStyle.font ?? '',
      bigFont: style?.textStyle.bigFont ?? ''
    }
  }
  const fontNames = new Set<string>()
  for (const { entity } of texts) {
    const { font, bigFont } = fontsOf(entity)
    if (font) fontNames.add(font)
    if (bigFont) fontNames.add(bigFont)
  }
  try {
    await AcApFontUtil.prepareTextMeasurement([...fontNames])
  } catch (err) {
    // Without fonts there is nothing to measure against; keep PDF factors.
    log.warn('[PdfImport] Could not load fonts to fit text widths:', err)
    return
  }
  for (const { entity, run } of texts) {
    if (run.width === undefined) continue
    const { font, bigFont } = fontsOf(entity)
    const natural = AcApFontUtil.measureTextWidth(
      entity.textString,
      font,
      entity.height,
      bigFont
    )
    entity.widthFactor = acapPdfFitWidthFactor(
      entity.widthFactor,
      run.width * scale,
      natural
    )
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

/** PDF font name for a `setFont` resource id, when PDF.js loaded it. */
function pdfFontName(
  page: { commonObjs: { has(id: string): boolean; get(id: string): unknown } },
  fontId: string
): string | undefined {
  try {
    if (!page.commonObjs.has(fontId)) return undefined
    const font = page.commonObjs.get(fontId) as { name?: unknown } | undefined
    return typeof font?.name === 'string' && font.name ? font.name : undefined
  } catch {
    return undefined
  }
}

/** Name prefix for blocks recovered from repeated Form XObjects. */
const PDF_FORM_BLOCK_PREFIX = 'PDF_FORM_'

/** First `<prefix><n>` block name not used in the drawing. */
function uniqueBlockName(context: AcApContext, prefix: string) {
  const blockTable = context.doc.database.tables.blockTable
  let index = 1
  while (blockTable.has(`${prefix}${index}`)) index++
  return `${prefix}${index}`
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
