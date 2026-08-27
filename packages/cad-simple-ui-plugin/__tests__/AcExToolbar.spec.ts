/** @jest-environment jsdom */

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
    AcApDocManager: {
      instance: {
        curDocument: { openMode: 8 },
        events: {
          documentActivated: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          },
          documentToBeOpened: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }
        }
      }
    },
    AcEdOpenMode: {
      Read: 0,
      Review: 4,
      Write: 8
    },
    AcApI18n: {
      t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key
    }
  }
})

jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: jest.fn()
    }
  })
}))

import type {
  AcExToolbarItem,
  AcExToolbarOverflow,
  AcExToolbarPlacement
} from '../src/config/types'
import { AcExI18n } from '../src/i18n'
import { AcExToolbar } from '../src/ui/AcExToolbar'

function createToolbar(
  items: AcExToolbarItem[],
  options?: {
    placement?: AcExToolbarPlacement
    overflow?: AcExToolbarOverflow
    hostWidth?: number
    hostHeight?: number
    edgeOffset?: number
    onRender?: () => void
  }
) {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', {
    value: options?.hostWidth ?? 800
  })
  Object.defineProperty(host, 'clientHeight', {
    value: options?.hostHeight ?? 600
  })
  document.body.appendChild(host)
  const onCommand = jest.fn()
  const toolbar = new AcExToolbar({
    host,
    placement: options?.placement ?? 'right',
    overflow: options?.overflow,
    edgeOffset: options?.edgeOffset,
    items,
    i18n: new AcExI18n(),
    onCommand,
    onRender: options?.onRender,
    docBridge: {
      hasDocument: () => true,
      getOpenMode: () => 8,
      subscribeActivated: listener => {
        listener()
      },
      unsubscribeActivated: () => {},
      subscribeToBeOpened: () => {},
      unsubscribeToBeOpened: () => {}
    }
  })
  return { host, toolbar, onCommand }
}

function flushLayout() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve())
  })
}

function mockToolbarSizes(buttonSize = 40) {
  const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetWidth'
  )
  const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  )
  const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollWidth'
  )
  const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight'
  )

  const contentMainSize = (el: HTMLElement) =>
    el.querySelectorAll('.ml-ex-ui-toolbar-btn').length * buttonSize

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      if (this.classList?.contains('ml-ex-ui-subtoolbar')) {
        if (this.style.width) return Number.parseFloat(this.style.width)
        return contentMainSize(this)
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-btn')) {
        return buttonSize
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-separator')) {
        return 1
      }
      return 0
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      if (this.classList?.contains('ml-ex-ui-subtoolbar')) {
        if (this.style.height) return Number.parseFloat(this.style.height)
        return contentMainSize(this)
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-btn')) {
        return buttonSize
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-separator')) {
        return 1
      }
      return 0
    }
  })
  // Natural content size (used before constraining width/height for wrap).
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      if (this.classList?.contains('ml-ex-ui-subtoolbar')) {
        return contentMainSize(this)
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-btn')) {
        return buttonSize
      }
      return 0
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.classList?.contains('ml-ex-ui-subtoolbar')) {
        return contentMainSize(this)
      }
      if (this.classList?.contains('ml-ex-ui-toolbar-btn')) {
        return buttonSize
      }
      return 0
    }
  })

  return () => {
    if (offsetWidthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetWidth',
        offsetWidthDescriptor
      )
    }
    if (offsetHeightDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetHeight',
        offsetHeightDescriptor
      )
    }
    if (scrollWidthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollWidth',
        scrollWidthDescriptor
      )
    }
    if (scrollHeightDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollHeight',
        scrollHeightDescriptor
      )
    }
  }
}

