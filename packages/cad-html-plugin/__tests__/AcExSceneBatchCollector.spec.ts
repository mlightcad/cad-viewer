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
  getMaterialMetadata: () => ({ layer: '0' })
}))

import * as THREE from 'three'

import { compactIndexedSlice } from '../src/AcExBatchBuffers'
import {
  exportActiveBatchedSlice,
  exportBufferGeometrySlice
} from '../src/AcExSceneBatchCollector'

function createMockBatch(
  slots: Array<{
    active: boolean
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
      if (!info?.active) {
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
          active: true,
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
          active: true,
          vertexStart: 0,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          active: false,
          vertexStart: 4,
          vertexCount: 2,
          indexStart: -1,
          indexCount: 0
        },
        {
          active: true,
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
