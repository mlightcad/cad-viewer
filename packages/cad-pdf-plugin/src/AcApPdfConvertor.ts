import { acexPdfExportDatabase, type AcExPdfFitBox } from '@mlightcad/cad-pdf-core'
import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcApSettingManager,
  type AcEdBaseView,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'

import {
  type AcApPdfExportOptions,
  resolveAcApPdfExportOptions
} from './AcApPdfExportOptions'
import { resolveViewerTextFont } from './AcApPdfFontResolver'

/**
 * Converts the current CAD drawing to a vector PDF and downloads it.
 *
 * Rendering is delegated to `@mlightcad/cad-pdf-core` (shared with the
 * headless `cad-pdf-exporter`); this class only supplies viewer services —
 * the live view box for `'display'` framing, the viewer font mapping and
 * catalog-backed font embedding — and triggers the browser download.
 *
 * When {@link AcApPdfExportOptions.exportLayouts} is true, every layout becomes
 * one PDF page. {@link AcApPdfExportOptions.colorMode} `'monochrome'` exports
 * black content on white paper. A busy indicator is shown for the duration.
 */
export class AcApPdfConvertor {
  /**
   * Renders the current drawing to PDF and triggers a browser download.
   *
   * @param context - Active document context
   * @param options - Export framing, layout, text and colour options
   */
  async convert(context: AcApContext, options: AcApPdfExportOptions = {}) {
    const resolved = resolveAcApPdfExportOptions(options)

    await AcApDocManager.instance.withBusyIndicator(async () => {
      const db = context.doc.database
      const bytes = await acexPdfExportDatabase(db, {
        ...resolved,
        title: context.doc.fileName || context.doc.docTitle,
        fontMapping: AcApSettingManager.instance.fontMapping,
        displayBox:
          resolved.modelSpaceFit === 'display'
            ? this.captureFitBox(context.view)
            : undefined,
        textFontResolver: resolveViewerTextFont
      })
      const downloadName = resolveExportDownloadName(
        context.doc.fileName || context.doc.docTitle,
        'pdf'
      )
      this.downloadBytes(bytes, downloadName)
    }, AcApI18n.t('main.message.exportingPdf'))
  }

  /**
   * Captures the visible world box from the active view’s screen corners.
   */
  private captureFitBox(view: AcEdBaseView): AcExPdfFitBox {
    const topLeft = view.screenToWorld({ x: 0, y: 0 })
    const bottomRight = view.screenToWorld({
      x: view.width,
      y: view.height
    })
    return {
      min: {
        x: Math.min(topLeft.x, bottomRight.x),
        y: Math.min(topLeft.y, bottomRight.y)
      },
      max: {
        x: Math.max(topLeft.x, bottomRight.x),
        y: Math.max(topLeft.y, bottomRight.y)
      }
    }
  }

  private downloadBytes(bytes: Uint8Array, downloadName: string) {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName || 'drawing.pdf'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
