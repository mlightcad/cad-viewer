import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderer } from '../src/renderer/AcTrRenderer'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600)
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

describe('AcTrRenderer.offsetRing centerline visibility', () => {
  const outer = [
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    { x: 100, y: 60, z: 0 },
    { x: 0, y: 60, z: 0 }
  ]
  const inner = [
    { x: 0.05, y: 0.05, z: 0 },
    { x: 99.95, y: 0.05, z: 0 },
    { x: 99.95, y: 59.95, z: 0 },
    { x: 0.05, y: 59.95, z: 0 }
  ]

  it('groups a fill mesh with a centerline stroke', () => {
    const renderer = createRenderer()
    const entity = renderer.offsetRing(outer, inner)

    expect(entity).toBeInstanceOf(AcTrGroup)
    const group = entity as AcTrGroup

    let meshCount = 0
    let lineCount = 0
    group.traverse(object => {
      if (object instanceof THREE.Mesh && !(object instanceof LineSegments2)) {
        meshCount++
      }
      if (
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Line ||
        object instanceof LineSegments2 ||
        object instanceof AcTrLine
      ) {
        lineCount++
      }
    })
    expect(meshCount).toBeGreaterThanOrEqual(1)
    expect(lineCount).toBeGreaterThanOrEqual(1)
  })

  it('misses direct capture so the centerline is not dropped', () => {
    const renderer = createRenderer()
    renderer.beginDirectCapture()
    renderer.offsetRing(outer, inner)
    expect(renderer.takeDirectCapture()).toBeNull()
  })
})
