jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getDouble: jest.fn(),
        getEntity: jest.fn(),
        getKeywords: jest.fn(),
        getPoint: jest.fn(),
        getSelection: jest.fn(),
        getString: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
    protected showMessage() {}
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptDoubleOptions {
    allowNegative = false
    allowNone = false
    allowZero = false
    defaultValue = 0
    useDefaultValue = false

    constructor(readonly message: string) {}
  }

  class AcEdPromptEntityOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
    addAllowedClass = jest.fn()
    setRejectMessage = jest.fn()
  }

  class AcEdPromptKeywordOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
  }

  class AcEdPromptPointOptions {
    allowNone = false
    keywords = new MockKeywordCollection()
    jig: unknown

    constructor(readonly message: string) {}
  }

  class AcEdPromptSelectionOptions {
    allowObjectOnLockedLayer = false

    constructor(readonly message: string) {}
  }

  class AcEdPromptStringOptions {
    allowEmpty = false
    defaultValue = ''
    useDefaultValue = false

    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptDoubleOptions,
    AcEdPromptEntityOptions,
    AcEdPromptKeywordOptions,
    AcEdPromptPointOptions,
    AcEdPromptSelectionOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel',
      None: 'None'
    },
    AcEdPromptStringOptions
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import {
  AcDbCircle,
  AcDbHatch,
  AcDbHatchStyle,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeCircArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint3d,
  DEFAULT_HATCH_PATTERN_IMPERIAL,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import { AcApDocManager } from '../src/app'
import {
  AcApHatchCmd,
  type AcApHatchLoopWithSources,
  type HatchSettings
} from '../src/command/draw/AcApHatchCmd'
import { AcEdPromptStatus } from '../src/editor'

class TestHatchCmd extends AcApHatchCmd {
  constructor(private readonly testSettings: HatchSettings) {
    super()
  }

  protected override get settings() {
    return this.testSettings
  }

  appendForTest(
    context: Parameters<AcApHatchCmd['appendHatch']>[0],
    loops: ReadonlyArray<AcGeLoop2d | AcApHatchLoopWithSources>
  ) {
    return this.appendHatch(context, loops)
  }

  beginSessionForTest() {
    this.beginSession()
  }

  markDiscardForTest() {
    this.markDiscardSession()
  }

  finishSessionForTest(context: Parameters<AcApHatchCmd['appendHatch']>[0]) {
    this.finishSession(context)
  }

  undoLastForTest(context: Parameters<AcApHatchCmd['appendHatch']>[0]) {
    return this.undoLastSessionHatch(context)
  }

  appendHatchesForTest(
    context: Parameters<AcApHatchCmd['appendHatch']>[0],
    loops: ReadonlyArray<AcApHatchLoopWithSources>
  ) {
    return this.appendHatches(context, loops)
  }

  applyRemoveForTest(
    context: Parameters<AcApHatchCmd['appendHatch']>[0],
    hatches: ReadonlyArray<AcDbHatch>,
    removeIds: ReadonlySet<string>
  ) {
    return this.applyRemoveBoundaries(context, hatches, removeIds)
  }

  createPolylineFromLoopForTest(loop: AcGeLoop2d) {
    return this.createPolylineFromLoop(loop)
  }

  async executeForTest(context: Parameters<AcApHatchCmd['appendHatch']>[0]) {
    await this.execute(context)
  }
}

class DefaultHatchCmd extends AcApHatchCmd {
  appendForTest(
    context: Parameters<AcApHatchCmd['appendHatch']>[0],
    loops: ReadonlyArray<AcGeLoop2d | AcApHatchLoopWithSources>
  ) {
    return this.appendHatch(context, loops)
  }
}

const createSquareLoop = (
  minX = 0,
  minY = 0,
  maxX = 10,
  maxY = 10
) =>
  new AcGeLoop2d([
    new AcGeLine2d({ x: minX, y: minY }, { x: maxX, y: minY }),
    new AcGeLine2d({ x: maxX, y: minY }, { x: maxX, y: maxY }),
    new AcGeLine2d({ x: maxX, y: maxY }, { x: minX, y: maxY }),
    new AcGeLine2d({ x: minX, y: maxY }, { x: minX, y: minY })
  ])

const createCircleLoop = (cx: number, cy: number, radius: number) =>
  new AcGeLoop2d([
    new AcGeCircArc2d({ x: cx, y: cy }, radius, 0, Math.PI * 2, false)
  ])

const createContext = () => {
  const database = new AcDbDatabase()
  const appended: AcDbHatch[] = []
  const viewEntities = new Map<string, AcDbHatch>()
  const selectionIds = new Set<string>()
  const selectionSet = {
    ids: [] as string[],
    clear: jest.fn(() => {
      selectionIds.clear()
      selectionSet.ids = []
    }),
    add: jest.fn((ids: string | string[]) => {
      const list = Array.isArray(ids) ? ids : [ids]
      list.forEach(id => selectionIds.add(String(id)))
      selectionSet.ids = [...selectionIds]
    })
  }
  const view = {
    addEntity: jest.fn((entity: AcDbHatch | AcDbHatch[]) => {
      const entities = Array.isArray(entity) ? entity : [entity]
      entities.forEach(item => {
        viewEntities.set(String(item.objectId), item)
      })
    }),
    removeEntity: jest.fn((entity: AcDbHatch | AcDbHatch[]) => {
      const entities = Array.isArray(entity) ? entity : [entity]
      entities.forEach(item => {
        viewEntities.delete(String(item.objectId))
      })
    }),
    updateEntity: jest.fn(),
    hasEntity: jest.fn((objectId: string) => viewEntities.has(String(objectId))),
    selectionSet
  }
  const appendEntity = jest.spyOn(
    database.tables.blockTable.modelSpace,
    'appendEntity'
  )
  appendEntity.mockImplementation(entity => {
    const entities = Array.isArray(entity) ? entity : [entity]
    entities.forEach(item => {
      if (item instanceof AcDbHatch) {
        if (!item.objectId) {
          Object.defineProperty(item, 'objectId', {
            value: `H${appended.length + 1}`,
            configurable: true
          })
        }
        appended.push(item)
      }
    })
    return Array.isArray(entity) ? entity : entity
  })
  const context = {
    doc: {
      database
    },
    view
  }

  return { appended, context, database, view, viewEntities }
}

const createSettings = (
  overrides: Partial<HatchSettings> = {}
): HatchSettings => ({
  patternName: DEFAULT_HATCH_PATTERN_IMPERIAL,
  patternScale: 2,
  patternAngleDeg: 15,
  style: AcDbHatchStyle.Normal,
  islandDetectionEnabled: true,
  associative: true,
  ...overrides
})

describe('AcApHatchCmd', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    const database = new AcDbDatabase()
    const sysVarManager = AcDbSysVarManager.instance()
    sysVarManager.setVar(AcDbSystemVariables.HPSEPARATE, 0, database)
    sysVarManager.setVar(AcDbSystemVariables.HPASSOC, 1, database)
  })

  test('creates SOLID hatches by default', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new DefaultHatchCmd()

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBeTruthy()

    const hatch = appended[0]
    expect(hatch.patternName).toBe(HATCH_PATTERN_SOLID)
    expect(hatch.isSolidFill).toBe(true)
    expect(hatch.definitionLines).toHaveLength(0)
  })

  test('expands predefined pattern names into hatch definition lines', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      DEFAULT_HATCH_PATTERN_IMPERIAL,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPSCALE,
      2,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPANG,
      Math.PI / 12,
      database
    )
    const cmd = new TestHatchCmd(createSettings())

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBeTruthy()

    const hatch = appended[0]
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.patternName).toBe(DEFAULT_HATCH_PATTERN_IMPERIAL)
    expect(hatch.patternScale).toBe(2)
    expect(hatch.patternAngle).toBeCloseTo(Math.PI / 12)
    expect(hatch.isSolidFill).toBe(false)
    expect(hatch.definitionLines.length).toBeGreaterThan(0)
    expect(hatch.definitionLines[0].angle).toBeCloseTo(Math.PI / 4)
    // Offsets are world-space vectors; ANSI31's 3.175 spacing runs across
    // the 45° line.
    const [line] = hatch.definitionLines
    expect(
      -Math.sin(line.angle) * line.offset.x +
        Math.cos(line.angle) * line.offset.y
    ).toBeCloseTo(3.175 * 2)
  })

  test('keeps SOLID hatches as solid fills without pattern definition lines', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBeTruthy()

    const hatch = appended[0]
    expect(hatch.patternName).toBe(HATCH_PATTERN_SOLID)
    expect(hatch.isSolidFill).toBe(true)
    expect(hatch.definitionLines).toHaveLength(0)
  })

  test('stores path source soft-pointers when associative and sources exist', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ associative: true }))

    expect(
      cmd.appendForTest(context as never, [
        { loop: createSquareLoop(), sourceIds: ['B1'] }
      ])
    ).toBeTruthy()

    const hatch = appended[0]
    expect(hatch.associative).toBe(true)
    expect(hatch.pathSourceIds(0)).toEqual(['B1'])
  })

  test('forces non-associative when associative is requested without sources', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ associative: true }))

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBeTruthy()

    const hatch = appended[0]
    expect(hatch.associative).toBe(false)
    expect(hatch.pathSourceIds(0)).toEqual([])
  })

  test('does not store path sources when non-associative', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPASSOC,
      0,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ associative: false }))

    expect(
      cmd.appendForTest(context as never, [
        { loop: createSquareLoop(), sourceIds: ['B1'] }
      ])
    ).toBeTruthy()

    const hatch = appended[0]
    expect(hatch.associative).toBe(false)
    expect(hatch.pathSourceIds(0)).toEqual([])
  })

  test('adds the hatch to the view immediately after append', () => {
    const { appended, context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()

    const hatch = cmd.appendForTest(context as never, [createSquareLoop()])

    expect(hatch).toBe(appended[0])
    expect(view.addEntity).toHaveBeenCalledWith(hatch)
    expect(view.hasEntity(hatch!.objectId)).toBe(true)
  })

  test('discards session hatches on finish when marked for cancel', () => {
    const { appended, context, database, view, viewEntities } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [createSquareLoop()])!
    const erase = jest.spyOn(hatch, 'erase').mockImplementation(() => true)

    cmd.markDiscardForTest()
    cmd.finishSessionForTest(context as never)

    expect(erase).toHaveBeenCalled()
    expect(view.removeEntity).toHaveBeenCalledWith(hatch)
    expect(viewEntities.size).toBe(0)
    expect(appended[0]).toBe(hatch)
  })

  test('keeps session hatches on finish when accepting the command', () => {
    const { context, database, view, viewEntities } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [createSquareLoop()])!
    const erase = jest.spyOn(hatch, 'erase').mockImplementation(() => true)

    cmd.finishSessionForTest(context as never)

    expect(erase).not.toHaveBeenCalled()
    expect(view.removeEntity).not.toHaveBeenCalled()
    expect(viewEntities.has(String(hatch.objectId))).toBe(true)
  })

  test('execute discards hatches when the main prompt is cancelled', async () => {
    const { context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const editor = AcApDocManager.instance.editor
    ;(editor.getPoint as jest.Mock)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { x: 5, y: 5, z: 0 }
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel
      })

    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    jest
      .spyOn(
        cmd as unknown as { collectLoopsFromAllBoundaries: () => AcGeLoop2d[] },
        'collectLoopsFromAllBoundaries'
      )
      .mockReturnValue([createSquareLoop()])
    jest
      .spyOn(
        cmd as unknown as {
          resolveLoopsForPickPoint: () => AcGeLoop2d[]
        },
        'resolveLoopsForPickPoint'
      )
      .mockReturnValue([createSquareLoop()])

    await cmd.executeForTest(context as never)

    expect(view.addEntity).toHaveBeenCalled()
    expect(view.removeEntity).toHaveBeenCalled()
  })

  test('undoLastSessionHatch removes the most recent hatch from view', () => {
    const { context, database, view, viewEntities } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const first = cmd.appendForTest(context as never, [createSquareLoop()])!
    const second = cmd.appendForTest(context as never, [createSquareLoop()])!
    jest.spyOn(first, 'erase').mockImplementation(() => true)
    jest.spyOn(second, 'erase').mockImplementation(() => true)

    expect(cmd.undoLastForTest(context as never)).toBe(true)

    expect(second.erase).toHaveBeenCalled()
    expect(view.removeEntity).toHaveBeenCalledWith(second)
    expect(viewEntities.has(String(first.objectId))).toBe(true)
    expect(viewEntities.has(String(second.objectId))).toBe(false)
  })

  test('appendHatches creates separate entities when HPSEPARATE is on', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPSEPARATE,
      1,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()

    expect(
      cmd.appendHatchesForTest(context as never, [
        { loop: createSquareLoop(), sourceIds: ['A'] },
        { loop: createSquareLoop(), sourceIds: ['B'] }
      ])
    ).toBe(true)

    expect(appended).toHaveLength(2)
  })

  test('execute keeps hatches when the main prompt ends with Enter/None', async () => {
    const { context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const editor = AcApDocManager.instance.editor
    ;(editor.getPoint as jest.Mock)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { x: 5, y: 5, z: 0 }
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.None
      })

    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    jest
      .spyOn(
        cmd as unknown as { collectLoopsFromAllBoundaries: () => AcGeLoop2d[] },
        'collectLoopsFromAllBoundaries'
      )
      .mockReturnValue([createSquareLoop()])
    jest
      .spyOn(
        cmd as unknown as {
          resolveLoopsForPickPoint: () => AcGeLoop2d[]
        },
        'resolveLoopsForPickPoint'
      )
      .mockReturnValue([createSquareLoop()])

    await cmd.executeForTest(context as never)

    expect(view.addEntity).toHaveBeenCalled()
    expect(view.removeEntity).not.toHaveBeenCalled()
  })

  test('applyRemoveBoundaries erases a session hatch selected by id', () => {
    const { context, database, view, viewEntities } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [createSquareLoop()])!
    jest.spyOn(hatch, 'erase').mockImplementation(() => true)

    expect(
      cmd.applyRemoveForTest(
        context as never,
        [hatch],
        new Set([String(hatch.objectId)])
      )
    ).toBe(true)

    expect(hatch.erase).toHaveBeenCalled()
    expect(view.removeEntity).toHaveBeenCalledWith(hatch)
    expect(viewEntities.has(String(hatch.objectId))).toBe(false)
  })

  test('applyRemoveBoundaries drops an island path instead of keeping its geometry', () => {
    const { context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPASSOC,
      1,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [
      { loop: createSquareLoop(), sourceIds: ['OUTER'] },
      { loop: createSquareLoop(2, 2, 8, 8), sourceIds: ['HOLE'] }
    ])!

    expect(hatch.associative).toBe(true)
    expect(hatch.loops).toHaveLength(2)
    expect(
      cmd.applyRemoveForTest(context as never, [hatch], new Set(['HOLE']))
    ).toBe(true)

    expect(hatch.loops).toHaveLength(1)
    expect(hatch.pathSourceIds(0)).toEqual(['OUTER'])
    expect(hatch.associative).toBe(true)
    expect(view.updateEntity).toHaveBeenCalledWith(hatch)
  })

  test('applyRemoveBoundaries prefers path drop when hatch and boundary are both selected', () => {
    const { context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPASSOC,
      1,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [
      { loop: createSquareLoop(), sourceIds: ['OUTER'] },
      { loop: createSquareLoop(2, 2, 8, 8), sourceIds: ['HOLE'] }
    ])!
    jest.spyOn(hatch, 'erase').mockImplementation(() => true)

    expect(
      cmd.applyRemoveForTest(
        context as never,
        [hatch],
        new Set([String(hatch.objectId), 'HOLE'])
      )
    ).toBe(true)

    expect(hatch.erase).not.toHaveBeenCalled()
    expect(hatch.loops).toHaveLength(1)
    expect(hatch.pathSourceIds(0)).toEqual(['OUTER'])
    expect(view.updateEntity).toHaveBeenCalledWith(hatch)
    expect(view.removeEntity).not.toHaveBeenCalled()
  })

  test('applyRemoveBoundaries drops a pick-point island by geometry match', () => {
    const { context, database, view } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const inner = new AcDbCircle()
    inner.center = new AcGePoint3d(0, 0, 0)
    inner.radius = 5
    Object.defineProperty(inner, 'objectId', {
      value: 'C-INNER',
      configurable: true
    })
    jest.spyOn(database, 'getObjectById').mockImplementation(id => {
      return String(id) === 'C-INNER' ? inner : (undefined as never)
    })

    const cmd = new TestHatchCmd(
      createSettings({ patternName: 'solid', associative: false })
    )
    cmd.beginSessionForTest()
    const hatch = cmd.appendForTest(context as never, [
      createCircleLoop(0, 0, 10),
      createCircleLoop(0, 0, 5)
    ])!

    expect(hatch.associative).toBe(false)
    expect(hatch.loops).toHaveLength(2)
    expect(
      cmd.applyRemoveForTest(context as never, [hatch], new Set(['C-INNER']))
    ).toBe(true)

    expect(hatch.loops).toHaveLength(1)
    expect(view.updateEntity).toHaveBeenCalledWith(hatch)
  })

  test('createPolylineFromLoop builds a closed square polyline', () => {
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    const polyline = cmd.createPolylineFromLoopForTest(createSquareLoop())

    expect(polyline).toBeTruthy()
    expect(polyline!.closed).toBe(true)
    expect(polyline!.numberOfVertices).toBe(4)
  })

  test('execute RemoveBoundaries keyword invokes remove-boundaries branch', async () => {
    const { context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const editor = AcApDocManager.instance.editor
    ;(editor.getPoint as jest.Mock)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Keyword,
        stringResult: 'RemoveBoundaries'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.None
      })

    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))
    jest
      .spyOn(
        cmd as unknown as { collectLoopsFromAllBoundaries: () => AcGeLoop2d[] },
        'collectLoopsFromAllBoundaries'
      )
      .mockReturnValue([createSquareLoop()])
    const removeSpy = jest
      .spyOn(
        cmd as unknown as {
          doRemoveBoundaries: () => Promise<'continue' | 'cancel'>
        },
        'doRemoveBoundaries'
      )
      .mockResolvedValue('continue')

    await cmd.executeForTest(context as never)

    expect(removeSpy).toHaveBeenCalled()
  })
})
