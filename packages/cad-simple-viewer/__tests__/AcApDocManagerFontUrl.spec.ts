const mockFontLoaderInstances: MockAcApFontLoader[] = []

class MockAcApFontLoader {
  private _baseUrl = ''
  load = jest.fn(() => Promise.resolve())
  avaiableFonts = []
  fontLoader = {}
  getAvaiableFonts = jest.fn(async () => [])

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
const mockSetWorkerUrl = jest.fn()
const mockPresetReady = Promise.resolve()
const mockEnsureDefaultFontsReady = jest.fn(() => mockPresetReady)
const mockSetRenderMode = jest.fn()
const mockGetRenderMode = jest.fn(() => 'worker')
const mockSetDefaultFonts = jest.fn(() => Promise.resolve())
const mockSetLazyFontLoading = jest.fn(() => Promise.resolve())
const mockSetAwaitFontsBeforeDraw = jest.fn(() => Promise.resolve())
const mockSetFontUrl = jest.fn()
const mockLoadFonts = jest.fn(() => Promise.resolve([]))
const mockReadOverlayDatabase = jest.fn(async () => true)
const mockEstimateOverlayDatabase = jest.fn(() => ({
  entityCount: 1,
  totalBytes: 16
}))

jest.mock('../src/app/AcApFontLoader', () => ({
  AcApFontLoader: MockAcApFontLoader
}))

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrMTextRenderer: {
    getInstance: jest.fn(() => ({
      initialize: mockInitialize,
      setWorkerUrl: mockSetWorkerUrl,
      setRenderMode: mockSetRenderMode,
      getRenderMode: mockGetRenderMode,
      setDefaultFonts: mockSetDefaultFonts,
      setLazyFontLoading: mockSetLazyFontLoading,
      setAwaitFontsBeforeDraw: mockSetAwaitFontsBeforeDraw,
      setFontUrl: mockSetFontUrl,
      loadFonts: mockLoadFonts
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
        mobileChrome: {
          prepareAccessory: jest.fn(),
          clearAccessory: jest.fn()
        },
        sessionAccessoryHost: {
          host: {},
          type: 'desktop'
        },
        selectionSessionAccessory: null
      }
    },
    renderer: {
      context: {
        mtextRenderer: { ensureDefaultFontsReady: mockEnsureDefaultFontsReady }
      }
    },
    clear: jest.fn(),
    zoomToFitDrawing: jest.fn(),
    zoomToSmartExtents: jest.fn(),
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
      clearAll: jest.fn(),
      clearDocument: jest.fn(),
      forgetOverlay: jest.fn()
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
    'AcApConvertToBmpCmd',
    'AcApConvertToDxfCmd',
    'AcApConvertToJpgCmd',
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
  acdbEstimateDatabaseMemory: mockEstimateOverlayDatabase,
  AcDbDatabase: jest
    .fn()
    .mockImplementation(() => ({ read: mockReadOverlayDatabase })),
  AcCmColor: jest.fn(),
  AcCmEventManager: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
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

import {
  AcApDocManager,
  type AcApDocManagerOptions,
  type AcApPreparedOverlay
} from '../src/app/AcApDocManager'
import { AcApDocSession } from '../src/app/AcApDocSession'
import type { AcApContext } from '../src/app/AcApContext'
import type { AcDbDatabase } from '@mlightcad/data-model'
import type { AcTrLayout } from '../src/view/AcTrLayout'
import type { AcTrView2d } from '../src/view/AcTrView2d'
import { acapDisposeNotificationService } from '../src/app/notification'
import * as THREE from 'three'

describe('AcApDocManager font URL configuration', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    acapDisposeNotificationService()
    mockFontLoaderInstances.length = 0
    mockInitialize.mockClear()
    mockSetWorkerUrl.mockClear()
    mockSetRenderMode.mockClear()
    mockGetRenderMode.mockClear()
    mockGetRenderMode.mockReturnValue('worker')
    mockSetDefaultFonts.mockClear()
    mockSetLazyFontLoading.mockClear()
    mockSetAwaitFontsBeforeDraw.mockClear()
    mockSetFontUrl.mockClear()
    mockLoadFonts.mockClear()
    mockLoadFonts.mockResolvedValue([])
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

  it('configures font workers without allocating the singleton worker pool', () => {
    AcApDocManager.createInstance({})

    expect(mockSetWorkerUrl).toHaveBeenCalled()
    expect(mockInitialize).not.toHaveBeenCalled()
    expect(mockSetDefaultFonts).toHaveBeenCalledWith(['simsun', 'hztxt'])
    expect(mockSetFontUrl).toHaveBeenCalled()
  })

  it('configures main-thread rendering before setting the worker URL', () => {
    AcApDocManager.createInstance({
      useMainThreadDraw: true
    })

    expect(mockSetRenderMode).toHaveBeenCalledWith('main')
    expect(mockSetWorkerUrl).toHaveBeenCalled()
    expect(mockInitialize).not.toHaveBeenCalled()
    expect(mockSetRenderMode.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetWorkerUrl.mock.invocationCallOrder[0]
    )
  })
})

describe('AcApDocManager preset fonts for open', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    acapDisposeNotificationService()
    mockGetRenderMode.mockReset()
    mockGetRenderMode.mockReturnValue('worker')
    mockLoadFonts.mockReset()
    mockLoadFonts.mockResolvedValue([])
    mockEnsureDefaultFontsReady.mockClear()
  })

