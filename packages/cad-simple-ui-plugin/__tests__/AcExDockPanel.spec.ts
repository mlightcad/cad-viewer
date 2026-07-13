/** @jest-environment jsdom */

import { ML_UI_MOBILE_MEDIA_QUERY } from '@mlightcad/cad-simple-viewer'

import { AcExI18n, registerSimpleUiI18n } from '../src/i18n'
import { AcExDockPanel } from '../src/ui/AcExDockPanel'

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

jest.mock('@mlightcad/cad-simple-viewer', () => {
  const layout = jest.requireActual(
    '../../cad-simple-viewer/src/editor/global/AcEdUiLayout'
  ) as typeof import('../../cad-simple-viewer/src/editor/global/AcEdUiLayout')

  return {
    ...layout,
    isMobileUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_MOBILE_MEDIA_QUERY).matches ?? false,
    isCompactUiLayout: () =>
      window.matchMedia?.(layout.ML_UI_COMPACT_MEDIA_QUERY).matches ?? false,
    AcApI18n: {
      t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
      mergeLocaleMessage: jest.fn(),
      events: {
        localeChanged: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      },
      currentLocale: 'en'
    }
  }
})

function createPanel(
  options?: Partial<ConstructorParameters<typeof AcExDockPanel>[0]>
) {
  registerSimpleUiI18n()
  const host = document.createElement('div')
  document.body.appendChild(host)

  const panel = new AcExDockPanel({
    host,
    i18n: new AcExI18n(),
    defaultSide: 'left',
    defaultOpen: false,
    defaultHeight: 240,
    defaultWidth: 280,
    ...options
  })

  return { host, panel }
}

function createTabContent(label = 'content') {
  const content = document.createElement('div')
  content.textContent = label
  return content
}

