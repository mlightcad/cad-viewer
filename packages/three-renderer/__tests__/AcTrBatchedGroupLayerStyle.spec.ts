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
