import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrLineSegments } from '../src/object/AcTrLineSegments'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const largeX = RTE_REBASE_THRESHOLD + 500_000

function findLargeCoordinateLineDrawable(group: AcTrBatchedGroup) {
  let drawable: THREE.Object3D | undefined
  group.traverse(child => {
    if (drawable) {
      return
    }
    if (child instanceof THREE.LineSegments || child instanceof LineSegments2) {
      if (Math.abs(child.position.x) >= RTE_REBASE_THRESHOLD) {
        drawable = child
      }
    }
  })
  return drawable
}

function getMaxAbsPositionComponent(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  if (position) {
    let maxAbs = 0
    for (let i = 0; i < position.count; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(position.getX(i)))
      maxAbs = Math.max(maxAbs, Math.abs(position.getY(i)))
      maxAbs = Math.max(maxAbs, Math.abs(position.getZ(i)))
    }
    return maxAbs
  }

  const instanceStart = geometry.getAttribute('instanceStart')
  if (!instanceStart) {
    return 0
  }
  let maxAbs = 0
  for (let i = 0; i < instanceStart.count; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getX(i)))
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getY(i)))
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getZ(i)))
  }
  return maxAbs
}

describe('AcTrLineSegments', () => {
  it('keeps geometry local and visible in a rebased batch at large coordinates', () => {
    const context = new AcTrRenderContext()
    const array = new Float32Array([
      largeX,
      3_000_000,
      0,
      largeX + 80,
      3_000_040,
      0
    ])
    const lineEntity = new AcTrLineSegments(
      array,
      3,
      new Uint16Array([0, 1]),
      defaultTraits,
      context
    )
    lineEntity.objectId = 'lineseg-large'
    lineEntity.visible = true

    expect(lineEntity.resolveDrawMode()).toBe('batch')

    const group = new AcTrBatchedGroup()
    group.addEntity(lineEntity)

    const drawable = findLargeCoordinateLineDrawable(group)
    expect(
      drawable instanceof THREE.LineSegments ||
        drawable instanceof LineSegments2
    ).toBe(true)
    if (
      !(
        drawable instanceof THREE.LineSegments ||
        drawable instanceof LineSegments2
      )
    ) {
      return
    }

    expect(drawable.frustumCulled).toBe(false)
    expect(getMaxAbsPositionComponent(drawable.geometry)).toBeLessThan(100)
    expect(drawable.position.x).toBeCloseTo(largeX + 40, 0)
  })
})

describe('AcTrLineSegments wcsBbox', () => {
  it('stores segment bounds in world coordinates', () => {
    const array = new Float32Array([1, 2, 0, 11, 22, 0])
    const lineEntity = new AcTrLineSegments(
      array,
      3,
      new Uint16Array([0, 1]),
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(lineEntity.wcsBbox, [1, 2, 0], [11, 22, 0])
  })

  it('keeps wcsBbox in world coordinates when geometry is rebased locally', () => {
    const array = new Float32Array([
      largeX,
      3_000_000,
      0,
      largeX + 80,
      3_000_040,
      0
    ])
    const lineEntity = new AcTrLineSegments(
      array,
      3,
      new Uint16Array([0, 1]),
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(
      lineEntity.wcsBbox,
      [largeX, 3_000_000, 0],
      [largeX + 80, 3_000_040, 0],
      0
    )
  })
})
