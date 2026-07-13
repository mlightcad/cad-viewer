import { AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcApDocManager } from '../../app'
import { resolveExportDownloadName } from '../../util/AcApExportFileNameUtil'
import { AcTrView2d } from '../../view'

/**
 * Utility class for converting CAD drawings to PNG format.
 *
 * Offscreen export temporarily adjusts the camera only. It does not resize
 * the layout view or touch OrbitControls so the interactive view stays intact.
 */
export class AcApPngConvertor {
  /**
   * Converts the current CAD drawing to PNG format and initiates download.
   *
   * @param bounds - Optional world coordinate bounding box to export.
   * @param longSide - Optional maximum dimension (width or height) in pixels.
   */
  convert(bounds?: AcGeBox2d, longSide?: number) {
    const view = AcApDocManager.instance.curView as AcTrView2d
    const layoutView = view.activeLayoutView
    const rendererWrapper = view.renderer
    const renderer = rendererWrapper.internalRenderer
    const scene = view.internalScene
    const camera = view.internalCamera

    if (!scene || !camera || !layoutView) {
      console.error('[PNGOUT] Scene or camera not available')
      return
    }

    const viewAspect = view.width / Math.max(view.height, 1)
    const targetAspect = bounds ? this.getBoundsAspect(bounds) : viewAspect
    let outputWidth = Math.max(1, Math.round(view.width))
    let outputHeight = Math.max(1, Math.round(view.height))

    if (longSide && longSide > 0) {
      const outputSize = this.resolveOutputSize(longSide, targetAspect)
      outputWidth = outputSize.width
      outputHeight = outputSize.height
    }

    const renderSize = bounds
      ? { width: outputWidth, height: outputHeight }
      : this.resolveRenderSizeForCenterCrop(
          outputWidth,
          outputHeight,
          viewAspect
        )
    const renderWidth = renderSize.width
    const renderHeight = renderSize.height
    const needsCrop =
      !bounds && (renderWidth !== outputWidth || renderHeight !== outputHeight)

    const originalZoom = camera.zoom
    const originalPosition = camera.position.clone()
    const originalLeft = camera.left
    const originalRight = camera.right
    const originalTop = camera.top
    const originalBottom = camera.bottom

    const savedScissorTest = renderer.getScissorTest()
    const savedPixelRatio = renderer.getPixelRatio()
    const originalRenderTarget = renderer.getRenderTarget()

    let renderTarget: THREE.WebGLRenderTarget | undefined

    try {
      if (bounds) {
        layoutView.applyExportCamera(bounds, renderWidth, renderHeight)
      }

      // Viewport is multiplied by pixelRatio internally; force 1:1 for RT export.
      renderer.setPixelRatio(1)
      rendererWrapper.updateLineResolution(renderWidth, renderHeight)

      renderTarget = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
      })

      renderer.setRenderTarget(renderTarget)
      renderer.setViewport(0, 0, renderWidth, renderHeight)
      renderer.setScissorTest(false)

      layoutView.renderObject(scene)

