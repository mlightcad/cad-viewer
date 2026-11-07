import {
  AcDbMLeader,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acapAddMLeaderBranch,
  acapApplyMLeaderGeometry,
  acapBuildMLeaderGeometry,
  acapCountMLeaderLines,
  acapFindNearestMLeaderLine,
  acapMatchKeyword,
  acapRemoveMLeaderLine,
  acapResolveMLeaderContentType
} from '../src/command/draw/AcApMLeaderCmdUtil'

describe('AcApMLeaderCmdUtil', () => {
  it('builds dogleg geometry when landing is enabled', () => {
    const geometry = acapBuildMLeaderGeometry(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(20, 5, 0),
      undefined,
      { enableLanding: true, doglegLength: 8 }
    )
    expect(geometry.enableLanding).toBe(true)
    expect(geometry.doglegLength).toBe(8)
    expect(geometry.vertices).toHaveLength(2)
    expect(geometry.doglegStart.x).toBeCloseTo(12)
    expect(geometry.doglegStart.y).toBeCloseTo(5)
    expect(geometry.textLocation.x).toBeCloseTo(20)
  })

  it('applies geometry and counts lines', () => {
    const mleader = new AcDbMLeader()
    const geometry = acapBuildMLeaderGeometry(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0),
      undefined,
      { enableLanding: false }
    )
    acapApplyMLeaderGeometry(mleader, geometry, {
      leaderLineType: AcDbMLeaderLineType.StraightLeader
    })
    expect(mleader.numberOfLeaders).toBe(1)
    expect(acapCountMLeaderLines(mleader)).toBe(1)
  })

  it('adds and removes leader branches', () => {
    const mleader = new AcDbMLeader()
    const geometry = acapBuildMLeaderGeometry(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0),
      undefined,
      { enableLanding: false }
    )
    acapApplyMLeaderGeometry(mleader, geometry)
    mleader.contentType = AcDbMLeaderContentType.MTextContent
    mleader.contents = 'Note'
    mleader.textLocation = new AcGePoint3d(10, 0, 0)

    const added = acapAddMLeaderBranch(
      mleader,
      new AcGePoint3d(0, 5, 0),
      undefined,
      { enableLanding: false }
    )
    expect(added).toBeGreaterThanOrEqual(0)
    expect(acapCountMLeaderLines(mleader)).toBe(2)

    const nearest = acapFindNearestMLeaderLine(
      mleader,
      new AcGePoint3d(0, 5, 0)
    )
    expect(nearest).not.toBeNull()
    expect(
      acapRemoveMLeaderLine(
        mleader,
        nearest!.leaderIndex,
        nearest!.lineIndex
      )
    ).toBe(true)
    expect(acapCountMLeaderLines(mleader)).toBe(1)
  })

  it('resolves content type from session overrides', () => {
    expect(
      acapResolveMLeaderContentType(undefined, {
        contentType: AcDbMLeaderContentType.NoneContent
      })
    ).toBe(AcDbMLeaderContentType.NoneContent)
    expect(acapResolveMLeaderContentType(undefined, {})).toBe(
      AcDbMLeaderContentType.MTextContent
    )
  })

  it('matches multi-word keyword global names from the editor', () => {
    expect(acapMatchKeyword('Landing first', 'LandingFirst', 'L')).toBe(true)
    expect(acapMatchKeyword('eXit options', 'Exit options', 'X')).toBe(true)
    expect(
      acapMatchKeyword('Leader type', 'Leader type', 'LeaderType')
    ).toBe(true)
    expect(acapMatchKeyword('Content first', 'Options')).toBe(false)
  })

  it('persists intermediate vertices when Maxpoints > 2', () => {
    const geometry = acapBuildMLeaderGeometry(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(30, 0, 0),
      undefined,
      { enableLanding: false },
      [new AcGePoint3d(10, 5, 0), new AcGePoint3d(20, 5, 0)]
    )
    expect(geometry.vertices).toHaveLength(4)
    expect(geometry.vertices[1].x).toBeCloseTo(10)
    expect(geometry.vertices[2].x).toBeCloseTo(20)
  })
})
