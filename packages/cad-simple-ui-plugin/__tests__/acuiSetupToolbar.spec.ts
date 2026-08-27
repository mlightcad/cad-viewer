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
    },
    isMarkupVisible: () => true,
    isMeasurementVisible: () => true
  }
})

jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: jest.fn()
    }
  })
}))

import { acuiToolbarPreset } from '../src/config/toolbarItemUtils'
import type { AcUiToolbarItem } from '../src/config/types'
import { AcUiI18n } from '../src/i18n'
import { acuiSetupToolbar } from '../src/ui/acuiSetupToolbar'

describe('acuiSetupToolbar', () => {
  it('mounts from layout config and applies host built-in defaults', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 1200 })
    Object.defineProperty(host, 'clientHeight', { value: 800 })
    document.body.appendChild(host)

    const zoom: AcUiToolbarItem = {
      id: 'zoom',
      label: 'toolbar.zoom',
      command: 'zoom'
    }
    const presets = new Map<string, AcUiToolbarItem>([['zoom', zoom]])

    const controller = acuiSetupToolbar({
      host,
      i18n: new AcUiI18n(),
      onCommand: jest.fn(),
      layout: 'desktop',
      getBuiltInDefaults: () => ({
        enabled: true,
        placement: 'left',
        items: [acuiToolbarPreset('zoom')],
        collapsible: true,
        edgeOffset: 12,
        overflow: 'menu'
      }),
      presets,
      docBinding: false
    })

    expect(host.contains(controller.toolbar.element)).toBe(true)
    expect(controller.getPlacement()).toBe('left')
    expect(controller.getEdgeOffset()).toBe(12)
    expect(controller.getLayoutKind()).toBe('desktop')
    expect(
      host.querySelector('[data-toolbar-item-id="zoom"]')
    ).toBeTruthy()

    controller.destroy()
  })

  it('applies layouts.mobile chrome overrides', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 375 })
    Object.defineProperty(host, 'clientHeight', { value: 667 })
    document.body.appendChild(host)

    const item: AcUiToolbarItem = {
      id: 'layer',
      label: 'toolbar.layer',
      command: 'layer'
    }

    const controller = acuiSetupToolbar({
      host,
      i18n: new AcUiI18n(),
      onCommand: jest.fn(),
      layout: 'mobile',
      getBuiltInDefaults: kind =>
        kind === 'mobile'
          ? {
              placement: 'bottom',
              items: [{ id: 'layer', label: 'toolbar.layer', command: 'layer' }],
              edgeOffset: 0,
              contentWidth: 'full',
              itemDistribution: 'evenly',
              showItemLabels: true,
              collapsible: false
            }
          : {
              placement: 'right',
              items: [acuiToolbarPreset('layer')],
              edgeOffset: 8
            },
      presets: new Map([['layer', item]]),
      docBinding: false
    })

    expect(controller.getPlacement()).toBe('bottom')
    expect(controller.getEdgeOffset()).toBe(0)
    expect(controller.toolbar.element.classList.contains('is-full-width')).toBe(
      true
    )
    expect(controller.toolbar.element.classList.contains('is-show-labels')).toBe(
      true
    )

    controller.destroy()
  })

  it('seeds selected child before refresh re-render', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 1200 })
    Object.defineProperty(host, 'clientHeight', { value: 800 })
    document.body.appendChild(host)

    let locale = 'en'
    const makeLocaleItem = (): AcUiToolbarItem => ({
      id: 'locale',
      label: 'toolbar.locale',
      icon: `<span data-locale-icon="${locale}"></span>`,
      childIcon: 'selected',
      selectedChildId: `locale-${locale}`,
      children: [
        {
          id: 'locale-en',
          label: 'en',
          icon: '<span data-locale-icon="en"></span>',
          command: 'locale:en'
        },
        {
          id: 'locale-zh',
          label: 'zh',
          icon: '<span data-locale-icon="zh"></span>',
          command: 'locale:zh'
        }
      ]
    })

    const controller = acuiSetupToolbar({
      host,
      i18n: new AcUiI18n(),
      onCommand: jest.fn(),
      layout: 'desktop',
      getBuiltInDefaults: () => ({
        placement: 'right',
        items: [makeLocaleItem()],
        edgeOffset: 8
      }),
      presets: () => new Map([['locale', makeLocaleItem()]]),
      docBinding: false,
      onAfterResolve: toolbar => {
        toolbar.setSelectedChild('locale', `locale-${locale}`)
      }
    })

    expect(
      host.querySelector('[data-toolbar-item-id="locale"] [data-locale-icon="en"]')
    ).toBeTruthy()

    locale = 'zh'
    controller.refresh()

    expect(
      host.querySelector('[data-toolbar-item-id="locale"] [data-locale-icon="zh"]')
    ).toBeTruthy()

    controller.destroy()
  })
})
