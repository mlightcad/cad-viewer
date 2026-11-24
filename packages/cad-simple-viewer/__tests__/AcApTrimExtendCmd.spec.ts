/**
 * @jest-environment jsdom
 */
jest.mock('../src/editor/command/AcEdCommand', () => {
  class AcEdCommand {
    mode: unknown
    protected showMessage(message: string, type?: string) {
      mockMessages.push({ message, type })
    }
  }
  return { AcEdCommand }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: { t: (key: string) => key }
}))

jest.mock('../src/service/AcApUcsService', () => ({
  AcApUcsService: {
    getActiveFrame: () => ({
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 }
    })
  }
}))

import {
  AcDbCircle,
  AcDbDatabase,
  AcDbEntity,
  AcDbHatch,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbSysVarManager,
  AcGeBox2d,
  AcGePoint3d,
  AcGePolyline2d
} from '@mlightcad/data-model'

import type { AcApContext } from '../src/app/AcApContext'
import { AcApExtendCmd } from '../src/command/modify/AcApExtendCmd'
import { AcApTrimCmd } from '../src/command/modify/AcApTrimCmd'
import { AcApTrimExtendCmd } from '../src/command/modify/AcApTrimExtendCmd'
import {
  acapGetTrimExtendSysVar,
  acapRegisterTrimExtendSysVars
} from '../src/command/modify/AcApTrimExtendSysVars'
import { AcEdPromptStatus } from '../src/editor/input/prompt/AcEdPromptStatus'
import { AcApEntityService } from '../src/service/AcApEntityService'

const mockMessages: { message: string; type?: string }[] = []

type ScriptedEntityResult = {
  status: AcEdPromptStatus
  objectId?: string
  pickedPoint?: { x: number; y: number; z: number }
  stringResult?: string
  /** Simulate Shift held while clicking. */
  shift?: boolean
}

type ScriptedPromptResult = {
  status: AcEdPromptStatus
  stringResult?: string
  value?: { ids: string[] }
}

const line = (x1: number, y1: number, x2: number, y2: number) =>
  new AcDbLine(new AcGePoint3d(x1, y1, 0), new AcGePoint3d(x2, y2, 0))

const modelSpace = (db: AcDbDatabase) =>
  db.tables.blockTable.modelSpace.newIterator().toArray() as AcDbEntity[]

function setup(
  script: ScriptedEntityResult[],
  prompts: ScriptedPromptResult[] = []
) {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db

  const shown = new Set<string>()
  const canvas = document.createElement('canvas')
  const asList = (e: AcDbEntity | AcDbEntity[]) => (Array.isArray(e) ? e : [e])
  const view = {
    canvas,
    curPos: { x: 0, y: 0 },
    selectionSet: { clear: jest.fn() },
    events: {
      mouseMove: { addEventListener: jest.fn(), removeEventListener: jest.fn() }
    },
    search: (_box: AcGeBox2d) =>
      modelSpace(db).map(entity => ({ id: entity.objectId })),
    getDrawingExtents: () =>
      new AcGeBox2d({ x: -100, y: -100 }, { x: 100, y: 100 }),
    hasEntity: (id: string) => shown.has(id),
    addEntity: jest.fn((e: AcDbEntity | AcDbEntity[]) =>
      asList(e).forEach(x => shown.add(x.objectId))
    ),
    removeEntity: jest.fn((e: AcDbEntity | AcDbEntity[]) =>
      asList(e).forEach(x => shown.delete(x.objectId))
    ),
    updateEntity: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    pick: (): { id: string }[] => [],
    editor: {
      getEntity: jest.fn(async () => {
        const next = script.shift() ?? { status: AcEdPromptStatus.None }
        canvas.dispatchEvent(
          new MouseEvent('mousedown', { shiftKey: !!next.shift })
        )
        return next
      }),
      // Selection / keyword prompts (Standard mode edges, option prompts).
      getSelection: jest.fn(
        async () => prompts.shift() ?? { status: AcEdPromptStatus.None }
      ),
      getKeywords: jest.fn(
        async () => prompts.shift() ?? { status: AcEdPromptStatus.None }
      )
    }
  }

  const context = {
    doc: { database: db, entityService: new AcApEntityService(db) },
    view
  } as unknown as AcApContext

  const addShown = (...entities: AcDbEntity[]) => {
    db.tables.blockTable.modelSpace.appendEntity(entities)
    entities.forEach(e => shown.add(e.objectId))
  }

  // Mirror AcEdCommand.trigger: one outer transaction per command run.
  const run = async (cmd: AcApTrimExtendCmd) => {
    db.transactionManager.startUndoMark('trim')
    db.transactionManager.startTransaction()
    await cmd.execute(context)
    db.transactionManager.commitTransaction()
    db.transactionManager.endUndoMark()
  }

  return { db, view, addShown, run, shown }
}

