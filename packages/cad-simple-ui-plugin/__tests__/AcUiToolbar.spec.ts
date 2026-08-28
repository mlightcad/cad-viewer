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

import type { AcUiToolbarItem } from '../src/config/types'
import { AcUiI18n } from '../src/i18n'
import { AcUiToolbar } from '../src/ui/AcUiToolbar'

function createToolbar(items: AcUiToolbarItem[]) {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 800 })
  Object.defineProperty(host, 'clientHeight', { value: 600 })
  document.body.appendChild(host)
  const onCommand = jest.fn()
  const toolbar = new AcUiToolbar({
    host,
    placement: 'right',
    items,
    i18n: new AcUiI18n(),
    onCommand
  })
  return { host, toolbar, onCommand }
}

describe('AcUiToolbar children UI', () => {
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
    const item: AcUiToolbarItem = {
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

  it('renders button labels when showLabels is enabled', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      items: [{ id: 'layer', label: 'toolbar.layerShort', command: 'layer' }],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    expect(
      host.querySelector('.ml-ex-ui-toolbar')?.classList.contains('has-labels')
    ).toBe(true)
    expect(host.querySelector('.ml-ex-ui-toolbar-btn-label')).toBeTruthy()
    toolbar.destroy()
  })

  it('applies stretch bottom bar classes and positioning', async () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 400 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      size: 'stretch',
      overflow: 'menu',
      edgeOffset: 0,
      items: [
        { id: 'zoom', label: 'toolbar.zoom', command: 'zoom' },
        { id: 'layer', label: 'toolbar.layerShort', command: 'layer' }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const root = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    expect(root?.classList.contains('is-stretch')).toBe(true)
    expect(root?.style.left).toBe('0px')
    expect(root?.style.right).toBe('0px')
    expect(root?.style.width).toBe('400px')

    const zoomBtn = host.querySelector<HTMLElement>(
      '[data-toolbar-item-id="zoom"]'
    )
    expect(getComputedStyle(zoomBtn!).flexGrow).toBe('1')
    toolbar.destroy()
  })

  it('opens nested locale strip from settings sub-toolbar', () => {
    const { host, toolbar } = createToolbar([
      {
        id: 'settings',
        label: 'toolbar.settings',
        childrenUi: 'toolbar',
        children: [
          {
            id: 'locale',
            label: 'toolbar.locale',
            childrenUi: 'toolbar',
            children: [
              { id: 'locale-en', label: 'toolbar.localeEn', action: jest.fn() }
            ]
          }
        ]
      }
    ])

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.click()
    expect(host.querySelectorAll('.ml-ex-ui-subtoolbar').length).toBe(1)

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="locale"]')
      ?.click()
    expect(host.querySelectorAll('.ml-ex-ui-subtoolbar').length).toBe(2)

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="locale-en"]')
      ?.click()
    expect(host.querySelectorAll('.ml-ex-ui-subtoolbar').length).toBe(0)
    toolbar.destroy()
  })

  it('shows overflow menu when vertical toolbar exceeds host height', async () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 200 })
    Object.defineProperty(host, 'clientHeight', { value: 120 })
    document.body.appendChild(host)
    const items: AcUiToolbarItem[] = Array.from({ length: 8 }, (_, index) => ({
      id: `cmd-${index}`,
      label: 'toolbar.select',
      command: `cmd-${index}`
    }))
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      overflow: 'menu',
      items,
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const overflowBtn = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="toolbar-overflow"]'
    )
    expect(overflowBtn).toBeTruthy()
    expect(overflowBtn?.hidden).toBe(false)

    const hiddenButtons = host.querySelectorAll(
      '.ml-ex-ui-toolbar-btn[data-toolbar-item-id^="cmd-"][hidden]'
    )
    expect(hiddenButtons.length).toBeGreaterThan(0)

    overflowBtn?.click()
    expect(host.querySelector('.ml-ex-ui-dropdown')).toBeTruthy()
    toolbar.destroy()
  })

  it('keeps overflow menu button visible when host height is very small', async () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 200 })
    Object.defineProperty(host, 'clientHeight', { value: 72 })
    document.body.appendChild(host)
    const items: AcUiToolbarItem[] = Array.from({ length: 8 }, (_, index) => ({
      id: `cmd-${index}`,
      label: 'toolbar.select',
      command: `cmd-${index}`
    }))
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      collapsible: true,
      overflow: 'menu',
      items,
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    const overflowBtn = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="toolbar-overflow"]'
    )
    expect(overflowBtn?.hidden).toBe(false)
    toolbar.destroy()
  })

  it('keeps overflow button inside host when toolbar is taller than host', async () => {
    const host = document.createElement('div')
    host.style.position = 'relative'
    host.style.width = '200px'
    host.style.height = '180px'
    Object.defineProperty(host, 'clientWidth', {
      configurable: true,
      get: () => 200
    })
    Object.defineProperty(host, 'clientHeight', {
      configurable: true,
      get: () => 180
    })
    document.body.appendChild(host)
    const items: AcUiToolbarItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: `cmd-${index}`,
      label: 'toolbar.select',
      command: `cmd-${index}`
    }))
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      edgeOffset: 8,
      collapsible: true,
      overflow: 'menu',
      items,
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    const overflowBtn = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="toolbar-overflow"]'
    )
    expect(overflowBtn?.hidden).toBe(false)

    const hostRect = host.getBoundingClientRect()
    const overflowRect = overflowBtn!.getBoundingClientRect()
    expect(overflowRect.bottom).toBeLessThanOrEqual(hostRect.bottom + 1)
    expect(overflowRect.top).toBeGreaterThanOrEqual(hostRect.top - 1)

    const root = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    expect(root?.style.maxHeight).toBe('')
    const rootRect = root!.getBoundingClientRect()
    expect(overflowRect.bottom).toBeLessThanOrEqual(rootRect.bottom + 1)
    toolbar.destroy()
  })

  it('wraps toolbar buttons across multiple rows when overflow is wrap', async () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 160 })
    Object.defineProperty(host, 'clientHeight', { value: 200 })
    document.body.appendChild(host)
    const items: AcUiToolbarItem[] = Array.from({ length: 6 }, (_, index) => ({
      id: `cmd-${index}`,
      label: 'toolbar.layerShort',
      command: `cmd-${index}`
    }))
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      overflow: 'wrap',
      items,
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const root = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    expect(root?.classList.contains('is-overflow-wrap')).toBe(true)
    expect(
      host.querySelector('[data-toolbar-item-id="toolbar-overflow"]')
    ).toBeNull()
    toolbar.destroy()
  })

  it('omits separators when showSeparators is false', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      showSeparators: false,
      collapsible: true,
      items: [
        { id: 'select', label: 'toolbar.select', command: 'select' },
        { type: 'separator', id: 'sep-1' },
        { id: 'layer', label: 'toolbar.layerShort', command: 'layer' }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    expect(host.querySelectorAll('.ml-ex-ui-toolbar-separator').length).toBe(0)
    toolbar.destroy()
  })

  it('omits separators when showSeparators is false', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      showSeparators: false,
      collapsible: true,
      items: [
        { id: 'select', label: 'toolbar.select', command: 'select' },
        { type: 'separator', id: 'sep-1' },
        { id: 'layer', label: 'toolbar.layerShort', command: 'layer' }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    expect(host.querySelectorAll('.ml-ex-ui-toolbar-separator').length).toBe(0)
    toolbar.destroy()
  })

  it('hides the toolbar border when showBorder is false', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      showBorder: false,
      items: [{ id: 'layer', label: 'toolbar.layerShort', command: 'layer' }],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    expect(
      host.querySelector('.ml-ex-ui-toolbar')?.classList.contains('no-border')
    ).toBe(true)
    toolbar.destroy()
  })

  it('applies sideOffset to cross-axis wrap limits for horizontal toolbars', async () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 400 })
    Object.defineProperty(host, 'clientHeight', { value: 200 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      edgeOffset: 0,
      sideOffset: 16,
      overflow: 'wrap',
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `cmd-${index}`,
        label: 'toolbar.layerShort',
        command: `cmd-${index}`
      })),
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    const root = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')
    expect(root?.style.getPropertyValue('--ml-ex-ui-toolbar-max-height')).toBe(
      '184px'
    )
    toolbar.destroy()
  })

  it('passes sub-toolbar chrome overrides to child strips', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'right',
      subToolbar: { showBorder: false, showLabels: true },
      items: [
        {
          id: 'measure',
          label: 'toolbar.measure',
          childrenUi: 'toolbar',
          children: [
            { id: 'distance', label: 'toolbar.distance', command: 'measure' }
          ]
        }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const sub = host.querySelector('.ml-ex-ui-subtoolbar')
    expect(sub?.classList.contains('no-border')).toBe(true)
    expect(sub?.classList.contains('has-labels')).toBe(true)
    toolbar.destroy()
  })

  it('applies stretch size to horizontal sub-toolbars on bottom placement', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 400 })
    Object.defineProperty(host, 'clientHeight', { value: 300 })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      edgeOffset: 0,
      subToolbar: { size: 'stretch' },
      items: [
        {
          id: 'settings',
          label: 'toolbar.settings',
          childrenUi: 'toolbar',
          children: [
            { id: 'theme', label: 'toolbar.theme', command: 'theme' },
            { id: 'locale', label: 'toolbar.language', command: 'locale' }
          ]
        }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const sub = host.querySelector<HTMLElement>('.ml-ex-ui-subtoolbar')
    expect(sub?.classList.contains('is-stretch')).toBe(true)
    expect(sub?.style.width).toBe('400px')
    expect(sub?.style.left).toBe('0px')

    const themeBtn = sub?.querySelector<HTMLElement>(
      '[data-toolbar-item-id="theme"]'
    )
    expect(getComputedStyle(themeBtn!).flexGrow).toBe('1')
    toolbar.destroy()
  })

  it('centers a sub-toolbar on the parent toolbar when position is center', () => {
    const host = document.createElement('div')
    host.style.position = 'relative'
    host.style.width = '400px'
    host.style.height = '300px'
    Object.defineProperty(host, 'clientWidth', {
      configurable: true,
      get: () => 400
    })
    Object.defineProperty(host, 'clientHeight', {
      configurable: true,
      get: () => 300
    })
    document.body.appendChild(host)
    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      edgeOffset: 0,
      size: 'stretch',
      subToolbar: { position: 'center' },
      items: [
        {
          id: 'zoom',
          label: 'toolbar.zoom',
          childrenUi: 'toolbar',
          children: [
            { id: 'zoom-extent', label: 'toolbar.zoomExtent', command: 'zoom' }
          ]
        },
        { id: 'layer', label: 'toolbar.layerShort', command: 'layer' },
        {
          id: 'settings',
          label: 'toolbar.settings',
          childrenUi: 'toolbar',
          children: [
            { id: 'theme', label: 'toolbar.theme', command: 'theme' }
          ]
        }
      ],
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const root = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')!
    const sub = host.querySelector<HTMLElement>('.ml-ex-ui-subtoolbar')!
    const expectedLeft =
      (root.getBoundingClientRect().width - sub.offsetWidth) / 2
    expect(Number.parseFloat(sub.style.left)).toBeCloseTo(expectedLeft, 0)
    toolbar.destroy()
  })

  it('aligns sub-toolbar front and end to the parent toolbar buttons', () => {
    const host = document.createElement('div')
    host.style.position = 'relative'
    host.style.width = '400px'
    host.style.height = '300px'
    Object.defineProperty(host, 'clientWidth', {
      configurable: true,
      get: () => 400
    })
    Object.defineProperty(host, 'clientHeight', {
      configurable: true,
      get: () => 300
    })
    document.body.appendChild(host)

    const create = (position: 'front' | 'end') =>
      new AcUiToolbar({
        host,
        placement: 'bottom',
        edgeOffset: 0,
        size: 'stretch',
        subToolbar: { position },
        items: [
          {
            id: 'zoom',
            label: 'toolbar.zoom',
            childrenUi: 'toolbar',
            children: [
              {
                id: 'zoom-a',
                label: 'toolbar.zoomExtent',
                command: 'zoom-a'
              },
              {
                id: 'zoom-b',
                label: 'toolbar.zoomWindow',
                command: 'zoom-b'
              }
            ]
          },
          { id: 'layer', label: 'toolbar.layerShort', command: 'layer' },
          {
            id: 'settings',
            label: 'toolbar.settings',
            childrenUi: 'toolbar',
            children: [
              { id: 'theme', label: 'toolbar.theme', command: 'theme' }
            ]
          }
        ],
        i18n: new AcUiI18n(),
        onCommand: jest.fn()
      })

    const frontToolbar = create('front')
    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const frontRoot = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')!
    const frontSub = host.querySelector<HTMLElement>('.ml-ex-ui-subtoolbar')!
    const firstToolbarBtn = frontRoot.querySelector<HTMLElement>(
      '.ml-ex-ui-toolbar-btn:not([hidden])'
    )!
    const firstSubBtn = frontSub.querySelector<HTMLElement>(
      '.ml-ex-ui-toolbar-btn:not([hidden])'
    )!
    expect(firstSubBtn.getBoundingClientRect().left).toBeCloseTo(
      firstToolbarBtn.getBoundingClientRect().left,
      0
    )
    frontToolbar.destroy()

    const endToolbar = create('end')
    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="zoom"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const endRoot = host.querySelector<HTMLElement>('.ml-ex-ui-toolbar')!
    const endSub = host.querySelector<HTMLElement>('.ml-ex-ui-subtoolbar')!
    const endToolbarBtns = Array.from(
      endRoot.querySelectorAll<HTMLElement>(
        '.ml-ex-ui-toolbar-btn:not([hidden])'
      )
    )
    const endSubBtns = Array.from(
      endSub.querySelectorAll<HTMLElement>('.ml-ex-ui-toolbar-btn:not([hidden])')
    )
    const lastToolbarBtn = endToolbarBtns[endToolbarBtns.length - 1]
    const lastSubBtn = endSubBtns[endSubBtns.length - 1]
    expect(lastSubBtn.getBoundingClientRect().right).toBeCloseTo(
      lastToolbarBtn.getBoundingClientRect().right,
      0
    )
    endToolbar.destroy()
  })
})
