import {
  type AcApContext,
  AcApDocManager,
  AcApFontUtil,
  AcApI18n,
  AcApTextRecognitionService,
  type AcApTextRecognizerInfo,
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
  type AcDbDatabase,
  type AcDbEntity,
  AcDbRasterImage,
  AcDbRasterImageDef,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  log
} from '@mlightcad/data-model'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist'

import { acapPdfT } from './acapPdfI18n.js'
import {
  type AcApPdfExplodedTextMode,
  acapPdfExplodedTextModeIsOcr,
  acapPdfExplodedTextOcrId,
  type AcApPdfImportMode,
  type AcApPdfImportOptions,
  type AcApResolvedPdfImportOptions,
  resolveAcApPdfImportOptions
} from './AcApPdfImportOptions.js'
import { acapPdfImportResourceUrls } from './AcApPdfImportResources.js'
import { AcApPdfTextCmd } from './AcApPdfTextCmd.js'
import { acapPdfAppendEntities } from './pdfImportAppend.js'
import { acapPdfRecognizeImportDimensions } from './pdfImportDimensions.js'
import {
  acapPdfEnsureTextStyle,
  acapPdfFitWidthFactor,
  acapPdfFontFamily
} from './pdfImportEntities.js'
import { acapPdfRecognizeImportExplodedText } from './pdfImportExplodedText.js'
import {
  acapPdfRasterizeImage,
  type PdfJsImageLike
} from './pdfImportImages.js'
import { acapPdfBuildPageEntities } from './pdfImportPageEntities.js'
import {
  allocatePdfFallbackLayerName,
  collectPdfOcgLayers,
  normalizeCadLayerKey,
  pdfOperatorListHasOptionalContent,
  type PdfOptionalContentConfigLike
} from './pdfOptionalContent.js'
import { acapPdfEmHeightToTextHeight } from './pdfTextHeight.js'
import { acapPdfRemoveTextOutlineTwins } from './pdfTextStrokeCoverage.js'
import {
  extractPdfImportSubpaths,
  type PdfImportedImage,
  type PdfImportedText,
  type PdfImportOps,
  type PdfImportPoint
} from './pdfVectorImport.js'
import {
  AcUiPdfImportDialog,
  type AcUiPdfImportDialogValues,
  type AcUiPdfImportDocument,
  type AcUiPdfImportSource
} from './ui/AcUiPdfImportDialog.js'

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

/** Mode last picked at the `-pdfimport` prompt; reused as the next default. */
let lastImportMode: AcApPdfImportMode = 'recover'

/** Exploded-text mode last picked at the `-pdfimport` prompt. */
let lastImportExplodedText: AcApPdfExplodedTextMode = 'local'

/** i18n key of the prompt label for `mode`. */
function importModeLabelKey(mode: AcApPdfImportMode) {
  return mode === 'visual'
    ? 'jig.pdfimport.modeVisual'
    : 'jig.pdfimport.modeRecover'
}

/** Prompt label for the current exploded-text mode. */
function importTextLabel(
  mode: AcApPdfExplodedTextMode,
  providers: AcApTextRecognizerInfo[]
): string {
  if (mode === 'local') return AcApI18n.t('jig.pdfimport.textLocal')
  if (mode === false) return AcApI18n.t('jig.pdfimport.textOff')
  const id = acapPdfExplodedTextOcrId(mode)
  const provider = providers.find(entry => entry.id === id)
  return provider?.label ?? AcApI18n.t('jig.pdfimport.textOcr')
}

/** Adds the `jig.pdfimport.keywords.<name>` keyword to `keywords`. */
function addPdfImportKeyword(
  keywords: AcEdKeywordCollection,
  name: 'scale' | 'mode' | 'text' | 'recover' | 'visual' | 'off' | 'local'
): AcEdKeyword {
  const base = `jig.pdfimport.keywords.${name}`
  return keywords.add(
    AcApI18n.t(`${base}.display`),
    AcApI18n.t(`${base}.global`),
    AcApI18n.t(`${base}.local`)
  )
}

/**
 * Values last confirmed in the Import PDF dialog; the next `pdfimport` starts
 * from them (page number excepted, as the next file differs).
 */
