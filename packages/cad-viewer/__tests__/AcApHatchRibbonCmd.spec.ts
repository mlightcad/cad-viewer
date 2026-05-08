const mockDocManager = {
  curDocument: undefined as { database: unknown } | undefined,
  curView: undefined as { selectionSet: { ids: string[] } } | undefined,
  editor: {
    getEntity: jest.fn()
  },
  sendStringToExecute: jest.fn()
}

jest.mock('@mlightcad/cad-simple-viewer', () => {
  class AcApHatchCmd {
    globalName = 'HATCH'

    protected normalizePatternName(value: string) {
      const name = value.trim().toUpperCase()
      return name.length > 0 ? name : 'SOLID'
    }

    protected keywordToStyle() {
      return 0
    }

    protected styleToKeyword() {
      return 'Normal'
    }
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptEntityOptions {
    allowNone = false
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
    addAllowedClass = jest.fn()
    setRejectMessage = jest.fn()
  }

  return {
    AcApDocManager: {
      instance: mockDocManager
    },
    AcApHatchCmd,
    AcApI18n: {
      t: (key: string) => key
    },
    AcEdPromptEntityOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel'
    }
  }
})

import {
  AcDbDatabase,
  AcDbHatch,
  AcDbHatchObjectType,
  AcDbSystemVariables,
  AcDbSysVarManager,
  DEFAULT_GRADIENT_HATCH_NAME,
  DEFAULT_HATCH_PATTERN_IMPERIAL,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import { AcApHatchRibbonCmd } from '../src/command/AcApHatchRibbonCmd'
import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  resolveHatchPatternPreviewSvg
} from '../src/component/common/hatchPatternPreview'

const createCommandWithDatabase = (
  patternName = DEFAULT_HATCH_PATTERN_IMPERIAL
) => {
  const database = new AcDbDatabase()
  AcDbSysVarManager.instance().setVar(
    AcDbSystemVariables.HPNAME,
    patternName,
    database
  )
  mockDocManager.curDocument = { database }
  mockDocManager.curView = undefined
  const command = new AcApHatchRibbonCmd()
  command.syncStateFromSysVars()
  return { command, database }
}

describe('AcApHatchRibbonCmd fill type synchronization', () => {
  afterEach(() => {
    mockDocManager.curDocument = undefined
    mockDocManager.curView = undefined
  })

  test('selecting solid also selects the SOLID gallery pattern', () => {
    const { command, database } = createCommandWithDatabase(
      DEFAULT_HATCH_PATTERN_IMPERIAL
    )

    command.setFillType('solid')

    expect(command.state.fillType).toBe('solid')
    expect(command.state.patternName).toBe(HATCH_PATTERN_SOLID)
    expect(
      AcDbSysVarManager.instance().getVar(AcDbSystemVariables.HPNAME, database)
    ).toBe(HATCH_PATTERN_SOLID)
  })

  test('selecting pattern also selects the default gallery pattern', () => {
    const { command, database } = createCommandWithDatabase(HATCH_PATTERN_SOLID)

    command.setFillType('pattern')

    expect(command.state.fillType).toBe('pattern')
    expect(command.state.patternName).toBe(DEFAULT_HATCH_PATTERN_IMPERIAL)
    expect(
      AcDbSysVarManager.instance().getVar(AcDbSystemVariables.HPNAME, database)
    ).toBe(DEFAULT_HATCH_PATTERN_IMPERIAL)
  })

  test('selecting gradient also selects the default gradient gallery pattern', () => {
    const { command, database } = createCommandWithDatabase(
      DEFAULT_HATCH_PATTERN_IMPERIAL
    )
    const expectedPatternName = `GR_${DEFAULT_GRADIENT_HATCH_NAME}`

    command.setFillType('gradient')

    expect(command.state.fillType).toBe('gradient')
    expect(command.state.hatchObjectType).toBe(
      AcDbHatchObjectType.GradientObject
    )
    expect(command.state.patternName).toBe(expectedPatternName)
    expect(
      AcDbSysVarManager.instance().getVar(AcDbSystemVariables.HPNAME, database)
    ).toBe(expectedPatternName)
  })

  test('selecting a gradient gallery pattern uses the prefixed pattern name', () => {
    const { command, database } = createCommandWithDatabase(
      DEFAULT_HATCH_PATTERN_IMPERIAL
    )

    command.setPatternNameFromGallery('GR_CURVED')

    expect(command.state.fillType).toBe('gradient')
    expect(command.state.hatchObjectType).toBe(
      AcDbHatchObjectType.GradientObject
    )
    expect(command.state.patternName).toBe('GR_CURVED')
    expect(
      AcDbSysVarManager.instance().getVar(AcDbSystemVariables.HPNAME, database)
    ).toBe('GR_CURVED')
  })

  test('applying a gradient gallery pattern writes the hatch gradient name', () => {
    const { command, database } = createCommandWithDatabase(
      DEFAULT_HATCH_PATTERN_IMPERIAL
    )
    const hatch = new AcDbHatch()
    database.tables.blockTable.modelSpace.appendEntity(hatch)
    mockDocManager.curView = {
      selectionSet: { ids: [hatch.objectId] }
    }

    command.setPatternNameFromGallery('GR_SPHERICAL')

    expect(hatch.hatchObjectType).toBe(AcDbHatchObjectType.GradientObject)
    expect(hatch.gradientName).toBe('SPHERICAL')
  })
})

describe('hatch pattern gallery gradient options', () => {
  const gradientPatternNames = [
    'GR_LINEAR',
    'GR_CYLINDER',
    'GR_INVCYLINDER',
    'GR_SPHERICAL',
    'GR_INVSPHERICAL',
    'GR_HEMISPHERICAL',
    'GR_INVHEMISPHERICAL',
    'GR_CURVED',
    'GR_INVCURVED'
  ]

  test('includes prefixed AutoCAD gradient names', () => {
    const optionValues = DEFAULT_HATCH_PATTERN_OPTIONS.map(
      option => option.value
    )

    expect(optionValues).toEqual(expect.arrayContaining(gradientPatternNames))
  })

  test('renders gradient preview SVG data for prefixed names', () => {
    const previewSvg = resolveHatchPatternPreviewSvg('GR_LINEAR')

    expect(previewSvg).toContain('data:image/svg+xml')
    expect(previewSvg).toContain('acdb-pat-gradient-linear')
  })
})
