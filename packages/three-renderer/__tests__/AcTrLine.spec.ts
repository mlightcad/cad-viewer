import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import type { AcTrBatchDrawPolicy } from '../src/draw/AcTrBatchDrawPolicy'
import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const largeX = RTE_REBASE_THRESHOLD + 500_000

const unbatchPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode: () => 'unbatch'
}

const batchPolicy: AcTrBatchDrawPolicy = {
  resolveDrawMode: () => 'batch'
}

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

describe('AcTrLine', () => {
  it('marks flat line drawables as noBatch when resolveDrawMode returns unbatch', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager(), unbatchPolicy)
    const line = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      defaultTraits,
      context,
      false
    )

    expect(line.resolveDrawMode()).toBe('unbatch')
    const drawable = line.children[0]
    expect(getSceneDrawableUserData(drawable).noBatch).toBe(true)
    expect(getSceneDrawableUserData(line).noBatch).toBeUndefined()
  })

  it('leaves batchable line drawables unmarked when resolveDrawMode returns batch', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager(), batchPolicy)
    const line = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      defaultTraits,
      context,
      false
    )

    expect(line.resolveDrawMode()).toBe('batch')
    const drawable = line.children[0] as THREE.Object3D
    expect(getSceneDrawableUserData(drawable).noBatch).toBeUndefined()
  })

  it('keeps geometry local and visible in a rebased batch at large coordinates', () => {
    const context = new AcTrRenderContext()
    const lineEntity = new AcTrLine(
      [
        { x: largeX, y: 2_000_000, z: 0 },
        { x: largeX + 100, y: 2_000_050, z: 0 }
      ],
      defaultTraits,
      context
    )
    lineEntity.objectId = 'line-large'
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
    expect(getMaxAbsPositionComponent(drawable.geometry)).toBeLessThan(1000)
    expect(drawable.position.x).toBeCloseTo(largeX + 50, 0)
  })
})

describe('AcTrLine wcsBbox', () => {
  it('stores endpoint bounds in world coordinates', () => {
    const line = new AcTrLine(
      [
        { x: 3, y: 4, z: 0 },
        { x: 13, y: 14, z: 0 }
      ],
      defaultTraits,
      new AcTrRenderContext(),
      false
    )

    expectWcsBboxCloseTo(line.wcsBbox, [3, 4, 0], [13, 14, 0])
  })

  it('keeps wcsBbox in world coordinates when geometry is rebased locally', () => {
    const line = new AcTrLine(
      [
        { x: largeX, y: 2_000_000, z: 0 },
        { x: largeX + 100, y: 2_000_050, z: 0 }
      ],
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(
      line.wcsBbox,
      [largeX, 2_000_000, 0],
      [largeX + 100, 2_000_050, 0],
      0
    )
  })
})
