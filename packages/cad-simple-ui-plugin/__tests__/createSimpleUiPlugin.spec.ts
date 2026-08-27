/** @jest-environment jsdom */

jest.mock('../package.json', () => ({ version: '0.0.0-test' }))

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

const mockCommands = new Map<string, unknown>()
const mockCurView: { container?: HTMLElement } = {}
const mockCurDocument: { database?: unknown } = { database: {} }
const mockDocumentActivatedListeners = new Set<(args?: unknown) => void>()

function createEventStub() {
  return {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
}

jest.mock('@mlightcad/cad-simple-viewer', () => {
  const layout = jest.requireActual(
    '../../cad-simple-viewer/src/editor/global/AcEdUiLayout'
  ) as typeof import('../../cad-simple-viewer/src/editor/global/AcEdUiLayout')

  return {
    ...layout,
    acedIsMobileUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_MOBILE_MEDIA_QUERY).matches ?? false,
    acedIsCompactUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_COMPACT_MEDIA_QUERY).matches ?? false,
    acedGetUiLayoutKind: () => {
      if (window.matchMedia?.(layout.ML_UI_MOBILE_MEDIA_QUERY).matches) {
        return 'mobile'
      }
      if (window.matchMedia?.(layout.ML_UI_COMPACT_MEDIA_QUERY).matches) {
        return 'pad'
      }
      return 'desktop'
    },
    AcApContext: class {},
    AcApDocManager: {
      instance: {
        get curView() {
          return mockCurView.container
            ? {
                container: mockCurView.container,
                width: 100,
                height: 100,
                screenToWorld: ({ x, y }: { x: number; y: number }) => ({
                  x,
                  y
                }),
                zoomTo: jest.fn(),
                zoomToFitDrawing: jest.fn()
              }
            : undefined
        },
        get curDocument() {
          return mockCurDocument
        },
        events: {
          documentActivated: {
            addEventListener: (listener: (args?: unknown) => void) => {
              mockDocumentActivatedListeners.add(listener)
            },
            removeEventListener: (listener: (args?: unknown) => void) => {
              mockDocumentActivatedListeners.delete(listener)
            }
          },
          documentToBeOpened: createEventStub()
        },
        sendStringToExecute: jest.fn()
      }
    },
    AcApI18n: {
      t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
      mergeLocaleMessage: jest.fn(),
      events: {
        localeChanged: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      },
      currentLocale: 'en',
      setCurrentLocale: jest.fn()
    },
    AcApPlugin: class {},
    acapSetDrawStyleHostHasRibbon: jest.fn(),
    isMarkupVisible: () => true,
    isMeasurementVisible: () => true,
    AcEdCommand: class {},
    AcEdCommandStack: class {
      static SYSTEMT_COMMAND_GROUP_NAME = 'SYSTEM'
      addCommand(
        group: string,
        name: string,
        _globalName: string,
        command: unknown
      ) {
        mockCommands.set(`${group}:${name}`, command)
      }
      removeCmd(group: string, name: string) {
        mockCommands.delete(`${group}:${name}`)
      }
    },
    AcEdOpenMode: {
      Read: 0,
      Review: 4,
      Write: 8
    },
    AcEdUiTheme: {},
    acedApplyUiTheme: jest.fn(),
    isLightColorTheme: jest.fn(() => false),
    eventBus: {
      on: jest.fn(),
      off: jest.fn()
    },
    getMarkupStore: () => ({
      list: () => [],
      selectedId: undefined,
      subscribe: () => () => undefined,
      updateMeta: jest.fn()
    }),
    getMarkupPresenter: () => ({
      select: jest.fn(),
      focus: jest.fn(),
      unpublish: jest.fn(),
      publish: jest.fn(),
      clearVisuals: jest.fn()
    }),
    runMarkupEdit: (_view: unknown, _label: string, mutate: () => void) => {
      mutate()
    },
    MARKUP_STATUSES: ['open', 'question', 'answered', 'closed']
  }
})

jest.mock('@mlightcad/data-model', () => ({
  AcGeBox2d: class {
    expandByPoint() {
      return this
    }
  },
  AcCmColor: {
    fromString: jest.fn(() => null)
  },
  AcDbDatabase: class {},
  AcDbSystemVariables: {
    COLORTHEME: 'COLORTHEME'
  },
  AcDbSysVarManager: {
    instance: () => ({
      events: {
        sysVarChanged: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      },
      getVar: jest.fn(),
      setVar: jest.fn()
    })
  }
}))

