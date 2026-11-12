/** @jest-environment jsdom */

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

const mockCurView: { container?: HTMLElement } = {}

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
jest.mock('../../src/ui/AcUiSimpleUiStyles', () => ({
  acuiEnsureUiStyles: jest.fn(),
  acuiRemoveUiStylesIfUnused: jest.fn()
}))

jest.mock('../../src/command/AcApToolbarDocBind', () => {
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { mockToolbarDocBindModule } = require('./helpers/mockCadSimpleViewer')
  return mockToolbarDocBindModule(getChromeMockExtras().extras)
})
jest.mock('../../src/app', () => {
  const { mockAppModule } = require('./helpers/mockCadSimpleViewer')
  const { getChromeMockExtras } = require('./helpers/chromeMockExtras')
  const { extras } = getChromeMockExtras()
  Object.defineProperty(extras.AcApDocManager.instance, 'curDocument', {
    get: () => ({ openMode: 8 })
  })
  return mockAppModule(extras)
})


jest.mock('@mlightcad/data-model', () => {
  const { createDataModelMock } = require('./helpers/mockDataModel')
  return createDataModelMock()
})

import { AcEdCommandStack } from '../../src/editor'

import { acuiNormalizeSimpleUiOptions } from '../../src/ui/acuiNormalizeSimpleUiOptions'
import { AcApSimpleUiChrome } from '../../src/ui/AcApSimpleUiChrome'

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
    const normalized = acuiNormalizeSimpleUiOptions({
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

  it('creates toolbar when host is viewerPane like cad-simple-viewer-demo', () => {
    const { viewerPane, cadContainer, canvasArea } = createExampleDom()
    const plugin = new AcApSimpleUiChrome({
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
    plugin.start(new AcEdCommandStack())

    expect(document.querySelectorAll('.ml-ex-ui-toolbar').length).toBe(1)
    expect(viewerPane.querySelector('.ml-ex-ui-toolbar')).not.toBeNull()
    expect(
      viewerPane.querySelector('[data-toolbar-item-id="select"]')
    ).not.toBeNull()
    expect(plugin.getToolbarPlacement()).toBe('right')
    expect(plugin.isToolbarVisible()).toBe(true)
  })
})
