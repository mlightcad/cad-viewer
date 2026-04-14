import * as THREE from 'three'

import { AcApDocManager } from '../app'
import { AcTrView2d } from '../view'

/**
 * Utility class for converting CAD drawings to PNG format.
 *
 * This class provides functionality to export the current CAD drawing
 * to PNG format and download it as a file. It renders the current view
 * using WebGLRenderTarget for optimal performance without requiring
 * preserveDrawingBuffer to be enabled on the renderer.
 *
 * The conversion process:
 * 1. Gets the current view and its associated renderer, scene, and camera
 * 2. Creates an offscreen render target for pixel capture
 * 3. Renders the scene to the render target
 * 4. Reads the pixel data and flips it vertically (WebGL renders upside down)
 * 5. Creates a canvas, draws the pixel data, and exports as PNG
 * 6. Triggers a download of the PNG file
 *
 * @example
 * ```typescript
 * const converter = new AcApPngConvertor();
 *
 * // Convert and download current drawing as PNG
 * converter.convert();
 * ```
 */
export class AcApPngConvertor {
  /**
   * Converts the current CAD drawing to PNG format and initiates download.
   *
   * This method:
   * - Retrieves the current view, renderer, scene, and camera
   * - Creates a WebGLRenderTarget for offscreen rendering
   * - Renders the scene to the render target
   * - Reads pixel data and flips it vertically to correct WebGL's upside-down rendering
   * - Creates a canvas with the pixel data
   * - Exports as PNG and downloads with timestamp-based filename
   *
   * @example
   * ```typescript
   * const converter = new AcApPngConvertor();
   * converter.convert(); // Downloads the drawing as PNG
   * ```
   */
  convert() {
    const view = AcApDocManager.instance.curView as AcTrView2d
    const renderer = view.renderer.internalRenderer
    const scene = view.internalScene
    const camera = view.internalCamera

    if (!scene || !camera) {
      console.error('[PNGOUT] Scene or camera not available')
      return
    }

    const width = view.width
    const height = view.height

    // Create a render target for offscreen rendering
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    })

    // Store the original render target
    const originalRenderTarget = renderer.getRenderTarget()

    // Render to the offscreen target
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    // Read pixels from the render target
    const pixels = new Uint8Array(width * height * 4)
    renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels)

    // Restore the original render target
    renderer.setRenderTarget(originalRenderTarget)

    // Clean up the render target
    renderTarget.dispose()

    // Flip the image vertically (WebGL renders upside down)
    const flippedPixels = this.flipPixelsVertically(pixels, width, height)

    // Create canvas and draw the pixels
    const canvas = this.createCanvasFromPixels(flippedPixels, width, height)

    // Export to PNG and download
    this.createFileAndDownloadIt(canvas)
  }

  /**
   * Flips pixel data vertically to correct WebGL's upside-down rendering.
   *
   * WebGL renders images upside down (origin at bottom-left), so the pixel
   * data needs to be flipped to display correctly in standard image viewers.
   *
   * @param pixels - The raw pixel data from WebGL render target
   * @param width - Width of the image in pixels
   * @param height - Height of the image in pixels
   * @returns The vertically flipped pixel data
   * @private
   */
  private flipPixelsVertically(
    pixels: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const flippedPixels = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4
      const dstRow = y * width * 4
      for (let x = 0; x < width * 4; x++) {
        flippedPixels[dstRow + x] = pixels[srcRow + x]
      }
    }
    return flippedPixels
  }

  /**
   * Creates a canvas element from pixel data.
   *
   * @param pixels - The vertically flipped pixel data
   * @param width - Width of the image in pixels
   * @param height - Height of the image in pixels
   * @returns A canvas element containing the image
   * @private
   */
  private createCanvasFromPixels(
    pixels: Uint8Array,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  /**
   * Creates a downloadable PNG file and triggers the download.
   *
   * This method:
   * - Exports the canvas to a PNG data URL
   * - Generates a timestamped filename
   * - Creates and triggers a download link
   *
   * @param canvas - The canvas element containing the image
   * @private
   */
  private createFileAndDownloadIt(canvas: HTMLCanvasElement) {
    // Export canvas to PNG data URL
    const dataURL = canvas.toDataURL('image/png')

    // Create a download link and trigger the download
    const downloadLink = document.createElement('a')
    downloadLink.href = dataURL
    downloadLink.download = `cad-export-${Date.now()}.png`

    // Trigger the download
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
}
