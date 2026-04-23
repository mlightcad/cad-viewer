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
})
