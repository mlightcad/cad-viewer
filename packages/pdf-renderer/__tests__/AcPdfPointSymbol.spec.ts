import {
  AcDbDatabase,
  AcDbPoint,
  acdbHostApplicationServices,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'
import type { AcPdfOp } from '../src/renderer/AcPdfStyle'

function opsOf(entity: AcPdfEntity): AcPdfOp[] {
  const ops: AcPdfOp[] = []
  entity.forEachOp(op => ops.push(op))
  return ops
}

function strokePoints(ops: AcPdfOp[]) {
  return ops
    .filter(op => op.kind === 'stroke')
    .flatMap(op => (op.kind === 'stroke' ? op.points : []))
}

describe('AcPdfRenderer point style', () => {
  const at = new AcGePoint3d(10, 20, 0)

  it('keeps PDMODE 0 as a filled dot at the point', () => {
    const renderer = new AcPdfRenderer()
    const entity = renderer.point(at, { displayMode: 0, displaySize: 0 })
    const ops = opsOf(entity)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'circle', x: 10, y: 20 })
  })

  it('draws nothing for PDMODE 1', () => {
    const renderer = new AcPdfRenderer()
    const entity = renderer.point(at, { displayMode: 1, displaySize: 0 })
    expect(opsOf(entity)).toHaveLength(0)
  })

  it('strokes a plus at the point instead of a filled disk', () => {
    const renderer = new AcPdfRenderer()
    const entity = renderer.point(at, { displayMode: 2, displaySize: 0 })
    const ops = opsOf(entity)
    expect(ops.every(op => op.kind === 'stroke')).toBe(true)
    const pts = strokePoints(ops)
    expect(pts).toEqual(
      expect.arrayContaining([
        { x: 9, y: 20 },
        { x: 11, y: 20 },
        { x: 10, y: 19 },
        { x: 10, y: 21 }
      ])
    )
    expect(entity.box.min.x).toBeCloseTo(9)
    expect(entity.box.max.x).toBeCloseTo(11)
    expect(entity.box.min.y).toBeCloseTo(19)
    expect(entity.box.max.y).toBeCloseTo(21)
  })

  it('scales the symbol by positive PDSIZE', () => {
    const renderer = new AcPdfRenderer()
    const entity = renderer.point(at, { displayMode: 2, displaySize: 4 })
    const pts = strokePoints(opsOf(entity))
    expect(pts).toEqual(
      expect.arrayContaining([
        { x: 6, y: 20 },
        { x: 14, y: 20 },
        { x: 10, y: 16 },
        { x: 10, y: 24 }
      ])
    )
  })

  it('strokes a circle and an X for PDMODE 35, with only a small center omitted', () => {
    const renderer = new AcPdfRenderer()
    const entity = renderer.point(at, { displayMode: 35, displaySize: 0 })
    const ops = opsOf(entity)
    expect(ops.some(op => op.kind === 'circle')).toBe(false)
    const closed = ops.find(op => op.kind === 'stroke' && op.closed)
    expect(closed?.kind).toBe('stroke')
    if (closed?.kind !== 'stroke') {
      return
    }
    for (const p of closed.points) {
      const radius = Math.hypot(p.x - 10, p.y - 20)
      expect(radius).toBeCloseTo(0.5, 5)
    }
    const open = ops.filter(op => op.kind === 'stroke' && !op.closed)
    expect(open).toHaveLength(2)
    const far = strokePoints(open).some(
      p => Math.hypot(p.x - 10, p.y - 20) > 0.9
    )
    expect(far).toBe(true)
  })

  it('follows database PDMODE when the point entity is drawn', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    db.pdmode = 34
    const point = new AcDbPoint()
    point.position = new AcGePoint3d(30, 40, 0)
    db.tables.blockTable.modelSpace.appendEntity(point)

    const renderer = new AcPdfRenderer()
    const drawn = point.worldDraw(renderer) as AcPdfEntity
    const ops = opsOf(drawn)
    expect(ops.some(op => op.kind === 'circle' && op.r > 0.2)).toBe(false)
    const pts = strokePoints(ops)
    expect(pts.some(p => Math.hypot(p.x - 30, p.y - 40) > 0.9)).toBe(true)
    expect(
      pts.some(p => Math.abs(Math.hypot(p.x - 30, p.y - 40) - 0.5) < 1e-6)
    ).toBe(true)
  })
})
