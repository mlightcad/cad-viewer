import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcApSettingManager,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'
import { AcSvgRenderer } from '@mlightcad/cad-svg-plugin'
import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

/**
 * Utility class for converting CAD drawings to PDF format.
 *
 * Reuses the SVG renderer pipeline and converts the resulting SVG to a
 * vector PDF using jsPDF + svg2pdf.js.
 */
export class AcApPdfConvertor {
  /**
   * Renders the current drawing to PDF and triggers a browser download.
   */
  async convert(context: AcApContext) {
    const svgString = await this.buildSvg(context)
    const downloadName = resolveExportDownloadName(
      context.doc.fileName || context.doc.docTitle,
      'pdf'
    )
    await this.downloadAsPdf(svgString, downloadName)
  }

  private async buildSvg(context: AcApContext): Promise<string> {
    AcSvgRenderer.prepareExport()

    const entities =
      context.doc.database.tables.blockTable.modelSpace.newIterator()
    const renderer = new AcSvgRenderer()
    this.configureRenderer(renderer, context)

    for (const entity of entities) {
      entity.worldDraw(renderer)
    }
    return renderer.exportAsync()
  }

  private configureRenderer(renderer: AcSvgRenderer, context: AcApContext) {
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

  private async downloadAsPdf(svgString: string, downloadName: string) {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgEl = svgDoc.documentElement as unknown as SVGSVGElement

    const vb = svgEl.getAttribute('viewBox')?.split(' ').map(Number)
    const vbWidth = vb && vb.length === 4 ? Math.abs(vb[2]) : 297
    const vbHeight = vb && vb.length === 4 ? Math.abs(vb[3]) : 210

    const orientation = vbWidth >= vbHeight ? 'landscape' : 'portrait'

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [vbWidth, vbHeight]
    })

    await svg2pdf(svgEl, pdf, {
      x: 0,
      y: 0,
      width: vbWidth,
      height: vbHeight
    })

    pdf.save(downloadName)
  }
}
