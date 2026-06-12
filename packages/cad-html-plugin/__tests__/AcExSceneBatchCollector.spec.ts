jest.mock('@mlightcad/three-renderer', () => ({
  AcTrBatchedLine: class AcTrBatchedLine {
    optimize() {}
  },
  AcTrBatchedMesh: class AcTrBatchedMesh {
    optimize() {}
  },
  AcTrBatchedPoint: class AcTrBatchedPoint {
    optimize() {}
  },
  getMaterialMetadata: () => ({ layer: '0' }),
  isBatchGeometryActive: (flags: number) => (flags & 1) !== 0,
  isBatchGeometryVisible: (flags: number) => (flags & 3) === 3
}))

import { AcTrBatchedLine } from '../../three-renderer/src/batch/AcTrBatchedLine'
import * as THREE from 'three'

import { compactIndexedSlice, readBatchWorldOffset, toWcsCoord } from '../src/AcExBatchBuffers'
import {
  collectBatchesFromObject3D,
  exportActiveBatchedSlice,
  exportBufferGeometrySlice
} from '../src/AcExSceneBatchCollector'

const BATCH_SLOT_ACTIVE = 0b11
const BATCH_SLOT_HIDDEN = 0b01
const BATCH_SLOT_INACTIVE = 0

function createMockBatch(
  slots: Array<{
    flags: number
    vertexStart: number
    vertexCount: number
    indexStart: number
    indexCount: number
  }>
) {
  return {
    mappingStats: { count: slots.length },
    getGeometryRangeAt(geometryId: number) {
      const info = slots[geometryId]
      if (!info || (info.flags & 1) === 0) {
        throw new Error('inactive')
      }
      return info
    }
  }
}

describe('exportBufferGeometrySlice', () => {
  it('exports non-indexed geometry when drawRange.count is Infinity', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0]), 3)
    )
    geometry.setDrawRange(0, Infinity)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0])
    expect(slice.indices).toBeUndefined()
  })

  it('exports indexed geometry when drawRange.count is Infinity', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
        3
      )
    )
    geometry.setIndex([0, 1, 2])
    geometry.setDrawRange(0, Infinity)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })

  it('honors a finite draw range on non-indexed geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]),
        3
      )
    )
    geometry.setDrawRange(1, 2)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([1, 0, 0, 2, 0, 0])
  })

  it('trims unused position tail for indexed geometry exports', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0, 10, 0, 0, 0, 10, 0, 999, 999, 999, 999, 999, 999
        ]),
        3
      )
    )
    geometry.setIndex([0, 1, 2])
    geometry.setDrawRange(0, 3)

    const slice = exportBufferGeometrySlice(geometry)

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })
})

describe('exportActiveBatchedSlice', () => {
  it('exports only active indexCount for indexed batched geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 99, 99, 99]),
        3
      )
    )
    geometry.setIndex([0, 1, 2, 0, 0, 0])
    geometry.setDrawRange(0, 6)

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 3,
          indexStart: 0,
          indexCount: 3
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0])
    expect(Array.from(slice.indices!)).toEqual([0, 1, 2])
  })

  it('skips inactive slots and reserved vertices for non-indexed geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 6, 6, 6, 0, 0, 0, 0, 0, 0
        ]),
        3
      )
    )
    geometry.setDrawRange(0, 8)

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_INACTIVE,
          vertexStart: 4,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 4,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([
      0, 0, 0, 1, 0, 0, 5, 5, 5, 6, 6, 6
    ])
  })

  it('skips active but hidden slots during export', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 9, 9, 9, 8, 8, 8]),
        3
      )
    )

    const slice = exportActiveBatchedSlice(
      createMockBatch([
        {
          flags: BATCH_SLOT_HIDDEN,
          vertexStart: 2,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          flags: BATCH_SLOT_ACTIVE,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        }
      ]),
      geometry
    )

    expect(Array.from(slice.positions)).toEqual([0, 0, 0, 1, 0, 0])
  })
})

