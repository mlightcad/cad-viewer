import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  AcTrBatchedGroup,
  disposePreviewSubset
} from '../src/batch/AcTrBatchedGroup'
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

  it('highlights one shared INSERT without aliasing the instanced geometry', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const firstLine = createSharedLine(0, material)
    const secondLine = new THREE.LineSegments(firstLine.geometry, material)
    secondLine.position.set(0, 100, 0)
    secondLine.updateMatrixWorld(true)
    getSceneDrawableUserData(secondLine).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', firstLine))
    group.addEntity(createEntity('insert-b', secondLine))

    const batch = findSharedBatch(group)
    const instanced = batch?.children.find(
      child => (child as { isInstancedMesh?: boolean }).isInstancedMesh
    ) as THREE.LineSegments & { count?: number }
    const sharedGeometry = instanced.geometry
    const position = sharedGeometry.getAttribute('position').clone()
    const matrix = (
      instanced as THREE.LineSegments & {
        instanceMatrix: THREE.InstancedBufferAttribute
      }
    ).instanceMatrix.clone()

    group.select('insert-a')

    const overlays = batch?.children.filter(
      child => child !== instanced && (child as THREE.LineSegments).isLineSegments
    ) as THREE.LineSegments[]
    expect(overlays).toHaveLength(1)
    expect(overlays[0].geometry).not.toBe(sharedGeometry)
    expect(overlays[0].material).not.toBe(instanced.material)
    expect(sharedGeometry.getAttribute('position').array).toEqual(position.array)
    expect(
      (
        instanced as THREE.LineSegments & {
          instanceMatrix: THREE.InstancedBufferAttribute
        }
      ).instanceMatrix.array
    ).toEqual(matrix.array)
    expect(instanced.count).toBe(2)

    group.unselect('insert-a')
    expect(
      batch?.children.filter(child => child !== instanced)
    ).toHaveLength(0)
    expect(sharedGeometry.getAttribute('position').array).toEqual(position.array)

    group.select('insert-b')
    const nextOverlays = batch?.children.filter(
      child => child !== instanced
    ) as THREE.LineSegments[]
    expect(nextOverlays).toHaveLength(1)
    expect(nextOverlays[0].geometry).not.toBe(sharedGeometry)
    expect(instanced.count).toBe(2)
    expect(sharedGeometry.getAttribute('position').array).toEqual(position.array)
  })

  it('previews one shared INSERT without aliasing the instanced geometry', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const firstLine = createSharedLine(0, material)
    const secondLine = new THREE.LineSegments(firstLine.geometry, material)
    secondLine.position.set(0, 100, 0)
    secondLine.updateMatrixWorld(true)
    getSceneDrawableUserData(secondLine).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', firstLine))
    group.addEntity(createEntity('insert-b', secondLine))

    const batch = findSharedBatch(group)
    const instanced = batch?.children.find(
      child => (child as { isInstancedMesh?: boolean }).isInstancedMesh
    ) as THREE.LineSegments
    const sharedGeometry = instanced.geometry

    const preview = group.createPreviewSubset(['insert-a'])
    expect(preview).not.toBeNull()
    const overlay = preview?.children[0] as THREE.LineSegments
    expect(overlay.geometry).not.toBe(sharedGeometry)

    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: 'insert-a', role: 'modified' }]
    })
    const compareOverlay = group.children.find(
      child => child.name === 'CompareOverlay'
    )
    const compareLine = compareOverlay?.children.find(
      child => (child as THREE.LineSegments).isLineSegments
    ) as THREE.LineSegments | undefined
    expect(compareLine?.geometry).toBeDefined()
    expect(compareLine?.geometry).not.toBe(sharedGeometry)

    disposePreviewSubset(preview!)
    group.setCompareDisplay({ enabled: false, overrides: [] })
    expect(sharedGeometry.getAttribute('position').array.length).toBeGreaterThan(0)
    expect(() => sharedGeometry.getAttribute('position').getX(0)).not.toThrow()
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

  it('tints shared INSERT instances for reading-mode / compare base color', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const firstLine = createSharedLine(0, material)
    const secondLine = new THREE.LineSegments(firstLine.geometry, material)
    secondLine.position.set(0, 100, 0)
    secondLine.updateMatrixWorld(true)
    getSceneDrawableUserData(secondLine).sharesTemplateGeometry = true

    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('insert-a', firstLine))
    group.addEntity(createEntity('insert-b', secondLine))

    const batch = findSharedBatch(group)!
    expect(batch).toBeDefined()

    group.setCompareDisplay({ enabled: true, baseColor: 0x000000 })

    const drawable = batch.children.find(
      child => (child as THREE.LineSegments).isLineSegments
    ) as THREE.LineSegments
    expect(drawable).toBeDefined()
    const tinted = drawable.material as THREE.LineBasicMaterial
    expect(tinted).not.toBe(material)
    expect(tinted.color.getHex()).toBe(0x000000)
    // Style-cache material must stay untouched so other layer uses remain valid.
    expect(material.color.getHex()).toBe(0xff0000)
    expect(batch.material).toBe(material)

    group.setCompareDisplay({ enabled: false, overrides: [] })
    expect(drawable.material).toBe(material)
    expect(material.color.getHex()).toBe(0xff0000)
  })

  it('applies compare base tint to shared batches created after setCompareDisplay', () => {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    const group = new AcTrBatchedGroup()
    group.setCompareDisplay({ enabled: true, baseColor: 0x000000 })

    group.addEntity(createEntity('late-insert', createSharedLine(0, material)))

    const batch = findSharedBatch(group)!
    expect(batch).toBeDefined()
    const drawable = batch.children.find(
      child => (child as THREE.LineSegments).isLineSegments
    ) as THREE.LineSegments
    expect((drawable.material as THREE.LineBasicMaterial).color.getHex()).toBe(
      0x000000
    )
  })

  it('shares LineMaterial resolution so compare tint tracks viewport resize', () => {
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions([0, 0, 0, 10, 0, 0])
    const material = new LineMaterial({
      color: 0xff0000,
      linewidth: 2,
      resolution: new THREE.Vector2(800, 600)
    })
    // LineSegmentsGeometry has no `position` attribute, so BatchedGroup will
    // not instance it; exercise the batch API directly.
    const batch = new AcTrSharedGeometryBatch(
      geometry,
      material,
      new THREE.Vector3(),
      'line2',
      geometry.uuid
    )
    batch.addInstance(new THREE.Matrix4(), 'fat-insert', false)
    batch.setCompareDisplayColors({ enabled: true, baseColor: 0x000000 })

    const fatLine = batch.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2
    const tinted = fatLine.material as LineMaterial
    expect(tinted).not.toBe(material)
    expect(tinted.color.getHex()).toBe(0x000000)
    expect(tinted.resolution).toBe(material.resolution)

    material.resolution.copy({ x: 1920, y: 1080 })
    expect(tinted.resolution.x).toBe(1920)
    expect(tinted.resolution.y).toBe(1080)
  })
})