describe('AcExDockPanel', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('addTab returns false for duplicate or invalid tabs', () => {
    const { panel } = createPanel()

    expect(
      panel.addTab({
        id: 'layers',
        label: 'Layers',
        content: createTabContent()
      })
    ).toBe(true)
    expect(
      panel.addTab({
        id: 'layers',
        label: 'Layers duplicate',
        content: createTabContent('dup')
      })
    ).toBe(false)
    expect(
      panel.addTab({
        id: 'invalid',
        content: createTabContent('invalid')
      })
    ).toBe(false)
    expect(panel.hasTab('layers')).toBe(true)
  })

  it('wires tab accessibility attributes', () => {
    const { host, panel } = createPanel()
    panel.addTab({
      id: 'inspect',
      label: 'Inspect',
      content: createTabContent()
    })

    const tabButton = host.querySelector(
      '#ml-ex-ui-dock-tab-inspect'
    ) as HTMLButtonElement
    const tabPanel = host.querySelector(
      '#ml-ex-ui-dock-tabpanel-inspect'
    ) as HTMLDivElement

    expect(tabButton.getAttribute('role')).toBe('tab')
    expect(tabButton.getAttribute('aria-controls')).toBe(
      'ml-ex-ui-dock-tabpanel-inspect'
    )
    expect(tabPanel.getAttribute('role')).toBe('tabpanel')
    expect(tabPanel.getAttribute('aria-labelledby')).toBe(
      'ml-ex-ui-dock-tab-inspect'
    )
  })

  it('opens, closes, and toggles the active tab', () => {
    const { panel } = createPanel()
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.addTab({
      id: 'props',
      label: 'Properties',
      content: createTabContent('props')
    })

    expect(panel.isOpen).toBe(false)
    panel.open('props')
    expect(panel.isOpen).toBe(true)
    expect(panel.activeTab).toBe('props')

    panel.toggle('props')
    expect(panel.isOpen).toBe(false)

    panel.toggle('layers')
    expect(panel.isOpen).toBe(true)
    expect(panel.activeTab).toBe('layers')
  })

  it('switches dock side and reparents within the host', () => {
    const { host, panel } = createPanel()
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.open('layers')

    panel.setSide('right')
    expect(
      (host.querySelector('.ml-ex-ui-dock-panel') as HTMLElement | null)
        ?.dataset.side
    ).toBe('right')

    panel.setSide('bottom')
    expect(
      (host.querySelector('.ml-ex-ui-dock-panel') as HTMLElement | null)
        ?.dataset.side
    ).toBe('bottom')
  })

  it('reparents to a new mount element', () => {
    const { host, panel } = createPanel()
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.open('layers')

    const nextHost = document.createElement('div')
    document.body.appendChild(nextHost)

    panel.reparentTo(nextHost)
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
    expect(nextHost.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(panel.isOpen).toBe(true)
  })

  it('removes tabs and reports hasTabs', () => {
    const { panel } = createPanel()
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })

    expect(panel.hasTabs).toBe(true)
    panel.removeTab('layers')
    expect(panel.hasTabs).toBe(false)
  })

  it('hides overflow tabs when the tab strip is narrower than tab buttons', async () => {
    const { host, panel } = createPanel({ defaultOpen: true })
    const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    )
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    )

    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        if (this.classList?.contains('ml-ex-ui-dock-tab')) {
          return 120
        }
        return 0
      }
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        if (this.classList?.contains('ml-ex-ui-dock-tabs-wrap')) {
          return 200
        }
        return 0
      }
    })

    panel.addTab({
      id: 'one',
      label: 'One',
      content: createTabContent('one')
    })
    panel.addTab({
      id: 'two',
      label: 'Two',
      content: createTabContent('two')
    })
    panel.addTab({
      id: 'three',
      label: 'Three',
      content: createTabContent('three')
    })
    panel.open('one')

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const overflowButton = host.querySelector(
      '.ml-ex-ui-dock-tab-overflow-btn'
    ) as HTMLButtonElement
    expect(overflowButton.hidden).toBe(false)

    if (offsetWidthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetWidth',
        offsetWidthDescriptor
      )
    }
    if (clientWidthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        clientWidthDescriptor
      )
    }
  })

  it('reparents from host fallback to canvas parent while staying connected', () => {
    const host = document.createElement('div')
    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)
    document.body.appendChild(host)

    registerSimpleUiI18n()
    const panel = new AcExDockPanel({
      host,
      i18n: new AcExI18n(),
      defaultSide: 'left',
      defaultOpen: false
    })

    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    panel.reparentTo(canvasParent)

    const dockPanel = canvasParent.querySelector('.ml-ex-ui-dock-panel')
    expect(dockPanel).not.toBeNull()
    expect(host.querySelector(':scope > .ml-ex-ui-dock-panel')).toBeNull()
  })

  it('reparents with tabs without disconnecting the panel root', () => {
    const host = document.createElement('div')
    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)
    document.body.appendChild(host)

    registerSimpleUiI18n()
    const panel = new AcExDockPanel({
      host,
      i18n: new AcExI18n(),
      defaultSide: 'left',
      defaultOpen: false
    })
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })

    panel.reparentTo(canvasParent)

    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector(':scope > .ml-ex-ui-dock-panel')).toBeNull()
  })

  it('reparents after the canvas parent is added later while open', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    registerSimpleUiI18n()
    const panel = new AcExDockPanel({
      host,
      i18n: new AcExI18n(),
      defaultSide: 'left',
      defaultOpen: false
    })
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.open('layers')

    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)

    panel.reparentTo(canvasParent)

    expect(panel.isOpen).toBe(true)
    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(
      canvasParent
        .querySelector('.ml-ex-ui-dock-panel')
        ?.getAttribute('data-open')
    ).toBe('true')
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
  })

  it('reparents after the canvas parent is added later', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    registerSimpleUiI18n()
    const panel = new AcExDockPanel({
      host,
      i18n: new AcExI18n(),
      defaultSide: 'left',
      defaultOpen: false
    })
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })

    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()

    const canvasParent = document.createElement('div')
    const canvas = document.createElement('div')
    canvasParent.appendChild(canvas)
    host.appendChild(canvasParent)

    panel.reparentTo(canvasParent)
    panel.open('layers')

    expect(canvasParent.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
  })

  it('cleans up DOM and listeners on destroy', () => {
    const { host, panel } = createPanel()
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.open('layers')

    panel.destroy()
    expect(host.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
    expect(host.querySelector('.ml-ex-ui-dock-main')).toBeNull()
  })

  it('uses full host width as max size for horizontal docks on mobile', () => {
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'matchMedia'
    )
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    )

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === ML_UI_MOBILE_MEDIA_QUERY,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        if (this.classList?.contains('ml-ex-ui-host-dock')) {
          return 390
        }
        return 0
      }
    })

    const { panel } = createPanel({ defaultSide: 'left' })
    panel.addTab({
      id: 'layers',
      label: 'Layers',
      content: createTabContent()
    })
    panel.open('layers')

    panel.setPanelSize(500)
    expect(panel.getSize()).toBe(390)

    if (matchMediaDescriptor) {
      Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
    }
    if (clientWidthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        clientWidthDescriptor
      )
    }
  })
})