describe('AcExToolbar children UI', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('opens a sticky sub-toolbar that stays open on canvas click', () => {
    const { host, toolbar, onCommand } = createToolbar([
      {
        id: 'measure',
        label: 'toolbar.measure',
        childrenUi: 'sticky-toolbar',
        children: [
          {
            id: 'measure-distance',
            label: 'Distance',
            command: 'measuredistance'
          }
        ]
      }
    ])

    const parent = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="measure"]'
    )
    expect(parent).toBeTruthy()
    parent?.click()

    const strip = host.querySelector('.ml-ex-ui-subtoolbar')
    expect(strip).toBeTruthy()
    expect(parent?.classList.contains('is-open')).toBe(true)
    expect(document.querySelector('.ml-ex-ui-dropdown')).toBeNull()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeTruthy()

    host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="measure-distance"]'
    )?.click()
    expect(onCommand).toHaveBeenCalledWith('measuredistance')
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeTruthy()

    parent?.click()
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()
    toolbar.destroy()
  })

  it('closes a dismissible sub-toolbar on canvas click', () => {
    const { host, toolbar, onCommand } = createToolbar([
      {
        id: 'export',
        label: 'toolbar.export',
        childrenUi: 'toolbar',
        children: [{ id: 'export-pdf', label: 'PDF', command: 'cpdf' }]
      }
    ])

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="export"]')
      ?.click()
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeTruthy()
    expect(document.querySelector('.ml-ex-ui-dropdown')).toBeNull()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="export"]')
      ?.click()
    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="export-pdf"]')
      ?.click()
    expect(onCommand).toHaveBeenCalledWith('cpdf')
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()
    toolbar.destroy()
  })

  it('keeps popover menus for childrenUi menu', () => {
    const { host, toolbar } = createToolbar([
      {
        id: 'draw',
        label: 'Draw',
        children: [{ id: 'line', label: 'Line', command: 'line' }]
      }
    ])

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="draw"]')
      ?.click()
    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()
    expect(document.querySelector('.ml-ex-ui-dropdown')).toBeTruthy()
    toolbar.destroy()
  })

  it('opens a popover menu for live children getters', () => {
    const onSelect = jest.fn()
    const item: AcExToolbarItem = {
      id: 'layout',
      label: 'Layout',
      childrenUi: 'menu',
      children: []
    }
    Object.defineProperty(item, 'children', {
      configurable: true,
      enumerable: true,
      get: () => [
        { id: 'layout-model', label: 'Model', action: onSelect },
        { id: 'layout-1', label: 'Layout1', action: onSelect }
      ]
    })

    const { host, toolbar } = createToolbar([item])
    const parent = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="layout"]'
    )
    expect(parent?.classList.contains('has-children')).toBe(true)
    parent?.click()

    expect(host.querySelector('.ml-ex-ui-subtoolbar')).toBeNull()
    const menu = document.querySelector('.ml-ex-ui-dropdown')
    expect(menu).toBeTruthy()
    expect(menu?.textContent).toContain('Model')
    expect(menu?.textContent).toContain('Layout1')

    menu
      ?.querySelectorAll('button')[1]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.ml-ex-ui-dropdown')).toBeNull()
    toolbar.destroy()
  })
})

function manyButtons(count: number): AcExToolbarItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `tool-${index}`,
    label: `Tool ${index}`,
    command: `cmd-${index}`
  }))
}

