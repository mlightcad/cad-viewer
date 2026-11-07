import {
  AcDbDatabase,
  AcDbUcsTableRecord,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  AcApUcsService,
  UCS_PREVIOUS_LIMIT,
  UCS_WORLD_NAME
} from '../src/service/AcApUcsService'

describe('AcApUcsService', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
  })

  test('starts as World and lists World', () => {
    expect(AcApUcsService.getCurrentName(db)).toBe(UCS_WORLD_NAME)
    expect(AcApUcsService.isWorldFrame(AcApUcsService.getActiveFrame(db))).toBe(
      true
    )
    const names = AcApUcsService.listUcsNames(db).map(i => i.name)
    expect(names).toContain(UCS_WORLD_NAME)
  })

  test('ucsToWcs / wcsToUcs round-trip', () => {
    const frame = {
      origin: new AcGePoint3d(10, 20, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    }
    const wcs = AcApUcsService.ucsToWcs({ x: 3, y: 4, z: 0 }, frame)
    const back = AcApUcsService.wcsToUcs(wcs, frame)
    expect(back.x).toBeCloseTo(3)
    expect(back.y).toBeCloseTo(4)
  })

  test('frameFromPoints with one/two/three points', () => {
    const one = AcApUcsService.frameFromPoints({ x: 5, y: 6, z: 0 })
    expect(one.origin.x).toBe(5)
    expect(one.origin.y).toBe(6)
    expect(one.xAxis.x).toBeCloseTo(1)

    const two = AcApUcsService.frameFromPoints(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    )
    expect(two.xAxis.y).toBeCloseTo(1)

    const three = AcApUcsService.frameFromPoints(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    )
    expect(three.xAxis.x).toBeCloseTo(1)
    expect(three.yAxis.y).toBeCloseTo(1)
  })

  test('save / restore / delete named UCS', () => {
    AcApUcsService.applyFrame(db, {
      origin: new AcGePoint3d(1, 2, 0),
      xAxis: new AcGePoint3d(1, 0, 0),
      yAxis: new AcGePoint3d(0, 1, 0)
    })
    expect(AcApUcsService.saveNamed('MYUCS', db)).toBe(true)
    expect(db.tables.ucsTable.has('MYUCS')).toBe(true)

    AcApUcsService.setWorld(db)
    expect(AcApUcsService.setCurrent('MYUCS', db)).toBe(true)
    expect(AcApUcsService.getCurrentName(db)).toBe('MYUCS')

    expect(AcApUcsService.deleteNamed('MYUCS', db)).toBe(true)
    expect(db.tables.ucsTable.has('MYUCS')).toBe(false)
  })

  test('Previous stack restores prior frame', () => {
    AcApUcsService.applyFrame(db, {
      origin: new AcGePoint3d(1, 0, 0),
      xAxis: new AcGePoint3d(1, 0, 0),
      yAxis: new AcGePoint3d(0, 1, 0)
    })
    AcApUcsService.applyFrame(db, {
      origin: new AcGePoint3d(2, 0, 0),
      xAxis: new AcGePoint3d(1, 0, 0),
      yAxis: new AcGePoint3d(0, 1, 0)
    })
    expect(AcApUcsService.restorePrevious(db)).toBe(true)
    expect(AcApUcsService.getActiveFrame(db).origin.x).toBeCloseTo(1)
  })

  test('Previous stack is capped', () => {
    for (let i = 0; i < UCS_PREVIOUS_LIMIT + 5; i++) {
      AcApUcsService.applyFrame(db, {
        origin: new AcGePoint3d(i, 0, 0),
        xAxis: new AcGePoint3d(1, 0, 0),
        yAxis: new AcGePoint3d(0, 1, 0)
      })
    }
    let count = 0
    while (AcApUcsService.restorePrevious(db)) count++
    expect(count).toBeLessThanOrEqual(UCS_PREVIOUS_LIMIT)
  })

  test('renameNamed updates table', () => {
    db.tables.ucsTable.add(
      new AcDbUcsTableRecord({
        name: 'OLD',
        origin: new AcGePoint3d(0, 0, 0),
        xAxis: new AcGePoint3d(1, 0, 0),
        yAxis: new AcGePoint3d(0, 1, 0)
      })
    )
    expect(AcApUcsService.renameNamed('OLD', 'NEW', db)).toBe(true)
    expect(db.tables.ucsTable.has('NEW')).toBe(true)
    expect(db.tables.ucsTable.has('OLD')).toBe(false)
  })

  test('icon settings pack into ucsIconSetting', () => {
    AcApUcsService.setIconSettings(
      {
        on: true,
        atOrigin: true,
        applyToAllActiveViewports: false,
        allowSelectingIcon: false
      },
      db
    )
    const settings = AcApUcsService.getIconSettings(db)
    expect(settings.on).toBe(true)
    expect(settings.atOrigin).toBe(true)
  })
})
