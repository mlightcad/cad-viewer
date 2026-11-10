import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'

function createLineEntity(
  objectId: string,
  y: number,
  material: THREE.LineBasicMaterial
): AcTrEntity {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, y, 0, 100, y, 0], 3)
  )
  geometry.setIndex([0, 1])
  const line = new THREE.LineSegments(geometry, material)
  line.updateMatrixWorld(true)
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  entity.add(line)
  return entity
}

function raycasterAt(x: number, y: number): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const camera = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  raycaster.params.Line.threshold = 1
  return raycaster
}

describe('AcTrBatchedGroup.removeEntities', () => {
  it('removes many entities but compacts each batch only once', () => {
    const group = new AcTrBatchedGroup()
    const ids = Array.from({ length: 20 }, (_, i) => `line-${i}`)
    // One material, as for strokes on one layer: all lines share one batch.
    const material = new THREE.LineBasicMaterial()
    ids.forEach((id, i) =>
      group.addEntity(createLineEntity(id, i * 10, material))
    )
    const optimize = jest.spyOn(AcTrBatchedLine.prototype, 'optimize')

    try {
      const removed = group.removeEntities([...ids.slice(0, 15), 'missing'])
      expect([...removed].sort()).toEqual([...ids.slice(0, 15)].sort())
      // Compacting after every entity made erasing thousands of strokes
      // freeze the view for seconds.
      expect(optimize).toHaveBeenCalledTimes(1)
    } finally {
      optimize.mockRestore()
    }

    expect(group.entityCount).toBe(5)
    ids.slice(0, 15).forEach(id => expect(group.hasEntity(id)).toBe(false))
    // The kept lines still hit-test at their place after compaction.
    ids.slice(15).forEach((id, i) => {
      expect(group.isIntersectWith(id, raycasterAt(50, (15 + i) * 10))).toBe(
        true
      )
    })
  })
})
