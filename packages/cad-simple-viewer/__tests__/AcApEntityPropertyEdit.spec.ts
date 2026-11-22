import {
  AcDbAlignedDimension,
  AcDbCircle,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApEntityService } from '../src/service/AcApEntityService'

function createDb() {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcApEntityService.setEntityProperty', () => {
  it('applies one property to every entity as a single undoable edit', () => {
    const db = createDb()
    const a = new AcDbCircle(new AcGePoint3d(0, 0, 0), 1)
    const b = new AcDbCircle(new AcGePoint3d(10, 0, 0), 2)
    db.tables.blockTable.modelSpace.appendEntity([a, b])

    const modified: string[] = []
    db.events.entityModified.addEventListener(args => {
      const entities = Array.isArray(args.entity) ? args.entity : [args.entity]
      entities.forEach(entity => modified.push(entity.objectId))
    })

    const service = new AcApEntityService(db)
    const count = service.setEntityProperty(
      [a.objectId, b.objectId],
      'geometry',
      'radius',
      5
    )

    expect(count).toBe(2)
    expect(a.radius).toBe(5)
    expect(b.radius).toBe(5)
    expect(new Set(modified)).toEqual(new Set([a.objectId, b.objectId]))

    expect(db.transactionManager.undo()).toBe(true)
    expect(a.radius).toBe(1)
    expect(b.radius).toBe(2)
  })

  it('skips entities on locked layers, missing properties and read-only ones', () => {
    const db = createDb()
    const lockedLayer = new AcDbLayerTableRecord({ name: 'LOCKED' })
    lockedLayer.isLocked = true
    db.tables.layerTable.add(lockedLayer)
    const locked = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    locked.layer = 'LOCKED'
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 1)
    db.tables.blockTable.modelSpace.appendEntity([locked, line, circle])

    const service = new AcApEntityService(db)
    const ids = [locked.objectId, line.objectId, circle.objectId]

    expect(service.setEntityProperty(ids, 'geometry', 'startX', 7)).toBe(1)
    expect(line.startPoint.x).toBe(7)
    expect(locked.startPoint.x).toBe(0)

    // `length` is computed and read-only.
    expect(service.setEntityProperty(ids, 'geometry', 'length', 9)).toBe(0)
    expect(service.setEntityProperty(ids, 'general', 'linetypeScale', 3)).toBe(
      2
    )
    expect(locked.linetypeScale).toBe(1)
  })

  it('regenerates the dimension block after a definition point edit', () => {
    const db = createDb()
    const dim = new AcDbAlignedDimension(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0),
      new AcGePoint3d(5, 5, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity(dim)
    const before = dim.dimBlockId

    new AcApEntityService(db).setEntityProperty(
      [dim.objectId],
      'geometry',
      'xLine2PointX',
      20
    )

    expect(dim.xLine2Point.x).toBe(20)
    expect(dim.dimBlockId).not.toBe(before)
    expect(dim.measurement).toBeCloseTo(20, 8)
  })
})
