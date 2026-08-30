/** @jest-environment jsdom */

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

const localeLabels: Record<string, Record<string, string>> = {
  en: {
    'simpleUi.toolbar.layerShort': 'Layers',
    'simpleUi.toolbar.settings': 'Settings',
    'simpleUi.toolbar.locale': 'Language',
    'simpleUi.toolbar.measure': 'Measure',
    'simpleUi.toolbar.measureDistance': 'Distance',
    'simpleUi.toolbar.measurementPanel': 'Results',
    'simpleUi.toolbar.showMeasurements': 'Show',
    'simpleUi.toolbar.hideMeasurements': 'Hide'
  },
  zh: {
    'simpleUi.toolbar.layerShort': '图层',
    'simpleUi.toolbar.settings': '设置',
    'simpleUi.toolbar.locale': '语言',
    'simpleUi.toolbar.measure': '测量',
    'simpleUi.toolbar.measureDistance': '测距离',
    'simpleUi.toolbar.measurementPanel': '看结果',
    'simpleUi.toolbar.showMeasurements': '显示',
    'simpleUi.toolbar.hideMeasurements': '隐藏'
  }
}

let currentLocale = 'en'

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
      get currentLocale() {
        return currentLocale
      },
      setCurrentLocale(locale: string) {
        currentLocale = locale
      },
      t(key: string, opts?: { fallback?: string }) {
        return (
          localeLabels[currentLocale]?.[key] ?? opts?.fallback ?? key
        )
      },
      events: {
        localeChanged: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      },
      mergeLocaleMessage: jest.fn()
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

import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import { acuiCreatePhoneToolbarItems } from '../src/config/defaultToolbarItems'
import { AcUiI18n } from '../src/i18n'
import { AcUiToolbar } from '../src/ui/AcUiToolbar'

function getLayerLabel(host: HTMLElement) {
  return host.querySelector(
    '[data-toolbar-item-id="layer"] .ml-ex-ui-toolbar-btn-label'
  )?.textContent
}

describe('phone toolbar labels on locale change', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
    currentLocale = 'en'
  })

  it('updates visible labels via refreshLocale after locale changes', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)

    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      size: 'stretch',
      items: acuiCreatePhoneToolbarItems({
        getTheme: () => 'light',
        setTheme: () => undefined,
        getLocale: () => AcApI18n.currentLocale as 'en',
        setLocale: locale => AcApI18n.setCurrentLocale(locale),
        getPlacement: () => 'bottom',
        setPlacement: () => undefined
      }),
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    expect(getLayerLabel(host)).toBe('Layers')

    AcApI18n.setCurrentLocale('zh')
    toolbar.refreshLocale()

    expect(getLayerLabel(host)).toBe('图层')
    toolbar.destroy()
  })

  it('keeps nested locale strip open on parent mousedown and updates labels', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)

    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      size: 'stretch',
      subToolbar: { showLabels: false, replaceOnNested: false },
      items: acuiCreatePhoneToolbarItems({
        getTheme: () => 'light',
        setTheme: () => undefined,
        getLocale: () => AcApI18n.currentLocale as 'en',
        setLocale: locale => AcApI18n.setCurrentLocale(locale),
        getPlacement: () => 'bottom',
        setPlacement: () => undefined
      }),
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.click()
    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="locale"]')
      ?.click()

    expect(host.querySelectorAll('.ml-ex-ui-subtoolbar').length).toBe(2)

    const localeZh = host.querySelector<HTMLButtonElement>(
      '[data-toolbar-item-id="locale-zh"]'
    )
    localeZh?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    )

    expect(host.querySelectorAll('.ml-ex-ui-subtoolbar').length).toBe(2)

    localeZh?.click()

    expect(currentLocale).toBe('zh')
    expect(getLayerLabel(host)).toBe('图层')
    toolbar.destroy()
  })

  it('hides the ancestor strip when replaceOnNested is true', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)

    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      size: 'stretch',
      subToolbar: {
        showLabels: true,
        size: 'stretch',
        overflow: 'wrap',
        replaceOnNested: true
      },
      items: acuiCreatePhoneToolbarItems({
        getTheme: () => 'light',
        setTheme: () => undefined,
        getLocale: () => AcApI18n.currentLocale as 'en',
        setLocale: locale => AcApI18n.setCurrentLocale(locale),
        getPlacement: () => 'bottom',
        setPlacement: () => undefined
      }),
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="settings"]')
      ?.click()
    const settingsStrip = host.querySelector<HTMLElement>('.ml-ex-ui-subtoolbar')
    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="locale"]')
      ?.click()

    expect(settingsStrip?.hidden).toBe(true)
    expect(
      Array.from(host.querySelectorAll<HTMLElement>('.ml-ex-ui-subtoolbar')).filter(
        strip => !strip.hidden
      )
    ).toHaveLength(1)
    toolbar.destroy()
  })

  it('updates open measure-strip labels on locale change', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 800 })
    Object.defineProperty(host, 'clientHeight', { value: 600 })
    document.body.appendChild(host)

    const toolbar = new AcUiToolbar({
      host,
      placement: 'bottom',
      showLabels: true,
      size: 'stretch',
      subToolbar: { showLabels: true, size: 'stretch', overflow: 'wrap' },
      items: acuiCreatePhoneToolbarItems({
        getTheme: () => 'light',
        setTheme: () => undefined,
        getLocale: () => AcApI18n.currentLocale as 'en',
        setLocale: locale => AcApI18n.setCurrentLocale(locale),
        getPlacement: () => 'bottom',
        setPlacement: () => undefined
      }),
      i18n: new AcUiI18n(),
      onCommand: jest.fn()
    })

    host
      .querySelector<HTMLButtonElement>('[data-toolbar-item-id="measure"]')
      ?.click()

    const distanceLabel = () =>
      host.querySelector(
        '[data-toolbar-item-id="measure-distance"] .ml-ex-ui-toolbar-btn-label'
      )?.textContent

    const panelLabel = () =>
      host.querySelector(
        '[data-toolbar-item-id="measurement-panel"] .ml-ex-ui-toolbar-btn-label'
      )?.textContent

    expect(distanceLabel()).toBe('Distance')
    expect(panelLabel()).toBe('Results')

    AcApI18n.setCurrentLocale('zh')
    toolbar.refreshLocale()

    expect(distanceLabel()).toBe('测距离')
    expect(panelLabel()).toBe('看结果')
    toolbar.destroy()
  })
})
