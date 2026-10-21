import { encode as encodeJpeg } from 'jpeg-js'
import { PNG } from 'pngjs'

import { extractDrawingPreviewJpeg } from '../src/extractPreviewJpeg'

describe('extractDrawingPreviewJpeg', () => {
  it('returns undefined for empty input', () => {
    expect(extractDrawingPreviewJpeg(undefined)).toBeUndefined()
    expect(extractDrawingPreviewJpeg(null)).toBeUndefined()
    expect(extractDrawingPreviewJpeg(new Uint8Array())).toBeUndefined()
  })

  it('passes through JPEG thumbnails', () => {
    const jpeg = makeJpeg(2, 2, [0, 128, 255, 255])
    const out = extractDrawingPreviewJpeg(jpeg)
    expect(out).toBeDefined()
    expect(out![0]).toBe(0xff)
    expect(out![1]).toBe(0xd8)
    expect(out![2]).toBe(0xff)
    expect(Array.from(out!)).toEqual(Array.from(jpeg))
  })

  it('converts PNG thumbnails to JPEG', () => {
    const png = makePng(2, 2, [255, 0, 0, 255])
    const out = extractDrawingPreviewJpeg(png)
    expect(out).toBeDefined()
    expect(out![0]).toBe(0xff)
    expect(out![1]).toBe(0xd8)
    expect(out![2]).toBe(0xff)
  })

  it('converts BMP file thumbnails to JPEG', () => {
    const bmp = makeBmp24(2, 2, [0, 255, 0])
    const out = extractDrawingPreviewJpeg(bmp)
    expect(out).toBeDefined()
    expect(out![0]).toBe(0xff)
    expect(out![1]).toBe(0xd8)
    expect(out![2]).toBe(0xff)
  })

  it('converts DIB (headerless) thumbnails to JPEG', () => {
    const bmp = makeBmp24(2, 2, [0, 0, 255])
    // Drop BITMAPFILEHEADER — AutoCAD often stores DIB only.
    const dib = bmp.subarray(14)
    const out = extractDrawingPreviewJpeg(dib)
    expect(out).toBeDefined()
    expect(out![0]).toBe(0xff)
    expect(out![1]).toBe(0xd8)
    expect(out![2]).toBe(0xff)
  })

  it('returns undefined for garbage payloads', () => {
    expect(
      extractDrawingPreviewJpeg(new Uint8Array([1, 2, 3, 4, 5]))
    ).toBeUndefined()
  })
})

function makeJpeg(
  width: number,
  height: number,
  rgba: number[]
): Uint8Array {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0]!
    data[i * 4 + 1] = rgba[1]!
    data[i * 4 + 2] = rgba[2]!
    data[i * 4 + 3] = rgba[3]!
  }
  const encoded = encodeJpeg({ data, width, height }, 90)
  return Uint8Array.from(encoded.data)
}

function makePng(width: number, height: number, rgba: number[]): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = rgba[0]!
    png.data[i * 4 + 1] = rgba[1]!
    png.data[i * 4 + 2] = rgba[2]!
    png.data[i * 4 + 3] = rgba[3]!
  }
  return Uint8Array.from(PNG.sync.write(png))
}

/** Minimal bottom-up 24-bit BI_RGB BMP. `bgr` is one pixel color repeated. */
function makeBmp24(width: number, height: number, bgr: number[]): Uint8Array {
  const rowBytes = ((width * 3 + 3) >> 2) << 2
  const pixelBytes = rowBytes * height
  const fileSize = 54 + pixelBytes
  const out = new Uint8Array(fileSize)
  const view = new DataView(out.buffer)

  out[0] = 0x42
  out[1] = 0x4d
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelBytes, true)

  for (let y = 0; y < height; y++) {
    const row = 54 + y * rowBytes
    for (let x = 0; x < width; x++) {
      const i = row + x * 3
      out[i] = bgr[0]!
      out[i + 1] = bgr[1]!
      out[i + 2] = bgr[2]!
    }
  }
  return out
}
