import {
  AcCmColor,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import {
  AcTrRenderer,
  AcTrStyleManager,
  getMaterialMetadata,
  setMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcTrSubEntityTraitsUtil } from '../../three-renderer/src/util/AcTrEntityTraitsUtil'
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

  it('keeps explicit foreground colour on layer 0 when other traits are ByLayer', () => {
    // Regression: the ASD96 title frame (block content on layer "0", explicit
    // ACI 7 colour, ByLayer lineweight/transparency) was promoted to ByLayer
    // colour and inherited layer "1"'s red, so three frame edges rendered red
    // instead of white.
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0-lw',
      isByLayerColor: false,
      isByLayerLineType: false,
      isByLayerLineWeight: true,
      isByLayerTransparency: true,
      isForeground: true
    })

    const getLayerBoundMaterial = jest.fn()
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

    expect(mesh.material).toBe(sourceMaterial)
    expect(getMaterialMetadata(sourceMaterial).isByLayerColor).toBe(false)
    expect(getLayerBoundMaterial).not.toHaveBeenCalled()
  })

  it('promotes layer-0 foreground materials whose colour binding was lost', () => {
    // Conversion paths can drop `isByLayerColor` while keeping the other
    // ByLayer markers; those colours must still inherit the INSERT layer.
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0-lost',
      isByLayerLineWeight: true,
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

  describe('with the real style cache', () => {
    /** Layer "1" resolves to ACI 1 (red), like the ASD96 title frame's INSERT. */
    const redLayer = (): Partial<AcGiSubEntityTraits> => {
      const color = new AcCmColor()
      color.setRGB(255, 0, 0)
      return { layer: '1', color }
    }

    /**
     * Builds the layer-0 ACI-7 line material exactly as the renderer does: an
     * explicit foreground colour plus ByLayer lineweight/linetype/transparency.
     */
    const buildLayerZeroFrameMaterial = (manager: AcTrStyleManager) => {
      const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
      traits.layer = '0'
      // ACI 7 = explicit foreground (white on a dark canvas), as authored on
      // the ASD96 frame polyline.
      traits.color.setForeground()
      traits.lineWeight = AcGiLineWeight.ByLayer
      traits.lineType = { type: 'ByLayer' } as AcGiSubEntityTraits['lineType']
      const material = manager.getLineMaterial(traits)
      expect(getMaterialMetadata(material).isForeground).toBe(true)
      return material
    }

    it('keeps the layer-0 frame white inside a red-layer INSERT', () => {
      const manager = new AcTrStyleManager()
      const renderer = {
        getLayerBoundMaterial: (
          material: THREE.Material,
          layerName: string,
          traits?: Partial<AcGiSubEntityTraits>
        ) => manager.getLayerBoundMaterial(material, layerName, traits)
      } as unknown as AcTrRenderer

      const mapper = new AcTrInheritedLayerMaterialMapper(redLayer, renderer)

      const sourceMaterial = buildLayerZeroFrameMaterial(manager)
      expect(getMaterialMetadata(sourceMaterial).isByLayerColor).toBe(false)

      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        sourceMaterial
      ) as THREE.Line & { userData: Record<string, unknown> }
      line.userData.layerName = '0'

      mapper.remap([line], '0', '1')

      const resolved = line.material as THREE.LineBasicMaterial
      // White (ACI 7 foreground on a dark canvas), never the layer's red.
      expect(resolved.color.getHex()).not.toBe(0xff0000)
      expect(getMaterialMetadata(resolved).isByLayerColor).toBe(false)
      expect(getMaterialMetadata(resolved).isForeground).toBe(true)
    })

    it('still inherits the INSERT layer for genuinely ByLayer layer-0 colours', () => {
      const manager = new AcTrStyleManager()
      const renderer = {
        getLayerBoundMaterial: (
          material: THREE.Material,
          layerName: string,
          traits?: Partial<AcGiSubEntityTraits>
        ) => manager.getLayerBoundMaterial(material, layerName, traits)
      } as unknown as AcTrRenderer

      const mapper = new AcTrInheritedLayerMaterialMapper(redLayer, renderer)

      const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
      traits.layer = '0'
      traits.color.setByLayer()

      const sourceMaterial = manager.getLineMaterial(traits)
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        sourceMaterial
      ) as THREE.Line & { userData: Record<string, unknown> }
      line.userData.layerName = '0'

      mapper.remap([line], '0', '1')

      expect((line.material as THREE.LineBasicMaterial).color.getHex()).toBe(
        0xff0000
      )
    })
  })
})