describe('AcExToolbar overflow and edge offset', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('applies edgeOffset to the docked edge', async () => {
    const { host, toolbar } = createToolbar(manyButtons(2), {
      placement: 'bottom',
      edgeOffset: 20
    })
    await flushLayout()
    const root = host.querySelector('.ml-ex-ui-toolbar') as HTMLElement
    expect(root.style.bottom).toBe('20px')
    expect(toolbar.getEdgeOffset()).toBe(20)
    toolbar.destroy()
  })

  it('hides overflowing items behind a more button in menu mode', async () => {
    const restoreSizes = mockToolbarSizes(40)
    const { host, toolbar, onCommand } = createToolbar(manyButtons(8), {
      placement: 'top',
      overflow: 'menu',
      hostWidth: 200,
      hostHeight: 400
    })
    await flushLayout()

    const overflowButton = host.querySelector<HTMLButtonElement>(
      '.ml-ex-ui-toolbar-overflow-btn'
    )
    expect(overflowButton?.hidden).toBe(false)

    const hiddenButtons = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '.ml-ex-ui-toolbar-items .ml-ex-ui-toolbar-btn'
      )
    ].filter(button => button.hidden)
    expect(hiddenButtons.length).toBeGreaterThan(0)
    expect(
      hiddenButtons.every(button =>
        button.classList.contains('is-overflowed')
      )
    ).toBe(true)

    overflowButton?.click()
    const menu = document.querySelector('.ml-ex-ui-dropdown')
    expect(menu).toBeTruthy()

    const overflowedId = hiddenButtons[0].dataset.toolbarItemId
    menu
      ?.querySelector(`[data-toolbar-item-id="${overflowedId}"]`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCommand).toHaveBeenCalledWith(
      overflowedId?.replace('tool-', 'cmd-')
    )

    const root = host.querySelector('.ml-ex-ui-toolbar') as HTMLElement
    expect(root.classList.contains('is-overflow-flush-x')).toBe(true)
    expect(root.style.left).toBe('0px')
    expect(root.style.width).toBe('200px')
    expect(root.style.top).toBe('8px')

    toolbar.destroy()
    restoreSizes()
  })

  it('flushes a vertical toolbar to the host top and bottom when overflow is shown', async () => {
    const restoreSizes = mockToolbarSizes(40)
    const { host, toolbar } = createToolbar(manyButtons(8), {
      placement: 'right',
      overflow: 'menu',
      hostWidth: 400,
      hostHeight: 200,
      edgeOffset: 16
    })
    await flushLayout()

    const root = host.querySelector('.ml-ex-ui-toolbar') as HTMLElement
    const overflowButton = host.querySelector<HTMLButtonElement>(
      '.ml-ex-ui-toolbar-overflow-btn'
    )
    expect(overflowButton?.hidden).toBe(false)
    expect(root.classList.contains('is-overflow-flush-y')).toBe(true)
    expect(root.style.top).toBe('0px')
    expect(root.style.height).toBe('200px')
    expect(root.style.right).toBe('16px')

    toolbar.destroy()
    restoreSizes()
  })

  it('keeps all items visible and scrollable in scroll mode', async () => {
    const restoreSizes = mockToolbarSizes(40)
    const { host, toolbar } = createToolbar(manyButtons(8), {
      placement: 'top',
      overflow: 'scroll',
      hostWidth: 200,
      hostHeight: 400
    })
    await flushLayout()

    const root = host.querySelector('.ml-ex-ui-toolbar') as HTMLElement
    const items = host.querySelector('.ml-ex-ui-toolbar-items') as HTMLElement
    const overflowButton = host.querySelector<HTMLButtonElement>(
      '.ml-ex-ui-toolbar-overflow-btn'
    )
    expect(root.classList.contains('is-scroll')).toBe(true)
    expect(root.classList.contains('is-overflow-flush-x')).toBe(false)
    expect(items.classList.contains('is-scroll')).toBe(true)
    expect(overflowButton?.hidden).toBe(true)
    expect(
      [
        ...host.querySelectorAll<HTMLButtonElement>(
          '.ml-ex-ui-toolbar-items .ml-ex-ui-toolbar-btn'
        )
      ].every(button => !button.hidden)
    ).toBe(true)

    toolbar.setOverflow('menu')
    await flushLayout()
    expect(root.classList.contains('is-scroll')).toBe(false)
    expect(overflowButton?.hidden).toBe(false)

    toolbar.destroy()
    restoreSizes()
  })
})

describe('AcExSubToolbar mobile full width', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('stretches a top sub-toolbar to the host width on a phone', async () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: String(query).includes('600'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false
        },
        onchange: null
      }) as MediaQueryList) as typeof window.matchMedia

    const restoreSizes = mockToolbarSizes(32)
    const { host, toolbar } = createToolbar(
      [
        {
          id: 'measure',
          label: 'toolbar.measure',
          childrenUi: 'sticky-toolbar',
          children: [
            { id: 'a', label: 'A', command: 'a' },
            { id: 'b', label: 'B', command: 'b' }
          ]
        }
      ],
      { placement: 'bottom', hostWidth: 360, hostHeight: 640, edgeOffset: 8 }
    )

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    await flushLayout()

    const strip = host.querySelector('.ml-ex-ui-subtoolbar') as HTMLElement
    expect(strip.classList.contains('is-mobile-fullwidth')).toBe(true)
    expect(strip.classList.contains('is-evenly')).toBe(true)
    expect(strip.style.width).toBe('344px')

    toolbar.destroy()
    restoreSizes()
  })

  it('wraps child buttons when they cannot fit on one mobile row', async () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: String(query).includes('600'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false
        },
        onchange: null
      }) as MediaQueryList) as typeof window.matchMedia

    const restoreSizes = mockToolbarSizes(80)
    const { host, toolbar } = createToolbar(
      [
        {
          id: 'measure',
          label: 'toolbar.measure',
          childrenUi: 'sticky-toolbar',
          children: manyButtons(6)
        }
      ],
      { placement: 'top', hostWidth: 360, hostHeight: 640, edgeOffset: 8 }
    )

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    await flushLayout()

    const strip = host.querySelector('.ml-ex-ui-subtoolbar') as HTMLElement
    expect(strip.classList.contains('is-mobile-fullwidth')).toBe(true)
    expect(strip.classList.contains('is-wrap')).toBe(true)

    toolbar.destroy()
    restoreSizes()
  })
})

