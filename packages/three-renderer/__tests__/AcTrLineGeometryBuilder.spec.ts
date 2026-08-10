import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { buildLineGeometry } from '../src/object/AcTrLineGeometryBuilder'

const largeX = RTE_REBASE_THRESHOLD + 500_000

describe('buildLineGeometry', () => {
  it('returns null when fewer than two points are provided', () => {
    expect(buildLineGeometry([], new THREE.LineBasicMaterial())).toBeNull()
    expect(
      buildLineGeometry([{ x: 1, y: 2, z: 0 }], new THREE.LineBasicMaterial())
    ).toBeNull()
  })

  it('builds indexed basic geometry rebased to the bbox center', () => {
    const material = new THREE.LineBasicMaterial()
    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      material
    )

    expect(built).not.toBeNull()
    if (!built) return
    expect(built.kind).toBe('basic')
    expect(built.material).toBe(material)
    expect(built.worldOffset.x).toBeCloseTo(5)
    expect(built.worldOffset.y).toBeCloseTo(0)
    expect(built.geometry).toBeInstanceOf(THREE.BufferGeometry)

    const geometry = built.geometry as THREE.BufferGeometry
    expect(geometry.getIndex()).not.toBeNull()
    const position = geometry.getAttribute('position')
    expect(position.getX(0)).toBeCloseTo(-5)
    expect(position.getX(1)).toBeCloseTo(5)
    expect(built.wcsBbox.min.x).toBeCloseTo(0)
    expect(built.wcsBbox.max.x).toBeCloseTo(10)
  })

  it('builds fat LineSegmentsGeometry for LineMaterial', () => {
    const material = new LineMaterial({ color: 0xffffff, linewidth: 1 })
    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 }
      ],
      material
    )

    expect(built).not.toBeNull()
    if (!built) return
    expect(built.kind).toBe('fat')
    expect(built.geometry).toBeInstanceOf(LineSegmentsGeometry)
    expect(built.worldOffset.x).toBeCloseTo(2)
    expect(built.wcsBbox.min.x).toBeCloseTo(0)
    expect(built.wcsBbox.max.x).toBeCloseTo(4)
    material.dispose()
  })

  it('keeps wcsBbox in world coordinates for large drawings', () => {
    const built = buildLineGeometry(
      [
        { x: largeX, y: 0, z: 0 },
        { x: largeX + 100, y: 0, z: 0 }
      ],
      new THREE.LineBasicMaterial()
    )

    expect(built).not.toBeNull()
    if (!built) return
    expect(built.wcsBbox.min.x).toBeCloseTo(largeX, 0)
    expect(built.wcsBbox.max.x).toBeCloseTo(largeX + 100, 0)
    expect(Math.abs(built.worldOffset.x - (largeX + 50))).toBeLessThan(1)
  })
})
