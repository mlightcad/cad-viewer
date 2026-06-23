import {
  AcCmColor,
  ACGI_LIGHT_THEME_FOREGROUND,
  ACGI_PAPER_SPACE_BACKGROUND
} from '@mlightcad/data-model'
import * as THREE from 'three'

import { setMaterialMetadata } from '../src/style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'
import { AcTrMTextColorUtil } from '../src/util/AcTrMTextColorUtil'
import { MTextColor } from '@mlightcad/mtext-renderer'

describe('AcTrMTextColorUtil', () => {
  it('uses resolved traits rgb for ByLayer instead of hard-coded white', () => {
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.color.setRGB(0, 255, 0)

    const settings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      ACGI_PAPER_SPACE_BACKGROUND
    )

    expect(settings.byLayerColor).toBe(0x00ff00)
    expect(
      AcTrMTextColorUtil.resolveRgbColor(settings, ACGI_PAPER_SPACE_BACKGROUND)
    ).toBe(0x00ff00)
  })

  it('inverts ACI 7 on a light paper background', () => {
    const color = new AcCmColor()
    color.setForeground()

    const settings = {
      layer: '0',
      color: AcTrMTextColorUtil.toMTextColor(color),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }

    expect(
      AcTrMTextColorUtil.resolveRgbColor(settings, ACGI_PAPER_SPACE_BACKGROUND)
    ).toBe(ACGI_LIGHT_THEME_FOREGROUND)
  })

  it('keeps literal white RGB regardless of background', () => {
    const mtextColor = new MTextColor()
    mtextColor.rgbValue = 0xffffff

    const modelSpace = AcTrMTextColorUtil.toAcCmColor(mtextColor)
    expect(modelSpace.isForeground).toBe(false)
    expect(modelSpace.RGB).toBe(0xffffff)

    expect(
      AcTrMTextColorUtil.resolveRgbColor(
        {
          layer: '0',
          color: mtextColor,
          byLayerColor: 0xffffff,
          byBlockColor: 0xffffff
        },
        ACGI_PAPER_SPACE_BACKGROUND
      )
    ).toBe(0xffffff)
  })

  it('rematerializes text meshes from entity traits with ACI 7 foreground', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = ACGI_PAPER_SPACE_BACKGROUND

    const color = new AcCmColor()
    color.setForeground()
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'Viewport'
    })

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    root.add(mesh)

    AcTrMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    const material = mesh.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(ACGI_LIGHT_THEME_FOREGROUND)
    expect(material.userData.isForeground).toBe(true)
  })

  it('preserves inline ACI materials that differ from entity base traits', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = ACGI_PAPER_SPACE_BACKGROUND

    const entityColor = new AcCmColor()
    entityColor.setByLayer()
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: entityColor,
      layer: '0'
    })

    const inlineTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    inlineTraits.color.colorIndex = 1
    inlineTraits.layer = '0'
    const inlineMaterial = styleManager.getMTextFillMaterial(inlineTraits)

    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inlineMaterial)
    root.add(mesh)

    AcTrMTextColorUtil.rematerializeTextHierarchy(root, traits, styleManager)

    expect(mesh.material).toBe(inlineMaterial)
  })

  it('rematerializes ByLayer text materials bound to the wrong layer', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = ACGI_PAPER_SPACE_BACKGROUND

    const color = new AcCmColor()
    color.setRGB(0, 255, 0)
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color,
      layer: 'CARTOUCHE'
    })

    const wrongLayerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    setMaterialMetadata(wrongLayerMaterial, {
      layer: 'INSERT',
      materialKey: 'wrong-layer',
      isForeground: false,
      isByLayerColor: true,
      isByLayerLineType: false,
      isByLayerLineWeight: false,
      isByLayerTransparency: false
    })

    const foreignMesh = {
      type: 'Mesh',
      material: wrongLayerMaterial,
      traverse(fn: (object: THREE.Object3D) => void) {
        fn(this as unknown as THREE.Object3D)
      },
      children: []
    }

    AcTrMTextColorUtil.rematerializeTextHierarchy(
      foreignMesh as unknown as THREE.Object3D,
      traits,
      styleManager
    )

    const material = foreignMesh.material as THREE.MeshBasicMaterial
    expect(material).not.toBe(wrongLayerMaterial)
    expect(material.color.getHex()).toBe(0x00ff00)
    expect(material.userData.layer).toBe('CARTOUCHE')
  })

  it('normalizes numeric trait colours when snapshotting entity traits', () => {
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: 7 as never,
      layer: '0'
    })

    expect(traits.color.isForeground).toBe(true)
  })
})
