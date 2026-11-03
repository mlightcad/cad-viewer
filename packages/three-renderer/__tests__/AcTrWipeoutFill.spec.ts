import { AcGeArea2d, AcGePoint2d, AcGePolyline2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderer } from '../src/renderer/AcTrRenderer'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600)
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

function rectangleArea(width: number, height: number): AcGeArea2d {
  const area = new AcGeArea2d()
  area.add(
    new AcGePolyline2d(
      [
        new AcGePoint2d(0, 0),
        new AcGePoint2d(width, 0),
        new AcGePoint2d(width, height),
        new AcGePoint2d(0, height)
      ],
      true
    )
  )
  return area
}

/** Pattern a previous hatch leaves in the shared traits. */
const STALE_PATTERN = {
  solidFill: false,
  patternAngle: 0,
  definitionLines: [
    {
      angle: Math.PI / 4,
      base: { x: 0, y: 0 },
      offset: { x: -0.4419, y: 0.4419 },
      dashLengths: []
    }
  ]
}

function meshMaterials(object: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = []
  object.traverse(node => {
    if (node instanceof THREE.Mesh) {
      const material = node.material as THREE.Material | THREE.Material[]
      materials.push(...(Array.isArray(material) ? material : [material]))
    }
  })
  return materials
}

describe('AcTrRenderer wipeout fill', () => {
  it('draws a background fill with a solid material despite a stale pattern', () => {
    const renderer = createRenderer()
    const traits = renderer.subEntityTraits
    traits.fillType = STALE_PATTERN
    traits.isBackgroundFill = true

    const drawn = renderer.area(rectangleArea(560, 2100))
    const materials = meshMaterials(drawn as unknown as THREE.Object3D)
    expect(materials.length).toBeGreaterThan(0)
    for (const material of materials) {
      expect(material).not.toBeInstanceOf(THREE.ShaderMaterial)
    }
  })

  it('keeps the hatch shader for patterned hatches', () => {
    const renderer = createRenderer()
    const traits = renderer.subEntityTraits
    traits.fillType = STALE_PATTERN
    traits.isBackgroundFill = false
    traits.drawOrder = -1

    const drawn = renderer.area(rectangleArea(20, 20))
    const materials = meshMaterials(drawn as unknown as THREE.Object3D)
    expect(materials.some(m => m instanceof THREE.ShaderMaterial)).toBe(true)
  })
})
