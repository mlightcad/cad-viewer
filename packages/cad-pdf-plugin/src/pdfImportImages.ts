/**
 * PDF image paints → raster pictures for `AcDbRasterImage`.
 *
 * `AcDbRasterImage` places an upright rectangle, but a PDF image can be
 * rotated, mirrored or skewed. Each image is therefore redrawn, with its full
 * transform, into an axis-aligned canvas covering its bounding box; pixels
 * outside the image stay transparent.
 */

import type { PdfImportedImage } from './pdfVectorImport'

/** Affine map `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export type PdfImageAffine = PdfImportedImage['toCad']

/** Where and how large to draw one image. */
export interface PdfImagePlacement {
  /** Axis-aligned model-space box (lower-left corner and size). */
  box: { x: number; y: number; width: number; height: number }
  canvasWidth: number
  canvasHeight: number
  /**
   * Canvas `setTransform(a, b, c, d, e, f)` that maps image pixel
   * coordinates (origin top-left, y down) onto the canvas.
   */
  transform: [number, number, number, number, number, number]
}

/** Largest canvas side; keeps memory bounded for huge scans. */
export const PDF_IMAGE_MAX_CANVAS_SIDE = 4096

/**
 * Computes the axis-aligned box and canvas transform for an image.
 *
 * The canvas resolution keeps the image's own pixel density along its
 * sharper axis, capped at `maxSide` pixels.
 *
 * @param toCad - Unit square → model space (see {@link PdfImportedImage}).
 * @param pixelWidth - Image width in pixels.
 * @param pixelHeight - Image height in pixels.
 * @param maxSide - Largest canvas side in pixels.
 * @returns The placement, or `undefined` for a degenerate image.
 */
export function acapPdfImagePlacement(
  toCad: PdfImageAffine,
  pixelWidth: number,
  pixelHeight: number,
  maxSide = PDF_IMAGE_MAX_CANVAS_SIDE
): PdfImagePlacement | undefined {
  const { a, b, c, d, e, f } = toCad
  const uLength = Math.hypot(a, b)
  const vLength = Math.hypot(c, d)
  if (
    !(pixelWidth > 0) ||
    !(pixelHeight > 0) ||
    !(uLength > 1e-9) ||
    !(vLength > 1e-9) ||
    Math.abs(a * d - b * c) < 1e-12
  ) {
    return undefined
  }

  const xs = [e, e + a, e + c, e + a + c]
  const ys = [f, f + b, f + d, f + b + d]
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY

  let k = Math.max(pixelWidth / uLength, pixelHeight / vLength)
  k = Math.min(k, maxSide / Math.max(width, height))
  const canvasWidth = Math.max(1, Math.round(width * k))
  const canvasHeight = Math.max(1, Math.round(height * k))
  // Use the rounded size so the image fills the canvas exactly.
  const kx = canvasWidth / width
  const ky = canvasHeight / height

  // Pixel (px, py) → unit (px/W, 1 - py/H) → model → canvas (y down).
  return {
    box: { x: minX, y: minY, width, height },
    canvasWidth,
    canvasHeight,
    transform: [
      (kx * a) / pixelWidth,
      (-ky * b) / pixelWidth,
      (-kx * c) / pixelHeight,
      (ky * d) / pixelHeight,
      kx * (c + e - minX),
      ky * (maxY - d - f)
    ]
  }
}

/** PDF.js decoded image (`page.objs` entry or inline image data). */
export interface PdfJsImageLike {
  width?: number
  height?: number
  /** PDF.js `ImageKind`: 1 = 1-bit gray, 2 = RGB, 3 = RGBA. */
  kind?: number
  data?: ArrayLike<number>
  /** Present when PDF.js decoded the image into a bitmap. */
  bitmap?: unknown
}

const IMAGE_KIND_GRAYSCALE_1BPP = 1
const IMAGE_KIND_RGB_24BPP = 2
const IMAGE_KIND_RGBA_32BPP = 3

/**
 * Converts PDF.js raw pixel data to RGBA.
 *
 * @param image - Decoded image with `kind` and `data`.
 * @returns RGBA bytes (`width × height × 4`), or `undefined` when the data
 * is missing, short or of an unknown kind.
 */
