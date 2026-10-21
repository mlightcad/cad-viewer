import { decodeRgba } from '@huh-david/bmp-js'
import { acdbThumbnailImageToDataUrl } from '@mlightcad/data-model'
import { encode as encodeJpeg } from 'jpeg-js'
import { PNG } from 'pngjs'

/** JPEG quality for package `preview.jpg` thumbnails. */
const PREVIEW_JPEG_QUALITY = 85

/**
 * Turns drawing thumbnail bytes from {@link AcDbDatabase.thumbnailImage} into
 * JPEG bytes suitable for a multi-file package `preview.jpg`.
 *
 * Accepts JPEG (passthrough), PNG, full BMP files, and DIB payloads (same
 * wrapping as {@link acdbThumbnailImageToDataUrl}). Returns `undefined` when
 * the drawing has no thumbnail or the payload cannot be converted.
 */
export function extractDrawingPreviewJpeg(
  thumbnail: Uint8Array | undefined | null
): Uint8Array | undefined {
  if (!thumbnail?.length) return undefined

  try {
    if (isJpeg(thumbnail)) {
      return copyBytes(thumbnail)
    }

    if (isPng(thumbnail)) {
      return rgbaToJpeg(pngToRgba(thumbnail))
    }

    const dataUrl = acdbThumbnailImageToDataUrl(thumbnail)
    if (!dataUrl) return undefined

    const parsed = parseDataUrl(dataUrl)
    if (!parsed) return undefined

    if (parsed.mime === 'image/jpeg') {
      return parsed.bytes
    }
    if (parsed.mime === 'image/png') {
      return rgbaToJpeg(pngToRgba(parsed.bytes))
    }
    if (parsed.mime === 'image/bmp') {
      return rgbaToJpeg(bmpToRgba(parsed.bytes))
    }
  } catch {
    return undefined
  }

  return undefined
}

interface RgbaImage {
  width: number
  height: number
  data: Buffer
}

function rgbaToJpeg(image: RgbaImage | undefined): Uint8Array | undefined {
  if (!image || image.width <= 0 || image.height <= 0) return undefined
  const encoded = encodeJpeg(
    {
      data: image.data,
      width: image.width,
      height: image.height
    },
    PREVIEW_JPEG_QUALITY
  )
  return copyBytes(encoded.data)
}

function pngToRgba(bytes: Uint8Array): RgbaImage {
  const png = PNG.sync.read(Buffer.from(bytes))
  return {
    width: png.width,
    height: png.height,
    data: png.data
  }
}

function bmpToRgba(bytes: Uint8Array): RgbaImage {
  const decoded = decodeRgba(bytes)
  return {
    width: decoded.width,
    height: decoded.height,
    data: Buffer.from(decoded.data)
  }
}

function isJpeg(data: Uint8Array): boolean {
  return (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  )
}

function isPng(data: Uint8Array): boolean {
  return (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  )
}

function parseDataUrl(
  dataUrl: string
): { mime: string; bytes: Uint8Array } | undefined {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) return undefined
  const mime = match[1]!
  const binary = Buffer.from(match[2]!, 'base64')
  return { mime, bytes: new Uint8Array(binary) }
}

function copyBytes(data: Uint8Array | Buffer): Uint8Array {
  return Uint8Array.from(data)
}