let lastDialogValues: Partial<AcUiPdfImportDialogValues> = {}

/** Adapts a pdf.js document to what {@link AcUiPdfImportDialog} draws. */
function pdfDialogDocument(pdf: PDFDocumentProxy): AcUiPdfImportDocument {
  return {
    numPages: pdf.numPages,
    getPage: async pageNumber => {
      const page = await pdf.getPage(pageNumber)
      return {
        getSize: scale => {
          const viewport = page.getViewport({ scale })
          return { width: viewport.width, height: viewport.height }
        },
        render: (canvas, scale) => {
          const task = page.render({
            canvas,
            viewport: page.getViewport({ scale })
          })
          return { promise: task.promise, cancel: () => task.cancel() }
        }
      }
    }
  }
}

/**
 * Converts a PDF file into CAD entities appended to the current document's
 * model space.
 */
export class AcApPdfImportConvertor {
  /**
   * Prompts the user to pick a PDF file, shows the Import PDF dialog (page,
   * insertion point, scale, import mode) and imports vector geometry
   * (`pdfimport`).
   *
   * Returns without database edits when the picker or the dialog is
   * dismissed. The command undo mark then has no committed changes, so
   * nothing is pushed onto the undo stack.
   *
   * @param context - Application context for the target document
   */
  async importFromFilePicker(context: AcApContext): Promise<void> {
    const loaded = new Set<PDFDocumentProxy>()
    const load = async (): Promise<
      (AcUiPdfImportSource & { pdf: PDFDocumentProxy }) | undefined
    > => {
      const file = await this.pickPdfFile()
      if (!file) return undefined
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument(pdfDocumentParams(buffer)).promise
      loaded.add(pdf)
      return { pdf, document: pdfDialogDocument(pdf), fileName: file.name }
    }
    try {
      const first = await load()
      // Chrome drops an SVG data-URI cursor after the native file dialog.
      restoreViewCursor(context)
      if (!first) return
      const pdfBySource = new Map<AcUiPdfImportSource, PDFDocumentProxy>()
      pdfBySource.set(first, first.pdf)

      const ocrProviders = await AcApTextRecognitionService.listAvailable()
      const result = await AcUiPdfImportDialog.open({
        host: context.view?.container ?? document.body,
        source: first,
        initial: lastDialogValues,
        ocrProviders,
        browse: async () => {
          try {
            const next = await load()
            if (next) pdfBySource.set(next, next.pdf)
            return next
          } catch (error) {
            log.warn('[pdfimport] Failed to open PDF:', error)
            return undefined
          } finally {
            restoreViewCursor(context)
          }
        }
      })
      if (!result) return
      const { source, ...values } = result
      lastDialogValues = { ...values, pageNumber: undefined }
      const pdf = pdfBySource.get(source)
      if (!pdf) return

      let insertionPoint = values.insertionPoint
      if (values.specifyOnScreen) {
        const picked = await this.promptInsertionPoint()
        if (!picked) return
        insertionPoint = picked
      }
      await this.importDocument(
        context,
        pdf,
        resolveAcApPdfImportOptions({
          mode: values.mode,
          pageNumber: values.pageNumber,
          scale: values.scale,
          insertionPoint,
          ...(values.mode === 'recover'
            ? {
                recognizeDimensions: values.recognizeDimensions,
                recognizeExplodedText: values.recognizeExplodedText
              }
            : {})
        })
      )
    } finally {
      await Promise.all([...loaded].map(pdf => pdf.destroy()))
      restoreViewCursor(context)
    }
  }