describe('AcExSubToolbar vertical wrap', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('wraps a vertical sub-toolbar into columns when the host is too short', async () => {
    const restoreSizes = mockToolbarSizes(80)
    const { host, toolbar } = createToolbar(
      [
        {
          id: 'measure',
          label: 'toolbar.measure',
          childrenUi: 'sticky-toolbar',
          children: manyButtons(6)
        }
      ],
      { placement: 'right', hostWidth: 400, hostHeight: 200, edgeOffset: 8 }
    )

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    await flushLayout()

    const strip = host.querySelector('.ml-ex-ui-subtoolbar') as HTMLElement
    expect(strip.classList.contains('is-vertical')).toBe(true)
    expect(strip.classList.contains('is-fullheight')).toBe(true)
    expect(strip.classList.contains('is-wrap')).toBe(true)
    expect(strip.style.height).toBe('184px')
    expect(strip.style.top).toBe('8px')
    // Explicit multi-column width (flex column-wrap will not grow width alone).
    expect(Number.parseFloat(strip.style.width)).toBeGreaterThan(80)

    toolbar.destroy()
    restoreSizes()
  })

  it('keeps a single column when all vertical child buttons fit', async () => {
    const restoreSizes = mockToolbarSizes(32)
    const { host, toolbar } = createToolbar(
      [
        {
          id: 'measure',
          label: 'toolbar.measure',
          childrenUi: 'sticky-toolbar',
          children: [
            { id: 'a', label: 'A', command: 'a' },
            { id: 'b', label: 'B', command: 'b' }
          ]
        }
      ],
      { placement: 'left', hostWidth: 400, hostHeight: 600, edgeOffset: 8 }
    )

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()
    await flushLayout()

    const strip = host.querySelector('.ml-ex-ui-subtoolbar') as HTMLElement
    expect(strip.classList.contains('is-wrap')).toBe(false)
    expect(strip.classList.contains('is-fullheight')).toBe(false)

    toolbar.destroy()
    restoreSizes()
  })
})

describe('AcExToolbar selected child persistence', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  const zoomItems = (): AcExToolbarItem[] => [
    {
      id: 'zoom',
      label: 'toolbar.zoom',
      icon: '<svg data-icon="fit"></svg>',
      childIcon: 'selected',
      selectedChildId: 'zoom-fit',
      children: [
        {
          id: 'zoom-fit',
          icon: '<svg data-icon="fit"></svg>',
          command: 'html:zoom-fit'
        },
        {
          id: 'zoom-window',
          icon: '<svg data-icon="window"></svg>',
          command: 'html:zoom-window'
        }
      ]
    }
  ]

  it('keeps the runtime selected child when updateItems reseeds selectedChildId', () => {
    const { host, toolbar } = createToolbar(zoomItems())

    toolbar.setSelectedChild('zoom', 'zoom-window')
    toolbar.updateItems(zoomItems())

    expect(
      host.querySelector('[data-toolbar-item-id="zoom"] [data-icon="window"]')
    ).toBeTruthy()
    expect(
      host.querySelector('[data-toolbar-item-id="zoom"] [data-icon="fit"]')
    ).toBeNull()

    toolbar.destroy()
  })

  it('calls onRender after the constructor and after updateItems', () => {
    const onRender = jest.fn()
    const { toolbar } = createToolbar(zoomItems(), { onRender })

    expect(onRender).toHaveBeenCalled()
    const afterConstruct = onRender.mock.calls.length
    toolbar.updateItems(zoomItems())
    expect(onRender.mock.calls.length).toBeGreaterThan(afterConstruct)

    toolbar.destroy()
  })
})
