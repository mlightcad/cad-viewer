import {
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApEntityService } from '../src/service/AcApEntityService'

describe('AcApEntityService', () => {
  test('copyDisplayTraits copies visual properties', () => {
    const source = {
      layer: 'A',
      color: { clone: () => ({ cloned: true }) },
      lineType: 'Continuous',
      lineWeight: 1,
      linetypeScale: 1,
      transparency: 0,
      visibility: true
    }
    const target = {
      layer: '',
      color: null as unknown,
      lineType: '',
      lineWeight: 0,
      linetypeScale: 0,
      transparency: 0,
      visibility: false
    }

    AcApEntityService.copyDisplayTraits(source as never, target as never)

    expect(target.layer).toBe('A')
    expect(target.color).toEqual({ cloned: true })
  })

  test('eraseEntities returns the number of erased entities', () => {
    const erased = new Set<string>()
    const db = {
      transactionManager: { hasTransaction: () => true },
      openEntityForWrite: jest.fn((objectId: string) => {
        if (objectId === 'missing') return undefined
        return { erase: () => erased.add(objectId) }
      })
    }
    const service = new AcApEntityService(db as never)

    const count = service.eraseEntities(['a', 'b', 'missing'])

    expect(count).toBe(2)
    expect(erased).toEqual(new Set(['a', 'b']))
    expect(db.openEntityForWrite).toHaveBeenCalledTimes(3)
  })

  test('eraseEntities records an undoable database change', () => {
    const db = new AcDbDatabase()
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    db.tables.blockTable.modelSpace.appendEntity(line)
    const objectId = line.objectId
    const service = new AcApEntityService(db)

    expect(service.eraseEntities([objectId])).toBe(1)
    expect(db.tables.blockTable.getEntityById(objectId)).toBeUndefined()
    expect(db.transactionManager.canUndo()).toBe(true)

    expect(db.transactionManager.undo()).toBe(true)
    expect(db.tables.blockTable.getEntityById(objectId)).toBeDefined()

    expect(db.transactionManager.redo()).toBe(true)
    expect(db.tables.blockTable.getEntityById(objectId)).toBeUndefined()
  })

  test('eraseEntities and transformEntities skip entities on locked layers', () => {
    const db = new AcDbDatabase()
    const layer = new AcDbLayerTableRecord({ name: 'L1' })
    db.tables.layerTable.add(layer)
    layer.standardFlags = 1
    layer.isLocked = true
    expect(layer.isLocked).toBe(true)
    expect(layer.isFrozen).toBe(true)
    layer.isLocked = false
    expect(layer.isLocked).toBe(false)
    expect(layer.isFrozen).toBe(true)
    layer.isLocked = true

    const locked = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    locked.layer = 'L1'
    const free = new AcDbLine(
      new AcGePoint3d(0, 1, 0),
      new AcGePoint3d(1, 1, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity([locked, free])
    const service = new AcApEntityService(db)

    expect(
      service.translateEntities([locked, free], { x: 5, y: 5, z: 0 })
    ).toBe(1)
    expect(locked.startPoint.x).toBe(0)
    expect(free.startPoint.x).toBe(5)
    expect(service.eraseEntities([locked.objectId, free.objectId])).toBe(1)
    expect(db.tables.blockTable.getEntityById(locked.objectId)).toBeDefined()
    expect(db.tables.blockTable.getEntityById(free.objectId)).toBeUndefined()
  })
})