describe('compactIndexedSlice', () => {
  it('keeps positions referenced by the index buffer', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 99, 99, 99])
    const indices = new Uint32Array([0, 1, 2])

    const compact = compactIndexedSlice(positions, indices)

    expect(Array.from(compact.positions)).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0])
    expect(Array.from(compact.indices)).toEqual([0, 1, 2])
  })
})

function createRebasedLineSegments(
  wcsStart: [number, number, number],
  wcsEnd: [number, number, number]
): THREE.LineSegments {
  const cx = (wcsStart[0] + wcsEnd[0]) / 2
  const cy = (wcsStart[1] + wcsEnd[1]) / 2
  const cz = ((wcsStart[2] ?? 0) + (wcsEnd[2] ?? 0)) / 2
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        wcsStart[0] - cx,
        wcsStart[1] - cy,
        (wcsStart[2] ?? 0) - cz,
        wcsEnd[0] - cx,
        wcsEnd[1] - cy,
        (wcsEnd[2] ?? 0) - cz
      ]),
      3
    )
  )
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  line.position.set(cx, cy, cz)
  return line
}

describe('collectBatchesFromObject3D rebase offsets', () => {
  it('exports batched line geometry with the batch origin offset', () => {
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

    const root = new THREE.Group()
    root.add(batch)
    root.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(root)
    expect(lineBatches).toHaveLength(1)

    const exported = lineBatches[0]!
    // Batch origin is the first geometry bbox center plus worldOffset.
    expect(exported.offset[0]).toBeCloseTo(1_000_050, 3)
    expect(exported.offset[1]).toBeCloseTo(2_000_025, 3)
    expect(
      toWcsCoord(exported.positions[0]!, exported.offset[0]!)
    ).toBeCloseTo(1_000_000, 3)
    expect(
      toWcsCoord(exported.positions[1]!, exported.offset[1]!)
    ).toBeCloseTo(2_000_000, 3)
    expect(
      toWcsCoord(exported.positions[3]!, exported.offset[0]!)
    ).toBeCloseTo(1_000_100, 3)
    expect(
      toWcsCoord(exported.positions[4]!, exported.offset[1]!)
    ).toBeCloseTo(2_000_050, 3)
  })

  it('uses matrixWorld translation for rebased lines nested under a parent', () => {
    const line = createRebasedLineSegments(
      [100_010, 200_020, 0],
      [100_110, 200_070, 0]
    )
    const parent = new THREE.Group()
    parent.position.set(900_000, 1_800_000, 0)
    parent.add(line)
    parent.updateMatrixWorld(true)

    const { lineBatches } = collectBatchesFromObject3D(parent)
    expect(lineBatches).toHaveLength(1)

    const exported = lineBatches[0]!
    expect(exported.offset[0]).toBeCloseTo(1_000_060, 3)
    expect(exported.offset[1]).toBeCloseTo(2_000_045, 3)
    expect(
      toWcsCoord(exported.positions[0]!, exported.offset[0]!)
    ).toBeCloseTo(1_000_010, 3)
    expect(
      toWcsCoord(exported.positions[1]!, exported.offset[1]!)
    ).toBeCloseTo(2_000_020, 3)
    expect(
      toWcsCoord(exported.positions[3]!, exported.offset[0]!)
    ).toBeCloseTo(1_000_110, 3)
    expect(
      toWcsCoord(exported.positions[4]!, exported.offset[1]!)
    ).toBeCloseTo(2_000_070, 3)
  })

  it('reads world offset from matrixWorld for nested drawables', () => {
    const line = createRebasedLineSegments([10, 20, 0], [110, 70, 0])
    const parent = new THREE.Group()
    parent.position.set(900_000, 1_800_000, 0)
    parent.add(line)
    parent.updateMatrixWorld(true)

    expect(readBatchWorldOffset(line)).toEqual([
      900_060,
      1_800_045,
      0
    ])
  })
})
