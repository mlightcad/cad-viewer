import { AcCmColor } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrMTextColorUtil, AcTrSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): AcTrEntity {
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

describe('AcTrBatchedGroup layer text rematerialization', () => {
  it('rematerializeLayerTextDrawables uses stored explicit entity traits', () => {
    const styleManager = new AcTrStyleManager()
    const group = new AcTrBatchedGroup()

    const explicitColor = new AcCmColor()
    explicitColor.setRGB(255, 0, 0)
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: explicitColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    AcTrMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-1', placementRoot))

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: yellow
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: yellow
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0xff0000)
    expect(material.color.getHex()).not.toBe(0xffff00)
  })

  it('rematerializeLayerTextDrawables refreshes ByLayer text from stored traits', () => {
    const styleManager = new AcTrStyleManager()
    const group = new AcTrBatchedGroup()

    const byLayerColor = new AcCmColor()
    byLayerColor.setByLayer()
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    AcTrMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-2', placementRoot))

    const byLayerEntityTraits = {
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor.clone(),
      layer: 'TXT'
    }
    styleManager.getMTextFillMaterial(byLayerEntityTraits)

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const yellow = new AcCmColor()
    yellow.setRGB(255, 255, 0)
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: yellow
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: yellow
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0xffff00)
  })

  /**
   * Regression for #464: after batching flattens glyph entities, layer
   * colour refresh must resolve ACI-7 against the current background —
   * raw layer RGB is always white and would bake white-on-white text.
   */
  it('rematerializeLayerTextDrawables resolves ACI-7 ByLayer text against background (#464)', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.currentBackgroundColor = 0xffffff
    const group = new AcTrBatchedGroup()

    const byLayerColor = new AcCmColor()
    byLayerColor.setByLayer()
    const traits = AcTrMTextColorUtil.snapshotEntityTraits({
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor,
      layer: 'TXT'
    })

    const placementRoot = new THREE.Group()
    AcTrMTextColorUtil.storeTextEntityTraitsOnDrawable(placementRoot, traits)
    getSceneDrawableUserData(placementRoot).noBatch = true
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    placementRoot.add(mesh)

    group.addEntity(createEntity('text-aci7', placementRoot))

    const byLayerEntityTraits = {
      ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
      color: byLayerColor.clone(),
      layer: 'TXT'
    }
    styleManager.getMTextFillMaterial(byLayerEntityTraits)

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh)) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()
    expect(
      (targetMesh!.material as THREE.MeshBasicMaterial).color.getHex()
    ).toBe(0xffffff)

    const foreground = new AcCmColor().setForeground()
    styleManager.updateLayerMaterial('TXT', {
      layer: 'TXT',
      color: foreground
    })

    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: foreground
    })

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(0x000000)

    styleManager.currentBackgroundColor = 0x000000
    group.rematerializeLayerTextDrawables('TXT', styleManager, {
      layer: 'TXT',
      color: foreground
    })
    expect(material.color.getHex()).toBe(0xffffff)
  })
})
