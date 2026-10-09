import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrSharedGeometryBatch } from '../src/batch/AcTrSharedGeometryBatch'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

function createSharedLine(offsetY: number, material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
  )
  const line = new THREE.LineSegments(geometry, material)
  line.position.set(0, offsetY, 0)
  line.updateMatrixWorld(true)
  getSceneDrawableUserData(line).sharesTemplateGeometry = true
  return line
}

function createEntity(objectId: string, drawable: THREE.Object3D) {
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  entity.add(drawable)
  return entity
}

function findSharedBatch(group: AcTrBatchedGroup) {
  let result: AcTrSharedGeometryBatch | undefined
  group.traverse(child => {
    if (!result && child instanceof AcTrSharedGeometryBatch) {
      result = child
    }
  })
  return result
}

describe('AcTrBatchedGroup shared block geometry', () => {
  it('instances repeated block leaves instead of copying vertices', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const firstLine = createSharedLine(0, material)
    const secondLine = new THREE.LineSegments(
      firstLine.geometry,
      material
    )
    secondLine.position.set(0, 100, 0)
    secondLine.updateMatrixWorld(true)
    getSceneDrawableUserData(secondLine).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', firstLine))
    group.addEntity(createEntity('insert-b', secondLine))

    const batch = findSharedBatch(group)
    expect(batch).toBeDefined()
    expect(batch?.instanceCount).toBe(2)
    expect(batch?.kind).toBe('line')

    const instanced = batch?.children.find(
      child => (child as THREE.LineSegments).isLineSegments
    ) as THREE.LineSegments & { count?: number; isInstancedMesh?: boolean }
    expect(instanced?.isInstancedMesh).toBe(true)
    expect(instanced?.count).toBe(2)
    expect(instanced.geometry.getAttribute('position').count).toBe(2)
    expect(instanced.geometry).not.toBe(firstLine.geometry)

    const position = firstLine.geometry.getAttribute('position')
    const clonedX = instanced.geometry.getAttribute('position').getX(0)
    position.setX(0, 999)
    expect(instanced.geometry.getAttribute('position').getX(0)).toBe(clonedX)

    const box = new THREE.Box3()
    group.computeBoundingBox(box)
    expect(box.min.y).toBeCloseTo(0)
    expect(box.max.y).toBeCloseTo(100)
    expect(box.max.x).toBeCloseTo(10)

    const rayAt = (y: number) => {
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(5, y, 100),
        new THREE.Vector3(0, 0, -1)
      )
      raycaster.params.Line.threshold = 2
      return raycaster
    }
    expect(group.isIntersectWith('insert-a', rayAt(0))).toBe(true)
    expect(group.isIntersectWith('insert-b', rayAt(0))).toBe(false)
    expect(group.isIntersectWith('insert-b', rayAt(100))).toBe(true)

    group.setEntityVisible('insert-a', false)
    expect(group.getEntityVisible('insert-a')).toBe(false)
    expect(group.isIntersectWith('insert-a', rayAt(0))).toBe(false)
  })

  it('keeps the world pick threshold when an INSERT is scaled', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const line = createSharedLine(0, material)
    line.scale.set(0.01, 0.01, 0.01)
    line.updateMatrixWorld(true)

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', line))

    const near = new THREE.Raycaster(
      new THREE.Vector3(0.05, 0.015, 10),
      new THREE.Vector3(0, 0, -1)
    )
    near.params.Line.threshold = 0.02
    expect(group.isIntersectWith('insert-a', near)).toBe(true)

    const far = new THREE.Raycaster(
      new THREE.Vector3(0.05, 1, 10),
      new THREE.Vector3(0, 0, -1)
    )
    far.params.Line.threshold = 0.02
    expect(group.isIntersectWith('insert-a', far)).toBe(false)
  })

  it('keeps the world pick threshold when an INSERT is mirrored', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const line = createSharedLine(0, material)
    line.scale.set(-1, 1, 1)
    line.updateMatrixWorld(true)

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', line))

    const near = new THREE.Raycaster(
      new THREE.Vector3(-5, 0.015, 10),
      new THREE.Vector3(0, 0, -1)
    )
    near.params.Line.threshold = 0.02
    expect(group.isIntersectWith('insert-a', near)).toBe(true)

    const far = new THREE.Raycaster(
      new THREE.Vector3(-5, 0.05, 10),
      new THREE.Vector3(0, 0, -1)
    )
    far.params.Line.threshold = 0.02
    expect(group.isIntersectWith('insert-a', far)).toBe(false)
  })

  it('bakes a mirrored mesh instead of instancing a front-side fill', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
    )
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ side: THREE.FrontSide })
    )
    mesh.scale.set(-1, 1, 1)
    mesh.updateMatrixWorld(true)
    getSceneDrawableUserData(mesh).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', mesh))

    expect(findSharedBatch(group)).toBeUndefined()
  })

  it('bakes a scaled dashed fat line so dash length stays in world units', () => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions([0, 0, 0, 10, 0, 0])
    const material = new LineMaterial({
      color: 0xffffff,
      dashed: true,
      linewidth: 1
    })
    const line = new LineSegments2(geometry, material)
    line.scale.set(2, 2, 2)
    line.updateMatrixWorld(true)
    getSceneDrawableUserData(line).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', line))

    expect(findSharedBatch(group)).toBeUndefined()
  })
})
