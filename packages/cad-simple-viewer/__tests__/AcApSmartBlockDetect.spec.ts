/**
 * @jest-environment node
 */
import {
  AcDbArc,
  AcDbAttribute,
  AcDbBlockReference,
  AcDbCircle,
  AcDbDatabase,
  type AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbText,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acapConvertSmartBlockCluster,
  acapDetectSmartBlocks,
  acapDetectSmartBlocksAsync
} from '../src/smartBlock'

const line = (x0: number, y0: number, x1: number, y1: number) =>
  new AcDbLine(new AcGePoint3d(x0, y0, 0), new AcGePoint3d(x1, y1, 0))

const at = (x: number, y: number, angle = 0) =>
  new AcGeMatrix3d()
    .makeTranslation(x, y, 0)
    .multiply(new AcGeMatrix3d().makeRotationZ(angle))

const mirroredAt = (x: number, y: number) =>
  at(x, y).multiply(new AcGeMatrix3d().makeScale(1, -1, 1))

/** Door: frame, leaf and swing arc. */
function door(): AcDbEntity[] {
  return [
    line(0, 0, 10, 0),
    line(0, 0, 0, 10),
    new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)
  ]
}

/** Column marker: square with a cross and a circle. */
function column(): AcDbEntity[] {
  return [
    line(-3, -3, 3, -3),
    line(3, -3, 3, 3),
    line(3, 3, -3, 3),
    line(-3, 3, -3, -3),
    line(-3, -3, 3, 3),
    new AcDbCircle(new AcGePoint3d(0, 0, 0), 1.5)
  ]
}

