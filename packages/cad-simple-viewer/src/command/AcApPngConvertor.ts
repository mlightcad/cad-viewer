import { AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
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
   * @param bounds - Optional world coordinate bounding box to export.
   *                  If provided, the camera will zoom to fit this region.
   *                  If not provided, exports the current view.
   *
   * @example
   * ```typescript
   * const converter = new AcApPngConvertor();
   * converter.convert(); // Downloads the drawing as PNG
   * ```
   *
   * @example
   * ```typescript
   * // Export a specific region
   * const bounds = new AcGeBox2d();
   * bounds.setFromExtents(new AcGePoint2d(0, 0), new AcGePoint2d(100, 100));
   * const converter = new AcApPngConvertor();
   * converter.convert(bounds); // Downloads the specified region as PNG
   * ```
   */
  convert(bounds?: AcGeBox2d, long_side?: number) {
    const view = AcApDocManager.instance.curView as AcTrView2d
    const renderer = view.renderer.internalRenderer
    const scene = view.internalScene
    const camera = view.internalCamera

    if (!scene || !camera) {
      console.error('[PNGOUT] Scene or camera not available')
      return
    }

    let outputWidth = view.width
    let outputHeight = view.height

    if (long_side && bounds) {
      const size = new AcGeVector2d()
      bounds.getSize(size)
      const boundsWidth = size.x
      const boundsHeight = size.y
      const boundsAspect = boundsWidth / boundsHeight
      if (boundsAspect > 1) {
        outputWidth = long_side
        outputHeight = Math.round(long_side / boundsAspect)
      } else {
        outputHeight = long_side
        outputWidth = Math.round(long_side * boundsAspect)
      }
    }

    // Save original camera state for restoration later
    const originalZoom = camera.zoom
    const originalPosition = camera.position.clone()

    // If bounds provided, calculate zoom and position to fit the specified region
    if (bounds) {
      const size = new AcGeVector2d()
      bounds.getSize(size)

      const center = new AcGeVector2d()
      bounds.getCenter(center)

      const boundsWidth = size.x
      const boundsHeight = size.y
      const widthRatio = view.width / boundsWidth
      const heightRatio = view.height / boundsHeight
      const scale = Math.min(widthRatio, heightRatio)

      // Set camera position to center of bounds and adjust zoom
      camera.position.set(center.x, center.y, camera.position.z)
      camera.zoom = scale
      camera.updateProjectionMatrix()
    }

    // Create a render target for offscreen rendering
    const renderTarget = new THREE.WebGLRenderTarget(
      outputWidth,
      outputHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
      }
    )

    // Store the original render target
    const originalRenderTarget = renderer.getRenderTarget()

    // Render to the offscreen target
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    // Read pixels from the render target
    const pixels = new Uint8Array(outputWidth * outputHeight * 4)
    renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      outputWidth,
      outputHeight,
      pixels
    )

    // Restore the original render target
    renderer.setRenderTarget(originalRenderTarget)

    // Clean up the render target
    renderTarget.dispose()

    // Restore original camera state
    camera.zoom = originalZoom
    camera.position.copy(originalPosition)
    camera.updateProjectionMatrix()

    // Flip the image vertically (WebGL renders upside down)
    const flippedPixels = this.flipPixelsVertically(
      pixels,
      outputWidth,
      outputHeight
    )

    // Create canvas and draw the pixels
    const canvas = this.createCanvasFromPixels(
      flippedPixels,
      outputWidth,
      outputHeight
    )

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
