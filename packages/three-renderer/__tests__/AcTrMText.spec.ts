import type { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

jest.mock('../src/renderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn()
  }
}))

import { AcTrMText } from '../src/object/AcTrMText'

type GeometryHost = THREE.Object3D & {
  box: THREE.Box3
  computeGeometryBox: () => THREE.Box3
  hasGeometry: (object: THREE.Object3D) => boolean
}

type RaycastHost = THREE.Object3D & {
  _mtext?: Pick<MTextObject, 'raycast'>
  box: THREE.Box3
}

const privateMethods = AcTrMText.prototype as unknown as {
  computeGeometryBox(this: GeometryHost): THREE.Box3
  updateSelectionBox(this: GeometryHost, mtext: MTextObject): void
  hasGeometry(object: THREE.Object3D): boolean
  raycast(
    this: RaycastHost,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ): void
}

describe('AcTrMText selection geometry', () => {
  it('computes the selection box from transformed rendered child geometry', () => {
    const host = createGeometryHost()
    host.add(createBoxMesh({ x: 10, y: 20, z: 0 }))

    const box = host.computeGeometryBox()

    expect(box.min.toArray()).toEqual([10, 20, 0])
    expect(box.max.toArray()).toEqual([14, 22, 0])
  })

  it('keeps renderer logical space when it overlaps rendered geometry', () => {
    const host = createGeometryHost()
    host.add(createBoxMesh({ x: 10, y: 20, z: 0 }))
    const logicalMTextBox = new THREE.Box3(
      new THREE.Vector3(10, 18, 0),
      new THREE.Vector3(14, 24, 0)
    )

    privateMethods.updateSelectionBox.call(
      host,
      createMTextObject(logicalMTextBox)
    )

    expect(host.box.min.toArray()).toEqual([10, 18, 0])
    expect(host.box.max.toArray()).toEqual([14, 24, 0])
  })

  it('ignores a disjoint renderer-provided mtext box', () => {
    const host = createGeometryHost()
    host.add(createBoxMesh({ x: 10, y: 20, z: 0 }))
    const offsetMTextBox = new THREE.Box3(
      new THREE.Vector3(100, 100, 0),
      new THREE.Vector3(101, 101, 0)
    )

    privateMethods.updateSelectionBox.call(
      host,
      createMTextObject(offsetMTextBox)
    )

    expect(host.box.min.toArray()).toEqual([10, 20, 0])
    expect(host.box.max.toArray()).toEqual([14, 22, 0])
  })

  it('falls back to the renderer-provided mtext box when there is no child geometry', () => {
    const host = createGeometryHost()
    const fallbackBox = new THREE.Box3(
      new THREE.Vector3(100, 100, 0),
      new THREE.Vector3(101, 101, 0)
    )

    privateMethods.updateSelectionBox.call(host, createMTextObject(fallbackBox))

    expect(host.box.min.toArray()).toEqual([100, 100, 0])
    expect(host.box.max.toArray()).toEqual([101, 101, 0])
  })

  it('keeps precise mtext raycast hits when the renderer reports an intersection', () => {
    const raycaster = createRaycaster()
    const hitPoint = new THREE.Vector3(0, 0, 0)
    const rendererHit: THREE.Intersection = {
      distance: 10,
      point: hitPoint,
      object: new THREE.Object3D()
    }
    const host = createRaycastHost({
      box: createSelectableBox(),
      mtextRaycast: (_raycaster, intersects) => {
        intersects.push(rendererHit)
      }
    })
    const intersects: THREE.Intersection[] = []

    privateMethods.raycast.call(host, raycaster, intersects)

    expect(intersects).toEqual([rendererHit])
  })

  it('uses the entity selection box as a raycast fallback when mtext layout misses', () => {
    const raycaster = createRaycaster()
    const host = createRaycastHost({
      box: createSelectableBox(),
      mtextRaycast: jest.fn()
    })
    const intersects: THREE.Intersection[] = []

    privateMethods.raycast.call(host, raycaster, intersects)

    expect(intersects).toHaveLength(1)
    expect(intersects[0].object).toBe(host)
    expect(intersects[0].point.x).toBeCloseTo(0)
    expect(intersects[0].point.y).toBeCloseTo(0)
    expect(intersects[0].point.z).toBeCloseTo(0.1)
  })

  it('does not report a fallback raycast hit when the selection box is empty', () => {
    const raycaster = createRaycaster()
    const host = createRaycastHost({
      box: new THREE.Box3(),
      mtextRaycast: jest.fn()
    })
    const intersects: THREE.Intersection[] = []

    privateMethods.raycast.call(host, raycaster, intersects)

    expect(intersects).toHaveLength(0)
  })
})

function createGeometryHost(): GeometryHost {
  const host = new THREE.Object3D() as GeometryHost
  host.box = new THREE.Box3()
  host.computeGeometryBox = privateMethods.computeGeometryBox
  host.hasGeometry = privateMethods.hasGeometry
  return host
}

function createRaycastHost(options: {
  box: THREE.Box3
  mtextRaycast: Pick<MTextObject, 'raycast'>['raycast']
}): RaycastHost {
  const host = new THREE.Object3D() as RaycastHost
  host.box = options.box
  host._mtext = {
    raycast: options.mtextRaycast
  }
  host.updateMatrixWorld(true)
  return host
}

function createMTextObject(
  box: THREE.Box3,
  lines: Array<{ y: number; height: number }> = []
): MTextObject {
  const mtext = new THREE.Object3D() as MTextObject
  mtext.box = box
  mtext.createLayoutData = () => ({ lines, chars: [] })
  return mtext
}

function createBoxMesh(position: THREE.Vector3Like) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 4, 2, 0, 0, 2, 0], 3)
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])

  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  mesh.position.copy(position)
  return mesh
}

function createRaycaster() {
  return new THREE.Raycaster(
    new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(0, 0, -1)
  )
}

function createSelectableBox() {
  return new THREE.Box3(
    new THREE.Vector3(-1, -1, -0.1),
    new THREE.Vector3(1, 1, 0.1)
  )
}
