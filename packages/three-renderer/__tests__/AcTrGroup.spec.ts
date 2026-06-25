import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrEntity } from '../src/object/AcTrEntity'
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

  it('marks isOnTheSameLayer false when attributes are appended after construction', () => {
    const context = new AcTrRenderContext()
    const line0 = createLine(
      'line-0',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      '0'
    )

    const group = new AcTrGroup([line0], context)
    expect(group.isOnTheSameLayer).toBe(true)

    const attribute = createLine(
      'attrib-1',
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      context,
      'CARTOUCHE'
    )
    group.addChild(attribute)

    expect(group.isOnTheSameLayer).toBe(false)
  })

  it('keeps wcsBbbox aligned with wcsChildBoxes union after insert transform', () => {
    const context = new AcTrRenderContext()
    const line0 = createLine(
      'line-0',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      '0'
    )
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
    expectWcsBboxCloseTo(
      group.wcsBbox,
      [union.min.x, union.min.y, 0],
      [union.max.x, union.max.y, 0]
    )
  })

  it('keeps wcsBbox aligned with child-box union after rotated insert transform', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('line-b', { x: 0, y: 0 }, { x: 0, y: 10 }, context)
    const group = new AcTrGroup([lineA, lineB], context)

    group.applyMatrix(new AcGeMatrix3d().makeRotationZ(Math.PI / 4))

    const union = new THREE.Box3()
    for (const box of group.wcsChildBoxes) {
      union.union(
        new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY, 0),
          new THREE.Vector3(box.maxX, box.maxY, 0)
        )
      )
    }
    expectWcsBboxCloseTo(
      group.wcsBbox,
      [union.min.x, union.min.y, 0],
      [union.max.x, union.max.y, 0]
    )
  })

  it('rebuilds WCS child boxes after deferred geometry is attached', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-a',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      'L2'
    )
    const deferred = createLine(
      'line-deferred',
      { x: 5, y: 5 },
      { x: 15, y: 10 },
      context,
      'L3'
    )
    deferred.wcsBbox.makeEmpty()

    const group = new AcTrGroup([line, deferred], context)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 200, 0))

    expect(group.wcsChildBoxes).toHaveLength(1)

    deferred.wcsBbox.set(
      new THREE.Vector3(5, 5, 0),
      new THREE.Vector3(15, 10, 0)
    )
    group.refreshWcsChildBoxesFromChildren()

    expect(group.wcsChildBoxes).toHaveLength(2)
    expect(group.wcsChildBoxes[1]).toMatchObject({
      minX: 105,
      minY: 205,
      maxX: 115,
      maxY: 210,
      id: 'line-deferred'
    })
    expectWcsBboxCloseTo(group.wcsBbox, [100, 200, 0], [115, 210, 0])
  })

  it('keeps WCS child boxes after applyMatrix and refreshWcsChildBoxesFromChildren', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new AcTrGroup([line], context)

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))
    group.refreshWcsChildBoxesFromChildren()

    expect(group.wcsChildBoxes[0]).toMatchObject({
      minX: 394,
      minY: 28,
      maxX: 574,
      maxY: 28,
      id: 'line-title'
    })
    expectWcsBboxCloseTo(group.wcsBbox, [394, 28, 0], [574, 28, 0])
  })

  it('does not inflate aggregate wcsBbbox when block-local attributes are added after applyMatrix', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new AcTrGroup([line], context)

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))

    // AcDbRenderingCache.draw converts WCS attribute geometry to block-local
    // space before addChild while the INSERT transform remains on the group.
    const attribute = createLine(
      'attr-1',
      { x: -180, y: 0 },
      { x: -170, y: 10 },
      context,
      'CARTOUCHE'
    )
    group.addChild(attribute)

    expect(group.wcsChildBoxes.find(box => box.id === 'line-title')).toMatchObject(
      {
        minX: 394,
        minY: 28,
        maxX: 574,
        maxY: 28
      }
    )
    expect(group.wcsChildBoxes.find(box => box.id === 'attr-1')).toMatchObject({
      minX: 394,
      minY: 0,
      maxX: 404,
      maxY: 10
    })
    expectWcsBboxCloseTo(group.wcsBbox, [394, 0, 0], [574, 28, 0])
  })

  it('preserves applyMatrix child boxes when refresh runs after deferred syncDraw', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-a',
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      context
    )
    const group = new AcTrGroup([line], context)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 200, 0))

    // Block-local wcsBbbox can remain far from WCS after nested INSERT assembly.
    // A full refresh from source entities would inflate spatial bounds again.
    line.wcsBbox.set(
      new THREE.Vector3(-4_000_000, 0, 0),
      new THREE.Vector3(-3_999_990, 5, 0)
    )

    group.refreshWcsChildBoxesFromChildren()

    expect(group.wcsChildBoxes[0]).toMatchObject({
      minX: 100,
      minY: 200,
      maxX: 110,
      maxY: 205,
      id: 'line-a'
    })
    expectWcsBboxCloseTo(group.wcsBbox, [100, 200, 0], [110, 205, 0])
  })

  it('rebuilds nested insert child boxes after refreshWcsChildBoxesFromChildren', () => {
    const context = new AcTrRenderContext()
    const innerLine = createLine(
      'inner-line',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context
    )
    const innerGroup = new AcTrGroup([innerLine], context)
    innerGroup.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 200, 0))

    const outerGroup = new AcTrGroup([innerGroup], context)
    outerGroup.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))
    outerGroup.refreshWcsChildBoxesFromChildren()

    expect(
      outerGroup.wcsChildBoxes.find(box => box.id === 'inner-line')
    ).toMatchObject({
      minX: 674,
      minY: 200,
      maxX: 684,
      maxY: 200
    })
    expectWcsBboxCloseTo(outerGroup.wcsBbox, [674, 200, 0], [684, 200, 0])
  })

  it('skips invalid child boxes when applying insert transform', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-a',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      'L2'
    )
    const group = new AcTrGroup([line], context)
    group.wcsChildBoxes.push({
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      id: 'deferred-text'
    })

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(50, 25, 0))

    expect(group.wcsChildBoxes[0]).toMatchObject({
      minX: 50,
      minY: 25,
      maxX: 60,
      maxY: 25,
      id: 'line-a'
    })
    expect(Number.isFinite(group.wcsChildBoxes[1].minX)).toBe(false)
    expectWcsBboxCloseTo(group.wcsBbox, [50, 25, 0], [60, 25, 0])
  })
})

