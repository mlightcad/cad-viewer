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
import { exportBufferGeometrySlice } from '../src/AcExSceneBatchCollector'

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

describe('compactIndexedSlice', () => {
  it('keeps positions referenced by the index buffer', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 99, 99, 99])
    const indices = new Uint32Array([0, 1, 2])

    const compact = compactIndexedSlice(positions, indices)

    expect(Array.from(compact.positions)).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0])
    expect(Array.from(compact.indices)).toEqual([0, 1, 2])
  })
})
