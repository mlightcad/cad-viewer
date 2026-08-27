/**
 * @jest-environment jsdom
 */

import { setupAcExHtmlNavTools } from '../src/AcExHtmlNavTools'
import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'

describe('setupAcExHtmlNavTools', () => {
  beforeEach(() => {
    document.body.innerHTML = `
    <div id="root">
      <button type="button" data-toolbar-item-id="select"></button>
      <button type="button" data-toolbar-item-id="pan" aria-pressed="true"></button>
      <button type="button" data-toolbar-item-id="zoom"></button>
      <button type="button" data-toolbar-item-id="zoom-window"></button>
    </div>`
  })

  it('defaults to pan and syncs active state on toolbar item ids', () => {
    const root = document.getElementById('root')!
    const i18n = { t: (key: string) => key } as AcExHtmlI18n
    const nav = setupAcExHtmlNavTools({
      root,
      i18n,
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents: jest.fn(),
      exitDrawingTools: jest.fn(),
      isDrawingActive: () => false
    })

    expect(nav.getMode()).toBe('pan')
    expect(
      document
        .querySelector('[data-toolbar-item-id="pan"]')
        ?.classList.contains('active')
    ).toBe(true)

    nav.setMode('select')
    expect(
      document
        .querySelector('[data-toolbar-item-id="select"]')
        ?.classList.contains('active')
    ).toBe(true)
    expect(
      document
        .querySelector('[data-toolbar-item-id="pan"]')
        ?.classList.contains('active')
    ).toBe(false)
  })

  it('marks zoom-window active while that mode is selected', () => {
    const root = document.getElementById('root')!
    const i18n = { t: (key: string) => key } as AcExHtmlI18n
    const nav = setupAcExHtmlNavTools({
      root,
      i18n,
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents: jest.fn(),
      exitDrawingTools: jest.fn(),
      isDrawingActive: () => false
    })

    nav.setMode('zoom-window')
    expect(
      document
        .querySelector('[data-toolbar-item-id="zoom-window"]')
        ?.classList.contains('active')
    ).toBe(true)
    expect(
      document
        .querySelector('[data-toolbar-item-id="zoom"]')
        ?.classList.contains('active')
    ).toBe(true)

    nav.cancelZoomWindow()
    expect(
      document
        .querySelector('[data-toolbar-item-id="pan"]')
        ?.classList.contains('active')
    ).toBe(true)
  })

  it('syncs active state after toolbar buttons are mounted later', () => {
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    const i18n = { t: (key: string) => key } as AcExHtmlI18n
    const nav = setupAcExHtmlNavTools({
      root,
      i18n,
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents: jest.fn(),
      exitDrawingTools: jest.fn(),
      isDrawingActive: () => false
    })

    root.innerHTML = '<button type="button" data-toolbar-item-id="pan"></button>'
    nav.syncButtons()

    expect(
      document
        .querySelector('[data-toolbar-item-id="pan"]')
        ?.classList.contains('active')
    ).toBe(true)
  })
})