  it('uses readiness owned by the opening renderer and retains preset diagnostics', async () => {
    const manager = AcApDocManager.createInstance({})!
    const first = manager.ensurePresetFontsForOpen()
    const second = manager.ensurePresetFontsForOpen()

    expect(first).toBe(mockPresetReady)
    expect(second).toBe(mockPresetReady)
    await first
    expect(mockEnsureDefaultFontsReady).toHaveBeenCalledTimes(2)
    expect(mockLoadFonts).not.toHaveBeenCalled()
    expect(manager.lastPresetFontsForOpen).toEqual(
      expect.arrayContaining(['simsun', 'hztxt', 'amgdt'])
    )
  })

  it('warms the opening view when a different document is current', async () => {
    const manager = AcApDocManager.createInstance({})!
    const openingReady = Promise.resolve()
    const ensureOpening = jest.fn(() => openingReady)
    ;(manager as unknown as { _openingSession: unknown })._openingSession = {
      context: {
        view: {
          renderer: {
            context: {
              mtextRenderer: { ensureDefaultFontsReady: ensureOpening }
            }
          }
        }
      }
    }

    expect(manager.ensurePresetFontsForOpen()).toBe(openingReady)
    expect(ensureOpening).toHaveBeenCalledTimes(1)
    expect(mockEnsureDefaultFontsReady).not.toHaveBeenCalled()
    await openingReady
  })

  it('uses a new primary scope readiness instead of retaining the previous document promise', async () => {
    const manager = AcApDocManager.createInstance({})!
    const first = manager.ensurePresetFontsForOpen()
    const nextReady = Promise.resolve()
    const nextEnsure = jest.fn(() => nextReady)
    const renderer = manager.curView.renderer as unknown as {
      context: {
        mtextRenderer: { ensureDefaultFontsReady: () => Promise<void> }
      }
    }
    renderer.context = {
      mtextRenderer: { ensureDefaultFontsReady: nextEnsure }
    }

    const second = manager.ensurePresetFontsForOpen()

    expect(first).toBe(mockPresetReady)
    expect(second).toBe(nextReady)
    expect(second).not.toBe(first)
    expect(nextEnsure).toHaveBeenCalledTimes(1)
    expect(mockLoadFonts).not.toHaveBeenCalled()
    await second
  })

  it('kicks ensurePresetFontsForOpen from onBeforeOpenDocument without awaiting it', () => {
    const manager = AcApDocManager.createInstance({})
    let ensureCalled = false
    let ensureSettled = false
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    ;(
      manager as unknown as { ensurePresetFontsForOpen: () => Promise<void> }
    ).ensurePresetFontsForOpen = () => {
      ensureCalled = true
      return new Promise<void>(resolve => {
        settleTimer = setTimeout(() => {
          ensureSettled = true
          resolve()
        }, 50)
      })
    }
    ;(
      manager as unknown as {
        _openFileProgress: { setSeeThroughOverlay: (v: boolean) => void }
      }
    )._openFileProgress.setSeeThroughOverlay = jest.fn()
    ;(
      manager as unknown as {
        _openFileProfiler: { begin: (db: unknown) => void }
      }
    )._openFileProfiler.begin = jest.fn()
    ;(
      manager as unknown as {
        onBeforeOpenDocument: (options?: unknown, replace?: boolean) => void
      }
    ).onBeforeOpenDocument({}, false)

    expect(ensureCalled).toBe(true)
    // Open continues while preset load is still in flight.
    expect(ensureSettled).toBe(false)
    if (settleTimer) clearTimeout(settleTimer)
  })
})

describe('AcApDocManager disableExport', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    acapDisposeNotificationService()
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
    expect(registered).toContain('jpgout')
    expect(registered).toContain('bmpout')
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
    expect(registered).not.toContain('jpgout')
    expect(registered).not.toContain('bmpout')
    expect(registered).toContain('open')
  })
})

