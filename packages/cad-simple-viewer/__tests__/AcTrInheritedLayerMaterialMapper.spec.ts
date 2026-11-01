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

  it('repairs layer-0 foreground materials whose colour binding was lost', () => {
    // Legacy conversion paths can drop `isByLayerColor` entirely while other
    // ByLayer markers survive. Such a material is still layer-bound, so it must
    // inherit the INSERT layer (and the repair promotes it for future updates).
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0-lw',
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

  it('keeps an explicit ACI-7 colour on layer 0 inside a coloured INSERT', () => {
    // Regression (ASD96 title frame): an explicit ACI-7 polyline with ByLayer
    // lineweight was promoted to ByLayer colour and rendered in the INSERT
    // layer's red. With truthful `isByLayerColor` metadata it must stay white.
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0-explicit-aci7',
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: true,
      isByLayerTransparency: false,
      isForeground: true,
      // Provenance is what makes `isByLayerColor: false` authoritative.
      hasColorProvenance: true
    })

    const getLayerBoundMaterial = jest.fn(
      (material: THREE.Material) => material
    )
    const renderer = {
      getLayerBoundMaterial
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () =>
        ({
          layer: 'INSERT',
          color: { isForeground: false, RGB: 0xff0000 }
        }) as Partial<AcGiSubEntityTraits>,
      renderer
    )

    const mesh = new THREE.Line(new THREE.BufferGeometry(), sourceMaterial)
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    // The colour is explicitly ACI-7, so the material must not be promoted to
    // ByLayer and must not be rebound to the red INSERT layer material.
    expect(getMaterialMetadata(sourceMaterial).isByLayerColor).toBe(false)
    expect(getLayerBoundMaterial).not.toHaveBeenCalled()
    expect(mesh.material).toBe(sourceMaterial)
    expect((sourceMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xffffff
    )
  })

  it('does not promote absolute non-foreground colour when only lineweight is ByLayer', () => {
    // Regression: legend header hatch (ACI 251 gray on layer 0) was promoted to
    // ByLayer colour and inherited the INSERT layer's ACI 7 → solid white header.
    const sourceMaterial = new THREE.MeshBasicMaterial({ color: 0x5b5b5b })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'legend-header',
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: true,
      isByLayerTransparency: false,
      isForeground: false
    })

    const getLayerBoundMaterial = jest.fn(
      (material: THREE.Material) => material
    )
    const renderer = {
      getLayerBoundMaterial
    } as unknown as AcTrRenderer

    const mapper = new AcTrInheritedLayerMaterialMapper(
      () =>
        ({
          layer: 'INSERT',
          color: { isForeground: true, RGB: 0xffffff }
        }) as Partial<AcGiSubEntityTraits>,
      renderer
    )

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sourceMaterial)
    mesh.userData.layerName = '0'

    mapper.remap([mesh], '0', 'INSERT')

    expect(getMaterialMetadata(sourceMaterial).isByLayerColor).toBe(false)
    expect(getLayerBoundMaterial).toHaveBeenCalled()
    const promoted = getLayerBoundMaterial.mock.calls[0][0] as THREE.Material
    expect(getMaterialMetadata(promoted).isByLayerColor).toBe(false)
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
