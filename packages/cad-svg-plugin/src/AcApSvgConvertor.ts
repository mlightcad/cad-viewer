import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcApDocManager,
  AcApI18n,
  AcApSettingManager,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'
import { AcCmUiYieldGate, accmYieldForPaint } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgRenderer } from './AcSvgRenderer'

/** Time budget between UI yields while drawing entities for SVG export. */
const SVG_EXPORT_YIELD_BUDGET_MS = 200

/**
 * Utility class for converting CAD drawings to SVG format.
 *
 * Renders model-space entities with {@link AcSvgRenderer} and triggers a
 * browser download of the resulting SVG file. A busy indicator is shown and
 * the UI thread is yielded periodically so the spinner can keep animating.
 */
export class AcApSvgConvertor {
  /**
   * Converts the current CAD drawing to SVG format and initiates download.
   */
  async convert(context: AcApContext) {
    await AcApDocManager.instance.withBusyIndicator(async () => {
      await accmYieldForPaint()
      AcSvgRenderer.prepareExport()

      const entities =
        context.doc.database.tables.blockTable.modelSpace.newIterator()
      const renderer = new AcSvgRenderer()
      this.configureRenderer(renderer, context)

      const yieldGate = new AcCmUiYieldGate(SVG_EXPORT_YIELD_BUDGET_MS)
      const yieldToEventLoop = () =>
        new Promise<void>(resolve => setTimeout(resolve, 0))

      // Collect worldDraw roots (not renderer._entities). AcDbRenderingCache
      // leaves untransformed INSERT templates in _entities while returning
      // applyMatrix'd clones that are never pushed there.
      const roots: AcSvgEntity[] = []
      for (const entity of entities) {
        const drawable = entity.worldDraw(renderer)
        if (drawable instanceof AcSvgEntity) {
          roots.push(drawable)
        }
        await yieldGate.maybeYield(yieldToEventLoop)
      }

      await accmYieldForPaint()
      const svgContent = await renderer.exportAsync(roots)
      await accmYieldForPaint()

      const downloadName = resolveExportDownloadName(
        context.doc.fileName || context.doc.docTitle,
        'svg'
      )
      this.createFileAndDownloadIt(svgContent, downloadName)
    }, AcApI18n.t('main.message.exportingSvg'))
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
