import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import {
  AcTrImage,
  setHeadlessRasterDecoder
} from '../src/object/AcTrImage'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'

describe('AcTrImage', () => {
  it('always unbatches without consulting policy', () => {
    expect(AcTrImage.prototype.resolveDrawMode.call({})).toBe('unbatch')
  })
})

describe('AcTrImage wcsBbox', () => {
  beforeEach(() => {
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image')
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    jest
      .spyOn(THREE.TextureLoader.prototype, 'load')
      .mockImplementation(() => new THREE.Texture())
  })

  afterEach(() => {
    setHeadlessRasterDecoder(undefined)
    jest.restoreAllMocks()
  })

  it('stores boundary bounds in wcsBbox for spatial picking', () => {
    const image = new AcTrImage(
      new Blob(['image-bytes'], { type: 'image/png' }),
      {
        boundary: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 5 },
          { x: 0, y: 5 }
        ]
      } as never,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(image.wcsBbox, [0, 0, 0], [10, 5, 0])
  })

  it('binds a data texture from the headless decoder', async () => {
    expect(typeof document).toBe('undefined')
    setHeadlessRasterDecoder(() => ({
      width: 2,
      height: 1,
      data: Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255])
    }))
    const image = new AcTrImage(
      new Blob(['image-bytes'], { type: 'image/png' }),
      {
        boundary: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 5 },
          { x: 0, y: 5 }
        ]
      } as never,
      new AcTrRenderContext()
    )

    await image.asyncDraw()

    const mesh = image.children[0] as THREE.Mesh
    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material.map).toBeInstanceOf(THREE.DataTexture)
    expect(material.opacity).toBe(1)
    const pixels = material.map?.image as { data: Uint8Array; width: number }
    expect(pixels.width).toBe(2)
    expect(Array.from(pixels.data)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255
    ])
  })
})
