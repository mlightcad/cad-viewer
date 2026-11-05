import * as THREE from 'three'

import { AcTrMeshGlyphWorldBatch } from '../src/batch/AcTrMeshGlyphWorldBatch'
import { getHighlightUserData } from '../src/util/AcTrObjectUserData'

describe('AcTrMeshGlyphWorldBatch layout owner', () => {
  it('parents the same layer under different layout owners', () => {
    const batch = new AcTrMeshGlyphWorldBatch()
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial()
    const matrix = new Float32Array(new THREE.Matrix4().identity().elements)

    batch.enqueue([matrix], geometry, material, {
      objectId: 'A',
      layerName: 't',
      ownerId: 'model'
    })
    batch.enqueue([matrix], geometry, material, {
      objectId: 'B',
      layerName: 't',
      ownerId: 'paper'
    })

    const modelLayer = new THREE.Group()
    const paperLayer = new THREE.Group()
    const fallback = new THREE.Group()

    batch.flush(fallback, (layerName, ownerId) => {
      expect(layerName).toBe('t')
      if (ownerId === 'model') return modelLayer
      if (ownerId === 'paper') return paperLayer
      return null
    })

    expect(batch.bucketCount).toBe(0)
    expect(modelLayer.children).toHaveLength(1)
    expect(paperLayer.children).toHaveLength(1)
    expect(modelLayer.children[0]).toBeInstanceOf(THREE.InstancedMesh)
    expect(paperLayer.children[0]).toBeInstanceOf(THREE.InstancedMesh)
    expect(modelLayer.children[0]).not.toBe(paperLayer.children[0])
    expect(fallback.children).toHaveLength(1)
    expect(fallback.children[0].children).toHaveLength(0)

    batch.dispose()
    geometry.dispose()
    material.dispose()
  })
})

describe('AcTrMeshGlyphWorldBatch large-coordinate precision', () => {
  // CGCS2000-like translations: float32 quantizes ~0.25–2 drawing units here,
  // so absolute instance matrices would fail every sub-unit assertion below.
  const x0 = 20_000_000.25
  const y0 = 3_300_000.0625
  const dx = 3.125
  const dy = 1.5

  const makeBatch = () => {
    const batch = new AcTrMeshGlyphWorldBatch()
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial()
    const m0 = new Float64Array(
      new THREE.Matrix4().makeTranslation(x0, y0, 0).elements
    )
    const m1 = new Float64Array(
      new THREE.Matrix4().makeTranslation(x0 + dx, y0 + dy, 0).elements
    )
    batch.enqueue([m0, m1], geometry, material, {
      objectId: 'A',
      layerName: '0'
    })
    const fallback = new THREE.Group()
    batch.flush(fallback)
    fallback.updateMatrixWorld(true)
    let mesh: THREE.InstancedMesh | undefined
    fallback.traverse(obj => {
      if ((obj as THREE.InstancedMesh).isInstancedMesh) {
        mesh = obj as THREE.InstancedMesh
      }
    })
    return { batch, geometry, material, fallback, mesh: mesh! }
  }

  const disposeAll = (parts: ReturnType<typeof makeBatch>) => {
    parts.batch.dispose()
    parts.geometry.dispose()
    parts.material.dispose()
  }

  it('rebases instance matrices around a bucket origin for float32 precision', () => {
    const parts = makeBatch()
    const { mesh } = parts
    expect(mesh).toBeDefined()

    const instance = new THREE.Matrix4()
    const world = new THREE.Matrix4()
    mesh.getMatrixAt(0, instance)
    world.multiplyMatrices(mesh.matrixWorld, instance)
    expect(Math.abs(world.elements[12] - x0)).toBeLessThan(1e-3)
    expect(Math.abs(world.elements[13] - y0)).toBeLessThan(1e-3)

    mesh.getMatrixAt(1, instance)
    world.multiplyMatrices(mesh.matrixWorld, instance)
    expect(Math.abs(world.elements[12] - (x0 + dx))).toBeLessThan(1e-3)
    expect(Math.abs(world.elements[13] - (y0 + dy))).toBeLessThan(1e-3)

    disposeAll(parts)
  })

  it('keeps pick boxes in world space after the origin rebase', () => {
    const parts = makeBatch()

    const pickBox = parts.batch.getWorldPickBoxes().get('A')
    expect(pickBox).toBeDefined()
    expect(Math.abs(pickBox!.min.x - (x0 - 0.5))).toBeLessThan(1e-3)
    expect(Math.abs(pickBox!.max.x - (x0 + dx + 0.5))).toBeLessThan(1e-3)
    expect(Math.abs(pickBox!.min.y - (y0 - 0.5))).toBeLessThan(1e-3)
    expect(Math.abs(pickBox!.max.y - (y0 + dy + 0.5))).toBeLessThan(1e-3)

    disposeAll(parts)
  })

  it('places highlight overlays at the glyph world position after rebase', () => {
    const parts = makeBatch()
    const { batch, fallback } = parts

    expect(batch.setHighlightByObjectId('A', 'hover', true)).toBe(true)
    fallback.updateMatrixWorld(true)
    const overlays: THREE.Mesh[] = []
    fallback.traverse(obj => {
      const mesh = obj as THREE.Mesh
      if (
        mesh.isMesh &&
        !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh
      ) {
        overlays.push(mesh)
      }
    })
    expect(overlays).toHaveLength(2)
    expect(getHighlightUserData(overlays[0]).transientHighlight).toBe(true)
    expect(getHighlightUserData(overlays[0]).objectId).toBe('A')
    expect(Math.abs(overlays[0].matrixWorld.elements[12] - x0)).toBeLessThan(
      1e-3
    )
    expect(Math.abs(overlays[0].matrixWorld.elements[13] - y0)).toBeLessThan(
      1e-3
    )

    disposeAll(parts)
  })
})
