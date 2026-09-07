const mockFontLoaderInstances: MockAcApFontLoader[] = []

class MockAcApFontLoader {
  private _baseUrl = ''
  load = jest.fn(() => Promise.resolve())
  avaiableFonts = []

  constructor() {
    mockFontLoaderInstances.push(this)
  }

  get baseUrl() {
    return this._baseUrl
  }

  set baseUrl(value: string) {
    this._baseUrl = value
  }
}

const mockInitialize = jest.fn()
const mockSetRenderMode = jest.fn()
const mockSetDefaultFonts = jest.fn(() => Promise.resolve())
const mockSetLazyFontLoading = jest.fn(() => Promise.resolve())
const mockSetAwaitFontsBeforeDraw = jest.fn(() => Promise.resolve())

jest.mock('../src/app/AcApFontLoader', () => ({
  AcApFontLoader: MockAcApFontLoader
}))

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn(() => ({
      initialize: mockInitialize,
      setRenderMode: mockSetRenderMode,
      setDefaultFonts: mockSetDefaultFonts,
      setLazyFontLoading: mockSetLazyFontLoading,
      setAwaitFontsBeforeDraw: mockSetAwaitFontsBeforeDraw
    })),
    resetInstance: jest.fn()
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: jest.fn().mockImplementation(() => ({
    container: {},
    editor: {
      clearScriptInputs: jest.fn(),
      enqueueScriptInputs: jest.fn(),
      inputManager: {
        isMobilePromptOpen: false,
        mobileChrome: { prepareAccessory: jest.fn(), clearAccessory: jest.fn() },
        sessionAccessoryHost: {
          host: {},
          type: 'desktop'
        },
        selectionSessionAccessory: null
      }
    },
    renderer: {},
    clear: jest.fn(),
    zoomToFitDrawing: jest.fn(),
    zoomTo: jest.fn(),
    bindDrawDatabase: jest.fn(),
    syncDisplaySysVars: jest.fn(),
    captureSessionState: jest.fn(() => ({})),
    restoreSessionState: jest.fn(),
    beginNewSession: jest.fn(() => ({})),
    stopAnimationLoop: jest.fn(),
    disposeSessionState: jest.fn(),
    selectionSet: { ids: [], clear: jest.fn(), add: jest.fn() }
  }))
}))

jest.mock('../src/app/AcApDocument', () => ({
  AcApDocument: jest.fn().mockImplementation(() => ({
    isReusableUntitled: true,
    destroy: jest.fn(),
    openMode: 0,
    database: {
      events: {
        openProgress: {
          addEventListener: jest.fn()
        }
      },
      ltscale: 1,
      celtscale: 1,
      lwdisplay: false,
      extents: {
        isEmpty: jest.fn(() => true)
      },
      tables: {
        blockTable: {
          modelSpace: {
            objectId: 'model-space'
          }
        }
      },
      currentSpaceId: 'model-space'
    }
  }))
}))

jest.mock('../src/app/AcApXrefManager', () => ({
  AcApXrefManager: {
    instance: {
      clearAll: jest.fn()
    }
  }
}))

jest.mock('../src/app/AcApProgress', () => ({
  AcApProgress: jest.fn().mockImplementation(() => ({
    hide: jest.fn(),
    show: jest.fn(),
    setMessage: jest.fn()
  }))
}))

