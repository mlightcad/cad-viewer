import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
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
      .mockImplementation(() => new THREE.Texture())
  })

  afterEach(() => {
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

  it('owns image resources until source release and ignores late texture completion', async () => {
    const texture = new THREE.Texture()
    let loaded!: () => void
    jest
      .mocked(THREE.TextureLoader.prototype.load)
      .mockImplementation((_url, onLoad) => {
        loaded = () => onLoad?.(texture)
        return texture
      })
    const context = new AcTrRenderContext()
    const image = new AcTrImage(
      new Blob(['image'], { type: 'image/png' }),
      {
        boundary: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 5 },
          { x: 0, y: 5 }
        ]
      } as never,
      context
    )
    const mesh = image.children[0] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >
    const geometryDisposed = jest.spyOn(mesh.geometry, 'dispose')
    const materialDisposed = jest.spyOn(mesh.material, 'dispose')
    const textureDisposed = jest.spyOn(texture, 'dispose')
    const clone = image.fastDeepClone()
    image.dispose()
    clone.dispose()
    expect(geometryDisposed).not.toHaveBeenCalled()
    expect(materialDisposed).not.toHaveBeenCalled()
    expect(textureDisposed).not.toHaveBeenCalled()

    context.dispose()
    context.dispose()
    loaded()
    await image.asyncDraw()
    expect(geometryDisposed).toHaveBeenCalledTimes(1)
    expect(materialDisposed).toHaveBeenCalledTimes(1)
    expect(textureDisposed).toHaveBeenCalledTimes(1)
    expect(mesh.material.map).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-image')
  })

  it('preserves a source texture when disposing a highlighted material clone', async () => {
    const texture = new THREE.Texture()
    let loaded!: () => void
    jest
      .mocked(THREE.TextureLoader.prototype.load)
      .mockImplementation((_url, onLoad) => {
        loaded = () => onLoad?.(texture)
        return texture
      })
    const context = new AcTrRenderContext()
    const image = new AcTrImage(
      new Blob(['image'], { type: 'image/png' }),
      {
        boundary: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 5 },
          { x: 0, y: 5 }
        ]
      } as never,
      context
    )
    loaded()
    await image.asyncDraw()
    const clone = image.fastDeepClone()
    const leaf = clone.children[0] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >
    leaf.material = leaf.material.clone()
    const materialDisposed = jest.spyOn(leaf.material, 'dispose')
    const textureDisposed = jest.spyOn(texture, 'dispose')
    clone.dispose()
    expect(materialDisposed).toHaveBeenCalledTimes(1)
    expect(textureDisposed).not.toHaveBeenCalled()
    context.dispose()
    expect(textureDisposed).toHaveBeenCalledTimes(1)
  })
})
