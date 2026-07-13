import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrBatchedMesh } from '../src/batch/AcTrBatchedMesh'
import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
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
      [start.x, start.y, start.z ?? 0, end.x, end.y, end.z ?? 0],
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

function getLocalGeometrySpan(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute('position')
  let minX = Infinity
  let maxX = -Infinity
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  return maxX - minX
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

describe('AcTrBatchedLine', () => {
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

describe('AcTrBatchedGroup', () => {
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

  it('keeps local line geometry when cloning large-world unbatched drawables', () => {
    const group = new AcTrBatchedGroup()
    const worldOffset = new THREE.Vector3(1_200_000, 3_000_000, 0)
    const line = createLineSegments(
      { x: -10, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      worldOffset,
      { noBatch: true }
    )

    group.addEntity(createEntity('line-large-unbatched', line))

    let clonedLine: THREE.LineSegments | undefined
    group.traverse(child => {
      if (clonedLine || !(child instanceof THREE.LineSegments)) {
        return
      }
      if (Math.abs(child.position.x - worldOffset.x) > 1) {
        return
      }
      clonedLine = child
    })

    expect(clonedLine).toBeDefined()
    if (!clonedLine) {
      return
    }

    const position = clonedLine.geometry.getAttribute('position')
    expect(position.getX(0)).toBeCloseTo(-10, 5)
    expect(position.getX(1)).toBeCloseTo(10, 5)
    expect(clonedLine.position.x).toBeCloseTo(worldOffset.x, 3)
    expect(clonedLine.position.y).toBeCloseTo(worldOffset.y, 3)
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

    const batchedOnly = group.computeBoundingBox(new THREE.Box3(), {
      excludeObjectIds: new Set(['ray-1'])
    })
    expectBox3CloseTo(
      batchedOnly,
      { x: 1_000_000, y: 2_000_000, z: 0 },
      { x: 1_000_100, y: 2_000_050, z: 0 }
    )

    const unbatchedOnly = group.computeBoundingBox(new THREE.Box3(), {
      excludeObjectIds: new Set(['line-1'])
    })
    expectBox3CloseTo(
      unbatchedOnly,
      { x: 300_000, y: 400_000, z: 0 },
      { x: 300_050, y: 400_025, z: 0 }
    )
  })

  it('clones a noBatch MTEXT placement root once and preserves glyph spacing', () => {
    const group = new AcTrBatchedGroup()
    const placementRoot = createPlacementRoot(
      { x: RTE_REBASE_THRESHOLD + 100, y: 3_000_000, z: 0 },
      [0, 8]
    )
    getSceneDrawableUserData(placementRoot).noBatch = true
    getSceneDrawableUserData(placementRoot).bboxIntersectionCheck = true

    const entity = createEntity('mtext-1', placementRoot)
    group.addEntity(entity)

    expect(group.stats.unbatched.count).toBe(1)

    const clonedRoot = findUnbatchedPlacementClone(group)
    expect(clonedRoot).toBeDefined()
    if (!clonedRoot) {
      return
    }
    expect(
      clonedRoot.children.filter(child => child instanceof THREE.Mesh)
    ).toHaveLength(2)

    const [firstMesh, secondMesh] = clonedRoot.children as THREE.Mesh[]
    expect(getLocalGeometrySpan(firstMesh)).toBeCloseTo(4, 3)
    expect(getLocalGeometrySpan(secondMesh)).toBeCloseTo(4, 3)
    expect(secondMesh.geometry.getAttribute('position').getX(0)).toBeCloseTo(
      8,
      3
    )
    expect(clonedRoot.position.x).toBeCloseTo(RTE_REBASE_THRESHOLD + 100, 3)
    expect(clonedRoot.position.y).toBeCloseTo(3_000_000, 3)

    const batchedMeshes = group.children.filter(
      child => child instanceof AcTrBatchedMesh
    )
    expect(batchedMeshes).toHaveLength(0)
  })

  it('still batches small-coordinate flattened MTEXT leaves', () => {
    const group = new AcTrBatchedGroup()
    const entity = createEntity(
      'mtext-small',
      createGlyphMesh(0),
      createGlyphMesh(8)
    )

    group.addEntity(entity)

    expect(group.stats.unbatched.count).toBe(0)
    expect(group.children.some(child => child instanceof AcTrBatchedMesh)).toBe(
      true
    )
  })

  it('splits mesh batches when geometry world offsets are too far apart', () => {
    const group = new AcTrBatchedGroup()
    const material = new THREE.MeshBasicMaterial()

    const createPositionedGlyph = (x: number) => {
      const mesh = createGlyphMesh(0)
      mesh.material = material
      mesh.position.set(x, 0, 0)
      mesh.updateMatrixWorld(true)
      return mesh
    }

    group.addEntity(
      createEntity(
        'glyph-near',
        createPositionedGlyph(100_000),
        createPositionedGlyph(100_500)
      )
    )
    group.addEntity(
      createEntity(
        'glyph-far',
        createPositionedGlyph(100_000 + RTE_REBASE_THRESHOLD + 100)
      )
    )

    const batchedMeshes = group.children.filter(
      child => child instanceof AcTrBatchedMesh
    )
    expect(batchedMeshes).toHaveLength(2)

    for (const batch of batchedMeshes) {
      const positions = batch.geometry.getAttribute('position')
        .array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        expect(Math.abs(positions[i])).toBeLessThan(RTE_REBASE_THRESHOLD)
        expect(Math.abs(positions[i + 1])).toBeLessThan(RTE_REBASE_THRESHOLD)
      }
    }
  })

  it('splits line batches when geometry world offsets are too far apart', () => {
    const group = new AcTrBatchedGroup()
    const material = new THREE.LineBasicMaterial()

    const createPositionedLine = (x: number) => {
      const line = createLineSegments(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        new THREE.Vector3(x, 0, 0)
      )
      line.material = material
      return line
    }

    group.addEntity(
      createEntity(
        'line-near',
        createPositionedLine(100_000),
        createPositionedLine(100_500)
      )
    )
    group.addEntity(
      createEntity(
        'line-far',
        createPositionedLine(100_000 + RTE_REBASE_THRESHOLD + 100)
      )
    )

    const batchedLines = group.children.filter(
      child => child instanceof AcTrBatchedLine
    )
    expect(batchedLines).toHaveLength(2)

    for (const batch of batchedLines) {
      const positions = batch.geometry.getAttribute('position')
        .array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        expect(Math.abs(positions[i])).toBeLessThan(RTE_REBASE_THRESHOLD)
      }
    }
  })

  it('merges geometry into the nearest origin batch when multiple are eligible', () => {
    const group = new AcTrBatchedGroup()
    const material = new THREE.LineBasicMaterial()
    const farX = 100_000 + RTE_REBASE_THRESHOLD + 100

    const createPositionedLine = (x: number) => {
      const line = createLineSegments(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        new THREE.Vector3(x, 0, 0)
      )
      line.material = material
      return line
    }

    group.addEntity(createEntity('line-near', createPositionedLine(100_000)))
    group.addEntity(createEntity('line-far', createPositionedLine(farX)))

    const batchedLines = group.children
      .filter(child => child instanceof AcTrBatchedLine)
      .sort((a, b) => a.position.x - b.position.x) as AcTrBatchedLine[]
    expect(batchedLines).toHaveLength(2)
    const nearBatch = batchedLines[0]
    const farBatch = batchedLines[1]
    expect(nearBatch.geometryCount).toBe(1)
    expect(farBatch.geometryCount).toBe(1)

    group.addEntity(
      createEntity('line-between', createPositionedLine(farX - 50_000))
    )

    expect(nearBatch.geometryCount).toBe(1)
    expect(farBatch.geometryCount).toBe(2)

    const positions = farBatch.geometry.getAttribute('position')
      .array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.abs(positions[i])).toBeLessThan(RTE_REBASE_THRESHOLD)
    }
  })
})