jest.mock('../src/app/AcApContext', () => ({
  AcApContext: jest.fn().mockImplementation((view, doc) => ({
    view,
    doc,
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../src/plugin/AcApPluginManager', () => ({
  AcApPluginManager: jest.fn().mockImplementation(() => ({
    unloadAllPlugins: jest.fn(() => Promise.resolve()),
    setContext: jest.fn(),
    loadPluginsFromConfig: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    ),
    loadPluginsFromFolder: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    )
  }))
}))

jest.mock('../src/ui/AcUiDrawStyleSessionAccessory', () => ({
  AcUiDrawStyleSessionAccessory: jest.fn().mockImplementation(() => ({
    setActiveKind: jest.fn(),
    createSessionAccessory: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../src/editor/input/ui/AcEdDesktopSessionAccessoryChrome', () => ({
  AcEdDesktopSessionAccessoryChrome: jest.fn().mockImplementation(() => ({
    dispose: jest.fn()
  }))
}))

jest.mock('../src/command/measure/AcApRegisterMeasureCommands', () => ({
  registerMeasureCommands: jest.fn()
}))

jest.mock('../src/command/markup/AcApRegisterMarkupCommands', () => ({
  registerMarkupCommands: jest.fn()
}))

jest.mock('../src/command/AcApInstallDrawStyleSessionAccessory', () => ({
  acapInstallDrawStyleSessionAccessory: jest.fn(),
  acapGetDrawStyleSessionAccessory: jest.fn()
}))

jest.mock('../src/editor', () => ({
  AcEdCommandStack: jest.fn().mockImplementation(() => ({
    addCommand: jest.fn(),
    lookupGlobalCmd: jest.fn(),
    lookupLocalCmd: jest.fn(),
    searchCommandsByPrefix: jest.fn(),
    cancelActive: jest.fn(() => Promise.resolve())
  })),
  AcEdOpenMode: {
    Read: 0
  },
  eventBus: {
    emit: jest.fn()
  }
}))

jest.mock('../src/command', () => {
  const commandNames = [
    'AcApAboutCmd',
    'AcApArcCmd',
    'AcApCacheFontCmd',
    'AcApCircleCmd',
    'AcApClearMarkupsCmd',
    'AcApClearMeasurementsCmd',
    'AcApCloseCmd',
    'AcApConvertToDxfCmd',
    'AcApConvertToPngCmd',
    'AcApEntityPreviewCmd',
    'AcApCopyCmd',
    'AcApDimLinearCmd',
    'AcApEllipseCmd',
    'AcApEraseCmd',
    'AcApHideObjectsCmd',
    'AcApHatchCmd',
    'AcApImageAttachCmd',
    'AcApInsertCmd',
    'AcApLayerCloseCmd',
    'AcApLayerCmd',
    'AcApLayerCurCmd',
    'AcApLayerDelCmd',
    'AcApLayerFreezeCmd',
    'AcApLayerIsoCmd',
    'AcApLayerLockCmd',
    'AcApLayerOnCmd',
    'AcApLayerPCmd',
    'AcApLayerThawCmd',
    'AcApLayerUnisoCmd',
    'AcApLayerUnlockCmd',
    'AcApLayoffCmd',
    'AcApLineCmd',
    'AcApLogCmd',
    'AcApMarkupArrowCmd',
    'AcApMarkupCalloutCmd',
    'AcApMarkupCircleCmd',
    'AcApMarkupCloudCmd',
    'AcApMarkupExportCmd',
    'AcApMarkupHighlightCmd',
    'AcApMarkupImportCmd',
    'AcApMarkupLineCmd',
    'AcApMarkupRectCmd',
    'AcApMarkupStampCmd',
    'AcApMarkupTextCmd',
    'AcApMarkupVisibilityCmd',
    'AcApMeasureAngleCmd',
    'AcApMeasureArcCmd',
    'AcApMeasureAreaCmd',
    'AcApMeasureContinuousCmd',
    'AcApMeasureDistanceCmd',
    'AcApMeasurementExportCmd',
    'AcApMeasurementImportCmd',
    'AcApMeasurementVisibilityCmd',
    'AcApMeasurePointCmd',
    'AcApMLineCmd',
    'AcApMoveCmd',
    'AcApMTextCmd',
    'AcApOffsetCmd',
    'AcApOpenCmd',
    'AcApPanCmd',
    'AcApPointCmd',
    'AcApPolygonCmd',
    'AcApPolylineCmd',
    'AcApQNewCmd',
    'AcApRayCmd',
    'AcApReadingModeCmd',
    'AcApRectCmd',
    'AcApRegenCmd',
    'AcApRevCloudCmd',
    'AcApRedoCmd',
    'AcApRotateCmd',
    'AcApSelectCmd',
    'AcApSketchCmd',
    'AcApSplineCmd',
    'AcApSwitchBgCmd',
    'AcApSysVarCmd',
    'AcApUndoCmd',
    'AcApUnisolateObjectsCmd',
    'AcApXAttachCmd',
    'AcApXLineCmd',
    'AcApZoomCmd'
  ]
  return {
    ...Object.fromEntries(
      commandNames.map(name => [
        name,
        jest.fn().mockImplementation(() => ({ trigger: jest.fn() }))
      ])
    ),
    acapBindMarkupSession: jest.fn(),
    acapDisposeMarkupSession: jest.fn(),
    resetMarkupSession: jest.fn(),
    resetMeasurementSession: jest.fn()
  }
})

jest.mock('@mlightcad/data-model', () => ({
  AcCmColor: jest.fn(),
  AcCmEventManager: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    dispatch: jest.fn()
  })),
  AcDbDatabaseConverterManager: {
    instance: {
      register: jest.fn()
    }
  },
  AcDbFileType: {
    DXF: 'DXF',
    DWG: 'DWG'
  },
  AcDbSysVarManager: {
    instance: jest.fn(() => ({
      getAllDescriptors: jest.fn(() => [])
    }))
  },
  AcGeBox2d: jest.fn(),
  acdbHostApplicationServices: jest.fn(() => ({})),
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

import { AcApDocManager } from '../src/app/AcApDocManager'

describe('AcApDocManager font URL configuration', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    mockFontLoaderInstances.length = 0
    mockInitialize.mockClear()
    mockSetRenderMode.mockClear()
    mockSetDefaultFonts.mockClear()
    mockSetLazyFontLoading.mockClear()
    mockSetAwaitFontsBeforeDraw.mockClear()
  })

  it('configures the font loader to download fonts from the custom base URL', async () => {
    const baseUrl = 'https://cdn.example.com/cad-data/'

    const manager = AcApDocManager.createInstance({
      baseUrl
    })

    await manager?.loadFonts(['simkai'])

    expect(mockFontLoaderInstances[0].baseUrl).toBe(`${baseUrl}fonts/`)
    expect(mockFontLoaderInstances[0].load).toHaveBeenCalledWith(['simkai'])
  })

  it('syncs the default fonts preset to the mtext renderer after worker init', () => {
    AcApDocManager.createInstance({})

    expect(mockInitialize).toHaveBeenCalled()
    expect(mockSetDefaultFonts).toHaveBeenCalledWith('modern')
  })

  it('configures main-thread mtext rendering before initializing workers', () => {
    AcApDocManager.createInstance({
      useMainThreadDraw: true
    })

    expect(mockSetRenderMode).toHaveBeenCalledWith('main')
    expect(mockInitialize).toHaveBeenCalled()
    expect(mockSetRenderMode.mock.invocationCallOrder[0]).toBeLessThan(
      mockInitialize.mock.invocationCallOrder[0]
    )
  })
})

describe('AcApDocManager disableExport', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
  })

  it('defaults to enabling export commands', () => {
    const manager = AcApDocManager.createInstance({})
    expect(manager?.disableExport).toBe(false)

    const addCommand = (
      manager!.commandManager as unknown as { addCommand: jest.Mock }
    ).addCommand
    const registered = addCommand.mock.calls.map(
      (call: unknown[]) => call[1] as string
    )
    expect(registered).toContain('cdxf')
    expect(registered).toContain('pngout')
  })

  it('skips built-in export commands when disableExport is true', () => {
    const manager = AcApDocManager.createInstance({
      disableExport: true
    })
    expect(manager?.disableExport).toBe(true)

    const addCommand = (
      manager!.commandManager as unknown as { addCommand: jest.Mock }
    ).addCommand
    const registered = addCommand.mock.calls.map(
      (call: unknown[]) => call[1] as string
    )
    expect(registered).not.toContain('cdxf')
    expect(registered).not.toContain('pngout')
    expect(registered).toContain('open')
  })
})

describe('AcApDocManager document sessions', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
  })

  it('starts with one document session', () => {
    const manager = AcApDocManager.createInstance({})
    expect(manager?.documentCount).toBe(1)
    expect(manager?.documents).toHaveLength(1)
    expect(manager?.mdiActiveDocument).toBe(manager?.curDocument)
    expect(manager?.activeSessionId).toMatch(/^doc-/)
  })

  it('activateDocument is a no-op for the current document', async () => {
    const manager = AcApDocManager.createInstance({})
    await expect(
      manager!.activateDocument(manager!.curDocument)
    ).resolves.toBe(true)
    expect(manager!.documentCount).toBe(1)
  })

  it('closeDocument on the last drawing keeps one untitled session', async () => {
    const manager = AcApDocManager.createInstance({})
    const first = manager!.curDocument
    await manager!.closeDocument()
    expect(manager!.documentCount).toBe(1)
    expect(manager!.curDocument).not.toBe(first)
  })
})