describe('AcApDocManager document sessions', () => {
  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    acapDisposeNotificationService()
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
    await expect(manager!.activateDocument(manager!.curDocument)).resolves.toBe(
      true
    )
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

describe('AcApDocManager overlay attachment transactions', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((yes, no) => {
      resolve = yes
      reject = no
    })
    return { promise, resolve, reject }
  }

  function scene() {
    return { internalScene: { add: jest.fn(), remove: jest.fn() } }
  }

  function layout() {
    return {
      internalObject: { removeFromParent: jest.fn() },
      clear: jest.fn(),
      setLayerVisibility: jest.fn().mockReturnValue(true),
      copyLayerVisibilityFrom: jest.fn(),
      stats: { summary: { totalSize: { geometry: 4, mapping: 2 } } },
      spatialIndexStats: { estimatedBytes: 2 },
      visible: true
    } as unknown as AcTrLayout
  }

  function setup(options: AcApDocManagerOptions = {}) {
    const manager = AcApDocManager.createInstance(options)!
    const view = manager.curView as AcTrView2d
    const state = manager as unknown as {
      _sessions: AcApDocSession[]
      _activeSession: AcApDocSession
    }
    const originalScene = scene()
    const prepare = jest.fn<Promise<AcTrLayout>, unknown[]>()
    Object.assign(view, {
      cadScene: originalScene,
      prepareOverlayEntities: prepare
    })
    return {
      manager,
      view,
      state,
      originalScene,
      prepare,
      owner: state._activeSession
    }
  }

  beforeEach(() => {
    ;(AcApDocManager as unknown as { _instance: unknown })._instance = undefined
    acapDisposeNotificationService()
    mockReadOverlayDatabase.mockReset().mockResolvedValue(true)
    mockEstimateOverlayDatabase
      .mockReset()
      .mockReturnValue({ entityCount: 1, totalBytes: 16 })
  })

  const overlayLimits = {
    references: 2,
    preparations: 1,
    inputBytes: 12,
    entities: 2,
    databaseBytes: 64,
    layoutBytes: 16
  }

  it('refuses input before parsing and holds cancelled noncooperative parsing until settlement', async () => {
    expect(() =>
      AcApDocManager.createInstance({ overlayLimits: null as never })
    ).toThrow(RangeError)
    const { manager, prepare } = setup({ overlayLimits })
    await expect(
      manager.loadOverlay('large.dxf', new ArrayBuffer(13))
    ).rejects.toMatchObject({ dimension: 'inputBytes' })
    expect(mockReadOverlayDatabase).not.toHaveBeenCalled()
    const parse = deferred<boolean>()
    mockReadOverlayDatabase.mockReturnValueOnce(parse.promise)
    const abort = new AbortController()
    const pending = manager.loadOverlay('first.dxf', new ArrayBuffer(4), {
      signal: abort.signal
    })
    const rejected = expect(pending).rejects.toMatchObject({
      name: 'AbortError'
    })
    abort.abort()
    expect(manager.overlayUsage).toMatchObject({
      references: 1,
      preparations: 1,
      inputBytes: 4
    })
    await expect(
      manager.loadOverlay('second.dxf', new ArrayBuffer(4))
    ).rejects.toMatchObject({ dimension: 'preparations' })
    expect(mockReadOverlayDatabase).toHaveBeenCalledTimes(1)
    parse.resolve(true)
    await rejected
    expect(prepare).not.toHaveBeenCalled()
    expect(
      Object.values(manager.overlayUsage!).every(value => value === 0)
    ).toBe(true)
  })

  it('charges both versions through preparation and releases only the retired version at commit', async () => {
    const { manager, prepare, owner } = setup({ overlayLimits })
    const old = layout()
    prepare.mockResolvedValueOnce(old).mockResolvedValueOnce(layout())
    const id = await manager.loadOverlay('old.dxf', new ArrayBuffer(4))
    manager.setOverlayVisible(id, false)
    const ready = await manager.prepareOverlay('new.dxf', new ArrayBuffer(5), {
      replaceOverlayId: id
    })
    expect(manager.overlayUsage).toEqual({
      references: 2,
      preparations: 0,
      inputBytes: 9,
      entities: 2,
      databaseBytes: 32,
      layoutBytes: 16
    })
    expect(old.clear).not.toHaveBeenCalled()
    const next = ready.commit()
    ready.dispose()
    expect(old.clear).toHaveBeenCalledTimes(1)
    expect(owner.overlays.get(next)?.layout.visible).toBe(false)
    expect(manager.overlayUsage).toEqual({
      references: 1,
      preparations: 0,
      inputBytes: 5,
      entities: 1,
      databaseBytes: 16,
      layoutBytes: 8
    })
    manager.removeOverlay(next)
    expect(manager.overlayUsage?.references).toBe(0)
  })

  it('refuses model and layout excess without removing the current reference', async () => {
    const { manager, prepare, owner } = setup({ overlayLimits })
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const id = await manager.loadOverlay('old.dxf', new ArrayBuffer(4))
    const activeUsage = manager.overlayUsage
    mockEstimateOverlayDatabase.mockReturnValueOnce({
      entityCount: 2,
      totalBytes: 16
    })
    await expect(
      manager.loadOverlay('large.dxf', new ArrayBuffer(4), {
        replaceOverlayId: id
      })
    ).rejects.toMatchObject({ dimension: 'entities' })
    expect(prepare).toHaveBeenCalledTimes(1)
    const large = layout()
    Object.assign(large, {
      stats: { summary: { totalSize: { geometry: 40, mapping: 2 } } }
    })
    prepare.mockResolvedValueOnce(large)
    await expect(
      manager.loadOverlay('large.dxf', new ArrayBuffer(4), {
        replaceOverlayId: id
      })
    ).rejects.toMatchObject({ dimension: 'layoutBytes' })
    expect(large.clear).toHaveBeenCalledTimes(1)
    expect(old.clear).not.toHaveBeenCalled()
    expect(owner.overlays.get(id)?.layout).toBe(old)
    expect(manager.overlayUsage).toEqual(activeUsage)
    manager.clearOverlays()
    expect(manager.overlayUsage?.references).toBe(0)
  })

  it('retains admission until an ignored geometry cancellation releases its late layout', async () => {
    const { manager, prepare } = setup({ overlayLimits })
    const geometry = deferred<AcTrLayout>()
    prepare.mockReturnValueOnce(geometry.promise)
    const abort = new AbortController()
    const pending = manager.prepareOverlayDatabase(
      { renderingRevision: 1 } as AcDbDatabase,
      { signal: abort.signal }
    )
    const rejected = expect(pending).rejects.toMatchObject({
      name: 'AbortError'
    })
    await Promise.resolve()
    expect(prepare).toHaveBeenCalledTimes(1)
    abort.abort()
    expect(manager.overlayUsage?.preparations).toBe(1)
    const late = layout()
    geometry.resolve(late)
    await rejected
    expect(late.clear).toHaveBeenCalledTimes(1)
    expect(
      Object.values(manager.overlayUsage!).every(value => value === 0)
    ).toBe(true)
  })

  it('keeps parked references charged across documents and releases them on clear', async () => {
    const { manager, prepare, owner, state, view, originalScene } = setup({
      overlayLimits
    })
    prepare.mockImplementation(async () => layout())
    await manager.loadOverlay('first.dxf', new ArrayBuffer(4))
    owner.viewState = { scene: originalScene } as never
    const next = new AcApDocSession('next', {
      ...owner.context,
      doc: {}
    } as never)
    state._sessions.push(next)
    state._activeSession = next
    Object.assign(view, { cadScene: scene() })
    await manager.loadOverlay('second.dxf', new ArrayBuffer(4))
    await expect(
      manager.loadOverlay('third.dxf', new ArrayBuffer(1))
    ).rejects.toMatchObject({ dimension: 'references' })
    expect(manager.overlayUsage?.references).toBe(2)
    manager.clearOverlays()
    expect(owner.overlays.size).toBe(0)
    expect(next.overlays.size).toBe(0)
    expect(
      Object.values(manager.overlayUsage!).every(value => value === 0)
    ).toBe(true)
  })

  it('rejects changed source revisions before publication and releases a ready handle only once', async () => {
    const { manager, prepare, originalScene } = setup({ overlayLimits })
    const prepared = layout()
    prepare.mockResolvedValue(prepared)
    const db = { renderingRevision: 1 } as AcDbDatabase
    const ready = await manager.prepareOverlayDatabase(db)
    Object.assign(db, { renderingRevision: 2 })
    expect(() => ready.commit()).toThrow('changed during preparation')
    ready.dispose()
    expect(prepared.clear).toHaveBeenCalledTimes(1)
    expect(originalScene.internalScene.add).not.toHaveBeenCalled()
    expect(
      Object.values(manager.overlayUsage!).every(value => value === 0)
    ).toBe(true)
  })

  it('queries only committed sources in the live session and retires retained source handles', async () => {
    const { manager, view, state, originalScene, prepare, owner } = setup()
    const nativeScene = new THREE.Scene()
    Object.assign(originalScene, { internalScene: nativeScene })
    const first = layout()
    Object.assign(first, { internalObject: new THREE.Group() })
    prepare.mockResolvedValue(first)
    const db = {} as AcDbDatabase
    const ready = await manager.prepareOverlayDatabase(db)
    expect(manager.getDrawingPickSources(view)).toEqual([])
    const id = ready.commit()
    const published = manager.getDrawingPickSources(view)[0]
    expect(published.database).toBe(db)
    expect(published.referenceId).toBe(id)
    expect(published.isCurrent()).toBe(true)

    const next = layout()
    Object.assign(next, { internalObject: new THREE.Group() })
    prepare.mockResolvedValue(next)
    const replacement = await manager.prepareOverlayDatabase(db, {
      replaceOverlayId: id
    })
    expect(
      manager.getDrawingPickSources(view).map(source => source.referenceId)
    ).toEqual([id])
    const nextId = replacement.commit()
    expect(published.isCurrent()).toBe(false)
    const current = manager.getDrawingPickSources(view)[0]
    expect(current.referenceId).toBe(nextId)
    expect(current.isCurrent()).toBe(true)

    owner.viewState = { scene: originalScene } as never
    expect(manager.getDrawingPickSources(view)).toEqual([])
    expect(current.isCurrent()).toBe(false)
    owner.viewState = undefined
    expect(manager.getDrawingPickSources(view)[0].isCurrent()).toBe(true)
    state._sessions = []
    expect(current.isCurrent()).toBe(false)
    manager.removeOverlay(nextId)
  })

  it('updates only the addressed reference layers and carries current choices on replacement', async () => {
    const { manager, view, prepare } = setup()
    const a = layout()
    const b = layout()
    const replacement = layout()
    const db = {} as AcDbDatabase
    prepare.mockResolvedValueOnce(a).mockResolvedValueOnce(b)
    const first = (await manager.prepareOverlayDatabase(db)).commit()
    const second = (await manager.prepareOverlayDatabase(db)).commit()
    prepare.mockResolvedValueOnce(replacement)
    const pending = await manager.prepareOverlayDatabase(db, {
      replaceOverlayId: first
    })
    view.isDirty = false
    expect(
      manager.setOverlayLayerVisibility(first, 'DETAIL', { isFrozen: true })
    ).toBe(true)
    expect(a.setLayerVisibility).toHaveBeenCalledWith('DETAIL', {
      isFrozen: true
    })
    expect(b.setLayerVisibility).not.toHaveBeenCalled()
    expect(view.isDirty).toBe(true)
    const next = pending.commit()
    expect(replacement.copyLayerVisibilityFrom).toHaveBeenCalledWith(a)
    expect(
      manager.setOverlayLayerVisibility(first, 'DETAIL', { isFrozen: false })
    ).toBe(false)
    manager.removeOverlay(next)
    manager.removeOverlay(second)
  })

  it('publishes late parsing into its captured parked document, not the new active scene', async () => {
    const { manager, view, state, originalScene, prepare, owner } = setup()
    const parse = deferred<boolean>()
    mockReadOverlayDatabase.mockReturnValueOnce(parse.promise)
    const ready = layout()
    prepare.mockResolvedValue(ready)
    const pending = manager.loadOverlay('source.dxf', new ArrayBuffer(0))
    const otherScene = scene()
    owner.viewState = { scene: originalScene } as unknown as NonNullable<
      AcApDocSession['viewState']
    >
    const next = new AcApDocSession('next', {
      view,
      doc: {}
    } as unknown as AcApContext)
    state._sessions.push(next)
    state._activeSession = next
    Object.assign(view, { cadScene: otherScene })
    parse.resolve(true)
    const id = await pending
    expect(owner.overlays.get(id)?.layout).toBe(ready)
    expect(next.overlays.size).toBe(0)
    expect(originalScene.internalScene.add).toHaveBeenCalledWith(
      ready.internalObject
    )
    expect(otherScene.internalScene.add).not.toHaveBeenCalled()
    expect(mockReadOverlayDatabase).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        readOnly: true,
        activateWorkingDatabase: false,
        signal: expect.any(AbortSignal)
      }),
      'DXF'
    )
  })

  it('cancels parsing on clear and never starts preparing its late result', async () => {
    const { manager, prepare } = setup()
    const parse = deferred<boolean>()
    mockReadOverlayDatabase.mockReturnValueOnce(parse.promise)
    const pending = manager.loadOverlay('source.dwg', new ArrayBuffer(0))
    manager.clearOverlays()
    parse.resolve(true)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(prepare).not.toHaveBeenCalled()
  })

  it('retains the previous overlay if replacement preparation fails', async () => {
    const { manager, prepare, originalScene, owner } = setup()
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const oldId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    prepare.mockRejectedValueOnce(new Error('conversion failed'))
    await expect(
      manager.registerOverlayDatabase({} as AcDbDatabase, {
        replaceOverlayId: oldId
      })
    ).rejects.toThrow('conversion failed')
    expect(owner.overlays.get(oldId)?.layout).toBe(old)
    expect(old.clear).not.toHaveBeenCalled()
    expect(originalScene.internalScene.remove).not.toHaveBeenCalled()
  })

  it('adds the prepared replacement before removing the old reference', async () => {
    const { manager, prepare, originalScene, owner } = setup()
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const oldId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    const work = deferred<AcTrLayout>()
    prepare.mockReturnValueOnce(work.promise)
    const pending = manager.registerOverlayDatabase({} as AcDbDatabase, {
      replaceOverlayId: oldId
    })
    await Promise.resolve()
    expect(old.clear).not.toHaveBeenCalled()
    const ready = layout()
    work.resolve(ready)
    const id = await pending
    expect(owner.overlays.has(oldId)).toBe(false)
    expect(owner.overlays.get(id)?.layout).toBe(ready)
    expect(old.clear).toHaveBeenCalledTimes(1)
    const adds = originalScene.internalScene.add.mock.invocationCallOrder
    expect(adds[1]).toBeLessThan(
      originalScene.internalScene.remove.mock.invocationCallOrder[0]
    )
  })

  it('disposes late preparation when its document was removed', async () => {
    const { manager, prepare, state, originalScene } = setup()
    const work = deferred<AcTrLayout>()
    prepare.mockReturnValueOnce(work.promise)
    const pending = manager.registerOverlayDatabase({} as AcDbDatabase)
    await Promise.resolve()
    state._sessions = []
    const ready = layout()
    work.resolve(ready)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(ready.clear).toHaveBeenCalledTimes(1)
    expect(originalScene.internalScene.add).not.toHaveBeenCalled()
  })

  it('supersedes an unfinished replacement without losing the existing one', async () => {
    const { manager, prepare, owner } = setup()
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const oldId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    const first = deferred<AcTrLayout>()
    const second = deferred<AcTrLayout>()
    prepare
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const a = manager.registerOverlayDatabase({} as AcDbDatabase, {
      replaceOverlayId: oldId
    })
    await Promise.resolve()
    const b = manager.registerOverlayDatabase({} as AcDbDatabase, {
      replaceOverlayId: oldId
    })
    await Promise.resolve()
    const stale = layout()
    first.resolve(stale)
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    expect(stale.clear).toHaveBeenCalledTimes(1)
    expect(owner.overlays.get(oldId)?.layout).toBe(old)
    const ready = layout()
    second.resolve(ready)
    const id = await b
    expect(owner.overlays.get(id)?.layout).toBe(ready)
  })

  it('snapshots caller placement before parsing yields', async () => {
    const { manager, prepare } = setup()
    const parse = deferred<boolean>()
    mockReadOverlayDatabase.mockReturnValueOnce(parse.promise)
    prepare.mockResolvedValue(layout())
    const transform = {
      position: { x: 10, y: 20, z: 0 },
      scale: 2,
      rotationRad: 0.5
    }
    const pending = manager.loadOverlay('source.dxf', new ArrayBuffer(0), {
      transform
    })
    transform.position.x = 999
    transform.scale = 100
    parse.resolve(true)
    await pending
    expect(prepare).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        transform: {
          position: { x: 10, y: 20, z: 0 },
          scale: 2,
          rotationRad: 0.5
        }
      })
    )
  })

  it('rejects failed reads and invalid placement without publishing partial content', async () => {
    const { manager, prepare, originalScene } = setup()
    mockReadOverlayDatabase.mockRejectedValueOnce(new Error('parse failed'))
    await expect(
      manager.loadOverlay('bad.dxf', new ArrayBuffer(0))
    ).rejects.toThrow('parse failed')
    await expect(
      manager.loadOverlay('source.dxf', new ArrayBuffer(0), {
        transform: {
          position: { x: NaN, y: 0, z: 0 },
          scale: 1,
          rotationRad: 0
        }
      })
    ).rejects.toThrow('finite values')
    expect(mockReadOverlayDatabase).toHaveBeenCalledTimes(1)
    expect(prepare).not.toHaveBeenCalled()
    expect(originalScene.internalScene.add).not.toHaveBeenCalled()
  })

  it('restores the next document without recapturing the released active session', async () => {
    const { manager, view, state, owner } = setup()
    const next = new AcApDocSession('next', {
      ...owner.context,
      doc: { ...owner.doc },
      resume: jest.fn()
    } as unknown as AcApContext)
    const parked = { scene: scene() } as unknown as NonNullable<
      AcApDocSession['viewState']
    >
    next.viewState = parked
    // closeDocument has removed the previous session and released its scope;
    // activateDocument must not park that disposed context for a second time.
    state._sessions = [next]
    ;(view.captureSessionState as jest.Mock).mockImplementation(() => {
      throw new Error('Drawing resource scope is disposed')
    })
    jest
      .spyOn(
        manager as unknown as { setActiveLayout(): void },
        'setActiveLayout'
      )
      .mockImplementation(() => undefined)
    jest
      .spyOn(
        manager as unknown as { syncProgressOverlayHost(): void },
        'syncProgressOverlayHost'
      )
      .mockImplementation(() => undefined)
    await expect(manager.activateDocument(next.doc)).resolves.toBe(true)
    expect(view.captureSessionState).not.toHaveBeenCalled()
    expect(view.restoreSessionState).toHaveBeenCalledWith(parked)
    expect(manager.activeSessionId).toBe('next')
  })

  it('keeps prepared replacements detached and disposes abandoned resources once', async () => {
    const { manager, prepare, originalScene } = setup()
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const oldId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    const ready = layout()
    prepare.mockResolvedValueOnce(ready)
    const pending = await manager.prepareOverlayDatabase({} as AcDbDatabase, {
      replaceOverlayId: oldId
    })
    expect(originalScene.internalScene.add).toHaveBeenCalledTimes(1)
    expect(manager.getOverlayLayout(oldId)).toBe(old)
    pending.dispose()
    pending.dispose()
    expect(ready.clear).toHaveBeenCalledTimes(1)
    expect(old.clear).not.toHaveBeenCalled()
    expect(() => pending.commit()).toThrow('cancelled')
  })

  it('releases already-prepared geometry on abort or document clear before commit', async () => {
    const { manager, prepare, originalScene } = setup()
    const aborted = layout()
    const cleared = layout()
    prepare.mockResolvedValueOnce(aborted).mockResolvedValueOnce(cleared)
    const controller = new AbortController()
    const first = await manager.prepareOverlayDatabase({} as AcDbDatabase, {
      signal: controller.signal
    })
    controller.abort()
    expect(aborted.clear).toHaveBeenCalledTimes(1)
    expect(() => first.commit()).toThrow('cancelled')
    const second = await manager.prepareOverlayDatabase({} as AcDbDatabase)
    manager.clearOverlays()
    expect(cleared.clear).toHaveBeenCalledTimes(1)
    expect(() => second.commit()).toThrow('cancelled')
    expect(originalScene.internalScene.add).not.toHaveBeenCalled()
  })

  it('commits synchronously and leaves published geometry alive after handle disposal', async () => {
    const { manager, prepare } = setup()
    const ready = layout()
    prepare.mockResolvedValueOnce(ready)
    const handle = await manager.prepareOverlayDatabase({} as AcDbDatabase)
    const id = handle.commit()
    expect(manager.getOverlayLayout(id)).toBe(ready)
    handle.dispose()
    handle.dispose()
    expect(ready.clear).not.toHaveBeenCalled()
    expect(() => handle.commit()).toThrow('already committed')
    manager.removeOverlay(id)
    expect(ready.clear).toHaveBeenCalledTimes(1)
  })

  it('rejects commit into a directly disposed view and releases its prepared layout once', async () => {
    const { manager, prepare, view, originalScene } = setup()
    const ready = layout()
    prepare.mockResolvedValueOnce(ready)
    const handle = await manager.prepareOverlayDatabase({} as AcDbDatabase)
    Object.assign(view, { isDisposed: true })
    expect(() => handle.commit()).toThrow('session changed')
    handle.dispose()
    expect(ready.clear).toHaveBeenCalledTimes(1)
    expect(originalScene.internalScene.add).not.toHaveBeenCalled()
    await expect(
      manager.prepareOverlayDatabase({} as AcDbDatabase)
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('replaces an existing native reference after overlapping Xref preparations without a handoff gap', async () => {
    const { manager, prepare } = setup()
    const { AcApXrefManager: NativeXref } = jest.requireActual<
      typeof import('../src/app/AcApXrefManager')
    >('../src/app/AcApXrefManager')
    ;(NativeXref as unknown as { _instance: unknown })._instance = undefined
    const xrefs = NativeXref.instance
    const input = {
      blockName: 'survey',
      fileName: 'survey.dxf',
      sourcePath: 'survey.dxf',
      sourceDb: {} as AcDbDatabase
    }
    const old = layout()
    prepare.mockResolvedValueOnce(old)
    const initial = await xrefs.attachOverlay(input)
    const nativePrepare = manager.prepareOverlayDatabase.bind(manager)
    const preparedFirst = deferred<AcApPreparedOverlay>()
    const deliverFirst = deferred<AcApPreparedOverlay>()
    jest
      .spyOn(manager, 'prepareOverlayDatabase')
      .mockImplementationOnce(async (db, options) => {
        const handle = await nativePrepare(db, options)
        preparedFirst.resolve(handle)
        return deliverFirst.promise
      })
    const stale = layout()
    prepare.mockResolvedValueOnce(stale)
    const first = xrefs.attachOverlay(input)
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    const firstHandle = await preparedFirst.promise
    expect(manager.getOverlayLayout(initial.overlayId)).toBe(old)
    const finishSecond = deferred<AcTrLayout>()
    prepare.mockReturnValueOnce(finishSecond.promise)
    const second = xrefs.attachOverlay(input)
    deliverFirst.resolve(firstHandle)
    await rejected
    expect(stale.clear).toHaveBeenCalledTimes(1)
    expect(old.clear).not.toHaveBeenCalled()
    expect(manager.getOverlayLayout(initial.overlayId)).toBe(old)
    const latest = layout()
    finishSecond.resolve(latest)
    const current = await second
    expect(manager.getOverlayIds()).toEqual([current.overlayId])
    expect(manager.getOverlayLayout(current.overlayId)).toBe(latest)
    expect(xrefs.sessions).toEqual([current])
    expect(current.id).toBe(initial.id)
    expect(old.clear).toHaveBeenCalledTimes(1)
    expect(latest.clear).not.toHaveBeenCalled()
  })

  it('replaces only the active document and lists its overlays on a shared canvas', async () => {
    const { manager, view, state, owner, prepare } = setup()
    const active = layout()
    prepare.mockResolvedValueOnce(active)
    const activeId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    const parked = new AcApDocSession('parked', {
      ...owner.context,
      doc: { ...owner.doc }
    } as unknown as AcApContext)
    const retained = layout()
    parked.viewState = { scene: scene() } as unknown as NonNullable<
      AcApDocSession['viewState']
    >
    parked.overlays.set('retained', {
      db: {} as AcDbDatabase,
      layout: retained
    })
    state._sessions.unshift(parked)
    expect(manager.getOverlayIds(view)).toEqual([activeId])
    const xrefs = jest.requireMock('../src/app/AcApXrefManager').AcApXrefManager
      .instance
    xrefs.clearDocument.mockClear()
    xrefs.clearAll.mockClear()
    jest.requireMock('../src/command').AcApZoomCmd.clearOriginalViews =
      jest.fn()
    const opening = manager as unknown as {
      _openFileProgress: { setSeeThroughOverlay: (value: boolean) => void }
      _openFileProfiler: { begin: (db: unknown) => void }
      onBeforeOpenDocument: (options: unknown, replace: boolean) => void
    }
    opening._openFileProgress.setSeeThroughOverlay = jest.fn()
    opening._openFileProfiler.begin = jest.fn()
    jest.spyOn(manager, 'ensurePresetFontsForOpen').mockResolvedValue(undefined)
    opening.onBeforeOpenDocument({}, true)
    expect(active.clear).toHaveBeenCalledTimes(1)
    expect(retained.clear).not.toHaveBeenCalled()
    expect(parked.overlays.has('retained')).toBe(true)
    expect(xrefs.clearDocument).toHaveBeenCalledWith(owner.id)
    expect(xrefs.clearDocument).not.toHaveBeenCalledWith(parked.id)
    expect(xrefs.clearAll).not.toHaveBeenCalled()
  })

  it('closes a parked document without removing active-document references', async () => {
    const { manager, state, owner, prepare } = setup()
    const active = layout()
    prepare.mockResolvedValueOnce(active)
    const activeId = await manager.registerOverlayDatabase({} as AcDbDatabase)
    const parked = new AcApDocSession('parked', {
      ...owner.context,
      doc: { ...owner.doc }
    } as unknown as AcApContext)
    const removed = layout()
    const pending = new AbortController()
    parked.viewState = { scene: scene() } as unknown as NonNullable<
      AcApDocSession['viewState']
    >
    parked.overlays.set('removed', { db: {} as AcDbDatabase, layout: removed })
    parked.overlayAttachments.set(pending, 'removed')
    state._sessions.push(parked)
    const xrefs = jest.requireMock('../src/app/AcApXrefManager').AcApXrefManager
      .instance
    xrefs.clearDocument.mockClear()
    await expect(manager.closeDocument(parked.doc)).resolves.toBe(true)
    expect(pending.signal.aborted).toBe(true)
    expect(removed.clear).toHaveBeenCalledTimes(1)
    expect(active.clear).not.toHaveBeenCalled()
    expect(manager.getOverlayIds()).toEqual([activeId])
    expect(xrefs.clearDocument).toHaveBeenCalledWith(parked.id)
    expect(xrefs.clearDocument).not.toHaveBeenCalledWith(owner.id)
  })
})