  /**
   * Prompts the user to pick a PDF file, asks for page / insertion point /
   * scale / mode on the command line, and imports vector geometry
   * (`-pdfimport`).
   *
   * Returns without database edits when the picker is dismissed. The command
   * undo mark then has no committed changes, so nothing is pushed onto the
   * undo stack.
   *
   * @param context - Application context for the target document
   */
  async importFromCommandLine(context: AcApContext): Promise<void> {
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
   * selected file) also settles the promise. Otherwise `pdfimport` would stay
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
        acapPdfT('jig.pdfimport.pageNumber', { count: pageCount }),
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
    const ocrProviders = await AcApTextRecognitionService.listAvailable()
    let explodedText =
      mode === 'visual'
        ? (false as AcApPdfExplodedTextMode)
        : lastImportExplodedText
    if (acapPdfExplodedTextModeIsOcr(explodedText)) {
      const ocrId = explodedText.ocr
      if (!ocrProviders.some(provider => provider.id === ocrId)) {
        explodedText = ocrProviders[0] ? { ocr: ocrProviders[0].id } : 'local'
      }
    }
    while (true) {
      const pointPrompt = new AcEdPromptPointOptions(
        acapPdfT('jig.pdfimport.insertionPoint', {
          scale: String(scale),
          mode: AcApI18n.t(importModeLabelKey(mode)),
          text: importTextLabel(explodedText, ocrProviders)
        })
      )
      pointPrompt.allowNone = true
      addPdfImportKeyword(pointPrompt.keywords, 'scale')
      addPdfImportKeyword(pointPrompt.keywords, 'mode')
      if (mode === 'recover') {
        addPdfImportKeyword(pointPrompt.keywords, 'text')
      }
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
        if (mode === 'visual') explodedText = false
        else if (explodedText === false)
          explodedText = lastImportExplodedText || 'local'
        continue
      }
      if (result.stringResult === 'Text') {
        const picked = await this.promptExplodedTextMode(
          explodedText,
          ocrProviders
        )
        if (picked === undefined) return undefined
        explodedText = picked
        continue
      }
      if (result.stringResult === 'Scale') {
        const scalePrompt = new AcEdPromptDoubleOptions(
          AcApI18n.t('jig.pdfimport.scaleFactor')
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
    if (mode === 'recover') options.recognizeExplodedText = explodedText
    lastImportMode = mode
    if (explodedText !== false) lastImportExplodedText = explodedText
    return options
  }

  /**
   * Asks for exploded-text recognition; Enter keeps `current`.
   *
   * @returns The chosen mode, or `undefined` when the user cancels.
   */
  private async promptExplodedTextMode(
    current: AcApPdfExplodedTextMode,
    providers: AcApTextRecognizerInfo[]
  ): Promise<AcApPdfExplodedTextMode | undefined> {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.pdfimport.textPrompt')
    )
    prompt.allowNone = true
    const off = addPdfImportKeyword(prompt.keywords, 'off')
    const local = addPdfImportKeyword(prompt.keywords, 'local')
    const ocrByGlobal = new Map<string, string>()
    const ocrKeywordById = new Map<string, AcEdKeyword>()
    for (const provider of providers) {
      const keyword = provider.keyword ?? {
        display: provider.label,
        local: provider.label,
        global: provider.id
      }
      const added = prompt.keywords.add(
        keyword.display,
        keyword.global,
        keyword.local
      )
      ocrByGlobal.set(keyword.global.toLowerCase(), provider.id)
      ocrKeywordById.set(provider.id, added)
    }
    const currentOcrId = acapPdfExplodedTextOcrId(current)
    prompt.keywords.default =
      (currentOcrId && ocrKeywordById.get(currentOcrId)) ||
      (current === false ? off : local)
    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.None) return current
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return undefined
    }
    const picked = result.stringResult ?? ''
    if (picked === 'Off') return false
    if (picked === 'Local') return 'local'
    const ocrId = ocrByGlobal.get(picked.toLowerCase())
    if (ocrId) return { ocr: ocrId }
    return current
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
      AcApI18n.t('jig.pdfimport.modePrompt')
    )
    prompt.allowNone = true
    const recover = addPdfImportKeyword(prompt.keywords, 'recover')
    const visual = addPdfImportKeyword(prompt.keywords, 'visual')
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

  /**
   * Asks for the insertion point in the drawing. Enter takes the origin.
   *
   * @returns The point, or `undefined` when the user cancels.
   */
  private async promptInsertionPoint(): Promise<
    { x: number; y: number } | undefined
  > {
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.pdfimport.pickInsertionPoint')
    )
    prompt.allowNone = true
    const result = await AcApDocManager.instance.editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.OK && result.value) {
      return { x: result.value.x, y: result.value.y }
    }
    if (result.status === AcEdPromptStatus.None) return { x: 0, y: 0 }
    return undefined
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
      const db = context.doc.database
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
      const built = acapPdfBuildPageEntities(db, content, options, styleFor)
      const { textEntities, usedLayerNames, stats } = built
      let entities = built.entities
      // Capital-A height is independent of width fitting (fitTextWidth may be off).
      await applyImportedMeshTextHeights(db, textEntities)
      if (options.fitTextWidth) {
        await fitTextWidths(db, textEntities, options.scale)
      }

      // Searchable PDF text often ships with stroked/filled glyph twins.
      // Drop those outlines once the TEXT entities exist (independent of
      // exploded-text OCR, which only sees remaining strokes). Also prunes
      // fillOutlines so twin contours are not re-fed to dim/exploded passes.
      const beforeTwins = entities.length
      entities = acapPdfRemoveTextOutlineTwins(
        entities,
        built.fillOutlines,
        built.fillStrokeCompanions
      )
      const twinStrokes = beforeTwins - entities.length

      // Exploded SHX / outline text becomes TEXT before dimensions, so dim
      // values can read real text as well as remaining strokes.
      let explodedTextCount = 0
      let explodedTextStrokes = 0
      if (options.recognizeExplodedText) {
        const recovered = await acapPdfRecognizeImportExplodedText(
          db,
          entities,
          AcApPdfTextCmd.glyphDictionary,
          {
            mode: options.recognizeExplodedText,
            onOcrUnavailable: () => {
              AcApDocManager.instance.editor.showMessage(
                AcApI18n.t('jig.pdftext.ocrNotConfigured'),
                'warning'
              )
            },
            onOcrError: message => {
              AcApDocManager.instance.editor.showMessage(
                acapPdfT('jig.pdftext.ocrFailed', { message }),
                'error'
              )
            }
          },
          built.fillOutlines,
          built.fillStrokeCompanions
        )
        entities = recovered.entities
        explodedTextCount = recovered.converted
        explodedTextStrokes = recovered.replaced
      }
      if (twinStrokes > 0) {
        explodedTextStrokes += twinStrokes
      }

      // Exploded dimensions become dimension entities. Text widths are
      // fitted first so value texts have their final extents.
      let dimensionCount = 0
      let dimensionStrokes = 0
      if (options.recognizeDimensions) {
        const recovered = acapPdfRecognizeImportDimensions(
          db,
          entities,
          AcApPdfTextCmd.glyphDictionary,
          options.dimensionRecognition,
          built.fillOutlines
        )
        entities = recovered.entities
        dimensionCount = recovered.dimensions.length
        dimensionStrokes = recovered.replaced
        for (const { entity } of recovered.dimensions) {
          if (entity.layer && entity.layer !== '0') {
            usedLayerNames.add(entity.layer)
          }
        }
      }

      // Images go first so linework and text draw on top of them.
      const imageEntities =
        options.images && content.images
          ? await createImageEntities(
              page,
              db,
              content.images,
              content.clipPaths,
              options
            )
          : []
      for (const image of imageEntities) {
        if (image.layer && image.layer !== '0') usedLayerNames.add(image.layer)
      }
      // Not `unshift(...)`: spreading a large array overflows the stack.
      const ordered: AcDbEntity[] =
        imageEntities.length > 0
          ? (imageEntities as AcDbEntity[]).concat(entities)
          : entities

      if (ordered.length === 0) {
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

      acapPdfAppendEntities(
        context.doc.database.tables.blockTable.modelSpace,
        ordered
      )

      log.info(
        `[PdfImport] Imported ${ordered.length} entities across ${usedLayerNames.size} CAD layer(s): ` +
          `${stats.shapes.line} lines, ${stats.shapes.polyline} polylines, ${stats.shapes.circle} circles, ` +
          `${stats.shapes.arc} arcs, ${stats.shapes.ellipse} ellipses, ${stats.shapes.spline} splines, ` +
          `mode ${options.mode}, ${stats.texts} texts, ${explodedTextCount} exploded texts ` +
          `(${explodedTextStrokes} strokes), ${imageEntities.length} images, ${stats.hatches} hatches, ` +
          `${stats.patternHatches} pattern hatches (${stats.patternHatchStrokes} strokes), ${stats.blocks} blocks ` +
          `(${stats.references} references), ${dimensionCount} dimensions (${dimensionStrokes} shapes); ` +
          `${stats.shapes.duplicates} duplicates skipped.`
      )
    } catch (err) {
      log.error('[PdfImport] Failed to import PDF:', err)
      throw err
    }
  }
}

