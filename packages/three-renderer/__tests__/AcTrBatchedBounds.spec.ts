import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

function expectBox3CloseTo(
  box: THREE.Box3,
  min: THREE.Vector3Like,
  max: THREE.Vector3Like,
  precision = 5
) {
  expect(box.min.x).toBeCloseTo(min.x, precision)
  expect(box.min.y).toBeCloseTo(min.y, precision)
  expect(box.min.z).toBeCloseTo(min.z ?? 0, precision)
  expect(box.max.x).toBeCloseTo(max.x, precision)
  expect(box.max.y).toBeCloseTo(max.y, precision)
  expect(box.max.z).toBeCloseTo(max.z ?? 0, precision)
}

function createLineSegments(
  start: THREE.Vector3Like,
  end: THREE.Vector3Like,
  worldOffset = new THREE.Vector3(),
  options?: { noBatch?: boolean }
): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        start.x,
        start.y,
        start.z ?? 0,
        end.x,
        end.y,
        end.z ?? 0
      ],
      3
    )
  )
  geometry.setIndex([0, 1])

  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  line.position.copy(worldOffset)
  if (options?.noBatch) {
    getSceneDrawableUserData(line).noBatch = true
  }
  line.updateMatrixWorld(true)
  return line
}

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): AcTrEntity {
  const entity = new AcTrEntity(new AcTrStyleManager())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

describe('AcTrBatchedLine batch bounds', () => {
  it('unionActiveVisibleBoundingBoxInto returns world-space bounds after origin rebase', () => {
    const worldOffset = new THREE.Vector3(1_000_000, 2_000_000, 0)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 100, 50, 0], 3)
    )
    geometry.setIndex([0, 1])

    const batch = new AcTrBatchedLine()
    const geometryId = batch.addGeometry(geometry, -1, -1, worldOffset)
    batch.setGeometryInfo(geometryId, { objectId: 'line-1' })

    const box = new THREE.Box3()
    batch.unionActiveVisibleBoundingBoxInto(box)

    expectBox3CloseTo(
      box,
      { x: 1_000_000, y: 2_000_000, z: 0 },
      { x: 1_000_100, y: 2_000_050, z: 0 }
    )
  })
})

describe('AcTrBatchedGroup.computeBoundingBox', () => {
  it('returns world-space bounds for batched line entities', () => {
    const group = new AcTrBatchedGroup()
    const worldOffset = new THREE.Vector3(1_000_000, 2_000_000, 0)
    const line = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 50, z: 0 },
      worldOffset
    )

    group.addEntity(createEntity('line-1', line))

    const box = group.computeBoundingBox(new THREE.Box3())
    expectBox3CloseTo(
      box,
      { x: 1_000_000, y: 2_000_000, z: 0 },
      { x: 1_000_100, y: 2_000_050, z: 0 }
    )
  })

  it('returns world-space bounds for unbatched entities', () => {
    const group = new AcTrBatchedGroup()
    const worldOffset = new THREE.Vector3(300_000, 400_000, 0)
    const line = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 25, z: 0 },
      worldOffset,
      { noBatch: true }
    )

    group.addEntity(createEntity('ray-1', line))

    const box = group.computeBoundingBox(new THREE.Box3())
    expectBox3CloseTo(
      box,
      { x: 300_000, y: 400_000, z: 0 },
      { x: 300_050, y: 400_025, z: 0 }
    )
  })

  it('unions batched and unbatched entity bounds', () => {
    const group = new AcTrBatchedGroup()

    const batchedLine = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 50, z: 0 },
      new THREE.Vector3(1_000_000, 2_000_000, 0)
    )
    const unbatchedLine = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 25, z: 0 },
      new THREE.Vector3(300_000, 400_000, 0),
      { noBatch: true }
    )

    group.addEntity(createEntity('line-1', batchedLine))
    group.addEntity(createEntity('ray-1', unbatchedLine))

    const box = group.computeBoundingBox(new THREE.Box3())
    expectBox3CloseTo(
      box,
      { x: 300_000, y: 400_000, z: 0 },
      { x: 1_000_100, y: 2_000_050, z: 0 }
    )
  })

  it('respects excludeObjectIds for batched and unbatched entities', () => {
    const group = new AcTrBatchedGroup()

    const batchedLine = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 50, z: 0 },
      new THREE.Vector3(1_000_000, 2_000_000, 0)
    )
    const unbatchedLine = createLineSegments(
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 25, z: 0 },
      new THREE.Vector3(300_000, 400_000, 0),
      { noBatch: true }
    )

    group.addEntity(createEntity('line-1', batchedLine))
    group.addEntity(createEntity('ray-1', unbatchedLine))

    const batchedOnly = group.computeBoundingBox(
      new THREE.Box3(),
      { excludeObjectIds: new Set(['ray-1']) }
    )
    expectBox3CloseTo(
      batchedOnly,
      { x: 1_000_000, y: 2_000_000, z: 0 },
      { x: 1_000_100, y: 2_000_050, z: 0 }
    )

    const unbatchedOnly = group.computeBoundingBox(
      new THREE.Box3(),
      { excludeObjectIds: new Set(['line-1']) }
    )
    expectBox3CloseTo(
      unbatchedOnly,
      { x: 300_000, y: 400_000, z: 0 },
      { x: 300_050, y: 400_025, z: 0 }
    )
  })
})
