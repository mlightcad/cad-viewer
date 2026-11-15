jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getEntity: jest.fn(),
        getPoint: jest.fn(),
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }
  class AcEdPreviewJig {
    end() {}
  }
  class MockKeywordCollection {
    add() {}
  }
  class AcEdPromptEntityOptions {
    constructor(readonly message: string) {}
    addAllowedClass() {}
    setRejectMessage() {}
  }
  class AcEdPromptPointOptions {
    allowNone = false
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }
  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 'Write' },
    AcEdPreviewJig,
    AcEdPromptEntityOptions,
    AcEdPromptPointOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      None: 'None',
      Cancel: 'Cancel'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: { t: (key: string) => key }
}))

import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbMLeader,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApDocManager } from '../src/app'
import {
  acapAddMLeaderBranch,
  acapCountMLeaderLines,
  acapCreateMLeader,
  acapLayoutMLeader,
  acapRemoveMLeaderLine
} from '../src/command/draw/AcApMLeaderCmdUtil'
import { AcApMLeaderEditCmd } from '../src/command/draw/AcApMLeaderEditCmd'
import { AcEdPromptStatus } from '../src/editor'

const editor = AcApDocManager.instance.editor as unknown as {
  getEntity: jest.Mock
  getPoint: jest.Mock
  showMessage: jest.Mock
}

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

/** Note with a left landing carrying two leader lines (tips at y=0, y=60). */
const placeNote = (db: AcDbDatabase) => {
  const mleader = acapCreateMLeader(db)
  acapLayoutMLeader(
    mleader,
    new AcGePoint3d(0, 0, 0),
    new AcGePoint3d(50, 30, 0)
  )
  mleader.contents = 'NOTE'
  acapAddMLeaderBranch(mleader, new AcGePoint3d(0, 60, 0))
  db.tables.blockTable.modelSpace.appendEntity(mleader)
  return mleader
}

/** Point halfway along leader line `lineIndex` of branch 0. */
const midOfLine = (mleader: AcDbMLeader, lineIndex: number) => {
  const leader = mleader.leaders[0]
  const tip = leader.leaderLines[lineIndex].vertices[0]
  const end = leader.lastLeaderLinePoint!
  return new AcGePoint3d((tip.x + end.x) / 2, (tip.y + end.y) / 2, 0)
}

const createContext = (db: AcDbDatabase) => ({
  doc: { database: db },
  view: {
    // 10 screen pixels per drawing unit.
    worldToScreen: (p: AcGePoint3dLike) => ({ x: p.x * 10, y: -p.y * 10 }),
    updateEntity: jest.fn()
  }
})

/** Runs the command the way `AcEdCommand.trigger` does: one undo mark. */
const runRemove = async (db: AcDbDatabase, picks: AcGePoint3dLike[]) => {
  const tm = db.transactionManager
  tm.startUndoMark('MLEADEREDITREMOVE')
  tm.startTransaction()
  const cmd = new AcApMLeaderEditCmd('remove')
  await cmd.execute(createContext(db) as never)
  tm.commitTransaction()
  tm.endUndoMark()
  expect(editor.getPoint).toHaveBeenCalledTimes(picks.length + 1)
}

const queuePicks = (objectId: string, picks: AcGePoint3dLike[]) => {
  editor.getEntity.mockResolvedValue({
    status: AcEdPromptStatus.OK,
    objectId
  })
  for (const pick of picks) {
    editor.getPoint.mockResolvedValueOnce({
      status: AcEdPromptStatus.OK,
      value: pick
    })
  }
  editor.getPoint.mockResolvedValueOnce({ status: AcEdPromptStatus.None })
}

describe('MLEADEREDIT remove leader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    editor.getPoint.mockReset()
  })

  it('removes a leader line picked anywhere along it, not only at its tip', async () => {
    const db = createDb()
    const mleader = placeNote(db)
    const pick = midOfLine(mleader, 1)
    queuePicks(mleader.objectId, [pick])

    await runRemove(db, [pick])

    expect(acapCountMLeaderLines(mleader)).toBe(1)
    expect(mleader.leaders[0].leaderLines[0].vertices[0].y).toBeCloseTo(0)
    expect(editor.showMessage).not.toHaveBeenCalled()
  })

  it('reports a miss without claiming the object is not a multileader', async () => {
    const db = createDb()
    const mleader = placeNote(db)
    const far = new AcGePoint3d(500, 500, 0)
    queuePicks(mleader.objectId, [far])

    await runRemove(db, [far])

    expect(acapCountMLeaderLines(mleader)).toBe(2)
    expect(editor.showMessage).toHaveBeenCalledWith(
      'jig.mleaderedit.noLeaderAtPoint',
      'warning'
    )
  })

  it('keeps branch order when removing one line from a multi-line branch', () => {
    const db = createDb()
    const mleader = placeNote(db)
    // Second branch on the right of the text.
    acapAddMLeaderBranch(mleader, new AcGePoint3d(200, 0, 0))
    expect(mleader.numberOfLeaders).toBe(2)
    const rightLanding = mleader.leaders[1].lastLeaderLinePoint!.clone()

    expect(acapRemoveMLeaderLine(mleader, 0, 1)).toBe(true)

    expect(mleader.leaders.map(l => l.leaderLines.length)).toEqual([1, 1])
    expect(mleader.leaders[0].leaderLines[0].vertices[0].y).toBeCloseTo(0)
    expect(mleader.leaders[1].lastLeaderLinePoint).toMatchObject({
      x: rightLanding.x,
      y: rightLanding.y
    })
  })

  it('records the removal so UNDO restores the leader', async () => {
    const db = createDb()
    const mleader = placeNote(db)
    const tip = new AcGePoint3d(0, 60, 0)
    queuePicks(mleader.objectId, [tip])

    await runRemove(db, [tip])
    expect(acapCountMLeaderLines(mleader)).toBe(1)

    expect(db.transactionManager.canUndo()).toBe(true)
    db.transactionManager.undo()

    const restored = db.tables.blockTable.getEntityById(
      mleader.objectId
    ) as AcDbMLeader
    expect(acapCountMLeaderLines(restored)).toBe(2)
  })
})