const pick = (
  id: string,
  x: number,
  y: number,
  shift = false
): ScriptedEntityResult => ({
  status: AcEdPromptStatus.OK,
  objectId: id,
  pickedPoint: { x, y, z: 0 },
  shift
})

describe('AcApTrimCmd / AcApExtendCmd', () => {
  beforeEach(() => {
    mockMessages.length = 0
    // The variables are session-wide: reset them to AutoCAD's defaults.
    const manager = AcDbSysVarManager.instance()
    const db = new AcDbDatabase()
    acapRegisterTrimExtendSysVars()
    manager.setVar('TRIMEXTENDMODE', 1, db)
    manager.setVar('PROJMODE', 1, db)
    manager.setVar('EDGEMODE', 0, db)
    manager.setVar('TRIMEDGES', 1, db)
    manager.setVar('COMMANDPREVIEW', 1, db)
  })

  it('Quick TRIM removes the picked segment and is one undo step', async () => {
    const script: ScriptedEntityResult[] = []
    const { db, addShown, run, shown } = setup(script)
    const target = line(0, 0, 10, 0)
    const v1 = line(3, -5, 3, 5)
    const v2 = line(7, -5, 7, 5)
    addShown(target, v1, v2)
    script.push(pick(target.objectId, 5, 0))

    await run(new AcApTrimCmd())

    const remaining = modelSpace(db)
    expect(remaining).not.toContain(target)
    expect(remaining).toHaveLength(4)
    expect(shown.has(target.objectId)).toBe(false)

    expect(db.transactionManager.undo()).toBe(true)
    const restored = modelSpace(db).map(e => e.objectId)
    expect(restored).toEqual(
      expect.arrayContaining([target.objectId, v1.objectId, v2.objectId])
    )
    expect(restored).toHaveLength(3)
  })

  it('Quick TRIM finds a cutting edge the line only touches (tangent)', async () => {
    const script: ScriptedEntityResult[] = []
    const { db, view, addShown, run } = setup(script)
    // Like the real spatial index: boxes of the tessellated curves, which lie
    // slightly inside the true curve (here the circle's lowest point).
    view.search = (box: AcGeBox2d) =>
      modelSpace(db)
        .filter(entity => {
          const ext = entity.geometricExtents
          const shrink =
            entity instanceof AcDbCircle ? entity.radius * 0.002 : 0
          return !(
            ext.max.x - shrink < box.min.x ||
            ext.min.x + shrink > box.max.x ||
            ext.max.y - shrink < box.min.y ||
            ext.min.y + shrink > box.max.y
          )
        })
        .map(entity => ({ id: entity.objectId }))
    const circle = new AcDbCircle(new AcGePoint3d(0, 5, 0), 5)
    const target = line(-10, 0, 10, 0)
    addShown(circle, target)
    script.push(pick(target.objectId, -8, 0))

    await run(new AcApTrimCmd())

    const lines = modelSpace(db).filter(
      (e): e is AcDbLine => e instanceof AcDbLine
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].startPoint.x).toBeCloseTo(0, 6)
    expect(lines[0].endPoint.x).toBeCloseTo(10, 6)
  })

  it('Undo option rolls back only the last pick', async () => {
    const script: ScriptedEntityResult[] = []
    const { db, addShown, run, shown } = setup(script)
    const a = line(0, 0, 10, 0)
    const b = line(0, 2, 10, 2)
    const edge = line(5, -5, 5, 5)
    addShown(a, b, edge)
    script.push(pick(a.objectId, 8, 0), pick(b.objectId, 8, 2), {
      status: AcEdPromptStatus.Keyword,
      stringResult: 'jig.trimExtend.keywords.undo.global'
    })

    await run(new AcApTrimCmd())

    const remaining = modelSpace(db)
    const ids = remaining.map(e => e.objectId)
    // a was trimmed, b was restored by Undo (restore may use a new instance
    // with the same objectId).
    expect(ids).not.toContain(a.objectId)
    expect(ids).toContain(b.objectId)
    expect(remaining).toHaveLength(3)
    expect(shown.has(b.objectId)).toBe(true)
    const pieceOfA = remaining.find(
      e => e.objectId !== b.objectId && e.objectId !== edge.objectId
    ) as AcDbLine
    expect(pieceOfA.endPoint.y).toBeCloseTo(0, 6)
    expect(pieceOfA.endPoint.x).toBeCloseTo(5, 6)
  })

  it('Shift-pick in TRIM extends instead', async () => {
    const script: ScriptedEntityResult[] = []
    const { db, view, addShown, run } = setup(script)
    const target = line(0, 0, 10, 0)
    const boundary = line(20, -5, 20, 5)
    addShown(target, boundary)
    script.push(pick(target.objectId, 9, 0, true))

    await run(new AcApTrimCmd())

    expect(modelSpace(db)).toContain(target)
    expect(target.endPoint.x).toBeCloseTo(20, 6)
    expect(view.updateEntity).toHaveBeenCalled()
  })

  it('EXTEND grows the picked end and undo restores it', async () => {
    const script: ScriptedEntityResult[] = []
    const { db, addShown, run } = setup(script)
    const target = line(0, 0, 10, 0)
    addShown(target, line(-4, -5, -4, 5))
    script.push(pick(target.objectId, 1, 0))

    await run(new AcApExtendCmd())
    expect(target.startPoint.x).toBeCloseTo(-4, 6)

    db.transactionManager.undo()
    const live = db.tables.blockTable.getEntityById(target.objectId) as AcDbLine
    expect(live.startPoint.x).toBeCloseTo(0, 6)
  })

  it('reports picks it cannot extend', async () => {
    const script: ScriptedEntityResult[] = []
    const { addShown, run } = setup(script)
    const target = line(0, 0, 10, 0)
    addShown(target)
    script.push(pick(target.objectId, 9, 0))

    await run(new AcApExtendCmd())

    expect(mockMessages).toContainEqual({
      message: 'jig.trimExtend.noEdgeInDirection',
      type: 'warning'
    })
    expect(target.endPoint.x).toBeCloseTo(10, 6)
  })

  describe('system variables', () => {
    const keyword = (key: string): ScriptedPromptResult => ({
      status: AcEdPromptStatus.Keyword,
      stringResult: `jig.trimExtend.keywords.${key}.global`
    })

    /** 10 x 10 square hatch with horizontal pattern lines every 1 unit. */
    const patternHatch = () => {
      const hatch = new AcDbHatch()
      hatch.add(
        new AcGePolyline2d(
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 }
          ],
          true
        )
      )
      hatch.patternName = 'USER'
      hatch.isSolidFill = false
      hatch.definitionLines.length = 0
      hatch.definitionLines.push({
        angle: 0,
        base: { x: 0, y: 0 },
        offset: { x: 0, y: 1 },
        dashLengths: []
      })
      return hatch
    }

    const linesOnXAxis = (db: AcDbDatabase) =>
      modelSpace(db).filter(
        (e): e is AcDbLine => e instanceof AcDbLine && e.startPoint.y === 0
      )

    it('registers TRIMEXTENDMODE, EDGEMODE, PROJMODE and TRIMEDGES', () => {
      const db = new AcDbDatabase()
      const manager = AcDbSysVarManager.instance()
      expect(manager.getDefaultValue('TRIMEXTENDMODE')).toBe(1)
      expect(manager.getDefaultValue('EDGEMODE')).toBe(0)
      expect(manager.getDefaultValue('PROJMODE')).toBe(1)
      expect(manager.getDefaultValue('TRIMEDGES')).toBe(1)
      // Out-of-range values typed through SETVAR read as the default.
      manager.setVar('EDGEMODE', 7, db)
      expect(acapGetTrimExtendSysVar('EDGEMODE', db)).toBe(0)
    })

    it('TRIMEXTENDMODE = 0 starts in Standard mode (select edges first)', async () => {
      const script: ScriptedEntityResult[] = []
      const prompts: ScriptedPromptResult[] = []
      const { db, view, addShown, run } = setup(script, prompts)
      // As typed on the command line (SETVAR passes strings).
      AcDbSysVarManager.instance().setVar('TRIMEXTENDMODE', '0', db)
      const target = line(0, 0, 10, 0)
      const edge = line(5, -5, 5, 5)
      const other = line(8, -5, 8, 5)
      addShown(target, edge, other)
      prompts.push({
        status: AcEdPromptStatus.OK,
        value: { ids: [edge.objectId] }
      })
      script.push(pick(target.objectId, 9, 0))

      await run(new AcApTrimCmd())

      expect(view.editor.getSelection).toHaveBeenCalledTimes(1)
      // Only the selected edge cuts: everything right of x = 5 is removed.
      const kept = linesOnXAxis(db)
      expect(kept).toHaveLength(1)
      expect(kept[0].endPoint.x).toBeCloseTo(5, 6)
    })

    it('mOde option writes TRIMEXTENDMODE back', async () => {
      const script: ScriptedEntityResult[] = []
      const prompts: ScriptedPromptResult[] = []
      const { db, run } = setup(script, prompts)
      script.push(keyword('mode'))
      prompts.push(keyword('standard'), {
        status: AcEdPromptStatus.OK,
        value: { ids: [] }
      })

      await run(new AcApTrimCmd())

      expect(acapGetTrimExtendSysVar('TRIMEXTENDMODE', db)).toBe(0)
    })

    it('EDGEMODE = 1 extends edges in Standard mode only', async () => {
      const manager = AcDbSysVarManager.instance()
      const scenario = async (trimExtendMode: number) => {
        const script: ScriptedEntityResult[] = []
        const prompts: ScriptedPromptResult[] = []
        const { db, addShown, run } = setup(script, prompts)
        manager.setVar('TRIMEXTENDMODE', trimExtendMode, db)
        manager.setVar('EDGEMODE', 1, db)
        const target = line(0, 0, 10, 0)
        // Short edge: only its extension crosses the target (at x = 5).
        addShown(target, line(5, 2, 5, 4))
        // Standard mode: Enter selects every object as an edge.
        prompts.push({ status: AcEdPromptStatus.OK, value: { ids: [] } })
        script.push(pick(target.objectId, 9, 0))
        await run(new AcApTrimCmd())
        return linesOnXAxis(db)
      }

      const standard = await scenario(0)
      expect(standard).toHaveLength(1)
      expect(standard[0].endPoint.x).toBeCloseTo(5, 6)

      // Quick mode ignores EDGEMODE: nothing cuts, so the line is erased.
      expect(await scenario(1)).toHaveLength(0)
    })

    it('COMMANDPREVIEW = 0 turns the hover preview off', async () => {
      const manager = AcDbSysVarManager.instance()
      const raf = jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(cb => {
          cb(0)
          return 0
        })
      try {
        const scenario = async (commandPreview: number) => {
          const script: ScriptedEntityResult[] = []
          const { db, view, addShown, run } = setup(script)
          manager.setVar('COMMANDPREVIEW', commandPreview, db)
          const target = line(0, 0, 10, 0)
          addShown(target, line(5, -5, 5, 5))
          view.curPos = { x: 8, y: 0 }
          view.pick = () => [{ id: target.objectId }]
          // Hover once while the pick prompt waits, then end with Enter.
          view.editor.getEntity.mockImplementationOnce(async () => {
            const onMove = view.events.mouseMove.addEventListener.mock
              .calls[0][0] as () => void
            onMove()
            return { status: AcEdPromptStatus.None }
          })
          await run(new AcApTrimCmd())
          return view.addTransientEntity.mock.calls.length
        }

        expect(await scenario(1)).toBe(1)
        expect(await scenario(0)).toBe(0)
      } finally {
        raf.mockRestore()
      }
    })

    it('TRIMEDGES decides whether hatch pattern lines are cutting edges', async () => {
      const manager = AcDbSysVarManager.instance()
      const scenario = async (trimEdges: number) => {
        const script: ScriptedEntityResult[] = []
        const { db, addShown, run } = setup(script)
        manager.setVar('TRIMEDGES', trimEdges, db)
        // Vertical line inside the hatch, crossing its pattern lines.
        const target = line(5, 0.5, 5, 9.5)
        addShown(patternHatch(), target)
        script.push(pick(target.objectId, 5, 9.2))
        await run(new AcApTrimCmd())
        return modelSpace(db).filter(
          (e): e is AcDbLine => e instanceof AcDbLine
        )
      }

      // TRIMEDGES = 1: only the hatch boundary is an edge. It does not cut
      // the line, so Quick TRIM erases it.
      expect(await scenario(1)).toHaveLength(0)

      // TRIMEDGES = 0: the pattern line at y = 9 cuts off the picked end.
      const kept = await scenario(0)
      expect(kept).toHaveLength(1)
      const ys = [kept[0].startPoint.y, kept[0].endPoint.y].sort(
        (a, b) => a - b
      )
      expect(ys[0]).toBeCloseTo(0.5, 6)
      expect(ys[1]).toBeCloseTo(9, 6)
    })
  })
})
