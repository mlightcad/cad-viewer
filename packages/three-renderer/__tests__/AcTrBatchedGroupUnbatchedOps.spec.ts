import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import {
  getHighlightUserData,
  getSceneDrawableUserData
} from '../src/util/AcTrObjectUserData'

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

function createGlyphMesh(localMinX: number, width = 4, height = 2) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        localMinX,
        0,
        0,
        localMinX + width,
        0,
        0,
        localMinX + width,
        height,
        0,
        localMinX,
        height,
        0
      ],
      3
    )
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
}

function createPlacementRoot(
  insertion: THREE.Vector3Like,
  glyphOffsets: number[]
) {
  const placementRoot = new THREE.Group()
  placementRoot.position.set(insertion.x, insertion.y, insertion.z ?? 0)
  for (const offset of glyphOffsets) {
    placementRoot.add(createGlyphMesh(offset))
  }
  placementRoot.updateMatrixWorld(true)
  return placementRoot
}

function findUnbatchedPlacementClone(group: AcTrBatchedGroup) {
  let clone: THREE.Object3D | undefined
  group.traverse(child => {
    if (clone || !(child instanceof THREE.Group)) {
      return
    }
    const meshChildren = child.children.filter(
      grandchild => grandchild instanceof THREE.Mesh
    )
    if (meshChildren.length < 2) {
      return
    }
    if (
      Math.max(Math.abs(child.position.x), Math.abs(child.position.y)) <
      RTE_REBASE_THRESHOLD
    ) {
      return
    }
    clone = child
  })
  return clone
}

describe('AcTrBatchedGroup unbatched operations', () => {
  it('selects and unselects an unbatched placement root', () => {
    const group = new AcTrBatchedGroup()
    const placementRoot = createPlacementRoot(
      { x: RTE_REBASE_THRESHOLD + 100, y: 3_000_000, z: 0 },
      [0, 8]
    )
    getSceneDrawableUserData(placementRoot).noBatch = true
    getSceneDrawableUserData(placementRoot).bboxIntersectionCheck = true

    group.addEntity(createEntity('mtext-1', placementRoot))
    group.select('mtext-1')

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(1)
    expect(getHighlightUserData(selectedGroup.children[0]).objectId).toBe(
      'mtext-1'
    )

    group.unselect('mtext-1')
    expect(selectedGroup.children).toHaveLength(0)
  })

  it('disposes highlight materials for unbatched subtree children on unselect', () => {
    const group = new AcTrBatchedGroup()
    const placementRoot = createPlacementRoot(
      { x: RTE_REBASE_THRESHOLD + 100, y: 3_000_000, z: 0 },
      [0, 8]
    )
    getSceneDrawableUserData(placementRoot).noBatch = true

    group.addEntity(createEntity('mtext-1', placementRoot))
    group.select('mtext-1')

    const selectedGroup = group.children[1] as THREE.Group
    const highlightRoot = selectedGroup.children[0]
    const highlightMeshes = highlightRoot.children.filter(
      child => child instanceof THREE.Mesh
    ) as THREE.Mesh[]
    expect(highlightMeshes.length).toBeGreaterThan(0)

    const disposeSpy = jest.spyOn(THREE.Material.prototype, 'dispose')
    group.unselect('mtext-1')

    expect(disposeSpy.mock.calls.length).toBeGreaterThanOrEqual(
      highlightMeshes.length
    )
    disposeSpy.mockRestore()
  })

  it('removes unbatched entities and clears selection highlights', () => {
    const group = new AcTrBatchedGroup()
    const line = createUnbatchedLine()
    group.addEntity(createEntity('line-1', line))
    group.select('line-1')

    expect(group.hasEntity('line-1')).toBe(true)
    expect(group.removeEntity('line-1')).toBe(true)
    expect(group.hasEntity('line-1')).toBe(false)
    expect((group.children[1] as THREE.Group).children).toHaveLength(0)
    expect(group.stats.unbatched.count).toBe(0)
  })

  it('uses bbox intersection for unbatched drawables flagged with bboxIntersectionCheck', () => {
    const group = new AcTrBatchedGroup()
    const insertion = {
      x: RTE_REBASE_THRESHOLD + 100,
      y: 3_000_000,
      z: 0
    }
    const placementRoot = createPlacementRoot(insertion, [0, 8])
    getSceneDrawableUserData(placementRoot).noBatch = true
    getSceneDrawableUserData(placementRoot).bboxIntersectionCheck = true

    group.addEntity(createEntity('mtext-1', placementRoot))

    const clonedRoot = findUnbatchedPlacementClone(group)
    expect(clonedRoot).toBeDefined()
    if (!clonedRoot) {
      return
    }

    const raycaster = new THREE.Raycaster()
    const center = new THREE.Vector3(
      insertion.x + 6,
      insertion.y + 1,
      insertion.z ?? 0
    )
    raycaster.set(
      new THREE.Vector3(center.x, center.y, center.z + 100),
      new THREE.Vector3(0, 0, -1)
    )

    expect(raycaster.intersectObject(clonedRoot, true)).toHaveLength(0)
    expect(group.isIntersectWith('mtext-1', raycaster)).toBe(true)
  })

  it('unions bounds from unbatched placement-root children in computeBoundingBox', () => {
    const group = new AcTrBatchedGroup()
    const insertion = {
      x: RTE_REBASE_THRESHOLD + 100,
      y: 3_000_000,
      z: 0
    }
    const placementRoot = createPlacementRoot(insertion, [0, 8])
    getSceneDrawableUserData(placementRoot).noBatch = true

    group.addEntity(createEntity('mtext-1', placementRoot))

    const box = group.computeBoundingBox(new THREE.Box3())
    expect(box.isEmpty()).toBe(false)
    expect(box.min.x).toBeCloseTo(insertion.x, 0)
    expect(box.max.x).toBeCloseTo(insertion.x + 12, 0)
    expect(box.min.y).toBeCloseTo(insertion.y, 0)
    expect(box.max.y).toBeCloseTo(insertion.y + 2, 0)
  })
})

function createUnbatchedLine() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-10, 0, 0, 10, 0, 0], 3)
  )
  geometry.setIndex([0, 1])
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  line.position.set(RTE_REBASE_THRESHOLD + 500, 2_000_000, 0)
  getSceneDrawableUserData(line).noBatch = true
  line.updateMatrixWorld(true)
  return line
}