/** File name prefix of image definitions created for PDF images. */
const PDF_IMAGE_PREFIX = 'PDF_IMAGE_'

/** How long to wait for PDF.js to deliver one decoded image. */
const PDF_IMAGE_TIMEOUT_MS = 10000

function importedTextFontsOf(
  db: AcDbDatabase,
  entity: AcDbText
): { font: string; bigFont: string } {
  const style = db.tables.textStyleTable.resolveAt(
    entity.styleName || db.textstyle
  )
  return {
    font: style?.textStyle.font ?? '',
    bigFont: style?.textStyle.bigFont ?? ''
  }
}

/**
 * PDF `fontSize` is the em square; CAD TrueType height is capital-A. Convert
 * mesh-style text before width fitting (and even when fitTextWidth is off).
 */
async function applyImportedMeshTextHeights(
  db: AcDbDatabase,
  texts: { entity: AcDbText; run: PdfImportedText }[]
) {
  const fontNames = new Set<string>()
  for (const { entity } of texts) {
    const { font, bigFont } = importedTextFontsOf(db, entity)
    if (font) fontNames.add(font)
    if (bigFont) fontNames.add(bigFont)
  }
  try {
    await AcApFontUtil.prepareTextMeasurement([...fontNames])
  } catch (err) {
    // Catalog / already-loaded scale factors still apply when prepare fails.
    log.warn('[PdfImport] Could not load fonts for text heights:', err)
  }
  for (const { entity } of texts) {
    const { font } = importedTextFontsOf(db, entity)
    const mesh =
      (AcApFontUtil.getFontType(font) ??
        AcApFontUtil.getCatalogFontType(font)) === 'mesh'
    if (!mesh) continue
    entity.height = acapPdfEmHeightToTextHeight(
      entity.height,
      AcApFontUtil.getFontScaleFactor(font)
    )
  }
}

