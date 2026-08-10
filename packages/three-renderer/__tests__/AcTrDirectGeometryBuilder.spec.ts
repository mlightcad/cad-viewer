import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import {
  buildLineSegmentsGeometry,
  buildPointGeometry,
  isDirectBatchRejectedMaterial
} from '../src/object/AcTrLineGeometryBuilder'

describe('direct geometry builders', () => {
  it('buildPointGeometry rebases to the point world offset', () => {
    const material = new THREE.PointsMaterial()
    const built = buildPointGeometry({ x: 100, y: 200, z: 3 }, material)

    expect(built.kind).toBe('point')
    expect(built.worldOffset.x).toBe(100)
    expect(built.worldOffset.y).toBe(200)
    expect(built.worldOffset.z).toBe(3)
    expect(built.position).toEqual({ x: 100, y: 200, z: 3 })
    expect(built.geometry.getAttribute('position').getX(0)).toBe(0)
    built.geometry.dispose()
  })

  it('buildLineSegmentsGeometry filters zero-index pairs and rebases', () => {
    const material = new THREE.LineBasicMaterial()
    const array = new Float32Array([0, 0, 0, 10, 0, 0, 20, 0, 0])
    const indices = new Uint16Array([0, 1, 0, 0, 1, 2])
    const built = buildLineSegmentsGeometry(array, 3, indices, material)

    expect(built).not.toBeNull()
    if (!built) return
    expect(built.kind).toBe('lineBasic')
    expect(built.worldOffset.x).toBeCloseTo(10)
    expect(built.geometry.getIndex()?.count).toBe(4)
    built.geometry.dispose()
  })

  it('buildLineSegmentsGeometry accepts LineMaterial but rejects pattern shaders', () => {
    const array = new Float32Array([0, 0, 0, 4, 0, 0])
    const indices = new Uint16Array([0, 1])
    const lineMaterial = new LineMaterial({ color: 0xffffff, linewidth: 1 })
    const fatBuilt = buildLineSegmentsGeometry(array, 3, indices, lineMaterial)
    expect(fatBuilt?.kind).toBe('lineFat')
    fatBuilt?.geometry.dispose()
    lineMaterial.dispose()

    const shaderMaterial = new THREE.ShaderMaterial()
    expect(isDirectBatchRejectedMaterial(shaderMaterial)).toBe(true)
    expect(isDirectBatchRejectedMaterial(lineMaterial)).toBe(false)
    expect(
      buildLineSegmentsGeometry(array, 3, indices, shaderMaterial)
    ).toBeNull()
  })

  it('isDirectBatchRejectedMaterial allows basic materials', () => {
    expect(
      isDirectBatchRejectedMaterial(new THREE.LineBasicMaterial())
    ).toBe(false)
    expect(isDirectBatchRejectedMaterial(new THREE.MeshBasicMaterial())).toBe(
      false
    )
  })
})