      const pixels = new Uint8Array(renderWidth * renderHeight * 4)
      renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        renderWidth,
        renderHeight,
        pixels
      )

      const flippedPixels = this.flipPixelsVertically(
        pixels,
        renderWidth,
        renderHeight
      )
      const finalPixels = needsCrop
        ? this.cropPixelsCentered(
            flippedPixels,
            renderWidth,
            renderHeight,
            outputWidth,
            outputHeight
          )
        : flippedPixels

      const canvas = this.createCanvasFromPixels(
        finalPixels,
        outputWidth,
        outputHeight
      )

      this.createFileAndDownloadIt(canvas)
    } finally {
      renderer.setRenderTarget(originalRenderTarget)
      renderTarget?.dispose()

      camera.zoom = originalZoom
      camera.position.copy(originalPosition)
      camera.left = originalLeft
      camera.right = originalRight
      camera.top = originalTop
      camera.bottom = originalBottom
      camera.updateProjectionMatrix()

      renderer.setPixelRatio(savedPixelRatio)
      rendererWrapper.setSize(view.width, view.height)
      renderer.setScissorTest(savedScissorTest)
      rendererWrapper.syncCameraZoom(originalZoom)

      // pixelRatio / render-target changes resize the canvas buffer; redraw now.
      layoutView.render(view.cadScene)
      view.isDirty = true
    }
  }

  private resolveOutputSize(
    longSide: number,
    aspect: number
  ): { width: number; height: number } {
    const clampedLongSide = Math.max(1, Math.round(longSide))
    const safeAspect =
      Number.isFinite(aspect) && aspect > Number.EPSILON ? aspect : 1

    if (safeAspect >= 1) {
      return {
        width: clampedLongSide,
        height: Math.max(1, Math.round(clampedLongSide / safeAspect))
      }
    }

    return {
      width: Math.max(1, Math.round(clampedLongSide * safeAspect)),
      height: clampedLongSide
    }
  }

  /**
   * Computes render size using source aspect so final target can be center-cropped.
   */
  private resolveRenderSizeForCenterCrop(
    targetWidth: number,
    targetHeight: number,
    sourceAspect: number
  ) {
    const safeSourceAspect =
      Number.isFinite(sourceAspect) && sourceAspect > Number.EPSILON
        ? sourceAspect
        : 1
    const targetAspect = targetWidth / Math.max(targetHeight, 1)

    if (Math.abs(targetAspect - safeSourceAspect) < 1e-6) {
      return { width: targetWidth, height: targetHeight }
    }

    if (safeSourceAspect > targetAspect) {
      // Source is wider; extend width then crop left/right.
      return {
        width: Math.max(
          targetWidth,
          Math.ceil(targetHeight * safeSourceAspect)
        ),
        height: targetHeight
      }
    }

    // Source is taller/narrower; extend height then crop top/bottom.
    return {
      width: targetWidth,
      height: Math.max(targetHeight, Math.ceil(targetWidth / safeSourceAspect))
    }
  }

  /**
   * Center-crops an RGBA pixel buffer from source to destination size.
   */
  private cropPixelsCentered(
    pixels: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    dstWidth: number,
    dstHeight: number
  ) {
    if (srcWidth === dstWidth && srcHeight === dstHeight) {
      return pixels
    }

    const offsetX = Math.floor((srcWidth - dstWidth) / 2)
    const offsetY = Math.floor((srcHeight - dstHeight) / 2)
    const cropped = new Uint8Array(dstWidth * dstHeight * 4)

    for (let y = 0; y < dstHeight; y++) {
      const srcStart = ((y + offsetY) * srcWidth + offsetX) * 4
      const srcEnd = srcStart + dstWidth * 4
      const dstStart = y * dstWidth * 4
      cropped.set(pixels.subarray(srcStart, srcEnd), dstStart)
    }

    return cropped
  }

  /**
   * Returns the world-space aspect ratio of bounds.
   */
  private getBoundsAspect(bounds: AcGeBox2d) {
    const size = new AcGeVector2d()
    bounds.getSize(size)
    const width = Math.max(Math.abs(size.x), Number.EPSILON)
    const height = Math.max(Math.abs(size.y), Number.EPSILON)
    return width / height
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
   * - Uses the drawing file name as the download file name
   * - Creates and triggers a download link
   *
   * @param canvas - The canvas element containing the image
   * @private
   */
  private createFileAndDownloadIt(canvas: HTMLCanvasElement) {
    const doc = AcApDocManager.instance.curDocument
    const downloadName = resolveExportDownloadName(
      doc.fileName || doc.docTitle,
      'png'
    )

    // Export canvas to PNG data URL
    const dataURL = canvas.toDataURL('image/png')

    // Create a download link and trigger the download
    const downloadLink = document.createElement('a')
    downloadLink.href = dataURL
    downloadLink.download = downloadName

    // Trigger the download
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
}
