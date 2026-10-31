import * as THREE from 'three'

import { AcTrMeshGlyphWorldBatch } from '../src/batch/AcTrMeshGlyphWorldBatch'

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
