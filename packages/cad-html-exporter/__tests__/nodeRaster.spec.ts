import { encodeTextureForExport } from '@mlightcad/cad-html-core'
import { encode as encodeJpeg } from 'jpeg-js'
import { PNG } from 'pngjs'
import * as THREE from 'three'

import {
  decodeNodeRaster,
  installNodeRasterCodec
} from '../src/nodeRaster'

describe('decodeNodeRaster', () => {
  it('decodes PNG to top-down RGBA', () => {
    const png = makePng(2, 1, [255, 0, 0, 255, 0, 255, 0, 128])
    const image = decodeNodeRaster(png, 'image/png')
    expect(image).toEqual({
      width: 2,
      height: 1,
      data: Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 128])
    })
  })

  it('decodes JPEG', () => {
    const jpeg = makeJpeg(1, 1, [10, 20, 30, 255])
    const image = decodeNodeRaster(jpeg, 'image/jpeg')
    expect(image?.width).toBe(1)
    expect(image?.height).toBe(1)
    expect(image?.data.length).toBe(4)
  })

  it('decodes a BMP file', () => {
    const bmp = makeBmp24(1, 1, [0, 255, 0])
    const image = decodeNodeRaster(bmp, 'image/bmp')
    expect(image?.width).toBe(1)
    expect(image?.height).toBe(1)
    expect(image?.data[1]).toBe(255)
    expect(image?.data[3]).toBe(255)
  })

  it('returns undefined for unsupported bytes', () => {
    expect(decodeNodeRaster(new Uint8Array([1, 2, 3, 4]), '')).toBeUndefined()
  })
})

describe('headless texture export', () => {
  it('writes a data texture to PNG without document', () => {
    expect(typeof document).toBe('undefined')
    installNodeRasterCodec()
    const decoded = decodeNodeRaster(
      makePng(1, 1, [255, 0, 0, 255]),
      'image/png'
    )!
    const texture = new THREE.DataTexture(
      decoded.data,
      decoded.width,
      decoded.height,
      THREE.RGBAFormat
    )
    const exported = encodeTextureForExport(texture)
    expect(exported?.mimeType).toBe('image/png')
    const again = decodeNodeRaster(exported!.bytes, 'image/png')
    expect(again).toEqual({
      width: 1,
      height: 1,
      data: Uint8Array.from([255, 0, 0, 255])
    })
  })
})

function makePng(width: number, height: number, rgba: number[]): Uint8Array {
  const png = new PNG({ width, height })
  for (let i = 0; i < rgba.length; i++) {
    png.data[i] = rgba[i]!
  }
  return Uint8Array.from(PNG.sync.write(png))
}

function makeJpeg(
  width: number,
  height: number,
  rgba: number[]
): Uint8Array {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < rgba.length; i++) data[i] = rgba[i]!
  return Uint8Array.from(encodeJpeg({ data, width, height }, 90).data)
}

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
