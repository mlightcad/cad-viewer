import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: AcTrRenderContext,
  layerName = '0'
) {
  const line = new AcTrLine(
    [
      { x: start.x, y: start.y, z: 0 },
      { x: end.x, y: end.y, z: 0 }
    ],
    defaultTraits,
    context,
    false
  )
  line.objectId = objectId
  line.layerName = layerName
  line.userData.layerName = layerName
  return line
}

describe('AcTrGroup wcsBbox', () => {
  it('unions child wcsBbox values into the group wcsBbox', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('line-b', { x: 2, y: 5 }, { x: 8, y: 15 }, context)

    const group = new AcTrGroup([lineA, lineB], context)

    expectWcsBboxCloseTo(group.wcsBbox, [0, 0, 0], [10, 15, 0])
  })

  it('stores per-child WCS boxes for spatial indexing', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('line-b', { x: 2, y: 5 }, { x: 8, y: 15 }, context)

    const group = new AcTrGroup([lineA, lineB], context)

    expect(group.wcsChildBoxes).toEqual([
      { minX: 0, minY: 0, maxX: 10, maxY: 0, id: 'line-a' },
      { minX: 2, minY: 5, maxX: 8, maxY: 15, id: 'line-b' }
    ])
  })

  it('transforms group and child WCS boxes together via applyMatrix', () => {
    const context = new AcTrRenderContext()
    const line = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 5 }, context)
    const group = new AcTrGroup([line], context)

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(50, 25, 0))

    expectWcsBboxCloseTo(group.wcsBbox, [50, 25, 0], [60, 30, 0])
    expect(group.wcsChildBoxes[0]).toMatchObject({
      minX: 50,
      minY: 25,
      maxX: 60,
      maxY: 30,
      id: 'line-a'
    })
  })

  it('keeps wcsBbbox aligned with wcsChildBoxes union after insert transform', () => {
    const context = new AcTrRenderContext()
    const line0 = createLine('line-0', { x: 0, y: 0 }, { x: 10, y: 0 }, context, '0')
    const lineL2 = createLine(
      'line-l2',
      { x: 5, y: 5 },
      { x: 15, y: 10 },
      context,
      'L2'
    )

    const group = new AcTrGroup([line0, lineL2], context)
    expect(group.isOnTheSameLayer).toBe(false)

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 200, 0))

    expectWcsBboxCloseTo(group.wcsBbox, [100, 200, 0], [115, 210, 0])
    expect(group.wcsChildBoxes).toEqual([
      { minX: 100, minY: 200, maxX: 110, maxY: 200, id: 'line-0' },
      { minX: 105, minY: 205, maxX: 115, maxY: 210, id: 'line-l2' }
    ])

    const union = new THREE.Box3()
    for (const box of group.wcsChildBoxes) {
      union.union(
        new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY, 0),
          new THREE.Vector3(box.maxX, box.maxY, 0)
        )
      )
    }
    expectWcsBboxCloseTo(group.wcsBbox, [union.min.x, union.min.y, 0], [
      union.max.x,
      union.max.y,
      0
    ])
  })
})