export function acapPdfImageToRgba(
  image: PdfJsImageLike
): Uint8ClampedArray | undefined {
  const { width = 0, height = 0, kind, data } = image
  if (!(width > 0) || !(height > 0) || !data) return undefined
  const pixels = width * height
  const out = new Uint8ClampedArray(pixels * 4)

  if (kind === IMAGE_KIND_RGBA_32BPP) {
    if (data.length < pixels * 4) return undefined
    out.set(Array.prototype.slice.call(data, 0, pixels * 4))
    return out
  }
  if (kind === IMAGE_KIND_RGB_24BPP) {
    if (data.length < pixels * 3) return undefined
    for (let i = 0, j = 0; i < pixels; i++, j += 3) {
      out[i * 4] = data[j]
      out[i * 4 + 1] = data[j + 1]
      out[i * 4 + 2] = data[j + 2]
      out[i * 4 + 3] = 255
    }
    return out
  }
  if (kind === IMAGE_KIND_GRAYSCALE_1BPP) {
    // Rows are padded to whole bytes; a set bit is white (as PDF.js draws it).
    const rowBytes = Math.ceil(width / 8)
    if (data.length < rowBytes * height) return undefined
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = data[y * rowBytes + (x >> 3)] & (0x80 >> (x & 7))
        const value = bit ? 255 : 0
        const o = (y * width + x) * 4
        out[o] = value
        out[o + 1] = value
        out[o + 2] = value
        out[o + 3] = 255
      }
    }
    return out
  }
  return undefined
}

/** Channel ceiling for "black ink" pixels (matches vector contrast ink). */
const INK_CHANNEL_MAX = 64
/** Share of visible pixels that must be dark for an image to count as ink. */
const INK_SHARE = 0.95

/**
 * Lays dark ink on transparency (QR codes, stamps, signatures) onto white
 * paper, in place.
 *
 * Such images rely on the white PDF page behind them; on a dark CAD canvas
 * their black ink would all but disappear. Coloured or fully opaque images
 * are left alone, so artwork over coloured areas keeps its transparency.
 *
 * @param rgba - RGBA pixels, modified when flattened.
 * @returns `true` when the image was flattened.
 */
export function acapPdfFlattenInkOnPaper(rgba: Uint8ClampedArray): boolean {
  let visible = 0
  let dark = 0
  let translucent = false
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3]
    if (alpha < 255) translucent = true
    if (alpha < 128) continue
    visible++
    if (
      rgba[i] < INK_CHANNEL_MAX &&
      rgba[i + 1] < INK_CHANNEL_MAX &&
      rgba[i + 2] < INK_CHANNEL_MAX
    ) {
      dark++
    }
  }
  if (!translucent || visible === 0 || dark < visible * INK_SHARE) {
    return false
  }
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3] / 255
    if (alpha >= 1) continue
    for (let channel = 0; channel < 3; channel++) {
      rgba[i + channel] = Math.round(
        rgba[i + channel] * alpha + 255 * (1 - alpha)
      )
    }
    rgba[i + 3] = 255
  }
  return true
}

/** One image redrawn as an upright PNG, ready for `AcDbRasterImage`. */
export interface PdfRasterizedImage {
  png: Blob
  box: PdfImagePlacement['box']
  pixelWidth: number
  pixelHeight: number
}

/**
 * Draws a PDF.js image with its placement into an upright PNG. Browser only
 * (uses `document` canvases).
 *
 * @param image - Decoded PDF.js image.
 * @param toCad - Unit square → model space, already scaled and placed.
 * @returns The PNG and its box, or `undefined` when it cannot be drawn.
 */
export async function acapPdfRasterizeImage(
  image: PdfJsImageLike,
  toCad: PdfImageAffine
): Promise<PdfRasterizedImage | undefined> {
  const width = image.width ?? 0
  const height = image.height ?? 0
  const placement = acapPdfImagePlacement(toCad, width, height)
  if (!placement) return undefined

  // Work on RGBA so ink-on-transparency can be put on paper either way.
  const pixels = document.createElement('canvas')
  pixels.width = width
  pixels.height = height
  const pixelContext = pixels.getContext('2d')
  if (!pixelContext) return undefined
  let imageData: ImageData
  if (
    typeof ImageBitmap !== 'undefined' &&
    image.bitmap instanceof ImageBitmap
  ) {
    pixelContext.drawImage(image.bitmap, 0, 0)
    imageData = pixelContext.getImageData(0, 0, width, height)
  } else {
    const rgba = acapPdfImageToRgba(image)
    if (!rgba) return undefined
    imageData = pixelContext.createImageData(width, height)
    imageData.data.set(rgba)
  }
  acapPdfFlattenInkOnPaper(imageData.data)
  pixelContext.putImageData(imageData, 0, 0)
  const source: CanvasImageSource = pixels

  const canvas = document.createElement('canvas')
  canvas.width = placement.canvasWidth
  canvas.height = placement.canvasHeight
  const context = canvas.getContext('2d')
  if (!context) return undefined
  context.imageSmoothingEnabled = true
  context.setTransform(...placement.transform)
  context.drawImage(source, 0, 0, width, height)

  const png = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!png) return undefined
  return {
    png,
    box: placement.box,
    pixelWidth: placement.canvasWidth,
    pixelHeight: placement.canvasHeight
  }
}
