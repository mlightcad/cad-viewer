import * as THREE from 'three'

import { copyAttributeData } from '../src/batch/AcTrBatchedGeometryInfo'
import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../src/util/AcTrBufferGeometryUtil'

describe('copyAttributeData', () => {
  it('copies only src.count elements in the fast path', () => {
    const srcArray = new Float32Array([1, 2, 3, 4, 5, 6, 99, 99, 99])
    const src = new THREE.BufferAttribute(srcArray.subarray(0, 6), 3)

    const targetArray = new Float32Array(12)
    const target = new THREE.BufferAttribute(targetArray, 3)

    copyAttributeData(src, target, 1)

    expect(Array.from(targetArray)).toEqual([
      0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0
    ])
  })
})

describe('AcTrBatchedGroup lineDistance alignment', () => {
  it('batches dashed line segments after sanitizing non-finite vertices', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, Number.NaN, 1, 0, 2, 2, 0, 3, 3, 0],
        3
      )
    )
    geometry.setAttribute(
      'lineDistance',
      new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5], 1)
    )

    const material = new THREE.ShaderMaterial()
    const line = new THREE.LineSegments(geometry, material)
    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.add(line)

    const matrix = new THREE.Matrix4().makeTranslation(100, 0, 0)
    const cloned = geometry.clone()
    expect(
      AcTrBufferGeometryUtil.safeApplyMatrix4(cloned, matrix, 2)
    ).toBe(true)
    AcTrBufferGeometryUtil.recomputeLineDistanceForLineSegments(cloned)

    const position = cloned.getAttribute('position')
    const lineDistance = cloned.getAttribute('lineDistance')
    expect(position.count).toBe(2)
    expect(lineDistance.count).toBe(position.count)

    const group = new AcTrBatchedGroup()
    expect(() => group.addEntity(entity)).not.toThrow()
  })
})
