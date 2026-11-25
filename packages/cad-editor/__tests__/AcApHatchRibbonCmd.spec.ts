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
    static BRANCH_CONTINUE = 'continue' as const
    static BRANCH_CANCEL = 'cancel' as const

    globalName = 'HATCH'

    protected normalizePatternName(value: string) {
      const name = value.trim().toUpperCase()
      return name.length > 0 ? name : 'SOLID'
    }

    protected keywordToStyle(keyword: string) {
      if (keyword === 'Outer') return 1
      if (keyword === 'Ignore') return 2
      return 0
    }

    protected styleToKeyword(style: number) {
      if (style === 1) return 'Outer'
      if (style === 2) return 'Ignore'
      return 'Normal'
    }

    protected beginSession() {}

    protected finishSession(_context: unknown) {}

    protected markDiscardSession() {}

    protected onSessionHatchCreated(_hatch: unknown) {}

    protected onSessionHatchRemoved(_hatch: unknown) {}

    protected undoLastSessionHatch() {
      return false
    }

    protected styleFromIslandDetection(value: unknown) {
      const n = Number(value)
      if (n === 0) return 0
      if (n === 2) return 2
      return 1
    }

    protected islandDetectionFromStyle(style: number) {
      if (style === 0) return 0
      if (style === 2) return 2
      return 1
    }

    protected getHatchOriginSysVar() {
      return { x: 0, y: 0 }
    }

    protected originFromExtents(
      hatch: { geometricExtents: { min: { x: number; y: number }; max: { x: number; y: number } } },
      mode: number
    ) {
      const box = hatch.geometricExtents
      const min = box.min
      const max = box.max
      if (mode === 2) return { x: max.x, y: min.y }
      if (mode === 3) return { x: max.x, y: max.y }
      if (mode === 4) return { x: min.x, y: max.y }
      if (mode === 5) return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 }
      return { x: min.x, y: min.y }
    }

    protected async promptHatchOriginPoint() {
      return undefined
    }

    protected showMessage() {}

    protected appendHatch() {
      return undefined
    }

    protected appendHatches() {
      return false
    }

    protected collectLoopsFromIds() {
      return []
    }

    protected async doPickPoints() {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    protected async doSelectObjects() {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    protected async doRemoveBoundaries() {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    protected async doRecreateBoundary() {
      return AcApHatchCmd.BRANCH_CONTINUE
    }

    protected get sessionHatches() {
      return []
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
    AcApLayerService: {
      isEntityOnLockedLayer: (
        db: {
          tables: {
            layerTable: { getAt: (name: string) => { isLocked: boolean } }
          }
        },
        entity: { layer: string } | undefined
      ) => !!entity && !!db.tables.layerTable.getAt(entity.layer)?.isLocked
    },
    acapRunDatabaseEdit: (_db: unknown, _label: string, fn: () => void) => {
      fn()
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
  AcGeLine2d,
  AcGeLoop2d,
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

  test('leaves preselected hatches on locked layers unchanged', () => {
    const { command, database } = createCommandWithDatabase(
      DEFAULT_HATCH_PATTERN_IMPERIAL
    )
    const hatch = new AcDbHatch()
    database.tables.blockTable.modelSpace.appendEntity(hatch)
    database.tables.layerTable.getAt('0')!.isLocked = true
    mockDocManager.curView = {
      selectionSet: { ids: [hatch.objectId] }
    }

    command.setPatternNameFromGallery('GR_SPHERICAL')

    expect(hatch.hatchObjectType).not.toBe(AcDbHatchObjectType.GradientObject)
  })

  test('No Island Detection clears HPISLANDDETECTIONMODE', () => {
    const { command, database } = createCommandWithDatabase()

    command.setStyle('None')

    expect(command.state.style).toBe('None')
    expect(
      AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.HPISLANDDETECTIONMODE,
        database
      )
    ).toBe(0)
  })

  test('Outer Island Detection enables mode and sets HPISLANDDETECTION', () => {
    const { command, database } = createCommandWithDatabase()
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPISLANDDETECTIONMODE,
      0,
      database
    )

    command.setStyle('Outer')

    expect(command.state.style).toBe('Outer')
    expect(
      AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.HPISLANDDETECTIONMODE,
        database
      )
    ).toBe(1)
    expect(
      AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.HPISLANDDETECTION,
        database
      )
    ).toBe(1)
  })

  test('Set Origin point writes HPORIGIN and mode 0', () => {
    const { command, database } = createCommandWithDatabase()

    command.applyOriginPoint({ x: 12, y: 34 })

    expect(command.state.originMode).toBe(0)
    expect(
      AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.HPORIGINMODE,
        database
      )
    ).toBe(0)
    expect(
      AcDbSysVarManager.instance().getVar(AcDbSystemVariables.HPORIGIN, database)
    ).toEqual({ x: 12, y: 34, z: 0 })
  })

  test('origin extents mode updates selected hatch origin', () => {
    const { command, database } = createCommandWithDatabase()
    const hatch = new AcDbHatch()
    // Closed square 0,0 → 10,10 so center origin is (5, 5).
    const loop = new AcGeLoop2d()
    loop.add(new AcGeLine2d({ x: 0, y: 0 }, { x: 10, y: 0 }))
    loop.add(new AcGeLine2d({ x: 10, y: 0 }, { x: 10, y: 10 }))
    loop.add(new AcGeLine2d({ x: 10, y: 10 }, { x: 0, y: 10 }))
    loop.add(new AcGeLine2d({ x: 0, y: 10 }, { x: 0, y: 0 }))
    hatch.add(loop)
    database.tables.blockTable.modelSpace.appendEntity(hatch)
    mockDocManager.curView = {
      selectionSet: { ids: [hatch.objectId] }
    }

    command.setOriginMode(5)

    expect(command.state.originMode).toBe(5)
    expect(hatch.originPoint.x).toBeCloseTo(5)
    expect(hatch.originPoint.y).toBeCloseTo(5)
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
