import * as THREE from 'three'

import type { AcTrIndexedBatchGeometryInfo } from '../src/batch/AcTrBatchedGeometryInfo'
import {
  isBatchGeometryVisible,
  setBatchGeometryVisible
} from '../src/batch/AcTrBatchedGeometryInfo'
import { createGeometryState } from '../src/batch/AcTrBatchedMixin'
import {
  applyBatchSlotDrawVisibility,
  syncBatchDrawVisibilityAfterOptimize
} from '../src/batch/drawVisibility'

function createIndexedSlotInfo(
  overrides: Partial<AcTrIndexedBatchGeometryInfo> = {}
): AcTrIndexedBatchGeometryInfo {
  return {
    vertexStart: 0,
    vertexCount: 3,
    reservedVertexCount: 3,
    indexStart: 0,
    indexCount: 3,
    reservedIndexCount: 3,
    ...createGeometryState(),
    ...overrides
  }
}

describe('applyBatchSlotDrawVisibility', () => {
  it('collapses and restores indexed geometry without changing slot mapping', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    geometry.setIndex([0, 1, 2])

    const info = createIndexedSlotInfo()
    const originalIndices = Array.from(geometry.getIndex()!.array)

    applyBatchSlotDrawVisibility(geometry, info, false, 'indexed')
    expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 0, 0])

    applyBatchSlotDrawVisibility(geometry, info, true, 'indexed')
    expect(Array.from(geometry.getIndex()!.array)).toEqual(originalIndices)
    expect(info.hiddenDrawSnapshot).toBeUndefined()
  })

  it('collapses and restores non-indexed vertex geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 0, 4, 0, 8, 8, 8], 3)
    )

    const info = createIndexedSlotInfo({
      indexStart: -1,
      indexCount: 0,
      reservedIndexCount: 0,
      vertexStart: 1,
      vertexCount: 2
    })

    applyBatchSlotDrawVisibility(geometry, info, false, 'vertex')
    expect(Array.from(geometry.getAttribute('position').array)).toEqual([
      0, 0, 0, 4, 0, 0, 4, 0, 0, 8, 8, 8
    ])

    applyBatchSlotDrawVisibility(geometry, info, true, 'vertex')
    expect(Array.from(geometry.getAttribute('position').array)).toEqual([
      0, 0, 0, 4, 0, 0, 0, 4, 0, 8, 8, 8
    ])
    expect(info.hiddenDrawSnapshot).toBeUndefined()
  })

  it('collapses single-vertex point geometry with NaN coordinates', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([2, 4, 6, 8, 8, 8], 3)
    )

    const info = createIndexedSlotInfo({
      indexStart: -1,
      indexCount: 0,
      reservedIndexCount: 0,
      vertexStart: 0,
      vertexCount: 1
    })

    expect(applyBatchSlotDrawVisibility(geometry, info, false, 'vertex')).toBe(
      true
    )
    expect(
      Array.from(geometry.getAttribute('position').array.slice(0, 3))
    ).toEqual([Number.NaN, Number.NaN, Number.NaN])

    expect(applyBatchSlotDrawVisibility(geometry, info, true, 'vertex')).toBe(
      true
    )
    expect(Array.from(geometry.getAttribute('position').array)).toEqual([
      2, 4, 6, 8, 8, 8
    ])
  })

  it('returns false when indexed collapse has no index range', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    geometry.setIndex([0, 1, 2])

    const info = createIndexedSlotInfo({ indexCount: 0 })

    expect(applyBatchSlotDrawVisibility(geometry, info, false, 'indexed')).toBe(
      false
    )
  })

  it('preserves slot flags when draw collapse is not applied', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    geometry.setIndex([0, 1, 2])

    const info = createIndexedSlotInfo({ indexCount: 0 })
    const applied = applyBatchSlotDrawVisibility(
      geometry,
      info,
      false,
      'indexed'
    )
    let flags = info.flags
    if (applied) {
      flags = setBatchGeometryVisible(flags, false)
    }

    expect(applied).toBe(false)
    expect(isBatchGeometryVisible(flags)).toBe(true)
  })

  it('collapses and restores wide-line segment geometry', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'instanceStart',
      new THREE.Float32BufferAttribute([0, 0, 0, 2, 0, 0], 3)
    )
    geometry.setAttribute(
      'instanceEnd',
      new THREE.Float32BufferAttribute([1, 0, 0, 3, 0, 0], 3)
    )

    const info = createIndexedSlotInfo({
      indexStart: -1,
      indexCount: 0,
      reservedIndexCount: 0,
      vertexStart: 0,
      vertexCount: 2
    })

    applyBatchSlotDrawVisibility(geometry, info, false, 'line2')
    expect(Array.from(geometry.getAttribute('instanceEnd').array)).toEqual([
      0, 0, 0, 2, 0, 0
    ])

    applyBatchSlotDrawVisibility(geometry, info, true, 'line2')
    expect(Array.from(geometry.getAttribute('instanceEnd').array)).toEqual([
      1, 0, 0, 3, 0, 0
    ])
  })

  it('re-collapses hidden slots after optimize moves buffer ranges', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5], 3)
    )
    geometry.setIndex([0, 1, 2, 3, 3, 3])

    const info = createIndexedSlotInfo({
      vertexStart: 3,
      indexStart: 3,
      indexCount: 3
    })
    info.flags = setBatchGeometryVisible(info.flags, false)

    applyBatchSlotDrawVisibility(geometry, info, false, 'indexed')
    expect(Array.from(geometry.getIndex()!.array).slice(3)).toEqual([3, 3, 3])

    info.vertexStart = 0
    info.indexStart = 0

    syncBatchDrawVisibilityAfterOptimize(geometry, [info])

    expect(Array.from(geometry.getIndex()!.array).slice(0, 3)).toEqual([
      0, 0, 0
    ])
  })
})
