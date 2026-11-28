import {
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
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
    // UCSSELECTMODE is registry-backed on the manager singleton — reset so
    // earlier tests that flip allowSelectingIcon do not leak.
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.UCSSELECTMODE,
      1,
      db
    )
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

  test('icon appearance clamps size, line width, and ACI indices', () => {
    AcApUcsService.setIconAppearance({
      sizePercent: 200,
      lineWidth: 9 as 1 | 2 | 3,
      modelColorIndex: 0,
      layoutColorIndex: 300,
      applySingleColor: true
    })
    const appearance = AcApUcsService.getIconAppearance()
    expect(appearance.sizePercent).toBe(95)
    expect(appearance.lineWidth).toBe(3)
    expect(appearance.modelColorIndex).toBe(1)
    expect(appearance.layoutColorIndex).toBe(255)
    expect(appearance.applySingleColor).toBe(true)

    AcApUcsService.setIconAppearance({
      sizePercent: 50,
      lineWidth: 1,
      modelColorIndex: 7,
      layoutColorIndex: 7,
      applySingleColor: false
    })
  })

  test('allowSelectingIcon defaults to true like UCSSELECTMODE', () => {
    expect(AcApUcsService.getIconSettings(db).allowSelectingIcon).toBe(true)
  })

  test('allowSelectingIcon syncs with UCSSELECTMODE', () => {
    const svm = AcDbSysVarManager.instance()

    svm.setVar(AcDbSystemVariables.UCSSELECTMODE, 0, db)
    expect(AcApUcsService.getIconSettings(db).allowSelectingIcon).toBe(false)

    AcApUcsService.setIconSettings(
      {
        on: true,
        atOrigin: true,
        applyToAllActiveViewports: false,
        allowSelectingIcon: true
      },
      db
    )
    expect(svm.getVar(AcDbSystemVariables.UCSSELECTMODE, db)).toBe(1)
    expect(AcApUcsService.getIconSettings(db).allowSelectingIcon).toBe(true)
  })

  test('UCSFOLLOW=1 writes PLAN viewTwistAngle when UCS orientation changes', () => {
    const active = db.ensureActiveVport()
    active.ucsFollowMode = true

    const frame = {
      origin: new AcGePoint3d(0, 0, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    }
    expect(AcApUcsService.planTwistAngleFromFrame(frame)).toBeCloseTo(
      Math.PI / 2
    )
    expect(AcApUcsService.isUcsFollowEnabled(db)).toBe(true)
    AcApUcsService.applyFrame(db, frame)
    const vport = db.tables.viewportTable.getActiveVport()
    expect(vport).toBeDefined()
    expect(vport!.viewTwistAngle).toBeCloseTo(Math.PI / 2)
  })

  test('UCSFOLLOW=0 leaves viewTwistAngle unchanged on UCS rotate', () => {
    const active = db.ensureActiveVport()
    active.ucsFollowMode = false
    active.viewTwistAngle = 0.25

    AcApUcsService.applyFrame(db, {
      origin: new AcGePoint3d(0, 0, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    })

    expect(AcApUcsService.isUcsFollowEnabled(db)).toBe(false)
    expect(
      db.tables.viewportTable.getActiveVport()!.viewTwistAngle
    ).toBeCloseTo(0.25)
  })

  test('setViewportSettings maps to UCSVP / UCSFOLLOW on active VPORT', () => {
    expect(AcApUcsService.isUcsSavedWithViewport(db)).toBe(true)

    AcApUcsService.setViewportSettings(
      { saveUcsWithViewport: true, updateViewToPlan: true },
      db
    )
    expect(db.ensureActiveVport().ucsFollowMode).toBe(true)
    expect(db.ensureActiveVport().ucsSavedWithViewport).toBe(true)
    expect(AcApUcsService.getViewportSettings(db).updateViewToPlan).toBe(true)
    expect(AcApUcsService.getViewportSettings(db).saveUcsWithViewport).toBe(
      true
    )

    AcApUcsService.setViewportSettings(
      { saveUcsWithViewport: false, updateViewToPlan: false },
      db
    )
    expect(db.ensureActiveVport().ucsFollowMode).toBe(false)
    expect(db.ensureActiveVport().ucsSavedWithViewport).toBe(false)
    expect(AcApUcsService.isUcsSavedWithViewport(db)).toBe(false)
    expect(AcApUcsService.getViewportSettings(db).saveUcsWithViewport).toBe(
      false
    )

    // SETVAR UCSVP and the dialog share VPORT *Active storage.
    AcDbSysVarManager.instance().setVar(AcDbSystemVariables.UCSVP, 1, db)
    expect(AcApUcsService.getViewportSettings(db).saveUcsWithViewport).toBe(
      true
    )
  })

  test('setIconSettings writes ObjectARX iconEnabled / iconAtOrigin', () => {
    AcApUcsService.setIconSettings(
      {
        on: true,
        atOrigin: false,
        applyToAllActiveViewports: false,
        allowSelectingIcon: true
      },
      db
    )
    const vport = db.ensureActiveVport()
    expect(vport.iconEnabled).toBe(true)
    expect(vport.iconAtOrigin).toBe(false)
    expect(vport.getUcsIconSysVar()).toBe(1)
    expect(AcApUcsService.getIconSettings(db).on).toBe(true)
    expect(AcApUcsService.getIconSettings(db).atOrigin).toBe(false)
  })

  test('getIconSettings returns defaults when no database is available', () => {
    // AcTrView2d constructs the UCS icon controller before DocManager sets
    // workingDatabase; the host getter throws in that window.
    const { acdbHostApplicationServices } = require('@mlightcad/data-model')
    const services = acdbHostApplicationServices()
    const original = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(services),
      'workingDatabase'
    )
    Object.defineProperty(Object.getPrototypeOf(services), 'workingDatabase', {
      configurable: true,
      get() {
        throw new Error(
          'The current working database must be set before using it!'
        )
      }
    })
    try {
      expect(AcApUcsService.getIconSettings()).toEqual({
        on: true,
        atOrigin: true,
        applyToAllActiveViewports: false,
        allowSelectingIcon: true
      })
      expect(() =>
        AcApUcsService.setIconSettings({
          on: false,
          atOrigin: true,
          applyToAllActiveViewports: false,
          allowSelectingIcon: true
        })
      ).not.toThrow()
    } finally {
      if (original) {
        Object.defineProperty(
          Object.getPrototypeOf(services),
          'workingDatabase',
          original
        )
      }
    }
  })

  test('display preview frame overrides getDisplayFrame until cleared', () => {
    const preview = {
      origin: new AcGePoint3d(10, 20, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    }
    AcApUcsService.setDisplayPreviewFrame(preview, db)
    const shown = AcApUcsService.getDisplayFrame(db)
    expect(shown.origin.x).toBe(10)
    expect(shown.origin.y).toBe(20)
    expect(AcApUcsService.isDisplayPreviewActive(db)).toBe(true)
    AcApUcsService.setDisplayPreviewFrame(null, db)
    const active = AcApUcsService.getDisplayFrame(db)
    expect(active.origin.x).toBe(0)
    expect(AcApUcsService.isDisplayPreviewActive(db)).toBe(false)
  })

  test('display preview frame is scoped per database', () => {
    const other = new AcDbDatabase()
    const preview = {
      origin: new AcGePoint3d(10, 20, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    }
    AcApUcsService.setDisplayPreviewFrame(preview, db)
    expect(AcApUcsService.getDisplayFrame(db).origin.x).toBe(10)
    expect(AcApUcsService.getDisplayFrame(other).origin.x).toBe(0)
    expect(AcApUcsService.isDisplayPreviewActive(db)).toBe(true)
    expect(AcApUcsService.isDisplayPreviewActive(other)).toBe(false)
    AcApUcsService.setDisplayPreviewFrame(null, db)
  })
})
