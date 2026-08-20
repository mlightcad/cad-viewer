import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbViewport,
  AcGePoint3d
} from '@mlightcad/data-model'

import { collectLayoutViewports } from '../src/AcExPaperViewportCollector'

describe('collectLayoutViewports', () => {
  it('skips model space and the default paper-space viewport', () => {
    const db = new AcDbDatabase()
    const modelSpace = db.tables.blockTable.modelSpace

    const paper = new AcDbBlockTableRecord()
    paper.name = '*Paper_Space'
    db.tables.blockTable.add(paper)

    const defaultVp = new AcDbViewport()
    defaultVp.centerPoint = new AcGePoint3d(6, 4.5, 0)
    defaultVp.viewCenter = new AcGePoint3d(6, 4.5, 0)
    defaultVp.width = 12
    defaultVp.height = 9
    defaultVp.viewHeight = 9
    paper.appendEntity(defaultVp)

    const userVp = new AcDbViewport()
    userVp.centerPoint = new AcGePoint3d(100, 80, 0)
    userVp.width = 200
    userVp.height = 160
    userVp.viewCenter = new AcGePoint3d(0, 0, 0)
    userVp.viewHeight = 800
    userVp.viewTarget = new AcGePoint3d(50, 40, 0)
    paper.appendEntity(userVp)

    expect(
      collectLayoutViewports(db, modelSpace.objectId, true)
    ).toBeUndefined()

    const viewports = collectLayoutViewports(db, paper.objectId, false)
    expect(viewports).toHaveLength(1)
    expect(viewports![0]!.paper).toEqual({
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 160
    })
    expect(viewports![0]!.model.minX).toBeLessThan(viewports![0]!.model.maxX)
    expect(viewports![0]!.model.minY).toBeLessThan(viewports![0]!.model.maxY)
  })
})
