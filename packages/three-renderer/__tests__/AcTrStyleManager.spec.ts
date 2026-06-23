import { AcCmColor } from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  getMaterialMetadata,
  setMaterialMetadata
} from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('AcTrStyleManager', () => {
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

  it('solid foreground hatches fuse with the canvas bg (AutoCAD-aligned)', () => {
    // AutoCAD reference: a solid ACI 7 hatch is rendered as if painted with
    // the paper colour, so it fuses into both light and dark canvases and
    // only the overlaid wireframe remains visible. See
    // images-ex/hatch-bg-bug-refact-lee/autocad/tower-{light,dark}.png and
    // the "drawing" pair in the same folder for the reference visuals.
    //
    // Linework-tier fills (drawOrder >= 0 — wide polylines, MText glyphs)
    // are NOT hatches: they represent linework rasterized as a mesh and
    // must invert with the theme so ACI 7 stays legible.
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

    // Solid hatch and linework-tier fill must NOT share a cache slot —
    // otherwise the bg-tracked hatch material would be repainted by
    // `changeForeground` and vice-versa.
    expect(hatchMaterial).not.toBe(lineworkFillMaterial)

    const hatchMetadata = getMaterialMetadata(hatchMaterial)
    expect(hatchMetadata.drawOrder).toBe(-1)
    expect(hatchMetadata.isBackgroundFill).toBe(true)
    expect(hatchMetadata.isForeground).toBe(false)
    // Material is BORN with the current bg colour, not its trait RGB —
    // so a DWG opened in dark theme does not flash a white silhouette
    // before the first changeBackground call.
    expect(hatchMaterial.color.getHex()).toBe(0xffffff)

    const lineworkFillMetadata = getMaterialMetadata(lineworkFillMaterial)
    expect(lineworkFillMetadata.drawOrder).toBe(0)
    expect(lineworkFillMetadata.isForeground).toBe(true)
    expect(lineworkFillMetadata.isBackgroundFill).toBe(false)
    expect(lineworkFillMaterial.color.getHex()).toBe(0x000000)
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
    // pseudo-colour, so an explicit truecolor falls outside the bg-fuse
    // rule even when the picked RGB happens to match the canvas paper.
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

  it('repaints solid foreground hatches on theme flip', () => {
    // Lock the `_bgfill` cache partition + `isBackgroundFill` metadata
    // contract: changeBackground must walk these materials and repaint
    // them so the fuse-with-bg behaviour persists across theme flips.
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff

    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.layer = 'A-WALL'
    traits.color = new AcCmColor().setForeground()
    traits.drawOrder = -1

    const material = styleManager.getFillMaterial(
      traits
    ) as THREE.MeshBasicMaterial

    expect(material.color.getHex()).toBe(0xffffff)

    styleManager.currentBackgroundColor = 0x000000
    expect(material.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0xffffff
    expect(material.color.getHex()).toBe(0xffffff)
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
