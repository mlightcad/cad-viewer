/** @jest-environment jsdom */

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

const mockDocumentActivatedListeners = new Set<(args?: unknown) => void>()

jest.mock('../../src/app/dataSource/acapBuildDataSourceMenu', () => {
  const { mockDataSourceMenuModules } = require('./helpers/mockDataSourceMenu')
  const m = mockDataSourceMenuModules()
  return {
    acapBuildDataSourceMenu: m.acapBuildDataSourceMenu,
    acapIsSingleLocalOpen: m.acapIsSingleLocalOpen
  }
})
jest.mock('../../src/app/dataSource/acapRunDataSourceMenuAction', () => {
  const { mockDataSourceMenuModules } = require('./helpers/mockDataSourceMenu')
  return {
    acapRunDataSourceMenuAction: mockDataSourceMenuModules().acapRunDataSourceMenuAction
  }
})

jest.mock('../../src/app', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockAppModule } = require('./helpers/mockCadSimpleViewer')
  const { extras } = getChromeMockExtras()
  extras.AcApDocManager.instance.events.documentActivated.addEventListener = (
    listener: (args?: unknown) => void
  ) => {
    mockDocumentActivatedListeners.add(listener)
  }
  extras.AcApDocManager.instance.events.documentActivated.removeEventListener = (
    listener: (args?: unknown) => void
  ) => {
    mockDocumentActivatedListeners.delete(listener)
  }
  return mockAppModule(extras)
})
jest.mock('../../src/editor', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockEditorModule } = require('./helpers/mockCadSimpleViewer')
  const layout = jest.requireActual(
    '../../src/editor/global/AcEdUiLayout'
  ) as typeof import('../../src/editor/global/AcEdUiLayout')
  const { extras } = getChromeMockExtras()
  return mockEditorModule({
    ...extras,
    acedIsMobileUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_MOBILE_MEDIA_QUERY).matches ?? false,
    acedIsCompactUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_COMPACT_MEDIA_QUERY).matches ?? false
  })
})
jest.mock('../../src/command', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockCommandModule } = require('./helpers/mockCadSimpleViewer')
  return mockCommandModule(getChromeMockExtras().extras)
})
jest.mock('../../src/i18n', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockI18nModule } = require('./helpers/mockCadSimpleViewer')
  return mockI18nModule(getChromeMockExtras().extras)
})
jest.mock('../../src/command/AcApToolbarDocBind', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockToolbarDocBindModule } = require('./helpers/mockCadSimpleViewer')
  return mockToolbarDocBindModule(getChromeMockExtras().extras)
})

jest.mock('../../src/ui/AcUiSimpleUiStyles', () => ({
  acuiEnsureUiStyles: jest.fn(),
  acuiRemoveUiStylesIfUnused: jest.fn()
}))

jest.mock('@mlightcad/data-model', () => {
  const { createDataModelMock } = require('./helpers/mockDataModel')
  return createDataModelMock()
})

import { AcApDocManager } from '../../src/app'
import { AcEdCommandStack } from '../../src/editor'
import { AcDbDatabase } from '@mlightcad/data-model'

import { mockCommands, mockCurView } from './helpers/chromeMockExtras'
import { AcApSimpleUiChrome } from '../../src/ui/AcApSimpleUiChrome'
import { acuiToolbarPreset } from '../../src/ui/toolbar/toolbarItemUtils'

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

function loadChrome(
  options: ConstructorParameters<typeof AcApSimpleUiChrome>[0] = {}
) {
  AcApDocManager.instance.sendStringToExecute = jest.fn(executeMockCommand)
  const commandManager = new AcEdCommandStack()
  const chrome = new AcApSimpleUiChrome(options)
  chrome.start(commandManager)
  return { chrome, commandManager }
}

