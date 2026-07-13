import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  getMaterialMetadata,
  setMaterialMetadata
} from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('AcTrStyleManager', () => {
  it('preserves entity color when updateLayerMaterial receives layer name only', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setRGB(255, 0, 0)

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(original.color.getHex()).toBe(0xff0000)

    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD'
    })
    const updated = updates[original.id] as THREE.LineBasicMaterial

    expect(updated).toBeDefined()
    expect(updated.color.getHex()).toBe(0xff0000)
  })

  it('binds inherited materials onto the effective layer for later layer updates', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()

    const layerZeroMaterial = styleManager.getLineMaterial(traits)
    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const roadMaterial = styleManager.getLayerBoundMaterial(
      layerZeroMaterial,
      'ROAD',
      {
        layer: 'ROAD',
        color: yellow
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
      color: green
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
      color: blue
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

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    expect(original.color.getHex()).toBe(0xffffff)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    const refreshed = styleManager.getLayerBoundMaterial(original, 'ROAD', {
      layer: 'ROAD',
      color: yellow
    }) as THREE.LineBasicMaterial

    expect(refreshed.color.getHex()).toBe(0xffff00)
  })

  it('does not share materials between ByLayer and explicit colours that resolve to the same rgb', () => {
    const styleManager = new AcTrStyleManager()
    const byLayerTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    byLayerTraits.layer = 'ROAD'
    byLayerTraits.color.setByLayer()

    const explicitTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    explicitTraits.layer = 'ROAD'
    explicitTraits.color.setRGB(255, 0, 0)

    const byLayerMaterial = styleManager.getLineMaterial(byLayerTraits)
    const explicitMaterial = styleManager.getLineMaterial(explicitTraits)

    expect(byLayerMaterial).not.toBe(explicitMaterial)

    const layerColor = new AcCmColor()
    layerColor.setRGB(255, 0, 0)
    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: layerColor
    })

    expect(updates[byLayerMaterial.id]).toBe(byLayerMaterial)
    expect((byLayerMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xff0000
    )
    expect((explicitMaterial as THREE.LineBasicMaterial).color.getHex()).toBe(
      0xff0000
    )
  })

  it('does not share materials across layers for the same explicit colour', () => {
    const styleManager = new AcTrStyleManager()
    const roadTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    roadTraits.layer = 'ROAD'
    roadTraits.color.setRGB(255, 0, 0)

    const wallTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    wallTraits.layer = 'WALL'
    wallTraits.color.setRGB(255, 0, 0)

    const roadMaterial = styleManager.getLineMaterial(roadTraits)
    const wallMaterial = styleManager.getLineMaterial(wallTraits)

    expect(roadMaterial).not.toBe(wallMaterial)
  })

  it('refreshes ByLayer line materials in place when the layer colour changes', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'Wall'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    const red = new AcCmColor()
    red.setRGB(255, 0, 0)
    const updates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red
    })
    const refreshed = updates[original.id] as THREE.LineBasicMaterial

    expect(refreshed).toBe(original)
    expect(refreshed.color.getHex()).toBe(0xff0000)

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const secondUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: green
    })

    expect(secondUpdates[original.id]).toBe(original)
    expect(refreshed.color.getHex()).toBe(0x00ff00)
  })

  it('updates layer materials when traits still carry ByLayer color but metadata lost the flag', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'ROAD'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    setMaterialMetadata(original, { isByLayerColor: false })

    const green = new AcCmColor()
    green.setRGB(0, 255, 0)
    const updates = styleManager.updateLayerMaterial('ROAD', {
      layer: 'ROAD',
      color: green
    })
    const updated = updates[original.id] as THREE.LineBasicMaterial

    expect(updated).toBeDefined()
    expect(updated.color.getHex()).toBe(0x00ff00)
  })

  it('preserves ByLayer resolved colour when lineweight change remaps the material key', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'Wall'
    traits.color.setByLayer()

    const original = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial

    const red = new AcCmColor()
    red.setRGB(255, 0, 0)
    const colorUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red
    })
    expect(
      (colorUpdates[original.id] as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0xff0000)

    const weightUpdates = styleManager.updateLayerMaterial('Wall', {
      layer: 'Wall',
      color: red.clone(),
      lineWeight: AcGiLineWeight.LineWeight070
    })
    const remapped = weightUpdates[original.id] as THREE.LineBasicMaterial

    expect(remapped).toBeDefined()
    expect(remapped).not.toBe(original)
    expect(remapped.color.getHex()).toBe(0xff0000)
  })

  it('remaps layer-0 foreground ByLayer materials to inherited INSERT layer color', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0x000000
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = '0'
    traits.color.setByLayer()
    traits.color.setForeground()

    const layerZeroMaterial = styleManager.getLineMaterial(
      traits
    ) as THREE.LineBasicMaterial
    const metadata = getMaterialMetadata(layerZeroMaterial)
    expect(metadata.isForeground).toBe(true)
    expect(metadata.isByLayerColor).toBe(false)

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    setMaterialMetadata(layerZeroMaterial, { isByLayerColor: true })

    const inherited = styleManager.getLayerBoundMaterial(
      layerZeroMaterial,
      'TestLayer1',
      {
        layer: 'TestLayer1',
        color: yellow
      }
    ) as THREE.LineBasicMaterial

    expect(inherited.color.getHex()).toBe(0xffff00)
    expect(getMaterialMetadata(inherited).isForeground).toBe(false)
  })

  it('solid foreground hatches invert with the theme like linework', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const hatchTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    hatchTraits.layer = 'A-WALL'
    hatchTraits.color = new AcCmColor().setForeground()
    hatchTraits.drawOrder = -1

    const lineworkFillTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    lineworkFillTraits.layer = 'A-WALL'
    lineworkFillTraits.color = new AcCmColor().setForeground()
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
    expect(hatchMetadata.isBackgroundFill).toBe(false)
    expect(hatchMetadata.isForeground).toBe(true)
    expect(hatchMaterial.color.getHex()).toBe(0x000000)

    const lineworkFillMetadata = getMaterialMetadata(lineworkFillMaterial)
    expect(lineworkFillMetadata.drawOrder).toBe(0)
    expect(lineworkFillMetadata.isForeground).toBe(true)
    expect(lineworkFillMetadata.isBackgroundFill).toBe(false)
    expect(lineworkFillMaterial.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    expect(hatchMaterial.color.getHex()).toBe(0xffffff)
    expect(lineworkFillMaterial.color.getHex()).toBe(0xffffff)
  })

  it('keeps patterned foreground hatches as visible shader linework', () => {
    // Patterned hatches differ from solid foreground fills: their visible
    // component is the pattern lines themselves, which behave like linework
    // and must stay legible against both canvases. So they invert with the
    // theme (foreground tracking) instead of fusing with the bg.
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-HATCH'
    traits.color = new AcCmColor().setForeground()
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

  it('solid hatch with explicit truecolor stays at literal RGB across themes', () => {
    // A DWG author who picked an explicit RGB via the truecolor picker
    // (e.g. 255,255,255 from the colour palette) gets a literal hatch.
    // `traits.color.isForeground` is only true for the ACI 7 / foreground
    // pseudo-colour, so an explicit truecolor is not repainted by theme flips.
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-WALL'
    // Explicit truecolor — NOT foreground.
    traits.color.setRGB(0x80, 0x80, 0x80)
    traits.drawOrder = -1

    const material = styleManager.getFillMaterial(
      traits
    ) as THREE.MeshBasicMaterial

    const metadata = getMaterialMetadata(material)
    expect(metadata.isBackgroundFill).toBe(false)
    expect(metadata.isForeground).toBe(false)
    expect(material.color.getHex()).toBe(0x808080)

    // Theme flip must not mutate the literal truecolor.
    styleManager.currentBackgroundColor = 0x000000
    expect(material.color.getHex()).toBe(0x808080)
  })

  it('creates a new patterned hatch material when pattern offset changes', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-HATCH'
    traits.color.setRGB(0, 255, 0)
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

    const material = styleManager.getFillMaterial(traits)
    traits.fillType.definitionLines[0].offset.y = 6.35
    const scaledMaterial = styleManager.getFillMaterial(traits)

    expect(scaledMaterial).toBeInstanceOf(THREE.ShaderMaterial)
    expect(scaledMaterial).not.toBe(material)
  })

  it('creates gradient hatch shader materials with per-boundary uniforms', () => {
    const styleManager = new AcTrStyleManager()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-GRAD'
    traits.color.setRGB(255, 0, 0)
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
