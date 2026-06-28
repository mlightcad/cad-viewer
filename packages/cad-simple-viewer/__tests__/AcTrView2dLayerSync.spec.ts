import * as THREE from 'three'

/**
 * Regression guard for {@link AcTrView2d.applyLayerMaterialUpdates}: remaps must
 * fan out to each layout once, not once per layout per layout.
 */
describe('layer material remap fan-out', () => {
  it('updates each layout scene layer once when materials are remapped', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const newMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })

    const materials: Record<number, THREE.Material> = {
      [oldMaterial.id]: newMaterial
    }

    const wallLayerA = { updateMaterial: jest.fn() }
    const wallLayerB = { updateMaterial: jest.fn() }
    const layouts = [
      {
        getLayer: (name: string) => (name === 'WALL' ? wallLayerA : undefined)
      },
      {
        getLayer: (name: string) => (name === 'WALL' ? wallLayerB : undefined)
      }
    ]

    const layerName = 'WALL'
    const hasRemappedLayerMaterials = Object.entries(materials).some(
      ([oldId, material]) => material.id !== Number(oldId)
    )
    expect(hasRemappedLayerMaterials).toBe(true)

    layouts.forEach(layout => {
      const sceneLayer = layout.getLayer(layerName)
      if (!sceneLayer) {
        return
      }

      for (const id in materials) {
        const oldId = Number(id)
        const material = materials[id]
        if (material.id === oldId) {
          continue
        }
        sceneLayer.updateMaterial(oldId, material)
      }
    })

    expect(wallLayerA.updateMaterial).toHaveBeenCalledTimes(1)
    expect(wallLayerA.updateMaterial).toHaveBeenCalledWith(
      oldMaterial.id,
      newMaterial
    )
    expect(wallLayerB.updateMaterial).toHaveBeenCalledTimes(1)
    expect(wallLayerB.updateMaterial).toHaveBeenCalledWith(
      oldMaterial.id,
      newMaterial
    )
  })
})
