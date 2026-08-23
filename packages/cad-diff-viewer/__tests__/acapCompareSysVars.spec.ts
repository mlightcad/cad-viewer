import { AcDbDatabase, acdbHostApplicationServices } from '@mlightcad/data-model'

import {
  acapDefaultCompareSysVars,
  acapReadCompareSysVars,
  acapWriteCompareSysVars
} from '../src/compare'

function createDb(): AcDbDatabase {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('acapReadCompareSysVars / acapWriteCompareSysVars', () => {
  it('round-trips drawing-saved COMPARE vars', () => {
    const db = createDb()
    const vars = {
      ...acapDefaultCompareSysVars(),
      comparehatch: 1,
      comparetext: 0,
      comparercmargin: 12,
      comparetolerance: 8,
      compareprops: 1
    }
    acapWriteCompareSysVars(vars, [db])
    expect(acapReadCompareSysVars(db)).toEqual(vars)
  })

  it('reads hatch/text from the drawing instead of AutoCAD defaults', () => {
    const db = createDb()
    const defaults = acapDefaultCompareSysVars()
    expect(defaults.comparehatch).toBe(0)
    expect(defaults.comparetext).toBe(1)

    acapWriteCompareSysVars(
      { ...defaults, comparehatch: 1, comparetext: 0 },
      [db]
    )
    const read = acapReadCompareSysVars(db)
    expect(read.comparehatch).toBe(1)
    expect(read.comparetext).toBe(0)
  })

  it('writes drawing-saved vars onto every provided database', () => {
    const left = createDb()
    const right = createDb()
    acapWriteCompareSysVars(
      { ...acapDefaultCompareSysVars(), comparercmargin: 9 },
      [left, right]
    )
    expect(acapReadCompareSysVars(left).comparercmargin).toBe(9)
    expect(acapReadCompareSysVars(right).comparercmargin).toBe(9)
  })
})
