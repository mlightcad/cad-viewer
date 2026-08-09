import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): AcTrEntity {
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

/** Closed axis-aligned rectangle as discrete line segments (hollow frame). */
function createRectangleLineSegments(): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        // bottom
        0, 0, 0, 100, 0, 0,
        // right
        100, 0, 0, 100, 80, 0,
        // top
        100, 80, 0, 0, 80, 0,
        // left
        0, 80, 0, 0, 0, 0
      ],
      3
    )
  )
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
}

function createRectangleLineSegments2(): LineSegments2 {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions([
    0, 0, 0, 100, 0, 0, 100, 0, 0, 100, 80, 0, 100, 80, 0, 0, 80, 0, 0, 80, 0, 0,
    0, 0
  ])
  const material = new LineMaterial({
    color: 0xffffff,
    linewidth: 1,
    resolution: new THREE.Vector2(800, 600)
  })
  return new LineSegments2(geometry, material)
}

function createOrthoRaycaster(
  x: number,
  y: number,
  threshold = 2
): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const camera = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  raycaster.params.Line.threshold = threshold
  return raycaster
}

describe('AcTrBatchedLine / AcTrBatchedLine2 pick', () => {
  it('does not select a hollow LineSegments rectangle via its bounding-box interior', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('rect-1', createRectangleLineSegments()))

    const interior = createOrthoRaycaster(50, 40)
    expect(group.isIntersectWith('rect-1', interior)).toBe(false)

    const onEdge = createOrthoRaycaster(50, 0)
    expect(group.isIntersectWith('rect-1', onEdge)).toBe(true)
  })

  it('does not select a hollow LineSegments2 rectangle via its bounding-box interior', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('rect-2', createRectangleLineSegments2()))

    const interior = createOrthoRaycaster(50, 40)
    expect(group.isIntersectWith('rect-2', interior)).toBe(false)

    const onEdge = createOrthoRaycaster(50, 0)
    expect(group.isIntersectWith('rect-2', onEdge)).toBe(true)
  })
})
