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
  AcGeLine2d,
  AcGeLoop2d
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

const createSquareLoop = () =>
  new AcGeLoop2d([
    new AcGeLine2d({ x: 0, y: 0 }, { x: 10, y: 0 }),
    new AcGeLine2d({ x: 10, y: 0 }, { x: 10, y: 10 }),
    new AcGeLine2d({ x: 10, y: 10 }, { x: 0, y: 10 }),
    new AcGeLine2d({ x: 0, y: 10 }, { x: 0, y: 0 })
  ])

const createContext = () => {
  const appended: AcDbHatch[] = []
  const context = {
    doc: {
      database: {
        tables: {
          blockTable: {
            modelSpace: {
              appendEntity: jest.fn((entity: AcDbHatch) =>
                appended.push(entity)
              )
            }
          }
        }
      }
    }
  }

  return { appended, context }
}

const createSettings = (
  overrides: Partial<HatchSettings> = {}
): HatchSettings => ({
  patternName: 'ANSI31',
  patternScale: 2,
  patternAngleDeg: 15,
  style: AcDbHatchStyle.Normal,
  associative: true,
  ...overrides
})

describe('AcApHatchCmd', () => {
  test('expands predefined pattern names into hatch definition lines', () => {
    const { appended, context } = createContext()
    const cmd = new TestHatchCmd(createSettings())

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBe(true)

    const hatch = appended[0]
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.patternName).toBe('ANSI31')
    expect(hatch.patternScale).toBe(2)
    expect(hatch.patternAngle).toBeCloseTo(Math.PI / 12)
    expect(hatch.isSolidFill).toBe(false)
    expect(hatch.definitionLines.length).toBeGreaterThan(0)
    expect(hatch.definitionLines[0].angle).toBeCloseTo(Math.PI / 4)
    expect(hatch.definitionLines[0].offset.y).toBeCloseTo(3.175 * 2)
  })

  test('keeps SOLID hatches as solid fills without pattern definition lines', () => {
    const { appended, context } = createContext()
    const cmd = new TestHatchCmd(createSettings({ patternName: 'solid' }))

    expect(cmd.appendForTest(context as never, [createSquareLoop()])).toBe(true)

    const hatch = appended[0]
    expect(hatch.patternName).toBe('SOLID')
    expect(hatch.isSolidFill).toBe(true)
    expect(hatch.definitionLines).toHaveLength(0)
  })
})
