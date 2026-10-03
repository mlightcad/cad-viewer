import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrMText } from '../src/object/AcTrMText'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function line(context: AcTrRenderContext, id = 'LEAF') {
  const result = new AcTrLine(
    [
      { x: 2, y: 3, z: 0 },
      { x: 5, y: 4, z: 0 }
    ],
    traits,
    context,
    true
  )
  result.objectId = id
  result.layerName = '0'
  return result
}

function translate(group: AcTrEntity, x: number, y = 0) {
  group.applyMatrix(new AcGeMatrix3d().makeTranslation(x, y, 0))
}

describe('native group occurrences', () => {
  let context: AcTrRenderContext
  beforeEach(() => {
    context = new AcTrRenderContext()
  })
  afterEach(() => {
    context.dispose()
  })

  it('preserves repeated leaf handles and full nested placement through compaction and lazy clones', () => {
    const insert = (id: string, x: number) => {
      const result = new AcTrGroup([line(context)], context)
      result.objectId = id
      translate(result, x)
      return result
    }
    const template = new AcTrGroup([insert('A', 10), insert('B', 40)], context)
    template.objectId = 'OUTER'
    template.compactForInstancing()
    const first = template.fastDeepClone()
    const second = template.fastDeepClone()
    translate(first, 100, 200)
    translate(second, -100, -200)

    const boxes = first.wcsChildBoxes
    expect(boxes.map(box => box.id)).toEqual(['LEAF', 'LEAF'])
    expect(boxes.map(box => box.occurrence?.insertPath)).toEqual([['A'], ['B']])
    expect(boxes.map(box => box.occurrence?.instancePath)).toEqual([
      [0, 0],
      [1, 0]
    ])
    for (const [index, box] of boxes.entries()) {
      const expectedX = index === 0 ? 112 : 142
      const point = new THREE.Vector3(2, 3, 0).applyMatrix4(
        box.occurrence!.entityToSource
      )
      expect(point.toArray()).toEqual([expectedX, 203, 0])
      expect(box.minX).toBe(expectedX)
    }
    expect(
      second.wcsChildBoxes[0].occurrence!.entityToSource.elements[12]
    ).toBe(-90)
    expect(
      template.wcsChildBoxes[0].occurrence!.entityToSource.elements[12]
    ).toBe(10)
    const previousOccurrence = boxes[0].occurrence!
    translate(first, 5)
    // A consumer retaining an earlier snapshot cannot see a later mutation.
    expect(boxes[0].occurrence!.entityToSource.elements[12]).toBe(115)
    expect(previousOccurrence.entityToSource.elements[12]).toBe(110)
    expect(
      template.wcsChildBoxes[0].occurrence!.entityToSource.elements[12]
    ).toBe(10)
  })

  it('does not confuse anonymous MINSERT cells which share every native handle', () => {
    const template = new AcTrGroup([line(context)], context)
    const cells = [0, 20, 40].map(x => {
      const cell = template.fastDeepClone()
      translate(cell, x)
      return cell
    })
    const array = new AcTrGroup(cells, context)
    array.objectId = 'ARRAY'
    translate(array, 100)
    const boxes = array.wcsChildBoxes
    expect(boxes.map(box => box.occurrence?.insertPath)).toEqual([[], [], []])
    expect(boxes.map(box => box.occurrence?.instancePath)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0]
    ])
    expect(
      boxes.map(box => box.occurrence!.entityToSource.elements[12])
    ).toEqual([100, 120, 140])
  })

  it('composes noncommuting nested transforms in native source order', () => {
    const inner = new AcTrGroup([line(context)], context)
    inner.objectId = 'INNER'
    inner.applyMatrix(new AcGeMatrix3d().makeScale(-2, 3, 1))
    const middle = new AcTrGroup([inner], context)
    middle.objectId = 'MIDDLE'
    middle.applyMatrix(new AcGeMatrix3d().makeRotationZ(Math.PI / 2))
    const outer = new AcTrGroup([middle], context)
    outer.objectId = 'ROOT'
    translate(outer, 100, 50)
    const occurrence = outer.wcsChildBoxes[0].occurrence!
    expect(occurrence.insertPath).toEqual(['MIDDLE', 'INNER'])
    expect(occurrence.instancePath).toEqual([0, 0, 0])
    const point = new THREE.Vector3(2, 3, 0).applyMatrix4(
      occurrence.entityToSource
    )
    expect(point.x).toBeCloseTo(91)
    expect(point.y).toBeCloseTo(46)
  })

  it('adds a delayed repeated leaf even when its sibling is already indexed', () => {
    const ready = line(context)
    const delayed = line(context)
    delayed.wcsBbox.makeEmpty()
    const left = new AcTrGroup([ready], context)
    const right = new AcTrGroup([delayed], context)
    left.objectId = 'LEFT'
    right.objectId = 'RIGHT'
    translate(left, 10)
    translate(right, 40)
    const outer = new AcTrGroup([left, right], context)
    translate(outer, 100)
    expect(outer.wcsChildBoxes).toHaveLength(1)
    delayed.wcsBbox.set(new THREE.Vector3(2, 3, 0), new THREE.Vector3(5, 4, 0))
    outer.refreshWcsChildBoxesFromChildren()
    expect(outer.wcsChildBoxes.map(box => box.minX)).toEqual([112, 142])
    expect(outer.wcsChildBoxes.map(box => box.occurrence?.insertPath)).toEqual([
      ['LEFT'],
      ['RIGHT']
    ])
    outer.refreshWcsChildBoxesFromChildren()
    expect(outer.wcsChildBoxes).toHaveLength(2)
  })

  it('cancels WCS attribute inverse placement even after glyph placement folds its matrix', () => {
    const group = new AcTrGroup([line(context)], context)
    const transform = new AcGeMatrix3d().makeScale(-2, 3, 1)
    transform.setPosition(100, 50, 0)
    group.applyMatrix(transform)
    const attribute = line(context, 'ATTRIBUTE')
    attribute.applyMatrix(transform.clone().invert())
    group.addChild(attribute)
    // Deferred glyph draw absorbs the inverse into its render leaves.
    attribute.matrix.identity()
    const box = group.wcsChildBoxes.find(item => item.id === 'ATTRIBUTE')!
    const point = new THREE.Vector3(2, 3, 0).applyMatrix4(
      box.occurrence!.entityToSource
    )
    expect(point.x).toBeCloseTo(2)
    expect(point.y).toBeCloseTo(3)
    expect(box.minX).toBeCloseTo(2)
    expect(box.minY).toBeCloseTo(3)
  })

  it('retains deferred glyph identity through compacted template clones without double transforming parent-local bounds', () => {
    const glyph = new AcTrMText(
      { text: 'label', position: { x: 2, y: 3, z: 0 }, height: 1, width: 10 },
      traits,
      {
        name: 'Standard',
        standardFlag: 0,
        fixedTextHeight: 0,
        widthFactor: 1,
        obliqueAngle: 0,
        textGenerationFlag: 0,
        lastHeight: 1,
        font: 'simplex.shx',
        bigFont: ''
      },
      context,
      true
    )
    glyph.objectId = 'TEXT'
    const inner = new AcTrGroup([glyph], context)
    inner.objectId = 'INNER'
    translate(inner, 20)
    const outer = new AcTrGroup([inner], context)
    // Seal retains unresolved glyph wrappers without invoking font work.
    outer.sealForSharedClone()
    const copy = outer.fastDeepClone()
    translate(copy, 100)
    const copiedGlyph = copy.children.find(
      child => child instanceof AcTrMText
    ) as AcTrMText
    expect(copiedGlyph).toBeDefined()
    // Native deferred glyph bounds are expressed in the immediate parent's space.
    copiedGlyph.wcsBbox.set(
      new THREE.Vector3(22, 3, 0),
      new THREE.Vector3(25, 4, 0)
    )
    copy.refreshWcsChildBoxesFromChildren()
    expect(copy.wcsChildBoxes[0]).toMatchObject({
      minX: 122,
      minY: 3,
      maxX: 125,
      maxY: 4
    })
    expect(copy.wcsChildBoxes[0].occurrence?.insertPath).toEqual(['INNER'])
    expect(copy.wcsChildBoxes[0].occurrence!.entityToSource.elements[12]).toBe(
      120
    )
    expect(outer.wcsChildBoxes).toHaveLength(0)
  })

  it('assigns source identities to coalesced native lines without geometry-origin offsets', () => {
    const group = new AcTrGroup([], context)
    group.addExternalChildBoxes([
      { id: 'LINE-A', minX: 6_000_000, minY: 0, maxX: 6_000_002, maxY: 1 },
      { id: 'LINE-B', minX: 6_000_005, minY: 0, maxX: 6_000_009, maxY: 1 }
    ])
    group.sealForSharedClone()
    const clone = group.fastDeepClone()
    translate(clone, 25)
    expect(clone.wcsChildBoxes.map(box => box.occurrence?.entityId)).toEqual([
      'LINE-A',
      'LINE-B'
    ])
    expect(
      clone.wcsChildBoxes.map(
        box => box.occurrence!.entityToSource.elements[12]
      )
    ).toEqual([25, 25])
    expect(
      clone.wcsChildBoxes.map(box => box.occurrence?.instancePath)
    ).toEqual([[0], [1]])
  })

  it('uses one cloned owner when a deferred wrapper is both a source and a live child', () => {
    const deferred = new AcTrEntity(context)
    deferred.objectId = 'DELAYED'
    const template = new AcTrGroup([deferred], context)
    const clone = template.fastDeepClone()
    expect(clone.isCompacted).toBe(false)
    expect(clone.children).toHaveLength(1)
    expect(clone.getSourceEntities()).toEqual([clone.children[0]])
    expect(clone.children[0]).not.toBe(deferred)
    expect(template.children[0]).toBe(deferred)
  })
})
