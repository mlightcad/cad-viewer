import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcGePoint3d,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'

import {
  acapAddMLeaderBranch,
  acapCreateMLeader,
  acapLayoutMLeader,
  acapResolveMLeaderPlacement,
  acapResolveMLeaderStyle
} from '../src/command/draw/AcApMLeaderCmdUtil'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const placeNote = (db: AcDbDatabase, landingX: number) => {
  const mleader = acapCreateMLeader(db)
  acapLayoutMLeader(
    mleader,
    new AcGePoint3d(0, 0, 0),
    new AcGePoint3d(landingX, 10, 0)
  )
  mleader.contents = 'Note'
  db.tables.blockTable.modelSpace.appendEntity(mleader)
  return mleader
}

describe('MLEADER creation follows the multileader style', () => {
  it('creates the default style on demand and uses its text height', () => {
    const db = createDb()
    const style = acapResolveMLeaderStyle(db)
    expect(style).toBeDefined()
    style!.textHeight = 6

    const mleader = placeNote(db, 30)

    expect(mleader.mleaderStyleId).toBe(style!.objectId)
    expect(mleader.textHeight).toBe(6)
    expect(mleader.resolveAnnotativePresentation().textHeight).toBe(6)
    expect(mleader.textStyleId).toBe(style!.textStyleId)
  })

  it('scales landing and text by the style overall scale', () => {
    const db = createDb()
    const style = acapResolveMLeaderStyle(db)!
    style.scale = 2
    const mleader = placeNote(db, 30)

    expect(mleader.textHeight).toBe(style.textHeight * 2)
    const leader = mleader.leaders[0]
    expect(leader.doglegLength).toBe(style.doglegLength * 2)
    expect(leader.lastLeaderLinePoint!.x).toBeCloseTo(
      30 - style.doglegLength * 2
    )
  })

  it('attaches text past the landing gap on the side away from the leader', () => {
    const db = createDb()
    const style = acapResolveMLeaderStyle(db)!

    const right = placeNote(db, 30)
    expect(right.textAttachmentPoint).toBe(AcGiMTextAttachmentPoint.TopLeft)
    expect(right.textLocation!.x).toBeCloseTo(30 + style.landingGap)

    const left = placeNote(db, -30)
    expect(left.textAttachmentPoint).toBe(AcGiMTextAttachmentPoint.TopRight)
    expect(left.textLocation!.x).toBeCloseTo(-30 - style.landingGap)
    // Text hangs from the landing ("middle of top line").
    expect(left.textLocation!.y).toBeCloseTo(10 + left.textHeight / 2)
  })

  it('stores Options overrides as entity property overrides', () => {
    const db = createDb()
    const mleader = acapCreateMLeader(db, {
      leaderLineType: AcDbMLeaderLineType.SplineLeader,
      contentType: AcDbMLeaderContentType.NoneContent
    })

    expect(mleader.leaderLineType).toBe(AcDbMLeaderLineType.SplineLeader)
    expect(mleader.propertyOverrideFlag! & 1).toBe(1)
    expect(mleader.contentType).toBe(AcDbMLeaderContentType.NoneContent)
  })

  it('keeps the picked text location in content-first mode', () => {
    const placement = acapResolveMLeaderPlacement(
      new AcGePoint3d(30, 10, 0),
      new AcGePoint3d(0, 0, 0),
      'arrowFromLanding',
      2
    )
    expect(placement.arrow).toMatchObject({ x: 0, y: 0 })
    // Landing ends one gap before the text so the text lands on the pick.
    expect(placement.landing).toMatchObject({ x: 28, y: 10 })

    const db = createDb()
    const mleader = acapCreateMLeader(db)
    acapLayoutMLeader(mleader, placement.arrow, {
      ...placement.landing,
      x: 30 - (mleader.landingGap ?? 0)
    })
    expect(mleader.textLocation!.x).toBeCloseTo(30)
  })
})

describe('MLEADEREDIT add leader', () => {
  it('joins a same-side leader to the existing landing', () => {
    const db = createDb()
    const mleader = placeNote(db, 30)

    const leaderIndex = acapAddMLeaderBranch(mleader, new AcGePoint3d(5, 25, 0))

    expect(leaderIndex).toBe(0)
    expect(mleader.numberOfLeaders).toBe(1)
    expect(mleader.leaders[0].leaderLines).toHaveLength(2)
  })

  it('puts an opposite-side leader on a new landing right of the text', () => {
    const db = createDb()
    const mleader = placeNote(db, 30)
    const textX = mleader.textLocation!.x

    const leaderIndex = acapAddMLeaderBranch(
      mleader,
      new AcGePoint3d(200, -20, 0)
    )

    expect(leaderIndex).toBe(1)
    const leader = mleader.leaders[1]
    expect(leader.doglegVector!.x).toBeCloseTo(-1)
    expect(
      leader.lastLeaderLinePoint!.x - leader.doglegLength!
    ).toBeGreaterThan(textX + mleader.textHeight)
  })

  it('keeps the original mleader untouched while previewing via clone', () => {
    const db = createDb()
    const mleader = placeNote(db, 30)
    const clone = mleader.clone() as AcDbMLeader

    acapAddMLeaderBranch(clone, new AcGePoint3d(5, 25, 0))

    expect(mleader.leaders[0].leaderLines).toHaveLength(1)
    expect(clone.textHeight).toBe(mleader.textHeight)
    expect(clone.textAttachmentPoint).toBe(mleader.textAttachmentPoint)
  })
})
