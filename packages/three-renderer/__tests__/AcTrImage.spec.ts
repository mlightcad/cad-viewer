import * as THREE from 'three'

import { expectWcsBboxEmpty } from './helpers/expectWcsBbox'
import { AcTrImage } from '../src/object/AcTrImage'
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
      .mockImplementation(function load(this: THREE.TextureLoader) {
        return new THREE.Texture()
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('leaves wcsBbox empty because raster bounds are tracked separately', () => {
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

    expectWcsBboxEmpty(image.wcsBbox)
  })
})
