/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'

Object.assign(globalThis, { TextDecoder, TextEncoder })

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver: ResizeObserverStub })

jest.mock('../src/AcExHtmlSimpleViewerUi', () => {
  const openMode = jest.requireActual(
    '../../cad-simple-viewer/src/editor/view/AcEdOpenMode.ts'
  )
  const toolbar = jest.requireActual(
    '../../cad-simple-viewer/src/ui/toolbar/AcUiToolbar.ts'
  )
  const utils = jest.requireActual(
    '../../cad-simple-viewer/src/ui/toolbar/toolbarItemUtils.ts'
  )
  const styles = jest.requireActual(
    '../../cad-simple-viewer/src/ui/toolbar/AcUiToolbarStyles.ts'
  )
  return {
    AcEdOpenMode: openMode.AcEdOpenMode,
    AcUiToolbar: toolbar.AcUiToolbar,
    acuiCopyDynamicToolbarChildren: utils.acuiCopyDynamicToolbarChildren,
    acuiEnsureToolbarStyles: styles.acuiEnsureToolbarStyles
  }
})

import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'
import {
  acexHtmlCreateMainToolbarItems,
  setupAcExHtmlMainToolbar,
  type AcExHtmlMainToolbarHandlers
} from '../src/AcExHtmlMainToolbar'

function fakeI18n(): AcExHtmlI18n {
  return {
    locale: 'en',
    t: (key: string) => key,
    setLocale: jest.fn(),
    setOnChange: jest.fn(),
    applyToDocument: jest.fn()
  } as unknown as AcExHtmlI18n
}

function fakeHandlers(): AcExHtmlMainToolbarHandlers {
  return {
    setNavMode: jest.fn(),
    fit: jest.fn(),
    restoreOriginalView: jest.fn(),
    cancelZoomWindow: jest.fn(),
    toggleLayerDrawer: jest.fn(),
    switchLayout: jest.fn(),
    setMeasureMode: jest.fn(),
    toggleMeasurePanel: jest.fn(),
    toggleMeasureVisibility: jest.fn(),
    isMeasureVisible: () => true,
    clearMeasurements: jest.fn(),
    importMeasurements: jest.fn(),
    exportMeasurements: jest.fn(),
    setMarkupMode: jest.fn(),
    toggleMarkupPanel: jest.fn(),
    toggleMarkupVisibility: jest.fn(),
    isMarkupVisible: () => true,
    clearMarkups: jest.fn(),
    importMarkups: jest.fn(),
    exportMarkups: jest.fn(),
    applyTheme: jest.fn(),
    getTheme: () => 'dark',
    switchBackground: jest.fn()
  }
}

describe('AcExHtmlMainToolbar readiness', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('disables measure and annotation until geometry and OSNAP are ready', () => {
    const readiness = { geometry: false, osnap: false }
    const items = acexHtmlCreateMainToolbarItems({
      host: document.createElement('div'),
      i18n: fakeI18n(),
      viewerMode: 'measure',
      exportLayouts: false,
      layouts: [],
      getActiveLayoutBtrId: () => '1',
      handlers: fakeHandlers(),
      readiness
    })

    const measure = items.find(item => item.id === 'measure')
    const annotation = items.find(item => item.id === 'annotation')
    expect(measure?.disabled).toEqual(expect.any(Function))
    expect(annotation?.disabled).toEqual(expect.any(Function))

    const measureDisabled = measure?.disabled as () => boolean
    const annotationDisabled = annotation?.disabled as () => boolean

    expect(measureDisabled()).toBe(true)
    expect(annotationDisabled()).toBe(true)

    readiness.geometry = true
    expect(measureDisabled()).toBe(true)
    expect(annotationDisabled()).toBe(true)

    readiness.osnap = true
    expect(measureDisabled()).toBe(false)
    expect(annotationDisabled()).toBe(false)
  })

  it('keeps the whole toolbar disabled until geometry is ready', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const toolbar = setupAcExHtmlMainToolbar({
      host,
      i18n: fakeI18n(),
      viewerMode: 'measure',
      exportLayouts: false,
      layouts: [],
      getActiveLayoutBtrId: () => '1',
      handlers: fakeHandlers()
    })

    const root = host.querySelector('.ml-ex-ui-toolbar')
    expect(root?.classList.contains('is-disabled')).toBe(true)
    expect(toolbar.getReadiness()).toEqual({ geometry: false, osnap: false })

    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="measure"]'
      )?.disabled
    ).toBe(true)

    toolbar.setGeometryReady(true)
    expect(root?.classList.contains('is-disabled')).toBe(false)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="settings"]'
      )?.disabled
    ).toBe(false)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="measure"]'
      )?.disabled
    ).toBe(true)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="annotation"]'
      )?.disabled
    ).toBe(true)

    toolbar.setOsnapReady(true)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="measure"]'
      )?.disabled
    ).toBe(false)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-toolbar-item-id="annotation"]'
      )?.disabled
    ).toBe(false)

    toolbar.destroy()
  })
})
