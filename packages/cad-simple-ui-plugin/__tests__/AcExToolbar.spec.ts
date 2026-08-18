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

import type { AcExToolbarItem } from '../src/config/types'
import { AcExI18n } from '../src/i18n'
import { AcExToolbar } from '../src/ui/AcExToolbar'

function createToolbar(items: AcExToolbarItem[]) {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 800 })
  Object.defineProperty(host, 'clientHeight', { value: 600 })
  document.body.appendChild(host)
  const onCommand = jest.fn()
  const toolbar = new AcExToolbar({
    host,
    placement: 'right',
    items,
    i18n: new AcExI18n(),
    onCommand
  })
  return { host, toolbar, onCommand }
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
})
