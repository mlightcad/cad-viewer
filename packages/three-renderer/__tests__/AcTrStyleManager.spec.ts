import { AcCmColor } from '@mlightcad/data-model'
import * as THREE from 'three'

import { getMaterialMetadata } from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('AcTrStyleManager', () => {
  it('binds inherited materials onto the effective layer for later layer updates', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()
    traits.rgbColor = 0xff0000

    const layerZeroMaterial = styleManager.getLineMaterial(traits)
    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const roadMaterial = styleManager.getLayerBoundMaterial(
      layerZeroMaterial,
      'ROAD',
      {
        layer: 'ROAD',
        color: yellow,
        rgbColor: yellow.RGB
      }
    )

    expect(roadMaterial).toBeDefined()
    expect(roadMaterial).not.toBe(layerZeroMaterial)
    const roadMetadata = getMaterialMetadata(roadMaterial!)
    expect(roadMetadata.layer).toBe('ROAD')
    expect('isByLayer' in roadMetadata).toBe(false)
    expect(roadMetadata.isByLayerColor).toBe(true)
    expect((roadMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xffff00
    )

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const remappedUpdates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: green,
      rgbColor: green.RGB
    })
    const updatedRoadMaterial = remappedUpdates[roadMaterial!.id]

    expect(updatedRoadMaterial).toBeDefined()
    expect(
      (updatedRoadMaterial as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x00ff00)

    const blue = new AcCmColor()
    blue.setRGB(0, 0, 255)
    const layerZeroUpdates = styleManager.updateLayerMaterial('0', {
      layer: '0',
      color: blue,
      rgbColor: blue.RGB
    })
    const updatedLayerZeroMaterial = layerZeroUpdates[layerZeroMaterial.id]

    expect(updatedLayerZeroMaterial).toBeDefined()
    expect(
      (updatedLayerZeroMaterial as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x0000ff)
    expect(updatedLayerZeroMaterial).not.toBe(updatedRoadMaterial)
  })

  it('refreshes ByLayer color even when material already targets the effective layer', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setByLayer()
    traits.rgbColor = 0xffffff

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(original.color.getHex()).toBe(0xffffff)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const refreshed = styleManager.getLayerBoundMaterial(original, 'ROAD', {
      layer: 'ROAD',
      color: yellow,
      rgbColor: yellow.RGB
    }) as THREE.LineBasicMaterial

    expect(refreshed.color.getHex()).toBe(0xffff00)
  })

  it('separates hatch fills from linework-tier fill meshes via drawOrder', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const hatchTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    hatchTraits.layer = 'A-WALL'
    hatchTraits.color = new AcCmColor().setForeground()
    hatchTraits.rgbColor = 0xffffff
    hatchTraits.drawOrder = -1

    const lineworkFillTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    lineworkFillTraits.layer = 'A-WALL'
    lineworkFillTraits.color = new AcCmColor().setForeground()
    lineworkFillTraits.rgbColor = 0xffffff
    lineworkFillTraits.drawOrder = 0

    const hatchMaterial = styleManager.getFillMaterial(
      hatchTraits
    ) as THREE.MeshBasicMaterial
    const lineworkFillMaterial = styleManager.getFillMaterial(
      lineworkFillTraits
    ) as THREE.MeshBasicMaterial

    expect(hatchMaterial).not.toBe(lineworkFillMaterial)

    const hatchMetadata = getMaterialMetadata(hatchMaterial)
    expect(hatchMetadata.drawOrder).toBe(-1)
    expect(hatchMetadata.isBackgroundFill).toBe(true)
    expect(hatchMetadata.isForeground).toBe(false)
    expect(hatchMaterial.color.getHex()).toBe(0xffffff)

    const lineworkFillMetadata = getMaterialMetadata(lineworkFillMaterial)
    expect(lineworkFillMetadata.drawOrder).toBe(0)
    expect(lineworkFillMetadata.isForeground).toBe(true)
    expect(lineworkFillMetadata.isBackgroundFill).toBe(false)
    expect(lineworkFillMaterial.color.getHex()).toBe(0x000000)
  })

  it('keeps patterned foreground hatches as visible shader linework', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-HATCH'
    traits.color = new AcCmColor().setForeground()
    traits.rgbColor = 0xffffff
    traits.drawOrder = -1
    traits.fillType = {
      solidFill: false,
      patternAngle: 0,
      definitionLines: [
        {
          angle: Math.PI / 4,
          base: { x: 0, y: 0 },
          offset: { x: 0, y: 3.175 },
          dashLengths: []
        }
      ]
    }

    const material = styleManager.getFillMaterial(
      traits
    ) as THREE.ShaderMaterial

    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
    expect(material.uniforms.u_color.value.getHex()).toBe(0x000000)

    const metadata = getMaterialMetadata(material)
    expect(metadata.drawOrder).toBe(-1)
    expect(metadata.isBackgroundFill).toBe(false)
    expect(metadata.isForeground).toBe(true)
  })

  it('creates gradient hatch shader materials with per-boundary uniforms', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-GRAD'
    traits.rgbColor = 0xff0000
    traits.drawOrder = -1
    traits.fillType = {
      solidFill: false,
      patternAngle: 0,
      definitionLines: [],
      gradient: {
        name: 'LINEAR',
        angle: Math.PI / 4,
        shift: 0.25,
        oneColorMode: false,
        shadeTintValue: 0,
        endColor: 0x0000ff
      }
    }

    const material = styleManager.getFillMaterial(traits, new THREE.Vector2(), {
      minX: 1,
      minY: 2,
      maxX: 5,
      maxY: 8
    }) as THREE.ShaderMaterial
    const otherBoundsMaterial = styleManager.getFillMaterial(
      traits,
      new THREE.Vector2(),
      { minX: 0, minY: 0, maxX: 5, maxY: 8 }
    )

    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
    expect(material).not.toBe(otherBoundsMaterial)
    expect(material.vertexShader).toContain('attribute vec2 gradientPosition')
    expect(material.uniforms.u_startColor.value.getHex()).toBe(0xff0000)
    expect(material.uniforms.u_endColor.value.getHex()).toBe(0x0000ff)
    expect(material.uniforms.u_angle.value).toBeCloseTo(Math.PI / 4)
    expect(material.uniforms.u_shift.value).toBeCloseTo(0.25)

    const metadata = getMaterialMetadata(material)
    expect(metadata.drawOrder).toBe(-1)
    expect(metadata.isBackgroundFill).toBe(false)
  })
})
