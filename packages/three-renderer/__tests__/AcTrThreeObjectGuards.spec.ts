import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  isThreeBufferGeometry,
  isThreeGeometryLeaf,
  isThreeLine,
  isThreeLineSegments,
  isThreeLineSegments2,
  isThreeMesh,
  isThreePoints
} from '../src/util/AcTrThreeObjectGuards'

/**
 * Stand-in for a drawable built by a second `three` package copy: same
 * runtime flags / `type`, but a different prototype chain so `instanceof`
 * against this file's THREE fails.
 */
function alienLineSegments(): THREE.Object3D {
  const proto = {
    isObject3D: true,
    isLine: true,
    isLineSegments: true,
    type: 'LineSegments',
    geometry: { isBufferGeometry: true, type: 'BufferGeometry' },
    material: {}
  }
  return Object.create(proto) as THREE.Object3D
}

describe('AcTrThreeObjectGuards', () => {
  it('recognizes same-copy Three.js leaves', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry())
    const lines = new THREE.LineSegments(new THREE.BufferGeometry())
    const points = new THREE.Points(new THREE.BufferGeometry())
    const fat = new LineSegments2(new LineSegmentsGeometry())

    expect(isThreeMesh(mesh)).toBe(true)
    expect(isThreeLineSegments(lines)).toBe(true)
    expect(isThreeLine(lines)).toBe(true)
    expect(isThreePoints(points)).toBe(true)
    expect(isThreeLineSegments2(fat)).toBe(true)
    expect(isThreeGeometryLeaf(mesh)).toBe(true)
    expect(isThreeBufferGeometry(mesh.geometry)).toBe(true)
  })

  it('recognizes alien-copy LineSegments that fail instanceof', () => {
    const alien = alienLineSegments()
    expect(alien instanceof THREE.LineSegments).toBe(false)
    expect(isThreeLineSegments(alien)).toBe(true)
    expect(isThreeLine(alien)).toBe(true)
    expect(isThreeGeometryLeaf(alien)).toBe(true)
  })
})
