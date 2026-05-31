import {
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import {
  constrainToTracking,
  isPolarTrackingEnabled,
  POLARMODE_POLAR_TRACKING
} from '../src/editor/input/AcEdPolarTracking'

describe('polar tracking', () => {
  let database: AcDbDatabase
  const reference = { x: 0, y: 0 }

  beforeEach(() => {
    database = new AcDbDatabase()
    const manager = AcDbSysVarManager.instance()
    manager.setVar(AcDbSystemVariables.POLARMODE, 0, database)
    manager.setVar(AcDbSystemVariables.POLARANG, 90, database)
    manager.setVar(AcDbSystemVariables.POLARADDANG, '', database)
    database.angbase = 0
    database.angdir = 0
  })

  it('reports disabled when POLARMODE bit 2 is clear', () => {
    expect(isPolarTrackingEnabled(database)).toBe(false)
  })

  it('reports enabled when POLARMODE bit 2 is set', () => {
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.POLARMODE,
      POLARMODE_POLAR_TRACKING,
      database
    )
    expect(isPolarTrackingEnabled(database)).toBe(true)
  })

  it('locks to 90° increments when polar tracking is on', () => {
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.POLARMODE,
      POLARMODE_POLAR_TRACKING,
      database
    )

    const cursor = { x: 10, y: 8 }
    const constrained = constrainToTracking(cursor, reference, database)
    const distance = Math.hypot(cursor.x, cursor.y)
    expect(constrained.x).toBeCloseTo(distance, 5)
    expect(constrained.y).toBeCloseTo(0, 5)
  })

  it('uses POLARANG increment when set to 45°', () => {
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.POLARMODE,
      POLARMODE_POLAR_TRACKING,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.POLARANG,
      45,
      database
    )

    const constrained = constrainToTracking(
      { x: 10, y: 8 },
      reference,
      database
    )
    const angle = Math.atan2(constrained.y, constrained.x)
    expect(angle).toBeCloseTo(Math.PI / 4, 5)
  })
})
