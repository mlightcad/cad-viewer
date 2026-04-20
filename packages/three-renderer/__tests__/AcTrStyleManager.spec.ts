import { AcCmColor } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('AcTrStyleManager', () => {
  it('remaps inherited materials onto the effective layer for later layer updates', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()
    traits.rgbColor = 0xff0000

    const layerZeroMaterial = styleManager.getLineMaterial(traits)
    const roadMaterial = styleManager.remapMaterialLayer(
      layerZeroMaterial,
      'ROAD'
    )

    expect(roadMaterial).toBeDefined()
    expect(roadMaterial).not.toBe(layerZeroMaterial)
    expect(roadMaterial?.userData.layer).toBe('ROAD')
    expect(roadMaterial?.userData.isByLayer).toBe(true)

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
})