import { AcApDocManager, AcEdCommandStack } from '@mlightcad/cad-simple-viewer'
import { AcDbDatabase } from '@mlightcad/data-model'

import { AcApSimpleUiPlugin } from '../src/createSimpleUiPlugin'
import { acuiToolbarPreset } from '../src/config/toolbarItemUtils'

function createHostTree() {
  const host = document.createElement('div')
  const canvasParent = document.createElement('div')
  const canvas = document.createElement('div')
  canvasParent.appendChild(canvas)
  host.appendChild(canvasParent)
  Object.defineProperty(canvasParent, 'clientWidth', {
    configurable: true,
    value: 800
  })
  Object.defineProperty(canvasParent, 'clientHeight', {
    configurable: true,
    value: 600
  })
  document.body.appendChild(host)
  mockCurView.container = canvas
  return { host, canvasParent, canvas }
}

function executeMockCommand(command: string) {
  const name = command.split('\n')[0]?.trim()
  if (!name) return
  const cmd = mockCommands.get(`SYSTEM:${name}`) as
    | { execute: (context: unknown) => unknown }
    | undefined
  void cmd?.execute({})
}

function loadPlugin(
  options: ConstructorParameters<typeof AcApSimpleUiPlugin>[0] = {}
) {
  AcApDocManager.instance.sendStringToExecute = jest.fn(executeMockCommand)
  const commandManager = new AcEdCommandStack()
  const plugin = new AcApSimpleUiPlugin(options)
  plugin.onLoad({} as never, commandManager)
  return { plugin, commandManager }
}

