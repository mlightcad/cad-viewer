import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { setMaterialMetadata } from '../src/style/AcTrMaterialMetadata'
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

describe('AcTrBatchedGroup layer style rebind', () => {
  it('rebindMaterialsForLayer respects runtime objectLayerName for INSERT inheritance', () => {
    const group = new AcTrBatchedGroup()
    const sourceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0',
      isByLayerColor: true
    })

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sourceMaterial)
    mesh.userData.layerName = 'INSERT'
    getSceneDrawableUserData(mesh).noBatch = true

    group.addEntity(createEntity('insert-mesh', mesh))

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (targetMesh || !(child instanceof THREE.Mesh) || child === mesh) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const reboundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    setMaterialMetadata(reboundMaterial, {
      layer: 'INSERT',
      materialKey: 'insert',
      isByLayerColor: true
    })

    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)

    group.rebindMaterialsForLayer(
      'INSERT',
      { layer: 'INSERT' },
      getLayerBoundMaterial
    )

    expect(targetMesh!.material).toBe(reboundMaterial)
    expect(getSceneDrawableUserData(targetMesh!).styleMaterialId).toBe(
      reboundMaterial.id
    )
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })

  it('does not clobber absolute hatch colour when only lineweight is ByLayer', () => {
    // Regression: legend true-color solid hatches on an ACI-7 layer were
    // painted white during layer sync because followsLayerStyle is true for
    // ByLayer lineweight alone, and refreshLayerBoundMaterialColor used to
    // rewrite colour unconditionally.
    const group = new AcTrBatchedGroup()
    const absoluteRgb = 0xc8cdd2
    const sourceMaterial = new THREE.MeshBasicMaterial({ color: absoluteRgb })
    setMaterialMetadata(sourceMaterial, {
      layer: '采掘计划',
      materialKey: 'solid_采掘计划_RGB:200,205,210_draw_-1',
      isByLayerColor: false,
      isByLayerLineWeight: true,
      isForeground: false,
      drawOrder: -1
    })

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sourceMaterial)
    mesh.userData.layerName = '采掘计划'
    getSceneDrawableUserData(mesh).noBatch = true
    group.addEntity(createEntity('legend-hatch', mesh))

    let targetMesh: THREE.Mesh | undefined
    group.traverse(child => {
      if (
        targetMesh ||
        !(child instanceof THREE.Mesh) ||
        child === mesh
      ) {
        return
      }
      if (child.geometry instanceof THREE.PlaneGeometry) {
        targetMesh = child
      }
    })
    expect(targetMesh).toBeDefined()

    const layerColor = {
      isForeground: true,
      RGB: 0xffffff
    }

    // Return the same material instance so rebind takes the in-place colour
    // refresh path (the path that previously wiped absolute RGB).
    group.rebindMaterialsForLayer(
      '采掘计划',
      { color: layerColor as never },
      material => material,
      {
        currentBackgroundColor: 0x000000,
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      } as never
    )

    const material = targetMesh!.material as THREE.MeshBasicMaterial
    expect(material.color.getHex()).toBe(absoluteRgb)
    expect(material.userData.isForeground).toBe(false)
  })

  it('syncAppearanceFromRecord refreshes unbatched drawables in one traversal', () => {
    const group = new AcTrBatchedGroup()
    const sourceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(sourceMaterial, {
      layer: '0',
      materialKey: 'layer0',
      isByLayerColor: true
    })

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sourceMaterial)
    mesh.userData.layerName = 'INSERT'
    getSceneDrawableUserData(mesh).noBatch = true

    group.addEntity(createEntity('insert-mesh', mesh))

    const reboundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)
    const unbatchedObjects = (
      group as unknown as { _unbatchedObjects: THREE.Group }
    )._unbatchedObjects
    const unbatchedTraverse = jest.spyOn(unbatchedObjects, 'traverse')
    const fullTraverse = jest.spyOn(group, 'traverse')

    group.syncAppearanceFromRecord(
      'INSERT',
      { layer: 'INSERT' },
      {},
      false,
      getLayerBoundMaterial,
      {
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      } as never
    )

    expect(unbatchedTraverse).toHaveBeenCalledTimes(1)
    expect(fullTraverse).not.toHaveBeenCalled()
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })
})