describe('AcApSimpleUiChrome', () => {
  afterEach(() => {
    document.body.replaceChildren()
    mockCommands.clear()
    mockCurView.container = undefined
    mockDocumentActivatedListeners.clear()
    void new AcDbDatabase()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('loads layer UI in the dock panel on startup', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select'), acuiToolbarPreset('layer')]
      }
    })

    expect(mockCommands.has('SYSTEM:layer')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-layer-manager')).toBeNull()
    expect(
      (chrome as unknown as { dockPanel?: unknown }).dockPanel
    ).toBeDefined()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
  })

  it('controls dock panel open state and size', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      dockPanel: { enabled: true },
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(chrome.isDockPanelOpen()).toBe(false)
    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(chrome.getDockPanelSide()).toBe('left')
    expect(chrome.getDockPanelSize()).toBe(280)

    expect(chrome.setDockPanelSize(120)).toBe(true)
    expect(chrome.getDockPanelSize()).toBe(120)

    expect(chrome.setDockPanelOpen(false)).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(false)
  })

  it('opens the dock panel without clicking the layer button first', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mockCurView.container = undefined
    const { chrome } = loadChrome({
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

    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)

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
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    const getActiveTabId = () =>
      (
        chrome as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(chrome.isDockPanelOpen()).toBe(false)

    const layerButton = host.querySelector(
      '[data-toolbar-item-id="layer"]'
    ) as HTMLButtonElement
    layerButton.click()
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('layers')

    expect(
      chrome.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    layerButton.click()
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('layers')
  })

  it('opens an existing dock shell that was never opened before', () => {
    const { host, canvasParent } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    mockDocumentActivatedListeners.forEach(listener => {
      listener({ doc: { database: new AcDbDatabase() } } as never)
    })

    expect(chrome.isDockPanelOpen()).toBe(false)
    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(
      canvasParent
        .querySelector('.ml-ex-ui-dock-panel')
        ?.getAttribute('data-open')
    ).toBe('true')
  })

  it('addDockPanelTab keeps the dock open when it was already open', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(
      chrome.addDockPanelTab({
        id: 'demo-1',
        label: 'Demo 1',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(
      host.querySelector('.ml-ex-ui-dock-panel')?.getAttribute('data-open')
    ).toBe('true')
  })

  it('addDockPanelTab accumulates multiple custom tabs', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(
      chrome.addDockPanelTab({
        id: 'demo-1',
        label: 'Demo 1',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(
      chrome.addDockPanelTab({
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
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    expect(chrome.hasDockPanelTab('demo')).toBe(false)
    expect(chrome.toggleDockPanelTab('demo')).toBe(false)

    expect(
      chrome.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(chrome.hasDockPanelTab('demo')).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)

    expect(chrome.toggleDockPanelTab('demo')).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(false)

    expect(chrome.toggleDockPanelTab('demo')).toBe(true)
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(
      host
        .querySelector('.ml-ex-ui-dock-tab[data-tab-id="demo"]')
        ?.classList.contains('is-active')
    ).toBe(true)
  })

  it('setDockPanelOpen(true) preserves the active tab when reopening', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      }
    })

    const getActiveTabId = () =>
      (
        chrome as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(
      chrome.addDockPanelTab({
        id: 'demo',
        label: 'Demo',
        content: document.createElement('div')
      })
    ).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    expect(chrome.setDockPanelOpen(false)).toBe(true)
    expect(getActiveTabId()).toBe('demo')

    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(getActiveTabId()).toBe('demo')
  })

  it('controls viewer toolbar placement and visibility', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select'), acuiToolbarPreset('layer')],
        collapsible: true
      }
    })

    expect(chrome.getToolbarPlacement()).toBe('right')
    expect(chrome.isToolbarVisible()).toBe(true)

    expect(chrome.setToolbarPlacement('top')).toBe(true)
    expect(chrome.getToolbarPlacement()).toBe('top')

    expect(chrome.setToolbarVisible(false)).toBe(true)
    expect(chrome.isToolbarVisible()).toBe(false)
    expect(chrome.setToolbarVisible(true)).toBe(true)

    expect(chrome.setToolbarCollapsed(true)).toBe(true)
    expect(chrome.isToolbarCollapsed()).toBe(true)

    expect(chrome.setToolbarEdgeOffset(16)).toBe(true)
    expect(chrome.getToolbarEdgeOffset()).toBe(16)
  })

  it('setToolbarItems dynamically adds the layer command when a layer button appears', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:layer')).toBe(false)

    chrome.setToolbarItems([
      acuiToolbarPreset('select'),
      acuiToolbarPreset('layer')
    ])
    expect(mockCommands.has('SYSTEM:layer')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    chrome.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:layer')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('loads review UI in the dock panel and opens it from markuppanel', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
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
        chrome as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(chrome.isDockPanelOpen()).toBe(false)

    const cmd = mockCommands.get('SYSTEM:markuppanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('review')
    expect(host.querySelector('.ml-ex-ui-review-palette')).not.toBeNull()
  })

  it('setToolbarItems dynamically adds the markuppanel command', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(false)

    chrome.setToolbarItems([
      acuiToolbarPreset('select'),
      acuiToolbarPreset('annotation')
    ])
    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    chrome.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:markuppanel')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('loads measurement UI in the dock panel and opens it from measurementpanel', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('measure')]
      }
    })

    expect(mockCommands.has('SYSTEM:measurementpanel')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector('.ml-ex-ui-measure-palette')).not.toBeNull()

    const getActiveTabId = () =>
      (
        chrome as unknown as {
          dockPanel?: { activeTab?: string }
        }
      ).dockPanel?.activeTab

    expect(chrome.isDockPanelOpen()).toBe(false)

    const cmd = mockCommands.get('SYSTEM:measurementpanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(getActiveTabId()).toBe('measurements')
    expect(host.querySelector('.ml-ex-ui-measure-palette')).not.toBeNull()
  })

  it('loads find UI in the dock panel and opens it from the find command', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('find')]
      }
    })

    expect(mockCommands.has('SYSTEM:find')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-find-palette')).not.toBeNull()
    expect(chrome.isDockPanelOpen()).toBe(false)

    const cmd = mockCommands.get('SYSTEM:find') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(
      (chrome as unknown as { dockPanel?: { activeTab?: string } }).dockPanel
        ?.activeTab
    ).toBe('find')
    expect(
      document.activeElement?.classList.contains('ml-ex-ui-find-input')
    ).toBe(true)
  })

  it('setToolbarItems dynamically adds and removes the find command', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:find')).toBe(false)

    chrome.setToolbarItems([
      acuiToolbarPreset('select'),
      acuiToolbarPreset('find')
    ])
    expect(mockCommands.has('SYSTEM:find')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-find-palette')).not.toBeNull()

    chrome.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:find')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-find-palette')).toBeNull()
  })

  it('setToolbarItems dynamically adds the measurementpanel command', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(mockCommands.has('SYSTEM:measurementpanel')).toBe(false)

    chrome.setToolbarItems([
      acuiToolbarPreset('select'),
      acuiToolbarPreset('measure')
    ])
    expect(mockCommands.has('SYSTEM:measurementpanel')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    chrome.setToolbarItems([acuiToolbarPreset('select')])
    expect(mockCommands.has('SYSTEM:measurementpanel')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('closes open sub-toolbars when replaceOnNested is true and a dock panel opens', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default',
        subToolbar: { replaceOnNested: true }
      }
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).not.toBeNull()

    const cmd = mockCommands.get('SYSTEM:measurementpanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()
  })

  it('keeps open sub-toolbars when replaceOnNested is false and a dock panel opens', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default',
        subToolbar: { replaceOnNested: false }
      }
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).not.toBeNull()

    const cmd = mockCommands.get('SYSTEM:measurementpanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})

    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).not.toBeNull()
  })

  it('closes the dock panel when replaceOnNested is true and a sub-toolbar opens', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default',
        subToolbar: { replaceOnNested: true }
      }
    })

    const cmd = mockCommands.get('SYSTEM:measurementpanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})
    expect(chrome.isDockPanelOpen()).toBe(true)

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    expect(chrome.isDockPanelOpen()).toBe(false)
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).not.toBeNull()
  })

  it('keeps the dock panel open when replaceOnNested is false and a sub-toolbar opens', async () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default',
        subToolbar: { replaceOnNested: false }
      }
    })

    const cmd = mockCommands.get('SYSTEM:measurementpanel') as {
      execute: (context: unknown) => Promise<void>
    }
    await cmd.execute({})
    expect(chrome.isDockPanelOpen()).toBe(true)

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    expect(chrome.isDockPanelOpen()).toBe(true)
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).not.toBeNull()
  })

  it('switches to phone default items when layout is phone and items were not overridden', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default',
        appendItems: [{ id: 'agent', command: 'agent' }],
        appendItemsAfter: 'layout'
      }
    })

    expect(host.querySelector('[data-toolbar-item-id="select"]')).not.toBeNull()
    expect(chrome.setLayout('phone')).toBe(true)
    expect(chrome.getLayout()).toBe('phone')
    expect(chrome.getToolbarPlacement()).toBe('bottom')
    expect(host.querySelector('[data-toolbar-item-id="zoom"]')).not.toBeNull()
    expect(host.querySelector('[data-toolbar-item-id="select"]')).toBeNull()
    expect(host.querySelector('[data-toolbar-item-id="agent"]')).toBeNull()
  })

  it('keeps setToolbarItems across layout switches while still applying phone chrome', () => {
    const { host } = createHostTree()
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: 'default'
      }
    })

    chrome.setToolbarItems([
      { id: 'custom', label: 'Custom', command: 'custom' }
    ])
    expect(host.querySelector('[data-toolbar-item-id="custom"]')).not.toBeNull()

    expect(chrome.setLayout('phone')).toBe(true)
    expect(chrome.getLayout()).toBe('phone')
    expect(chrome.getToolbarPlacement()).toBe('bottom')
    expect(chrome.getToolbarItems()).toEqual([
      { id: 'custom', label: 'Custom', command: 'custom' }
    ])
    expect(host.querySelector('[data-toolbar-item-id="custom"]')).not.toBeNull()
    expect(host.querySelector('[data-toolbar-item-id="zoom"]')).toBeNull()
  })

  it('upgrades dock mount target from host fallback when the canvas parent becomes available', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mockCurView.container = undefined
    const { chrome } = loadChrome({
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

    expect(chrome.setDockPanelOpen(true)).toBe(true)
    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector(':scope > .ml-ex-ui-dock-panel')).toBeNull()
  })

  it('upgrades toolbar mount from host fallback to canvas parent when the view appears', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mockCurView.container = undefined
    const { chrome } = loadChrome({
      host,
      toolbar: {
        items: [acuiToolbarPreset('select')]
      }
    })

    expect(host.querySelector(':scope > .ml-ex-ui-toolbar')).not.toBeNull()
    expect(chrome.isToolbarVisible()).toBe(true)

    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)
    mockCurView.container = canvas

    mockDocumentActivatedListeners.forEach(listener => {
      listener({ doc: { database: new AcDbDatabase() } } as never)
    })

    expect(canvasParent.querySelector('.ml-ex-ui-toolbar')).not.toBeNull()
    expect(host.querySelector(':scope > .ml-ex-ui-toolbar')).toBeNull()
  })

  it('places an in-canvas-parent toolbar as a sibling of the canvas slot', () => {
    const { host, canvasParent, canvas } = createHostTree()
    loadChrome({
      host,
      layout: 'phone',
      toolbar: {
        inCanvasParent: true
      },
      layouts: {
        phone: {
          toolbar: {
            items: [acuiToolbarPreset('select')],
            inCanvasParent: true
          }
        }
      }
    })

    const toolbar = canvasParent.querySelector('.ml-ex-ui-toolbar')
    const main = canvasParent.querySelector('.ml-ex-ui-toolbar-main')
    expect(toolbar).not.toBeNull()
    expect(main).not.toBeNull()
    expect(main?.contains(canvas)).toBe(true)
    expect(toolbar?.classList.contains('is-in-parent')).toBe(true)
    expect(toolbar?.classList.contains('is-bottom')).toBe(true)
    expect(
      canvasParent.classList.contains('ml-ex-ui-toolbar-in-parent-bottom')
    ).toBe(true)
  })

  it('keeps an in-canvas-parent toolbar inside dock-main on the canvas parent', () => {
    const { host, canvasParent, canvas } = createHostTree()
    loadChrome({
      host,
      layout: 'phone',
      toolbar: {
        items: [acuiToolbarPreset('layer')],
        inCanvasParent: true
      }
    })

    const dockMain = canvasParent.querySelector('.ml-ex-ui-dock-main')
    expect(dockMain).not.toBeNull()
    expect(
      dockMain?.querySelector('.ml-ex-ui-toolbar-main')?.contains(canvas)
    ).toBe(true)
    expect(dockMain?.querySelector('.ml-ex-ui-toolbar')).not.toBeNull()
    expect(canvasParent.querySelector(':scope > .ml-ex-ui-toolbar')).toBeNull()
    expect(
      canvasParent.querySelector(':scope > .ml-ex-ui-dock-panel')
    ).not.toBeNull()
  })

  it('restores overlay chrome when leaving phone in-canvas-parent layout', () => {
    const { host, canvasParent, canvas } = createHostTree()
    const { chrome } = loadChrome({
      host,
      layout: 'phone',
      layouts: {
        phone: {
          toolbar: {
            items: [acuiToolbarPreset('select')],
            inCanvasParent: true
          }
        }
      }
    })

    expect(
      canvasParent.querySelector('.ml-ex-ui-toolbar-main')?.contains(canvas)
    ).toBe(true)

    expect(chrome.setLayout('desktop')).toBe(true)

    const toolbar = canvasParent.querySelector('.ml-ex-ui-toolbar')
    expect(toolbar).not.toBeNull()
    expect(toolbar?.isConnected).toBe(true)
    expect(toolbar?.classList.contains('is-in-parent')).toBe(false)
    expect(toolbar?.classList.contains('is-right')).toBe(true)
    expect(canvasParent.querySelector('.ml-ex-ui-toolbar-main')).toBeNull()
    expect(canvasParent.contains(canvas)).toBe(true)
  })

  it('restores overlay chrome inside dock-main after leaving in-canvas-parent', () => {
    const { host, canvasParent, canvas } = createHostTree()
    const { chrome } = loadChrome({
      host,
      layout: 'phone',
      toolbar: {
        items: [acuiToolbarPreset('layer')]
      },
      layouts: {
        phone: {
          toolbar: {
            inCanvasParent: true
          }
        }
      }
    })

    expect(
      canvasParent
        .querySelector('.ml-ex-ui-dock-main .ml-ex-ui-toolbar-main')
        ?.contains(canvas)
    ).toBe(true)

    expect(chrome.setLayout('desktop')).toBe(true)

    const dockMain = canvasParent.querySelector('.ml-ex-ui-dock-main')
    const toolbar = dockMain?.querySelector('.ml-ex-ui-toolbar')
    expect(toolbar).not.toBeNull()
    expect(toolbar?.classList.contains('is-in-parent')).toBe(false)
    expect(dockMain?.querySelector('.ml-ex-ui-toolbar-main')).toBeNull()
    expect(dockMain?.contains(canvas)).toBe(true)
    expect(
      canvasParent.querySelector(':scope > .ml-ex-ui-dock-panel')
    ).not.toBeNull()
  })

  it('dispose tears down DOM, commands, palette host, and listeners', () => {
    const { host } = createHostTree()
    const { chrome, commandManager } = loadChrome({
      host,
      toolbar: {
        items: [
          acuiToolbarPreset('select'),
          acuiToolbarPreset('layer'),
          acuiToolbarPreset('find')
        ]
      }
    })

    expect(mockCommands.has('SYSTEM:layer')).toBe(true)
    expect(host.querySelector('.ml-ex-ui-toolbar')).not.toBeNull()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(mockDocumentActivatedListeners.size).toBeGreaterThan(0)

    const { AcApPaletteService } = jest.requireMock('../../src/app') as {
      AcApPaletteService: { setHost: jest.Mock }
    }
    const { AcApI18n } = jest.requireMock('../../src/i18n') as {
      AcApI18n: {
        events: { localeChanged: { removeEventListener: jest.Mock } }
      }
    }
    const removeUiStyles = jest.requireMock('../../src/ui/AcUiSimpleUiStyles')
      .acuiRemoveUiStylesIfUnused as jest.Mock

    chrome.dispose(commandManager)

    expect(mockCommands.has('SYSTEM:layer')).toBe(false)
    expect(mockCommands.has('SYSTEM:find')).toBe(false)
    expect(host.querySelector('.ml-ex-ui-toolbar')).toBeNull()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
    expect(mockDocumentActivatedListeners.size).toBe(0)
    expect(AcApPaletteService.setHost).toHaveBeenCalledWith(undefined)
    expect(AcApI18n.events.localeChanged.removeEventListener).toHaveBeenCalled()
    expect(removeUiStyles).toHaveBeenCalled()
  })
})
