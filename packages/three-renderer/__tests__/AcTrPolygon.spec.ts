import { AcGeArea2d, AcGePoint2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrPolygon } from '../src/object/AcTrPolygon'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { wrapPatternBaseToLocalFrame } from '../src/style/AcTrFillMaterialManager'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createRectangularArea(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): AcGeArea2d {
  const loop = [
    new AcGePoint2d(minX, minY),
    new AcGePoint2d(maxX, minY),
    new AcGePoint2d(maxX, maxY),
    new AcGePoint2d(minX, maxY)
  ]

  const loops = [loop]
  return {
    getPoints: () => loops,
    tessellate: () => loops,
    buildHierarchy: () => ({
      children: [{ index: 0, children: [] }]
    })
  } as unknown as AcGeArea2d
}

function createPatternedTraits() {
  const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  traits.layer = 'A-HATCH'
  traits.drawOrder = -1
  traits.fillType = {
    solidFill: false,
    patternAngle: 0,
    definitionLines: [
      {
        angle: Math.PI / 4,
        base: { x: 10, y: 20 },
        offset: { x: 0, y: 5 },
        dashLengths: []
      }
    ]
  }
  return traits
}

function getFirstMesh(polygon: AcTrPolygon): THREE.Mesh {
  let mesh: THREE.Mesh | undefined
  polygon.traverse(object => {
    if (!mesh && object instanceof THREE.Mesh) {
      mesh = object
    }
  })
  if (!mesh) {
    throw new Error('Expected patterned hatch mesh')
  }
  return mesh
}

describe('AcTrPolygon wcsBbox', () => {
  it('stores the filled hatch bounds in wcsBbox', () => {
    const polygon = new AcTrPolygon(
      createRectangularArea(5, 10, 25, 30),
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(polygon.wcsBbox, [5, 10, 0], [25, 30, 0])
  })
})

describe('wrapPatternBaseToLocalFrame', () => {
  it('reduces a far origin-shifted base into one line-spacing period', () => {
    const spacing = 5
    const base = new THREE.Vector2(-10_650_100, -3_200_050)
    const offset = new THREE.Vector2(0, spacing)
    wrapPatternBaseToLocalFrame(base, offset, Math.PI / 4, 0, 0)
    expect(Math.hypot(base.x, base.y)).toBeLessThan(spacing)
  })

  it('preserves sample-space phase modulo line spacing', () => {
    const angle = Math.PI / 6
    const spacing = 7
    const original = new THREE.Vector2(-4_000_013, 2_500_009)
    const offset = new THREE.Vector2(0, spacing)
    const wrapped = original.clone()
    wrapPatternBaseToLocalFrame(wrapped, offset, angle, 0, 0)

    // rotate(base, -angle).y with shader convention (c*x - s*y, c*y + s*x)
    const sampleYOf = (base: THREE.Vector2) => {
      const c = Math.cos(-angle)
      const s = Math.sin(-angle)
      return c * base.y + s * base.x
    }
    const y0 = sampleYOf(original)
    const y1 = sampleYOf(wrapped)
    const phase = (y: number) => {
      const n = y / spacing
      return n - Math.floor(n)
    }
    expect(phase(y1)).toBeCloseTo(phase(y0), 8)
    expect(Math.abs(y1)).toBeLessThanOrEqual(spacing * 0.5 + 1e-9)
  })
})

describe('AcTrPolygon patterned hatch origin-shift', () => {
  it('rebases large-coordinate pattern fills and keeps pattern base local', () => {
    const minX = 10_650_000
    const minY = 3_200_000
    const maxX = minX + 200
    const maxY = minY + 100
    const centerX = (minX + maxX) * 0.5
    const centerY = (minY + maxY) * 0.5

    const polygon = new AcTrPolygon(
      createRectangularArea(minX, minY, maxX, maxY),
      createPatternedTraits(),
      new AcTrRenderContext()
    )

    expect(polygon.resolveDrawMode()).toBe('unbatch')
    expectWcsBboxCloseTo(polygon.wcsBbox, [minX, minY, 0], [maxX, maxY, 0])

    const mesh = getFirstMesh(polygon)
    expect(getSceneDrawableUserData(mesh).noBatch).toBe(true)
    expect(mesh.position.x).toBeCloseTo(centerX, 5)
    expect(mesh.position.y).toBeCloseTo(centerY, 5)

    const position = mesh.geometry.getAttribute('position')
    expect(position).toBeDefined()
    for (let i = 0; i < position.count; i++) {
      expect(Math.abs(position.getX(i))).toBeLessThan(200)
      expect(Math.abs(position.getY(i))).toBeLessThan(200)
    }

    const material = mesh.material as THREE.ShaderMaterial
    const patternLine = material.uniforms.u_patternLines.value[0] as {
      base: THREE.Vector2
      offset: THREE.Vector2
    }
    // Period-wrapped local base must stay near the hatch, not at ~1e7.
    expect(Math.hypot(patternLine.base.x, patternLine.base.y)).toBeLessThan(
      Math.abs(patternLine.offset.y) + 1
    )
  })

  it('leaves solid fills in WCS without mesh translation', () => {
    const polygon = new AcTrPolygon(
      createRectangularArea(5, 10, 25, 30),
      defaultTraits,
      new AcTrRenderContext()
    )

    const mesh = getFirstMesh(polygon)
    expect(mesh.position.x).toBe(0)
    expect(mesh.position.y).toBe(0)

    const position = mesh.geometry.getAttribute('position')
    let sawWorldX = false
    for (let i = 0; i < position.count; i++) {
      if (position.getX(i) >= 5) {
        sawWorldX = true
        break
      }
    }
    expect(sawWorldX).toBe(true)
  })
})
