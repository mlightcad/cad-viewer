import { AcSvgRenderer } from '@mlightcad/svg-renderer'

import { AcApDocManager } from '../../app'
import { AcApSettingManager } from '../../app/AcApSettingManager'

/**
 * Utility class for converting CAD drawings to SVG format.
 *
 * This class provides functionality to export the current CAD drawing
 * to SVG format and download it as a file. It iterates through all
 * entities in the model space and renders them using the SVG renderer.
 */
export class AcApSvgConvertor {
  /**
   * Converts the current CAD drawing to SVG format and initiates download.
   */
  async convert() {
    AcSvgRenderer.prepareExport()

    const doc = AcApDocManager.instance.curDocument
    const renderer = new AcSvgRenderer()
    this.configureRenderer(renderer)

    const entities = doc.database.tables.blockTable.modelSpace.newIterator()
    for (const entity of entities) {
      entity.worldDraw(renderer)
    }

    const svgContent = await renderer.exportAsync()
    this.createFileAndDownloadIt(svgContent)
  }

  /**
   * Configures export renderer scales, colours, and font substitution.
   */
  configureRenderer(renderer: AcSvgRenderer) {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView

    renderer.ltscale = doc.database.ltscale
    renderer.celtscale = doc.database.celtscale
    renderer.showLineWeight = !!doc.database.lwdisplay
    renderer.setFontMapping(AcApSettingManager.instance.fontMapping)

    const bg =
      view && 'backgroundColor' in view
        ? (view as { backgroundColor: number }).backgroundColor
        : 0xffffff
    renderer.currentBackgroundColor = bg
    renderer.changeForeground(bg === 0 ? 0xffffff : 0x000000)
  }

  private createFileAndDownloadIt(svgContent: string) {
    const svgBlob = new Blob([svgContent], {
      type: 'image/svg+xml;charset=utf-8'
    })

    const url = URL.createObjectURL(svgBlob)

    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = 'drawing.svg'

    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    // Keep the blob URL alive briefly so an optional preview tab can load it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