describe('AcApSimpleUiPlugin', () => {
  afterEach(() => {
    document.body.replaceChildren()
    mockCommands.clear()
    mockCurView.container = undefined
    mockDocumentActivatedListeners.clear()
    mockCurDocument.database = new AcDbDatabase()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('loads layer UI in the dock panel on startup', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select'), acuiToolbarPreset('layer')]
      }
    })

    expect(mockCommands.has('SYSTEM:layer')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-layer-manager')).toBeNull()
    expect(
      (plugin as unknown as { dockPanel?: unknown }).dockPanel
    ).toBeDefined()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
  })

  it('controls dock panel open state and size', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      dockPanel: { enabled: true },
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(plugin.isDockPanelOpen()).toBe(false)
    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(plugin.getDockPanelSide()).toBe('left')
    expect(plugin.getDockPanelSize()).toBe(280)

    expect(plugin.setDockPanelSize(120)).toBe(true)
    expect(plugin.getDockPanelSize()).toBe(120)

    expect(plugin.setDockPanelOpen(false)).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(false)
  })

  it('opens the dock panel without clicking the layer button first', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mockCurView.container = undefined
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)
    Object.defineProperty(canvasParent, 'clientWidth', {
      configurable: true,
      value: 800
    })
    Object.defineProperty(canvasParent, 'clientHeight', {
      configurable: true,
      value: 600
    })
    mockCurView.container = canvas

    mockDocumentActivatedListeners.forEach(listener => {
      listener({ doc: { database: new AcDbDatabase() } } as never)
    })

    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)

    const dockPanel = canvasParent.querySelector(
      '.ml-ex-ui-dock-panel'
    ) as HTMLElement
    expect(dockPanel).not.toBeNull()
    expect(dockPanel.dataset.open).toBe('true')
    expect(canvasParent.contains(dockPanel)).toBe(true)
    expect(host.querySelector(':scope > .ml-ex-ui-dock-panel')).toBeNull()
  })

  it('opens the dock panel from the layer button and switches to the layers tab', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    const getActiveTabId = () =>
      (
        plugin as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(plugin.isDockPanelOpen()).toBe(false)

    const layerButton = host.querySelector(
      '[data-toolbar-item-id="layer"]'
    ) as HTMLButtonElement
    layerButton.click()
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('layers')

    expect(
      plugin.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    layerButton.click()
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('layers')
  })

  it('opens an existing dock shell that was never opened before', () => {
    const { host, canvasParent } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    mockDocumentActivatedListeners.forEach(listener => {
      listener({ doc: { database: new AcDbDatabase() } } as never)
    })

    expect(plugin.isDockPanelOpen()).toBe(false)
    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(
      canvasParent
        .querySelector('.ml-ex-ui-dock-panel')
        ?.getAttribute('data-open')
    ).toBe('true')
  })

  it('addDockPanelTab keeps the dock open when it was already open', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(
      plugin.addDockPanelTab({
        id: 'demo-1',
        label: 'Demo 1',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(
      host.querySelector('.ml-ex-ui-dock-panel')?.getAttribute('data-open')
    ).toBe('true')
  })

  it('addDockPanelTab accumulates multiple custom tabs', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(
      plugin.addDockPanelTab({
        id: 'demo-1',
        label: 'Demo 1',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(
      plugin.addDockPanelTab({
        id: 'demo-2',
        label: 'Demo 2',
        content: document.createElement('div')
      })
    ).toBe(true)

    expect(
      host.querySelector('.ml-ex-ui-dock-tab[data-tab-id="layers"]')
    ).not.toBeNull()
    expect(
      host.querySelector('.ml-ex-ui-dock-tab[data-tab-id="demo-1"]')
    ).not.toBeNull()
    expect(
      host.querySelector('.ml-ex-ui-dock-tab[data-tab-id="demo-2"]')
    ).not.toBeNull()
  })

  it('toggleDockPanelTab opens, focuses, and closes a tab via the plugin API', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(plugin.hasDockPanelTab('demo')).toBe(false)
    expect(plugin.toggleDockPanelTab('demo')).toBe(false)

    expect(
      plugin.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(plugin.hasDockPanelTab('demo')).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)

    expect(plugin.toggleDockPanelTab('demo')).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(false)

    expect(plugin.toggleDockPanelTab('demo')).toBe(true)
    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(
      host
        .querySelector('.ml-ex-ui-dock-tab[data-tab-id="demo"]')
        ?.classList.contains('is-active')
    ).toBe(true)
  })

  it('setDockPanelOpen(true) preserves the active tab when reopening', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    const getActiveTabId = () =>
      (
        plugin as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(
      plugin.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    expect(plugin.setDockPanelOpen(false)).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(getActiveTabId()).toBe('demo')
  })

  it('controls viewer toolbar placement and visibility', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select'), acuiToolbarPreset('layer')],
        collapsible: true
      }
    })

    expect(plugin.getToolbarPlacement()).toBe('right')
    expect(plugin.isToolbarVisible()).toBe(true)

    expect(plugin.setToolbarPlacement('top')).toBe(true)
    expect(plugin.getToolbarPlacement()).toBe('top')

    expect(plugin.setToolbarVisible(false)).toBe(true)
    expect(plugin.isToolbarVisible()).toBe(false)
    expect(plugin.setToolbarVisible(true)).toBe(true)

    expect(plugin.setToolbarCollapsed(true)).toBe(true)
    expect(plugin.isToolbarCollapsed()).toBe(true)

    expect(plugin.setToolbarEdgeOffset(16)).toBe(true)
    expect(plugin.getToolbarEdgeOffset()).toBe(16)

    expect(plugin.getToolbarOverflow()).toBe('menu')
    expect(plugin.setToolbarOverflow('scroll')).toBe(true)
    expect(plugin.getToolbarOverflow()).toBe('scroll')
  })

  it('setToolbarItems dynamically adds the layer command when a layer button appears', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:layer')).toBe(false)

    plugin.setToolbarItems([acuiToolbarPreset('select'), acuiToolbarPreset('layer')])
    expect(mockCommands.has('SYSTEM:layer')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    plugin.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:layer')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('loads review UI in the dock panel and opens it from markuppanel', async () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('annotation')]
      }
    })

    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector('.ml-ex-ui-review-palette')).not.toBeNull()

    const getActiveTabId = () =>
      (
        plugin as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(plugin.isDockPanelOpen()).toBe(false)

    const cmd = mockCommands.get('SYSTEM:markuppanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(plugin.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('review')
    expect(host.querySelector('.ml-ex-ui-review-palette')).not.toBeNull()
  })

  it('setToolbarItems dynamically adds the markuppanel command', () => {
    const { host } = createHostTree()
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(false)

    plugin.setToolbarItems([
      acuiToolbarPreset('select'),
      acuiToolbarPreset('annotation')
    ])
    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    plugin.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('upgrades dock mount target from host fallback when the canvas parent becomes available', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mockCurView.container = undefined
    const { plugin } = loadPlugin({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector('.ml-ex-ui-dock-main')).toBeNull()

    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)
    mockCurView.container = canvas

    mockDocumentActivatedListeners.forEach(listener => {
      listener({ doc: { database: new AcDbDatabase() } } as never)
    })

    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    expect(plugin.setDockPanelOpen(true)).toBe(true)
    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector(':scope > .ml-ex-ui-dock-panel')).toBeNull()
  })
})
