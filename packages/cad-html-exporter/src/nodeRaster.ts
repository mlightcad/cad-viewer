import { decodeRgba } from '@huh-david/bmp-js'
import { setHeadlessPngEncoder } from '@mlightcad/cad-html-core'
import { setHeadlessRasterDecoder } from '@mlightcad/three-renderer'
import { decode as decodeJpeg } from 'jpeg-js'
import { PNG } from 'pngjs'

/** Decoded RGBA raster. Pixels are top-down, matching a canvas `putImageData`. */
export interface NodeRasterImage {
  width: number
  height: number
  data: Uint8Array
}

let installed = false

/**
 * Teaches headless export how to decode OLE/raster blobs and write them back
 * as PNG without `document` or Three.js `TextureLoader`.
 */
export function installNodeRasterCodec(): void {
  if (installed) return
  installed = true
  setHeadlessRasterDecoder(decodeNodeRaster)
  setHeadlessPngEncoder(encodeNodeRgbaPng)
}

/**
 * Decodes PNG, JPEG, or BMP (including a BMP file header) to RGBA.
 * Returns `undefined` for anything else so the entity stays a placeholder.
 */
export function decodeNodeRaster(
  bytes: Uint8Array,
  mime = ''
): NodeRasterImage | undefined {
  const kind = sniffRaster(bytes, mime)
  if (!kind) return undefined
  try {
    if (kind === 'png') {
      const png = PNG.sync.read(Buffer.from(bytes))
      return {
        width: png.width,
        height: png.height,
        data: Uint8Array.from(png.data)
      }
    }
    if (kind === 'jpeg') {
      const decoded = decodeJpeg(Buffer.from(bytes), {
        useTArray: true,
        formatAsRGBA: true
      })
      return {
        width: decoded.width,
        height: decoded.height,
        data: Uint8Array.from(decoded.data)
      }
    }
    const decoded = decodeRgba(Buffer.from(bytes))
    return {
      width: decoded.width,
      height: decoded.height,
      data: Uint8Array.from(decoded.data)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[cad-html-exporter] raster decode failed: ${message}`)
    return undefined
  }
}

/** Encodes top-down RGBA to a PNG file. */
export function encodeNodeRgbaPng(image: {
  width: number
  height: number
  data: ArrayLike<number>
}): Uint8Array | undefined {
  if (image.width < 1 || image.height < 1) return undefined
  const png = new PNG({ width: image.width, height: image.height })
  const expected = image.width * image.height * 4
  for (let i = 0; i < expected; i++) {
    png.data[i] = image.data[i] ?? 0
  }
  return Uint8Array.from(PNG.sync.write(png))
}

function sniffRaster(
  bytes: Uint8Array,
  mime: string
): 'png' | 'jpeg' | 'bmp' | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png'
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpeg'
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'bmp'
  }
  const type = mime.toLowerCase()
  if (type.includes('png')) return 'png'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpeg'
  if (type.includes('bmp') || type.includes('bitmap')) return 'bmp'
  return undefined
}
