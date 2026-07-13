import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { RTE_REBASE_THRESHOLD } from '../src/draw/AcTrBatchDrawPolicy'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrPoint } from '../src/object/AcTrPoint'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const dotStyle = { displayMode: 0, displaySize: 0 }
const crossStyle = { displayMode: 2, displaySize: 0 }
const circleCrossStyle = { displayMode: 35, displaySize: 0 }
const largeX = RTE_REBASE_THRESHOLD + 500_000
const largePoint = {
  x: 3_134_356.509824163,
  y: 1_394_770.78992697,
  z: 0
}

function getMaxAbsPositionComponent(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  if (!position) {
    return 0
  }
  let maxAbs = 0
  for (let i = 0; i < position.count; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(position.getX(i)))
    maxAbs = Math.max(maxAbs, Math.abs(position.getY(i)))
    maxAbs = Math.max(maxAbs, Math.abs(position.getZ(i)))
  }
  return maxAbs
}

function findLargeCoordinatePointSymbolDrawable(group: AcTrBatchedGroup) {
  let drawable: THREE.LineSegments | undefined
  group.traverse(child => {
    if (drawable) {
      return
    }
    if (
      child instanceof THREE.LineSegments &&
      Math.abs(child.position.x) >= RTE_REBASE_THRESHOLD
    ) {
      drawable = child
    }
  })
  return drawable
}

describe('AcTrPoint wcsBbox', () => {
  it('stores the point location in wcsBbox for dot display mode', () => {
    const point = new AcTrPoint(
      { x: 12, y: 34, z: 0 },
      defaultTraits,
      dotStyle,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(point.wcsBbox, [12, 34, 0], [12, 34, 0])
  })

  it('includes symbol geometry in wcsBbox for marker display mode', () => {
    const point = new AcTrPoint(
      { x: 100, y: 200, z: 0 },
      defaultTraits,
      crossStyle,
      new AcTrRenderContext()
    )

    expect(point.wcsBbox.isEmpty()).toBe(false)
    expect(point.wcsBbox.min.x).toBeLessThanOrEqual(100)
    expect(point.wcsBbox.max.x).toBeGreaterThanOrEqual(100)
    expect(point.wcsBbox.min.y).toBeLessThanOrEqual(200)
    expect(point.wcsBbox.max.y).toBeGreaterThanOrEqual(200)
  })
})

describe('AcTrPoint large coordinates', () => {
  it('keeps point symbol geometry local and stores world placement on position', () => {
    const point = new AcTrPoint(
      largePoint,
      defaultTraits,
      circleCrossStyle,
      new AcTrRenderContext()
    )

    const symbol = point.children.find(
      child => child instanceof THREE.LineSegments
    ) as THREE.LineSegments | undefined

    expect(symbol).toBeDefined()
    expect(getMaxAbsPositionComponent(symbol!.geometry)).toBeLessThan(2)
    expect(symbol!.position.x).toBeCloseTo(largePoint.x, 6)
    expect(symbol!.position.y).toBeCloseTo(largePoint.y, 6)
  })

  it('keeps wcsBbox in world coordinates when geometry is rebased locally', () => {
    const point = new AcTrPoint(
      { x: largeX, y: 2_000_000, z: 0 },
      defaultTraits,
      circleCrossStyle,
      new AcTrRenderContext()
    )

    expect(point.wcsBbox.isEmpty()).toBe(false)
    expect(point.wcsBbox.min.x).toBeLessThanOrEqual(largeX)
    expect(point.wcsBbox.max.x).toBeGreaterThanOrEqual(largeX)
    expect(point.wcsBbox.min.y).toBeLessThanOrEqual(2_000_000)
    expect(point.wcsBbox.max.y).toBeGreaterThanOrEqual(2_000_000)
  })

  it('renders large point symbols correctly in a rebased batch', () => {
    const pointEntity = new AcTrPoint(
      largePoint,
      defaultTraits,
      circleCrossStyle,
      new AcTrRenderContext()
    )
    pointEntity.objectId = 'point-large'
    pointEntity.visible = true

    expect(pointEntity.resolveDrawMode()).toBe('batch')

    const group = new AcTrBatchedGroup()
    group.addEntity(pointEntity)

    const drawable = findLargeCoordinatePointSymbolDrawable(group)
    expect(drawable).toBeDefined()
    expect(getMaxAbsPositionComponent(drawable!.geometry)).toBeLessThan(2)
    expect(drawable!.position.x).toBeCloseTo(largePoint.x, 6)
    expect(drawable!.position.y).toBeCloseTo(largePoint.y, 6)
    expect(drawable!.frustumCulled).toBe(false)
  })
})
