import {
  AcDbDatabase,
  AcDbDimStyleTableRecord,
  AcDbEntity,
  AcDbRotatedDimension,
  acdbHostApplicationServices,
  AcGePoint3d
} from '@mlightcad/data-model'

import { commitDimBlock } from '../src/command/draw/AcApDimBlockUtil'
import {
  ACED_GRIP_DIM_PREVIEW_BLOCK,
  AcEdGripPreviewJig
} from '../src/editor/grip/AcEdGripPreviewJig'
import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import { acapRunDatabaseEdit } from '../src/util/AcApDatabaseEdit'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  db.tables.dimStyleTable.add(
    new AcDbDimStyleTableRecord({ name: 'GripTest', dimtxt: 1, dimasz: 0.5 })
  )
  return db
}

const createDim = (db: AcDbDatabase) => {
  const dim = new AcDbRotatedDimension(
    new AcGePoint3d(0, 0, 0),
    new AcGePoint3d(10, 0, 0),
    new AcGePoint3d(10, 5, 0)
  )
  dim.rotation = 0
  dim.dimensionStyleName = 'GripTest'
  commitDimBlock(db, dim)
  db.tables.blockTable.modelSpace.appendEntity(dim)
  return dim
}

const createView = () => {
  const transients: AcDbEntity[] = []
  const view = {
    addTransientEntity: (entity: AcDbEntity) => transients.push(entity),
    removeTransientEntity: () => transients.pop()
  } as unknown as AcEdBaseView
  return { view, transients }
}

describe('dimension grip editing', () => {
  it('previews a dimension from a regenerated block without touching the original', () => {
    const db = createDb()
    const dim = createDim(db)
    const originalBlock = dim.dimBlockId
    const { view, transients } = createView()

    const jig = new AcEdGripPreviewJig(view, dim, 1, dim.xLine2Point)
    jig.update({ x: 15, y: 0, z: 0 })
    jig.render()

    const preview = transients[0] as AcDbRotatedDimension
    expect(preview.dimBlockId).toBe(ACED_GRIP_DIM_PREVIEW_BLOCK)
    expect(preview.measurement).toBeCloseTo(15)
    expect(db.tables.blockTable.getAt(ACED_GRIP_DIM_PREVIEW_BLOCK)).toBeTruthy()
    expect(dim.dimBlockId).toBe(originalBlock)
    expect(dim.xLine2Point.x).toBe(10)

    jig.end()
    expect(db.tables.blockTable.getAt(ACED_GRIP_DIM_PREVIEW_BLOCK)).toBeFalsy()
  })

  it('commits a regenerated block that undo restores', () => {
    const db = createDb()
    const dim = createDim(db)
    const originalBlock = dim.dimBlockId!

    acapRunDatabaseEdit(db, 'Grip Edit', () => {
      const entity = db.openEntityForWrite(dim) as AcDbRotatedDimension
      entity.subMoveGripPointsAt([1], { x: 5, y: 0, z: 0 })
      entity.recomputeDimBlock()
    })

    const edited = db.tables.blockTable.modelSpace.getIdAt(
      dim.objectId
    ) as AcDbRotatedDimension
    expect(edited.dimBlockId).not.toBe(originalBlock)
    expect(edited.measurement).toBeCloseTo(15)

    expect(db.transactionManager.undo()).toBe(true)
    const restored = db.tables.blockTable.modelSpace.getIdAt(
      dim.objectId
    ) as AcDbRotatedDimension
    expect(restored.dimBlockId).toBe(originalBlock)
    expect(restored.xLine2Point.x).toBeCloseTo(10)
    expect(db.tables.blockTable.getAt(originalBlock)).toBeTruthy()
  })
})
