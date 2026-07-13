import * as THREE from 'three'

import {
  alwaysBatchDrawPolicy,
  alwaysUnbatchDrawPolicy,
  canMergeIntoBatchOrigin,
  batchOriginOffsetDistance,
  defaultBatchDrawPolicy,
  exceedsBatchOriginOffset,
  isLargeWorldCoordinatePoint,
  resolveAnchorFromBox,
  resolveAnchorFromPoints,
  RTE_REBASE_THRESHOLD
} from '../src/draw/AcTrBatchDrawPolicy'

describe('AcTrBatchDrawPolicy', () => {
  it('detects large-world insertion points', () => {
    expect(isLargeWorldCoordinatePoint({ x: 10, y: 20, z: 0 })).toBe(false)
    expect(
      isLargeWorldCoordinatePoint({
        x: RTE_REBASE_THRESHOLD + 1,
        y: 0,
        z: 0
      })
    ).toBe(true)
  })

  it('defaults to batch at small coordinates', () => {
    expect(
      defaultBatchDrawPolicy.resolveDrawMode({
        position: { x: 10, y: 20, z: 0 }
      })
    ).toBe('batch')
    expect(
      defaultBatchDrawPolicy.resolveDrawMode({
        anchor: { x: 0, y: 0, z: 0 }
      })
    ).toBe('batch')
  })

  it('always batches regardless of coordinates', () => {
    expect(
      alwaysBatchDrawPolicy.resolveDrawMode({
        position: { x: RTE_REBASE_THRESHOLD + 500, y: 0, z: 0 }
      })
    ).toBe('batch')
    expect(
      alwaysBatchDrawPolicy.resolveDrawMode({
        anchor: { x: 0, y: 0, z: 0 }
      })
    ).toBe('batch')
  })

  it('always unbatches regardless of coordinates', () => {
    expect(
      alwaysUnbatchDrawPolicy.resolveDrawMode({
        position: { x: 10, y: 20, z: 0 }
      })
    ).toBe('unbatch')
    expect(
      alwaysUnbatchDrawPolicy.resolveDrawMode({
        anchor: { x: 0, y: 0, z: 0 }
      })
    ).toBe('unbatch')
  })

  it('defaults to unbatch at large coordinates', () => {
    expect(
      defaultBatchDrawPolicy.resolveDrawMode({
        position: { x: RTE_REBASE_THRESHOLD + 500, y: 0, z: 0 }
      })
    ).toBe('unbatch')
    expect(
      defaultBatchDrawPolicy.resolveDrawMode({
        anchor: { x: RTE_REBASE_THRESHOLD + 1, y: 0, z: 0 }
      })
    ).toBe('unbatch')
  })

  it('prefers anchor over position when both are provided', () => {
    expect(
      defaultBatchDrawPolicy.resolveDrawMode({
        position: { x: 0, y: 0, z: 0 },
        anchor: { x: RTE_REBASE_THRESHOLD + 1, y: 0, z: 0 }
      })
    ).toBe('unbatch')
  })

  it('derives anchor center from a bounding box', () => {
    const box = new THREE.Box3(
      new THREE.Vector3(10, 20, 30),
      new THREE.Vector3(30, 40, 50)
    )

    expect(resolveAnchorFromBox(box)).toEqual({ x: 20, y: 30, z: 40 })
    expect(resolveAnchorFromBox(new THREE.Box3())).toBeUndefined()
  })

  it('matches point-list anchor when box encloses the same vertices', () => {
    const points = [
      { x: 10, y: 20, z: 30 },
      { x: 30, y: 40, z: 50 }
    ]
    const box = new THREE.Box3()
    points.forEach(point =>
      box.expandByPoint(new THREE.Vector3(point.x, point.y, point.z))
    )

    expect(resolveAnchorFromBox(box)).toEqual(resolveAnchorFromPoints(points))
  })

  it('detects batch origin offsets that exceed the rebase threshold', () => {
    const origin = new THREE.Vector3(100_000, 0, 0)
    expect(
      exceedsBatchOriginOffset(origin, new THREE.Vector3(100_500, 0, 0))
    ).toBe(false)
    expect(
      batchOriginOffsetDistance(origin, new THREE.Vector3(100_500, 0, 0))
    ).toBe(500)
    expect(
      exceedsBatchOriginOffset(
        origin,
        new THREE.Vector3(100_000 + RTE_REBASE_THRESHOLD, 0, 0)
      )
    ).toBe(true)
  })

  it('allows merging into empty batches and rejects far offsets', () => {
    const origin = new THREE.Vector3(100_000, 0, 0)
    expect(canMergeIntoBatchOrigin(undefined, origin)).toBe(true)
    expect(
      canMergeIntoBatchOrigin(origin, new THREE.Vector3(100_500, 0, 0))
    ).toBe(true)
    expect(
      canMergeIntoBatchOrigin(
        origin,
        new THREE.Vector3(100_000 + RTE_REBASE_THRESHOLD, 0, 0)
      )
    ).toBe(false)
  })
})
