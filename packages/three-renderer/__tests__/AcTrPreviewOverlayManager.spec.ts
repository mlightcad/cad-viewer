import * as THREE from 'three'

import { AcTrPreviewOverlayManager } from '../src/object/AcTrPreviewOverlayManager'

describe('AcTrPreviewOverlayManager', () => {
  it('keeps the preview overlay attached to the scene across manager recreation', () => {
    const scene = new THREE.Scene()
    let manager = new AcTrPreviewOverlayManager(scene)
    expect(scene.children.some(child => child.name === 'Entity_Preview_Group')).toBe(
      true
    )

    manager.clear()
    scene.clear()
    manager = new AcTrPreviewOverlayManager(scene)

    const root = new THREE.Group()
    root.add(new THREE.Group())
    manager.add(root)

    const overlay = scene.getObjectByName('Entity_Preview_Group')
    expect(overlay).toBeDefined()
    expect(overlay?.children).toHaveLength(1)
  })
})