describe('Smart Blocks detection', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
  })

  const add = (entities: AcDbEntity[], matrix = at(0, 0)) => {
    const placed = entities.map(e => e.transformBy(matrix))
    db.tables.blockTable.modelSpace.appendEntity(placed)
    return placed.map(e => e.objectId)
  }

  test('groups rotated and mirrored doors without their walls', () => {
    const placements = [
      at(0, 0),
      at(100, 0, Math.PI / 2),
      mirroredAt(200, 0),
      at(300, 50, Math.PI)
    ]
    const doorIds = placements.map(m => add(door(), m))
    // Each door touches a wall of a different length.
    placements.forEach((m, i) => add([line(10, 0, 30 + 7 * i, 0)], m))
    // Unrelated noise.
    add([
      line(500, 500, 520, 530),
      new AcDbCircle(new AcGePoint3d(600, 0, 0), 4)
    ])

    const clusters = acapDetectSmartBlocks(db, { minSavings: 0 })
    expect(clusters).toHaveLength(1)
    const [cluster] = clusters
    expect(cluster.instanceCount).toBe(4)
    expect(cluster.entityCount).toBe(3)
    const found = [cluster.ids, ...cluster.matches.map(m => m.ids)]
      .map(ids => [...ids].sort().join())
      .sort()
    expect(found).toEqual(doorIds.map(ids => [...ids].sort().join()).sort())
  })

  test('finds several groups that never share entities', () => {
    for (let i = 0; i < 3; i++) add(door(), at(i * 100, 0, i))
    for (let i = 0; i < 5; i++) add(column(), at(i * 50, 300, i * 0.3))

    const clusters = acapDetectSmartBlocks(db, { minSavings: 0 })
    expect(clusters.map(c => [c.instanceCount, c.entityCount])).toEqual([
      [5, 6],
      [3, 3]
    ])
    const all = clusters.flatMap(c => [
      ...c.ids,
      ...c.matches.flatMap(m => m.ids)
    ])
    expect(new Set(all).size).toBe(all.length)
  })

  test('takes labels whose text differs into the group', () => {
    const labels = ['1', '10', 'B', '7']
    labels.forEach((label, i) => {
      const x = i * 100
      const text = new AcDbText()
      text.textString = label
      text.height = 20
      text.widthFactor = 0.6
      // Left-aligned: the insertion point moves with the string length.
      text.position = new AcGePoint3d(x - 3 * label.length, -4, 0)
      // PDF imports leave the halves' centers a few millionths apart.
      const jitter = i % 2 ? 4e-5 : 0
      add([
        new AcDbArc(new AcGePoint3d(x, 0, 0), 20, Math.PI, 2 * Math.PI),
        new AcDbArc(new AcGePoint3d(x + jitter, jitter, 0), 20, 0, Math.PI),
        text
      ])
    })

    const [cluster] = acapDetectSmartBlocks(db, { minSavings: 0 })
    expect(cluster.instanceCount).toBe(4)
    expect(cluster.entityCount).toBe(3)
    expect(cluster.matches.map(m => m.texts[2]).sort()).toEqual(
      ['10', '7', 'B'].sort()
    )
  })

  test('ignores dashed line pieces and too rare shapes', () => {
    // A dashed line drawn as separate pieces.
    for (let i = 0; i < 40; i++) add([line(i * 3, 0, i * 3 + 2, 0)])
    // Only two doors: below the default minimum of three instances.
    add(door(), at(0, 100))
    add(door(), at(100, 100))

    expect(acapDetectSmartBlocks(db, { minSavings: 0 })).toHaveLength(0)
    expect(
      acapDetectSmartBlocks(db, { minInstances: 2, minSavings: 0 })
    ).toHaveLength(1)
    // Two doors of three shapes save four entities: below the default.
    expect(acapDetectSmartBlocks(db, { minInstances: 2 })).toHaveLength(0)
  })

  const bubbles = (labels: string[]) =>
    labels.forEach((label, i) => {
      const x = i * 100
      const text = new AcDbText()
      text.textString = label
      text.height = 20
      text.position = new AcGePoint3d(x - 5, -8, 0)
      add([
        new AcDbArc(new AcGePoint3d(x, 0, 0), 20, Math.PI, 2 * Math.PI),
        new AcDbArc(new AcGePoint3d(x, 0, 0), 20, 0, Math.PI),
        text
      ])
    })

  test('links parts that do not touch, like a marker inside a door', () => {
    // Frame and leaf, a marker circle clear of both, and a label.
    const symbol = (label: string) => {
      const text = new AcDbText()
      text.textString = label
      text.height = 1
      text.position = new AcGePoint3d(2, 1, 0)
      return [
        line(0, 0, 10, 0),
        line(0, 0, 0, 4),
        new AcDbCircle(new AcGePoint3d(8, 3, 0), 1),
        text
      ]
    }
    add(symbol('R1'), at(0, 0))
    add(symbol('R1'), at(100, 0))
    add(symbol('R1'), at(0, 100, Math.PI / 2))
    add(symbol('R2'), at(200, 0))

    const [cluster, ...rest] = acapDetectSmartBlocks(db)
    expect(rest).toHaveLength(0)
    expect(cluster.instanceCount).toBe(4)
    expect(cluster.entityCount).toBe(4)
  })

  test('async detection reports progress and matches the sync result', async () => {
    for (let i = 0; i < 5; i++) add(column(), at(i * 50, 300, i * 0.3))
    const fractions: number[] = []
    const clusters = await acapDetectSmartBlocksAsync(
      db,
      {},
      { onProgress: p => fractions.push(p.fraction), sliceMs: 0 }
    )
    expect(clusters.map(c => c.instanceCount)).toEqual(
      acapDetectSmartBlocks(db).map(c => c.instanceCount)
    )
    expect(fractions.length).toBeGreaterThan(2)
    expect(fractions[fractions.length - 1]).toBe(1)
    expect([...fractions].sort((a, b) => a - b)).toEqual(fractions)
  })

  test('async detection can be aborted', async () => {
    for (let i = 0; i < 5; i++) add(column(), at(i * 50, 300, i * 0.3))
    const controller = new AbortController()
    controller.abort()
    await expect(
      acapDetectSmartBlocksAsync(db, {}, { signal: controller.signal })
    ).rejects.toBeDefined()
  })

  test('converts a group into one block with attributes', () => {
    bubbles(['1', '10', 'B', '7', '3'])
    const [cluster] = acapDetectSmartBlocks(db)
    expect(cluster.instanceCount).toBe(5)

    const result = acapConvertSmartBlockCluster(db, cluster, { name: 'AXIS' })
    expect(result.references).toHaveLength(5)
    expect(result.erasedCount).toBe(15)
    const values = result.references.map(ref =>
      ([...ref.attributeIterator()] as AcDbAttribute[])
        .map(a => `${a.tag}=${a.textString}`)
        .join()
    )
    expect(values.sort()).toEqual(
      ['TEXT1=1', 'TEXT1=10', 'TEXT1=3', 'TEXT1=7', 'TEXT1=B'].sort()
    )
    const model = [...db.tables.blockTable.modelSpace.newIterator()]
    expect(model.every(e => e instanceof AcDbBlockReference)).toBe(true)
  })
})
