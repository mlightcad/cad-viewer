import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import {
  AcTrRenderer,
  getMaterialMetadata,
  setMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcTrInheritedLayerMaterialMapper } from '../src/view/AcTrInheritedLayerMaterialMapper'

describe('AcTrInheritedLayerMaterialMapper', () => {
  it('remaps layer-0 ByLayer materials to the INSERT layer', () => {
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0',
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false,
      isForeground: false
    })

    const reboundMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    setMaterialMetadata(reboundMaterial, {
      layer: 'INSERT',
      materialKey: 'insert',
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false,
      isForeground: false
    })

    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)
    const renderer = {
      getLayerBoundMaterial
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () =>
        ({
          layer: 'INSERT'
        }) as Partial<AcGiSubEntityTraits>,
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), sourceMaterial)
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    expect(mesh.userData.layerName).toBe('INSERT')
    expect(mesh.material).toBe(reboundMaterial)
    expect(mesh.userData.styleMaterialId).toBe(reboundMaterial.id)
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })

  it('skips explicit foreground materials on layer 0', () => {
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'fg',
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false,
      isForeground: true
    })

    const getLayerBoundMaterial = jest.fn()
    const renderer = {
      getLayerBoundMaterial
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () => ({ layer: 'INSERT' }),
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), sourceMaterial)
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    expect(mesh.userData.layerName).toBe('INSERT')
    expect(mesh.material).toBe(sourceMaterial)
    expect(getLayerBoundMaterial).not.toHaveBeenCalled()
  })

  it('remaps layer-0 foreground materials with other ByLayer bindings', () => {
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0-lw',
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: true,
      isByLayerTransparency: false,
      isForeground: true
    })

    const reboundMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)
    const renderer = {
      getLayerBoundMaterial
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () => ({ layer: 'INSERT' }),
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), sourceMaterial)
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    expect(mesh.material).toBe(reboundMaterial)
    expect(getMaterialMetadata(sourceMaterial).isByLayerColor).toBe(true)
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })

  it('sets styleMaterialId when remapping array materials', () => {
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0',
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false,
      isForeground: false
    })

    const reboundMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const renderer = {
      getLayerBoundMaterial: jest.fn(() => reboundMaterial)
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () => ({ layer: 'INSERT' }),
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), [
      sourceMaterial,
      sourceMaterial
    ])
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    expect(mesh.userData.styleMaterialId).toBe(reboundMaterial.id)
  })

  it('clears styleMaterialId when array materials remap to different ids', () => {
    const sourceMaterialA = new THREE.LineBasicMaterial({ color: 0xffffff })
    const sourceMaterialB = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    setMaterialMetadata(sourceMaterialA, {
      layer: '0',
      materialKey: 'layer0-a',
      isByLayerColor: true,
      isForeground: false
    })
    setMaterialMetadata(sourceMaterialB, {
      layer: '0',
      materialKey: 'layer0-b',
      isByLayerColor: true,
      isForeground: false
    })

    const reboundMaterialA = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const reboundMaterialB = new THREE.LineBasicMaterial({ color: 0x0000ff })
    const renderer = {
      getLayerBoundMaterial: jest.fn((material: THREE.Material) =>
        material === sourceMaterialA ? reboundMaterialA : reboundMaterialB
      )
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () => ({ layer: 'INSERT' }),
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), [
      sourceMaterialA,
      sourceMaterialB
    ])
    mesh.userData.layerName = '0'
    mesh.userData.styleMaterialId = sourceMaterialA.id

    mapper.remap([mesh], '0', 'INSERT')

    expect(mesh.userData.styleMaterialId).toBeUndefined()
    expect(mesh.material).toEqual([reboundMaterialA, reboundMaterialB])
  })
})
