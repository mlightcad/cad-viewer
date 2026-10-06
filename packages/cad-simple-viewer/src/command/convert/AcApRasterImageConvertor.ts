import { AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcApDocManager } from '../../app'
import { resolveExportDownloadName } from '../../util/AcApExportFileNameUtil'
import { AcTrView2d } from '../../view'

/** Supported raster export formats. */
export type AcApRasterImageFormat = 'png' | 'jpeg' | 'bmp'

const JPEG_QUALITY = 0.92

/**
 * Utility class for converting CAD drawings to raster image formats
 * (PNG, JPEG, or BMP).
 *
 * Offscreen export temporarily adjusts the camera only. It does not resize
 * the layout view or touch OrbitControls so the interactive view stays intact.
 */
export class AcApRasterImageConvertor {
  private readonly _format: AcApRasterImageFormat

  /**
   * @param format - Target image format. Defaults to PNG.
   */
  constructor(format: AcApRasterImageFormat = 'png') {
    this._format = format
  }

  get format(): AcApRasterImageFormat {
    return this._format
  }

  /**
   * Converts the current CAD drawing to the configured format and downloads it.
   *
   * Waits for entity conversion and deferred text/font geometry so scripted
   * exports (e.g. CLI `pngout` / `jpgout` / `bmpout`) do not snapshot before
   * glyphs are drawable.
   *
   * @param bounds - Optional world coordinate bounding box to export.
   * @param longSide - Optional maximum dimension (width or height) in pixels.
   */
  async convert(bounds?: AcGeBox2d, longSide?: number) {
    const tag = this.logTag
    const view = AcApDocManager.instance.curView as AcTrView2d
    const sceneReady = await view.waitUntilIdle()
    if (!sceneReady) {
      console.warn(
        `[${tag}] Timed out waiting for scene idle; exporting current geometry`
      )
    }

    const layoutView = view.activeLayoutView
    const rendererWrapper = view.renderer
    const renderer = rendererWrapper.internalRenderer
    const scene = view.internalScene
    const camera = view.internalCamera

    if (!scene || !camera || !layoutView) {
      console.error(`[${tag}] Scene or camera not available`)
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

      this.createFileAndDownloadIt(canvas, finalPixels, outputWidth, outputHeight)
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

  private get logTag(): string {
    switch (this._format) {
      case 'jpeg':
        return 'JPGOUT'
      case 'bmp':
        return 'BMPOUT'
      default:
        return 'PNGOUT'
    }
  }

  private get fileExtension(): string {
    return this._format === 'jpeg' ? 'jpg' : this._format
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
   * Creates a downloadable image file and triggers the download.
   *
   * @param canvas - Canvas used for PNG/JPEG encoding
   * @param pixels - RGBA pixel buffer used for BMP encoding
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @private
   */
  private createFileAndDownloadIt(
    canvas: HTMLCanvasElement,
    pixels: Uint8Array,
    width: number,
    height: number
  ) {
    const doc = AcApDocManager.instance.curDocument
    const downloadName = resolveExportDownloadName(
      doc.fileName || doc.docTitle,
      this.fileExtension
    )

    const dataURL = this.encodeDataUrl(canvas, pixels, width, height)

    const downloadLink = document.createElement('a')
    downloadLink.href = dataURL
    downloadLink.download = downloadName

    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  private encodeDataUrl(
    canvas: HTMLCanvasElement,
    pixels: Uint8Array,
    width: number,
    height: number
  ): string {
    switch (this._format) {
      case 'jpeg':
        return this.canvasToJpegDataUrl(canvas)
      case 'bmp':
        return this.encodeBmpDataUrl(pixels, width, height)
      default:
        return canvas.toDataURL('image/png')
    }
  }

  /**
   * Encodes JPEG with a white backdrop so transparent pixels do not become black.
   */
  private canvasToJpegDataUrl(canvas: HTMLCanvasElement): string {
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, 0, 0)
    return out.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  /**
   * Encodes a 24-bit Windows BMP data URL from top-down RGBA pixels.
   *
   * Canvas `toDataURL` does not support BMP, so pixels are written manually
   * (BGR, bottom-up rows, 4-byte row padding). Transparent pixels are
   * composited on white so BMP matches JPEG's opaque backdrop.
   */
  private encodeBmpDataUrl(
    pixels: Uint8Array,
    width: number,
    height: number
  ): string {
    const rowSize = Math.ceil((width * 3) / 4) * 4
    const imageSize = rowSize * height
    const fileSize = 14 + 40 + imageSize
    const buffer = new ArrayBuffer(fileSize)
    const view = new DataView(buffer)
    const bytes = new Uint8Array(buffer)

    // BITMAPFILEHEADER
    view.setUint16(0, 0x4d42, true) // 'BM'
    view.setUint32(2, fileSize, true)
    view.setUint32(10, 54, true)

    // BITMAPINFOHEADER
    view.setUint32(14, 40, true)
    view.setInt32(18, width, true)
    view.setInt32(22, height, true) // positive = bottom-up
    view.setUint16(26, 1, true)
    view.setUint16(28, 24, true)
    view.setUint32(34, imageSize, true)

    let offset = 54
    for (let y = height - 1; y >= 0; y--) {
      const rowStart = y * width * 4
      for (let x = 0; x < width; x++) {
        const i = rowStart + x * 4
        const alpha = (pixels[i + 3] ?? 255) / 255
        const inv = 1 - alpha
        // Composite on white so transparent CAD background stays light.
        bytes[offset++] = Math.round((pixels[i + 2] ?? 0) * alpha + 255 * inv) // B
        bytes[offset++] = Math.round((pixels[i + 1] ?? 0) * alpha + 255 * inv) // G
        bytes[offset++] = Math.round((pixels[i] ?? 0) * alpha + 255 * inv) // R
      }
      offset += rowSize - width * 3
    }

    return `data:image/bmp;base64,${this.bytesToBase64(bytes)}`
  }

  private bytesToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000
    const chunks: string[] = []
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      chunks.push(String.fromCharCode(...chunk))
    }
    return btoa(chunks.join(''))
  }
}
