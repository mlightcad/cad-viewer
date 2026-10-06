import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCorsorType
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  log
} from '@mlightcad/data-model'
import * as pdfjsLib from 'pdfjs-dist'

import {
  allocatePdfFallbackLayerName,
  collectPdfOcgLayers,
  normalizeCadLayerKey,
  pdfOperatorListHasOptionalContent,
  type PdfOptionalContentConfigLike
} from './pdfOptionalContent'
import {
  extractPdfImportSubpaths,
  type PdfImportedText,
  type PdfImportOps,
  type PdfImportPoint
} from './pdfVectorImport'

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

type PdfVectorEntity = AcDbPolyline | AcDbLine | AcDbText

/**
 * Converts a PDF file into CAD entities appended to the current document's
 * model space.
 */
export class AcApPdfImportConvertor {
  /**
   * Prompts the user to pick a PDF file and imports vector geometry.
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
      await this.convert(context, buffer)
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

  async convert(context: AcApContext, data: ArrayBuffer, pageNumber = 1) {
    await AcApDocManager.instance.withBusyIndicator(
      () => this.importPage(context, data, pageNumber),
      AcApI18n.t('main.message.importingPdf')
    )
  }

  private async importPage(
    context: AcApContext,
    data: ArrayBuffer,
    pageNumber: number
  ) {
    try {
      const pdf = await pdfjsLib.getDocument({ data }).promise
      const page = await pdf.getPage(pageNumber)
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

      const { subpaths, texts } = extractPdfImportSubpaths(
        operatorList,
        pdfjsLib.OPS as unknown as PdfImportOps,
        viewport,
        ocgLayers,
        fallbackLayerName
      )
      const entities: PdfVectorEntity[] = []
      const usedLayerNames = new Set<string>()
      for (const subpath of subpaths) {
        if (subpath.layerName) {
          usedLayerNames.add(subpath.layerName)
        }
        const entity = this.subpathToEntity(
          subpath.points,
          subpath.layerName,
          subpath.color
        )
        if (entity) entities.push(entity)
      }
      for (const textRun of texts) {
        if (textRun.layerName) {
          usedLayerNames.add(textRun.layerName)
        }
        const entity = this.textToEntity(textRun)
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
        `[PdfImport] Imported ${entities.length} entities across ${usedLayerNames.size} CAD layer(s).`
      )
    } catch (err) {
      log.error('[PdfImport] Failed to import PDF:', err)
      throw err
    }
  }

  private subpathToEntity(
    pts: PdfImportPoint[],
    layerName?: string,
    color?: string
  ): PdfVectorEntity | null {
    if (pts.length < 2) return null

    if (pts.length === 2) {
      const line = new AcDbLine(
        new AcGePoint3d(pts[0].x, pts[0].y, 0),
        new AcGePoint3d(pts[1].x, pts[1].y, 0)
      )
      if (layerName) {
        line.layer = layerName
      }
      applyPdfColor(line, color)
      return line
    }

    const poly = new AcDbPolyline()
    if (layerName) {
      poly.layer = layerName
    }
    applyPdfColor(poly, color)

    for (let i = 0; i < pts.length; i++) {
      poly.addVertexAt(i, new AcGePoint2d(pts[i].x, pts[i].y))
    }

    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y

    if (Math.sqrt(dx * dx + dy * dy) < 1e-6) {
      poly.closed = true
    }

    return poly
  }

  private textToEntity(run: PdfImportedText): AcDbText | null {
    if (!run.text || run.height <= 0) return null

    const text = new AcDbText()
    text.textString = run.text
    text.position = new AcGePoint3d(run.position.x, run.position.y, 0)
    text.height = run.height
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

function applyPdfColor(entity: AcDbEntity, color?: string) {
  if (!color) return
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