/**
 * Fits imported PDF text width factor to the PDF advance in the substitute
 * font. Texts whose glyphs cannot be measured keep the PDF width factor.
 * Call after {@link applyImportedMeshTextHeights} so height is capital-A.
 */
async function fitTextWidths(
  db: AcDbDatabase,
  texts: { entity: AcDbText; run: PdfImportedText }[],
  scale: number
) {
  const fontNames = new Set<string>()
  for (const { entity } of texts) {
    const { font, bigFont } = importedTextFontsOf(db, entity)
    if (font) fontNames.add(font)
    if (bigFont) fontNames.add(bigFont)
  }
  try {
    await AcApFontUtil.prepareTextMeasurement([...fontNames])
  } catch (err) {
    log.warn('[PdfImport] Could not load fonts to fit text widths:', err)
    return
  }
  for (const { entity, run } of texts) {
    if (run.width === undefined) continue
    const { font, bigFont } = importedTextFontsOf(db, entity)
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
  clipPaths: PdfImportPoint[][][] | undefined,
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
    const clipLoops =
      paint.clipPath !== undefined ? clipPaths?.[paint.clipPath] : undefined
    let raster
    try {
      raster = await acapPdfRasterizeImage(
        image,
        {
          a: a * scale,
          b: b * scale,
          c: c * scale,
          d: d * scale,
          e: insertionPoint.x + e * scale,
          f: insertionPoint.y + f * scale
        },
        clipLoops?.map(loop =>
          loop.map(p => ({
            x: insertionPoint.x + p.x * scale,
            y: insertionPoint.y + p.y * scale
          }))
        )
      )
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

/** Creates the CAD entity for a recognized shape. */

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