describe('AcTrGroup dispose', () => {
  it('clears detached source entities and disposes flattened render children', () => {
    const context = new AcTrRenderContext()
    const line = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const group = new AcTrGroup([line], context)

    expect(group.getSourceEntities()).toHaveLength(1)
    expect(group.getSourceEntities()[0]).toBe(line)
    expect(group.children).toHaveLength(1)

    const meshChild = group.children[0] as THREE.Object3D & {
      geometry: THREE.BufferGeometry
    }
    const geometryDispose = jest.spyOn(meshChild.geometry, 'dispose')

    group.dispose()

    expect(group.getSourceEntities()).toHaveLength(0)
    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(group.children).toHaveLength(0)
  })

  it('does not double-dispose attributes still attached as children', () => {
    const context = new AcTrRenderContext()
    const line0 = createLine(
      'line-0',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      '0'
    )
    const group = new AcTrGroup([line0], context)
    const attribute = createLine(
      'attrib-1',
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      context,
      'CARTOUCHE'
    )
    group.addChild(attribute)

    expect(group.getSourceEntities()).toContain(attribute)

    const disposeObjectSpy = jest.spyOn(AcTrEntity, 'disposeObject')

    group.dispose()

    const attributeShellCalls = disposeObjectSpy.mock.calls.filter(
      ([target, removeFromParent]) =>
        target === attribute && removeFromParent === false
    )
    const attributeCalls = disposeObjectSpy.mock.calls.filter(
      ([target]) => target === attribute
    )

    expect(attributeShellCalls).toHaveLength(0)
    expect(attributeCalls.length).toBeLessThanOrEqual(1)
    expect(group.getSourceEntities()).toHaveLength(0)

    disposeObjectSpy.mockRestore()
  })

  it('syncDraw does not recurse infinitely on empty nested groups', () => {
    const context = new AcTrRenderContext()
    const emptyInnerGroup = new AcTrGroup([], context)
    const outerGroup = new AcTrGroup([emptyInnerGroup], context)

    expect(() => outerGroup.syncDraw()).not.toThrow()
  })
})
