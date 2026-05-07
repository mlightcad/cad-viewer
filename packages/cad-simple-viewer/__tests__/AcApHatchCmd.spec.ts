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

    constructor(readonly message: string) {}
  }

  class AcEdPromptSelectionOptions {
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
      Cancel: 'Cancel'
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
  AcDbHatch,
  AcDbHatchStyle,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeLine2d,
  AcGeLoop2d,
  DEFAULT_HATCH_PATTERN_IMPERIAL,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import {
  AcApHatchCmd,
  type HatchSettings
} from '../src/command/draw/AcApHatchCmd'

class TestHatchCmd extends AcApHatchCmd {
  constructor(private readonly testSettings: HatchSettings) {
    super()
  }

  protected override get settings() {
    return this.testSettings
  }

  appendForTest(context: never, loops: ReadonlyArray<AcGeLoop2d>) {
    return this.appendHatch(context, loops)
  }
}

class DefaultHatchCmd extends AcApHatchCmd {
  appendForTest(context: never, loops: ReadonlyArray<AcGeLoop2d>) {
    return this.appendHatch(context, loops)
  }
}

const createSquareLoop = () =>
  new AcGeLoop2d([
    new AcGeLine2d({ x: 0, y: 0 }, { x: 10, y: 0 }),
    new AcGeLine2d({ x: 10, y: 0 }, { x: 10, y: 10 }),
    new AcGeLine2d({ x: 10, y: 10 }, { x: 0, y: 10 }),
    new AcGeLine2d({ x: 0, y: 10 }, { x: 0, y: 0 })
  ])

const createContext = () => {
  const database = new AcDbDatabase()
  const appended: AcDbHatch[] = []
  const appendEntity = jest.spyOn(
    database.tables.blockTable.modelSpace,
    'appendEntity'
  )
  appendEntity.mockImplementation(entity => {
    const entities = Array.isArray(entity) ? entity : [entity]
    entities.forEach(item => {
      if (item instanceof AcDbHatch) appended.push(item)
    })
  })
  const context = {
    doc: {
      database
    }
  }

  return { appended, context, database }
}

const createSettings = (
  overrides: Partial<HatchSettings> = {}
): HatchSettings => ({
  patternName: DEFAULT_HATCH_PATTERN_IMPERIAL,
  patternScale: 2,
  patternAngleDeg: 15,
  style: AcDbHatchStyle.Normal,
  associative: true,
  ...overrides
})

describe('AcApHatchCmd', () => {
  test('creates SOLID hatches by default', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new DefaultHatchCmd()

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBe(true)

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

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBe(true)

    const hatch = appended[0]
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.patternName).toBe(DEFAULT_HATCH_PATTERN_IMPERIAL)
    expect(hatch.patternScale).toBe(2)
    expect(hatch.patternAngle).toBeCloseTo(Math.PI / 12)
    expect(hatch.isSolidFill).toBe(false)
    expect(hatch.definitionLines.length).toBeGreaterThan(0)
    expect(hatch.definitionLines[0].angle).toBeCloseTo(Math.PI / 4)
    expect(hatch.definitionLines[0].offset.y).toBeCloseTo(3.175 * 2)
  })

  test('keeps SOLID hatches as solid fills without pattern definition lines', () => {
    const { appended, context, database } = createContext()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPNAME,
      HATCH_PATTERN_SOLID,
      database
    )
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBe(true)

    const hatch = appended[0]
    expect(hatch.patternName).toBe(HATCH_PATTERN_SOLID)
    expect(hatch.isSolidFill).toBe(true)
    expect(hatch.definitionLines).toHaveLength(0)
  })
})
