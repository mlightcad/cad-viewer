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

const mockCurView: { container?: HTMLElement } = {}

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
    AcApContext: class {},
    AcApDocManager: {
      instance: {
        get curView() {
          return mockCurView.container
            ? { container: mockCurView.container }
            : undefined
        },
        get curDocument() {
          return { openMode: 8 }
        },
        events: {
          documentActivated: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          },
          documentToBeOpened: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }
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
      addCommand() {}
      removeCmd() {}
    },
    AcEdOpenMode: { Read: 0, Write: 8 },
    acedApplyUiTheme: jest.fn(),
    isLightColorTheme: jest.fn(() => false),
    eventBus: { on: jest.fn(), off: jest.fn() },
    getMarkupStore: () => ({
      list: () => [],
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
  AcCmColor: { fromString: jest.fn(() => null) },
  AcDbDatabase: class {},
  AcDbSystemVariables: { COLORTHEME: 'COLORTHEME' },
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

import { AcEdCommandStack } from '@mlightcad/cad-simple-viewer'

import { acuiNormalizePluginOptions } from '../src/config/normalizePluginOptions'
import { AcApSimpleUiPlugin } from '../src/createSimpleUiPlugin'

function createExampleDom() {
  const viewerPane = document.createElement('main')
  viewerPane.id = 'viewerPane'
  const canvasArea = document.createElement('section')
  canvasArea.className = 'viewer-canvas-area'
  const cadContainer = document.createElement('div')
  cadContainer.id = 'cad-container'
  canvasArea.appendChild(cadContainer)
  viewerPane.appendChild(canvasArea)
  document.body.appendChild(viewerPane)

  Object.defineProperty(cadContainer, 'clientWidth', {
    configurable: true,
    value: 800
  })
  Object.defineProperty(cadContainer, 'clientHeight', {
    configurable: true,
    value: 600
  })
  mockCurView.container = cadContainer

  return { viewerPane, cadContainer, canvasArea }
}

describe('example-like toolbar mount', () => {
  afterEach(() => {
    document.body.replaceChildren()
    mockCurView.container = undefined
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('normalizes example toolbar.enabled to true', () => {
    const normalized = acuiNormalizePluginOptions({
      host: document.createElement('main'),
      dockPanel: {
        defaultOpen: false,
        defaultHeight: 240,
        defaultWidth: 280
      },
      toolbar: {
        placement: 'right',
        items: 'default',
        appendItems: [{ id: 'agent', command: 'agent' }],
        appendItemsAfter: 'layout',
        collapsible: true
      }
    })
    expect(normalized.toolbar.enabled).toBe(true)
  })

  it('creates toolbar when host is viewerPane like cad-simple-viewer-example', () => {
    const { viewerPane, cadContainer, canvasArea } = createExampleDom()
    const plugin = new AcApSimpleUiPlugin({
      host: viewerPane,
      dockPanel: {
        defaultOpen: false,
        defaultHeight: 240,
        defaultWidth: 280
      },
      toolbar: {
        placement: 'right',
        items: 'default',
        appendItems: [{ id: 'agent', command: 'agent' }],
        appendItemsAfter: 'layout',
        collapsible: true
      }
    })
    plugin.onLoad({} as never, new AcEdCommandStack())

    expect(document.querySelectorAll('.ml-ex-ui-toolbar').length).toBe(1)
    expect(canvasArea.querySelector('.ml-ex-ui-toolbar')).not.toBeNull()
    expect(
      canvasArea.querySelector('[data-toolbar-item-id="select"]')
    ).not.toBeNull()
    expect(plugin.getToolbarPlacement()).toBe('right')
    expect(plugin.isToolbarVisible()).toBe(true)
  })
})
