import { AcSvgRenderer } from '@mlightcad/svg-renderer'

import { AcApDocManager } from '../app'

/**
 * Utility class for converting CAD drawings to SVG format.
 *
 * This class provides functionality to export the current CAD drawing
 * to SVG format and download it as a file. It iterates through all
 * entities in the model space and renders them using the SVG renderer.
 *
 * The conversion process:
 * 1. Gets all entities from the current document's model space
 * 2. Uses the SVG renderer to convert each entity to SVG markup
 * 3. Exports the complete SVG content
 * 4. Creates a downloadable file for the user
 *
 * @example
 * ```typescript
 * const converter = new AcApSvgConvertor();
 *
 * // Convert and download current drawing as SVG
 * converter.convert();
 * ```
 */
export class AcApSvgConvertor {
  /**
   * Converts the current CAD drawing to SVG format and initiates download.
   *
   * This method:
   * - Retrieves all entities from the current document's model space
   * - Renders each entity using the SVG renderer
   * - Exports the complete SVG markup
   * - Automatically downloads the SVG file as 'example.svg'
   *
   * @example
   * ```typescript
   * const converter = new AcApSvgConvertor();
   * converter.convert(); // Downloads the drawing as SVG
   * ```
   */
  convert() {
    const entities =
      AcApDocManager.instance.curDocument.database.tables.blockTable.modelSpace.newIterator()
    const renderer = new AcSvgRenderer()
    for (const entity of entities) {
      entity.worldDraw(renderer)
    }
    this.createFileAndDownloadIt(renderer.export())
  }

  /**
   * Creates a downloadable SVG file and triggers the download.
   *
   * This method:
   * - Creates a Blob from the SVG content with proper MIME type
   * - Generates a temporary download URL
   * - Creates and triggers a download link
   * - Cleans up the temporary elements
   *
   * @param svgContent - The SVG markup content to download
   * @private
   */
  private createFileAndDownloadIt(svgContent: string) {
    // Convert the SVG content into a Blob
    const svgBlob = new Blob([svgContent], {
      type: 'image/svg+xml;charset=utf-8'
    })

    // Create a URL for the Blob
    const url = URL.createObjectURL(svgBlob)

    // Create a download link and trigger the download
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = 'example.svg'

    // Append the link to the body (it needs to be in the DOM to work in some browsers)
    document.body.appendChild(downloadLink)

    // Trigger the download
    downloadLink.click()
  }
}
