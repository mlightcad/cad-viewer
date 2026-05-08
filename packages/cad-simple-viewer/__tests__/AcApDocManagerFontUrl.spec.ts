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

jest.mock('../src/app/AcApFontLoader', () => ({
  AcApFontLoader: MockAcApFontLoader
}))

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn(() => ({
      initialize: mockInitialize,
      setRenderMode: mockSetRenderMode
    }))
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: jest.fn().mockImplementation(() => ({
    container: {},
    editor: {
      clearScriptInputs: jest.fn(),
      enqueueScriptInputs: jest.fn()
    },
    renderer: {},
    clear: jest.fn(),
    zoomToFitDrawing: jest.fn(),
    zoomTo: jest.fn()
  }))
}))

jest.mock('../src/app/AcApDocument', () => ({
  AcApDocument: jest.fn().mockImplementation(() => ({
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

jest.mock('../src/app/AcApProgress', () => ({
  AcApProgress: jest.fn().mockImplementation(() => ({
    hide: jest.fn(),
    show: jest.fn(),
    setMessage: jest.fn()
  }))
}))

jest.mock('../src/app/AcApContext', () => ({
  AcApContext: jest.fn().mockImplementation((view, doc) => ({ view, doc }))
}))

jest.mock('../src/plugin/AcApPluginManager', () => ({
  AcApPluginManager: jest.fn().mockImplementation(() => ({
    unloadAllPlugins: jest.fn(() => Promise.resolve()),
    loadPluginsFromConfig: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    ),
    loadPluginsFromFolder: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    )
  }))
}))

jest.mock('../src/editor', () => ({
  AcEdCommandStack: jest.fn().mockImplementation(() => ({
    addCommand: jest.fn(),
    lookupGlobalCmd: jest.fn(),
    lookupLocalCmd: jest.fn(),
    searchCommandsByPrefix: jest.fn()
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
    'AcApArcCmd',
    'AcApCircleCmd',
    'AcApClearMeasurementsCmd',
    'AcApConvertToDxfCmd',
    'AcApConvertToPngCmd',
    'AcApConvertToSvgCmd',
    'AcApCopyCmd',
    'AcApDimLinearCmd',
    'AcApEllipseCmd',
    'AcApEraseCmd',
    'AcApHatchCmd',
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
    'AcApMeasureAngleCmd',
    'AcApMeasureArcCmd',
    'AcApMeasureAreaCmd',
    'AcApMeasureDistanceCmd',
    'AcApMLineCmd',
    'AcApMoveCmd',
    'AcApMTextCmd',
    'AcApOpenCmd',
    'AcApPanCmd',
    'AcApPointCmd',
    'AcApPolygonCmd',
    'AcApPolylineCmd',
    'AcApQNewCmd',
    'AcApRayCmd',
    'AcApRectCmd',
    'AcApRegenCmd',
    'AcApRevCircleCmd',
    'AcApRevCloudCmd',
    'AcApRevRectCmd',
    'AcApRevVisibilityCmd',
    'AcApRotateCmd',
    'AcApSelectCmd',
    'AcApSketchCmd',
    'AcApSplineCmd',
    'AcApSwitchBgCmd',
    'AcApSysVarCmd',
    'AcApXLineCmd',
    'AcApZoomCmd'
  ]
  return Object.fromEntries(
    commandNames.map(name => [
      name,
      jest.fn().mockImplementation(() => ({ trigger: jest.fn() }))
    ])
  )
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
  AcDbDxfConverter: jest.fn(),
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

jest.mock('@mlightcad/libredwg-converter', () => ({
  AcDbLibreDwgConverter: jest.fn()
}))

import { AcApDocManager } from '../src/app/AcApDocManager'

describe('AcApDocManager font URL configuration', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    mockFontLoaderInstances.length = 0
    mockInitialize.mockClear()
    mockSetRenderMode.mockClear()
  })

  it('configures the font loader to download fonts from the custom base URL', async () => {
    const baseUrl = 'https://cdn.example.com/cad-data/'

    const manager = AcApDocManager.createInstance({
      baseUrl,
      notLoadDefaultFonts: true
    })

    await manager?.loadFonts(['simkai'])

    expect(mockFontLoaderInstances[0].baseUrl).toBe(`${baseUrl}fonts/`)
    expect(mockFontLoaderInstances[0].load).toHaveBeenCalledWith(['simkai'])
  })
})
