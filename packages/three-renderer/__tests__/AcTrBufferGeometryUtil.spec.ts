import * as THREE from 'three'

import { AcTrBufferGeometryUtil } from '../src/util/AcTrBufferGeometryUtil'

describe('AcTrBufferGeometryUtil finite coordinate helpers', () => {
  it('detects non-finite points', () => {
    expect(AcTrBufferGeometryUtil.isFinitePoint({ x: 0, y: 0, z: 0 })).toBe(
      true
    )
    expect(
      AcTrBufferGeometryUtil.isFinitePoint({ x: Number.NaN, y: 1, z: 0 })
    ).toBe(false)
    expect(AcTrBufferGeometryUtil.isFinitePoint(null)).toBe(false)
    expect(AcTrBufferGeometryUtil.isFinitePoint(undefined)).toBe(false)
  })

  it('avoids THREE.js NaN warnings in safeComputeBoundingBox', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([Number.NaN, 0, 0, 1, 1, 0], 3)
    )

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)).toBeNull()
    expect(
      AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)
    ).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('sanitizes indexed line geometry before matrix transform', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, Number.NaN, 1, 0, 2, 2, 0], 3)
    )
    geometry.setIndex(new THREE.Uint16BufferAttribute([0, 1, 0, 2], 1))

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const matrix = new THREE.Matrix4().makeTranslation(10, 0, 0)
    expect(AcTrBufferGeometryUtil.safeApplyMatrix4(geometry, matrix, 2)).toBe(
      true
    )
    expect(Array.from(geometry.index!.array)).toEqual([0, 2])
    expect(geometry.getAttribute('position').getX(0)).toBe(10)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
