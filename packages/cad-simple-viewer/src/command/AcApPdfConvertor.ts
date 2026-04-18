import { AcSvgRenderer } from '@mlightcad/svg-renderer'
import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

import { AcApDocManager } from '../app'

/**
 * Utility class for converting CAD drawings to PDF format.
 *
 * Reuses the SVG renderer pipeline and converts the resulting SVG to a
 * vector PDF using jsPDF + svg2pdf.js. The output is a properly oriented
 * A4 landscape PDF that preserves all vector geometry.
 *
 * @example
 * ```typescript
 * const converter = new AcApPdfConvertor();
 * await converter.convert(); // Downloads drawing as PDF
 * ```
 */
export class AcApPdfConvertor {
  /**
   * Renders the current drawing to PDF and triggers a browser download.
   */
  async convert() {
    const svgString = this.buildSvg()
    await this.downloadAsPdf(svgString)
  }

  private buildSvg(): string {
    const entities =
      AcApDocManager.instance.curDocument.database.tables.blockTable.modelSpace.newIterator()
    const renderer = new AcSvgRenderer()
    for (const entity of entities) {
      entity.worldDraw(renderer)
    }
    return renderer.export()
  }

  private async downloadAsPdf(svgString: string) {
    // Parse SVG string into a DOM element so svg2pdf can traverse it
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgEl = svgDoc.documentElement as unknown as SVGSVGElement

    // Read viewBox dimensions to set PDF page size
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

    pdf.save('drawing.pdf')
  }
}
