import { AcTrEntity, AcTrGroup, AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcTrInheritedLayerMaterialMapper } from '../src/view/AcTrInheritedLayerMaterialMapper'
import { acTrRegisterGroup } from '../src/view/AcTrRegisterGroup'

describe('native group registration ownership', () => {
  it('releases transferred, pending and hidden geometry when the sink fails', () => {
    const renderer = new AcTrRenderer({
      getSize: (size: THREE.Vector2) => size.set(800, 600)
    } as THREE.WebGLRenderer)
    const mapper = new AcTrInheritedLayerMaterialMapper(
      () => undefined,
      renderer
    )
    const disposals: jest.SpyInstance[] = []
    const entities = ['A', 'B', 'HIDDEN'].map(name => {
      const entity = new AcTrEntity(renderer.context)
      entity.objectId = name
      entity.layerName = name
      const geometry = new THREE.BufferGeometry()
      disposals.push(jest.spyOn(geometry, 'dispose'))
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
      mesh.userData.layerName = name
      mesh.visible = name !== 'HIDDEN'
      entity.add(mesh)
      return entity
    })
    const group = new AcTrGroup(entities, renderer.context)
    group.objectId = 'INSERT'
    group.layerName = '0'
    try {
      expect(() =>
        acTrRegisterGroup(group, mapper, {
          addEntity: () => {
            throw new Error('sink failed')
          }
        })
      ).toThrow('sink failed')
      expect(group.children).toHaveLength(0)
      expect(group.getSourceEntities()).toHaveLength(0)
      for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1)
    } finally {
      renderer.dispose()
    }
  })
})
