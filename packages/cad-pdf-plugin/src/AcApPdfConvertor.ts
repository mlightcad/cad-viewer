import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcApSettingManager,
  type AcEdBaseView,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'
import {
  type AcPdfExportOptions,
  exportDatabaseToPdf
} from '@mlightcad/pdf-renderer'

import {
  type AcApPdfExportOptions,
  resolveAcApPdfExportOptions
} from './AcApPdfExportOptions'
import { createViewerPdfGlyphProvider } from './AcApPdfGlyphProvider'

/**
 * Converts the current CAD drawing to a vector PDF and downloads it.
 *
 * Framing matches HTML export: `'extents'` fits drawable geometry; `'display'`
 * uses the live camera box. Paper-space pages ignore model-space fit and use
 * their own drawable extents.
 *
 * When {@link AcApPdfExportOptions.exportLayouts} is true, every layout becomes
 * one PDF page. A busy indicator is shown for the duration.
 */
export class AcApPdfConvertor {
  /**
   * Renders the current drawing to PDF and triggers a browser download.
   *
   * @param context - Active document context
   * @param options - Export framing and layout options
   */
  async convert(context: AcApContext, options: AcApPdfExportOptions = {}) {
    const resolved = resolveAcApPdfExportOptions(options)

    await AcApDocManager.instance.withBusyIndicator(async () => {
      const db = context.doc.database
      const pdfOptions: AcPdfExportOptions = {
        title: context.doc.fileName || context.doc.docTitle,
        ltscale: db.ltscale,
        celtscale: db.celtscale,
        showLineWeight: !!db.lwdisplay,
        fontMapping: AcApSettingManager.instance.fontMapping,
        background: 'none',
        fit: resolved.modelSpaceFit === 'display' ? 'current' : 'extents',
        layouts: resolved.exportLayouts ? 'all' : 'current',
        glyphProvider: createViewerPdfGlyphProvider()
      }

      if (resolved.modelSpaceFit === 'display') {
        // Display framing must use coordinates from the space being framed.
        // When exporting all layouts from paper space, the active camera is in
        // paper WCS — applying that box to the model-space page would be wrong.
        // In that case omit fitBox so the model page falls back to extents;
        // paper pages already ignore model-space fitBox in exportAllLayouts.
        const inModelSpace =
          db.currentSpaceId === db.tables.blockTable.modelSpace.objectId
        if (inModelSpace || !resolved.exportLayouts) {
          pdfOptions.fitBox = this.captureFitBox(context.view)
        }
      }

      const bytes = await exportDatabaseToPdf(db, pdfOptions)
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
  private captureFitBox(view: AcEdBaseView): NonNullable<AcPdfExportOptions['fitBox']> {
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
