import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcApSettingManager,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'

import { AcSvgRenderer } from './AcSvgRenderer'

/**
 * Utility class for converting CAD drawings to SVG format.
 *
 * Renders model-space entities with {@link AcSvgRenderer} and triggers a
 * browser download of the resulting SVG file.
 */
export class AcApSvgConvertor {
  /**
   * Converts the current CAD drawing to SVG format and initiates download.
   */
  async convert(context: AcApContext) {
    AcSvgRenderer.prepareExport()

    const entities =
      context.doc.database.tables.blockTable.modelSpace.newIterator()
    const renderer = new AcSvgRenderer()
    this.configureRenderer(renderer, context)

    for (const entity of entities) {
      entity.worldDraw(renderer)
    }

    const svgContent = await renderer.exportAsync()
    const downloadName = resolveExportDownloadName(
      context.doc.fileName || context.doc.docTitle,
      'svg'
    )
    this.createFileAndDownloadIt(svgContent, downloadName)
  }

  /**
   * Configures export renderer scales, colours, and font substitution.
   */
  configureRenderer(renderer: AcSvgRenderer, context: AcApContext) {
    const db = context.doc.database
    renderer.ltscale = db.ltscale
    renderer.celtscale = db.celtscale
    renderer.showLineWeight = !!db.lwdisplay
    renderer.setFontMapping(AcApSettingManager.instance.fontMapping)

    const view = context.view as { backgroundColor?: number } | undefined
    const bg = view?.backgroundColor ?? 0xffffff
    renderer.currentBackgroundColor = bg
    renderer.changeForeground(bg === 0 ? 0xffffff : 0x000000)
  }

  private createFileAndDownloadIt(svgContent: string, downloadName: string) {
    const svgBlob = new Blob([svgContent], {
      type: 'image/svg+xml;charset=utf-8'
    })

    const url = URL.createObjectURL(svgBlob)

    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = downloadName

    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
